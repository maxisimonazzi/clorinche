/* Colorinche — sonidos suaves sintetizados con Web Audio (sin archivos).
   CL.sound.play('tap')                     -> sonido corto
   CL.sound.define('nombre', (s, opts) => { ... })  -> registrar un sonido
   const h = CL.sound.loop('scribble'); h.update({ speed }); h.stop();
   CL.sound.setMuted(true) / toggle() / isMuted()  (se recuerda por dispositivo) */
'use strict';
(function (CL) {
  const U = CL.util;
  let ac = null;
  let master = null;
  let muted = !!U.pref.get('muted', false);
  let noiseBuf = null;
  const defs = Object.create(null);
  const loopDefs = Object.create(null);
  const events = U.emitter();
  const MASTER_VOL = 0.55;

  function ensure() {
    try {
      if (!ac) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        try { ac = new AC({ latencyHint: 'interactive' }); } catch (e) { ac = new AC(); }
        const comp = ac.createDynamicsCompressor();
        comp.threshold.value = -18;
        comp.ratio.value = 6;
        master = ac.createGain();
        master.gain.value = muted ? 0 : MASTER_VOL;
        master.connect(comp);
        comp.connect(ac.destination);
      }
      if (ac.state === 'suspended' || ac.state === 'interrupted') ac.resume().catch(() => {});
      return ac;
    } catch (e) {
      return null;
    }
  }

  // Los navegadores sólo habilitan el audio después de un gesto del usuario.
  const unlock = () => { if (!muted) ensure(); };
  ['pointerdown', 'touchend', 'keydown', 'click'].forEach((ev) =>
    window.addEventListener(ev, unlock, { capture: true, passive: true })
  );

  function getNoise() {
    if (!noiseBuf) {
      const len = ac.sampleRate * 2;
      noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }

  /* ---------- Bloques de síntesis (se pasan a cada sonido como `s`) ---------- */
  const synth = {
    get ac() { return ac; },
    get out() { return master; },
    get now() { return ac.currentTime; },

    /** Envolvente ataque/decaimiento exponencial sobre un GainNode. */
    env(gainNode, t, attack, decay, peak) {
      const g = gainNode.gain;
      g.cancelScheduledValues(t);
      g.setValueAtTime(0.0001, t);
      g.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
      g.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    },

    /** Tono con deslizamiento opcional. */
    tone({ freq = 440, to = null, type = 'sine', at = 0, attack = 0.005, decay = 0.18, vol = 0.25, dest = null, detune = 0 } = {}) {
      const t = ac.currentTime + at;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (detune) o.detune.value = detune;
      if (to) o.frequency.exponentialRampToValueAtTime(to, t + attack + decay);
      synth.env(g, t, attack, decay, vol);
      o.connect(g);
      g.connect(dest || master);
      o.start(t);
      o.stop(t + attack + decay + 0.05);
      return o;
    },

    /** Ráfaga de ruido filtrado. */
    noise({ at = 0, dur = 0.2, attack = 0.005, vol = 0.2, type = 'bandpass', freq = 1500, to = null, q = 1, dest = null } = {}) {
      const t = ac.currentTime + at;
      const src = ac.createBufferSource();
      src.buffer = getNoise();
      src.loop = true;
      const f = ac.createBiquadFilter();
      f.type = type;
      f.frequency.setValueAtTime(freq, t);
      if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
      f.Q.value = q;
      const g = ac.createGain();
      synth.env(g, t, attack, Math.max(0.01, dur - attack), vol);
      src.connect(f); f.connect(g); g.connect(dest || master);
      src.start(t, Math.random() * 1.5);
      src.stop(t + dur + 0.05);
      return src;
    },

    noiseBuffer() { return getNoise(); },
  };

  /* ---------- API ---------- */
  const sound = {
    synth,
    events,
    define(name, fn) { defs[name] = fn; },
    defineLoop(name, fn) { loopDefs[name] = fn; },
    has(name) { return name in defs; },

    play(name, opts = {}) {
      if (muted) return;
      const fn = defs[name];
      if (!fn || !ensure()) return;
      try { fn(synth, opts); } catch (e) { console.warn('sonido', name, e); }
    },

    /** Sonido continuo: devuelve { update(params), stop() }. Siempre seguro de usar. */
    loop(name, opts = {}) {
      const dummy = { update() {}, stop() {} };
      if (muted) return dummy;
      const fn = loopDefs[name];
      if (!fn || !ensure()) return dummy;
      try { return fn(synth, opts) || dummy; } catch (e) { console.warn('loop', name, e); return dummy; }
    },

    isMuted() { return muted; },
    setMuted(v) {
      muted = !!v;
      U.pref.set('muted', muted);
      if (ac && master) {
        const t = ac.currentTime;
        master.gain.cancelScheduledValues(t);
        master.gain.setTargetAtTime(muted ? 0 : MASTER_VOL, t, 0.03);
      }
      if (!muted) ensure();
      events.emit('mute', muted);
    },
    toggle() { sound.setMuted(!muted); return muted; },
    /** Desbloqueo explícito (llamar dentro de un gesto). */
    unlock: ensure,
  };

  /* ---------- Sonidos base (suaves, cortos) ---------- */
  const D = sound.define;

  D('tap', (s, o) => s.tone({ freq: 620 * (o.pitch || 1), to: 820 * (o.pitch || 1), decay: 0.07, vol: 0.12, type: 'sine' }));

  D('pop', (s, o) => {
    const p = o.pitch || 1;
    s.tone({ freq: 380 * p, to: 950 * p, attack: 0.004, decay: 0.09, vol: 0.18 });
  });

  D('select', (s, o) => {
    const p = o.pitch || 1;
    s.tone({ freq: 700 * p, decay: 0.08, vol: 0.12, type: 'triangle' });
    s.tone({ freq: 1050 * p, at: 0.05, decay: 0.1, vol: 0.1, type: 'triangle' });
  });

  D('splash', (s, o) => {
    const p = o.pitch || 1;
    s.noise({ dur: 0.28, attack: 0.01, vol: 0.14, type: 'bandpass', freq: 2400, to: 500, q: 1.2 });
    s.tone({ freq: 420 * p, to: 760 * p, attack: 0.006, decay: 0.16, vol: 0.14 });
    s.tone({ freq: 840 * p, to: 1200 * p, at: 0.06, attack: 0.004, decay: 0.12, vol: 0.06 });
  });

  D('undo', (s) => {
    s.tone({ freq: 660, decay: 0.08, vol: 0.12, type: 'triangle' });
    s.tone({ freq: 440, at: 0.07, decay: 0.12, vol: 0.12, type: 'triangle' });
  });

  D('redo', (s) => {
    s.tone({ freq: 440, decay: 0.08, vol: 0.12, type: 'triangle' });
    s.tone({ freq: 660, at: 0.07, decay: 0.12, vol: 0.12, type: 'triangle' });
  });

  D('erase', (s) => s.noise({ dur: 0.14, vol: 0.08, type: 'highpass', freq: 2500, q: 0.7 }));

  D('whoosh', (s, o) => {
    const dur = o.dur || 0.9;
    s.noise({ dur, attack: dur * 0.45, vol: 0.2, type: 'bandpass', freq: 300, to: 2600, q: 0.9 });
  });

  D('tada', (s) => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      s.tone({ freq: f, at: i * 0.11, attack: 0.01, decay: 0.35 + (i === 3 ? 0.4 : 0), vol: 0.13, type: 'triangle' })
    );
    for (let i = 0; i < 6; i++) {
      s.tone({ freq: 1800 + Math.random() * 1600, at: 0.45 + i * 0.07, attack: 0.003, decay: 0.12, vol: 0.05 });
    }
  });

  D('sparkle', (s, o) => {
    const n = o.count || 3;
    for (let i = 0; i < n; i++) {
      s.tone({ freq: 1600 + Math.random() * 1800, at: i * 0.05, attack: 0.003, decay: 0.1, vol: 0.05 });
    }
  });

  D('stamp', (s, o) => {
    const p = o.pitch || 1;
    s.tone({ freq: 220 * p, to: 520 * p, attack: 0.005, decay: 0.07, vol: 0.16 });
    s.tone({ freq: 520 * p, to: 300 * p, at: 0.07, attack: 0.005, decay: 0.12, vol: 0.12 });
  });

  D('tick', (s, o) => s.tone({ freq: 900 + (o.step || 0) * 60, decay: 0.03, vol: 0.06, type: 'triangle' }));

  D('delete', (s) => {
    s.tone({ freq: 640, to: 140, attack: 0.01, decay: 0.3, vol: 0.16, type: 'triangle' });
    s.noise({ dur: 0.25, vol: 0.06, type: 'lowpass', freq: 1800, to: 300 });
  });

  D('shutter', (s) => {
    s.noise({ dur: 0.05, vol: 0.2, type: 'highpass', freq: 3000 });
    s.noise({ at: 0.07, dur: 0.06, vol: 0.14, type: 'highpass', freq: 2000 });
  });

  D('open', (s) => {
    s.tone({ freq: 587, decay: 0.12, vol: 0.1, type: 'triangle' });
    s.tone({ freq: 880, at: 0.08, decay: 0.2, vol: 0.1, type: 'triangle' });
  });

  D('nope', (s) => {
    s.tone({ freq: 300, to: 240, decay: 0.1, vol: 0.1, type: 'triangle' });
    s.tone({ freq: 260, to: 200, at: 0.12, decay: 0.12, vol: 0.1, type: 'triangle' });
  });

  /* Loop de "rayoneo" mientras se dibuja: update({ speed }) con speed en px/ms aprox. */
  sound.defineLoop('scribble', (s, o) => {
    const ac2 = s.ac;
    const src = ac2.createBufferSource();
    src.buffer = s.noiseBuffer();
    src.loop = true;
    const f = ac2.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = o.freq || 1400;
    f.Q.value = o.q || 0.8;
    const g = ac2.createGain();
    g.gain.value = 0;
    src.connect(f); f.connect(g); g.connect(s.out);
    src.start(0, Math.random() * 1.5);
    const maxVol = o.vol || 0.07;
    let stopped = false;
    return {
      update(p = {}) {
        if (stopped) return;
        const v = U.clamp((p.speed || 0) / 2.5, 0, 1) * maxVol;
        g.gain.setTargetAtTime(v, ac2.currentTime, 0.04);
        if (p.freq) f.frequency.setTargetAtTime(p.freq, ac2.currentTime, 0.05);
      },
      stop() {
        if (stopped) return;
        stopped = true;
        g.gain.setTargetAtTime(0, ac2.currentTime, 0.04);
        src.stop(ac2.currentTime + 0.3);
      },
    };
  });

  CL.sound = sound;
})(window.CL);
