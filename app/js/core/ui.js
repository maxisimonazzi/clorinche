/* Colorines — componentes de interfaz compartidos.
   - CL.ui.button({ icon, label, cls, onTap, sound })
   - CL.ui.holdButton({ icon, label, cls, duration, onConfirm })  (mantener apretado para borrar)
   - CL.ui.muteButton(), CL.ui.homeButton(), CL.ui.backButton(path)
   - CL.ui.celebrate()  -> festejo a pantalla completa (promesa)
   - CL.ui.toast(iconName), CL.ui.modal(content), CL.ui.spinner(root)
   - CL.ui.modeTabs(current) -> pestañas Pizarra / Neón / Fuegos
   - CL.ui.noGestures(elem)  -> anula scroll/zoom/menú en superficies de dibujo */
'use strict';
(function (CL) {
  const U = CL.util;
  const el = U.el;

  /** Botón redondo con ícono. `label` es el nombre accesible (no se muestra). */
  function button({ icon, label = '', cls = '', onTap = null, sound = 'tap', soundOpts = null, text = null } = {}) {
    const b = el('button.btn' + (cls ? '.' + cls.split(' ').join('.') : ''), {
      type: 'button',
      'aria-label': label,
      title: label,
    });
    if (icon) b.append(CL.icon(icon));
    if (text) b.append(el('span.btn-text', null, text));
    if (onTap) {
      b.addEventListener('click', (ev) => {
        if (sound) CL.sound.play(sound, soundOpts || {});
        onTap(ev);
      });
    }
    return b;
  }

  /** Botón que confirma sólo si se mantiene apretado `duration` ms.
      Muestra un anillo que se llena; si se suelta antes, se sacude y aparece una manito. */
  function holdButton({ icon = 'trash', label = 'Mantené apretado para borrar', cls = '', duration = 1200, onConfirm } = {}) {
    const b = el('button.btn.btn-hold' + (cls ? '.' + cls.split(' ').join('.') : ''), {
      type: 'button',
      'aria-label': label,
      title: label,
    });
    const R = 21;
    const C = 2 * Math.PI * R;
    b.innerHTML =
      `<svg class="hold-ring" viewBox="0 0 48 48" aria-hidden="true">` +
      `<circle cx="24" cy="24" r="${R}" fill="none" stroke="rgba(43,34,64,.12)" stroke-width="4"/>` +
      `<circle class="hold-prog" cx="24" cy="24" r="${R}" fill="none" stroke="#ff5a5f" stroke-width="4.5" ` +
      `stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C}" transform="rotate(-90 24 24)"/></svg>`;
    b.append(CL.icon(icon));
    const prog = b.querySelector('.hold-prog');
    let start = 0, raf = 0, active = false, lastTick = -1, pid = null;

    const setP = (p) => { prog.style.strokeDashoffset = String(C * (1 - p)); };

    const frame = () => {
      if (!active) return;
      const p = Math.min(1, (performance.now() - start) / duration);
      setP(p);
      const step = Math.floor(p * 5);
      if (step !== lastTick && p < 1) { lastTick = step; CL.sound.play('tick', { step }); }
      if (p >= 1) {
        active = false;
        b.classList.remove('holding');
        b.classList.add('confirmed');
        CL.sound.play('delete');
        if (navigator.vibrate) { try { navigator.vibrate(40); } catch (e) { /* nada */ } }
        setTimeout(() => { b.classList.remove('confirmed'); setP(0); }, 400);
        if (onConfirm) onConfirm();
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    const begin = (ev) => {
      if (active) return;
      if (ev && ev.button > 0) return;
      active = true;
      lastTick = -1;
      start = performance.now();
      b.classList.add('holding');
      b.classList.remove('hint');
      if (ev && ev.pointerId != null) { pid = ev.pointerId; try { b.setPointerCapture(pid); } catch (e) { /* nada */ } }
      raf = requestAnimationFrame(frame);
    };

    const cancel = () => {
      if (!active) return;
      active = false;
      cancelAnimationFrame(raf);
      b.classList.remove('holding');
      const held = performance.now() - start;
      setP(0);
      if (held < duration) {
        // Pista visual: se sacude y aparece una manito "mantené apretado".
        b.classList.remove('hint');
        void b.offsetWidth;
        b.classList.add('hint');
        CL.sound.play('nope');
        setTimeout(() => b.classList.remove('hint'), 1300);
      }
    };

    b.addEventListener('pointerdown', (ev) => { ev.preventDefault(); begin(ev); });
    b.addEventListener('pointerup', cancel);
    b.addEventListener('pointercancel', cancel);
    b.addEventListener('lostpointercapture', cancel);
    b.addEventListener('contextmenu', (ev) => ev.preventDefault());
    b.addEventListener('keydown', (ev) => {
      if ((ev.key === ' ' || ev.key === 'Enter') && !ev.repeat) { ev.preventDefault(); begin(); }
    });
    b.addEventListener('keyup', (ev) => { if (ev.key === ' ' || ev.key === 'Enter') cancel(); });
    b.append(el('span.hold-hint', { 'aria-hidden': 'true' }, CL.icon('hand')));
    return b;
  }

  /** Botón de sonido (se sincroniza solo entre pantallas). */
  function muteButton(cls = '') {
    const b = button({ icon: CL.sound.isMuted() ? 'soundOff' : 'soundOn', label: 'Sonido', cls: 'btn-mute ' + cls, sound: null });
    const sync = (m) => {
      b.replaceChildren(CL.icon(m ? 'soundOff' : 'soundOn'));
      b.setAttribute('aria-pressed', String(!m));
    };
    b.addEventListener('click', () => {
      const m = CL.sound.toggle();
      if (!m) CL.sound.play('pop');
    });
    const off = CL.sound.events.on('mute', sync);
    // Se desuscribe cuando el botón sale del documento.
    const mo = new MutationObserver(() => { if (!b.isConnected) { off(); mo.disconnect(); } });
    requestAnimationFrame(() => { if (b.isConnected) mo.observe(document.body, { childList: true, subtree: true }); });
    sync(CL.sound.isMuted());
    return b;
  }

  function homeButton(cls = '') {
    return button({ icon: 'home', label: 'Inicio', cls: 'btn-home ' + cls, onTap: () => CL.router.go('inicio') });
  }

  /** Botón volver: vuelve a `path` (o atrás en el historial si no se indica). */
  function backButton(path, cls = '') {
    return button({
      icon: 'back', label: 'Volver', cls: 'btn-back ' + cls,
      onTap: () => (path ? CL.router.go(path) : CL.router.back()),
    });
  }

  /** Festejo: confites, estrellas y fanfarria. Resuelve al terminar (~2.4 s) o al tocar. */
  function celebrate({ duration = 2400, icon = 'star' } = {}) {
    return new Promise((resolve) => {
      CL.sound.play('tada');
      const layer = el('div.celebrate', { role: 'presentation' });
      const cv = el('canvas.celebrate-canvas');
      const badge = el('div.celebrate-badge', null, CL.icon(icon));
      layer.append(cv, badge);
      document.body.append(layer);
      const dpr = U.dpr();
      const W = window.innerWidth, H = window.innerHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      const ctx = cv.getContext('2d');
      ctx.scale(dpr, dpr);
      const colors = ['#ff5a5f', '#ff9f1c', '#ffd23f', '#2bc48a', '#4cc3ff', '#7b61ff', '#ff8fc7'];
      const parts = [];
      const burst = (x, y, n, spd) => {
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2;
          const v = spd * (0.4 + Math.random() * 0.8);
          parts.push({
            x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - spd * 0.35,
            r: 4 + Math.random() * 7, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
            c: U.pick(colors), shape: U.pick(['rect', 'circle', 'star']), life: 1,
          });
        }
      };
      burst(W * 0.5, H * 0.45, 90, Math.max(W, H) * 0.018);
      setTimeout(() => burst(W * 0.2, H * 0.6, 45, Math.max(W, H) * 0.014), 250);
      setTimeout(() => burst(W * 0.8, H * 0.6, 45, Math.max(W, H) * 0.014), 450);

      const star = (c, r) => {
        c.beginPath();
        for (let i = 0; i < 10; i++) {
          const rr = i % 2 ? r * 0.45 : r;
          const a = (i * Math.PI) / 5 - Math.PI / 2;
          c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        c.closePath();
        c.fill();
      };

      let done = false, raf = 0;
      const t0 = performance.now();
      let last = t0;
      const finish = () => {
        if (done) return;
        done = true;
        cancelAnimationFrame(raf);
        layer.classList.add('out');
        setTimeout(() => { layer.remove(); resolve(); }, 250);
      };
      const tick = (now) => {
        const dt = Math.min(50, now - last) / 16.67;
        last = now;
        ctx.clearRect(0, 0, W, H);
        for (const p of parts) {
          p.vy += 0.35 * dt;
          p.vx *= 0.99; p.vy *= 0.99;
          p.x += p.vx * dt; p.y += p.vy * dt;
          p.rot += p.vr * dt;
          if (now - t0 > duration - 700) p.life = Math.max(0, p.life - 0.03 * dt);
          ctx.save();
          ctx.globalAlpha = p.life;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.c;
          if (p.shape === 'rect') ctx.fillRect(-p.r, -p.r * 0.5, p.r * 2, p.r);
          else if (p.shape === 'circle') { ctx.beginPath(); ctx.arc(0, 0, p.r * 0.7, 0, 7); ctx.fill(); }
          else star(ctx, p.r);
          ctx.restore();
        }
        if (now - t0 > duration) finish();
        else raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      layer.addEventListener('pointerdown', finish);
    });
  }

  /** Aviso breve con un ícono grande en el centro. */
  function toast(iconName = 'check', ms = 1100) {
    const t = el('div.toast', { role: 'status' }, CL.icon(iconName));
    document.body.append(t);
    requestAnimationFrame(() => t.classList.add('in'));
    setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 300); }, ms);
  }

  /** Ventana modal simple. `content` es un Node. Devuelve { root, close }. */
  function modal(content, { onClose = null, closeButton = true, cls = '' } = {}) {
    const back = el('div.modal-back' + (cls ? '.' + cls : ''));
    const box = el('div.modal', { role: 'dialog', 'aria-modal': 'true' });
    if (closeButton) box.append(button({ icon: 'close', label: 'Cerrar', cls: 'modal-close', onTap: () => close() }));
    box.append(content);
    back.append(box);
    // El fondo cierra sólo con un toque corto de un dedo (no con el pulgar que sostiene la tablet).
    const downs = new Map();
    back.addEventListener('pointerdown', (ev) => {
      if (downs.size) for (const d of downs.values()) d.multi = true;
      downs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY, t: performance.now(), bg: ev.target === back, multi: downs.size > 0 });
    });
    back.addEventListener('pointerup', (ev) => {
      const d = downs.get(ev.pointerId);
      downs.delete(ev.pointerId);
      if (!d || !d.bg || d.multi || ev.target !== back) return;
      if (performance.now() - d.t < 600 && Math.hypot(ev.clientX - d.x, ev.clientY - d.y) < 24) close();
    });
    back.addEventListener('pointercancel', (ev) => downs.delete(ev.pointerId));
    const onKey = (ev) => { if (ev.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    document.body.append(back);
    requestAnimationFrame(() => back.classList.add('in'));
    let closed = false;
    function close() {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKey);
      back.style.pointerEvents = 'none'; // mientras se desvanece no se traga el próximo toque
      back.classList.remove('in');
      setTimeout(() => back.remove(), 200);
      if (onClose) onClose();
    }
    return { root: box, close };
  }

  /** Indicador de carga (pincel que gira). Devuelve una función para quitarlo. */
  function spinner(root) {
    const s = el('div.spinner', { role: 'progressbar', 'aria-label': 'Cargando' },
      [el('span.dot'), el('span.dot'), el('span.dot')]);
    root.append(s);
    return () => s.remove();
  }

  /** Pestañas grandes para cambiar de modo dentro de la pizarra. */
  function modeTabs(current) {
    const tabs = [
      { id: 'pizarra', icon: 'modePizarra', label: 'Pizarra mágica' },
      { id: 'neon', icon: 'modeNeon', label: 'Neón' },
      { id: 'fuegos', icon: 'modeFuegos', label: 'Fuegos artificiales' },
    ];
    const wrap = el('div.mode-tabs', { role: 'tablist' });
    for (const t of tabs) {
      const b = button({
        icon: t.icon, label: t.label, cls: 'mode-tab' + (t.id === current ? ' active' : ''),
        sound: 'select',
        onTap: () => { if (t.id !== current) CL.router.go(t.id); },
      });
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(t.id === current));
      wrap.append(b);
    }
    return wrap;
  }

  /** Anula scroll, zoom, selección y menú contextual sobre una superficie de dibujo. */
  function noGestures(elem) {
    elem.style.touchAction = 'none';
    elem.classList.add('no-gestures');
    const prevent = (ev) => ev.preventDefault();
    elem.addEventListener('contextmenu', prevent);
    elem.addEventListener('touchstart', prevent, { passive: false });
    elem.addEventListener('touchmove', prevent, { passive: false });
    elem.addEventListener('gesturestart', prevent);
    elem.addEventListener('dblclick', prevent);
    elem.addEventListener('selectstart', prevent);
    return elem;
  }

  // Íconos de las pestañas de modo (se usan en pizarra, neón y fuegos).
  CL.icons.add({
    modePizarra: `<rect x="5" y="8" width="38" height="30" rx="5" fill="#ff5a5f" ${CL.icons.STROKE}/>
      <rect x="10" y="13" width="28" height="20" rx="2" fill="#f2f2f2" ${CL.icons.STROKE}/>
      <path d="M14 27c3-6 6-7 8-3s5 3 8-4" fill="none" stroke="#7b61ff" stroke-width="3" stroke-linecap="round"/>
      <circle cx="12" cy="42" r="2.5" fill="#ffd23f" stroke="#2b2240" stroke-width="2"/><circle cx="36" cy="42" r="2.5" fill="#ffd23f" stroke="#2b2240" stroke-width="2"/>`,
    modeNeon: `<rect x="4" y="6" width="40" height="36" rx="7" fill="#1b1033" stroke="#2b2240" stroke-width="3"/>
      <path d="M12 30c4-10 8-14 12-8s8 4 12-6" fill="none" stroke="#ff4fd8" stroke-width="6" stroke-linecap="round" opacity=".45"/>
      <path d="M12 30c4-10 8-14 12-8s8 4 12-6" fill="none" stroke="#ffe6fb" stroke-width="2.4" stroke-linecap="round"/>`,
    modeFuegos: `<rect x="4" y="6" width="40" height="36" rx="7" fill="#1d1846" stroke="#2b2240" stroke-width="3"/>
      <g stroke-linecap="round" stroke-width="3"><path d="M24 24V13M24 24l8-6M24 24l10 2M24 24l6 8M24 24l-6 8M24 24l-10 2M24 24l-8-6" stroke="#ffd23f"/></g>
      <circle cx="24" cy="24" r="3" fill="#fff"/><circle cx="12" cy="13" r="1.3" fill="#fff"/><circle cx="37" cy="36" r="1.3" fill="#fff"/>`,
  });

  CL.ui = { button, holdButton, muteButton, homeButton, backButton, celebrate, toast, modal, spinner, modeTabs, noGestures };
})(window.CL);
