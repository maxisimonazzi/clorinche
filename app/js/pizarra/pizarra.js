/* Colorines — pizarra mágica (dibujo libre). Rutas: #pizarra y #pizarra/<workId>.

   Capas dentro del tablero (todas del mismo tamaño, backing store = documento × res):
     canvas.pz-bg     fondo elegido (CL.pizarra.backgrounds)
     canvas.pz-layer  trazos (transparente; la goma borra con destination-out y deja ver el fondo)
     canvas.pz-live   uno por trazo en curso de los pinceles con buffer (se vuelca a la capa al terminar)
     canvas.pz-fx     animaciones cortas (pop de sellos, destellos de brillitos)
     div.pz-wiper     la barrita de "borrar todo"

   El documento tiene un tamaño fijo en unidades (px CSS del lienzo al crearlo). Si la pantalla cambia
   (rotar, redimensionar), el tablero se escala para entrar entero: nunca se pierde nada. Si todavía está
   en blanco, se rehace al tamaño nuevo.

   API pública:
     CL.pizarra.backgrounds                 [{ id, name, dark, swatch, paint(ctx, w, h) }]
     CL.pizarra.paintBackground(ctx, id, w, h)   pinta el fondo en un ctx (w, h en las unidades del ctx)
     CL.pizarra.exportPNG(work)             Promise<Blob> (fondo + trazos, a resolución completa)
     CL.pizarra.COLORS                      paleta de la pizarra */
