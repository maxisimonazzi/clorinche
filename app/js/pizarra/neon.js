/* Colorinche — Modo neón (dentro de la pizarra).
   Rutas: #neon (retoma el progreso o empieza en blanco) y #neon/<workId> (sigue esa obra).

   Cómo se dibuja el brillo:
   - Cada trazo se "estampa" con sprites radiales gaussianos precalculados, en tres capas:
     halo difuso y ancho, tubo de color y centro casi blanco, a distancia fija a lo largo del
     recorrido suavizado. El tubo tapa lo que hay abajo (lo nuevo siempre se ve encima) y el centro
     se suma con 'lighter' (al cruzarse, los tubos se encienden), con un techo bajo para que un
     garabato no se vuelva un manchón blanco. El centro va un poquito atrás del tubo, así el tubo
     del mismo trazo nunca lo tapa.
   - Una suma de gaussianas separadas hasta ~1,4σ es lisa (la ondulación es < 0,1 %): no quedan
     "cuentas" en las uniones y nunca hace falta redibujar un trazo entero (sólo lo nuevo).
   - El lienzo es un cuadrado centrado en la pizarra (lado = el mayor entre ancho y alto): al girar
     la pantalla no se pierde nada y el centro del caleidoscopio es siempre el centro de la pizarra.
   - Guardado: sólo la caja que tiene tinta, en PNG (sin pérdida) y con la densidad de la pantalla
     (meta.v = 2): retomar una obra muchas veces no la degrada. Autoguardado 200 ms después de soltar
     el último dedo. Al salir de la pantalla se saca una foto sincrónica y se codifica en segundo plano
     (la navegación no espera); si la página se cierra o pasa a segundo plano, se guarda en el momento
     (codificación sincrónica + copia de rescate + transacción con commit()), así no se pierde nada.
   - Una obra terminada nunca se pisa con una pizarra vacía: "borrar todo" sobre ella empieza una
     obra nueva y la terminada queda intacta en la galería.

   API: CL.neon.exportPNG(work) -> Promise<Blob> (fondo oscuro + trazos, recortado a lo que se vio
   mientras se dibujaba: la unión de las vistas usadas en la obra). */
