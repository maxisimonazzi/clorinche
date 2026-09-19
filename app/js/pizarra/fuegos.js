/* Colorinche — modo fuegos artificiales (ruta 'fuegos'). No guarda obras.

   Cada trazo es una MECHA de color. Apenas se apoya el dedo se prende una chispa en el
   inicio que avanza por el recorrido a velocidad constante, comiéndose la mecha y largando
   chispitas naranjas. Si alcanza al dedo, lo espera. Cuando el dedo se levantó y la chispa
   llega al final, explota un fuego artificial (varios tipos al azar).

   Capas: cielo estático (se dibuja sólo al redimensionar) + canvas de efectos que se limpia
   cada cuadro. Partículas con sprites pre-renderizados y composición 'lighter'.
   Depuración: CL.fuegos._debug.explode(x, y, tipo), .state(), .timeScale(v), .clear(). */
'use strict';
(function (CL) {
  const U = CL.util;
  const el = U.el;

  /* ---------- Parámetros ---------- */
  const SPEED = 340;          // velocidad de la chispa (px CSS por segundo)
  // Al soltar un garabato muy largo la chispa puede apurarse un poco, pero de a poco (RAMP s) y
  // sin pasar de FAST_MAX veces la velocidad normal; sólo los garabatos enormes (más de TAIL_LONG s
  // de espera aun así) aceleran más, para que el chico no espere una eternidad.
  const TAIL_MAX = 4;
  const TAIL_LONG = 10;
  const FAST_MAX = 2.5;
  const RAMP = 0.6;
  const MAX_PARTS = 3000;     // límite de partículas vivas
  const MAX_FINGERS = 10;     // dedos dibujando a la vez
  const MAX_FUSES = 14;       // mechas vivas (con las soltadas): si se pasa, la más vieja explota ya
  const FX_DPR_MAX = 2;       // resolución del canvas de efectos (el cielo usa el dpr completo)
  const HIST = 7;             // puntos de estela larga por partícula
  const FUSE_W = [24, 18, 13, 9, 5, 2.4]; // anchos de las pasadas de la mecha (halo -> centro)
  const IDLE_MS = 55;         // escena vacía: se redibuja a ~18 fps (el titilar no necesita más)
  const COLOR_KEY = 'colorinche.fuegos.color'; // color elegido: sólo dura la sesión

  // Colores de mecha a elección (brillantes).
  const COLORS = [
    { id: 'rojo', name: 'Rojo', hex: '#ff4d6d' },
    { id: 'naranja', name: 'Naranja', hex: '#ff9a2e' },
    { id: 'amarillo', name: 'Amarillo', hex: '#ffe14d' },
    { id: 'verde', name: 'Verde', hex: '#5dff8f' },
    { id: 'celeste', name: 'Celeste', hex: '#4de1ff' },
    { id: 'azul', name: 'Azul', hex: '#7088ff' },
    { id: 'violeta', name: 'Violeta', hex: '#c07bff' },
    { id: 'rosa', name: 'Rosa', hex: '#ff6fd8' },
  ];
  // Paleta interna de partículas: los 8 colores + extras.
  const PAL = COLORS.map((c) => c.hex).concat(['#ffc94d', '#fff4d6', '#ff8a24', '#ffd27a']);
  const C_ROJO = 0, C_AMARILLO = 2, C_ROSA = 7;
  const C_GOLD = 8, C_WHITE = 9, C_SPARK = 10, C_SPARK2 = 11;
  const N_COLORS = COLORS.length;

  // Formas de partícula.
  const DOT = 0, STAR = 1, HEART = 2;
  // Niveles de alfa para las estelas (se agrupan por color y nivel: pocas llamadas a stroke()).
  const ALPHAS = [0.12, 0.26, 0.45, 0.7];

  const TYPES = ['peonia', 'anillo', 'corazon', 'estrella', 'sauce', 'crisantemo', 'crossette', 'confites', 'carita'];

  /* ---------- Íconos propios ---------- */
  CL.icons.add({
    fwDado: `<rect x="8" y="8" width="32" height="32" rx="8" fill="#fff" ${CL.icons.STROKE} transform="rotate(-8 24 24)"/>
      <g transform="rotate(-8 24 24)"><circle cx="16.5" cy="16.5" r="3.4" fill="#ff4d6d"/><circle cx="31.5" cy="16.5" r="3.4" fill="#4dc3ff"/>
      <circle cx="24" cy="24" r="3.4" fill="#ffc21a"/><circle cx="16.5" cy="31.5" r="3.4" fill="#2bc48a"/><circle cx="31.5" cy="31.5" r="3.4" fill="#b06bff"/></g>`,
  });

  /* ---------- Sonidos (suaves; respetan el silencio global) ---------- */
  CL.sound.define('fwLight', (s) => {
    s.noise({ dur: 0.16, attack: 0.01, vol: 0.05, type: 'highpass', freq: 2600, to: 5200, q: 0.7 });
    s.tone({ freq: 1500, to: 2300, attack: 0.004, decay: 0.05, vol: 0.025 });
  });

  /* Crepitar continuo mientras arden mechas. Un solo loop para todas: update({ n, wait })
     sube la densidad de clics sin saturar (crece con la raíz de la cantidad). */
  CL.sound.defineLoop('fwMecha', (s) => {
    const ac = s.ac;
    const bus = ac.createGain();
    bus.gain.value = 0.0001;
    bus.connect(s.out);
    bus.gain.setTargetAtTime(1, ac.currentTime, 0.03);
    // Siseo de fondo: ruido filtrado agudo, muy bajito.
    const src = ac.createBufferSource();
    src.buffer = s.noiseBuffer();
    src.loop = true;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 4200;
    bp.Q.value = 0.6;
    const hiss = ac.createGain();
    hiss.gain.value = 0;
    src.connect(bp); bp.connect(hiss); hiss.connect(bus);
    src.start(0, Math.random() * 1.5);
    let n = 1, wait = 0, stopped = false;
    const TICK = 0.04;
    // Clics al azar (el "crac-crac" de la mecha), agendados de a ventanas cortas.
    const timer = setInterval(() => {
      if (stopped) return;
      const m = Math.min(n, 6);
      const rate = 20 * Math.pow(m, 0.55) + wait * 8;
      const k = rate * TICK;
      const cnt = Math.floor(k) + (Math.random() < k % 1 ? 1 : 0);
      const vs = 1 / Math.pow(m, 0.3);
      for (let i = 0; i < cnt; i++) {
        s.noise({
          at: Math.random() * TICK, dur: 0.006 + Math.random() * 0.018, attack: 0.001,
          vol: (0.045 + Math.random() * 0.075) * vs, type: 'bandpass',
          freq: 1800 + Math.random() * 5200, q: 1.2 + Math.random() * 2, dest: bus,
        });
      }
    }, TICK * 1000);
    const setHiss = () => hiss.gain.setTargetAtTime(0.032 * Math.min(1.6, Math.pow(n, 0.35)), ac.currentTime, 0.08);
    setHiss();
    return {
      update(p = {}) {
        if (stopped) return;
        if (p.n != null) n = Math.max(1, p.n);
        if (p.wait != null) wait = p.wait;
        setHiss();
      },
      stop() {
        if (stopped) return;
        stopped = true;
        clearInterval(timer);
        bus.gain.setTargetAtTime(0.0001, ac.currentTime, 0.05);
        try { src.stop(ac.currentTime + 0.4); } catch (e) { /* ya detenido */ }
        setTimeout(() => { try { bus.disconnect(); } catch (e) { /* nada */ } }, 700);
      },
    };
  });

  /* Explosión: "bum" + cola distinta según el tipo.
     Armar el sonido nodo por nodo en el momento cuesta hasta ~11 ms (el crisantemo tiene 24
     chasquidos), así que cada tipo se sintetiza UNA vez con OfflineAudioContext en un momento
     libre y después cada explosión es un solo BufferSource. Mientras no esté listo (o si el
     navegador no tiene OfflineAudioContext) suena una versión liviana con el golpe solo.

     El golpe tiene tres capas: sub-grave (se siente en auriculares y compus), un "pum" de cuerpo
     en 90–700 Hz (lo que sí reproducen los parlantitos de celulares y tablets) y ruido grave. */
  const BOOM_SR = 44100;
  const BOOM_DUR = { sauce: 2.7, crisantemo: 1.8, confites: 1.4, anillo: 1.3, crossette: 1.1 };
  const boomBufs = Object.create(null); // tipo -> AudioBuffer
  let boomQueue = null;                  // tipos pendientes de sintetizar
  let noiseShared = null;

  // Mini sintetizador equivalente al del núcleo, pero sobre cualquier contexto (el offline).
  function offSynth(oc) {
    const out = oc.createGain();
    out.connect(oc.destination);
    if (!noiseShared) {
      noiseShared = oc.createBuffer(1, BOOM_SR * 2, BOOM_SR);
      const d = noiseShared.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const env = (g, t, a, d, peak) => {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    };
    return {
      tone({ freq = 440, to = null, type = 'sine', at = 0, attack = 0.005, decay = 0.18, vol = 0.25 } = {}) {
        const o = oc.createOscillator(), g = oc.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, at);
        if (to) o.frequency.exponentialRampToValueAtTime(to, at + attack + decay);
        env(g, at, attack, decay, vol);
        o.connect(g); g.connect(out);
        o.start(at); o.stop(at + attack + decay + 0.05);
      },
      noise({ at = 0, dur = 0.2, attack = 0.005, vol = 0.2, type = 'bandpass', freq = 1500, to = null, q = 1 } = {}) {
        const src = oc.createBufferSource(), f = oc.createBiquadFilter(), g = oc.createGain();
        src.buffer = noiseShared;
        src.loop = true;
        f.type = type;
        f.frequency.setValueAtTime(freq, at);
        if (to) f.frequency.exponentialRampToValueAtTime(to, at + dur);
        f.Q.value = q;
        env(g, at, attack, Math.max(0.01, dur - attack), vol);
        src.connect(f); f.connect(g); g.connect(out);
        src.start(at, Math.random() * 1.5); src.stop(at + dur + 0.05);
      },
    };
  }

  // El golpe común a todos los tipos.
  function boomCore(s) {
    s.tone({ freq: 108, to: 44, attack: 0.004, decay: 0.4, vol: 0.09 });                      // sub-grave
    s.tone({ freq: 270, to: 95, type: 'triangle', attack: 0.003, decay: 0.2, vol: 0.27 });   // cuerpo "pum"
    s.tone({ freq: 540, to: 190, attack: 0.002, decay: 0.11, vol: 0.07 });                   // presencia
    s.noise({ dur: 0.28, attack: 0.002, vol: 0.25, type: 'bandpass', freq: 820, to: 260, q: 0.8 });
    s.noise({ dur: 0.45, attack: 0.004, vol: 0.06, type: 'lowpass', freq: 1300, to: 110, q: 0.7 });
  }

  // Cola distinta según el tipo (chasquidos, campanitas, siseo...).
  function boomTail(s, type) {
    const R = Math.random;
    const crack = (n, t0, spread, vol, f0 = 2400, f1 = 7000) => {
      for (let i = 0; i < n; i++) {
        s.noise({
          at: t0 + Math.pow(R(), 0.8) * spread, dur: 0.008 + R() * 0.02, attack: 0.001,
          vol: vol * (0.4 + R() * 0.6), type: 'bandpass', freq: f0 + R() * (f1 - f0), q: 1.5,
        });
      }
    };
    switch (type) {
      case 'anillo':
        s.tone({ freq: 1320, at: 0.07, attack: 0.006, decay: 0.55, vol: 0.035 });
        crack(5, 0.3, 0.6, 0.04);
        break;
      case 'corazon':
        [784, 988, 1175].forEach((f, i) =>
          s.tone({ freq: f, at: 0.1 + i * 0.08, attack: 0.008, decay: 0.35, vol: 0.035, type: 'triangle' }));
        break;
      case 'estrella':
        for (let i = 0; i < 5; i++) s.tone({ freq: 1800 + R() * 1800, at: 0.1 + i * 0.07, attack: 0.003, decay: 0.14, vol: 0.03 });
        break;
      case 'sauce':
        s.noise({ at: 0.1, dur: 1.9, attack: 0.35, vol: 0.045, type: 'highpass', freq: 4200, to: 2000, q: 0.6 });
        crack(10, 0.5, 1.8, 0.028);
        break;
      case 'crisantemo':
        crack(24, 0.3, 1.2, 0.045);
        break;
      case 'crossette':
        for (let i = 0; i < 6; i++) {
          const t = 0.5 + R() * 0.14;
          s.tone({ freq: 260 + R() * 200, to: 800, at: t, attack: 0.003, decay: 0.06, vol: 0.06 });
          s.noise({ at: t, dur: 0.05, vol: 0.04, type: 'bandpass', freq: 1600, q: 1 });
        }
        break;
      case 'confites':
        for (let i = 0; i < 6; i++) s.tone({ freq: 2000 + R() * 1400, at: 0.2 + i * 0.1, attack: 0.004, decay: 0.12, vol: 0.025 });
        crack(5, 0.3, 0.8, 0.03);
        break;
      case 'carita':
        s.tone({ freq: 520, to: 880, at: 0.12, attack: 0.01, decay: 0.24, vol: 0.045, type: 'triangle' });
        s.tone({ freq: 660, to: 1100, at: 0.32, attack: 0.01, decay: 0.26, vol: 0.04, type: 'triangle' });
        break;
      default: // peonia
        crack(9, 0.25, 0.8, 0.045);
    }
  }

  // Sintetiza un tipo (una sola vez) en un búfer.
  function renderBoom(type) {
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OAC || boomBufs[type]) return;
    const dur = BOOM_DUR[type] || 1.25;
    let oc;
    try { oc = new OAC(1, Math.ceil(dur * BOOM_SR), BOOM_SR); } catch (e) { return; }
    const s = offSynth(oc);
    boomCore(s);
    boomTail(s, type);
    const p = oc.startRendering();
    if (p && p.then) p.then((buf) => { boomBufs[type] = buf; }, () => {});
    else oc.oncomplete = (ev) => { boomBufs[type] = ev.renderedBuffer; }; // Safari viejo
  }

  // Prepara los sonidos de a uno, en momentos libres (no mientras se dibuja).
  const idle = window.requestIdleCallback
    ? (fn) => window.requestIdleCallback(fn, { timeout: 600 })
    : (fn) => setTimeout(fn, 60);
  function prepareBooms(types) {
    if (CL.sound.isMuted()) return; // con el sonido apagado no hace falta (se prepara al activarlo)
    if (boomQueue) return;
    boomQueue = types.filter((t) => !boomBufs[t]);
    const next = () => {
      const t = boomQueue.shift();
      if (t) renderBoom(t);
      if (boomQueue.length) idle(next); else boomQueue = null;
    };
    if (boomQueue.length) idle(next); else boomQueue = null;
  }

  CL.sound.define('fwBoom', (s, o) => {
    const ac = s.ac;
    const v = o.vol == null ? 1 : o.vol;
    const buf = boomBufs[o.type];
    const g = ac.createGain();
    g.gain.value = v;
    const dest = g;
    let pn = null;
    if (o.pan && ac.createStereoPanner) {
      // Un poquito hacia el lado donde explota.
      pn = ac.createStereoPanner();
      pn.pan.value = U.clamp(o.pan, -1, 1);
      g.connect(pn);
      pn.connect(s.out);
    } else {
      g.connect(s.out);
    }
    const release = () => { try { g.disconnect(); if (pn) pn.disconnect(); } catch (e) { /* nada */ } };
    if (buf) {
      const src = ac.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = o.pitch || 1;
      src.connect(dest);
      src.start();
      src.onended = release;
      return;
    }
    // Todavía no está listo: golpe liviano (pocos nodos) y se encarga el búfer.
    const p = o.pitch || 1;
    s.tone({ freq: 108 * p, to: 44 * p, attack: 0.004, decay: 0.4, vol: 0.09, dest });
    s.tone({ freq: 270 * p, to: 95 * p, type: 'triangle', attack: 0.003, decay: 0.2, vol: 0.27, dest });
    s.noise({ dur: 0.28, attack: 0.002, vol: 0.25, type: 'bandpass', freq: 820 * p, to: 260 * p, q: 0.8, dest });
    setTimeout(release, 1200);
    prepareBooms(TYPES);
  });

  /* ---------- Sprites pre-renderizados (se crean una vez) ---------- */
  const SPR = 64;
  const spriteCache = [[], [], []];
  let sparkSprite = null;

  const rgba = (hex, a) => {
    const [r, g, b] = U.hexToRgb(hex);
    return `rgba(${r},${g},${b},${a})`;
  };

  function starPath(g, cx, cy, r, inner = 0.45, rot = -Math.PI / 2) {
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 ? r * inner : r;
      const a = rot + (i * Math.PI) / 5;
      g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    g.closePath();
  }

  function heartPath(g, cx, cy, r) {
    g.beginPath();
    g.moveTo(cx, cy + r * 0.9);
    g.bezierCurveTo(cx - r * 1.35, cy + r * 0.05, cx - r * 0.95, cy - r * 1.05, cx, cy - r * 0.4);
    g.bezierCurveTo(cx + r * 0.95, cy - r * 1.05, cx + r * 1.35, cy + r * 0.05, cx, cy + r * 0.9);
    g.closePath();
  }

  function makeSprite(shape, hex) {
    const c = U.canvas(SPR, SPR);
    const g = c.getContext('2d');
    const m = SPR / 2;
    const light = U.mix(hex, '#ffffff', shape === DOT ? 0.55 : 0.28);
    if (shape === DOT) {
      // Halo difuso con centro casi blanco.
      const gr = g.createRadialGradient(m, m, 0, m, m, m);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.12, 'rgba(255,255,255,0.95)');
      gr.addColorStop(0.24, rgba(light, 0.95));
      gr.addColorStop(0.42, rgba(hex, 0.55));
      gr.addColorStop(0.7, rgba(hex, 0.14));
      gr.addColorStop(1, rgba(hex, 0));
      g.fillStyle = gr;
      g.fillRect(0, 0, SPR, SPR);
      return c;
    }
    const gr = g.createRadialGradient(m, m, 0, m, m, m);
    gr.addColorStop(0, rgba(hex, 0.55));
    gr.addColorStop(0.45, rgba(hex, 0.2));
    gr.addColorStop(1, rgba(hex, 0));
    g.fillStyle = gr;
    g.fillRect(0, 0, SPR, SPR);
    const r = SPR * 0.27;
    if (shape === STAR) starPath(g, m, m + 1, r);
    else heartPath(g, m, m, r * 0.95);
    g.fillStyle = light;
    g.fill();
    if (shape === STAR) starPath(g, m, m + 1, r * 0.5);
    else heartPath(g, m, m, r * 0.48);
    g.fillStyle = 'rgba(255,255,255,0.92)';
    g.fill();
    return c;
  }

  function sprite(shape, ci) {
    const row = spriteCache[shape];
    return row[ci] || (row[ci] = makeSprite(shape, PAL[ci]));
  }

  function getSparkSprite() {
    if (sparkSprite) return sparkSprite;
    const c = U.canvas(SPR, SPR);
    const g = c.getContext('2d');
    const m = SPR / 2;
    const gr = g.createRadialGradient(m, m, 0, m, m, m);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.14, 'rgba(255,255,235,1)');
    gr.addColorStop(0.28, 'rgba(255,236,150,0.85)');
    gr.addColorStop(0.5, 'rgba(255,170,60,0.35)');
    gr.addColorStop(1, 'rgba(255,120,30,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, SPR, SPR);
    sparkSprite = c;
    return c;
  }

  // Colores de estela precalculados por nivel de alfa.
  const TRAIL_STYLE = PAL.map((hex) => ALPHAS.map((a) => rgba(U.mix(hex, '#ffffff', 0.25), a)));

  /* ---------- Generador pseudoaleatorio con semilla (cielo estable al redimensionar) ---------- */
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- Cielo nocturno (estático) ---------- */
  function drawSky(cv, W, H, dpr) {
    cv.width = Math.max(1, Math.round(W * dpr));
    cv.height = Math.max(1, Math.round(H * dpr));
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Degradé azul muy oscuro -> violeta.
    const lg = g.createLinearGradient(0, 0, 0, H);
    lg.addColorStop(0, '#04061c');
    lg.addColorStop(0.42, '#0f0d3a');
    lg.addColorStop(0.72, '#291a5c');
    lg.addColorStop(1, '#5b2b82');
    g.fillStyle = lg;
    g.fillRect(0, 0, W, H);
    // Resplandor suave en el horizonte.
    const hg = g.createRadialGradient(W / 2, H * 1.05, 0, W / 2, H * 1.05, Math.max(W, H) * 0.6);
    hg.addColorStop(0, 'rgba(255,120,200,0.22)');
    hg.addColorStop(1, 'rgba(255,120,200,0)');
    g.fillStyle = hg;
    g.fillRect(0, 0, W, H);

    // Estrellitas fijas (las que titilan se dibujan en el canvas de efectos).
    const r = rng(20260927);
    const count = Math.round(U.clamp((W * H) / 4200, 50, 420));
    const twinklers = [];
    for (let i = 0; i < count; i++) {
      const x = r() * W;
      const y = Math.pow(r(), 1.5) * H * 0.86;
      const size = 0.5 + r() * r() * 1.4;
      const a = (0.35 + r() * 0.6) * (1 - (y / H) * 0.6);
      if (r() < 0.22) {
        twinklers.push({ x, y, s: 5 + size * 5, ph: r() * 6.28, w: 1.2 + r() * 2.2 });
        continue;
      }
      g.fillStyle = r() < 0.2 ? `rgba(200,220,255,${a})` : `rgba(255,255,255,${a})`;
      g.beginPath();
      g.arc(x, y, size, 0, 6.2832);
      g.fill();
      if (size > 1.45) {
        // Destello en cruz para las más grandes.
        g.strokeStyle = `rgba(255,255,255,${a * 0.5})`;
        g.lineWidth = 0.8;
        g.beginPath();
        g.moveTo(x - size * 4, y); g.lineTo(x + size * 4, y);
        g.moveTo(x, y - size * 4); g.lineTo(x, y + size * 4);
        g.stroke();
      }
    }

    // Luna en cuarto creciente.
    const mr = U.clamp(Math.min(W, H) * 0.045, 13, 34);
    const mx = W * 0.14 + mr, my = Math.max(H * 0.24, 70 + mr * 1.6);
    const mg = g.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 3.2);
    mg.addColorStop(0, 'rgba(255,240,190,0.22)');
    mg.addColorStop(1, 'rgba(255,240,190,0)');
    g.fillStyle = mg;
    g.fillRect(mx - mr * 3.2, my - mr * 3.2, mr * 6.4, mr * 6.4);
    const moon = U.canvas(mr * 2 * dpr + 4, mr * 2 * dpr + 4);
    const q = moon.getContext('2d');
    q.scale(dpr, dpr);
    q.fillStyle = '#fff3c8';
    q.beginPath(); q.arc(mr + 1, mr + 1, mr, 0, 6.2832); q.fill();
    q.globalCompositeOperation = 'destination-out';
    q.beginPath(); q.arc(mr + 1 + mr * 0.55, mr + 1 - mr * 0.3, mr * 0.88, 0, 6.2832); q.fill();
    g.drawImage(moon, mx - mr - 1, my - mr - 1, moon.width / dpr, moon.height / dpr);

    // Silueta de lomas y pueblito con ventanitas encendidas.
    const hh = U.clamp(H * 0.12, 44, 120);
    const base = H - hh;
    const rr = rng(77);
    g.fillStyle = '#1b1344';
    g.beginPath();
    g.moveTo(0, H);
    g.lineTo(0, base + hh * 0.25);
    const bumps = Math.max(3, Math.round(W / 320));
    for (let i = 0; i < bumps; i++) {
      const x0 = (i / bumps) * W, x1 = ((i + 1) / bumps) * W;
      const peak = base - hh * (0.05 + rr() * 0.25);
      g.quadraticCurveTo((x0 + x1) / 2, peak, x1, base + hh * (0.2 + rr() * 0.15));
    }
    g.lineTo(W, H);
    g.closePath();
    g.fill();

    // Casitas y edificios sobre la loma de adelante.
    const front = base + hh * 0.42;
    g.fillStyle = '#0b0820';
    const windows = [];
    let x = -10;
    const unit = U.clamp(hh * 0.3, 14, 32);
    while (x < W + 10) {
      const kind = rr();
      const w = unit * (kind < 0.35 ? 1.3 : kind < 0.7 ? 1.7 : 1.1);
      const h = unit * (kind < 0.35 ? 1.2 : kind < 0.7 ? 0.9 + rr() * 1.4 : 2 + rr() * 1.3);
      const top = front - h;
      g.beginPath();
      if (kind < 0.35) {
        // Casita con techo a dos aguas.
        g.moveTo(x, front + 4); g.lineTo(x, top); g.lineTo(x + w / 2, top - unit * 0.7);
        g.lineTo(x + w, top); g.lineTo(x + w, front + 4);
      } else {
        g.rect(x, top, w, h + 4);
      }
      g.fill();
      // Ventanitas
      const cols = Math.max(1, Math.floor(w / (unit * 0.55)));
      const rows = Math.max(1, Math.floor(h / (unit * 0.6)));
      for (let cx = 0; cx < cols; cx++) {
        for (let cy = 0; cy < rows; cy++) {
          if (rr() < 0.45) {
            const wx = x + (w / cols) * (cx + 0.5) - unit * 0.1;
            const wy = top + unit * 0.3 + cy * unit * 0.6;
            if (wy < front - unit * 0.2) windows.push([wx, wy, unit * 0.2, unit * 0.24]);
          }
        }
      }
      x += w + unit * (0.1 + rr() * 0.6);
      // Árbol redondito de vez en cuando.
      if (rr() < 0.35) {
        const tr = unit * 0.45;
        g.beginPath();
        g.arc(x + tr, front - tr * 1.2, tr, 0, 6.2832);
        g.rect(x + tr - 2, front - tr * 0.5, 4, tr);
        g.fill();
        x += tr * 2 + unit * 0.3;
      }
    }
    g.fillRect(0, front, W, H - front);
    g.fillStyle = 'rgba(255,214,120,0.75)';
    for (const [wx, wy, ww, wh] of windows) g.fillRect(wx, wy, ww, wh);
    return twinklers;
  }

  /* ---------- Partículas (pool con reciclado) ---------- */
  function Particle() {
    this.hist = new Float32Array(HIST * 2);
    this.reset();
  }
  Particle.prototype.reset = function () {
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0;
    this.age = 0; this.life = 1; this.k = 2.4; this.g = 70;
    this.c = 0; this.c2 = -1; this.cAt = 1;
    this.shape = DOT; this.size = 12;
    this.flick = 0; this.trail = 0; this.tl = 0.04;
    this.hn = 0; this.hi = 0; this.ht = 0; this.hdt = 0.045;
    this.split = 0; this.splitC = 0;
    this.rot = 0; this.vr = 0; this.sway = 0; this.ph = 0;
    this.flash = 0;
  };

  /* ---------- Pantalla ---------- */
  let inst = null; // instancia montada (para depuración)

  function mount(root) {
    const stage = el('div.fw-stage');
    const sky = el('canvas.fw-sky', { 'aria-hidden': 'true' });
    const fx = el('canvas.fw-fx', { role: 'img', 'aria-label': 'Cielo para dibujar fuegos artificiales' });
    stage.append(sky, fx);
    CL.ui.noGestures(stage);

    // Pista animada: una manito que dibuja una mecha y ¡pum!
    const hint = el('div.fw-hint', { 'aria-hidden': 'true' });
    hint.innerHTML =
      '<svg class="fw-hint-path" viewBox="0 0 240 150"><path d="M24 118C70 20 140 150 206 44" pathLength="100"/></svg>' +
      '<div class="fw-hint-boom"></div>';
    const hand = el('div.fw-hint-hand', null, CL.icon('hand'));
    hint.append(hand);

    // Selector de color de la mecha. Cada vez que se abre la app arranca "al azar": el color
    // elegido sólo se recuerda durante la sesión (un toque sin querer no lo deja fijo para siempre).
    const session = {
      get() { try { return sessionStorage.getItem(COLOR_KEY); } catch (e) { return null; } },
      set(v) { try { sessionStorage.setItem(COLOR_KEY, v); } catch (e) { /* sin almacenamiento */ } },
    };
    try { localStorage.removeItem(COLOR_KEY); } catch (e) { /* versión anterior lo guardaba para siempre */ }
    let colorSel = session.get() || 'azar';
    if (colorSel !== 'azar' && !COLORS.some((c) => c.id === colorSel)) colorSel = 'azar';
    const colors = el('div.fw-colors', { role: 'radiogroup', 'aria-label': 'Color de la mecha' });
    const swatches = [];
    const addSwatch = (id, label, node, hex) => {
      const b = CL.ui.button({
        label, cls: 'btn-sm fw-swatch' + (id === 'azar' ? ' fw-swatch--azar' : ''), sound: 'select',
        onTap: () => { colorSel = id; session.set(id); syncSwatches(); },
      });
      b.setAttribute('role', 'radio');
      b.dataset.color = id;
      if (hex) b.style.setProperty('--c', hex);
      b.append(node);
      swatches.push(b);
      colors.append(b);
    };
    addSwatch('azar', 'Color al azar', CL.icon('fwDado'), null);
    for (const c of COLORS) addSwatch(c.id, c.name, el('span.fw-dot'), c.hex);
    function syncSwatches() {
      for (const b of swatches) {
        const on = b.dataset.color === colorSel;
        b.classList.toggle('active', on);
        b.setAttribute('aria-checked', String(on));
      }
    }
    syncSwatches();

    const top = el('div.topbar.fw-top', null, [
      CL.ui.homeButton(), CL.ui.modeTabs('fuegos'), el('div.spacer'), CL.ui.muteButton(),
    ]);
    const muteBtn = top.lastChild;
    root.append(stage, hint, top);

    // El selector va dentro de la barra si entra; si no, flota abajo al centro (en dos filas si es angosto).
    // La media query es una primera aproximación; después se mide de verdad, porque los márgenes
    // seguros (muesca del iPhone apaisado) achican la barra sin cambiar el ancho de la ventana.
    const mq = window.matchMedia('(min-width: 940px), (min-width: 800px) and (max-height: 520px)');
    const placeColors = () => {
      let inTop = mq.matches;
      if (inTop) {
        if (colors.parentNode !== top) top.insertBefore(colors, muteBtn);
        colors.classList.remove('fw-colors--float');
        if (top.scrollWidth > top.clientWidth + 1) inTop = false; // no entra: a flotar
      }
      if (!inTop) {
        if (colors.parentNode !== root) root.append(colors);
        colors.classList.add('fw-colors--float');
      }
      measureBand();
    };
    const onMq = () => placeColors();
    if (mq.addEventListener) mq.addEventListener('change', onMq); else mq.addListener(onMq);

    /* ----- Estado ----- */
    const ctx = fx.getContext('2d');
    let W = 1, H = 1, fdpr = 1, fdprMax = 1, scale = 1;
    let twinklers = [];
    let skyDpr = 0; // dpr con el que se dibujó el cielo
    const parts = [];
    const free = [];
    const fuses = [];
    const byPointer = new Map();
    let running = false, raf = 0, last = 0, clock = 0, timeScale = 1;
    let quality = 1, frameEma = 16.7, resChanged = 0, lastRender = 0;
    // Intervalo "natural" entre cuadros de este equipo (aprendido con la escena vacía): así un
    // equipo que limita a 30 fps (ahorro de batería) no se confunde con uno sobrecargado.
    let baseInt = 16.7;
    const baseSamples = [];
    let lastColor = -1, lastType = '';
    let lastBurst = null; // [x, y, R] del último estallido (depuración)
    let crackle = null;
    const boomTimes = [];
    let hintShown = true;
    let destroyed = false;
    const buckets = new Array(PAL.length * ALPHAS.length).fill(null);
    let rect = null; // posición del canvas (para pasar coordenadas de puntero a px CSS locales)

    // Movimiento reducido: sin destellos blancos grandes ni titileo al azar.
    const rmq = window.matchMedia('(prefers-reduced-motion: reduce)');
    let calm = rmq.matches;
    const onRmq = () => { calm = rmq.matches; };
    if (rmq.addEventListener) rmq.addEventListener('change', onRmq); else rmq.addListener(onRmq);

    /* Franja de cielo libre (px CSS del escenario): entre el borde de abajo de la barra y el
       borde de arriba del selector flotante (o el borde de la pantalla). Las explosiones se
       ubican adentro para que no queden tapadas por los botones. */
    const band = { top: 0, bottom: 1 };
    // Con medidas de maquetado (offset*), que no cambian durante la animación de entrada (scale).
    function measureBand() {
      const h = stage.offsetHeight || H;
      band.top = U.clamp(top.offsetTop + top.offsetHeight - stage.offsetTop, 0, h * 0.4);
      band.bottom = colors.classList.contains('fw-colors--float')
        ? U.clamp(colors.offsetTop - stage.offsetTop, h * 0.6, h)
        : h;
    }

    function resize() {
      const w = stage.clientWidth, h = stage.clientHeight;
      if (!w || !h) return;
      const dpr = U.dpr();
      // Sin cambios de tamaño ni de dpr no hace falta redibujar el cielo (el ResizeObserver
      // avisa también al empezar a observar).
      if (w === W && h === H && dpr === skyDpr) return;
      // Al rotar o cambiar el tamaño, mechas y partículas se reubican sin deformarse.
      if (W > 1 && H > 1 && (w !== W || h !== H)) remap(w, h);
      W = w; H = h;
      const wasMax = fdpr >= fdprMax;
      fdprMax = Math.min(dpr, FX_DPR_MAX);
      if (wasMax || fdpr > fdprMax) fdpr = fdprMax;
      skyDpr = dpr;
      twinklers = drawSky(sky, W, H, dpr);
      setRes(fdpr);
      scale = U.clamp(Math.min(W, H) / 650, 0.62, 1.35);
      if (rect) rect = fx.getBoundingClientRect();
    }
    // Resolución del canvas de efectos (baja temporalmente si el equipo no da abasto).
    function setRes(v) {
      fdpr = v;
      resChanged = performance.now();
      lastRender = 0; // redibujar ya (cambiar el tamaño del canvas lo borra)
      fx.width = Math.round(W * fdpr);
      fx.height = Math.round(H * fdpr);
    }
    /* Reubica mechas y partículas en el nuevo tamaño con una escala UNIFORME alrededor del
       centro (al rotar el celular un estallido redondo sigue redondo, no se aplasta). */
    function remap(w, h) {
      const s = Math.min(w / W, h / H);
      const ox = W / 2, oy = H / 2, nx = w / 2, ny = h / 2;
      for (const f of fuses) {
        for (let i = 0; i < f.xs.length; i++) {
          f.xs[i] = nx + (f.xs[i] - ox) * s;
          f.ys[i] = ny + (f.ys[i] - oy) * s;
          f.ds[i] *= s;
        }
        f.sd *= s;
        f.len *= s;
        f.si = 0;
        sparkPos(f);
      }
      for (const p of parts) {
        p.x = nx + (p.x - ox) * s;
        p.y = ny + (p.y - oy) * s;
        p.vx *= s; p.vy *= s;
        for (let j = 0; j < HIST; j++) {
          p.hist[j * 2] = nx + (p.hist[j * 2] - ox) * s;
          p.hist[j * 2 + 1] = ny + (p.hist[j * 2 + 1] - oy) * s;
        }
      }
    }
    const ro = new ResizeObserver(() => { resize(); placeColors(); });
    ro.observe(stage);
    resize();
    placeColors();

    // Cambio de dpr sin cambio de tamaño (ventana que pasa a otro monitor): redibujar el cielo.
    let dprMq = null;
    const onDpr = () => { resize(); watchDpr(); };
    function watchDpr() {
      if (dprMq) { if (dprMq.removeEventListener) dprMq.removeEventListener('change', onDpr); else dprMq.removeListener(onDpr); }
      dprMq = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
      if (dprMq.addEventListener) dprMq.addEventListener('change', onDpr); else dprMq.addListener(onDpr);
    }
    watchDpr();

    /* ----- Partículas ----- */
    function spawn(x, y, vx, vy, life, c, shape, size) {
      if (parts.length >= MAX_PARTS) return null;
      const p = free.pop() || new Particle();
      p.reset();
      p.x = x; p.y = y; p.vx = vx; p.vy = vy;
      p.life = life; p.c = c; p.shape = shape; p.size = size;
      p.ph = Math.random() * 6.28;
      parts.push(p);
      return p;
    }

    // Presupuesto de partículas: baja si hay muchas vivas o si el equipo va lento.
    function budget(n) {
      const load = U.clamp(1.15 - parts.length / MAX_PARTS, 0.25, 1);
      return Math.max(8, Math.round(n * quality * load));
    }

    const otherColor = (c) => {
      let o;
      do { o = U.randInt(0, N_COLORS - 1); } while (o === c);
      return o;
    };

    // Dirección al azar sobre una esfera proyectada (bordes más densos, se ve "redonda").
    const sphere = () => {
      const a = Math.random() * Math.PI * 2;
      const u = Math.random() * 2 - 1;
      const m = Math.sqrt(1 - u * u);
      return [Math.cos(a) * m, Math.sin(a) * m];
    };

    const sizeK = () => Math.sqrt(scale);

    /* Recetas de explosión. R = radio aproximado del estallido (px CSS). */
    const RECIPES = {
      peonia(x, y, c1, R) {
        const c2 = otherColor(c1), n = budget(150), k = 2.4;
        for (let i = 0; i < n; i++) {
          const [ux, uy] = sphere();
          const v = R * k * U.rand(0.92, 1.05);
          const r = Math.random();
          const shape = r < 0.08 ? STAR : r < 0.14 ? HEART : DOT;
          const p = spawn(x, y, ux * v, uy * v, U.rand(1.3, 1.9), Math.random() < 0.68 ? c1 : c2, shape,
            (shape === DOT ? U.rand(15, 20) : U.rand(24, 30)) * sizeK());
          if (!p) break;
          p.k = k; p.g = 70; p.trail = 1; p.tl = 0.045; p.flick = 1;
        }
      },
      anillo(x, y, c1, R) {
        const c2 = otherColor(c1), n = budget(66), k = 2.4;
        const sy = U.rand(0.35, 1), rot = Math.random() * Math.PI;
        const cr = Math.cos(rot), sr = Math.sin(rot);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          const ux = Math.cos(a), uy = Math.sin(a) * sy;
          const v = R * k * 1.02;
          const p = spawn(x, y, (ux * cr - uy * sr) * v, (ux * sr + uy * cr) * v, U.rand(1.4, 1.7), c1, DOT, 18 * sizeK());
          if (!p) break;
          p.k = k; p.g = 55; p.trail = 1; p.tl = 0.05;
        }
        const m = budget(24);
        for (let i = 0; i < m; i++) {
          const [ux, uy] = sphere();
          const v = R * k * 0.35;
          const p = spawn(x, y, ux * v, uy * v, U.rand(1, 1.3), c2, i % 5 === 0 ? STAR : DOT, (i % 5 ? 15 : 24) * sizeK());
          if (!p) break;
          p.k = k; p.g = 55; p.flick = 1;
        }
      },
      corazon(x, y, c1, R) {
        const n = budget(76), k = 2.4, tilt = U.rand(-0.25, 0.25);
        const ct = Math.cos(tilt), st = Math.sin(tilt);
        const cols = [C_ROSA, C_ROJO, c1];
        for (let i = 0; i < n; i++) {
          const t = (i / n) * Math.PI * 2;
          const hx = 16 * Math.pow(Math.sin(t), 3) / 16;
          const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16;
          const vx = (hx * ct - hy * st) * R * k, vy = (hx * st + hy * ct) * R * k;
          const shape = i % 3 === 0 ? HEART : DOT;
          const p = spawn(x, y, vx, vy, U.rand(1.6, 1.9), cols[i % 3], shape, (shape === HEART ? 28 : 16) * sizeK());
          if (!p) break;
          p.k = k; p.g = 38; p.trail = 1; p.tl = 0.035;
        }
        for (let i = 0; i < budget(8); i++) {
          const [ux, uy] = sphere();
          const p = spawn(x, y, ux * R * 0.5, uy * R * 0.5, 1.2, C_WHITE, HEART, 18 * sizeK());
          if (!p) break;
          p.k = k; p.g = 38; p.flick = 1;
        }
      },
      estrella(x, y, c1, R) {
        const n = budget(90), k = 2.4, rot = -Math.PI / 2 + U.rand(-0.35, 0.35);
        const vs = [];
        for (let j = 0; j < 10; j++) {
          const rr = j % 2 ? 0.42 : 1.05;
          const a = rot + (j * Math.PI) / 5;
          vs.push([Math.cos(a) * rr, Math.sin(a) * rr]);
        }
        for (let i = 0; i < n; i++) {
          const f = (i / n) * 10;
          const j = Math.floor(f), t = f - j;
          const A = vs[j], B = vs[(j + 1) % 10];
          const ux = A[0] + (B[0] - A[0]) * t, uy = A[1] + (B[1] - A[1]) * t;
          const shape = i % 3 === 0 ? STAR : DOT;
          const p = spawn(x, y, ux * R * k, uy * R * k, U.rand(1.6, 1.9), i % 2 ? C_GOLD : c1, shape,
            (shape === STAR ? 28 : 16) * sizeK());
          if (!p) break;
          p.k = k; p.g = 40; p.trail = 1; p.tl = 0.035;
        }
      },
      sauce(x, y, c1, R) {
        // Sauce dorado: estelas largas que cuelgan.
        const n = budget(100), k = 2.2;
        for (let i = 0; i < n; i++) {
          const [ux, uy] = sphere();
          const v = R * k * 0.78 * U.rand(0.9, 1.05);
          const p = spawn(x, y, ux * v, uy * v, U.rand(2.4, 3.2), Math.random() < 0.8 ? C_GOLD : C_SPARK2, DOT, U.rand(12, 16) * sizeK());
          if (!p) break;
          p.k = k; p.g = 95; p.trail = 2; p.hdt = 0.11; p.flick = 1;
        }
        const extra = budget(10);
        for (let i = 0; i < extra; i++) {
          const [ux, uy] = sphere();
          const p = spawn(x, y, ux * R * 0.9, uy * R * 0.9, 1.4, c1, STAR, 20 * sizeK());
          if (!p) break;
          p.k = k; p.g = 60;
        }
      },
      crisantemo(x, y, c1, R) {
        // Crisantemo: estelas medianas y cambio de color al final.
        const c2 = Math.random() < 0.5 ? C_WHITE : C_GOLD;
        const n = budget(110), k = 2.4;
        for (let i = 0; i < n; i++) {
          const [ux, uy] = sphere();
          const v = R * k * U.rand(0.95, 1.05);
          const p = spawn(x, y, ux * v, uy * v, U.rand(1.6, 2.1), c1, DOT, U.rand(15, 19) * sizeK());
          if (!p) break;
          p.k = k; p.g = 65; p.trail = 2; p.hdt = 0.06; p.c2 = c2; p.cAt = 0.55; p.flick = 1;
        }
      },
      crossette(x, y, c1, R) {
        // Doble estallido: bolas grandes y bien brillantes (no se apagan) que se dividen en cruz.
        const c2 = otherColor(c1), n = Math.max(10, Math.round(15 * Math.max(0.6, quality))), k = 2.4;
        const off = Math.random() * 6.28;
        for (let i = 0; i < n; i++) {
          const a = off + (i / n) * Math.PI * 2 + U.rand(-0.1, 0.1);
          const v = R * k * U.rand(0.6, 0.66);
          const p = spawn(x, y, Math.cos(a) * v, Math.sin(a) * v, U.rand(0.56, 0.66), c1, DOT, 31 * sizeK());
          if (!p) break;
          p.k = k; p.g = 60; p.trail = 1; p.tl = 0.1; p.split = 1; p.splitC = c2;
        }
      },
      confites(x, y, c1, R) {
        // Lluvia de confites: corazones y estrellas de todos los colores que caen bailando.
        const n = budget(64), k = 3;
        for (let i = 0; i < n; i++) {
          const [ux, uy] = sphere();
          const v = R * k * 0.75 * U.rand(0.8, 1.05);
          const p = spawn(x, y, ux * v, uy * v, U.rand(2.4, 3.2), i % 4 === 0 ? c1 : U.randInt(0, N_COLORS - 1),
            i % 2 ? HEART : STAR, U.rand(24, 32) * sizeK());
          if (!p) break;
          p.k = k; p.g = 55; p.sway = U.rand(3, 5); p.vr = U.rand(-4, 4); p.rot = Math.random() * 6.28;
        }
      },
      carita(x, y, c1, R) {
        // Carita sonriente.
        const k = 2.4, face = C_AMARILLO, feat = c1 === C_AMARILLO ? C_ROSA : c1;
        const add = (ux, uy, c, shape, size, life) => {
          const p = spawn(x, y, ux * R * k, uy * R * k, life, c, shape, size * sizeK());
          if (p) { p.k = k; p.g = 30; p.trail = 1; p.tl = 0.03; }
        };
        const n = budget(46);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          add(Math.cos(a), Math.sin(a), face, DOT, 18, U.rand(1.8, 2));
        }
        for (const ex of [-0.34, 0.34]) {
          add(ex, -0.3, feat, DOT, 36, 1.9);
          for (let i = 0; i < 6; i++) add(ex + U.rand(-0.06, 0.06), -0.3 + U.rand(-0.07, 0.07), feat, DOT, 20, 1.9);
        }
        const m = budget(15);
        for (let i = 0; i <= m; i++) {
          const a = Math.PI * (0.18 + (0.64 * i) / m);
          add(Math.cos(a) * 0.55, Math.sin(a) * 0.55 - 0.02, feat, DOT, 18, 1.9);
        }
      },
    };

    function pickType() {
      let t;
      do { t = U.pick(TYPES); } while (t === lastType);
      lastType = t;
      return t;
    }

    /* Rectángulo donde puede caer el centro de un estallido de radio R: dentro de la franja de
       cielo libre y con margen para que casi todo el estallido se vea (arriba un poco más,
       porque la barra tapa; los costados sólo lo justo). */
    function safeRect(R) {
      let x0 = R * 0.4, x1 = W - R * 0.4;
      let y0 = band.top + R * 0.5, y1 = band.bottom - R * 0.45;
      if (x0 > x1) x0 = x1 = W / 2;
      if (y0 > y1) y0 = y1 = (band.top + band.bottom) / 2;
      return { x0, x1, y0, y1 };
    }
    const inRect = (r, x, y) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;

    /* Punto de explosión de una mecha. Si termina tapada (debajo de la barra o del selector, o
       pegada al borde), el estallido retrocede por el mismo recorrido hasta el último punto
       visible; si no lo hay cerca, se acomoda al punto visible más próximo. */
    function burstPoint(f, R) {
      const r = safeRect(R);
      const n = f.xs.length - 1;
      if (inRect(r, f.xs[n], f.ys[n])) return [f.xs[n], f.ys[n]];
      const lim = f.ds[n] - R * 2.5;
      for (let i = n - 1; i >= 0 && f.ds[i] >= lim; i--) {
        if (inRect(r, f.xs[i], f.ys[i])) return [f.xs[i], f.ys[i]];
      }
      return [U.clamp(f.xs[n], r.x0, r.x1), U.clamp(f.ys[n], r.y0, r.y1)];
    }

    // Explota en (x, y); con `fuse` el punto se calcula sobre su recorrido.
    function explode(x, y, ci, type, fuse) {
      if (!RECIPES[type]) type = pickType();
      const R = 175 * scale * U.rand(0.9, 1.1);
      if (fuse && fuse.xs.length) [x, y] = burstPoint(fuse, R);
      else {
        const r = safeRect(R);
        x = U.clamp(x, r.x0, r.x1);
        y = U.clamp(y, r.y0, r.y1);
      }
      lastBurst = [x, y, R];
      // Destello inicial (no con movimiento reducido).
      const f = calm ? null : spawn(x, y, 0, 0, 0.22, C_WHITE, DOT, R * 1.1);
      if (f) { f.flash = 1; f.k = 0; f.g = 0; }
      RECIPES[type](x, y, ci, R);
      // Sonido (limitado si explotan muchas juntas).
      const now = performance.now();
      while (boomTimes.length && now - boomTimes[0] > 250) boomTimes.shift();
      if (boomTimes.length < 3) {
        boomTimes.push(now);
        // Más agudo en pantallas chicas (parlantes chicos) y un poco hacia el lado del estallido.
        CL.sound.play('fwBoom', {
          type, vol: 1 / (1 + boomTimes.length * 0.35),
          pitch: U.rand(0.88, 1.12) / Math.sqrt(scale), pan: ((x / W) * 2 - 1) * 0.5,
        });
      }
      return type;
    }

    function splitParticle(p) {
      // Cuatro hijas en cruz (estrellitas y puntitos), con un chasquidito de luz.
      const off = Math.random() * 6.28;
      const v = 175 * scale * 1.15;
      for (let j = 0; j < 4; j++) {
        const a = off + (j * Math.PI) / 2;
        const star = j % 2 === 0;
        const q = spawn(p.x, p.y, Math.cos(a) * v + p.vx * 0.3, Math.sin(a) * v + p.vy * 0.3, U.rand(0.95, 1.3),
          p.splitC, star ? STAR : DOT, (star ? 26 : 21) * sizeK());
        if (!q) break;
        q.k = 2.6; q.g = 70; q.trail = 1; q.tl = 0.05; q.flick = 1;
      }
      const fl = calm ? null : spawn(p.x, p.y, 0, 0, 0.16, C_WHITE, DOT, 52 * scale);
      if (fl) { fl.flash = 1; fl.k = 0; fl.g = 0; }
    }

    /* ----- Mechas ----- */
    function newFuse(id, x, y) {
      let ci;
      if (colorSel === 'azar') {
        // Al azar, pero distinto del anterior y de las mechas que siguen ardiendo (con varios
        // dedos a la vez cada mecha sale de otro color).
        const used = new Set(fuses.map((q) => q.c));
        used.add(lastColor);
        const avail = [];
        for (let k = 0; k < N_COLORS; k++) if (!used.has(k)) avail.push(k);
        ci = avail.length ? U.pick(avail) : U.randInt(0, N_COLORS - 1);
      } else {
        ci = Math.max(0, COLORS.findIndex((c) => c.id === colorSel));
      }
      lastColor = ci;
      const hex = PAL[ci];
      // Estilos de la mecha (ver FUSE_W): halo en cuatro capas cada vez más tenues hacia afuera
      // (se suman con 'lighter' y queda un resplandor suave, sin escalones marcados; el tono va
      // un poco aclarado para que el amarillo o el naranja no se vean barrosos sobre el violeta),
      // color pleno y centro casi blanco.
      const glow = U.mix(hex, '#ffffff', 0.25);
      const st = [rgba(glow, 0.025), rgba(glow, 0.04), rgba(glow, 0.06), rgba(glow, 0.1), rgba(hex, 0.85), U.mix(hex, '#ffffff', 0.7)];
      x = U.clamp(x, 2, W - 2);
      y = U.clamp(y, 2, H - 2);
      const f = { id, xs: [x], ys: [y], ds: [0], len: 0, sd: 0, si: 0, v: SPEED, vT: SPEED, c: ci, st, down: true, px: x, py: y, acc: 0, age: 0 };
      fuses.push(f);
      return f;
    }

    /* Dedo levantado: la chispa sigue a velocidad constante. Sólo si falta muchísimo recorrido
       (un garabato largo) se apura, y lo hace de a poco (en RAMP s): como mucho FAST_MAX veces
       la velocidad normal, para llegar al final en ~TAIL_MAX s. Los garabatos enormes que aun así
       harían esperar más de TAIL_LONG s pueden ir algo más rápido. */
    function release(f) {
      if (!f.down) return;
      f.down = false;
      const rest = f.len - f.sd;
      f.vT = Math.max(SPEED, Math.min(rest / TAIL_MAX, SPEED * FAST_MAX), rest / TAIL_LONG);
    }

    function addPoint(f, x, y) {
      // La mecha no sale de la pantalla (mouse que se arrastra fuera de la ventana).
      x = U.clamp(x, 2, W - 2);
      y = U.clamp(y, 2, H - 2);
      const n = f.xs.length - 1;
      const d = Math.hypot(x - f.xs[n], y - f.ys[n]);
      if (d < 2.5) return; // puntos más juntos no se notan y encarecen el dibujo de la mecha
      f.len += d;
      f.xs.push(x); f.ys.push(y); f.ds.push(f.len);
    }

    // Ubica la chispa sobre el recorrido (el índice sólo avanza).
    function sparkPos(f) {
      const ds = f.ds;
      while (f.si < ds.length - 2 && ds[f.si + 1] <= f.sd) f.si++;
      const i = f.si;
      if (i >= ds.length - 1) { f.px = f.xs[i]; f.py = f.ys[i]; return; }
      const seg = ds[i + 1] - ds[i];
      const t = seg > 0 ? U.clamp((f.sd - ds[i]) / seg, 0, 1) : 1;
      f.px = f.xs[i] + (f.xs[i + 1] - f.xs[i]) * t;
      f.py = f.ys[i] + (f.ys[i + 1] - f.ys[i]) * t;
    }

    function emitSparks(f, dt, waiting) {
      f.acc += (waiting ? 150 : 105) * Math.max(0.4, quality) * dt;
      while (f.acc >= 1) {
        f.acc -= 1;
        const a = Math.random() * Math.PI * 2;
        const v = U.rand(50, waiting ? 230 : 190);
        const r = Math.random();
        const p = spawn(f.px, f.py, Math.cos(a) * v, Math.sin(a) * v - 70, U.rand(0.35, 0.85),
          r < 0.55 ? C_SPARK : r < 0.85 ? C_SPARK2 : C_GOLD, DOT, U.rand(9, 15));
        if (!p) return;
        p.k = 1.2; p.g = 520; p.trail = 1; p.tl = 0.05;
      }
    }

    /* ----- Simulación ----- */
    function step(dt) {
      clock += dt;
      // Mechas
      let waitingCount = 0;
      for (let i = fuses.length - 1; i >= 0; i--) {
        const f = fuses[i];
        f.age += dt;
        if (f.v < f.vT) f.v = Math.min(f.vT, f.v + ((f.vT - SPEED) / RAMP) * dt);
        f.sd = Math.min(f.len, f.sd + f.v * dt);
        sparkPos(f);
        const atEnd = f.sd >= f.len - 0.01;
        if (atEnd && !f.down) {
          explode(f.px, f.py, f.c, null, f);
          fuses.splice(i, 1);
          continue;
        }
        if (atEnd) waitingCount++;
        if (dt > 0) emitSparks(f, dt, atEnd);
      }
      // Partículas
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.age += dt;
        if (p.age >= p.life) {
          if (p.split) splitParticle(p);
          parts[i] = parts[parts.length - 1];
          parts.pop();
          free.push(p);
          continue;
        }
        if (p.k) { const f = Math.exp(-p.k * dt); p.vx *= f; p.vy *= f; }
        p.vy += p.g * dt;
        if (p.sway) p.vx += Math.sin(p.age * p.sway + p.ph) * 90 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.vr) p.rot += p.vr * dt;
        if (p.trail === 2 && dt > 0) {
          p.ht += dt;
          if (p.ht >= p.hdt || p.hn === 0) {
            p.ht = 0;
            p.hi = (p.hi + 1) % HIST;
            p.hist[p.hi * 2] = p.x;
            p.hist[p.hi * 2 + 1] = p.y;
            if (p.hn < HIST) p.hn++;
          }
        }
      }
      updateSound(waitingCount);
    }

    function updateSound(waitingCount) {
      const n = fuses.length;
      if (n && running) {
        if (!crackle) crackle = CL.sound.loop('fwMecha');
        crackle.update({ n, wait: waitingCount });
      } else if (crackle) {
        crackle.stop();
        crackle = null;
      }
    }

    /* ----- Dibujo ----- */
    function bucket(ci, a) {
      const lvl = a > 0.72 ? 3 : a > 0.42 ? 2 : a > 0.2 ? 1 : a > 0.05 ? 0 : -1;
      if (lvl < 0) return null;
      const k = ci * ALPHAS.length + lvl;
      return buckets[k] || (buckets[k] = new Path2D());
    }

    function particleAlpha(p, t) {
      if (p.split) return 1; // la bola del doble estallido brilla entera hasta dividirse
      let a = t < 0.55 ? 1 : Math.pow(1 - (t - 0.55) / 0.45, 1.4);
      if (p.flash) a = (1 - t) * (1 - t) * 0.9;
      if (calm) return a;
      if (p.flick && t > 0.45 && Math.random() < 0.3) a *= 0.25; // titileo tipo brillito
      return a * (0.85 + 0.15 * Math.sin(p.age * 28 + p.ph));
    }

    function render() {
      ctx.setTransform(fdpr, 0, 0, fdpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, W, H);

      // Estrellitas que titilan suave.
      const tw = sprite(DOT, C_WHITE);
      for (const s of twinklers) {
        ctx.globalAlpha = 0.25 + 0.6 * (0.5 + 0.5 * Math.sin(clock * s.w + s.ph));
        ctx.drawImage(tw, s.x - s.s / 2, s.y - s.s / 2, s.s, s.s);
      }

      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Mechas: halo + centro claro, desde la chispa hasta el final.
      for (const f of fuses) {
        if (f.sd >= f.len - 0.01) continue;
        ctx.beginPath();
        ctx.moveTo(f.px, f.py);
        for (let i = f.si + 1; i < f.xs.length; i++) ctx.lineTo(f.xs[i], f.ys[i]);
        ctx.globalAlpha = 1;
        for (let k = 0; k < FUSE_W.length; k++) {
          ctx.strokeStyle = f.st[k];
          ctx.lineWidth = FUSE_W[k];
          ctx.stroke();
        }
      }

      const tA = performance.now();
      // Estelas agrupadas por color y alfa.
      buckets.fill(null);
      const trailBudget = quality > 0.6;
      for (const p of parts) {
        if (!p.trail) continue;
        const t = p.age / p.life;
        const a = particleAlpha(p, t) * 0.9;
        const ci = p.c2 >= 0 && t > p.cAt ? p.c2 : p.c;
        if (p.trail === 1) {
          const path = bucket(ci, a);
          if (!path) continue;
          path.moveTo(p.x, p.y);
          path.lineTo(p.x - p.vx * p.tl, p.y - p.vy * p.tl);
        } else if (p.hn) {
          // Estela larga que se desvanece: cada tramo va a un nivel de alfa menor.
          let px = p.x, py = p.y;
          const n = trailBudget ? p.hn : Math.min(p.hn, 5);
          for (let j = 0; j < n; j++) {
            const idx = ((p.hi - j + HIST) % HIST) * 2;
            const qx = p.hist[idx], qy = p.hist[idx + 1];
            const path = bucket(ci, a * (1 - j / HIST));
            if (path) { path.moveTo(px, py); path.lineTo(qx, qy); }
            px = qx; py = qy;
          }
        }
      }
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1.7;
      ctx.lineCap = 'butt';
      if (!dbgOpt.noTrails) for (let k = 0; k < buckets.length; k++) {
        const path = buckets[k];
        if (!path) continue;
        ctx.strokeStyle = TRAIL_STYLE[(k / ALPHAS.length) | 0][k % ALPHAS.length];
        ctx.stroke(path);
      }

      const tB = performance.now();
      // Partículas brillantes.
      for (const p of parts) {
        const t = p.age / p.life;
        const a = particleAlpha(p, t);
        if (a < 0.02 || dbgOpt.noSprites) continue;
        const ci = p.c2 >= 0 && t > p.cAt ? p.c2 : p.c;
        const s = p.flash ? p.size * (0.6 + t * 0.6) : p.size * (1 - 0.35 * t);
        ctx.globalAlpha = a;
        const img = sprite(p.shape, ci);
        if (p.vr) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.drawImage(img, -s / 2, -s / 2, s, s);
          ctx.restore();
        } else {
          ctx.drawImage(img, p.x - s / 2, p.y - s / 2, s, s);
        }
      }

      const tC = performance.now();
      timing.trails += (tB - tA - timing.trails) * 0.1;
      timing.sprites += (tC - tB - timing.sprites) * 0.1;
      // Chispas de las mechas (punto blanco-amarillo con destellos).
      const sp = getSparkSprite();
      for (const f of fuses) {
        const waiting = f.sd >= f.len - 0.01;
        const pulse = 0.5 + 0.5 * Math.sin(clock * 40 + f.id);
        const s = (waiting ? 64 : 52) + pulse * 14;
        ctx.globalAlpha = 1;
        ctx.drawImage(sp, f.px - s / 2, f.py - s / 2, s, s);
        ctx.drawImage(sp, f.px - s * 0.3, f.py - s * 0.3, s * 0.6, s * 0.6);
        // Destellos: rayitos al azar.
        ctx.beginPath();
        const rays = waiting ? 9 : 6;
        for (let i = 0; i < rays; i++) {
          const a = Math.random() * Math.PI * 2;
          const r0 = 4, r1 = U.rand(10, waiting ? 30 : 22);
          ctx.moveTo(f.px + Math.cos(a) * r0, f.py + Math.sin(a) * r0);
          ctx.lineTo(f.px + Math.cos(a) * r1, f.py + Math.sin(a) * r1);
        }
        ctx.strokeStyle = 'rgba(255,240,190,0.9)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    /* ----- Bucle ----- */
    let frames = 0, ticks = 0;
    const dbgOpt = { noTrails: false, noSprites: false };
    const timing = { step: 0, trails: 0, sprites: 0, total: 0 }; // ms promedio (depuración)

    // Aprende el intervalo natural entre cuadros (mediana de los primeros cuadros con la escena
    // vacía y después un promedio lento). Vale tanto para pantallas de 60 como de 30 o 120 Hz.
    function learnBase(real) {
      if (real <= 0 || real > 120) return;
      if (baseSamples.length < 31) {
        baseSamples.push(real);
        if (baseSamples.length >= 5) {
          const s = baseSamples.slice().sort((a, b) => a - b);
          baseInt = s[s.length >> 1];
        }
      } else {
        baseInt += (U.clamp(real, baseInt * 0.6, baseInt * 1.6) - baseInt) * 0.02;
      }
    }

    /* Calidad adaptativa. Se degrada sólo si los cuadros llegan bastante más espaciados que el
       intervalo natural del equipo Y hay trabajo que lo explique (o la demora es muy grande:
       placas de video lentas, donde el trabajo no se ve en JS). Primero baja la resolución del
       canvas de efectos (los halos difusos casi no lo notan), después la cantidad de partículas.
       Se recupera con la misma referencia. */
    function adapt(now) {
      const work = timing.total;
      const slowAt = Math.max(baseInt * 1.35, 21);
      const busyAt = Math.max(baseInt, 16.7) * 0.45;
      const slow = frameEma > slowAt && (work > busyAt || frameEma > slowAt * 1.12);
      if (slow) {
        // En pantallas de dpr 2–3 nunca baja de 1,5 (con 1 el centro blanco de la mecha se
        // empasta con el color). Con mechas ardiendo primero se recortan partículas, así la
        // mecha y la chispa siguen nítidas.
        const minRes = fdprMax >= 2 ? 1.5 : 1;
        const cutFirst = fuses.length > 0 && quality > 0.6;
        if (!cutFirst && fdpr > minRes && now - resChanged > 600) { setRes(Math.max(minRes, fdpr - 0.5)); frameEma = baseInt * 1.1; }
        else quality = Math.max(0.35, quality - 0.02);
      } else if (frameEma < Math.max(baseInt * 1.15, 18.5) && work < busyAt * 0.8) {
        quality = Math.min(1, quality + 0.01);
        if (fdpr < fdprMax && parts.length < 150 && now - resChanged > 2500) setRes(Math.min(fdprMax, fdpr + 0.5));
      }
    }

    function frame(now) {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      const real = now - last;
      last = now;
      ticks++;
      // Respaldo por si el navegador no avisa el cambio de dpr: se revisa ~1 vez por segundo.
      if (ticks % 60 === 0 && U.dpr() !== skyDpr) { resize(); watchDpr(); }
      const idle = !fuses.length && !parts.length;
      if (idle) learnBase(real);
      frameEma += (U.clamp(real, 0, 100) - frameEma) * 0.08;
      adapt(now);
      const dt = (Math.min(real, 50) / 1000) * timeScale;
      // Escena vacía: sólo titilan las estrellas; alcanza con redibujar ~18 veces por segundo.
      if (idle && now - lastRender < IDLE_MS) { clock += dt; return; }
      lastRender = now;
      const t0 = performance.now();
      step(dt);
      const t1 = performance.now();
      render();
      timing.step += (t1 - t0 - timing.step) * 0.1;
      timing.total += (performance.now() - t0 - timing.total) * 0.1;
      frames++;
    }

    function start() {
      if (running || destroyed) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
    function stop() {
      running = false;
      cancelAnimationFrame(raf);
      if (crackle) { crackle.stop(); crackle = null; }
    }

    // La pista se desvanece y después se saca del documento (si no, sus animaciones CSS
    // infinitas seguirían corriendo toda la sesión).
    function hideHint() {
      hintShown = false;
      hint.classList.add('fw-hint--gone');
      const gone = () => { hint.remove(); };
      hint.addEventListener('transitionend', gone, { once: true });
      setTimeout(gone, 500); // por si no hay transición (movimiento reducido, pestaña oculta)
    }

    /* ----- Punteros (mouse, dedos y lápiz; cada dedo una mecha) ----- */
    const local = (ev) => ({ x: ev.clientX - rect.left, y: ev.clientY - rect.top });

    function onDown(ev) {
      if (ev.pointerType === 'mouse' && ev.button !== 0) return;
      ev.preventDefault();
      // Sólo se limitan los dedos apoyados: un dedo nuevo nunca se ignora por las mechas soltadas.
      if (byPointer.has(ev.pointerId) || byPointer.size >= MAX_FINGERS) return;
      if (fuses.length >= MAX_FUSES) {
        // Demasiadas mechas vivas: la soltada más vieja explota ya donde está su chispa.
        const i = fuses.findIndex((f) => !f.down);
        if (i >= 0) { const old = fuses[i]; fuses.splice(i, 1); explode(old.px, old.py, old.c); }
      }
      try { fx.setPointerCapture(ev.pointerId); } catch (e) { /* nada */ }
      rect = fx.getBoundingClientRect();
      const pt = local(ev);
      const f = newFuse(ev.pointerId, pt.x, pt.y);
      byPointer.set(ev.pointerId, f);
      CL.sound.play('fwLight');
      if (hintShown) hideHint();
    }
    function onMove(ev) {
      const f = byPointer.get(ev.pointerId);
      if (!f) return;
      const list = ev.getCoalescedEvents ? ev.getCoalescedEvents() : null;
      for (const e of list && list.length ? list : [ev]) {
        const pt = local(e);
        addPoint(f, pt.x, pt.y);
      }
    }
    function onUp(ev) {
      const f = byPointer.get(ev.pointerId);
      if (!f) return;
      if (ev.type === 'pointerup') { const pt = local(ev); addPoint(f, pt.x, pt.y); }
      release(f);
      byPointer.delete(ev.pointerId);
    }
    fx.addEventListener('pointerdown', onDown);
    fx.addEventListener('pointermove', onMove);
    fx.addEventListener('pointerup', onUp);
    fx.addEventListener('pointercancel', onUp);
    fx.addEventListener('lostpointercapture', onUp);

    // Pestaña oculta: pausa. Los dedos que estaban apoyados se dan por levantados.
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        stop();
        for (const f of fuses) release(f);
        byPointer.clear();
      } else {
        start();
      }
    };
    document.addEventListener('visibilitychange', onVis);

    // Si se activa/desactiva el sonido, el crepitar se vuelve a crear en el próximo cuadro.
    // Al activarlo se preparan los sonidos de explosión que falten.
    const offMute = CL.sound.events.on('mute', (m) => {
      if (crackle) { crackle.stop(); crackle = null; }
      if (!m) prepareBooms(TYPES);
    });

    if (document.visibilityState !== 'hidden') start();
    prepareBooms(TYPES);

    inst = {
      destroy() {
        destroyed = true;
        stop();
        ro.disconnect();
        document.removeEventListener('visibilitychange', onVis);
        if (mq.removeEventListener) mq.removeEventListener('change', onMq); else mq.removeListener(onMq);
        if (rmq.removeEventListener) rmq.removeEventListener('change', onRmq); else rmq.removeListener(onRmq);
        if (dprMq) { if (dprMq.removeEventListener) dprMq.removeEventListener('change', onDpr); else dprMq.removeListener(onDpr); }
        offMute();
        parts.length = 0;
        free.length = 0;
        fuses.length = 0;
        byPointer.clear();
      },
      debug: {
        explode: (x, y, type, color) => explode(x, y, color == null ? U.randInt(0, N_COLORS - 1) : color, type),
        state: () => ({
          running, W, H, fdpr, fdprMax, quality, frames, ticks, clock, timing: { ...timing },
          baseInt, frameEma, calm,
          particles: parts.length,
          fuses: fuses.map((f) => ({ x: f.px, y: f.py, sd: f.sd, len: f.len, v: f.v, vT: f.vT, down: f.down, color: COLORS[f.c].id, waiting: f.sd >= f.len - 0.01 })),
          crackle: !!crackle,
          color: colorSel,
          band: { ...band },
          lastBurst,
          booms: Object.keys(boomBufs),
          colorsFloat: colors.classList.contains('fw-colors--float'),
        }),
        timeScale: (v) => { timeScale = v; },
        opts: (o) => Object.assign(dbgOpt, o),
        clear: () => { for (const p of parts) free.push(p); parts.length = 0; fuses.length = 0; byPointer.clear(); },
      },
    };
  }

  function unmount() {
    if (inst) { inst.destroy(); inst = null; }
  }

  CL.router.register('fuegos', { mount, unmount });

  CL.fuegos = {
    SPEED,
    MAX_PARTS,
    TYPES: TYPES.slice(),
    COLORS: COLORS.map((c) => c.id),
    /** Funciones de depuración (sólo con la pantalla montada). */
    _debug: {
      explode: (x, y, type, color) => inst && inst.debug.explode(x, y, type, color),
      state: () => (inst ? inst.debug.state() : null),
      timeScale: (v) => inst && inst.debug.timeScale(v),
      opts: (o) => inst && inst.debug.opts(o),
      clear: () => inst && inst.debug.clear(),
    },
  };
})(window.CL);