'use strict';
(function (CL) {
  const U = CL.util;
  const el = U.el;
  const INK = '#2b2240';
  const MAX_PX = 4.6e6; // tope de píxeles del lienzo (memoria)
  const SAVE_MS = 300;  // autoguardado: poco después de levantar el dedo (si hay dedos apoyados, espera)
  const MAX_FINGERS = 5; // trazos simultáneos (una palma apoyada no crea 10 lienzos)
  const POOL_KEEP = 2;   // lienzos en vivo que se guardan para reusar (el resto se libera)
  const MODAL_GUARD_MS = 420; // al abrir un selector, un segundo toque rápido no lo cierra

  /* ---------- Paleta ---------- */
  const COLORS = [
    { c: 'multi', name: 'Colores sorpresa' },
    { c: '#ff3b30', name: 'Rojo' },
    { c: '#ff8a1f', name: 'Naranja' },
    { c: '#ffd60a', name: 'Amarillo' },
    { c: '#9be23c', name: 'Verde clarito' },
    { c: '#1fb35a', name: 'Verde' },
    { c: '#19c8b9', name: 'Turquesa' },
    { c: '#3cc3ff', name: 'Celeste' },
    { c: '#2f5bea', name: 'Azul' },
    { c: '#8b4dff', name: 'Violeta' },
    { c: '#ff78c4', name: 'Rosa' },
    { c: '#8d5a33', name: 'Marrón' },
    { c: '#ffc49a', name: 'Color piel' },
    { c: '#9aa0a6', name: 'Gris' },
    { c: '#23202b', name: 'Negro' },
    { c: '#ffffff', name: 'Blanco' },
  ];
  const RAINBOW_CSS = 'conic-gradient(#ff3b30, #ff8a1f, #ffd60a, #1fb35a, #3cc3ff, #8b4dff, #ff78c4, #ff3b30)';
  const SIZE_NAMES = ['Fino', 'Mediano', 'Grueso', 'Muy grueso'];
  const SIZE_DOTS = [9, 15, 23, 32]; // diámetro del puntito en el botón (px)

  /* ---------- Fondos ---------- */
  /** Números al azar repetibles (el pizarrón se ve igual cada vez que se repinta). */
  function seeded(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Pizarrón con textura de tiza sutil (manchones de borrado, polvillo y viñeta). */
  function chalkboard(base, seed) {
    return (ctx, w, h) => {
      const rnd = seeded(seed);
      const m = Math.max(w, h);
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, w, h);
      // manchones de tiza borrada
      for (let i = 0; i < 26; i++) {
        const x = rnd() * w, y = rnd() * h, r = m * (0.06 + rnd() * 0.16);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        const a = 0.018 + rnd() * 0.03;
        g.addColorStop(0, `rgba(255,255,255,${a})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(x, y, r, r * (0.35 + rnd() * 0.4), rnd() * Math.PI, 0, Math.PI * 2); ctx.fill();
      }
      // pasadas de borrador (arcos anchos muy suaves)
      ctx.lineCap = 'round';
      for (let i = 0; i < 7; i++) {
        const x = rnd() * w, y = rnd() * h, L = m * (0.12 + rnd() * 0.2);
        ctx.strokeStyle = `rgba(255,255,255,${0.01 + rnd() * 0.012})`;
        ctx.lineWidth = m * (0.02 + rnd() * 0.03);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + L * 0.5, y - L * (0.15 + rnd() * 0.2), x + L, y + L * (rnd() - 0.5) * 0.2);
        ctx.stroke();
      }
      // polvillo
      const n = Math.round((w * h) / 260);
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.035 + rnd() * 0.09})`;
        const r = 0.35 + rnd() * 0.9;
        ctx.fillRect(rnd() * w, rnd() * h, r, r);
      }
      // viñeta
      const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, m * 0.75);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, 'rgba(0,0,0,0.22)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, w, h);
    };
  }
  const plain = (color) => (ctx, w, h) => { ctx.fillStyle = color; ctx.fillRect(0, 0, w, h); };

  const BACKGROUNDS = [
    { id: 'blanco', name: 'Blanco', color: '#ffffff' },
    { id: 'crema', name: 'Crema', color: '#fff3d6' },
    { id: 'amarillo', name: 'Amarillo', color: '#fff6a8' },
    { id: 'rosa', name: 'Rosa', color: '#ffdcec' },
    { id: 'celeste', name: 'Celeste', color: '#d6f0ff' },
    { id: 'menta', name: 'Menta', color: '#d5f7e3' },
    { id: 'lila', name: 'Lila', color: '#e9dfff' },
    { id: 'durazno', name: 'Durazno', color: '#ffe0c7' },
    { id: 'pizarron-verde', name: 'Pizarrón verde', color: '#2f5e46', dark: true, chalk: 17 },
    { id: 'pizarron-negro', name: 'Pizarrón negro', color: '#26262d', dark: true, chalk: 29 },
  ].map((b) => Object.assign(b, { paint: b.chalk ? chalkboard(b.color, b.chalk) : plain(b.color) }));
  const bgById = Object.create(null);
  for (const b of BACKGROUNDS) bgById[b.id] = b;
  const bgDef = (id) => bgById[id] || BACKGROUNDS[0];

  function paintBackground(ctx, id, w, h) {
    ctx.save();
    bgDef(id).paint(ctx, w, h);
    ctx.restore();
  }

  /* ---------- Codificación PNG ----------
     En el hilo principal, canvas.toBlob (y también convertToBlob) espera "tiempo ocioso" del navegador y
     puede tardar ~1 s en arrancar: si el chico recarga o cierra en ese rato, el trazo se pierde. Se codifica
     en un worker chiquito (creado desde un Blob, anda también en file://), sin esperas ni tirones. Si el
     navegador no puede, se usa el hilo principal. */
  const WORKER_SRC = `self.onmessage = async (e) => {
    const { id, bmp } = e.data;
    try {
      const oc = new OffscreenCanvas(bmp.width, bmp.height);
      oc.getContext('2d').drawImage(bmp, 0, 0);
      bmp.close();
      const blob = await oc.convertToBlob({ type: 'image/png' });
      oc.width = oc.height = 0;
      self.postMessage({ id, blob });
    } catch (err) { self.postMessage({ id, error: String(err) }); }
  };`;
  let encWorker = null, encBroken = false, encSeq = 0;
  const encWaiting = new Map();
  function encoder() {
    if (encWorker || encBroken) return encWorker;
    try {
      if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap !== 'function') throw new Error('sin soporte');
      const url = URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' }));
      encWorker = new Worker(url);
      URL.revokeObjectURL(url);
      encWorker.onmessage = (e) => {
        const w = encWaiting.get(e.data.id);
        if (!w) return;
        encWaiting.delete(e.data.id);
        if (e.data.blob) w.resolve(e.data.blob); else w.reject(new Error(e.data.error));
      };
      encWorker.onerror = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        encBroken = true;
        encWorker = null;
        for (const w of encWaiting.values()) w.reject(new Error('worker'));
        encWaiting.clear();
      };
    } catch (e) {
      encBroken = true;
      encWorker = null;
    }
    return encWorker;
  }
  async function encodePNG(canvas) {
    const wk = encoder();
    if (wk) {
      try {
        // createImageBitmap toma la foto del lienzo en este instante (los trazos siguientes no se mezclan).
        const bmpP = createImageBitmap(canvas);
        const bmp = await bmpP;
        const id = ++encSeq;
        return await new Promise((resolve, reject) => {
          encWaiting.set(id, { resolve, reject });
          wk.postMessage({ id, bmp }, [bmp]);
        });
      } catch (e) {
        /* se prueba en el hilo principal */
      }
    }
    return encodePNGMain(canvas);
  }
  async function encodePNGMain(canvas) {
    if (typeof OffscreenCanvas !== 'undefined' && OffscreenCanvas.prototype.convertToBlob) {
      let oc = null;
      try {
        oc = new OffscreenCanvas(canvas.width, canvas.height);
        oc.getContext('2d').drawImage(canvas, 0, 0);
        return await oc.convertToBlob({ type: 'image/png' });
      } catch (e) {
        /* si falla, se usa toBlob */
      } finally {
        if (oc) { oc.width = 0; oc.height = 0; } // libera la memoria ya (iOS tiene un tope de lienzos)
      }
    }
    return U.canvasToBlob(canvas, 'image/png');
  }

  /** Imagen final de una obra de pizarra: fondo + trazos, a la resolución guardada. */
  async function exportPNG(work) {
    const img = await U.blobToImage(work.paint);
    const meta = work.meta || {};
    const docW = meta.docW || img.width, docH = meta.docH || img.height;
    const c = U.canvas(img.width, img.height);
    const ctx = c.getContext('2d');
    ctx.scale(img.width / docW, img.height / docH);
    paintBackground(ctx, meta.bg, docW, docH);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(img, 0, 0);
    return U.canvasToBlob(c, 'image/png');
  }

  /* ---------- Íconos propios ---------- */
  const S = CL.icons.STROKE;
  const TIP = 'var(--pz-color, #ff3b30)';
  CL.icons.add({
    pzLapiz: `<g transform="rotate(45 24 24)">
      <path d="M18 9h12v25l-6 11-6-11z" fill="#ffd9a8" ${S}/>
      <path d="M21.6 38.4 24 43l2.4-4.6z" fill="${TIP}" stroke="${TIP}" stroke-width="1.5" stroke-linejoin="round"/>
      <rect x="18" y="9" width="12" height="25" fill="${TIP}" ${S}/>
      <path d="M22 11v21" stroke="rgba(255,255,255,.55)" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M18 9V5.5a2.5 2.5 0 0 1 2.5-2.5h7A2.5 2.5 0 0 1 30 5.5V9z" fill="#ff8fb1" ${S}/>
      <path d="M18 34l6 11 6-11" fill="none" ${S}/></g>`,
    pzFibra: `<g transform="rotate(45 24 24)">
      <path d="M20.5 35h7l-1 7.5a2.5 2.5 0 0 1-5 0z" fill="${TIP}" ${S}/>
      <rect x="18.5" y="30" width="11" height="6" rx="1.5" fill="#d9d4e6" ${S}/>
      <rect x="17" y="3" width="14" height="28" rx="4" fill="#ffffff" ${S}/>
      <rect x="17" y="3" width="14" height="10" rx="4" fill="${TIP}" ${S}/>
      <path d="M21 17v10" stroke="#d9d4e6" stroke-width="2.5" stroke-linecap="round"/></g>`,
    pzPincel: `<g transform="rotate(45 24 24)">
      <rect x="21" y="1.5" width="6" height="24" rx="3" fill="#ffb454" ${S}/>
      <rect x="19" y="24" width="10" height="7" rx="1.5" fill="#d9d4e6" ${S}/>
      <path d="M19 31c-1.5 6 1 11 5 15 4-4 6.5-9 5-15z" fill="${TIP}" ${S}/>
      <path d="M22 34c0 3 .8 5 2 7" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="2" stroke-linecap="round"/></g>`,
    pzCrayon: `<g transform="rotate(45 24 24)">
      <path d="M18.5 13 24 2.5 29.5 13z" fill="${TIP}" ${S}/>
      <rect x="17" y="13" width="14" height="31" rx="2.5" fill="${TIP}" ${S}/>
      <rect x="17" y="19" width="14" height="17" fill="#ffffff" ${S}/>
      <path d="M17 24l3.5-3 3.5 3 3.5-3 3.5 3M17 31l3.5-3 3.5 3 3.5-3 3.5 3" fill="none" stroke="${TIP}" stroke-width="2.2" stroke-linejoin="round"/></g>`,
    pzAerosol: `<rect x="10" y="17" width="20" height="27" rx="5" fill="${TIP}" ${S}/>
      <rect x="10" y="24" width="20" height="11" fill="#ffffff" ${S}/>
      <path d="M14 17v-4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4" fill="#d9d4e6" ${S}/>
      <rect x="17.5" y="6" width="6" height="5" rx="1.2" fill="#9a94ad" ${S}/>
      <g fill="${TIP}"><circle cx="31" cy="7" r="2"/><circle cx="36" cy="4.5" r="1.7"/><circle cx="37" cy="10" r="2.3"/>
      <circle cx="42.5" cy="6.5" r="1.8"/><circle cx="42" cy="13" r="1.6"/><circle cx="33" cy="12.5" r="1.4"/></g>`,
    pzArcoiris: `<g transform="rotate(45 24 24)">
      <path d="M20.5 35h7l-1 7.5a2.5 2.5 0 0 1-5 0z" fill="#ff5a8a" ${S}/>
      <rect x="18.5" y="30" width="11" height="6" rx="1.5" fill="#d9d4e6" ${S}/>
      <rect x="17" y="3" width="14" height="5" fill="#ff3b30"/><rect x="17" y="7.6" width="14" height="4.6" fill="#ff8a1f"/>
      <rect x="17" y="12" width="14" height="4.6" fill="#ffd60a"/><rect x="17" y="16.5" width="14" height="4.6" fill="#1fb35a"/>
      <rect x="17" y="21" width="14" height="4.6" fill="#3cc3ff"/><rect x="17" y="25.5" width="14" height="5.5" fill="#8b4dff"/>
      <rect x="17" y="3" width="14" height="28" rx="4" fill="none" ${S}/></g>`,
    pzBrillitos: `<path d="M8 42 27 23" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
      <path d="M8 42 27 23" stroke="#7b61ff" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M31 5.5l3 6.3 6.9 1-5 4.8 1.2 6.8-6.1-3.2-6.1 3.2 1.2-6.8-5-4.8 6.9-1z" fill="#ffd23f" ${S}/>
      <path d="M41 26c.6 3 1.4 3.8 4.4 4.4-3 .6-3.8 1.4-4.4 4.4-.6-3-1.4-3.8-4.4-4.4 3-.6 3.8-1.4 4.4-4.4z" fill="#ff5ab4" stroke="#ff5ab4" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M12 8c.5 2.5 1.2 3.2 3.7 3.7-2.5.5-3.2 1.2-3.7 3.7-.5-2.5-1.2-3.2-3.7-3.7 2.5-.5 3.2-1.2 3.7-3.7z" fill="#35c6ff" stroke="#35c6ff" stroke-width="1.5" stroke-linejoin="round"/>
      <circle cx="40" cy="41" r="2" fill="#2bc48a"/><circle cx="21" cy="11" r="1.6" fill="#ff9f1c"/>`,
    pzSellos: `<circle cx="24" cy="9" r="6.5" fill="#ff5a5f" ${S}/>
      <path d="M20.5 15h7v8h-7z" fill="#ffb454" ${S}/>
      <rect x="8" y="23" width="32" height="9" rx="3" fill="#ffb454" ${S}/>
      <rect x="10" y="32" width="28" height="4" rx="1" fill="#6a5f80" ${S}/>
      <path d="M24 37.5l1.9 3.8 4.2.6-3 3 .7 4.1-3.8-2-3.8 2 .7-4.1-3-3 4.2-.6z" fill="${TIP}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`,
    pzGoma: `<g transform="rotate(-35 24 24)">
      <rect x="7" y="15" width="34" height="18" rx="4" fill="#ff8fa3" ${S}/>
      <path d="M22 15h15a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H22z" fill="#4cc3ff" ${S}/>
      <path d="M11 20h6" stroke="rgba(255,255,255,.7)" stroke-width="2.5" stroke-linecap="round"/></g>
      <g fill="#ff8fa3" stroke="${INK}" stroke-width="1.6"><circle cx="9" cy="41" r="2"/><circle cx="15" cy="44" r="1.5"/></g>`,
    pzFondo: `<rect x="6" y="5" width="30" height="14" rx="5" fill="var(--pz-bgc, #fff4dc)" ${S}/>
      <path d="M36 12h5v12H24v6" fill="none" ${S}/>
      <rect x="20" y="30" width="8" height="15" rx="3" fill="#ff5a5f" ${S}/>
      <path d="M11 9.5v5M17 9.5v5M23 9.5v5M29 9.5v5" stroke="rgba(43,34,64,.18)" stroke-width="2" stroke-linecap="round"/>`,
  });

  /* ---------- Sonido de aerosol (siseo continuo) ---------- */
  // Se usa el loop 'scribble' del núcleo con parámetros por pincel (ver brush.loop).

  /* ---------- Pantalla ---------- */
  let current = null;
  // Guardados de una pizarra que ya se cerró (siguen en segundo plano): la próxima los espera al cargar.
  let background = Promise.resolve();

  /** Obra a la que van los guardados. Al vaciar una obra terminada se empieza otra (un "slot" nuevo). */
  const newSlot = (w) => ({ work: w || null, status: (w && w.status) || 'progress', seq: 0, dead: false });

  function createBoard(root, args) {
    const B = CL.brushes;
    const state = {
      tool: B.get(U.pref.get('pizarra.tool', 'fibra')) ? U.pref.get('pizarra.tool', 'fibra') : 'fibra',
      color: U.pref.get('pizarra.color', '#ff3b30'),
      size: U.clamp(U.pref.get('pizarra.size', 1) | 0, 0, 3),
      stamp: U.pref.get('pizarra.stamp', 'estrella'),
      bg: U.pref.get('pizarra.bg', 'blanco'),
      lastColorTool: U.pref.get('pizarra.lastColorTool', 'fibra'),
    };
    if (!COLORS.some((c) => c.c === state.color)) state.color = '#ff3b30';
    if (!CL.stamps.has(state.stamp)) state.stamp = 'estrella';
    if (!bgById[state.bg]) state.bg = 'blanco';

    let doc = null;          // { w, h, res, pw, ph }
    let docLocked = false;   // el tamaño viene de una obra guardada: no se rehace
    let scale = 1;           // px CSS de pantalla por unidad
    let slot = newSlot(null); // obra en IndexedDB (slot.work) y su estado
    let dirty = false;        // hay cambios sin foto para guardar
    let hasContent = false;
    let destroyed = false;
    let wiping = false;
    let finishing = false;
    let raf = 0;
    let modal = null;
    let penDown = 0;
    let soundLoop = null, soundBrush = null;
    const active = new Map();   // pointerId -> { st, live, brush }
    const livePool = [];
    const fxItems = [];
    let pendingFx = 0;
    let step = null;            // paso de deshacer en curso
    const undo = [];
    let boardRect = null;
    let lastFinishMs = 0;
    let wipeMs = 900; // duración de la barrita (las pruebas la pueden alargar para sacar capturas)

    /* ----- DOM ----- */
    root.classList.add('pz');
    const undoBtn = CL.ui.button({ icon: 'undo', label: 'Deshacer', cls: 'pz-undo', sound: null, onTap: doUndo });
    const clearBtn = CL.ui.holdButton({ label: 'Mantené apretado para borrar todo', cls: 'pz-clear', onConfirm: wipe });
    const actions = el('div.pz-actions', null, [undoBtn, clearBtn]);
    const doneBtn = CL.ui.button({ icon: 'check', label: '¡Terminé!', text: '¡Terminé!', cls: 'btn-go btn-pill pz-done', sound: 'tap', onTap: finish });
    const top = el('div.topbar.pz-top', null, [
      CL.ui.homeButton(), CL.ui.modeTabs('pizarra'), el('div.spacer'), actions, CL.ui.muteButton(), doneBtn,
    ]);

    const toolBtns = {};
    const tools = el('div.pz-tools.scroll-y', { role: 'toolbar', 'aria-label': 'Herramientas' });
    for (const b of B.list) {
      const btn = CL.ui.button({
        icon: b.icon, label: b.name, cls: 'pz-tool', sound: 'select',
        onTap: () => { selectTool(b.id); if (b.id === 'sellos') openStampPicker(); },
      });
      btn.dataset.tool = b.id;
      if (b.id === 'sellos') btn.append(el('span.pz-stamp-badge'));
      toolBtns[b.id] = btn;
      tools.append(btn);
    }

    const sizeBtns = [];
    const sizes = el('div.pz-sizes', { role: 'radiogroup', 'aria-label': 'Grosor' });
    SIZE_NAMES.forEach((name, i) => {
      const b = CL.ui.button({ label: name, cls: 'btn-sm pz-size', sound: 'tap', soundOpts: { pitch: 1.3 - i * 0.15 }, onTap: () => selectSize(i) });
      const dotEl = el('span.pz-dot');
      dotEl.style.setProperty('--d', SIZE_DOTS[i] + 'px');
      b.append(dotEl);
      b.setAttribute('role', 'radio');
      sizeBtns.push(b);
      sizes.append(b);
    });
    const bgBtn = CL.ui.button({ icon: 'pzFondo', label: 'Fondo', cls: 'pz-bgbtn', sound: 'open', onTap: openBgPicker });
    const row1 = el('div.pz-row1', null, [sizes, bgBtn]);
    const swatches = [];
    const palette = el('div.pz-palette', { role: 'radiogroup', 'aria-label': 'Colores' });
    COLORS.forEach((col, i) => {
      const b = el('button.pz-swatch', {
        type: 'button', 'aria-label': col.name, title: col.name, role: 'radio',
        style: { background: col.c === 'multi' ? RAINBOW_CSS : col.c },
        onclick: () => { CL.sound.play('pop', { pitch: 0.8 + (i % 8) * 0.06 }); selectColor(col.c); },
      });
      if (col.c === '#ffffff') b.classList.add('pz-swatch--white');
      if (col.c === 'multi') b.classList.add('pz-swatch--multi');
      b.dataset.color = col.c;
      swatches.push(b);
      palette.append(b);
    });
    const paletteWrap = el('div.pz-palette-wrap.scroll-x', null, palette);
    const panel = el('div.pz-panel', null, [row1, paletteWrap]);

    const bgCanvas = el('canvas.pz-bg');
    const layerCanvas = el('canvas.pz-layer');
    const fxCanvas = el('canvas.pz-fx');
    const wiper = el('div.pz-wiper', { 'aria-hidden': 'true' }, [el('div.pz-wiper-bar'), el('div.pz-wiper-knob')]);
    const board = el('div.pz-board', null, [bgCanvas, layerCanvas, fxCanvas, wiper]);
    const stage = el('div.pz-stage', { 'aria-label': 'Pizarra para dibujar' }, board);
    CL.ui.noGestures(stage);
    const main = el('div.pz-main', null, [tools, stage, panel]);
    root.append(top, main);

    const L = layerCanvas.getContext('2d');
    const BG = bgCanvas.getContext('2d');
    const F = fxCanvas.getContext('2d');
    const pre = document.createElement('canvas'); // copia de la capa al empezar un paso (deshacer)
    const P = pre.getContext('2d');

    /* ----- Distribución según la pantalla ----- */
    let layoutRaf = 0;
    function relayout() {
      layoutRaf = 0;
      if (destroyed) return;
      const W = root.clientWidth, H = root.clientHeight;
      if (!W || !H) return;
      const land = W > H * 1.02;
      // Compacto: celulares, y también tablets chicas en vertical (7"-8", hasta ~740 px de ancho),
      // donde la barra de arriba con "¡Terminé!" y texto no entra.
      const compact = Math.min(W, H) < 520 || (!land && W < 740);
      root.classList.toggle('pz--land', land);
      root.classList.toggle('pz--port', !land);
      root.classList.toggle('pz--compact', compact);
      // En vertical compacto, deshacer y borrar bajan a la fila de grosores.
      const actHome = compact && !land ? row1 : top;
      if (actions.parentNode !== actHome) {
        if (actHome === top) top.insertBefore(actions, top.children[3] || null);
        else row1.append(actions);
      }
      layoutPalette(land);
      // Celular vertical angosto (paleta en 3 filas) o celular horizontal: el botón de fondo pasa al final
      // de la columna de herramientas (ahí sobra un lugar), así el resto entra con botones de 46 px.
      const narrow = root.classList.contains('pz-prow3') || (compact && land);
      if (narrow && bgBtn.parentNode !== tools) tools.append(bgBtn);
      else if (!narrow && bgBtn.parentNode !== row1) row1.insertBefore(bgBtn, sizes.nextSibling);
      // Herramientas: tantas filas como entren (y si no, más columnas).
      const n = tools.children.length;
      const btn = tools.firstChild ? tools.firstChild.offsetHeight || 54 : 54;
      const gap = parseFloat(getComputedStyle(tools).rowGap) || 8;
      tools.style.setProperty('--pz-rows', n);
      const avail = tools.clientHeight - 8;
      const rows = Math.max(1, Math.min(n, Math.floor((avail + gap) / (btn + gap))));
      const cols = Math.ceil(n / rows);
      tools.style.setProperty('--pz-rows', Math.ceil(n / cols));
      fit();
    }
    /** Paleta: en horizontal, 4 columnas si el panel no entra en el alto (un chico no descubre un
        scroll invisible); en vertical, 2 filas si entran a lo ancho y si no 3 (círculos de 46 px). */
    function layoutPalette(land) {
      root.classList.remove('pz-pal4', 'pz-pal-tight', 'pz-prow3');
      if (land) {
        const over = () => panel.scrollHeight > panel.clientHeight + 1;
        for (const c of ['pz-pal4', 'pz-pal-tight']) {
          if (!over()) break;
          root.classList.add(c);
        }
      } else {
        const cs = getComputedStyle(palette);
        const sw = parseFloat(getComputedStyle(root).getPropertyValue('--pz-sw')) || 46;
        const gap = parseFloat(cs.columnGap) || 6;
        const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
        const cols = Math.ceil(COLORS.length / 2);
        const avail = panel.clientWidth - parseFloat(getComputedStyle(panel).paddingLeft) - parseFloat(getComputedStyle(panel).paddingRight);
        if (cols * sw + (cols - 1) * gap + pad > avail) root.classList.add('pz-prow3');
      }
    }
    const scheduleLayout = () => { if (!layoutRaf) layoutRaf = requestAnimationFrame(relayout); };
    const ro = new ResizeObserver(scheduleLayout);
    ro.observe(root);
    ro.observe(stage);

    function stageSize() {
      const cs = getComputedStyle(stage);
      const w = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const h = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      return { w: Math.max(40, Math.floor(w)), h: Math.max(40, Math.floor(h)) };
    }

    function canRecreate() {
      return !docLocked && !hasContent && !undo.length && !active.size && !pendingFx && !wiping && !step;
    }

    function fit() {
      if (!doc) return;
      const s = stageSize();
      if (canRecreate() && (Math.abs(s.w - doc.w) > 1 || Math.abs(s.h - doc.h) > 1)) setupDoc(s.w, s.h);
      scale = Math.min(s.w / doc.w, s.h / doc.h);
      board.style.width = Math.round(doc.w * scale) + 'px';
      board.style.height = Math.round(doc.h * scale) + 'px';
      // Si la pantalla rota en medio de un trazo, el resto del trazo tiene que seguir al dedo.
      if (active.size) boardRect = board.getBoundingClientRect();
    }

    /** Crea (o rehace) el documento de w×h unidades. */
    function setupDoc(w, h, pw, ph) {
      const res = pw ? pw / w : Math.min(U.dpr(), Math.sqrt(MAX_PX / (w * h)));
      doc = { w, h, res, pw: pw || Math.round(w * res), ph: ph || Math.round(h * res) };
      for (const c of [bgCanvas, layerCanvas, fxCanvas, pre]) { c.width = doc.pw; c.height = doc.ph; }
      for (const lv of livePool) freeLive(lv);
      livePool.length = 0;
      L.setTransform(doc.res, 0, 0, doc.res, 0, 0);
      F.setTransform(doc.res, 0, 0, doc.res, 0, 0);
      paintBg();
    }

    function paintBg() {
      if (!doc) return;
      BG.setTransform(doc.res, 0, 0, doc.res, 0, 0);
      paintBackground(BG, state.bg, doc.w, doc.h);
      const d = bgDef(state.bg);
      board.classList.toggle('pz-board--chalk', !!d.dark);
      root.style.setProperty('--pz-bgc', d.color);
    }

    /* ----- Estado de herramientas ----- */
    function brushOf(id) { return B.get(id) || B.get('fibra'); }

    function selectTool(id) {
      state.tool = id;
      U.pref.set('pizarra.tool', id);
      const b = brushOf(id);
      if (b.usesColor) { state.lastColorTool = id; U.pref.set('pizarra.lastColorTool', id); }
      refresh();
    }
    function selectSize(i) { state.size = i; U.pref.set('pizarra.size', i); refresh(); }
    function selectColor(c) {
      state.color = c;
      U.pref.set('pizarra.color', c);
      // Con la goma o el arcoíris, tocar un color vuelve a la última herramienta que pinta.
      if (!brushOf(state.tool).usesColor) selectTool(state.lastColorTool || 'fibra');
      refresh();
    }

    function refresh() {
      const b = brushOf(state.tool);
      for (const id in toolBtns) {
        toolBtns[id].classList.toggle('active', id === state.tool);
        toolBtns[id].setAttribute('aria-pressed', String(id === state.tool));
      }
      sizeBtns.forEach((btn, i) => { btn.classList.toggle('active', i === state.size); btn.setAttribute('aria-checked', String(i === state.size)); });
      swatches.forEach((sw) => {
        const on = sw.dataset.color === state.color;
        sw.classList.toggle('active', on);
        sw.setAttribute('aria-checked', String(on));
      });
      root.dataset.tool = state.tool;
      palette.classList.toggle('pz-palette--off', !b.usesColor);
      const tip = state.color === 'multi' ? '#ff5ab4' : state.color;
      root.style.setProperty('--pz-color', tip);
      let dot;
      if (state.tool === 'goma') dot = '#ffffff';
      else if (state.tool === 'arcoiris' || state.color === 'multi') dot = RAINBOW_CSS;
      else dot = state.color;
      root.style.setProperty('--pz-dot', dot);
      // miniatura del sello actual
      const badge = toolBtns.sellos && toolBtns.sellos.querySelector('.pz-stamp-badge');
      if (badge) badge.replaceChildren(CL.stamps.thumb(state.stamp, 30, state.color));
      undoBtn.classList.toggle('disabled', !undo.length);
      undoBtn.setAttribute('aria-disabled', String(!undo.length));
    }

    function sizeUnit() {
      const s = stageSize();
      const k = U.clamp(Math.min(s.w, s.h) / 560, 0.85, 1.35);
      return k / scale;
    }

    /* ----- Lienzos "en vivo" (uno por trazo con buffer) ----- */
    function acquireLive(b) {
      const alpha = b.alpha;
      let lv = livePool.pop();
      if (!lv) {
        const c = el('canvas.pz-live');
        c.width = doc.pw; c.height = doc.ph;
        lv = { canvas: c, ctx: c.getContext('2d'), shape: null };
      }
      // Los pinceles con textura arman la forma opaca en un lienzo oculto aparte.
      if (b.texture && !lv.shape) {
        const sc = document.createElement('canvas');
        sc.width = doc.pw; sc.height = doc.ph;
        lv.shape = { canvas: sc, ctx: sc.getContext('2d') };
      }
      if (lv.shape) lv.shape.ctx.setTransform(doc.res, 0, 0, doc.res, 0, 0);
      board.insertBefore(lv.canvas, fxCanvas);
      lv.canvas.style.opacity = String(alpha);
      lv.canvas.hidden = false;
      lv.ctx.setTransform(doc.res, 0, 0, doc.res, 0, 0);
      return lv;
    }
    function releaseLive(lv) {
      lv.canvas.hidden = true;
      if (livePool.length < POOL_KEEP) { livePool.push(lv); return; }
      // Sobran: se liberan (cada uno ocupa lo mismo que la capa entera).
      freeLive(lv);
    }
    function freeLive(lv) {
      lv.canvas.remove();
      lv.canvas.width = lv.canvas.height = 0;
      if (lv.shape) { lv.shape.canvas.width = lv.shape.canvas.height = 0; lv.shape = null; }
    }

    /** Rectángulo en píxeles reales (con margen) de un bbox en unidades. */
    function devRect(bb) {
      const r = doc.res;
      const x0 = U.clamp(Math.floor(bb.x0 * r) - 2, 0, doc.pw), y0 = U.clamp(Math.floor(bb.y0 * r) - 2, 0, doc.ph);
      const x1 = U.clamp(Math.ceil(bb.x1 * r) + 2, 0, doc.pw), y1 = U.clamp(Math.ceil(bb.y1 * r) + 2, 0, doc.ph);
      return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    }

    /* ----- Deshacer ----- */
    function beginStep() {
      step = { bbox: null, content: false, cleared: false, prev: hasContent };
      P.setTransform(1, 0, 0, 1, 0, 0);
      P.clearRect(0, 0, doc.pw, doc.ph);
      P.drawImage(layerCanvas, 0, 0);
    }
    function growStep(bb) {
      if (!bb || !step) return;
      const s = step.bbox;
      if (!s) { step.bbox = { x0: bb.x0, y0: bb.y0, x1: bb.x1, y1: bb.y1 }; return; }
      s.x0 = Math.min(s.x0, bb.x0); s.y0 = Math.min(s.y0, bb.y0);
      s.x1 = Math.max(s.x1, bb.x1); s.y1 = Math.max(s.y1, bb.y1);
    }
    function maybeEndStep() {
      if (step && !active.size && !pendingFx && !wiping) endStep();
    }
    function endStep() {
      const s = step;
      step = null;
      if (!s || !s.bbox) return;
      const r = devRect(s.bbox);
      if (r.w <= 0 || r.h <= 0) return;
      const img = U.canvas(r.w, r.h);
      img.getContext('2d').drawImage(pre, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
      const entry = { r, img, prev: s.prev, detached: null };
      undo.push(entry);
      if (s.cleared) hasContent = false;
      else if (s.content) hasContent = true;
      else if (hasContent && layerIsEmpty()) hasContent = false; // la goma borró todo el dibujo
      if (!hasContent && slot.status === 'done') {
        // Una obra terminada nunca queda vacía en la galería: un chico que borra todo quiere empezar
        // otro dibujo. Lo último que dibujó (si no se había guardado) queda en ella, y lo que siga es
        // una obra nueva. Deshacer el borrado la vuelve a enganchar.
        if (dirty) queueSave({ src: pre, empty: false });
        entry.detached = slot;
        slot = newSlot(null);
        fixHash();
      }
      dirty = true;
      // Límite: 12 pasos y no más de ~4 lienzos completos de memoria.
      let px = undo.reduce((a, u) => a + u.r.w * u.r.h, 0);
      while (undo.length > 12 || (undo.length > 1 && px > doc.pw * doc.ph * 4)) {
        const u = undo.shift();
        px -= u.r.w * u.r.h;
      }
      refresh();
      saveSoon();
    }
    /** ¿La capa de trazos quedó vacía? Se mira reducida (barato: no lee la capa entera). */
    let probe = null;
    function layerIsEmpty() {
      const N = 256;
      const k = Math.min(1, N / Math.max(doc.pw, doc.ph));
      const w = Math.max(1, Math.round(doc.pw * k)), h = Math.max(1, Math.round(doc.ph * k));
      if (!probe) probe = document.createElement('canvas');
      probe.width = w; probe.height = h; // también lo limpia
      const x = probe.getContext('2d', { willReadFrequently: true });
      x.imageSmoothingEnabled = true;
      x.imageSmoothingQuality = 'high';
      x.drawImage(layerCanvas, 0, 0, w, h);
      const d = x.getImageData(0, 0, w, h).data;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 2) return false;
      return true;
    }

    function doUndo() {
      if (!undo.length) { CL.sound.play('nope'); return; }
      if (active.size || wiping || finishing) return;
      finishFx();
      if (step) endStep();
      const u = undo.pop();
      L.save();
      L.setTransform(1, 0, 0, 1, 0, 0);
      L.clearRect(u.r.x, u.r.y, u.r.w, u.r.h);
      L.drawImage(u.img, u.r.x, u.r.y);
      L.restore();
      hasContent = u.prev;
      dirty = true;
      if (u.detached) reattach(u.detached);
      CL.sound.play('undo');
      refresh();
      saveSoon();
    }
    /** Deshacer un "borrar todo" sobre una obra terminada: vuelve a ser esa obra (tal como quedó
        guardada), y la obra nueva que se hubiera empezado (vacía otra vez) se descarta. */
    function reattach(old) {
      const cur = slot;
      if (cur === old) return;
      cur.dead = true; // sus fotos en cola ya no se escriben
      queue(async () => {
        if (cur.work && cur.work.status === 'progress') {
          const id = cur.work.id;
          cur.work = null;
          await CL.db.works.del(id);
        }
      });
      slot = old;
      dirty = false; // la capa volvió a lo que ya tiene guardado
      fixHash();
    }

    /* ----- Animaciones cortas (fx) ----- */
    const fxApi = {
      add(item) {
        item.t0 = performance.now();
        fxItems.push(item);
        if (item.done) pendingFx++;
        kick();
      },
    };
    let fxDirty = false;
    function drawFx(now) {
      if (!fxItems.length && !fxDirty) return;
      F.save();
      F.setTransform(1, 0, 0, 1, 0, 0);
      F.clearRect(0, 0, doc.pw, doc.ph);
      F.restore();
      let doneAny = false;
      for (let i = 0; i < fxItems.length; i++) {
        const it = fxItems[i];
        const k = Math.min(1, (now - it.t0) / it.dur);
        if (k >= 1) {
          fxItems.splice(i--, 1);
          if (it.done) { it.done(); pendingFx--; doneAny = true; }
          continue;
        }
        F.save();
        it.draw(F, k);
        F.restore();
      }
      fxDirty = fxItems.length > 0;
      if (doneAny) maybeEndStep();
    }
    /** Termina ya todas las animaciones (los sellos quedan pegados en la capa). */
    function finishFx() {
      while (fxItems.length) {
        const it = fxItems.shift();
        if (it.done) { it.done(); pendingFx--; }
      }
      pendingFx = 0;
      fxDirty = false;
      if (!doc) return;
      F.save(); F.setTransform(1, 0, 0, 1, 0, 0); F.clearRect(0, 0, doc.pw, doc.ph); F.restore();
    }

    /* ----- Bucle de dibujo ----- */
    function loop(now) {
      raf = 0;
      if (destroyed) return;
      for (const a of active.values()) a.st.frame(now);
      drawFx(now);
      updateSound();
      if (active.size || fxItems.length || fxDirty) raf = requestAnimationFrame(loop);
    }
    function kick() { if (!raf && !destroyed) raf = requestAnimationFrame(loop); }

    function updateSound() {
      if (!active.size) { stopSound(); return; }
      const first = active.values().next().value;
      const b = first.brush;
      if (!b.loop) return;
      if (!soundLoop || soundBrush !== b.id) {
        stopSound();
        soundLoop = CL.sound.loop('scribble', { freq: b.loop.freq, q: b.loop.q, vol: b.loop.vol });
        soundBrush = b.id;
      }
      let sp = 0;
      for (const a of active.values()) sp = Math.max(sp, a.st.speed * scale);
      if (b.loop.steady) sp = Math.max(sp, b.loop.steady);
      soundLoop.update({ speed: sp });
    }
    function stopSound() {
      if (soundLoop) { soundLoop.stop(); soundLoop = null; soundBrush = null; }
    }

    /* ----- Punteros (mouse, dedos y lápiz) ----- */
    function toDoc(ev) {
      const r = boardRect;
      return {
        x: ((ev.clientX - r.left) * doc.w) / r.width,
        y: ((ev.clientY - r.top) * doc.h) / r.height,
        p: U.pressure(ev),
        t: ev.timeStamp || performance.now(),
      };
    }

    function onDown(ev) {
      // destroyed: la pantalla se está yendo; un dedo nuevo no arranca trazos ni sonidos.
      if (destroyed || !doc || wiping || finishing || modal) return;
      if (ev.pointerType === 'mouse' && ev.button !== 0) return;
      if (ev.pointerType === 'touch' && penDown) return; // la palma no dibuja mientras se usa el lápiz
      // Una mano entera apoyada: se dibuja con los primeros dedos (cada trazo usa lienzos del tamaño de la capa).
      if (ev.pointerType === 'touch' && !active.has(ev.pointerId) && active.size >= MAX_FINGERS) return;
      ev.preventDefault();
      try { stage.setPointerCapture(ev.pointerId); } catch (e) { /* nada */ }
      if (ev.pointerType === 'pen') penDown++;
      if (active.has(ev.pointerId)) endStroke(ev.pointerId);
      boardRect = board.getBoundingClientRect();
      if (!step) beginStep();
      const b = brushOf(state.tool);
      const live = b.buffered ? acquireLive(b) : null;
      const pt = toDoc(ev);
      const st = B.begin(b.id, {
        layer: L, live: live && live.ctx, shape: live && live.shape && live.shape.ctx, res: doc.res, color: state.color, size: state.size,
        unit: sizeUnit(), pen: ev.pointerType === 'pen', dark: !!bgDef(state.bg).dark,
        stamp: state.stamp, fx: fxApi, sound: (n, o) => CL.sound.play(n, o),
      }, pt);
      active.set(ev.pointerId, { st, live, brush: b, pen: ev.pointerType === 'pen' });
      kick();
    }

    function onMove(ev) {
      const a = active.get(ev.pointerId);
      if (!a) return;
      ev.preventDefault();
      let list = ev.getCoalescedEvents ? ev.getCoalescedEvents() : null;
      if (!list || !list.length) list = [ev];
      for (const e of list) {
        const p = toDoc(e);
        a.st.add(p.x, p.y, p.p, p.t);
      }
    }

    function onUp(ev) {
      const a = active.get(ev.pointerId);
      if (!a) return;
      // El punto de pointerup coincide con el último movimiento y en lápiz trae presión 0: no se agrega.
      endStroke(ev.pointerId);
    }

    function endStroke(id) {
      const a = active.get(id);
      if (!a) return;
      active.delete(id);
      if (a.pen) penDown = Math.max(0, penDown - 1);
      a.st.end();
      const bb = a.st.bbox;
      if (a.live) {
        if (bb) {
          const r = devRect(bb);
          if (r.w > 0 && r.h > 0) {
            L.save();
            L.setTransform(1, 0, 0, 1, 0, 0);
            L.globalAlpha = a.brush.alpha;
            L.drawImage(a.live.canvas, r.x, r.y, r.w, r.h, r.x, r.y, r.w, r.h);
            L.restore();
            for (const x of [a.live.ctx, a.live.shape && a.live.shape.ctx]) {
              if (!x) continue;
              x.save();
              x.setTransform(1, 0, 0, 1, 0, 0);
              x.clearRect(r.x, r.y, r.w, r.h);
              x.restore();
            }
          }
        }
        releaseLive(a.live);
      }
      if (bb && step) {
        growStep(bb);
        if (a.brush.id !== 'goma') step.content = true;
      }
      if (!active.size) stopSound();
      maybeEndStep();
    }
    function endAll() { for (const id of [...active.keys()]) endStroke(id); }

    stage.addEventListener('pointerdown', onDown);
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerup', onUp);
    stage.addEventListener('pointercancel', onUp);
    stage.addEventListener('lostpointercapture', onUp);

    function onKey(ev) {
      if ((ev.ctrlKey || ev.metaKey) && !ev.shiftKey && (ev.key === 'z' || ev.key === 'Z')) {
        ev.preventDefault();
        doUndo();
      }
    }
    window.addEventListener('keydown', onKey);

    /* ----- Borrar todo: la barrita de la pizarra mágica ----- */
    function wipe() {
      if (wiping || finishing || !doc) return;
      endAll();
      finishFx();
      // Lo que estaba en curso (p. ej. sellos que todavía saltaban) es un paso aparte: así la foto
      // de antes de borrar (pre) tiene todo lo dibujado.
      if (step) endStep();
      beginStep();
      step.bbox = { x0: 0, y0: 0, x1: doc.w, y1: doc.h };
      step.cleared = true;
      wiping = true;
      board.classList.add('pz-wiping');
      CL.sound.play('whoosh', { dur: 0.95 });
      const bw = board.clientWidth;
      const barW = wiper.offsetWidth || 40;
      const D = wipeMs;
      const t0 = performance.now();
      const ease = (k) => 0.5 - 0.5 * Math.cos(Math.PI * k);
      const frame = (now) => {
        if (destroyed) return;
        const k = Math.min(1, (now - t0) / D);
        const cx = -barW / 2 + ease(k) * (bw + barW); // centro de la barrita (px CSS)
        wiper.style.transform = `translateX(${(cx - barW / 2).toFixed(1)}px)`;
        const xd = U.clamp((cx / bw) * doc.w, 0, doc.w);
        if (xd > 0) L.clearRect(0, 0, xd, doc.h);
        if (k < 1) { requestAnimationFrame(frame); return; }
        L.clearRect(0, 0, doc.w, doc.h);
        wiping = false;
        board.classList.remove('pz-wiping');
        wiper.style.transform = '';
        endStep();
      };
      wiper.style.transform = `translateX(${-barW}px)`;
      requestAnimationFrame(frame);
    }

    /* ----- Selectores (sellos y fondo) ----- */
    function openStampPicker() {
      if (modal) return;
      const grid = el('div.pz-pick-grid.pz-pick-grid--stamps');
      for (const s of CL.stamps.list) {
        const b = el('button.pz-pick', {
          type: 'button', 'aria-label': s.name, title: s.name,
          onclick: () => {
            state.stamp = s.id;
            U.pref.set('pizarra.stamp', s.id);
            CL.sound.play('stamp');
            refresh();
            if (modal) modal.close();
          },
        }, CL.stamps.thumb(s.id, 76, state.color));
        if (s.id === state.stamp) b.classList.add('active');
        grid.append(b);
      }
      openModal(el('div.pz-pick-box', null, [el('div.pz-pick-head', null, CL.icon('pzSellos')), grid]));
    }

    /** Abre un selector. Durante un instante se ignoran los toques dentro del selector: un doble toque
        rápido de un chico no lo cierra (fondo) ni elige algo sin querer. */
    let unguard = null;
    function openModal(content) {
      modal = CL.ui.modal(content, { cls: 'pz-modal', onClose: () => { modal = null; if (unguard) unguard(); } });
      const back = modal.root.parentNode;
      const t0 = performance.now();
      const guard = (ev) => {
        if (performance.now() - t0 > MODAL_GUARD_MS) { unguard(); return; }
        if (back.contains(ev.target)) { ev.stopPropagation(); ev.preventDefault(); }
      };
      const types = ['pointerdown', 'click'];
      for (const ty of types) window.addEventListener(ty, guard, true);
      const timer = setTimeout(() => unguard && unguard(), MODAL_GUARD_MS + 50);
      unguard = () => {
        for (const ty of types) window.removeEventListener(ty, guard, true);
        clearTimeout(timer);
        unguard = null;
      };
    }

    function openBgPicker() {
      if (modal) return;
      const grid = el('div.pz-pick-grid.pz-pick-grid--bg');
      for (const bg of BACKGROUNDS) {
        const c = U.canvas(120 * U.dpr(), 84 * U.dpr());
        c.style.width = '120px';
        c.style.height = '84px';
        const x = c.getContext('2d');
        x.scale(U.dpr(), U.dpr());
        // Se pinta como una pizarra de 600×420 achicada, para que la textura se vea igual.
        x.scale(120 / 600, 84 / 420);
        paintBackground(x, bg.id, 600, 420);
        const b = el('button.pz-pick.pz-pick--bg', {
          type: 'button', 'aria-label': bg.name, title: bg.name,
          onclick: () => { setBg(bg.id); if (modal) modal.close(); },
        }, c);
        if (bg.id === state.bg) b.classList.add('active');
        grid.append(b);
      }
      openModal(el('div.pz-pick-box', null, [el('div.pz-pick-head', null, CL.icon('pzFondo')), grid]));
    }

    function setBg(id) {
      if (!bgById[id]) return;
      state.bg = id;
      U.pref.set('pizarra.bg', id);
      CL.sound.play('splash');
      if (!doc) return; // todavía cargando: setupDoc pinta el fondo elegido
      paintBg();
      if (hasContent || slot.work) { dirty = true; saveSoon(); }
    }

    /* ----- Guardado -----
       Cada guardado saca una FOTO sincrónica (copia de la capa + miniatura) y la codificación y la
       escritura siguen en cola, en segundo plano: los trazos siguientes no se mezclan y salir de la
       pantalla no espera a que termine de codificar el PNG. */
    let chain = Promise.resolve();
    // Con dedos apoyados o la barrita en marcha se espera (codificar el PNG en medio de un trazo daría tirones).
    const saveSoon = U.debounce(() => {
      if ((active.size || wiping) && !destroyed) { saveSoon(); return; }
      if (dirty) queueSave();
    }, SAVE_MS);
    function queue(job) {
      chain = chain.then(job).catch((e) => console.warn('Pizarra: no se pudo guardar', e));
      return chain;
    }
    /** Foto de ahora para el slot actual. opts: { src (lienzo del tamaño de la capa), status, empty }. */
    function queueSave(opts) {
      if (!doc) return chain;
      const o = opts || {};
      const src = o.src || layerCanvas;
      const sl = slot;
      const empty = o.empty !== undefined ? o.empty : !hasContent && !o.status;
      if (o.status === 'done') sl.status = 'done'; // las fotos que sigan también son de una obra terminada
      const snap = {
        slot: sl,
        // Una foto con dibujo deja viejas a las anteriores de la cola; una vacía no (no tapa a la última con dibujo).
        seq: empty ? sl.seq : ++sl.seq,
        status: o.status || sl.status,
        empty, bg: state.bg, docW: doc.w, docH: doc.h, pw: doc.pw, ph: doc.ph,
        paint: null, thumb: null,
      };
      if (!empty) {
        snap.paint = U.canvas(doc.pw, doc.ph);
        snap.paint.getContext('2d').drawImage(src, 0, 0);
        snap.thumb = composeThumb(480, src);
      }
      dirty = false;
      return queue(() => writeSnap(snap));
    }
    function composeThumb(max, src) {
      const s = Math.min(1, max / Math.max(doc.pw, doc.ph));
      const tw = Math.max(1, Math.round(doc.pw * s)), th = Math.max(1, Math.round(doc.ph * s));
      const c = U.canvas(tw, th);
      const x = c.getContext('2d');
      x.scale(tw / doc.w, th / doc.h);
      paintBackground(x, state.bg, doc.w, doc.h);
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.imageSmoothingQuality = 'high';
      x.drawImage(src, 0, 0, tw, th);
      return c;
    }
    async function writeSnap(snap) {
      const sl = snap.slot;
      try {
        if (sl.dead || snap.seq < sl.seq) return; // hay una foto más nueva de esta obra en la cola
        if (snap.empty) {
          // Lienzo vacío: no se crea obra; si había un progreso, se descarta. Una obra terminada no se
          // pisa con una hoja en blanco (queda la última versión con dibujo).
          if (sl.work && sl.work.status === 'progress') {
            const id = sl.work.id;
            sl.work = null;
            await CL.db.works.del(id);
            if (sl === slot) fixHash();
          }
          return;
        }
        // Capa (PNG, sin pérdida) y miniatura se codifican a la vez.
        const [paint, thumb] = await Promise.all([encodePNG(snap.paint), encodePNG(snap.thumb)]);
        if (sl.dead) return;
        const w = sl.work;
        const rec = Object.assign({}, w || {}, {
          kind: 'pizarra',
          source: 'pizarra',
          status: snap.status,
          w: snap.pw,
          h: snap.ph,
          paint,
          thumb,
          meta: Object.assign({}, (w && w.meta) || {}, { bg: snap.bg, docW: snap.docW, docH: snap.docH }),
        });
        sl.work = await CL.db.works.save(rec);
        sl.status = sl.work.status;
        if (sl === slot) fixHash();
      } finally {
        for (const c of [snap.paint, snap.thumb]) if (c) { c.width = 0; c.height = 0; }
        snap.paint = snap.thumb = null;
      }
    }

    /** La URL sigue a la obra que se ve, sin volver a montar la pantalla: una obra terminada es
        #pizarra/<id> (al recargar o volver con "atrás" se reabre ESA); una obra nueva, #pizarra. */
    function fixHash() {
      if (destroyed) return;
      const r = CL.router.current;
      if (!r || r.name !== 'pizarra') return;
      const h = location.hash;
      if (!/^#pizarra(\/|$)/.test(h)) return;
      const w = slot.work;
      const want = w && (slot.status === 'done' || h !== '#pizarra') ? '#pizarra/' + w.id : '#pizarra';
      if (h === want) return;
      try { history.replaceState(history.state, '', want); } catch (e) { /* nada */ }
    }

    /* ----- ¡Terminé! ----- */
    async function finish() {
      if (finishing || wiping || !doc) return;
      endAll();
      finishFx();
      if (step) endStep();
      if (!hasContent) {
        CL.sound.play('nope');
        board.classList.remove('pz-shake');
        void board.offsetWidth;
        board.classList.add('pz-shake');
        return;
      }
      finishing = true;
      saveSoon.cancel();
      const sl = slot;
      const prevStatus = sl.status, prevWork = sl.work;
      // El festejo arranca ya; el guardado (codificar el PNG puede tardar) corre en paralelo.
      const t0 = performance.now();
      await Promise.all([CL.ui.celebrate(), queueSave({ status: 'done' })]);
      if (!sl.work || sl.work === prevWork || sl.work.status !== 'done') { // no se pudo guardar
        sl.status = prevStatus;
        dirty = true;
        finishing = false;
        return;
      }
      if (destroyed) return;
      lastFinishMs = Math.round(performance.now() - t0);
      // La entrada actual del historial pasa a ser ESTA obra (sin volver a montar la pantalla): el
      // "atrás" desde la galería la vuelve a mostrar terminada, no una pizarra en blanco.
      try { history.replaceState(history.state, '', '#pizarra/' + sl.work.id); } catch (e) { /* nada */ }
      CL.router.go('obras/' + sl.work.id);
    }

    /* ----- Carga inicial ----- */
    async function load() {
      relayout();
      const id = args && args[0];
      let w = null;
      const stopSpin = CL.ui.spinner(stage);
      // Si recién se salió de la pizarra y su último guardado sigue en camino, se espera (si no, esta
      // pantalla no vería ese progreso y empezaría otra obra).
      await Promise.race([background, U.sleep(8000)]);
      if (destroyed) { stopSpin(); return; }
      try {
        if (id) {
          w = await CL.db.works.get(id);
          if (!w || w.kind !== 'pizarra') { stopSpin(); CL.router.replace('pizarra'); return; }
        } else {
          w = await CL.db.works.findProgress('pizarra', 'pizarra');
        }
      } catch (e) {
        console.warn('Pizarra: no se pudo leer la obra', e);
        w = null;
      }
      if (destroyed) { stopSpin(); return; }
      let img = null;
      if (w && w.paint) {
        try { img = await U.blobToImage(w.paint); } catch (e) { console.warn('Pizarra: imagen dañada', e); }
      }
      stopSpin();
      if (destroyed) return;
      if (img) {
        slot = newSlot(w);
        const meta = w.meta || {};
        if (bgById[meta.bg]) state.bg = meta.bg;
        const docW = meta.docW || img.width / U.dpr();
        const docH = meta.docH || img.height / U.dpr();
        setupDoc(docW, docH, img.width, img.height);
        L.save();
        L.setTransform(1, 0, 0, 1, 0, 0);
        L.drawImage(img, 0, 0, doc.pw, doc.ph);
        L.restore();
        docLocked = true;
        // Una obra guardada vacía (de una versión vieja) no cuenta como dibujo: ¡Terminé! no la festeja.
        hasContent = !layerIsEmpty();
      } else {
        const s = stageSize();
        setupDoc(s.w, s.h);
      }
      fit();
      refresh();
    }

    refresh();
    const ready = load();

    return {
      ready,
      /** Para pruebas y otros módulos. */
      get state() { return state; },
      get doc() { return doc; },
      get work() { return slot.work; },
      save: () => { saveSoon.cancel(); return queueSave(); },
      saveNow() {
        if (!doc) return chain;
        if (active.size) endAll();
        if (pendingFx) finishFx(); // los sellos que estaban "saltando" quedan pegados ya
        if (step && !wiping) endStep();
        saveSoon.flush();
        return chain;
      },
      destroy() {
        destroyed = true;
        cancelAnimationFrame(raf);
        cancelAnimationFrame(layoutRaf);
        if (doc) {
          // Los trazos en curso (un dedo todavía apoyado al tocar "atrás") se terminan y cuentan para el
          // paso de deshacer, así el guardado de abajo los incluye.
          endAll();
          finishFx();
          if (wiping) { L.clearRect(0, 0, doc.w, doc.h); wiping = false; }
          if (step) endStep();
        }
        stopSound();
        ro.disconnect();
        window.removeEventListener('keydown', onKey);
        if (modal) modal.close();
        // Foto de lo pendiente ya mismo; la codificación y la escritura siguen en segundo plano y el
        // router no las espera (salir es inmediato). La próxima pizarra las espera al cargar.
        saveSoon.cancel();
        if (doc && dirty) queueSave();
        background = chain;
        // Las fotos son copias: los lienzos grandes se sueltan ya (Safari de iPad/iPhone tiene un tope
        // total de memoria de canvas y no la libera hasta que pasa el recolector).
        for (const lv of livePool.splice(0)) freeLive(lv);
        for (const c of [bgCanvas, layerCanvas, fxCanvas, pre]) { c.width = 0; c.height = 0; }
        if (probe) probe.width = probe.height = 0;
        undo.length = 0;
        return null;
      },
      // Accesos para las pruebas automáticas.
      _test: {
        selectTool, selectColor, selectSize, setBg, wipe, undo: doUndo,
        get hasContent() { return hasContent; },
        get undoCount() { return undo.length; },
        get scale() { return scale; },
        set wipeMs(v) { wipeMs = v; },
        get lastFinishMs() { return lastFinishMs; },
        layer: layerCanvas,
      },
    };
  }

  CL.router.register('pizarra', {
    mount(root, args) {
      current = createBoard(root, args);
      return current.ready;
    },
    unmount() {
      const c = current;
      current = null;
      return c ? c.destroy() : null;
    },
    flush() {
      return current ? current.saveNow() : null;
    },
  });

  CL.pizarra = {
    backgrounds: BACKGROUNDS,
    paintBackground,
    exportPNG,
    COLORS,
    /** Pizarra montada ahora (o null). Útil para pruebas. */
    get current() { return current; },
  };
})(window.CL);