'use strict';
(function (CL) {
  const U = CL.util;
  const el = U.el;

  /* ---------- Configuración ---------- */

  const COLORS = [
    { id: 'rosa', label: 'Rosa', hex: '#ff4fd8' },
    { id: 'cian', label: 'Celeste', hex: '#2ef2ff' },
    { id: 'lima', label: 'Verde lima', hex: '#a6ff3a' },
    { id: 'amarillo', label: 'Amarillo', hex: '#ffec3d' },
    { id: 'naranja', label: 'Naranja', hex: '#ff9a2e' },
    { id: 'violeta', label: 'Violeta', hex: '#b65cff' },
    { id: 'azul', label: 'Azul eléctrico', hex: '#3f7cff' },
    { id: 'rojo', label: 'Rojo', hex: '#ff3b55' },
    { id: 'arcoiris', label: 'Arcoíris', hex: null },
  ];
  const RAINBOW = 'arcoiris';

  // σ del centro blanco (px CSS) para cada grosor; las otras capas son múltiplos.
  const SIZES = [
    { c: 1.4, label: 'Fino', dot: 24 },
    { c: 2.3, label: 'Mediano', dot: 34 },
    { c: 3.4, label: 'Grueso', dot: 46 },
    { c: 4.9, label: 'Muy grueso', dot: 60 },
  ];

  // Capas del trazo: k = σ relativo al del centro; gap = separación entre sellos (en σ de la capa);
  // amp = opacidad de cada sello (la suma a lo largo de una recta da ≈ amp·√(2π)/gap); white = cuánto se aclara.
  // - Halo: 'lighten' (no se acumula consigo mismo y nunca oscurece lo de abajo).
  // - Tubo: 'source-over' (con su mismo color da igual que 'lighten', pero sobre otros trazos pone el color
  //   nuevo encima: un trazo que cruza un garabato se sigue viendo).
  // - Centro: 'lighter' con techo bajo: una pasada llega a ≈ 0,85 y recién al cruzarse se satura a blanco.
  const LAYERS = [
    { k: 7.0, gap: 1.4, amp: 0.3, white: 0, op: 'lighten' },        // halo difuso y ancho → ≈ 0,47
    { k: 2.3, gap: 1.1, amp: 0.4, white: 0.06, op: 'source-over' },  // tubo de color       → ≈ 0,69
    { k: 0.68, gap: 1.0, amp: 0.34, white: 0.85, op: 'lighter' },    // centro casi blanco  → ≈ 0,85
  ];
  const CORE = 2;
  const CORE_LAG = 2.6; // el centro va este múltiplo de σ del tubo detrás de la punta

  const MIRRORS = [
    { n: 0, label: 'Sin espejo' },
    { n: 2, label: 'Espejo de dos lados' },
    { n: 4, label: 'Caleidoscopio de 4' },
    { n: 6, label: 'Caleidoscopio de 6' },
    { n: 8, label: 'Caleidoscopio de 8' },
  ];

  const HUE_PER_PX = 0.55;   // arcoíris: grados de tono por px CSS recorrido
  const HUE_STEP = 10;       // los sprites del arcoíris se precalculan cada 10°
  const TAP_HUE = 50;        // arcoíris: cada puntito (toque sin mover) sale de otro color
  const FINGER_HUE = 55;     // arcoíris: cada dedo que se suma arranca en otro tono
  const MAX_POINTERS = 5;

  /* ---------- Colores ---------- */

  const hexRgb = (hex) => U.hexToRgb(hex);
  const whiten = (rgb, t) => rgb.map((v) => Math.round(v + (255 - v) * t));

  function hslRgb(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const f = (t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map((v) => Math.round(v * 255));
  }

  const rainbowRgb = new Map();
  function hueRgb(hue) {
    const b = ((Math.round(hue / HUE_STEP) * HUE_STEP) % 360 + 360) % 360;
    let c = rainbowRgb.get(b);
    if (!c) { c = hslRgb(b, 1, 0.58); rainbowRgb.set(b, c); }
    return c;
  }

  /* ---------- Sprites gaussianos (se calculan una vez por color, capa y resolución) ---------- */

  const sprites = new Map();
  const E3 = Math.exp(-4.5); // valor de la gaussiana en el borde del sprite (radio = 3σ)

  function sprite(rgb, layer, n) {
    const key = rgb[0] + ',' + rgb[1] + ',' + rgb[2] + '|' + layer + '|' + n;
    let c = sprites.get(key);
    if (c) return c;
    const L = LAYERS[layer];
    const col = L.white ? whiten(rgb, L.white) : rgb;
    c = U.canvas(n, n);
    const g = c.getContext('2d');
    const h = n / 2;
    // Píxel por píxel (sin el tramado de los degradés del navegador: el lienzo queda liso y el PNG
    // guardado pesa mucho menos).
    const img = g.createImageData(n, n);
    const d = img.data;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const t = Math.hypot(x + 0.5 - h, y + 0.5 - h) / h;
        // Gaussiana que llega exactamente a 0 en el borde (sin corte visible).
        const v = t >= 1 ? 0 : (Math.exp(-4.5 * t * t) - E3) / (1 - E3);
        const i = (y * n + x) * 4;
        d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2];
        d[i + 3] = Math.round(255 * L.amp * v);
      }
    }
    g.putImageData(img, 0, 0);
    sprites.set(key, c);
    return c;
  }

  // Resolución del sprite según el diámetro en pantalla (una gaussiana escala bien).
  const spriteRes = (diam) => (diam <= 18 ? 16 : diam <= 40 ? 32 : 64);

  /* ---------- Espejo / caleidoscopio ---------- */

  /** Matrices [a, b, c, d] (x' = a·dx + b·dy, y' = c·dx + d·dy) alrededor del centro.
      n = 2: espejo izquierda/derecha. 4, 6, 8: rotaciones de 360/(n/2) + su reflejo. */
  function transforms(n) {
    if (!n) return [[1, 0, 0, 1]];
    const m = n / 2;
    const out = [];
    for (let k = 0; k < m; k++) {
      const a = (2 * Math.PI * k) / m;
      const c = Math.cos(a), s = Math.sin(a);
      out.push([c, -s, s, c]);    // rotación
      out.push([-c, -s, -s, c]);  // rotación ∘ reflejo sobre el eje vertical
    }
    return out;
  }

  /** Ángulos (grados, y hacia abajo) de los ejes de espejo para la guía. */
  function mirrorAxes(n) {
    const m = n / 2, out = [];
    for (let j = 0; j < m; j++) out.push(90 + (180 * j) / m);
    return out;
  }

  /* ---------- Fondo (igual al CSS de la pizarra, para miniaturas y descargas) ---------- */

  function drawBackground(ctx, w, h) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#090514';
    ctx.fillRect(0, 0, w, h);
    ctx.translate(w / 2, h * 0.45);
    ctx.scale(w * 0.625, h * 0.625);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, '#26164d');
    g.addColorStop(0.55, '#150c31');
    g.addColorStop(1, '#090514');
    ctx.fillStyle = g;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  }

  /* ---------- Íconos propios ---------- */

  function mirrorIcon(n) {
    let s = `<circle cx="24" cy="24" r="20.5" fill="#1b1036" stroke="#8f7bff" stroke-width="2.5"/>`;
    if (!n) {
      s += `<path d="M13 30c3-9 7-13 11-7s7 3 11-6" fill="none" stroke="#ff4fd8" stroke-width="6.5" stroke-linecap="round" opacity=".4"/>
        <path d="M13 30c3-9 7-13 11-7s7 3 11-6" fill="none" stroke="#ffe3fa" stroke-width="2.6" stroke-linecap="round"/>`;
      return s;
    }
    for (const a of mirrorAxes(n)) {
      const r = (a * Math.PI) / 180, dx = Math.cos(r) * 17.5, dy = Math.sin(r) * 17.5;
      s += `<path d="M${(24 - dx).toFixed(1)} ${(24 - dy).toFixed(1)}L${(24 + dx).toFixed(1)} ${(24 + dy).toFixed(1)}" stroke="#c9bcff" stroke-width="1.8" stroke-dasharray="2.6 2.6" opacity=".85"/>`;
    }
    // Un puntito cerca de cada eje y sus copias: se ve la simetría.
    const off = (360 / n) * 0.3;
    const dots = [];
    const m = n / 2;
    for (let k = 0; k < m; k++) {
      for (const sg of [-1, 1]) dots.push(-90 + sg * off + (360 * k) / m);
    }
    const rr = n >= 6 ? 12.5 : 12;
    const dr = n >= 8 ? 2.6 : n >= 6 ? 2.9 : 3.3;
    for (const a of dots) {
      const r = (a * Math.PI) / 180;
      const x = (24 + Math.cos(r) * rr).toFixed(1), y = (24 + Math.sin(r) * rr).toFixed(1);
      s += `<circle cx="${x}" cy="${y}" r="${dr + 2}" fill="#ff4fd8" opacity=".35"/><circle cx="${x}" cy="${y}" r="${dr}" fill="#ffd9f6"/>`;
    }
    return s;
  }
  const iconMap = {};
  for (const m of MIRRORS) iconMap['neonMirror' + m.n] = mirrorIcon(m.n);
  CL.icons.add(iconMap);

  /* ---------- Sonidos propios ---------- */

  // Zumbido eléctrico suave mientras se dibuja: update({ speed }) con speed en px CSS/ms.
  CL.sound.defineLoop('neonHum', (s, o) => {
    const ac = s.ac;
    const t = ac.currentTime;
    const vol = o.vol || 0.06;
    const base = o.freq || 98;
    const out = ac.createGain();
    out.gain.value = 0.0001;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 480; lp.Q.value = 2.5;
    const trem = ac.createGain();
    trem.gain.value = 0.8;
    const lfo = ac.createOscillator();
    lfo.frequency.value = 8.5;
    const lfoAmt = ac.createGain();
    lfoAmt.gain.value = 0.2;
    lfo.connect(lfoAmt); lfoAmt.connect(trem.gain);
    const o1 = ac.createOscillator();
    o1.type = 'sawtooth'; o1.frequency.value = base;
    const o2 = ac.createOscillator();
    o2.type = 'sawtooth'; o2.frequency.value = base * 1.5; o2.detune.value = 8;
    const g2 = ac.createGain();
    g2.gain.value = 0.45;
    o1.connect(lp); o2.connect(g2); g2.connect(lp);
    lp.connect(trem); trem.connect(out);
    // Chisporroteo agudo muy bajito que crece con la velocidad.
    const nz = ac.createBufferSource();
    nz.buffer = s.noiseBuffer(); nz.loop = true;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 5200; bp.Q.value = 0.9;
    const ng = ac.createGain();
    ng.gain.value = 0;
    nz.connect(bp); bp.connect(ng); ng.connect(out);
    out.connect(s.out);
    o1.start(t); o2.start(t); lfo.start(t); nz.start(t, Math.random() * 1.5);
    out.gain.setTargetAtTime(vol * 0.5, t, 0.05);
    let stopped = false;
    return {
      update(p = {}) {
        if (stopped) return;
        const k = U.clamp((p.speed || 0) / 1.6, 0, 1);
        const now = ac.currentTime;
        out.gain.setTargetAtTime(vol * (0.5 + 0.5 * k), now, 0.07);
        lp.frequency.setTargetAtTime(460 + 900 * k, now, 0.08);
        o1.frequency.setTargetAtTime(base * (1 + 0.12 * k), now, 0.1);
        o2.frequency.setTargetAtTime(base * 1.5 * (1 + 0.12 * k), now, 0.1);
        ng.gain.setTargetAtTime(0.3 * k, now, 0.05);
      },
      stop() {
        if (stopped) return;
        stopped = true;
        const now = ac.currentTime;
        out.gain.setTargetAtTime(0.0001, now, 0.06);
        for (const x of [o1, o2, lfo, nz]) { try { x.stop(now + 0.45); } catch (e) { /* ya parado */ } }
        setTimeout(() => { try { out.disconnect(); } catch (e) { /* nada */ } }, 700);
      },
    };
  });

  // "Tzing" suave al apoyar el dedo.
  CL.sound.define('neonOn', (s, o) => {
    const p = o.pitch || 1;
    s.tone({ freq: 620 * p, to: 930 * p, attack: 0.004, decay: 0.09, vol: 0.05, type: 'triangle' });
    s.noise({ dur: 0.05, vol: 0.025, type: 'highpass', freq: 4500 });
  });

  // Tubos que se apagan: parpadeos y un zumbido que baja.
  CL.sound.define('neonOff', (s) => {
    [0, 0.12, 0.25, 0.36].forEach((at, i) =>
      s.noise({ at, dur: 0.05, vol: 0.05, type: 'bandpass', freq: 2200 - i * 300, q: 2 })
    );
    s.tone({ freq: 330, to: 60, type: 'triangle', attack: 0.02, decay: 0.85, vol: 0.08 });
    s.tone({ freq: 990, to: 180, type: 'sine', at: 0.3, attack: 0.01, decay: 0.55, vol: 0.05 });
  });

  /* ---------- Exportar ---------- */

  /** Arma la imagen final (fondo oscuro + trazos), recortada a lo que se vio mientras se dibujaba. */
  async function exportPNG(work) {
    if (!work) throw new Error('Sin obra');
    if (!work.paint) {
      if (work.thumb) return work.thumb;
      throw new Error('La obra no tiene imagen');
    }
    const img = await U.blobToImage(work.paint);
    const m = work.meta || {};
    if (m.v === 2 && m.box) {
      // Formato nuevo: la imagen guardada es sólo la caja con tinta; box = su esquina (px CSS desde el centro).
      const s = m.scale || 1;
      const vw = Math.max(1, Math.round(((m.view && m.view.w) || img.width / s) * s));
      const vh = Math.max(1, Math.round(((m.view && m.view.h) || img.height / s) * s));
      const c = U.canvas(vw, vh);
      const g = c.getContext('2d');
      drawBackground(g, vw, vh);
      g.drawImage(img, vw / 2 + m.box.x * s, vh / 2 + m.box.y * s);
      return U.canvasToBlob(c, 'image/png');
    }
    // Formato viejo: el lienzo cuadrado entero.
    const d = m.dpr || 1;
    let vw = Math.round(((m.view && m.view.w) || img.width / d) * d);
    let vh = Math.round(((m.view && m.view.h) || img.height / d) * d);
    vw = U.clamp(vw, 1, img.width);
    vh = U.clamp(vh, 1, img.height);
    const c = U.canvas(vw, vh);
    const ctx = c.getContext('2d');
    drawBackground(ctx, vw, vh);
    ctx.drawImage(img, (img.width - vw) / 2, (img.height - vh) / 2, vw, vh, 0, 0, vw, vh);
    return U.canvasToBlob(c, 'image/png');
  }

  /* ---------- Guardado de emergencia (helpers) ---------- */

  // La capa de trazos se guarda en PNG (sin pérdida, como pide el contrato) y con la densidad nativa
  // de la pantalla (hasta 3×, el tope de U.dpr): al retomar se dibuja 1:1, sin recodificar con pérdida
  // ni reescalar, así el centro casi blanco de los tubos no se ablanda con cada sesión.
  const PAINT_TYPE = 'image/png';
  const RESCUE_MAX = 4.2e6; // caracteres: localStorage deja ~5 millones por origen

  /* Guardados que siguen corriendo después de salir de la pantalla (la navegación no los espera).
     Si mientras tanto la página se cierra o pasa a segundo plano, se terminan en el momento. */
  const background = new Set();
  let backgroundIdle = Promise.resolve();
  function flushBackground() {
    for (const job of background) { try { job.flush(); } catch (e) { console.warn('neón: guardado de fondo', e); } }
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushBackground(); });
  window.addEventListener('pagehide', flushBackground);
  document.addEventListener('freeze', flushBackground);

  /** dataURL -> Blob, sincrónico (para guardar al cerrar sin esperar a toBlob). */
  function dataUrlBlob(url) {
    const i = url.indexOf(',');
    const type = url.slice(5, url.indexOf(';'));
    const bin = atob(url.slice(i + 1));
    const a = new Uint8Array(bin.length);
    for (let k = 0; k < bin.length; k++) a[k] = bin.charCodeAt(k);
    return new Blob([a], { type });
  }

  /** Conexión propia a la base (la del núcleo no expone commit()): con ella una escritura que
      arranca al cerrar la página llega al disco. Sólo se abre si la base ya existe. */
  function openOwnDb() {
    return new Promise((resolve) => {
      let q;
      try { q = indexedDB.open('colorinche'); } catch (e) { resolve(null); return; }
      q.onupgradeneeded = () => { try { q.transaction.abort(); } catch (e) { /* nada */ } };
      q.onsuccess = () => {
        const d = q.result;
        if (!d.objectStoreNames.contains('works')) { d.close(); resolve(null); return; }
        d.onversionchange = () => { d.close(); d.__closed = true; };
        resolve(d);
      };
      q.onerror = () => resolve(null);
      q.onblocked = () => resolve(null);
    });
  }

  /* Copia de rescate: al cerrar la página, una escritura en IndexedDB con imágenes grandes puede no
     llegar (el navegador corta antes de pasar los datos). Por eso el guardado de emergencia deja
     también una copia sincrónica en localStorage, que se pasa a la base en el próximo arranque. */
  const RESCUE_DATA = 'colorinche.neonRescate';
  const RESCUE_INFO = 'colorinche.neonRescate.info'; // "<id>|<updatedAt>" (chiquito, para no leer lo grande)

  function rescueWrite(rec, paintUrl, thumbUrl) {
    try {
      const base = Object.assign({}, rec);
      delete base.paint; delete base.thumb;
      localStorage.setItem(RESCUE_DATA, JSON.stringify({ rec: base, paint: paintUrl, thumb: thumbUrl }));
      localStorage.setItem(RESCUE_INFO, rec.id + '|' + rec.updatedAt);
      return true;
    } catch (e) {
      rescueClear();
      return false;
    }
  }

  /** Quita la copia de rescate (toda, o sólo si es de la obra `id` y no más nueva que `at`). */
  function rescueClear(id, at) {
    try {
      if (id != null) {
        const info = localStorage.getItem(RESCUE_INFO);
        if (!info) return;
        const [rid, rat] = info.split('|');
        if (rid !== id || (at != null && +rat > at)) return;
      }
      localStorage.removeItem(RESCUE_DATA);
      localStorage.removeItem(RESCUE_INFO);
    } catch (e) { /* nada */ }
  }

  let rescuing = null;
  /** Si quedó una copia de rescate más nueva que lo que hay en la base, la guarda. */
  function recoverRescue() {
    if (rescuing) return rescuing;
    rescuing = (async () => {
      let raw = null;
      try { raw = localStorage.getItem(RESCUE_INFO) && localStorage.getItem(RESCUE_DATA); } catch (e) { return; }
      if (!raw) { rescueClear(); return; }
      try {
        const data = JSON.parse(raw);
        const cur = await CL.db.works.get(data.rec.id);
        if (!cur || (cur.updatedAt || 0) < data.rec.updatedAt) {
          await CL.db.works.save(Object.assign({}, data.rec, {
            paint: dataUrlBlob(data.paint), thumb: dataUrlBlob(data.thumb),
          }));
        }
      } catch (e) {
        console.warn('neón: no se pudo recuperar la copia de rescate', e);
      }
      rescueClear();
    })();
    return rescuing;
  }
  // Apenas arranca la app (así la galería ya ve lo último aunque no se entre al neón).
  recoverRescue();

  /** ¿La imagen guardada tiene algo visible? (una obra vacía se guarda como 1×1 transparente). */
  function hasPixels(img) {
    if (img.width <= 1 && img.height <= 1) return false;
    const k = Math.min(1, 160 / Math.max(img.width, img.height));
    const c = U.canvas(img.width * k, img.height * k);
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0, c.width, c.height);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 1) return true;
    return false;
  }

  /* ---------- Pantalla ---------- */

  function createScreen(root, workId) {
    let alive = true;
    let ready = false;
    let finishing = false;

    // Estado de la obra
    let work = null;          // registro guardado (o null si todavía no se guardó nada)
    let status = 'progress';
    let hasInk = false;
    let seq = 0;              // cantidad de cambios hechos
    let writtenSeq = 0;       // último cambio ya mandado a la base
    let saving = Promise.resolve();
    let idb = null;           // conexión propia (guardado al cerrar)
    let inkBox = null;        // caja con tinta, en px del lienzo { x0, y0, x1, y1 }
    const viewU = { w: 0, h: 0 }; // unión de las vistas (px CSS) donde se dibujó

    // Preferencias
    let colorId = U.pref.get('neon.color', 'rosa');
    if (!COLORS.some((c) => c.id === colorId)) colorId = 'rosa';
    let sizeIdx = U.clamp(U.pref.get('neon.size', 1) | 0, 0, SIZES.length - 1);
    let mirrorN = U.pref.get('neon.mirror', 0);
    if (!MIRRORS.some((m) => m.n === mirrorN)) mirrorN = 0;
    let rainbowHue = Math.random() * 360;

    // Escala de los grosores según la pantalla (en un celular los trazos son un poco más finos).
    const scr = Math.min(screen.width || 800, screen.height || 800);
    const sizeScale = U.clamp(scr / 760, 0.66, 1.1);

    /* --- DOM --- */
    const clearBtn = CL.ui.holdButton({
      icon: 'trash', label: 'Borrar todo (mantené apretado)', cls: 'neon-clear', onConfirm: clearAll,
    });
    const doneBtn = CL.ui.button({
      icon: 'check', label: '¡Terminé!', text: '¡Terminé!', cls: 'btn-go neon-done', sound: null, onTap: finish,
    });
    const actions = el('div.neon-actions', null, [clearBtn, doneBtn]);
    const topbar = el('header.topbar.neon-top', null, [
      CL.ui.homeButton(), CL.ui.modeTabs('neon'), el('div.spacer'), CL.ui.muteButton(), actions,
    ]);

    // Colores
    const swatches = new Map();
    const colorsPanel = el('div.neon-panel.neon-colors', { role: 'radiogroup', 'aria-label': 'Colores' });
    for (const c of COLORS) {
      const b = CL.ui.button({
        label: c.label, cls: 'neon-swatch' + (c.hex ? '' : ' neon-swatch--rainbow'), sound: 'select',
        onTap: () => setColor(c.id),
      });
      b.setAttribute('role', 'radio');
      if (c.hex) b.style.setProperty('--c', c.hex);
      b.append(el('span.neon-dot', { 'aria-hidden': 'true' }));
      swatches.set(c.id, b);
      colorsPanel.append(b);
    }

    // Grosores
    const sizeBtns = [];
    const sizesBox = el('div.neon-sizes', { role: 'radiogroup', 'aria-label': 'Grosor' });
    SIZES.forEach((s, i) => {
      const b = CL.ui.button({ label: s.label, cls: 'neon-size', sound: 'select', soundOpts: { pitch: 1.25 - i * 0.12 }, onTap: () => setSize(i) });
      b.setAttribute('role', 'radio');
      b.append(el('span.neon-dot', { 'aria-hidden': 'true', style: { width: s.dot + '%', height: s.dot + '%' } }));
      sizeBtns.push(b);
      sizesBox.append(b);
    });

    // Espejos
    const mirrorBtns = new Map();
    const mirrorsBox = el('div.neon-mirrors', { role: 'radiogroup', 'aria-label': 'Espejo mágico' });
    for (const m of MIRRORS) {
      const b = CL.ui.button({ icon: 'neonMirror' + m.n, label: m.label, cls: 'neon-mirror', sound: 'select', onTap: () => setMirror(m.n) });
      b.setAttribute('role', 'radio');
      mirrorBtns.set(m.n, b);
      mirrorsBox.append(b);
    }
    const actionsSlot = el('div.neon-actions-slot');
    const toolsPanel = el('div.neon-panel.neon-tools', null, [sizesBox, mirrorsBox, actionsSlot]);
    const doneSlot = el('div.neon-done-slot');

    // Pizarra
    let paint = el('canvas.neon-paint', { 'aria-hidden': 'true' });
    let ctx = null;
    const fx = el('canvas.neon-fx', { 'aria-hidden': 'true' });
    const fxCtx = fx.getContext('2d');
    const guide = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    guide.setAttribute('class', 'neon-guide');
    guide.setAttribute('aria-hidden', 'true');
    const hint = el('div.neon-hint', { 'aria-hidden': 'true' }, CL.icon('hand'));
    const stage = el('div.neon-stage', { role: 'img', 'aria-label': 'Pizarra de neón: dibujá con el dedo' }, [paint, fx, guide, hint]);
    CL.ui.noGestures(stage);

    root.append(topbar, el('div.neon-body', null, [colorsPanel, doneSlot, stage, toolsPanel]));

    // En celular vertical arriba no entran: "borrar" baja a la fila de los grosores y "¡Terminé!" va al
    // lado de los colores, lejos de los espejos (un toque ahí termina la obra).
    const narrowMq = window.matchMedia('(orientation: portrait) and (max-width: 560px)');
    const placeActions = () => {
      const narrow = narrowMq.matches;
      if (narrow) {
        if (clearBtn.parentNode !== actionsSlot) actionsSlot.append(clearBtn);
        if (doneBtn.parentNode !== doneSlot) doneSlot.append(doneBtn);
      } else {
        if (clearBtn.parentNode !== actions || doneBtn.parentNode !== actions) actions.append(clearBtn, doneBtn);
      }
      root.classList.toggle('neon-narrow', narrow);
    };
    placeActions();
    narrowMq.addEventListener ? narrowMq.addEventListener('change', placeActions) : narrowMq.addListener(placeActions);

    /* --- Geometría --- */
    let stageW = 0, stageH = 0;    // px CSS
    let S = 0;                      // lado del lienzo cuadrado (px CSS)
    let dpr = U.dpr();
    let offX = 0, offY = 0;         // posición del lienzo dentro de la pizarra (px CSS, ≤ 0)
    let minS = 0;                   // lado mínimo (para no recortar una obra hecha en otra pantalla)

    function newPaintCanvas(w, h) {
      const c = el('canvas.neon-paint', { 'aria-hidden': 'true' });
      c.width = w; c.height = h;
      return c;
    }

    function setupCtx() {
      ctx = paint.getContext('2d');
      ctx.globalCompositeOperation = 'lighter';
      ctx.imageSmoothingEnabled = true;
    }

    function placePaint(c) {
      Object.assign(c.style, { width: S + 'px', height: S + 'px', left: offX + 'px', top: offY + 'px' });
    }

    /** Agranda (o cambia de densidad) el lienzo sin perder lo dibujado: lo viejo queda centrado. */
    function resizeDoc(newS, newDpr) {
      const old = ctx ? paint : null;
      const oldDpr = dpr;
      const c = newPaintCanvas(Math.round(newS * newDpr), Math.round(newS * newDpr));
      if (old) {
        const k = newDpr / oldDpr;
        const w = old.width * k, h = old.height * k;
        const ox = (c.width - w) / 2, oy = (c.height - h) / 2;
        const g = c.getContext('2d');
        g.imageSmoothingQuality = 'high';
        g.drawImage(old, ox, oy, w, h);
        if (inkBox) inkBox = { x0: inkBox.x0 * k + ox, y0: inkBox.y0 * k + oy, x1: inkBox.x1 * k + ox, y1: inkBox.y1 * k + oy };
      }
      paint.replaceWith(c);
      paint = c;
      S = newS;
      dpr = newDpr;
      setupCtx();
    }

    function layout() {
      if (!alive) return;
      const W = stage.clientWidth, H = stage.clientHeight;
      if (!W || !H) return;
      const d = U.dpr();
      const need = Math.ceil(Math.max(W, H, minS));
      const grow = !ctx || need > S || d !== dpr;
      const nS = grow ? Math.max(need, S) : S;
      const nOffX = (W - nS) / 2, nOffY = (H - nS) / 2;
      // Si cambia la geometría con dedos apoyados, los trazos siguen desde donde esté cada dedo.
      const moved = ctx && strokes.size && (grow || nOffX !== offX || nOffY !== offY);
      if (moved) detachStrokes();
      stageW = W; stageH = H;
      if (grow) resizeDoc(nS, d);
      offX = nOffX; offY = nOffY;
      placePaint(paint);
      const fw = Math.round(W * dpr), fh = Math.round(H * dpr);
      if (fx.width !== fw || fx.height !== fh) { fx.width = fw; fx.height = fh; }
      if (moved) {
        for (const st of strokes.values()) { st.cx = st.cy = (S * dpr) / 2; setSigmas(st, null); }
      }
      drawGuide();
    }

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => layout()) : null;
    if (ro) ro.observe(stage);
    const onWinResize = () => layout();
    window.addEventListener('resize', onWinResize);

    /* --- Guía de ejes --- */
    function drawGuide() {
      const W = stageW, H = stageH;
      guide.setAttribute('viewBox', `0 0 ${W} ${H}`);
      guide.setAttribute('width', W);
      guide.setAttribute('height', H);
      if (!mirrorN) { guide.innerHTML = ''; stage.classList.remove('neon-mirrored'); return; }
      const cx = W / 2, cy = H / 2, L = Math.hypot(W, H);
      let s = '';
      for (const a of mirrorAxes(mirrorN)) {
        const r = (a * Math.PI) / 180, dx = Math.cos(r) * L, dy = Math.sin(r) * L;
        s += `<line x1="${(cx - dx).toFixed(1)}" y1="${(cy - dy).toFixed(1)}" x2="${(cx + dx).toFixed(1)}" y2="${(cy + dy).toFixed(1)}"/>`;
      }
      s += `<circle cx="${cx}" cy="${cy}" r="7"/>`;
      guide.innerHTML = s;
      stage.classList.add('neon-mirrored');
    }

    /* --- Selección --- */
    function currentRgb() {
      const c = COLORS.find((x) => x.id === colorId);
      return c && c.hex ? hexRgb(c.hex) : null;
    }
    function syncUI() {
      for (const [id, b] of swatches) {
        const on = id === colorId;
        b.classList.toggle('active', on);
        b.setAttribute('aria-checked', String(on));
      }
      sizeBtns.forEach((b, i) => { b.classList.toggle('active', i === sizeIdx); b.setAttribute('aria-checked', String(i === sizeIdx)); });
      for (const [n, b] of mirrorBtns) { b.classList.toggle('active', n === mirrorN); b.setAttribute('aria-checked', String(n === mirrorN)); }
      const c = COLORS.find((x) => x.id === colorId);
      root.classList.toggle('neon-rainbow', !c.hex);
      if (c.hex) root.style.setProperty('--neon-c', c.hex);
    }
    function setColor(id) { colorId = id; U.pref.set('neon.color', id); syncUI(); }
    function setSize(i) { sizeIdx = i; U.pref.set('neon.size', i); syncUI(); }
    function setMirror(n) {
      mirrorN = n; U.pref.set('neon.mirror', n); syncUI(); drawGuide();
      if (n) { guide.classList.remove('pulse'); void guide.getBoundingClientRect(); guide.classList.add('pulse'); }
    }
    syncUI();

    /* --- Trazos --- */
    const strokes = new Map(); // pointerId -> estado del trazo
    let hum = null;
    let fxRaf = 0;

    function toDoc(ev, r) {
      const kx = stageW / (r.width || 1), ky = stageH / (r.height || 1);
      const x = (ev.clientX - r.left) * kx, y = (ev.clientY - r.top) * ky;
      return { x: (x - offX) * dpr, y: (y - offY) * dpr, cx: x, cy: y };
    }

    /** σ de cada capa en px del lienzo (con presión del lápiz). */
    function setSigmas(st, ev) {
      if (st.pen && ev) st.pk = 0.55 + 0.9 * U.clamp(U.pressure(ev), 0, 1);
      const base = SIZES[st.size].c * sizeScale * dpr * st.pk;
      for (let L = 0; L < LAYERS.length; L++) st.sig[L] = base * LAYERS[L].k;
    }

    /** Un sello de la capa L en (x, y) (px del lienzo) y en todas sus copias de espejo.
        g = contexto destino (el lienzo o la capa de efectos, corrida en ox, oy). */
    function stampTo(g, st, L, x, y, dist, ox, oy) {
      const rgb = st.rgb || hueRgb(st.hue0 + (dist / dpr) * HUE_PER_PX);
      const r = st.sig[L] * 3;
      const spr = sprite(rgb, L, spriteRes(r * 2));
      const cx = st.cx, cy = st.cy, dx = x - cx, dy = y - cy;
      const xf = st.xf;
      const onPaint = g === ctx;
      for (let i = 0; i < xf.length; i++) {
        const m = xf[i];
        const px = cx + m[0] * dx + m[1] * dy, py = cy + m[2] * dx + m[3] * dy;
        g.drawImage(spr, ox + px - r, oy + py - r, r * 2, r * 2);
        if (onPaint) {
          // Caja con tinta (para guardar sólo lo necesario).
          if (!inkBox) inkBox = { x0: px - r, y0: py - r, x1: px + r, y1: py + r };
          else {
            if (px - r < inkBox.x0) inkBox.x0 = px - r;
            if (py - r < inkBox.y0) inkBox.y0 = py - r;
            if (px + r > inkBox.x1) inkBox.x1 = px + r;
            if (py + r > inkBox.y1) inkBox.y1 = py + r;
          }
        }
      }
      if (onPaint) hasInk = true;
    }
    const stampAt = (st, L, x, y, dist) => stampTo(ctx, st, L, x, y, dist, 0, 0);

    /** Recorre un segmento recto dejando sellos de halo y tubo a distancia fija; el centro se anota
        en la cola del trazo y se estampa después (coreUpTo). */
    function segment(st, ax, ay, bx, by) {
      const len = Math.hypot(bx - ax, by - ay);
      if (len < 1e-6) return;
      const ux = (bx - ax) / len, uy = (by - ay) / len;
      for (let L = 0; L < CORE; L++) {
        const gap = Math.max(0.6, st.sig[L] * LAYERS[L].gap);
        let d = st.rem[L];
        if (d <= len) ctx.globalCompositeOperation = LAYERS[L].op;
        while (d <= len) {
          stampAt(st, L, ax + ux * d, ay + uy * d, st.dist + d);
          d += gap;
        }
        st.rem[L] = d - len;
      }
      st.dist += len;
      st.q.push({ x: bx, y: by, d: st.dist });
      coreUpTo(st, st.dist - st.sig[1] * CORE_LAG);
    }

    /** Estampa el centro del trazo hasta la distancia `limit` del recorrido (en el lienzo), o sólo lo
        dibuja en la capa de efectos (preview = true) sin consumir la cola. */
    function coreUpTo(st, limit, preview) {
      const q = st.q;
      if (!q.length) return;
      const last = q[q.length - 1].d;
      const gap = Math.max(0.6, st.sig[CORE] * LAYERS[CORE].gap);
      let d = st.cd, i = 0;
      const lim = Math.min(limit, last);
      if (d > lim) return;
      const g = preview ? fxCtx : ctx;
      const ox = preview ? offX * dpr : 0, oy = preview ? offY * dpr : 0;
      g.globalCompositeOperation = 'lighter';
      while (d <= lim) {
        while (i < q.length - 1 && q[i + 1].d < d) i++;
        const a = q[i], b = q[Math.min(i + 1, q.length - 1)];
        const t = b.d > a.d ? U.clamp((d - a.d) / (b.d - a.d), 0, 1) : 0;
        stampTo(g, st, CORE, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, d, ox, oy);
        d += gap;
      }
      if (preview) return;
      st.cd = d;
      if (i > 0) q.splice(0, i);
    }

    /** Curva cuadrática (suavizado por puntos medios) partida en tramos cortos. */
    function quad(st, x0, y0, qx, qy, x1, y1) {
      const approx = Math.hypot(qx - x0, qy - y0) + Math.hypot(x1 - qx, y1 - qy);
      const n = Math.max(1, Math.min(64, Math.ceil(approx / (3 * dpr))));
      let px = x0, py = y0;
      for (let i = 1; i <= n; i++) {
        const t = i / n, u = 1 - t;
        const x = u * u * x0 + 2 * u * t * qx + t * t * x1;
        const y = u * u * y0 + 2 * u * t * qy + t * t * y1;
        segment(st, px, py, x, y);
        px = x; py = y;
      }
    }

    function moveTo(st, x, y) {
      const mx = (st.px + x) / 2, my = (st.py + y) / 2;
      quad(st, st.mx, st.my, st.px, st.py, mx, my);
      st.mx = mx; st.my = my; st.px = x; st.py = y;
    }

    /** (Re)arranca el trazo en el punto p: halo y tubo estampan ya; el centro, un poquito después. */
    function startAt(st, p) {
      st.px = st.mx = p.x; st.py = st.my = p.y;
      st.q = [{ x: p.x, y: p.y, d: st.dist }];
      st.cd = st.dist;
      for (let L = 0; L < CORE; L++) {
        ctx.globalCompositeOperation = LAYERS[L].op;
        stampAt(st, L, p.x, p.y, st.dist);
        st.rem[L] = Math.max(0.6, st.sig[L] * LAYERS[L].gap);
      }
    }

    function stopHum() {
      if (hum) { hum.stop(); hum = null; }
    }

    function begin(ev) {
      // Nada de trazos nuevos mientras la pantalla se cierra (el dedo podría quedar apoyado cuando la
      // sección sale del documento y el zumbido quedaría sonando para siempre).
      if (!alive || !ready || finishing) return;
      if (ev.pointerType === 'mouse' && ev.button !== 0) return;
      if (strokes.has(ev.pointerId) || strokes.size >= MAX_POINTERS) return;
      ev.preventDefault();
      try { stage.setPointerCapture(ev.pointerId); } catch (e) { /* nada */ }
      const r = stage.getBoundingClientRect();
      const p = toDoc(ev, r);
      const st = {
        id: ev.pointerId,
        rgb: currentRgb(),
        hue0: (rainbowHue + FINGER_HUE * strokes.size) % 360,
        size: sizeIdx,
        pen: ev.pointerType === 'pen',
        pk: 1,
        sig: [0, 0, 0],
        rem: [0, 0, 0],
        dist: 0,
        q: [], cd: 0,
        px: p.x, py: p.y, mx: p.x, my: p.y,
        cx: (S * dpr) / 2, cy: (S * dpr) / 2,
        xf: transforms(mirrorN),
        restart: false,
        t: performance.now(), sx: p.cx, sy: p.cy, speed: 0,
        tipX: p.cx, tipY: p.cy,
      };
      setSigmas(st, ev);
      startAt(st, p);
      strokes.set(ev.pointerId, st);
      // La miniatura y la descarga muestran todo lo que se vio mientras se dibujaba.
      viewU.w = Math.max(viewU.w, stageW);
      viewU.h = Math.max(viewU.h, stageH);
      hint.classList.add('hide');
      if (strokes.size === 1) {
        CL.sound.play('neonOn', { pitch: 0.9 + Math.random() * 0.25 });
        stopHum();
        hum = CL.sound.loop('neonHum', { vol: 0.06 });
      }
      startFx();
    }

    function move(ev) {
      const st = strokes.get(ev.pointerId);
      if (!st) return;
      ev.preventDefault();
      const r = stage.getBoundingClientRect();
      const list = ev.getCoalescedEvents ? ev.getCoalescedEvents() : null;
      const evs = list && list.length ? list : [ev];
      for (const e of evs) {
        const p = toDoc(e, r);
        if (st.pen) setSigmas(st, e);
        if (st.restart) { st.restart = false; startAt(st, p); } else moveTo(st, p.x, p.y);
        st.tipX = p.cx; st.tipY = p.cy;
      }
      // Velocidad (px CSS/ms) para el sonido.
      const now = performance.now();
      const dt = Math.max(1, now - st.t);
      const v = Math.hypot(st.tipX - st.sx, st.tipY - st.sy) / dt;
      st.speed = st.speed * 0.6 + v * 0.4;
      st.t = now; st.sx = st.tipX; st.sy = st.tipY;
      if (hum) {
        let sp = 0;
        for (const s of strokes.values()) sp = Math.max(sp, s.speed);
        hum.update({ speed: sp });
      }
    }

    /** Termina lo pendiente de un trazo en el lienzo actual (tramo final + centro atrasado). */
    function settleStroke(st) {
      if (st.restart) return;
      segment(st, st.mx, st.my, st.px, st.py);
      coreUpTo(st, Infinity);
    }

    function finishStroke(st) {
      settleStroke(st);
      // Un toque sin mover deja un puntito tan brillante como una línea.
      if (!st.restart && st.dist < st.sig[CORE] * 2) {
        for (let L = 0; L < LAYERS.length; L++) {
          ctx.globalCompositeOperation = LAYERS[L].op;
          stampAt(st, L, st.px, st.py, st.dist);
        }
      }
      if (!st.rgb) {
        // El tono sigue desde donde terminó el trazo; un toque salta a otro color (si no, al puntear
        // todos los puntitos salen iguales).
        const tap = st.dist < st.sig[CORE] * 2;
        rainbowHue = (st.hue0 + (st.dist / dpr) * HUE_PER_PX + (tap ? TAP_HUE : 0)) % 360;
      }
    }

    /** Los dedos siguen apoyados pero cambia el lienzo (giro, borrar todo): cierra lo dibujado y
        el trazo vuelve a arrancar en el próximo movimiento, sin una línea que salte. */
    function detachStrokes() {
      for (const st of strokes.values()) { settleStroke(st); st.restart = true; }
    }

    function end(ev) {
      const st = strokes.get(ev.pointerId);
      if (!st) return;
      strokes.delete(ev.pointerId);
      try { stage.releasePointerCapture(ev.pointerId); } catch (e) { /* nada */ }
      finishStroke(st);
      afterStrokes();
    }

    function endAllStrokes() {
      if (!strokes.size) return;
      for (const st of strokes.values()) { if (ctx) finishStroke(st); }
      strokes.clear();
      afterStrokes();
    }

    function afterStrokes() {
      if (strokes.size === 0) stopHum();
      changed();
    }

    stage.addEventListener('pointerdown', begin);
    stage.addEventListener('pointermove', move);
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);
    stage.addEventListener('lostpointercapture', end);

    /* --- Punta encendida (capa de efectos, sólo mientras se dibuja) --- */
    function startFx() {
      if (!fxRaf) fxRaf = requestAnimationFrame(fxFrame);
    }
    function fxFrame(now) {
      fxRaf = 0;
      if (!alive) return;
      fxCtx.setTransform(1, 0, 0, 1, 0, 0);
      fxCtx.clearRect(0, 0, fx.width, fx.height);
      if (!strokes.size) return;
      // Del lienzo (px) a la capa de efectos (px): sólo cambia el origen.
      const ox = offX * dpr, oy = offY * dpr;
      for (const st of strokes.values()) {
        if (st.restart) continue;
        const rgb = st.rgb || hueRgb(st.hue0 + (st.dist / dpr) * HUE_PER_PX);
        const cx = st.cx, cy = st.cy;
        const put = (spr, x, y, r) => {
          const dx = x - cx, dy = y - cy;
          for (const m of st.xf) {
            fxCtx.drawImage(spr, ox + cx + m[0] * dx + m[1] * dy - r, oy + cy + m[2] * dx + m[3] * dy - r, r * 2, r * 2);
          }
        };
        // Tramo que todavía no se estampó (el suavizado va medio paso atrás del dedo)...
        fxCtx.globalCompositeOperation = 'source-over';
        const len = Math.hypot(st.px - st.mx, st.py - st.my);
        {
          const L = 1;
          const r = st.sig[L] * 3, gap = Math.max(0.6, st.sig[L] * LAYERS[L].gap);
          const spr = sprite(rgb, L, spriteRes(r * 2));
          for (let d = st.rem[L]; d <= len; d += gap) {
            const t = len ? d / len : 0;
            put(spr, st.mx + (st.px - st.mx) * t, st.my + (st.py - st.my) * t, r);
          }
        }
        // ...y el centro que va atrasado, más su tramo final.
        coreUpTo(st, Infinity, true);
        fxCtx.globalCompositeOperation = 'lighter';
        {
          const r = st.sig[CORE] * 3, gap = Math.max(0.6, st.sig[CORE] * LAYERS[CORE].gap);
          const spr = sprite(rgb, CORE, spriteRes(r * 2));
          for (let d = gap; d <= len; d += gap) {
            const t = d / len;
            put(spr, st.mx + (st.px - st.mx) * t, st.my + (st.py - st.my) * t, r);
          }
        }
        // Punta encendida que titila.
        const flick = 0.85 + 0.15 * Math.sin(now / 40 + st.id * 1.7);
        const rt = st.sig[1] * 3 * 1.5 * flick;
        put(sprite(rgb, 1, spriteRes(rt * 2)), st.px, st.py, rt);
        const rc = st.sig[CORE] * 3 * 1.9 * flick;
        const core = sprite(rgb, CORE, spriteRes(rc * 2));
        put(core, st.px, st.py, rc);
        put(core, st.px, st.py, rc * 0.7);
      }
      fxRaf = requestAnimationFrame(fxFrame);
    }

    /* --- Guardado --- */

    /** Rectángulo (px del lienzo) de la unión de las vistas donde se dibujó. */
    function viewCrop() {
      const uw = viewU.w || stageW, uh = viewU.h || stageH;
      const vw = Math.max(1, Math.min(paint.width, Math.round(uw * dpr)));
      const vh = Math.max(1, Math.min(paint.height, Math.round(uh * dpr)));
      return { sx: (paint.width - vw) / 2, sy: (paint.height - vh) / 2, vw, vh };
    }

    function makeThumb() {
      const { sx, sy, vw, vh } = viewCrop();
      const k = Math.min(1, 480 / Math.max(vw, vh));
      const c = U.canvas(Math.max(1, Math.round(vw * k)), Math.max(1, Math.round(vh * k)));
      const g = c.getContext('2d');
      drawBackground(g, c.width, c.height);
      g.imageSmoothingQuality = 'high';
      g.drawImage(paint, sx, sy, vw, vh, 0, 0, c.width, c.height);
      return c;
    }

    /** Copia (sincrónica) de lo que hay que guardar: la caja con tinta (a la densidad del lienzo, 1:1)
        y la miniatura. */
    function snapshot() {
      const ss = dpr;
      const k = 1;
      let x0 = 0, y0 = 0, x1 = 1, y1 = 1;
      if (inkBox) {
        x0 = U.clamp(Math.floor(inkBox.x0), 0, paint.width);
        y0 = U.clamp(Math.floor(inkBox.y0), 0, paint.height);
        x1 = U.clamp(Math.ceil(inkBox.x1), 0, paint.width);
        y1 = U.clamp(Math.ceil(inkBox.y1), 0, paint.height);
        if (x1 <= x0 || y1 <= y0) { x0 = y0 = 0; x1 = y1 = 1; }
      }
      const w = Math.max(1, Math.round((x1 - x0) * k)), h = Math.max(1, Math.round((y1 - y0) * k));
      const pc = U.canvas(w, h);
      if (inkBox) {
        const g = pc.getContext('2d');
        g.imageSmoothingQuality = 'high';
        g.drawImage(paint, x0, y0, x1 - x0, y1 - y0, 0, 0, w, h);
      }
      return {
        paint: pc,
        thumb: makeThumb(),
        meta: {
          v: 2, scale: ss, dpr: ss,
          box: { x: (x0 - paint.width / 2) / dpr, y: (y0 - paint.height / 2) / dpr },
          view: { w: Math.round(viewU.w || stageW), h: Math.round(viewU.h || stageH) },
        },
      };
    }

    function buildRecord(snap, paintBlob, thumbBlob) {
      const now = Date.now();
      if (!work) work = { id: U.uid(), createdAt: now };
      const meta = Object.assign({}, work.meta, snap.meta);
      delete meta.css;
      return Object.assign({}, work, {
        kind: 'neon', source: 'neon', status, w: snap.paint.width, h: snap.paint.height,
        paint: paintBlob, thumb: thumbBlob, meta, updatedAt: now, createdAt: work.createdAt || now,
      });
    }

    /** Escribe la obra. Con la conexión propia la transacción se confirma en el momento (commit),
        así llega al disco aunque la página se esté cerrando. */
    function putWork(rec) {
      if (idb && !idb.__closed) {
        try {
          const tx = idb.transaction('works', 'readwrite');
          tx.objectStore('works').put(rec);
          if (tx.commit) tx.commit();
          return new Promise((resolve, reject) => {
            tx.oncomplete = () => {
              rescueClear(rec.id, rec.updatedAt);
              try { CL.db.events.emit('change', { store: 'works', id: rec.id }); } catch (e) { /* nada */ }
              resolve(rec);
            };
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error || new Error('Transacción abortada'));
          });
        } catch (e) { /* conexión cerrada: se usa la del núcleo */ }
      }
      return CL.db.works.save(rec).then((w) => { rescueClear(rec.id, rec.updatedAt); return w; });
    }

    /** Si la obra abierta no es la de la URL (se borró o se creó otra), se corrige la URL sin
        volver a montar la pantalla: al recargar se abre lo que el chico está viendo. */
    function fixHash() {
      if (!alive || !CL.router.current || CL.router.current.name !== 'neon') return;
      const want = work && status === 'done' ? '#neon/' + work.id : '#neon';
      const h = location.hash;
      if (h === want || (work && h === '#neon/' + work.id)) return;
      if (!/^#neon(\/|$)/.test(h)) return;
      try { history.replaceState(history.state, '', want); } catch (e) { /* nada */ }
    }

    const pending = () => seq > writtenSeq;

    /** Codifica y escribe (asincrónico). `pre` = foto ya sacada (al salir de la pantalla). */
    async function doSave(pre) {
      if (!ctx || !pending()) return;
      const my = seq;
      if (!hasInk && !work) { writtenSeq = my; return; }
      const snap = pre || snapshot();
      let paintBlob, thumbBlob;
      try {
        [paintBlob, thumbBlob] = await Promise.all([
          U.canvasToBlob(snap.paint, PAINT_TYPE),
          U.canvasToBlob(snap.thumb, 'image/jpeg', 0.88),
        ]);
      } catch (e) {
        console.warn('neón: no se pudo codificar', e);
        return;
      }
      if (my <= writtenSeq) return; // mientras tanto se guardó algo más nuevo (o se borró todo)
      writtenSeq = my;
      const rec = buildRecord(snap, paintBlob, thumbBlob);
      work = rec;
      fixHash();
      // Mientras la escritura no se confirme, un cierre de página la puede cortar: rescueInflight()
      // deja entonces la copia de rescate a partir de esta misma foto.
      const job = { rec, snap };
      inflight = job;
      try {
        await putWork(rec);
      } catch (e) {
        console.warn('neón: no se pudo guardar', e);
        if (writtenSeq === my) writtenSeq = my - 1;
      }
      if (inflight === job) inflight = null;
    }

    let inflight = null; // última escritura en camino { rec, snap }

    /** Copia de rescate sincrónica de la escritura en camino (si la hay). */
    function rescueInflight() {
      const job = inflight;
      if (!job) return;
      inflight = null;
      try {
        const u = rescueUrls(job.snap);
        rescueWrite(job.rec, u.paint, u.thumb);
      } catch (e) { console.warn('neón: copia de rescate', e); }
    }

    /** Codificación sincrónica de una foto. png = lo que va a la base; paint = lo que va a la copia de
        rescate (localStorage, ~5 MB): el PNG si entra, si no WebP de máxima calidad (sólo respaldo). */
    function rescueUrls(snap) {
      const png = snap.paint.toDataURL(PAINT_TYPE);
      let paintUrl = png;
      if (png.length > RESCUE_MAX) {
        try {
          const w = snap.paint.toDataURL('image/webp', 1);
          if (w.startsWith('data:image/webp')) paintUrl = w;
        } catch (e) { /* sin WebP: queda el PNG (si no entra, no hay copia de rescate) */ }
      }
      return { png, paint: paintUrl, thumb: snap.thumb.toDataURL('image/jpeg', 0.88) };
    }

    /** Guardado inmediato y sincrónico (al cerrar o pasar a segundo plano). `pre` = foto ya sacada. */
    function saveSync(pre) {
      if (!ctx || !pending()) { rescueInflight(); return true; }
      const my = seq;
      if (!hasInk && !work) { writtenSeq = my; return true; }
      try {
        const snap = pre || snapshot();
        const u = rescueUrls(snap);
        const rec = buildRecord(snap, dataUrlBlob(u.png), dataUrlBlob(u.thumb));
        const rescued = rescueWrite(rec, u.paint, u.thumb);
        if (!rescued && (!idb || idb.__closed)) return false;
        writtenSeq = my;
        work = rec;
        fixHash();
        putWork(rec).catch((e) => {
          console.warn('neón: no se pudo guardar', e);
          if (writtenSeq === my) writtenSeq = my - 1;
        });
        return true;
      } catch (e) {
        console.warn('neón: guardado inmediato falló', e);
        return false;
      }
    }

    function saveNow() {
      saveSoon.cancel();
      const run = () => doSave(); // (sin pasarle el resultado del guardado anterior como si fuera una foto)
      saving = saving.then(run, run);
      return saving;
    }

    // Autoguardado apenas se suelta el último dedo (sin interrumpir si hay dedos dibujando).
    const saveSoon = U.debounce(() => {
      if (!alive) return;
      if (strokes.size) return; // se vuelve a pedir al soltar el último dedo
      saveNow();
    }, 200);

    function changed() {
      seq++;
      saveSoon();
    }

    const onFreeze = () => flush();
    document.addEventListener('freeze', onFreeze);

    function flush() {
      if (!alive) return saving;
      saveSoon.cancel();
      if (saveSync()) return saving;
      return saveNow();
    }

    /* --- Borrar todo: se limpia en el acto; los tubos viejos parpadean y se apagan encima --- */
    /** Escribe la foto `snap` en la obra `base` tal cual (sin tocar la obra abierta). */
    async function saveInto(base, snap) {
      const [paintBlob, thumbBlob] = await Promise.all([
        U.canvasToBlob(snap.paint, PAINT_TYPE),
        U.canvasToBlob(snap.thumb, 'image/jpeg', 0.88),
      ]);
      await putWork(Object.assign({}, base, {
        w: snap.paint.width, h: snap.paint.height, paint: paintBlob, thumb: thumbBlob,
        meta: Object.assign({}, base.meta, snap.meta), updatedAt: Date.now(),
      }));
    }

    function clearAll() {
      if (finishing || !ready) return;
      detachStrokes(); // si hay dedos apoyados, siguen dibujando en la pizarra limpia
      // Obra terminada con cambios todavía sin escribir: se guardan en ella antes de desprenderla.
      const keep = work && status === 'done' && hasInk && (pending() || strokes.size)
        ? { base: work, snap: snapshot() } : null;
      CL.sound.play('neonOff');
      // El lienzo viejo queda como "fantasma" que se apaga (sólo visual) y se pone uno nuevo arriba.
      const ghost = paint;
      const c = newPaintCanvas(ghost.width, ghost.height);
      ghost.after(c);
      paint = c;
      placePaint(paint);
      setupCtx();
      ghost.classList.add('neon-ghost');
      stage.classList.add('neon-clearing');
      const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      setTimeout(() => {
        ghost.remove();
        if (!stage.querySelector('.neon-ghost')) stage.classList.remove('neon-clearing');
      }, reduced ? 450 : 1100);

      inkBox = null;
      hasInk = false;
      viewU.w = viewU.h = 0;
      if (!strokes.size) hint.classList.remove('hide');
      saveSoon.cancel();
      seq++;
      writtenSeq = seq; // nada pendiente: lo que estuviera codificándose ya no se escribe
      if (work && status === 'progress') {
        // Una obra en progreso que queda vacía no sirve: se quita de la galería.
        const old = work;
        work = null;
        rescueClear(old.id);
        saving = saving.then(() => CL.db.works.del(old.id)).catch((e) => console.warn(e));
      } else if (work) {
        // Obra terminada: queda intacta en la galería y lo que se dibuje ahora es una obra nueva
        // (un chico que borra todo quiere empezar otro dibujo, no perder el que terminó).
        work = null;
        status = 'progress';
        if (keep) {
          const f = () => saveInto(keep.base, keep.snap);
          saving = saving.then(f, f).catch((e) => console.warn('neón: no se pudo guardar', e));
        }
      }
      fixHash();
    }

    /* --- ¡Terminé! --- */
    async function finish() {
      if (finishing || !ready) return;
      if (!hasInk) {
        CL.sound.play('nope');
        doneBtn.classList.remove('neon-shake');
        void doneBtn.offsetWidth;
        doneBtn.classList.add('neon-shake');
        return;
      }
      finishing = true;
      endAllStrokes();
      status = 'done';
      seq++;
      // El festejo arranca ya; el guardado corre mientras tanto.
      const party = CL.ui.celebrate();
      await saveNow();
      await party;
      if (!alive) return;
      if (!work || !work.id || pending()) { finishing = false; status = 'progress'; CL.sound.play('nope'); return; }
      // "Atrás" desde la galería abre una pizarra en blanco (no la obra terminada para seguir editándola).
      try { history.replaceState(history.state, '', '#neon'); } catch (e) { /* nada */ }
      CL.router.go('obras/' + work.id);
    }

    /* --- Carga --- */
    async function load() {
      layout();
      await recoverRescue();
      // Si recién se salió del neón y su último guardado sigue en camino, esperarlo (si no, esta
      // pantalla no vería el progreso y empezaría otra obra).
      await Promise.race([backgroundIdle, U.sleep(4000)]);
      if (!alive) return;
      let w = null;
      try {
        if (workId) {
          w = await CL.db.works.get(workId);
          if (w && w.kind !== 'neon') w = null;
        }
        // Id que no existe (p. ej. se borró): se retoma el progreso, como en #neon.
        if (!w) w = await CL.db.works.findProgress('neon', 'neon');
      } catch (e) {
        console.warn('neón: no se pudo leer la obra', e);
        w = null;
      }
      if (!alive) return;
      if (w && w.paint) {
        try {
          const img = await U.blobToImage(w.paint);
          if (!alive) return;
          const m = w.meta || {};
          const ink = hasPixels(img);
          if (!ink) {
            // Obra guardada vacía (1×1 o sin nada visible): se sigue en ella, pero no hay tinta.
          } else if (m.v === 2 && m.box) {
            const s = m.scale || 1;
            const bw = img.width / s, bh = img.height / s;
            minS = Math.ceil(2 * Math.max(Math.abs(m.box.x), Math.abs(m.box.x + bw), Math.abs(m.box.y), Math.abs(m.box.y + bh)));
            layout();
            let x = paint.width / 2 + m.box.x * dpr, y = paint.height / 2 + m.box.y * dpr;
            const dw = bw * dpr, dh = bh * dpr;
            // Misma densidad: posición entera y tamaño 1:1, así no se reinterpola nada.
            if (Math.abs(s - dpr) < 1e-6) { x = Math.round(x); y = Math.round(y); }
            ctx.save();
            ctx.globalCompositeOperation = 'source-over';
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, x, y, dw, dh);
            ctx.restore();
            inkBox = { x0: x, y0: y, x1: x + dw, y1: y + dh };
          } else {
            const sd = m.dpr || dpr;
            minS = Math.ceil(img.width / sd);
            layout();
            const k = dpr / sd;
            const dw = img.width * k, dh = img.height * k;
            const x = (paint.width - dw) / 2, y = (paint.height - dh) / 2;
            ctx.save();
            ctx.globalCompositeOperation = 'source-over';
            ctx.drawImage(img, x, y, dw, dh);
            ctx.restore();
            inkBox = { x0: x, y0: y, x1: x + dw, y1: y + dh };
          }
          if (m.view && ink) { viewU.w = m.view.w || 0; viewU.h = m.view.h || 0; }
          work = w;
          status = w.status || 'progress';
          hasInk = ink;
          if (ink) hint.classList.add('hide');
        } catch (e) {
          console.warn('neón: imagen dañada', e);
        }
      }
      fixHash();
      idb = await openOwnDb();
      if (!alive && idb) { idb.close(); idb = null; }
      if (!alive) return;
      ready = true;
      root.classList.add('neon-ready');
    }
    load();

    return {
      unmount() {
        alive = false;
        endAllStrokes();
        stopHum();
        cancelAnimationFrame(fxRaf);
        if (ro) ro.disconnect();
        window.removeEventListener('resize', onWinResize);
        document.removeEventListener('freeze', onFreeze);
        narrowMq.removeEventListener ? narrowMq.removeEventListener('change', placeActions) : narrowMq.removeListener(placeActions);
        saveSoon.cancel();
        // Foto sincrónica ahora; codificar y escribir sigue en segundo plano (la navegación no espera).
        const snap = ctx && pending() && (hasInk || work) ? snapshot() : null;
        const job = { flush: () => saveSync(snap) }; // (si ya no hay nada pendiente, rescata lo que está en camino)
        const save = () => doSave(snap);
        const done = saving.then(save, save)
          .catch((e) => console.warn('neón: no se pudo guardar', e))
          .then(() => {
            background.delete(job);
            stopHum();
            if (idb) { idb.close(); idb = null; }
          });
        saving = done;
        background.add(job);
        backgroundIdle = Promise.all([backgroundIdle, done]).then(() => undefined);
        return null;
      },
      flush,
      // Para pruebas.
      get state() {
        return { ready, hasInk, pending: pending(), status, workId: work && work.id, S, dpr, stageW, stageH, view: Object.assign({}, viewU), mirrorN, colorId, sizeIdx, strokes: strokes.size };
      },
    };
  }

  let current = null;
  CL.router.register('neon', {
    mount(root, args) { current = createScreen(root, args[0] || null); },
    unmount() { const c = current; current = null; return c ? c.unmount() : null; },
    flush() { return current ? current.flush() : null; },
  });

  CL.neon = {
    COLORS, SIZES, MIRRORS,
    exportPNG,
    drawBackground,
    /** Estado de la pantalla abierta (para pruebas). */
    get debug() { return current ? current.state : null; },
  };
})(window.CL);
