/* Colorines — pantalla de colorear (#colorear/<dibujo>[/<idObra>]).

   <dibujo> = id del registro ('vaca') o 'u-<idUpload>' para una imagen subida.
   Capas: papel blanco, pintura (canvas del pintor) y líneas encima (<img> del SVG / PNG en "multiply",
   así se ven nítidas con cualquier zoom). Herramientas: balde (principal), pincel y goma con
   "no salirse de las líneas", 3 grosores, deshacer/rehacer, borrar todo (mantener apretado), zoom (pellizco,
   rueda, botones). Paleta de 27 colores + selector de cualquier color + rellenos especiales. Tocar un color lo
   elige; mantenerlo apretado (o clic derecho) lo elige como SEGUNDO color de los rellenos especiales.
   Autoguardado con CL.db.works (sólo después de la primera pincelada/balde). */
'use strict';
(function (CL) {
  const U = CL.util;
  const el = U.el;
  const S3 = CL.icons.STROKE;
  const INK = CL.icons.INK;

  /* ---------- íconos propios ---------- */
  CL.icons.add({
    clBucket: `<path d="M8 19c0-9 26-9 26 0" fill="none" ${S3}/>
      <path d="M8 19h26l-3.2 19.5A3.5 3.5 0 0 1 27.3 41.5H14.7a3.5 3.5 0 0 1-3.5-3L8 19z" fill="#cfd9ea" ${S3}/>
      <ellipse cx="21" cy="19" rx="13" ry="4.2" class="cl-cur" fill="#f23a3a" ${S3}/>
      <path d="M33 20c4.5 1.5 8 6 8 11.5a3.6 3.6 0 0 1-7.2.3c0-3.3 1.2-5 1.2-8" class="cl-cur" fill="#f23a3a" ${S3}/>
      <path d="M13 26.5l1.5 10" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>`,
    clBrush: `<path d="M41.5 5.5l3 3L28 27l-5.5-5.5z" fill="#ffb454" ${S3}/>
      <path d="M22.5 21.5l5.5 5.5-3.5 3.5-5.5-5.5z" fill="#cfd9ea" ${S3}/>
      <path d="M19 25l5 5c-1.2 7.5-7.5 12-16.5 12 .3-9 4.3-15.8 11.5-17z" class="cl-cur" fill="#f23a3a" ${S3}/>`,
    clEraser: `<g transform="rotate(-38 24 25)"><rect x="6" y="16.5" width="36" height="17" rx="4.5" fill="#ff9fbd" ${S3}/>
      <path d="M22 16.5h15.5a4.5 4.5 0 0 1 4.5 4.5v8a4.5 4.5 0 0 1-4.5 4.5H22z" fill="#6cc6ff" ${S3}/></g>
      <path d="M8 43h14" stroke="${INK}" stroke-width="3" stroke-linecap="round" opacity=".45"/>`,
    clClipOn: `<path d="M24 42S7 31.5 7 19.5A8.5 8.5 0 0 1 24 16a8.5 8.5 0 0 1 17 3.5C41 31.5 24 42 24 42z" fill="#fff"/>
      <path d="M13 19.5l7-4-6 9.5 11-9-7 13 12-11.5-6 12 7-6" fill="none" class="cl-cur-s" stroke="#f23a3a" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M24 42S7 31.5 7 19.5A8.5 8.5 0 0 1 24 16a8.5 8.5 0 0 1 17 3.5C41 31.5 24 42 24 42z" fill="none" ${S3} stroke-width="3.6"/>
      <circle cx="39" cy="38" r="7.5" fill="#2bc48a" ${S3} stroke-width="2.5"/><path d="M35.5 38.2l2.4 2.4 4.4-4.8" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`,
    clClipOff: `<path d="M24 42S7 31.5 7 19.5A8.5 8.5 0 0 1 24 16a8.5 8.5 0 0 1 17 3.5C41 31.5 24 42 24 42z" fill="#fff" ${S3} stroke-width="3.6"/>
      <path d="M3 13l12 4-9 11 16-10-8 20 15-19 1 18 13-24" fill="none" class="cl-cur-s" stroke="#f23a3a" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>`,
    clZoomIn: `<circle cx="20" cy="20" r="12.5" fill="#e3f5ff" ${S3}/><path d="M29.5 29.5 41 41" stroke="${INK}" stroke-width="6.5" stroke-linecap="round"/>
      <path d="M20 14v12M14 20h12" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`,
    clZoomOut: `<circle cx="20" cy="20" r="12.5" fill="#e3f5ff" ${S3}/><path d="M29.5 29.5 41 41" stroke="${INK}" stroke-width="6.5" stroke-linecap="round"/>
      <path d="M14 20h12" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`,
    // Hoja con una flecha que da la vuelta: empezar de nuevo.
    clClear: `<path d="M11.5 5.5h16l9 9v26a3 3 0 0 1-3 3h-22a3 3 0 0 1-3-3v-32a3 3 0 0 1 3-3z" fill="#fff" ${S3}/>
      <path d="M27.5 5.5v9h9" fill="none" ${S3}/>
      <path d="M31 30.5a9 9 0 1 1-3.2-6.9" fill="none" stroke="#ff9f1c" stroke-width="4.2" stroke-linecap="round"/>
      <path d="M29.6 17.8l-1.3 6.4 6.5.2" fill="none" stroke="#ff9f1c" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>`,
    clZoomFit: `<path d="M8 18V8h10M30 8h10v10M40 30v10H30M18 40H8V30" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="16" y="16" width="16" height="16" rx="3.5" fill="#ffd23f" ${S3}/>`,
  });

  /* ---------- paleta: 27 colores en tríos (cada trío es una fila de la grilla; con la pantalla parada, una
     columna): una familia por trío, de claro a oscuro ---------- */
  const PALETTE = [
    ['#f23a3a', 'Rojo'], ['#ff8a1c', 'Naranja'], ['#ffd52e', 'Amarillo'],
    ['#9ad62a', 'Verde claro'], ['#27ae4f', 'Verde'], ['#17703a', 'Verde oscuro'],
    ['#4cc3ff', 'Celeste'], ['#2d68e0', 'Azul'], ['#1c2d7a', 'Azul oscuro'],
    ['#c9a6ff', 'Lila'], ['#8a4fdf', 'Violeta'], ['#5b2a9e', 'Morado'],
    ['#ffa8cf', 'Rosa'], ['#ff3f97', 'Rosa fuerte'], ['#c8187c', 'Fucsia'],
    ['#fff08a', 'Amarillo claro'], ['#a6ecc7', 'Verde agua'], ['#bfe6ff', 'Celeste pastel'],
    ['#ffc39a', 'Durazno'], ['#ffdcbd', 'Piel clara'], ['#c98a5e', 'Piel morena'],
    ['#8a5a2b', 'Marrón'], ['#573617', 'Marrón oscuro'], ['#262626', 'Negro'],
    ['#ffffff', 'Blanco'], ['#cfcfd8', 'Gris claro'], ['#85858f', 'Gris'],
  ];
  const SPECIALS = [
    ['rainbow', 'Arcoíris'], ['gradient', 'Degradé'], ['sparkle', 'Brillitos'], ['dots', 'Lunares'],
    ['stars', 'Estrellas'], ['hearts', 'Corazones'], ['puzzle', 'Rompecabezas'], ['waves', 'Ondas'], ['scales', 'Escamas'],
  ];
  const SECOND_MS = 1000;             // mantener apretado un color para elegirlo como segundo color
  const SIZES = [12, 26, 50];         // diámetro del pincel/goma en px de pantalla
  const SIZE_LABELS = ['Finito', 'Mediano', 'Grueso'];
  const MAX_ZOOM = 5;

  // Selector de color: saturación fija y luminosidad de PK_L0 (arriba) a PK_L1 (abajo).
  const PK_S = 92, PK_L0 = 90, PK_L1 = 20;

  function hslHex(h, s, l) {
    s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return U.rgbToHex(255 * f(0), 255 * f(8), 255 * f(4));
  }

  const focusVisible = (e) => { try { return e.matches(':focus-visible'); } catch (err) { return false; } };
  const reducedMotion = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  let current = null;
  // Guardados que siguen en segundo plano después de salir de la pantalla (ver destroy).
  let saving = Promise.resolve();
  /** Resuelve cuando no queda ningún guardado de colorear en curso (antes de leer obras o progreso). */
  const whenSaved = () => saving;

  CL.router.register('colorear', {
    async mount(root, args) {
      const source = args[0];
      if (!source) { CL.router.replace('dibujos'); return; }
      const scr = current = createScreen(root, source, args[1] || null);
      await scr.load();
    },
    unmount() {
      const scr = current;
      current = null;
      return scr ? scr.destroy() : null;
    },
    flush() { return current ? current.flush() : null; },
  });

  /* =====================================================================
     Pantalla
     ===================================================================== */
  function createScreen(root, source, workId) {
    const isUpload = source.startsWith('u-');
    const drawing = isUpload ? null : CL.drawings.get(source);
    const backPath = isUpload ? 'dibujos/mis' : drawing ? 'dibujos/' + drawing.cat : 'dibujos';
    const name = drawing ? drawing.name : 'Mi dibujo';

    const st = {
      tool: 'bucket',
      color: U.pref.get('colorear.color', '#f23a3a'),
      fill: 'solid',
      size: U.pref.get('colorear.size', 1),
      // "No salirse" arranca siempre activado (si un chico lo apaga sin querer, no queda apagado para siempre).
      clip: true,
      custom: U.pref.get('colorear.custom', '#6fd3c4'),
      // Segundo color de los rellenos especiales (null = automático, uno que combine con el primero).
      color2: U.pref.get('colorear.color2', null),
    };
    if (!/^#[0-9a-f]{6}$/i.test(st.color)) st.color = '#f23a3a';
    if (!/^#[0-9a-f]{6}$/i.test(st.custom)) st.custom = '#6fd3c4';
    if (st.color2 != null && !/^#[0-9a-f]{6}$/i.test(st.color2)) st.color2 = null;

    let alive = true, ready = false, finishing = false;
    let painter = null, src = null, work = null;
    let dirty = false, touched = false, forceDone = false;
    let blank = false;   // se borró todo y no se volvió a pintar
    let picker = null;
    const cleanups = [];
    const on = (t, type, fn, opts) => { t.addEventListener(type, fn, opts); cleanups.push(() => t.removeEventListener(type, fn, opts)); };

    /* ---------- DOM ---------- */
    const button = CL.ui.button;
    const doneBtn = button({ icon: 'star', text: '¡Terminé!', label: '¡Terminé!', cls: 'btn-pill btn-go cl-done', sound: null, onTap: () => finish() });
    // Borrar todo (mantener apretado): en la barra de arriba con la pantalla apaisada y junto a las herramientas
    // con la pantalla parada (en la barra de un celular parado no entra). Se ve uno u otro (ver colorear.css).
    const clearBtn = (cls) => CL.ui.holdButton({ icon: 'clClear', label: 'Borrar todo: mantené apretado', cls: 'cl-clear ' + cls, onConfirm: () => clearAll() });
    const bar = el('div.topbar.cl-bar', null, [
      CL.coloring.backButton(backPath), CL.ui.homeButton('cl-home'), el('div.spacer'), clearBtn('cl-clear-top'), CL.ui.muteButton(), doneBtn,
    ]);

    const toolBtns = {
      bucket: button({ icon: 'clBucket', label: 'Balde de pintura', cls: 'cl-tool', sound: 'select', onTap: () => setTool('bucket') }),
      brush: button({ icon: 'clBrush', label: 'Pincel', cls: 'cl-tool', sound: 'select', onTap: () => setTool('brush') }),
      eraser: button({ icon: 'clEraser', label: 'Goma', cls: 'cl-tool', sound: 'select', onTap: () => setTool('eraser') }),
    };
    const clipBtn = button({ icon: st.clip ? 'clClipOn' : 'clClipOff', label: 'No salirse de las líneas', cls: 'cl-clip', sound: null, onTap: () => toggleClip() });
    const sizeBtns = SIZES.map((sz, i) => {
      const b = button({ label: 'Pincel ' + SIZE_LABELS[i].toLowerCase(), cls: 'btn-sm cl-size', sound: 'select', soundOpts: { pitch: 1.3 - i * 0.2 }, onTap: () => setSize(i) });
      b.append(el('span.cl-dot', { style: { width: [10, 20, 32][i] + 'px', height: [10, 20, 32][i] + 'px' } }));
      return b;
    });
    const undoBtn = button({ icon: 'undo', label: 'Deshacer', cls: 'cl-undo', sound: null, onTap: () => doUndo() });
    const redoBtn = button({ icon: 'redo', label: 'Rehacer', cls: 'cl-redo', sound: null, onTap: () => doRedo() });
    const optsGroup = el('div.cl-group.cl-g-opts', null, [clipBtn, ...sizeBtns]);
    const tools = el('div.cl-tools', null, [
      el('div.cl-group.cl-g-tools', null, Object.values(toolBtns)),
      optsGroup,
      el('div.cl-group.cl-g-hist', null, [undoBtn, redoBtn]),
      el('div.cl-group.cl-g-clear', null, clearBtn('cl-clear-side')),
    ]);

    const stage = el('div.cl-stage');
    CL.ui.noGestures(stage);
    const board = el('div.cl-board');
    const lineImg = el('img.cl-lines', { alt: '', draggable: 'false', decoding: 'async' });
    const cursor = el('div.cl-cursor');
    const zoomBox = el('div.cl-zoom', null, [
      button({ icon: 'clZoomIn', label: 'Acercar', cls: 'btn-sm', sound: 'pop', onTap: () => zoomStep(1.7) }),
      button({ icon: 'clZoomOut', label: 'Alejar', cls: 'btn-sm', sound: 'pop', soundOpts: { pitch: 0.8 }, onTap: () => zoomStep(1 / 1.7) }),
      button({ icon: 'clZoomFit', label: 'Ver todo el dibujo', cls: 'btn-sm cl-fit', sound: 'pop', soundOpts: { pitch: 0.65 }, onTap: () => animateTo(1, null, null) }),
    ]);
    stage.append(board, cursor, zoomBox);
    // El escenario cancela touchstart (sin scroll ni zoom de la página); los botones de zoom están
    // adentro, así que su touchstart no debe llegar al escenario o el toque no genera "click".
    zoomBox.addEventListener('touchstart', (ev) => ev.stopPropagation(), { passive: true });

    // Paleta
    const swatches = PALETTE.map(([hex, label], i) => {
      const b = el('button.cl-sw', { type: 'button', 'aria-label': label, title: label + ' (mantené apretado: segundo color)', style: { background: hex }, dataset: { color: hex } });
      if (hex === '#ffffff') b.classList.add('cl-sw-white');
      const held = holdForSecond(b, hex);
      on(b, 'click', () => {
        if (held()) return;   // ya lo eligió como segundo color al mantenerlo apretado
        CL.sound.play('select', { pitch: 0.8 + (i % 12) * 0.05 });
        setColor(hex);
      });
      return b;
    });
    const pickBtn = el('button.cl-sw.cl-pick', { type: 'button', 'aria-label': 'Elegir cualquier color', title: 'Elegir cualquier color' }, el('span.cl-pick-in'));
    on(pickBtn, 'click', () => { CL.sound.play('open'); openPicker(); });
    const specialsBox = el('div.cl-sws.cl-specials');
    const specialBtns = SPECIALS.map(([kind, label]) => {
      const b = el('button.cl-sw.cl-sp', { type: 'button', 'aria-label': 'Relleno ' + label.toLowerCase(), title: label, dataset: { kind } }, el('canvas'));
      on(b, 'click', () => { CL.sound.play('sparkle', { count: 2 }); setFill(st.fill === kind ? 'solid' : kind); });
      return b;
    });
    specialsBox.append(pickBtn, ...specialBtns);
    const pal = el('div.cl-pal', null, el('div.cl-pal-in', null, [
      el('div.cl-sws.cl-colors', null, swatches),
      specialsBox,
    ]));

    const wrap = el('div.cl', null, [bar, tools, stage, pal]);
    root.append(wrap);

    /* ---------- estado visual ---------- */
    function refresh() {
      root.style.setProperty('--cur', st.color);
      for (const k in toolBtns) {
        toolBtns[k].classList.toggle('active', st.tool === k);
        toolBtns[k].setAttribute('aria-pressed', String(st.tool === k));
      }
      optsGroup.classList.toggle('cl-off', st.tool === 'bucket');
      sizeBtns.forEach((b, i) => b.classList.toggle('active', st.size === i));
      clipBtn.classList.toggle('active', st.clip);
      clipBtn.setAttribute('aria-pressed', String(st.clip));
      clipBtn.replaceChildren(CL.icon(st.clip ? 'clClipOn' : 'clClipOff'));
      let inPalette = false;
      const c2 = st.color2 && st.color2 !== st.color ? st.color2 : null;
      for (const b of swatches) {
        const a = st.fill === 'solid' && b.dataset.color === st.color;
        if (b.dataset.color === st.color) inPalette = true;
        b.classList.toggle('active', a);
        b.classList.toggle('cl-second', b.dataset.color === c2);
      }
      pickBtn.classList.toggle('active', st.fill === 'solid' && !inPalette);
      pickBtn.style.setProperty('--pick', inPalette ? st.custom : st.color);
      for (const b of specialBtns) b.classList.toggle('active', st.fill === b.dataset.kind);
      drawSpecials();
      refreshHistory();
      updateCursor();
    }
    let lastSpecials = null;
    function drawSpecials() {
      const key = st.color + '|' + st.color2;
      if (lastSpecials === key) return;
      lastSpecials = key;
      const px = Math.round(56 * U.dpr());
      for (const b of specialBtns) {
        const c = b.querySelector('canvas');
        const p = CL.fills.preview(b.dataset.kind, st.color, px, st.color2);
        c.width = px; c.height = px;
        c.getContext('2d').drawImage(p, 0, 0);
      }
    }
    function refreshHistory() {
      const u = !!(painter && painter.canUndo), r = !!(painter && painter.canRedo);
      undoBtn.classList.toggle('disabled', !u);
      redoBtn.classList.toggle('disabled', !r);
    }

    // Última herramienta de pintar (balde o pincel): al tocar un color con la goma se vuelve a ésa.
    let lastPaintTool = 'bucket';
    function setTool(t) {
      st.tool = t;
      if (t !== 'eraser') lastPaintTool = t;
      refresh();
    }
    function setColor(hex) {
      st.color = hex; st.fill = 'solid';
      U.pref.set('colorear.color', hex);
      if (st.tool === 'eraser') st.tool = lastPaintTool;
      refresh();
    }
    /** Segundo color de los rellenos especiales. El mismo que el primero (o el que ya era segundo) vuelve al
        automático. */
    function setColor2(hex) {
      st.color2 = hex === st.color || hex === st.color2 ? null : hex;
      U.pref.set('colorear.color2', st.color2);
      CL.sound.play('sparkle', { count: 3 });
      if (navigator.vibrate) { try { navigator.vibrate(30); } catch (e) { /* nada */ } }
      specialsBox.classList.remove('cl-bump');
      void specialsBox.offsetWidth;
      specialsBox.classList.add('cl-bump');
      refresh();
    }
    /* Mantener apretado un color SECOND_MS (dedo o lápiz) o clic derecho: segundo color. Un anillo se llena
       mientras tanto; si el dedo se mueve (la paleta se desliza) o se suelta antes, es un toque común.
       Devuelve una función que dice si el último toque ya se usó así (el 'click' que sigue se ignora). */
    function holdForSecond(b, hex) {
      let timer = 0, x0 = 0, y0 = 0, type = '', used = false, ring = null;
      const stop = () => {
        clearTimeout(timer); timer = 0;
        if (ring) { ring.remove(); ring = null; }
      };
      const fire = () => { stop(); used = true; setColor2(hex); };
      on(b, 'pointerdown', (ev) => {
        type = ev.pointerType; used = false;
        stop();
        if (ev.button !== 0) return;
        x0 = ev.clientX; y0 = ev.clientY;
        ring = el('span.cl-hold', { 'aria-hidden': 'true', html: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" pathLength="100"/></svg>' });
        ring.style.setProperty('--hold', SECOND_MS + 'ms');
        b.append(ring);
        timer = setTimeout(fire, SECOND_MS);
      });
      on(b, 'pointermove', (ev) => { if (timer && Math.hypot(ev.clientX - x0, ev.clientY - y0) > 12) stop(); });
      for (const t of ['pointerup', 'pointercancel', 'pointerleave']) on(b, t, () => { if (timer) stop(); });
      on(b, 'contextmenu', (ev) => {
        ev.preventDefault();
        if (type === 'mouse' && !used) fire();   // clic derecho (en táctil, el menú del toque largo se ignora)
      });
      return () => used;
    }
    function setFill(kind) {
      st.fill = kind;
      if (st.tool === 'eraser') st.tool = lastPaintTool;
      refresh();
    }
    function setSize(i) {
      st.size = i;
      U.pref.set('colorear.size', i);
      if (st.tool === 'bucket') setTool('brush'); else refresh();
    }
    function toggleClip() {
      st.clip = !st.clip;
      CL.sound.play(st.clip ? 'pop' : 'tap', { pitch: st.clip ? 1.2 : 0.8 });
      if (st.tool === 'bucket') setTool('brush'); else refresh();
    }

    /* ---------- selector de cualquier color ---------- */
    function openPicker() {
      if (picker) return;
      const mapC = el('canvas.cl-pk-map');
      const grayC = el('canvas.cl-pk-gray');
      const mark = el('div.cl-pk-mark');
      const prev = el('div.cl-pk-prev');
      const mapBox = el('div.cl-pk-mapbox', null, [mapC, mark]);
      const grayBox = el('div.cl-pk-graybox', null, [grayC]);
      const ok = button({ icon: 'check', label: 'Listo', cls: 'btn-lg cl-pk-ok', sound: 'pop', onTap: () => picker && picker.close() });
      const content = el('div.cl-picker', null, [mapBox, grayBox, el('div.cl-pk-row', null, [prev, ok])]);
      picker = CL.ui.modal(content, { cls: 'cl-pk-back', onClose: () => { picker = null; } });
      CL.ui.noGestures(mapBox);
      CL.ui.noGestures(grayBox);
      let chosen = st.fill === 'solid' && !PALETTE.some((p) => p[0] === st.color) ? st.color : st.custom;
      prev.style.background = chosen;

      // Mapa tono × luminosidad con degradés de canvas (instantáneo). Es exacto: en HSL el tono varía en
      // tramos rectos cada 60°, y subir o bajar la luminosidad es mezclar el color puro con blanco o negro.
      // Se mide con offsetWidth/Height (el panel entra con una animación de escala).
      const drawMap = () => {
        const dpr = U.dpr();
        const w = Math.max(1, Math.round(mapC.offsetWidth * dpr)), h = Math.max(1, Math.round(mapC.offsetHeight * dpr));
        mapC.width = w; mapC.height = h;
        const ctx = mapC.getContext('2d');
        const hue = ctx.createLinearGradient(0, 0, w, 0);
        for (let a = 0; a <= 360; a += 60) hue.addColorStop(a / 360, hslHex(a % 360, PK_S, 50));
        ctx.fillStyle = hue;
        ctx.fillRect(0, 0, w, h);
        const mid = (PK_L0 - 50) / (PK_L0 - PK_L1);   // altura donde la luminosidad es 50 %
        const white = ctx.createLinearGradient(0, 0, 0, h);
        white.addColorStop(0, `rgba(255,255,255,${(PK_L0 - 50) / 50})`);
        white.addColorStop(mid, 'rgba(255,255,255,0)');
        white.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = white;
        ctx.fillRect(0, 0, w, h);
        const black = ctx.createLinearGradient(0, 0, 0, h);
        black.addColorStop(0, 'rgba(0,0,0,0)');
        black.addColorStop(mid, 'rgba(0,0,0,0)');
        black.addColorStop(1, `rgba(0,0,0,${(50 - PK_L1) / 50})`);
        ctx.fillStyle = black;
        ctx.fillRect(0, 0, w, h);
        grayC.width = Math.max(1, Math.round(grayC.offsetWidth * dpr));
        grayC.height = Math.max(1, Math.round(grayC.offsetHeight * dpr));
        const gc = grayC.getContext('2d');
        const g = gc.createLinearGradient(0, 0, grayC.width, 0);
        g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#000000');
        gc.fillStyle = g;
        gc.fillRect(0, 0, grayC.width, grayC.height);
      };
      drawMap();

      const placeMark = (hex, boxEl, fx, fy) => {
        boxEl.append(mark);
        mark.style.left = fx * 100 + '%';
        mark.style.top = fy * 100 + '%';
        mark.style.background = hex;
      };
      // La marca arranca sobre el color actual (en la barra de grises si es un gris).
      {
        const [h, s, l] = CL.fills.hexToHsl(chosen);
        if (s < 12) placeMark(chosen, grayBox, U.clamp(1 - l / 100, 0, 1), 0.5);
        else placeMark(chosen, mapBox, U.clamp(h / 360, 0, 1), U.clamp((PK_L0 - l) / (PK_L0 - PK_L1), 0, 1));
      }

      const choose = (hex, boxEl, fx, fy) => {
        chosen = hex;
        prev.style.background = hex;
        st.custom = hex;
        U.pref.set('colorear.custom', hex);
        setColor(hex);
        placeMark(hex, boxEl, fx, fy);
      };
      const track = (box, fn) => {
        let down = false;
        const at = (ev) => {
          const r = box.getBoundingClientRect();
          const fx = U.clamp((ev.clientX - r.left) / r.width, 0, 0.9999), fy = U.clamp((ev.clientY - r.top) / r.height, 0, 1);
          fn(fx, fy);
        };
        box.addEventListener('pointerdown', (ev) => { down = true; try { box.setPointerCapture(ev.pointerId); } catch (e) { /* nada */ } at(ev); CL.sound.play('tap'); });
        box.addEventListener('pointermove', (ev) => { if (down) at(ev); });
        box.addEventListener('pointerup', () => { down = false; });
        box.addEventListener('pointercancel', () => { down = false; });
      };
      track(mapBox, (fx, fy) => choose(hslHex(fx * 360, PK_S, PK_L0 - fy * (PK_L0 - PK_L1)), mapBox, fx, fy));
      track(grayBox, (fx) => {
        const v = Math.round(255 * (1 - fx));
        choose(U.rgbToHex(v, v, v), grayBox, fx, 0.5);
      });
    }

    /* ---------- vista: ajuste, zoom y desplazamiento ---------- */
    const view = { W: 1, H: 1, sw: 0, sh: 0, sl: 0, stop: 0, bw: 1, bh: 1, fx: 0, fy: 0, k: 1, kc: 1, tx: 0, ty: 0 };
    let viewAnim = 0, commitTimer = 0;

    // Posición del escenario en pantalla (se refresca en cada toque: la pantalla entra con una animación).
    function locate() {
      const r = stage.getBoundingClientRect();
      view.sl = r.left + stage.clientLeft; view.stop = r.top + stage.clientTop;
    }
    function measure() {
      // Tamaños de layout (no afectados por transformaciones CSS).
      const sw = stage.clientWidth, sh = stage.clientHeight;
      view.sw = sw; view.sh = sh;
      locate();
      // Botones de zoom: en fila arriba si el escenario es bien alto; si no, en columna a la derecha.
      // Se reserva su lugar para que no tapen el dibujo sin zoom.
      zoomBox.classList.toggle('cl-zoom-row', sh > sw * 1.15);
      const pad = 10;
      let ax = pad, ay = pad, aw = sw - pad * 2, ah = sh - pad * 2;
      const zw = zoomBox.offsetWidth, zh = zoomBox.offsetHeight;
      if (zw && zh) {
        if (zw > zh) { ay = Math.max(ay, zoomBox.offsetTop + zh + 4); ah = sh - ay - pad; }
        else { aw = zoomBox.offsetLeft - 4 - pad; }
      }
      const s = Math.max(0.01, Math.min(aw / view.W, ah / view.H));
      view.bw = view.W * s; view.bh = view.H * s;
      view.fx = ax + (aw - view.bw) / 2;
      view.fy = ay + (ah - view.bh) / 2;
    }
    function apply() {
      const f = view.k / view.kc;
      board.style.transform = `translate(${view.tx}px, ${view.ty}px) scale(${f})`;
      zoomBox.classList.toggle('cl-zoomed', view.k > 1.01);
    }
    // "Confirmar" el zoom: el tablero toma el tamaño real (las líneas SVG se re-dibujan nítidas).
    function commit() {
      view.kc = view.k;
      board.style.width = view.bw * view.k + 'px';
      board.style.height = view.bh * view.k + 'px';
      apply();
    }
    function commitLater(ms = 160) { clearTimeout(commitTimer); commitTimer = setTimeout(commit, ms); }
    function clampView() {
      view.k = U.clamp(view.k, 1, MAX_ZOOM);
      if (view.k <= 1.001) { view.k = 1; view.tx = view.fx; view.ty = view.fy; return; }
      const BW = view.bw * view.k, BH = view.bh * view.k, m = 36;
      view.tx = BW <= view.sw - 2 * m ? (view.sw - BW) / 2 : U.clamp(view.tx, view.sw - m - BW, m);
      view.ty = BH <= view.sh - 2 * m ? (view.sh - BH) / 2 : U.clamp(view.ty, view.sh - m - BH, m);
    }
    function zoomAt(cx, cy, nk) {
      nk = U.clamp(nk, 1, MAX_ZOOM);
      const u = (cx - view.tx) / (view.bw * view.k), v = (cy - view.ty) / (view.bh * view.k);
      view.k = nk;
      view.tx = cx - u * view.bw * nk;
      view.ty = cy - v * view.bh * nk;
      clampView();
      apply();
    }
    function animateTo(nk, cx, cy) {
      cancelAnimationFrame(viewAnim);
      const k0 = view.k, tx0 = view.tx, ty0 = view.ty;
      // destino
      if (cx == null) { cx = view.sw / 2; cy = view.sh / 2; }
      zoomAt(cx, cy, nk);
      const k1 = view.k, tx1 = view.tx, ty1 = view.ty;
      view.k = k0; view.tx = tx0; view.ty = ty0;
      const t0 = performance.now(), dur = 220;
      const frame = (now) => {
        const t = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - t, 3);
        view.k = k0 + (k1 - k0) * e; view.tx = tx0 + (tx1 - tx0) * e; view.ty = ty0 + (ty1 - ty0) * e;
        apply();
        if (t < 1) viewAnim = requestAnimationFrame(frame); else commit();
      };
      viewAnim = requestAnimationFrame(frame);
    }
    function zoomStep(f) { animateTo(view.k * f, null, null); }
    function resetView() { measure(); view.k = 1; view.tx = view.fx; view.ty = view.fy; commit(); }

    /** Punto de pantalla -> punto de la imagen. */
    function toImg(cx, cy) {
      return {
        x: ((cx - view.sl - view.tx) / (view.bw * view.k)) * view.W,
        y: ((cy - view.stop - view.ty) / (view.bh * view.k)) * view.H,
      };
    }
    const imgPerCss = () => view.W / (view.bw * view.k);

    /* ---------- punteros: herramienta, pellizco y desplazamiento ----------
       Cada puntero apoyado tiene un rol: 'tool' (pinta), 'gest' (pellizco / desplazamiento) o 'palm'
       (se ignora). Reglas pensadas para manos chicas:
       - Un dedo que ya estaba quieto un rato cuando baja otro es la mano apoyada: se ignora (si había
         empezado un trazo, se deshace) y el dedo nuevo es el que pinta.
       - Un segundo dedo al principio de un trazo (trazo "joven") lo cancela y pasa a pellizco; si el trazo
         ya venía largo, el dedo extra se ignora y el trazo sigue.
       - Con el balde, dos toques que se superponen un instante pintan los dos: un toque es bajar y subir
         rápido casi sin moverse, sin que el pellizco haya cambiado el zoom.
       - El lápiz nunca hace pellizco: con lápiz, el dedo (o la palma) se ignora. */
    const ptrs = new Map();
    let mode = 'idle';          // 'idle' | 'tool' | 'gesture'
    let toolPid = null, act = null, gest = null, gestK0 = 1, scribble = null, spaceDown = false, overStage = false;
    const REST_MS = 250, TAP_MS = 500, TAP_MOVE = 12, YOUNG_MS = 200, YOUNG_PX = 30;

    const gestPtrs = () => [...ptrs.values()].filter((p) => p.role === 'gest');
    function center() {
      let x = 0, y = 0, n = 0;
      const pts = gestPtrs().slice(0, 2);
      for (const p of pts) { x += p.x; y += p.y; n++; }
      const d = pts.length > 1 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0;
      return { x: x / Math.max(1, n) - view.sl, y: y / Math.max(1, n) - view.stop, d, n };
    }
    function startGesture() {
      cancelAnimationFrame(viewAnim);
      const c = center();
      gest = { c0: c, k0: view.k, tx0: view.tx, ty0: view.ty };
    }
    function enterGesture() {
      mode = 'gesture';
      toolPid = null;
      gestK0 = view.k;
      startGesture();
    }
    function moveGesture() {
      if (!gest) return;
      const c = center();
      if (!c.n) return;
      let nk = gest.k0;
      if (c.n > 1 && gest.c0.n > 1 && gest.c0.d > 10) nk = gest.k0 * (c.d / gest.c0.d);
      nk = U.clamp(nk, 1, MAX_ZOOM);
      const u = (gest.c0.x - gest.tx0) / (view.bw * gest.k0), v = (gest.c0.y - gest.ty0) / (view.bh * gest.k0);
      view.k = nk;
      view.tx = c.x - u * view.bw * nk;
      view.ty = c.y - v * view.bh * nk;
      clampView();
      apply();
    }

    function stopScribble() { if (scribble) { scribble.stop(); scribble = null; } }

    function toolDown(ev) {
      const p = toImg(ev.clientX, ev.clientY);
      if (st.tool === 'bucket') { act = { type: 'bucket', cx: ev.clientX, cy: ev.clientY, p }; return; }
      const erase = st.tool === 'eraser';
      const stroke = painter.beginStroke(p.x, p.y, {
        erase, clip: st.clip, fill: { kind: st.fill, color: st.color, color2: st.color2 },
        width: SIZES[st.size] * imgPerCss(), pressure: U.pressure(ev),
      });
      if (!stroke) { act = null; return; }
      act = { type: 'stroke', stroke, lx: ev.clientX, ly: ev.clientY, lt: performance.now(), travel: 0 };
      scribble = CL.sound.loop('scribble', { freq: erase ? 2600 : 1300, vol: 0.06 });
    }
    function toolMove(ev) {
      if (!act || act.type !== 'stroke') return;
      const list = ev.getCoalescedEvents ? ev.getCoalescedEvents() : null;
      for (const e of list && list.length ? list : [ev]) {
        const p = toImg(e.clientX, e.clientY);
        act.stroke.move(p.x, p.y, U.pressure(e));
      }
      const now = performance.now();
      const d = Math.hypot(ev.clientX - act.lx, ev.clientY - act.ly);
      const sp = d / Math.max(1, now - act.lt);
      act.travel += d;
      act.lx = ev.clientX; act.ly = ev.clientY; act.lt = now;
      if (scribble) scribble.update({ speed: sp * 2 });
    }
    function toolUp() {
      const a = act;
      act = null;
      stopScribble();
      if (!a) return;
      if (a.type === 'stroke') { a.stroke.end(); return; }
      bucket(a.p);
    }
    function toolCancel() {
      const a = act;
      act = null;
      stopScribble();
      if (a && a.type === 'stroke') a.stroke.cancel();
    }
    /** Si hay un trazo a medio hacer, queda como está (así lo que se guarda es lo que se ve). */
    function commitStroke() { if (act && act.type === 'stroke') toolUp(); }
    function bucket(p) {
      const pr = painter.fillAt(p.x, p.y, { kind: st.fill, color: st.color, color2: st.color2 }, { animate: !reducedMotion() });
      if (!pr) { CL.sound.play('nope'); return; }
      CL.sound.play('splash', { pitch: 0.82 + Math.random() * 0.45 });
    }

    on(stage, 'pointerdown', (ev) => {
      if (!ready || finishing) return;
      if (ev.target.closest('button')) return;
      ev.preventDefault();
      if (mode === 'idle') locate();
      if (ev.pointerType === 'mouse' && ev.button !== 0 && ev.button !== 1) return;
      try { stage.setPointerCapture(ev.pointerId); } catch (e) { /* nada */ }
      const now = performance.now();
      const rec = {
        x: ev.clientX, y: ev.clientY, x0: ev.clientX, y0: ev.clientY, t0: now, moved: 0,
        role: 'gest', tap: null, pen: ev.pointerType === 'pen',
      };
      ptrs.set(ev.pointerId, rec);

      if (mode === 'idle') {
        const panMouse = ev.pointerType === 'mouse' && (ev.button === 1 || spaceDown);
        if (panMouse) { enterGesture(); return; }
        rec.role = 'tool';
        mode = 'tool';
        toolPid = ev.pointerId;
        toolDown(ev);
        return;
      }

      if (mode === 'tool') {
        const tp = ptrs.get(toolPid);
        const stroke = !!(act && act.type === 'stroke');
        const resting = !!tp && now - tp.t0 > REST_MS && tp.moved < TAP_MOVE;
        // Mano apoyada (o lápiz que llega con la palma apoyada): el dedo viejo se ignora y pinta el nuevo.
        if (tp && (resting || (rec.pen && !tp.pen))) {
          if (stroke) { if (resting || now - tp.t0 < YOUNG_MS) toolCancel(); else toolUp(); }
          act = null;
          tp.role = 'palm';
          rec.role = 'tool';
          toolPid = ev.pointerId;
          toolDown(ev);
          return;
        }
        // Dedo extra durante un trazo largo, o mientras se dibuja con lápiz: se ignora y el trazo sigue.
        if (tp && (tp.pen || (stroke && !(now - tp.t0 < YOUNG_MS && act.travel < YOUNG_PX)))) {
          rec.role = 'palm';
          return;
        }
        // Dos dedos casi juntos: pellizco. Con el balde, cada uno puede terminar siendo un toque.
        if (stroke) toolCancel();
        else if (act && act.type === 'bucket' && tp) {
          tp.tap = act.p;
          rec.tap = toImg(ev.clientX, ev.clientY);
        }
        act = null;
        if (tp) tp.role = 'gest';
        enterGesture();
        return;
      }

      // Ya hay un gesto: un tercer dedo (o un lápiz) se ignora.
      if (gestPtrs().length > 2 || rec.pen) { rec.role = 'palm'; return; }
      if (st.tool === 'bucket' && ev.pointerType !== 'mouse') rec.tap = toImg(ev.clientX, ev.clientY);
      startGesture();
    });
    on(stage, 'pointermove', (ev) => {
      if (ev.pointerType === 'mouse') moveCursor(ev);
      const p = ptrs.get(ev.pointerId);
      if (!p) return;
      p.x = ev.clientX; p.y = ev.clientY;
      p.moved = Math.max(p.moved, Math.hypot(p.x - p.x0, p.y - p.y0));
      if (p.role === 'palm') return;
      if (mode === 'tool' && ev.pointerId === toolPid) toolMove(ev);
      else if (mode === 'gesture') moveGesture();
    });
    const up = (ev) => {
      const rec = ptrs.get(ev.pointerId);
      if (!rec) return;
      ptrs.delete(ev.pointerId);
      if (rec.role === 'palm') return;
      if (mode === 'tool') {
        if (ev.pointerId === toolPid) {
          if (ev.type === 'pointercancel') toolCancel(); else toolUp(ev);
          mode = 'idle';
          toolPid = null;
        }
      } else if (mode === 'gesture') {
        // ¿Fue un toque con el balde y no parte de un pellizco?
        if (rec.tap && ev.type === 'pointerup' && performance.now() - rec.t0 < TAP_MS && rec.moved < TAP_MOVE &&
            Math.abs(view.k / gestK0 - 1) < 0.04) bucket(rec.tap);
        if (gestPtrs().length) startGesture();
        else { mode = 'idle'; gest = null; commit(); }
      }
    };
    on(stage, 'pointerup', up);
    on(stage, 'pointercancel', up);
    on(stage, 'lostpointercapture', up);
    on(stage, 'pointerenter', (ev) => { if (ev.pointerType === 'mouse') overStage = true; });
    on(stage, 'pointerleave', (ev) => { if (ev.pointerType === 'mouse') { overStage = false; cursor.classList.remove('on'); } });
    on(stage, 'wheel', (ev) => {
      if (!ready) return;
      ev.preventDefault();
      locate();
      const dy = ev.deltaMode === 1 ? ev.deltaY * 16 : ev.deltaMode === 2 ? ev.deltaY * 400 : ev.deltaY;
      const f = Math.exp(-dy * (ev.ctrlKey ? 0.012 : 0.0022));
      cancelAnimationFrame(viewAnim);
      zoomAt(ev.clientX - view.sl, ev.clientY - view.stop, view.k * f);
      commitLater();
      moveCursor(ev);
    }, { passive: false });
    on(stage, 'auxclick', (ev) => ev.preventDefault());

    // Teclado (compu): Ctrl+Z / Ctrl+Y, espacio para mover, + / - / 0 para el zoom, Escape cierra el selector.
    on(window, 'keydown', (ev) => {
      if (picker) {
        if (ev.key === 'Escape') { ev.preventDefault(); picker.close(); }
        return;
      }
      if (!ready) return;
      const k = ev.key.toLowerCase();
      if ((ev.ctrlKey || ev.metaKey) && k === 'z') { ev.preventDefault(); if (ev.shiftKey) doRedo(); else doUndo(); return; }
      if ((ev.ctrlKey || ev.metaKey) && k === 'y') { ev.preventDefault(); doRedo(); return; }
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      if (ev.code === 'Space') {
        // Con el foco en un botón, la barra espaciadora aprieta ese botón: si se llegó con el teclado
        // (:focus-visible) o si el mouse no está sobre el dibujo. Si no, es para mover el dibujo.
        const ae = document.activeElement;
        const ctl = ae && ae !== document.body && ae.closest && ae.closest('button, a, input, select, textarea');
        if (ctl && (!overStage || focusVisible(ctl))) return;
        ev.preventDefault();
        if (!spaceDown) { spaceDown = true; stage.classList.add('cl-pan'); }
        return;
      }
      if (k === '+' || k === '=') zoomStep(1.7);
      else if (k === '-') zoomStep(1 / 1.7);
      else if (k === '0') animateTo(1, null, null);
    });
    on(window, 'keyup', (ev) => {
      if (ev.code === 'Space' && spaceDown) { ev.preventDefault(); spaceDown = false; stage.classList.remove('cl-pan'); }
    });

    // Círculo que muestra el tamaño del pincel/goma con el mouse.
    function moveCursor(ev) {
      if (ev) { cursor._x = ev.clientX - view.sl; cursor._y = ev.clientY - view.stop; }
      if (cursor._x == null) return;
      cursor.style.transform = `translate(${cursor._x}px, ${cursor._y}px)`;
      cursor.classList.toggle('on', st.tool !== 'bucket' && ready);
    }
    function updateCursor() {
      const d = SIZES[st.size];
      cursor.style.width = cursor.style.height = d + 'px';
      cursor.style.margin = -d / 2 + 'px 0 0 ' + -d / 2 + 'px';
      cursor.classList.toggle('erase', st.tool === 'eraser');
      stage.dataset.tool = st.tool;
      if (st.tool === 'bucket') cursor.classList.remove('on');
    }

    /* ---------- deshacer / rehacer ---------- */
    async function doUndo() {
      if (!painter || !painter.canUndo) { CL.sound.play('nope'); return; }
      toolCancel();
      CL.sound.play('undo');
      await painter.undo();
    }
    async function doRedo() {
      if (!painter || !painter.canRedo) { CL.sound.play('nope'); return; }
      toolCancel();
      CL.sound.play('redo');
      await painter.redo();
    }

    /* ---------- borrar todo ---------- */
    function clearAll() {
      if (!painter || !ready || finishing) return;
      if (blank || (!touched && !(work && work.paint))) return;   // no hay nada pintado
      toolCancel();
      if (!painter.clear()) return;
      blank = true;
      // Una obra terminada no se pierde: lo que se pinte ahora es una obra nueva ("Mis obras" la conserva).
      if (work && work.status === 'done') {
        work = null;
        forceDone = false;
        try { history.replaceState(history.state, '', '#colorear/' + source); } catch (e) { /* nada */ }
      }
      board.classList.remove('cl-wipe');
      void board.offsetWidth;
      board.classList.add('cl-wipe');
      CL.sound.play('whoosh');
    }

    /* ---------- guardado ---------- */
    // ver = versión de la pintura (sube con cada cambio); savedVer = la última que quedó en IndexedDB.
    let chain = Promise.resolve();
    let ver = 0, savedVer = 0, emergencyVer = -1;
    const mountTs = Date.now();
    let saveTimer = 0;
    const saver = {
      schedule(ms) { clearTimeout(saveTimer); saveTimer = setTimeout(() => { saveTimer = 0; save(); }, ms); },
      cancel() { clearTimeout(saveTimer); saveTimer = 0; },
    };
    function onChange(e) {
      touched = true; dirty = true; ver++;
      // Balde, deshacer y rehacer son acciones sueltas: se guardan enseguida. Las pinceladas suelen
      // venir seguidas, así que esperan un poco más (igual hay guardado de emergencia al cerrar).
      const type = e && e.type;
      if (type !== 'clear') blank = false;
      saver.schedule(type === 'stroke' || type === 'erase' ? 800 : 250);
    }
    function save() {
      if (!painter || !dirty) return chain;
      // Con un trazo a medio hacer no se guarda: si después un segundo dedo lo cancela, quedaría guardado
      // un trazo fantasma. Se guarda al terminarlo (flush y el guardado de emergencia lo cierran antes).
      if (act && act.type === 'stroke') { saver.schedule(800); return chain; }
      dirty = false;
      const p = painter, v = ver;
      chain = chain.then(async () => {
        if (blank && !forceDone) {
          // Borró todo: como si no hubiera empezado (no queda una obra en blanco en "Sin terminar").
          if (work) await CL.db.works.del(work.id);
          work = null;
          savedVer = Math.max(savedVer, v);
          if (savedVer === ver && !dirty) CL.coloring.pending.clear(source);
          return;
        }
        // Momento de la "foto" (toBlob copia la pintura en el momento en que se llama).
        const snap = Date.now();
        const [paint, thumb] = await Promise.all([p.toBlob(), p.thumbBlob(480)]);
        const rec = {
          kind: 'colorear', source, w: p.w, h: p.h, paint, thumb,
          status: forceDone ? 'done' : (work && work.status) || 'progress',
          meta: Object.assign({}, work && work.meta, { name, snap }),
        };
        if (work) { rec.id = work.id; rec.createdAt = work.createdAt; }
        work = await CL.db.works.save(rec);
        savedVer = Math.max(savedVer, v);
        // Todo lo pintado ya está en la base: lo anotado de emergencia sobra.
        if (savedVer === ver && !dirty) CL.coloring.pending.clear(source);
      }).catch((e) => { console.warn('No se pudo guardar el dibujo', e); dirty = true; });
      return chain;
    }

    /** Guardado de emergencia SÍNCRONO al recargar, cerrar o esconder la página (ver engine.js). */
    function emergencySave() {
      if (!painter) return;
      commitStroke();                           // el trazo a medio hacer queda como se ve
      painter.finishAnim();                     // el balde que se estaba animando queda aplicado
      if (!touched) return;
      if (!dirty && savedVer === ver) return;   // todo guardado
      if (emergencyVer === ver) return;         // ya anotado (beforeunload, pagehide y visibilitychange)
      const ok = CL.coloring.pending.write({
        source, workId: work ? work.id : null, name, w: painter.w, h: painter.h, mountTs,
        status: forceDone ? 'done' : (work && work.status) || 'progress',
      }, painter);
      if (ok) emergencyVer = ver;
    }
    // Estos quedan hasta que termine el último guardado, aunque ya se haya salido de la pantalla (ver destroy).
    const onHidden = () => { if (document.visibilityState === 'hidden') emergencySave(); };
    window.addEventListener('beforeunload', emergencySave);
    window.addEventListener('pagehide', emergencySave);
    document.addEventListener('visibilitychange', onHidden);
    const offEmergency = () => {
      window.removeEventListener('beforeunload', emergencySave);
      window.removeEventListener('pagehide', emergencySave);
      document.removeEventListener('visibilitychange', onHidden);
    };

    async function finish() {
      if (!painter || finishing) return;
      if (blank || (!touched && !(work && work.paint))) {
        // Todavía no pintó nada: el balde "salta" para invitar a pintar.
        CL.sound.play('nope');
        toolBtns.bucket.classList.remove('cl-nudge');
        void toolBtns.bucket.offsetWidth;
        toolBtns.bucket.classList.add('cl-nudge');
        return;
      }
      finishing = true;
      toolCancel();
      painter.finishAnim();
      forceDone = true;
      dirty = true;
      saver.cancel();
      // CL.ui.celebrate() termina con cualquier toque: un doble toque en "¡Terminé!" lo cortaba enseguida.
      // Durante el primer segundo se frenan (en captura) los toques que caen sobre el festejo.
      const t0 = performance.now();
      const guard = (ev) => {
        if (performance.now() - t0 < 1000 && ev.target && ev.target.closest && ev.target.closest('.celebrate')) ev.stopPropagation();
      };
      window.addEventListener('pointerdown', guard, true);
      try {
        await Promise.all([save(), CL.ui.celebrate()]);
      } finally {
        window.removeEventListener('pointerdown', guard, true);
      }
      if (alive && work) {
        // La entrada actual del historial pasa a ser ESTA obra (sin volver a montar la pantalla): así el
        // "atrás" del sistema desde la galería la reabre pintada, en vez del mismo dibujo en blanco.
        try { history.replaceState(history.state, '', '#colorear/' + source + '/' + work.id); } catch (e) { /* nada */ }
        CL.router.go('obras/' + work.id);
      } else finishing = false;
    }

    /* ---------- carga ---------- */
    async function findWork() {
      if (workId) {
        const w = await CL.db.works.get(workId);
        if (w && w.kind === 'colorear' && w.source === source) return w;
      }
      return CL.db.works.findProgress('colorear', source);
    }

    async function load() {
      refresh();
      const stopSpin = CL.ui.spinner(stage);
      stage.classList.add('cl-loading');
      try {
        const res = CL.coloring.RES();
        // Si se acaba de salir de un dibujo, su guardado puede seguir en curso: se espera (si no, se
        // duplicaría la obra). Si la vez anterior la página se cerró antes de terminar de guardar, se
        // recupera eso. Sin IndexedDB (bloqueada, modo privado) se colorea igual, sin guardar.
        await whenSaved();
        await CL.coloring.pending.recover(source).catch(() => {});
        const [s0, w0] = await Promise.all([
          CL.coloring.loadSource(source, res),
          findWork().catch((e) => { console.warn('Sin base de datos: no se va a guardar', e); return null; }),
        ]);
        if (!alive) { s0.revoke(); return; }
        src = s0; work = w0;
        const lines = CL.coloring.rasterLines(src.image, src.w, src.h);
        await U.nextFrame();
        const t0 = performance.now();
        const regions = await CL.regions.computeAsync(lines);
        CL.coloring.stats.regionsMs = Math.round(performance.now() - t0);
        if (!alive) return;
        painter = CL.coloring.createPainter({ w: src.w, h: src.h, regions, lines });
        if (work && work.paint) await painter.loadPaint(work.paint);
        if (!alive) { painter.destroy(); painter = null; return; }
        painter.canvas.classList.add('cl-paint');
        board.append(painter.canvas, lineImg);
        lineImg.src = src.lineUrl;
        painter.events.on('change', onChange);
        painter.events.on('history', refreshHistory);
        view.W = src.w; view.H = src.h;
        resetView();
        ready = true;
        root.classList.add('cl-ready');
        refresh();
        painter.warm();   // máscara del fondo en ratos libres (el primer balde ahí no se traba)
      } catch (e) {
        console.warn('No se pudo abrir el dibujo', source, e);
        if (alive) { CL.ui.toast('close'); setTimeout(() => { if (alive) CL.router.replace(backPath); }, 900); }
      } finally {
        stopSpin();
        stage.classList.remove('cl-loading');
      }
    }

    const ro = new ResizeObserver(() => {
      if (!ready) return;
      // Si cambia el tamaño (p. ej. se rota la tablet) con el dedo apoyado, el trazo se cierra ahí:
      // seguirlo con la vista nueva lo haría saltar. El resto de ese toque se ignora.
      if (mode === 'tool') {
        if (act && act.type === 'stroke') toolUp(); else toolCancel();
        mode = 'idle'; toolPid = null; ptrs.clear();
      } else if (mode === 'gesture') {
        mode = 'idle'; gest = null; ptrs.clear();
      }
      const k = view.k;
      measure();
      if (k <= 1.001) resetView(); else { clampView(); commit(); }
    });
    ro.observe(stage);

    return {
      load,
      flush() { commitStroke(); saver.cancel(); return save(); },
      /* Se sale enseguida (en una tablet lenta, guardar la pintura de 2048 px tarda 1-3 s y la pantalla
         no respondía): el guardado sigue en segundo plano. El pintor y el guardado de emergencia viven
         hasta que termina, y quien vaya a leer las obras espera CL.coloring.whenSaved(). */
      destroy() {
        alive = false;
        ready = false;
        toolCancel();
        cancelAnimationFrame(viewAnim);
        clearTimeout(commitTimer);
        ro.disconnect();
        if (picker) picker.close();
        if (painter) painter.finishAnim();
        saver.cancel();
        cleanups.forEach((f) => f());
        const done = save().catch(() => { /* ya avisado */ }).then(() => {
          offEmergency();
          if (src) src.revoke();
          if (painter) painter.destroy();
        });
        saving = saving.then(() => done);
      },
      // Para pruebas.
      get painter() { return painter; },
      get work() { return work; },
      get view() { return view; },
      get pointers() { return { mode, toolPid, act: act && act.type, ptrs: [...ptrs].map(([id, p]) => [id, p.role]) }; },
      st,
    };
  }

  CL.coloring = Object.assign(CL.coloring || {}, { PALETTE, SPECIALS, SIZES, whenSaved });
  /** Pantalla de colorear montada (para pruebas / depuración). */
  Object.defineProperty(CL.coloring, 'screen', { get: () => current, configurable: true });
})(window.CL);
