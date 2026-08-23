/* Colorinche — almacenamiento en IndexedDB (queda en el disco del dispositivo).

   Base 'colorinche', stores:
   - uploads: { id, createdAt, w, h, blob: PNG blanco y negro, thumb: Blob, hidden?: bool }
   - works:   { id, kind: 'colorear'|'pizarra'|'neon', source, status: 'progress'|'done',
                createdAt, updatedAt, w, h, paint: Blob (capa de pintura/dibujo, PNG con transparencia),
                thumb: Blob (miniatura compuesta), meta: {...} }
              · colorear: source = id del dibujo ('vaca') o 'u-<idUpload>' para imágenes subidas.
              · pizarra/neon: source = 'pizarra' | 'neon' (IndexedDB no indexa null), meta = { bg: 'blanco' | ... }.
   - kv:      { key, value } preferencias varias. */
'use strict';
(function (CL) {
  const DB_NAME = 'colorinche';
  const VERSION = 1;
  let dbp = null;
  const events = CL.util.emitter();

  function open() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) { reject(new Error('Este navegador no tiene IndexedDB')); return; }
      let req;
      try { req = indexedDB.open(DB_NAME, VERSION); } catch (e) { reject(e); return; }
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('uploads')) {
          db.createObjectStore('uploads', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('works')) {
          const s = db.createObjectStore('works', { keyPath: 'id' });
          s.createIndex('source', 'source');
          s.createIndex('status', 'status');
        }
        if (!db.objectStoreNames.contains('kv')) {
          db.createObjectStore('kv', { keyPath: 'key' });
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => { db.close(); dbp = null; };
        resolve(db);
      };
      req.onerror = () => reject(req.error);
      req.onblocked = () => console.warn('IndexedDB bloqueada por otra pestaña');
    });
    dbp.catch(() => { dbp = null; });
    return dbp;
  }

  /** Ejecuta fn(store) en una transacción y resuelve con el resultado del request. */
  async function run(storeName, mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      let result;
      const req = fn(store);
      if (req) req.onsuccess = () => { result = req.result; };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Transacción abortada'));
    });
  }

  const get = (store, key) => run(store, 'readonly', (s) => s.get(key));
  const put = (store, value) => run(store, 'readwrite', (s) => s.put(value)).then((r) => {
    events.emit('change', { store, id: value.id || value.key });
    return r;
  });
  const del = (store, key) => run(store, 'readwrite', (s) => s.delete(key)).then(() => {
    events.emit('change', { store, id: key });
  });
  const all = (store) => run(store, 'readonly', (s) => s.getAll()).then((r) => r || []);
  const byIndex = (store, index, value) =>
    run(store, 'readonly', (s) => s.index(index).getAll(value)).then((r) => r || []);

  const newest = (a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);

  const works = {
    get: (id) => get('works', id),
    /** Lista obras (más nuevas primero). Filtros opcionales: { status, kind, source } */
    async list(filter = {}) {
      let list = filter.status ? await byIndex('works', 'status', filter.status) : await all('works');
      if (filter.kind) list = list.filter((w) => w.kind === filter.kind);
      if (filter.source !== undefined) list = list.filter((w) => w.source === filter.source);
      return list.sort(newest);
    },
    /** Guarda (crea o actualiza). Completa id, fechas y valores por defecto. */
    async save(work) {
      const now = Date.now();
      const w = Object.assign({ status: 'progress', meta: {} }, work);
      if (!w.id) w.id = CL.util.uid();
      if (!w.createdAt) w.createdAt = now;
      w.updatedAt = now;
      await put('works', w);
      return w;
    },
    /** Último trabajo en progreso para un dibujo (o null). */
    async findProgress(kind, source) {
      const list = await byIndex('works', 'source', source);
      const p = list.filter((w) => w.kind === kind && w.status === 'progress').sort(newest);
      return p[0] || null;
    },
    /** Borra la obra; si era de una imagen subida ya oculta y no quedan obras, borra la imagen. */
    async del(id) {
      const w = await get('works', id);
      await del('works', id);
      if (w && typeof w.source === 'string' && w.source.startsWith('u-')) {
        const upId = w.source.slice(2);
        const up = await get('uploads', upId);
        if (up && up.hidden) {
          const rest = await byIndex('works', 'source', w.source);
          if (!rest.length) await del('uploads', upId);
        }
      }
    },
  };

  const uploads = {
    get: (id) => get('uploads', id),
    /** Imágenes subidas visibles (más nuevas primero). */
    async list() {
      return (await all('uploads')).filter((u) => !u.hidden).sort(newest);
    },
    async save(up) {
      const u = Object.assign({}, up);
      if (!u.id) u.id = CL.util.uid();
      if (!u.createdAt) u.createdAt = Date.now();
      await put('uploads', u);
      return u;
    },
    /** Quita una imagen subida de "Mis dibujos".
        Borra su progreso; si hay obras terminadas que la usan, la oculta (para poder reabrirlas). */
    async remove(id) {
      const src = 'u-' + id;
      const related = await byIndex('works', 'source', src);
      for (const w of related) if (w.status === 'progress') await del('works', w.id);
      const keep = related.some((w) => w.status === 'done');
      if (keep) {
        const u = await get('uploads', id);
        if (u) { u.hidden = true; await put('uploads', u); }
      } else {
        await del('uploads', id);
      }
    },
  };

  const kv = {
    async get(key, def) {
      try { const r = await get('kv', key); return r ? r.value : def; } catch (e) { return def; }
    },
    set: (key, value) => put('kv', { key, value }),
  };

  CL.db = {
    open,
    get, put, del, all,
    works, uploads, kv,
    events,
    /** Pide al navegador que no borre los datos si falta espacio. */
    async persist() {
      try {
        if (navigator.storage && navigator.storage.persist) {
          if (await navigator.storage.persisted()) return true;
          return await navigator.storage.persist();
        }
      } catch (e) { /* no soportado */ }
      return false;
    },
  };
})(window.CL);
