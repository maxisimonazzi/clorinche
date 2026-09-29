/* Colorines — galería "Mis obras" (#obras y #obras/<workId>).
   - Dos pestañas con ícono: terminadas (estrella, por defecto) y sin terminar (lápiz).
   - Miniaturas grandes (más nuevas primero) con una insignia del tipo (colorear / pizarra / neón).
   - Tocar una obra abre la vista grande: SEGUIR, DESCARGAR PNG, BORRAR (mantener apretado) y cerrar.
   - #obras/<id> resalta esa obra (ahí llega el chico después de "¡Terminé!").
   Las miniaturas se muestran con URLs de blob que se liberan al salir. */
'use strict';
(function (CL) {
  const U = CL.util;
  const el = U.el;
  const INK = CL.icons.INK;
  const S = CL.icons.STROKE;

  // Íconos propios de la galería.
  CL.icons.add({
    // Crayón (insignia de "colorear").
    galColorear: `<path d="M13 35 31 9a4 4 0 0 1 5.6-1l2 1.4a4 4 0 0 1 1 5.6L21.6 41z" fill="#ff5a5f" ${S}/>
      <path d="M17.5 28.5l9 6.2M25.5 17l9 6.2" fill="none" ${S}/>
      <path d="M13 35l-2.5 9 8.2-4.5" fill="#ffd9b8" ${S}/>`,
    // Estrella con brillitos (pestaña "terminadas").
    galDone: `<path d="M24 6l5.4 11 12.1 1.8-8.8 8.5 2.1 12L24 33.6l-10.8 5.7 2.1-12-8.8-8.5L18.6 17z" fill="#ffd23f" ${S}/>
      <path d="M41 5v6M38 8h6M7 34v5M4.5 36.5h5" stroke="#ff9f1c" stroke-width="2.6" stroke-linecap="round"/>`,
    // Hoja a medio dibujar con lápiz (pestaña "sin terminar").
    galProgress: `<rect x="6" y="7" width="27" height="34" rx="4" fill="#fff" ${S}/>
      <path d="M11 17h14M11 24h9" stroke="#b9b0cc" stroke-width="3" stroke-linecap="round"/>
      <path d="M24 42l1.8-7.2L39 21.6a3 3 0 0 1 4.2 0l.8.8a3 3 0 0 1 0 4.2L30.8 39.8z" fill="#ffd23f" ${S}/>`,
  });

  const KIND = {
    colorear: { icon: 'galColorear', label: 'Para colorear', mod: () => CL.coloring },
    pizarra: { icon: 'modePizarra', label: 'Pizarra', mod: () => CL.pizarra },
    neon: { icon: 'modeNeon', label: 'Neón', mod: () => CL.neon },
  };

  const TABS = [
    { id: 'done', icon: 'galDone', label: 'Terminadas' },
    { id: 'progress', icon: 'galProgress', label: 'Sin terminar' },
  ];

  /** Ruta para seguir editando una obra. */
  function routeFor(w) {
    if (w.kind === 'colorear') return 'colorear/' + w.source + '/' + w.id;
    if (w.kind === 'neon') return 'neon/' + w.id;
    return 'pizarra/' + w.id;
  }

  /** Nombre base del archivo descargado. */
  function baseName(w) {
    if (w.kind === 'colorear') {
      const d = CL.drawings && CL.drawings.get(w.source);
      return d ? d.name : 'mi-dibujo';
    }
    return w.kind === 'neon' ? 'neon' : 'pizarra';
  }

  /** Una obra de colorear sin capa de pintura no se puede rearmar en grande: manda la miniatura. */
  const noPaint = (w) => w.kind === 'colorear' && !(w.paint instanceof Blob);

  /** Imagen final en PNG: la arma el módulo dueño; si no existe (o falla), la miniatura. */
  async function exportPNG(w) {
    const k = KIND[w.kind];
    const mod = k && k.mod();
    if (mod && typeof mod.exportPNG === 'function' && !(noPaint(w) && w.thumb instanceof Blob)) {
      try {
        const b = await mod.exportPNG(w);
        // Algún módulo puede devolver la miniatura (JPEG): que el archivo .png sea PNG de verdad.
        if (b instanceof Blob && b.size) return asPNG(b);
      } catch (e) {
        console.warn('Galería: no se pudo exportar, uso la miniatura', e);
      }
    }
    if (!(w.thumb instanceof Blob)) throw new Error('La obra no tiene imagen');
    return asPNG(w.thumb);
  }

  async function asPNG(b) {
    if (b.type === 'image/png') return b;
    const img = await U.blobToImage(b);
    const c = U.canvas(img.naturalWidth || img.width, img.naturalHeight || img.height);
    c.getContext('2d').drawImage(img, 0, 0);
    return U.canvasToBlob(c, 'image/png');
  }

  /* ---------- Toque robusto ----------
     El navegador no genera 'click' cuando un dedo toca mientras otro sigue apoyado (la palma, o la mano
     que sostiene la tablet), algo muy común en chicos chiquitos. Por eso las tarjetas y los botones se
     activan con pointerdown + pointerup del MISMO dedo sobre el MISMO elemento: poco movimiento, poco
     tiempo y el elemento todavía debajo del dedo. El 'click' queda para el teclado (Enter / Espacio).
     fn(ev, downT) recibe el momento en que se apoyó el dedo. Se usa también desde el inicio. */
  const TAP_MOVE = 12, TAP_MS = 700;
  let lastPointerTap = -1e9;
  function onTap(node, fn) {
    let p = null; // { id, x, y, t } del dedo que se apoyó sobre el elemento
    node.addEventListener('pointerdown', (ev) => {
      if (ev.button > 0) return;
      p = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, t: performance.now() };
    });
    node.addEventListener('pointercancel', (ev) => { if (p && ev.pointerId === p.id) p = null; });
    node.addEventListener('pointerup', (ev) => {
      const d = p;
      if (!d || ev.pointerId !== d.id) return;
      p = null;
      if (performance.now() - d.t > TAP_MS) return;
      if (Math.hypot(ev.clientX - d.x, ev.clientY - d.y) > TAP_MOVE) return;
      const under = document.elementFromPoint(ev.clientX, ev.clientY);
      if (!under || !node.contains(under)) return;
      lastPointerTap = performance.now();
      fn(ev, d.t);
    });
    node.addEventListener('click', (ev) => {
      // Sólo teclado (detail 0) o navegadores sin Pointer Events; el click de un toque ya se atendió.
      if (window.PointerEvent && ev.detail !== 0) return;
      if (performance.now() - lastPointerTap < 500) return;
      fn(ev, performance.now());
    });
    return node;
  }

  /** Ilustración del estado vacío: un atril con la hoja en blanco esperando. */
  const EMPTY_ART = `
    <ellipse cx="120" cy="178" rx="92" ry="10" fill="${INK}" opacity=".08"/>
    <g stroke-linecap="round">
      <path d="M120 22 74 172M120 22l46 150M120 60v112" stroke="${INK}" stroke-width="15"/>
      <path d="M120 22 74 172M120 22l46 150M120 60v112" stroke="#e0a468" stroke-width="7"/>
    </g>
    <rect x="62" y="36" width="116" height="92" rx="8" fill="#fff" stroke="${INK}" stroke-width="5"/>
    <path d="M120 64v36M102 82h36" stroke="#e6def5" stroke-width="10" stroke-linecap="round"/>
    <rect x="54" y="124" width="132" height="14" rx="6" fill="#e0a468" stroke="${INK}" stroke-width="5"/>
    <g transform="translate(196 104) rotate(22)">
      <rect x="-6" y="-44" width="12" height="46" rx="5" fill="#4cc3ff" stroke="${INK}" stroke-width="4"/>
      <path d="M-8 2h16l-2 10q-6 6-12 0z" fill="#ff8fc7" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    </g>
    <g transform="translate(40 160)">
      <path d="M-26 0c0-14 16-22 30-20s24 10 22 20-10 12-18 8-8 6-18 4-16-2-16-12z" fill="#ffe2a8" stroke="${INK}" stroke-width="4"/>
      <circle cx="-12" cy="-8" r="5" fill="#ff5a5f"/><circle cx="2" cy="-12" r="5" fill="#2bc48a"/><circle cx="15" cy="-6" r="5" fill="#4cc3ff"/>
    </g>
    <path d="M200 30l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="#ffd23f" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round" class="gal-twinkle"/>
    <path d="M36 50l2 5 5 1-4 3 1 5-4-2-4 2 1-5-4-3 5-1z" fill="#ff9f1c" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round" class="gal-twinkle t2"/>`;

  /* ---------- Estado de la pantalla montada ---------- */
  let st = null;

  function urlFor(w) {
    if (!(w.thumb instanceof Blob)) return null;
    let u = st.urls.get(w.id);
    if (!u) { u = URL.createObjectURL(w.thumb); st.urls.set(w.id, u); }
    return u;
  }
  function dropUrl(id) {
    const u = st && st.urls.get(id);
    if (u) { URL.revokeObjectURL(u); st.urls.delete(id); }
  }

  const byTab = (tab) => st.works.filter((w) => (tab === 'done' ? w.status === 'done' : w.status !== 'done'));

  /* ---------- Toques "torpes" ----------
     Los chicos tocan dos veces seguidas o dejan el dedo apoyado. Para que el segundo toque no haga
     otra cosa (abrir una obra al entrar a la galería), la grilla ignora los toques mientras `quiet()`
     es verdadero. Un dedo que ya estaba apoyado cuando se abrió o cerró la vista grande tampoco abre
     nada al soltarse (ver `staleTouch`): así, al soltar después de borrar, no se abre la obra de abajo,
     y la palma apoyada no molesta a los toques nuevos. */
  const quiet = () => !st || performance.now() < st.quietUntil;
  const hush = (ms) => { if (st) st.quietUntil = Math.max(st.quietUntil, performance.now() + ms); };
  const staleTouch = (downT) => !st || st.view || downT < st.viewAt;

  function updateCounts() {
    for (const t of TABS) {
      const n = byTab(t.id).length;
      const b = st.tabBtns[t.id];
      b.querySelector('.gal-count').textContent = String(n);
      b.classList.toggle('empty', n === 0);
    }
  }

  function setTab(id, { silent = false } = {}) {
    st.tab = id;
    for (const t of TABS) {
      const b = st.tabBtns[t.id];
      b.classList.toggle('active', t.id === id);
      b.setAttribute('aria-selected', String(t.id === id));
    }
    render();
    // Pestaña elegida a mano: manda sobre la última obra abierta (que puede ser de la otra pestaña).
    if (!silent) { st.grid.scrollTop = 0; saveNav({ galLast: null }); }
  }

  /* ---------- Volver al mismo lugar ----------
     La pestaña, el scroll y la última obra abierta se guardan en la entrada del historial de #obras.
     Al volver con "atrás" (desde Seguir, desde el inicio...) la galería aparece como la dejó el chico,
     con su obra a la vista: si no, parece que el dibujo desapareció. */
  const isGalleryEntry = () => /^#obras(\/|$)/.test(location.hash) && !isViewState();
  function saveNav(extra) {
    const s = st;
    if (!s || !s.grid || !isGalleryEntry()) return;
    try {
      const nav = { galTab: s.tab, galScroll: Math.round(s.grid.scrollTop) };
      history.replaceState(Object.assign({}, history.state, nav, extra), '', location.href);
    } catch (e) { /* sin historial: se vuelve a la pestaña por defecto, nada grave */ }
  }
  const tabOf = (w) => (w.status === 'done' ? 'done' : 'progress');

  // Debajo, la misma imagen desenfocada rellena los costados si la obra no es cuadrada.
  const thumbImgs = (src) => [
    el('img.gal-thumb-bg', { src, alt: '', draggable: 'false', decoding: 'async', 'aria-hidden': 'true' }),
    el('img.gal-thumb', { src, alt: '', draggable: 'false', decoding: 'async' }),
  ];

  /** Obra sin miniatura (vieja o dañada): se arma una desde su imagen final, de a una por vez.
      Queda sólo en memoria (guardarla cambiaría la fecha y el orden de la galería). */
  let repairQueue = Promise.resolve();
  function repairThumb(w, frame) {
    const k = KIND[w.kind];
    const mod = k && k.mod();
    if (!mod || typeof mod.exportPNG !== 'function') return;
    const s = st;
    repairQueue = repairQueue.then(async () => {
      if (st !== s || !frame.isConnected) return;
      try {
        const big = await mod.exportPNG(w);
        const img = await U.blobToImage(big);
        const thumb = await U.canvasToBlob(U.thumbnail(img, 480, null), 'image/png');
        if (st !== s) return;
        w.thumb = thumb;
        const src = urlFor(w);
        if (src && frame.isConnected) frame.replaceChildren(...thumbImgs(src));
      } catch (e) { /* se queda el dibujito de "sin imagen" */ }
    });
  }

  function card(w, i) {
    const k = KIND[w.kind] || KIND.pizarra;
    const src = urlFor(w);
    const frame = el('div.gal-frame.gal-frame--' + (w.kind || 'pizarra'), null,
      src ? thumbImgs(src) : CL.icon('photo', 'gal-missing'));
    if (!src) repairThumb(w, frame);
    const b = el('button.gal-card', {
      type: 'button',
      'aria-label': k.label + (w.status === 'done' ? ', terminada' : ', sin terminar'),
      dataset: { id: w.id, sig: sig(w) },
      style: { animationDelay: Math.min(i, 14) * 0.035 + 's' },
    }, [frame, el('span.gal-badge', { 'aria-hidden': 'true' }, CL.icon(k.icon))]);
    onTap(b, (ev, downT) => {
      if (b.classList.contains('gal-leaving') || quiet() || staleTouch(downT)) return;
      CL.sound.play('open');
      openView(latest(w.id) || w);
    });
    return b;
  }

  /** La versión más nueva de una obra (la lista se refresca si otro módulo guarda en segundo plano). */
  const latest = (id) => (st && st.works.find((x) => x.id === id)) || null;

  function goButton(icon, label, cls, to) {
    const b = CL.ui.button({ icon, label, cls: 'gal-go ' + cls, sound: null });
    onTap(b, () => {
      if (quiet()) return;
      CL.sound.play('select');
      CL.router.go(to);
    });
    return b;
  }

  function emptyState() {
    // El atril con el "+" invita a tocarlo: también lleva a colorear.
    const art = goButton(null, 'Ir a colorear', 'gal-empty-art', 'dibujos');
    art.className = 'gal-empty-art';
    art.insertAdjacentHTML('beforeend', `<svg viewBox="0 0 240 190" aria-hidden="true" focusable="false">${EMPTY_ART}</svg>`);
    const go = el('div.gal-empty-go', null, [
      goButton('galColorear', 'Ir a colorear', 'gal-go--colorear', 'dibujos'),
      goButton('modePizarra', 'Ir a la pizarra', 'gal-go--pizarra', 'pizarra'),
    ]);
    return el('div.gal-empty', null, [art, go]);
  }

  /** Arma la grilla de la pestaña actual. `still`: sin la animación de entrada (refresco en segundo plano). */
  function render({ still = false } = {}) {
    const list = byTab(st.tab);
    // En un refresco, las tarjetas que no cambiaron se reusan: no parpadean ni vuelven a decodificar.
    const keep = new Map();
    if (still) for (const c of st.grid.querySelectorAll('.gal-card:not(.gal-leaving)')) keep.set(c.dataset.id, c);
    st.grid.replaceChildren();
    st.grid.classList.remove('has-new');
    st.grid.classList.toggle('gal-still', still);
    st.grid.classList.toggle('is-empty', list.length === 0);
    if (!list.length) { st.grid.append(emptyState()); return; }
    list.forEach((w, i) => {
      const o = keep.get(w.id);
      st.grid.append(o && o.dataset.sig === sig(w) ? o : card(w, i));
    });
    if (st.hiId) markNew(st.hiId);
  }

  const cardOf = (id) => st.grid.querySelector(`.gal-card[data-id="${CSS.escape(id)}"]`);

  /** Centra una tarjeta en la grilla (si hace falta). */
  function reveal(c, { always = true } = {}) {
    const g = st.grid;
    const gr = g.getBoundingClientRect(), cr = c.getBoundingClientRect();
    if (!always && cr.top >= gr.top - 4 && cr.bottom <= gr.bottom + 4) return;
    const top = c.offsetTop - (g.clientHeight - c.offsetHeight) / 2;
    g.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
  }

  function markNew(id) {
    const c = cardOf(id);
    if (!c) return null;
    c.classList.add('gal-new');
    st.grid.classList.add('has-new'); // más margen: la estrella y el anillo no se recortan arriba
    if (!c.querySelector('.gal-new-star')) c.append(el('span.gal-new-star', { 'aria-hidden': 'true' }, CL.icon('star')));
    return c;
  }

  /** Resalta una obra (brillo + pulso) y la centra en la grilla. */
  function highlight(id) {
    st.hiId = id;
    const c = markNew(id);
    if (!c) return;
    requestAnimationFrame(() => { if (st && c.isConnected) reveal(c); });
    setTimeout(() => CL.sound.play('sparkle', { count: 5 }), 350);
  }

  /** Al volver: la obra que el chico abrió por última vez, a la vista y con un brillo suave. */
  function markBack(id, scroll) {
    requestAnimationFrame(() => {
      if (!st) return;
      if (scroll != null) st.grid.scrollTop = scroll;
      const c = cardOf(id);
      if (!c) return;
      reveal(c, { always: false });
      c.classList.add('gal-back');
      setTimeout(() => c.classList.remove('gal-back'), 3000);
    });
  }

  /* ---------- Vista grande ---------- */
  // Mientras está abierta hay una entrada extra en el historial: el botón "atrás" de Android la cierra
  // (en vez de salir de la galería).
  function openView(w) {
    if (st.view) st.view.close('pop');
    const k = KIND[w.kind] || KIND.pizarra;
    const ar = w.w && w.h ? w.w / w.h : 1;
    const src = urlFor(w);
    const img = el('img.gv-img', { alt: src ? k.label : '', draggable: 'false' });
    img.style.setProperty('--ar', String(ar));
    const pic = el('div.gv-pic.gv-pic--' + (w.kind || 'pizarra'), null, img);
    // Obra sin miniatura (vieja o dañada): un dibujito en vez de una imagen rota.
    const missing = src ? null : el('div.gv-missing', { 'aria-hidden': 'true' }, CL.icon('photo'));
    if (missing) pic.append(missing);
    img.addEventListener('load', () => {
      if (missing) missing.remove();
      // La imagen manda (p. ej. el neón exporta recortado a lo dibujado): sin franjas vacías.
      if (img.naturalWidth && img.naturalHeight) img.style.setProperty('--ar', String(img.naturalWidth / img.naturalHeight));
    });
    if (src) img.src = src;

    const view = { work: w, hiUrl: null, layerUrls: null, busy: false, closed: false, pushed: false, close: null };

    // Botones de la vista: activación por toque robusto (anda con la palma apoyada).
    const viewButton = (opts, sound, fn) => {
      const b = CL.ui.button(Object.assign({ sound: null }, opts));
      onTap(b, () => { if (view.closed) return; if (sound) CL.sound.play(sound); fn(); });
      return b;
    };
    const bGo = viewButton({ icon: 'pencilEdit', label: 'Seguir dibujando', cls: 'btn-lg btn-go gv-go' }, 'open', () => {
      const route = routeFor(view.work);
      // La entrada extra del historial se reemplaza por la pantalla nueva: "atrás" vuelve a la galería.
      const pushed = view.pushed && isViewState();
      view.close('pop');
      if (pushed) CL.router.replace(route); else CL.router.go(route);
    });
    const bDown = viewButton({ icon: 'download', label: 'Descargar imagen', cls: 'btn-lg gv-down' }, 'pop',
      () => download(view, bDown));
    const bDel = CL.ui.holdButton({
      label: 'Mantené apretado para borrar', cls: 'btn-lg gv-del',
      onConfirm: () => {
        // Sólo si el dedo se mantuvo hasta el final CON la vista abierta (no si se cerró en el medio).
        if (view.closed || !bDel.isConnected) return;
        view.close();
        removeWork(w.id);
      },
    });
    const bClose = viewButton({ icon: 'close', label: 'Cerrar', cls: 'btn-lg gv-close' }, 'tap', () => view.close());

    const box = el('div.gv', null, [pic, el('div.gv-actions', null, [bGo, bDown, bDel, bClose])]);
    const m = CL.ui.modal(box, {
      closeButton: false,
      cls: 'gal-view',
      onClose: () => {
        view.closed = true;
        // El fondo se sigue viendo 200 ms mientras se desvanece: que no se trague el próximo toque.
        back.style.pointerEvents = 'none';
        // Se cerró (atrás, Escape, otro dedo en el fondo) mientras se mantenía apretado el tacho:
        // cortar la cuenta ya, así no se borra al completarse el anillo.
        if (bDel.classList.contains('holding')) bDel.dispatchEvent(new PointerEvent('pointercancel'));
        // Los dedos que siguen apoyados no abren la obra que quedó debajo al soltarse (ver staleTouch).
        if (st) st.viewAt = performance.now();
        GUARD_EVENTS.forEach((t) => window.removeEventListener(t, guard, true));
        if (st && st.view === view) st.view = null;
        const urls = (view.layerUrls || []).concat(view.hiUrl || []);
        if (urls.length) setTimeout(() => urls.forEach((u) => URL.revokeObjectURL(u)), 300);
        // Cerrada con la X, el fondo, Escape o al borrar: sacar la entrada extra del historial.
        if (!view.keepHistory && view.pushed && isViewState()) history.back();
      },
    });
    const back = m.root.parentElement;

    /* Guardia en captura (antes que el modal del núcleo):
       - Doble toque sobre la miniatura: el segundo toque no debe cerrar la vista ni apretar un botón.
       - El fondo oscuro cierra sólo con un toque corto de un solo dedo. El núcleo cierra apenas se apoya
         algo, y en la tablet apaisada el fondo es justo donde van los pulgares que la sostienen. */
    const openedAt = performance.now();
    let bg = null; // { id, x, y, t, multi } del dedo apoyado en el fondo
    function guard(ev) {
      const t = ev.type;
      if (t === 'pointerdown' || t === 'click') {
        if (performance.now() - openedAt < 420 && back.contains(ev.target)) {
          ev.stopPropagation();
          if (t === 'click') ev.preventDefault();
          return;
        }
      }
      if (t === 'pointerdown') {
        if (bg && ev.pointerId !== bg.id) bg.multi = true; // otro dedo mientras tanto: no es un toque
        if (ev.target === back) {
          ev.stopPropagation();
          if (!bg) bg = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, t: performance.now(), multi: false };
        }
      } else if (t === 'pointercancel') {
        if (bg && ev.pointerId === bg.id) bg = null;
      } else if (t === 'pointerup') {
        if (!bg || ev.pointerId !== bg.id) return;
        const d = bg;
        bg = null;
        const others = st ? [...st.down].some((id) => id !== d.id) : false;
        const short = performance.now() - d.t < 500 && Math.hypot(ev.clientX - d.x, ev.clientY - d.y) < TAP_MOVE;
        const under = document.elementFromPoint(ev.clientX, ev.clientY);
        if (short && !d.multi && !others && under === back && !view.closed) {
          CL.sound.play('tap');
          view.close();
        }
      }
    }
    const GUARD_EVENTS = ['pointerdown', 'pointerup', 'pointercancel', 'click'];
    GUARD_EVENTS.forEach((t) => window.addEventListener(t, guard, true));

    /** how = 'pop': no tocar el historial (ya se fue para atrás, o se está navegando a otra pantalla). */
    view.close = (how) => {
      if (view.closed) return;
      view.keepHistory = how === 'pop';
      m.close();
    };
    st.view = view;
    st.viewAt = openedAt;

    // La entrada de #obras recuerda pestaña, scroll y esta obra (para volver al mismo lugar).
    saveNav({ galLast: w.id });
    try {
      const base = history.state || { d: 0 };
      history.pushState(Object.assign({}, base, { galView: true }), '', location.href);
      view.pushed = true;
    } catch (e) { /* sin historial: "atrás" sale de la galería, no pasa nada grave */ }

    // En segundo plano, cuando terminó de abrirse: una versión más nítida que la miniatura.
    // Colorear se muestra en capas (ver coloringLayers); la pizarra y el neón son livianos y usan
    // la misma imagen que se descarga.
    const mod = k.mod && k.mod();
    if (mod && typeof mod.exportPNG === 'function' && !noPaint(w)) {
      setTimeout(() => idle(async () => {
        if (view.closed) return;
        if (w.kind === 'colorear') {
          const L = await coloringLayers(w).catch(() => null);
          if (L) {
            view.layerUrls = L.urls;
            if (view.closed) { L.urls.forEach((u) => URL.revokeObjectURL(u)); return; }
            pic.append(L.node);
            requestAnimationFrame(() => L.node.classList.add('in'));
            return;
          }
        }
        const b = await exportCached(w).catch(() => null);
        if (!b || view.closed) return;
        view.hiUrl = URL.createObjectURL(b);
        img.src = view.hiUrl;
      }), 260);
    }
  }

  const isViewState = () => !!(history.state && history.state.galView);

  /** Corre fn cuando el navegador está libre (o a lo sumo en 400 ms). */
  const idle = (fn) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 400 }) : setTimeout(fn, 0));

  /** PNG final de la obra, una sola vez por versión mientras la galería está abierta
      (abrir la vista y tocar Descargar no la arman dos veces). */
  function exportCached(w) {
    const s = st;
    const key = w.id + ':' + (w.updatedAt || 0);
    let p = s && s.exports.get(key);
    if (p) return p;
    p = exportPNG(w);
    if (s) {
      s.exports.set(key, p);
      if (s.exports.size > 6) s.exports.delete(s.exports.keys().next().value); // no acumular memoria
      p.catch(() => s.exports.delete(key));
    }
    return p;
  }

  /** Obra de colorear para la vista grande, como dos capas: pintura y líneas encima (multiply), igual
      que al pintar. El navegador las decodifica y mezcla fuera del hilo principal (armar el PNG de
      2048² cada vez trababa la página), y las líneas de los dibujos quedan vectoriales, bien nítidas.
      Devuelve { node, urls } o null si no se puede (entonces se usa la imagen exportada). */
  async function coloringLayers(w) {
    if (!(w.paint instanceof Blob)) return null; // sin pintura: se queda la miniatura
    let lines = null;
    if (typeof w.source === 'string' && w.source.startsWith('u-')) {
      const up = await CL.db.uploads.get(w.source.slice(2));
      lines = up && up.blob instanceof Blob ? up.blob : null;
    } else {
      const svg = CL.drawings && CL.drawings.svg(w.source);
      if (svg) lines = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    }
    if (!lines) return null;
    const urls = [];
    const layer = (blob, cls) => {
      const u = URL.createObjectURL(blob);
      urls.push(u);
      return el('img.gv-layer.' + cls, { src: u, alt: '', draggable: 'false', decoding: 'async' });
    };
    const imgs = [layer(w.paint, 'gv-paint'), layer(lines, 'gv-lines')];
    try {
      await Promise.all(imgs.map((i) => (i.decode ? i.decode() : Promise.resolve())));
    } catch (e) {
      urls.forEach((u) => URL.revokeObjectURL(u));
      return null;
    }
    return { node: el('div.gv-layers', { 'aria-hidden': 'true' }, imgs), urls };
  }

  async function download(view, btn) {
    if (view.busy) return;
    view.busy = true;
    btn.classList.add('gv-busy');
    let ok = false;
    try {
      const w = latest(view.work.id) || view.work; // la versión más nueva, si se refrescó mientras tanto
      const blob = await exportCached(w);
      U.downloadBlob(blob, U.fileName(baseName(w)));
      ok = true;
      CL.sound.play('sparkle');
      CL.ui.toast('download', 900);
    } catch (e) {
      console.warn('Galería: descarga fallida', e);
      CL.sound.play('nope');
    } finally {
      btn.classList.remove('gv-busy');
      // Un respiro después de descargar: cinco toques seguidos no bajan cinco archivos.
      if (ok) setTimeout(() => { view.busy = false; }, 1500); else view.busy = false;
    }
  }

  async function removeWork(id) {
    const s = st;
    if (!s) return;
    const c = cardOf(id);
    if (c) c.classList.add('gal-leaving');
    s.selfDel.add(id); // el aviso de cambio de la base por este borrado no refresca la grilla
    try {
      await Promise.all([CL.db.works.del(id), U.sleep(520)]);
    } catch (e) {
      console.warn('Galería: no se pudo borrar', e);
      s.selfDel.delete(id);
      if (c) c.classList.remove('gal-leaving');
      CL.sound.play('nope');
      return;
    }
    if (st !== s) return; // salimos de la pantalla mientras tanto
    s.works = s.works.filter((w) => w.id !== id);
    if (s.hiId === id) s.hiId = null;
    if (c) c.remove();
    dropUrl(id);
    updateCounts();
    saveNav();
    if (!byTab(s.tab).length) {
      // Se borró la última de esta pestaña: si hay obras en la otra, mostrarlas (el chico no lee el número).
      const other = s.tab === 'done' ? 'progress' : 'done';
      if (byTab(other).length) setTab(other); else render();
    }
  }

  /* ---------- Refresco en segundo plano ----------
     Al arrancar la app, colorear y neón pasan a la base lo que guardaron de emergencia; si la galería ya
     listó las obras, se quedaría con la versión vieja (miniatura y descarga). Mientras está montada,
     escucha los cambios de la base y se pone al día sin perder pestaña ni scroll. */
  const sig = (w) => w.id + ':' + (w.updatedAt || 0) + ':' + w.status;

  /** Decodifica una imagen antes de mostrarla (la tarjeta cambia de miniatura sin quedar en blanco). */
  const preload = (src) => {
    const i = new Image();
    i.src = src;
    return (i.decode ? i.decode() : Promise.resolve()).catch(() => null);
  };

  async function applyWorks(list) {
    const s = st;
    const before = new Map(s.works.map((w) => [w.id, w]));
    if (list.length === s.works.length && list.every((w, i) => sig(w) === sig(s.works[i]))) return;
    // Las que cambiaron: soltar la miniatura vieja y lo exportado, y tener lista la nueva.
    const fresh = [];
    for (const w of list) {
      const o = before.get(w.id);
      if (o && (o.updatedAt || 0) !== (w.updatedAt || 0)) {
        dropUrl(w.id);
        for (const k of [...s.exports.keys()]) if (k.startsWith(w.id + ':')) s.exports.delete(k);
      }
      if (!o || (o.updatedAt || 0) !== (w.updatedAt || 0)) {
        const src = urlFor(w);
        if (src) fresh.push(preload(src));
      }
    }
    for (const id of before.keys()) if (!list.some((w) => w.id === id)) dropUrl(id);
    if (fresh.length) await Promise.race([Promise.all(fresh), U.sleep(800)]);
    if (st !== s) return;
    const oldIds = byTab(s.tab).map((w) => w.id).join();
    s.works = list.filter((w) => !s.selfDel.has(w.id));
    if (s.view) s.view.work = latest(s.view.work.id) || s.view.work;
    updateCounts();
    const other = s.tab === 'done' ? 'progress' : 'done';
    if (!byTab(s.tab).length && byTab(other).length) {
      // La pestaña quedó (o estaba) vacía y llegaron obras a la otra: mostrarlas, no el atril vacío.
      setTab(other, { silent: true });
      saveNav();
      return;
    }
    const newIds = byTab(s.tab).map((w) => w.id).join();
    if (newIds === oldIds) {
      // Mismas obras en el mismo orden: sólo cambiar las miniaturas, sin redibujar la grilla.
      for (const w of byTab(s.tab)) {
        const o = before.get(w.id);
        if (!o || (o.updatedAt || 0) === (w.updatedAt || 0)) continue;
        const c = cardOf(w.id);
        const src = urlFor(w);
        const f = c && c.querySelector('.gal-frame');
        if (f && src) f.replaceChildren(...thumbImgs(src));
        if (c) c.dataset.sig = sig(w);
      }
    } else {
      const top = s.grid.scrollTop;
      render({ still: true });
      s.grid.scrollTop = top;
    }
  }

  CL.router.register('obras', {
    async mount(root, args) {
      const my = {
        root, works: [], urls: new Map(), tab: 'done', tabBtns: {}, grid: null, view: null, off: [],
        quietUntil: 0, viewAt: 0, down: new Set(), exports: new Map(), hiId: null, selfDel: new Set(),
      };
      st = my;
      // Lo que había en la entrada del historial (si ya estuvimos acá): pestaña, scroll, última obra.
      const nav = history.state && history.state.galTab ? history.state : null;

      // Punteros apoyados (dedos, mouse, lápiz): el fondo de la vista grande cierra sólo con un dedo solo.
      const onDown = (ev) => { my.down.add(ev.pointerId); };
      const onUp = (ev) => { my.down.delete(ev.pointerId); };
      window.addEventListener('pointerdown', onDown, true);
      window.addEventListener('pointerup', onUp, true);
      window.addEventListener('pointercancel', onUp, true);
      my.off.push(() => {
        window.removeEventListener('pointerdown', onDown, true);
        window.removeEventListener('pointerup', onUp, true);
        window.removeEventListener('pointercancel', onUp, true);
      });

      const tabs = el('div.gal-tabs', { role: 'tablist', 'aria-label': 'Obras' });
      for (const t of TABS) {
        const b = CL.ui.button({ icon: t.icon, label: t.label, cls: 'gal-tab', sound: null });
        onTap(b, () => {
          if (st !== my || st.view) return;
          CL.sound.play('select');
          if (st.tab !== t.id) setTab(t.id);
        });
        b.setAttribute('role', 'tab');
        b.dataset.tab = t.id;
        b.append(el('span.gal-count', { 'aria-hidden': 'true' }, '0'));
        my.tabBtns[t.id] = b;
        tabs.append(b);
      }
      // Casita propia (igual a la del núcleo) para que ande también con la palma apoyada.
      const home = CL.ui.button({ icon: 'home', label: 'Inicio', cls: 'btn-home', sound: null });
      onTap(home, () => { if (st === my && !st.view) { CL.sound.play('tap'); CL.router.go('inicio'); } });
      const top = el('div.topbar.gal-top', null, [
        home,
        el('div.gal-title', { 'aria-hidden': 'true' }, CL.icon('gallery')),
        el('div.spacer'),
        tabs,
        el('div.spacer'),
        el('div.gal-title-pad'),
        CL.ui.muteButton(),
      ]);
      my.grid = el('div.gal-grid.scroll-y');
      root.append(top, el('div.gal-body', null, my.grid));

      // El scroll se anota en el historial (con un respiro) para volver al mismo lugar.
      const onScroll = U.debounce(() => { if (st === my && !my.view) saveNav(); }, 250);
      my.grid.addEventListener('scroll', onScroll, { passive: true });
      my.off.push(() => onScroll.cancel());

      const onKey = (ev) => { if (ev.key === 'Escape' && st && st.view) st.view.close(); };
      document.addEventListener('keydown', onKey);
      my.off.push(() => document.removeEventListener('keydown', onKey));
      // "Atrás" del navegador con la vista grande abierta: sólo la cierra.
      const onPop = () => { if (st && st.view && !isViewState()) st.view.close('pop'); };
      window.addEventListener('popstate', onPop);
      my.off.push(() => window.removeEventListener('popstate', onPop));
      // Si se recargó con la vista abierta, esa entrada del historial ya no tiene vista: se saca
      // (vuelve a la entrada #obras de abajo, el router ve la misma ruta y no remonta nada).
      // Así el primer "atrás" no queda muerto.
      if (isViewState()) {
        try { history.back(); } catch (e) { /* nada */ }
      }

      // Cambios de la base hechos por otros (recuperaciones en segundo plano): refrescar.
      // De a un refresco por vez (en orden): uno viejo que tarda no pisa la lista nueva.
      let refreshing = Promise.resolve();
      const refresh = U.debounce(() => {
        refreshing = refreshing.then(async () => {
          if (st !== my) return;
          let list;
          try { list = await CL.db.works.list(); } catch (e) { return; }
          if (st !== my) return;
          await applyWorks(list.filter((w) => w && KIND[w.kind] && !my.selfDel.has(w.id)));
        }).catch((e) => console.warn('Galería: no se pudo refrescar', e));
      }, 300);
      const offDb = CL.db.events.on('change', (e) => {
        if (e && e.store === 'works' && !my.selfDel.has(e.id)) refresh();
      });
      my.off.push(() => { offDb(); refresh.cancel(); });

      const stop = CL.ui.spinner(root);
      let works = [];
      try {
        // Colorear termina de guardar en segundo plano después de salir (hasta ~1 s, más en una tablet
        // lenta), y al arrancar pasa a la base lo que guardó de emergencia: esperar las dos cosas para que
        // la primera miniatura ya sea la buena. Con un tope, por las dudas: si tarda más, el refresco de
        // arriba (cambios de la base) la corrige sin parpadeos.
        const C = CL.coloring || {};
        const ready = (async () => {
          if (typeof C.whenSaved === 'function') await C.whenSaved();
          if (C.pending && typeof C.pending.recover === 'function') await C.pending.recover();
        })().catch(() => null);
        await Promise.race([ready, U.sleep(4000)]);
        works = await CL.db.works.list();
      } catch (e) {
        console.warn('Galería: no se pudieron leer las obras', e);
      }
      stop();
      if (st !== my) return; // ya salimos
      my.works = works.filter((w) => w && KIND[w.kind]);
      refresh.cancel(); // lo que cambió hasta acá ya está en la lista

      const focusId = args && args[0] ? args[0] : null;
      const focus = focusId ? my.works.find((w) => w.id === focusId) : null;
      const last = nav && nav.galLast ? my.works.find((w) => w.id === nav.galLast) : null;
      const has = (t) => byTab(t).length > 0;
      const other = (t) => (t === 'done' ? 'progress' : 'done');
      let tab = 'done';
      if (nav) {
        // Volvimos (atrás): la pestaña de la última obra abierta (pudo pasar a terminada), o la que estaba.
        tab = last ? tabOf(last) : nav.galTab === 'progress' ? 'progress' : 'done';
        if (!has(tab) && has(other(tab))) tab = other(tab);
      } else if (focus) tab = tabOf(focus);
      else if (!has('done') && has('progress')) tab = 'progress';
      updateCounts();
      setTab(tab, { silent: true });
      hush(450); // el segundo toque del doble toque que nos trajo acá no abre una obra
      if (nav) {
        const scroll = tab === nav.galTab ? nav.galScroll || 0 : 0;
        if (last) markBack(last.id, scroll);
        else requestAnimationFrame(() => { if (st === my) my.grid.scrollTop = scroll; });
      } else if (focus) highlight(focus.id);
    },

    unmount() {
      const my = st;
      st = null;
      if (!my) return;
      if (my.view) my.view.close('pop'); // al salir nunca tocar el historial: ya se está navegando
      my.off.forEach((f) => f());
      my.exports.clear();
      // Liberar las URLs cuando la pantalla ya se fue (las imágenes siguen visibles durante el cambio).
      const urls = [...my.urls.values()];
      setTimeout(() => urls.forEach((u) => URL.revokeObjectURL(u)), 400);
    },
  });

  // Para pruebas y para otros módulos.
  CL.gallery = { exportPNG, routeFor, onTap };
})(window.CL);
