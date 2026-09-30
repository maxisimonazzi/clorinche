/* Colorines — pantalla de inicio (#inicio).
   Logo + nombre con letras de colores, 5 tarjetas enormes con ilustraciones propias
   (Colorear, Pizarra mágica, Juegos, Subir foto, Mis obras), accesos chiquitos a Neón y Fuegos,
   botón de sonido y una decoración suave de fondo. Abajo, dos botones para los grandes: "Para familias"
   (qué es Colorines y cómo colaborar) y "Ayuda" (qué hace cada botón). Todo entra sin scroll. */
'use strict';
(function (CL) {
  const U = CL.util;
  const el = U.el;
  const INK = '#2b2240';

  /* ---------- Ilustraciones de las tarjetas (viewBox 240×200) ---------- */
  // Cada SVG está una sola vez en la página, así que los ids con prefijo "hm-" no chocan.
  const ART = {
    // Hoja con una mariposa a medio pintar y un crayón.
    colorear: `
      <rect x="40" y="22" width="156" height="160" rx="12" fill="${INK}" opacity=".16" transform="rotate(-5 118 102) translate(5 7)"/>
      <g transform="rotate(-5 118 102)">
        <rect x="40" y="22" width="156" height="160" rx="12" fill="#fff" stroke="${INK}" stroke-width="5"/>
        <defs>
          <clipPath id="hm-wing"><ellipse cx="148" cy="80" rx="32" ry="26" transform="rotate(20 148 80)"/></clipPath>
        </defs>
        <!-- alas izquierdas pintadas -->
        <ellipse cx="88" cy="80" rx="32" ry="26" transform="rotate(-20 88 80)" fill="#ff8fc7" stroke="${INK}" stroke-width="5"/>
        <ellipse cx="94" cy="128" rx="23" ry="20" transform="rotate(20 94 128)" fill="#7b61ff" stroke="${INK}" stroke-width="5"/>
        <circle cx="84" cy="78" r="9" fill="#ffd23f" stroke="${INK}" stroke-width="4"/>
        <circle cx="92" cy="130" r="6" fill="#4cc3ff" stroke="${INK}" stroke-width="4"/>
        <!-- alas derechas: una a medio pintar con rayitas de crayón -->
        <ellipse cx="148" cy="80" rx="32" ry="26" transform="rotate(20 148 80)" fill="#fff"/>
        <g clip-path="url(#hm-wing)">
          <path d="M112 62l30-14M112 74l44-20M114 86l52-24M118 98l40-18" stroke="#ff5a5f" stroke-width="7" stroke-linecap="round" opacity=".9"/>
        </g>
        <ellipse cx="148" cy="80" rx="32" ry="26" transform="rotate(20 148 80)" fill="none" stroke="${INK}" stroke-width="5"/>
        <circle cx="152" cy="78" r="9" fill="#fff" stroke="${INK}" stroke-width="4"/>
        <ellipse cx="142" cy="128" rx="23" ry="20" transform="rotate(-20 142 128)" fill="#fff" stroke="${INK}" stroke-width="5"/>
        <circle cx="144" cy="130" r="6" fill="#fff" stroke="${INK}" stroke-width="4"/>
        <!-- cuerpo y carita -->
        <rect x="109" y="70" width="18" height="84" rx="9" fill="#ffb454" stroke="${INK}" stroke-width="5"/>
        <circle cx="118" cy="60" r="16" fill="#ffb454" stroke="${INK}" stroke-width="5"/>
        <path d="M110 46c-4-10-10-14-16-14M126 46c4-10 10-14 16-14" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
        <circle cx="93" cy="32" r="5" fill="#ff5a5f" stroke="${INK}" stroke-width="3"/>
        <circle cx="143" cy="32" r="5" fill="#ff5a5f" stroke="${INK}" stroke-width="3"/>
        <circle cx="112" cy="58" r="3" fill="${INK}"/><circle cx="124" cy="58" r="3" fill="${INK}"/>
        <path d="M112 66q6 5 12 0" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
      </g>
      <!-- crayón -->
      <g class="hm-crayon" transform="translate(204 114) rotate(35) scale(.85)">
        <rect x="-50" y="-13" width="86" height="26" rx="6" fill="#ff5a5f" stroke="${INK}" stroke-width="5"/>
        <path d="M-30 -13v26M16 -13v26" stroke="${INK}" stroke-width="4"/>
        <rect x="-30" y="-13" width="46" height="26" fill="#ff8a8e" stroke="${INK}" stroke-width="4"/>
        <path d="M-50 -11l-22 11 22 11z" fill="#ff5a5f" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
        <path d="M-66 -3l-8 3 8 3z" fill="${INK}"/>
      </g>`,

    // Pizarra mágica de juguete con garabato arcoíris, barrita y lapicito.
    pizarra: `
      <defs>
        <linearGradient id="hm-rb" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stop-color="#ff5a5f"/><stop offset=".22" stop-color="#ff9f1c"/>
          <stop offset=".42" stop-color="#ffd23f"/><stop offset=".62" stop-color="#2bc48a"/>
          <stop offset=".82" stop-color="#4cc3ff"/><stop offset="1" stop-color="#7b61ff"/>
        </linearGradient>
      </defs>
      <rect x="16" y="24" width="200" height="156" rx="24" fill="${INK}" opacity=".16" transform="translate(5 7)"/>
      <rect x="16" y="24" width="200" height="156" rx="24" fill="#ff5a5f" stroke="${INK}" stroke-width="5"/>
      <rect x="34" y="40" width="164" height="102" rx="10" fill="#eceaf2" stroke="${INK}" stroke-width="4"/>
      <path class="hm-scribble" d="M50 116c12-46 32-50 40-16s26 30 34-6 28-34 36 0 14 20 22 2" fill="none" stroke="url(#hm-rb)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M66 66l4 8 9 1-6 6 2 9-9-5-8 5 2-9-6-6 9-1z" fill="#ffd23f" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M170 60c4-6 12-2 8 4l-8 8-8-8c-4-6 4-10 8-4z" fill="#ff8fc7" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
      <!-- barrita para borrar -->
      <rect x="34" y="152" width="164" height="14" rx="7" fill="#ffd23f" stroke="${INK}" stroke-width="4"/>
      <rect class="hm-slider" x="98" y="146" width="36" height="26" rx="8" fill="#fff" stroke="${INK}" stroke-width="4"/>
      <!-- lapicito con cordón -->
      <path d="M208 116c18 10 16 34 2 44" fill="none" stroke="${INK}" stroke-width="3" stroke-dasharray="2 5" stroke-linecap="round"/>
      <g transform="translate(204 108) rotate(28)">
        <rect x="-8" y="-52" width="16" height="50" rx="6" fill="#4cc3ff" stroke="${INK}" stroke-width="4"/>
        <path d="M-8 -4l8 16 8-16z" fill="#fff" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
      </g>`,

    // Cámara con una foto que asoma y un destello.
    subir: `
      <g transform="rotate(12 184 54)">
        <rect x="150" y="14" width="68" height="78" rx="6" fill="#fff" stroke="${INK}" stroke-width="4"/>
        <rect x="158" y="22" width="52" height="46" fill="#bfe9ff" stroke="${INK}" stroke-width="3"/>
        <circle cx="172" cy="36" r="7" fill="#ffd23f" stroke="${INK}" stroke-width="2.5"/>
        <path d="M158 68c10-14 18-16 26-8s14 2 26-6v14z" fill="#2bc48a" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      </g>
      <rect x="28" y="58" width="168" height="116" rx="20" fill="${INK}" opacity=".16" transform="translate(5 7)"/>
      <rect x="76" y="40" width="64" height="30" rx="9" fill="#ffd23f" stroke="${INK}" stroke-width="5"/>
      <rect x="40" y="48" width="24" height="16" rx="5" fill="#ff5a5f" stroke="${INK}" stroke-width="4"/>
      <rect x="28" y="58" width="168" height="116" rx="20" fill="#4cc3ff" stroke="${INK}" stroke-width="5"/>
      <path d="M28 88h168" stroke="${INK}" stroke-width="4" opacity=".25"/>
      <rect x="156" y="70" width="28" height="16" rx="5" fill="#fff" stroke="${INK}" stroke-width="4"/>
      <circle cx="112" cy="118" r="42" fill="#fff" stroke="${INK}" stroke-width="5"/>
      <circle cx="112" cy="118" r="28" fill="#7b61ff" stroke="${INK}" stroke-width="5"/>
      <circle cx="112" cy="118" r="13" fill="${INK}"/>
      <circle cx="102" cy="108" r="6" fill="#fff"/><circle cx="121" cy="126" r="3" fill="#fff"/>
      <!-- destello del flash, arriba del foquito rojo (en una zona libre, no sobre la foto) -->
      <g class="hm-flash" stroke-linecap="round">
        <path d="M52 36V22M40 40l-9-8M64 40l9-8" stroke="${INK}" stroke-width="11"/>
        <path d="M52 36V22M40 40l-9-8M64 40l9-8" stroke="#fff27a" stroke-width="5.5"/>
      </g>`,

    // Bloques de juguete con números y una pelota.
    juegos: `
      <ellipse cx="116" cy="186" rx="98" ry="9" fill="${INK}" opacity=".12"/>
      <g transform="rotate(-6 76 144)">
        <rect x="38" y="106" width="76" height="76" rx="14" fill="#ff5a5f" stroke="${INK}" stroke-width="5"/>
        <text x="76" y="163" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="58" fill="#fff" stroke="${INK}" stroke-width="5" paint-order="stroke">1</text>
      </g>
      <g transform="rotate(5 158 144)">
        <rect x="120" y="106" width="76" height="76" rx="14" fill="#7b61ff" stroke="${INK}" stroke-width="5"/>
        <text x="158" y="163" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="58" fill="#fff" stroke="${INK}" stroke-width="5" paint-order="stroke">2</text>
      </g>
      <g transform="rotate(-3 112 66)">
        <rect x="74" y="28" width="76" height="76" rx="14" fill="#ffd23f" stroke="${INK}" stroke-width="5"/>
        <text x="112" y="85" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="58" fill="#fff" stroke="${INK}" stroke-width="5" paint-order="stroke">3</text>
      </g>
      <g transform="translate(196 64)"><g class="hm-ball">
        <circle r="24" fill="#2bc48a"/>
        <path d="M-23 -6q23 16 46 0" fill="none" stroke="#fff" stroke-width="8"/>
        <circle r="24" fill="none" stroke="${INK}" stroke-width="5"/>
        <circle cx="-9" cy="-11" r="4" fill="#fff" opacity=".7"/>
      </g></g>`,

    // Cuadro colgado con un arcoíris y una estrella de premio.
    obras: `
      <defs><clipPath id="hm-mat"><rect x="62" y="48" width="116" height="92"/></clipPath></defs>
      <path d="M120 10L68 34M120 10l52 24" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
      <circle cx="120" cy="10" r="6" fill="#ffd23f" stroke="${INK}" stroke-width="3"/>
      <rect x="42" y="30" width="156" height="128" rx="12" fill="${INK}" opacity=".16" transform="translate(5 7)"/>
      <rect x="42" y="30" width="156" height="128" rx="12" fill="#ffb454" stroke="${INK}" stroke-width="5"/>
      <rect x="54" y="42" width="132" height="104" rx="4" fill="#ffd9a0" stroke="${INK}" stroke-width="3"/>
      <rect x="62" y="48" width="116" height="92" fill="#dff4ff" stroke="${INK}" stroke-width="4"/>
      <g clip-path="url(#hm-mat)" fill="none" stroke-width="10">
        <path d="M76 144a44 44 0 0 1 88 0" stroke="#ff5a5f"/>
        <path d="M86 144a34 34 0 0 1 68 0" stroke="#ffd23f"/>
        <path d="M96 144a24 24 0 0 1 48 0" stroke="#2bc48a"/>
        <path d="M106 144a14 14 0 0 1 28 0" stroke="#4cc3ff"/>
        <circle cx="160" cy="66" r="9" fill="#ffd23f" stroke="${INK}" stroke-width="3"/>
        <path d="M62 132h116v12H62z" fill="#2bc48a" stroke="none"/>
      </g>
      <g transform="translate(186 146)"><g class="hm-star">
        <path d="M0-34l10 20 22 3-16 15 4 22L0 16l-20 10 4-22-16-15 22-3z" fill="#ffd23f" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
        <circle cx="-7" cy="-4" r="3" fill="${INK}"/><circle cx="7" cy="-4" r="3" fill="${INK}"/>
        <path d="M-6 5q6 5 12 0" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
      </g></g>`,
  };

  const CARDS = [
    { id: 'colorear', to: 'dibujos', label: 'Colorear', pitch: 1 },
    { id: 'pizarra', to: 'pizarra', label: 'Pizarra', name: 'Pizarra mágica', pitch: 1.12 },
    { id: 'juegos', to: 'juegos', label: 'Juegos', pitch: 1.2 },
    { id: 'subir', to: 'subir', label: 'Subir foto', pitch: 1.3 },
    { id: 'obras', to: 'obras', label: 'Mis obras', pitch: 1.5 },
  ];

  const LETTERS = ['#ff5a5f', '#ff9f1c', '#f5b800', '#2bc48a', '#4cc3ff', '#7b61ff', '#ff6fb5', '#ff5a5f', '#2bc48a', '#ff9f1c'];

  /* ---------- Decoración de fondo (manchas, estrellitas, garabatos) ---------- */
  const DECO = [
    { cls: 'd1', svg: `<path d="M24 4l5.6 11.4 12.6 1.8-9.1 8.9 2.1 12.5L24 32.7l-11.2 5.9 2.1-12.5-9.1-8.9 12.6-1.8z" fill="#ffd23f"/>`, vb: '0 0 48 48' },
    { cls: 'd2', svg: `<path d="M8 34c6-20 14-22 18-8s12 12 16-6 12-14 14 0" fill="none" stroke="#ff8fc7" stroke-width="5" stroke-linecap="round"/>`, vb: '0 0 64 48' },
    { cls: 'd3', svg: `<path d="M30 6c14-2 26 10 24 24s-14 26-28 22S2 40 6 26 16 8 30 6z" fill="#4cc3ff"/>`, vb: '0 0 60 60' },
    { cls: 'd4', svg: `<circle cx="10" cy="10" r="7" fill="#2bc48a"/><circle cx="30" cy="18" r="5" fill="#ff9f1c"/><circle cx="16" cy="32" r="4" fill="#7b61ff"/>`, vb: '0 0 40 40' },
    { cls: 'd5', svg: `<path d="M24 40S7 29.5 7 18.5A9 9 0 0 1 24 14a9 9 0 0 1 17 4.5C41 29.5 24 40 24 40z" fill="#ff5a5f"/>`, vb: '0 0 48 48' },
    { cls: 'd6', svg: `<path d="M6 24c0-10 8-18 18-18s18 8 12 16-14 4-12-2 4-6 8-4" fill="none" stroke="#7b61ff" stroke-width="5" stroke-linecap="round"/>`, vb: '0 0 48 48' },
    { cls: 'd7', svg: `<path d="M24 4l5.6 11.4 12.6 1.8-9.1 8.9 2.1 12.5L24 32.7l-11.2 5.9 2.1-12.5-9.1-8.9 12.6-1.8z" fill="#ff9f1c"/>`, vb: '0 0 48 48' },
    { cls: 'd8', svg: `<path d="M28 4c12 0 22 8 20 20s-12 22-24 20S2 34 4 22 16 4 28 4z" fill="#ffd23f"/>`, vb: '0 0 52 48' },
  ];

  function decoLayer() {
    const layer = el('div.home-deco', { 'aria-hidden': 'true' });
    for (const d of DECO) {
      layer.insertAdjacentHTML('beforeend', `<svg class="deco ${d.cls}" viewBox="${d.vb}">${d.svg}</svg>`);
    }
    return layer;
  }

  /** Logo: ícono de la app (si existe) + "Colorines" con cada letra de un color. */
  function logo() {
    const img = el('img.home-icon', { src: 'icons/icon.svg', alt: '', draggable: 'false' });
    img.addEventListener('error', () => img.remove());
    const word = el('h1.home-title', { 'aria-label': 'Colorines' });
    'Colorines'.split('').forEach((ch, i) => {
      word.append(el('span.home-letter', {
        'aria-hidden': 'true',
        style: { color: LETTERS[i % LETTERS.length], animationDelay: (i * 0.12).toFixed(2) + 's' },
      }, ch));
    });
    return el('div.home-logo', null, [img, word]);
  }

  // Al volver al inicio con un doble toque (p. ej. sobre el botón de la casita), el segundo toque
  // no tiene que abrir enseguida otra sección.
  let mountedAt = 0;
  const tooSoon = () => performance.now() - mountedAt < 400;

  /* Escudo contra el doble (o triple) toque al ELEGIR: después de tocar una tarjeta, los toques
     que siguen enseguida caerían sobre la pantalla nueva (abrirían una categoría, un dibujo o el
     selector de archivos). Durante un ratito se tragan en fase de captura, antes que nadie los vea.
     Cada toque tragado estira el escudo (toques rápidos seguidos), hasta un máximo. */
  const SHIELD_MS = 450, SHIELD_MAX = 1300;
  const SHIELD_EVENTS = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'contextmenu'];
  let shieldEnd = 0, shieldLimit = 0, shieldTimer = 0;
  function swallow(ev) {
    const now = performance.now();
    if (now >= shieldEnd) { dropShield(); return; }
    ev.stopPropagation();
    if (ev.cancelable) ev.preventDefault();
    if (ev.type === 'pointerdown') {
      shieldEnd = Math.min(shieldLimit, Math.max(shieldEnd, now + SHIELD_MS));
      clearTimeout(shieldTimer);
      shieldTimer = setTimeout(dropShield, shieldEnd - now + 20);
    }
  }
  function dropShield() {
    clearTimeout(shieldTimer);
    shieldEnd = 0;
    SHIELD_EVENTS.forEach((t) => window.removeEventListener(t, swallow, true));
  }
  function shield() {
    const now = performance.now();
    dropShield();
    shieldEnd = now + SHIELD_MS;
    shieldLimit = now + SHIELD_MAX;
    SHIELD_EVENTS.forEach((t) => window.addEventListener(t, swallow, true));
    shieldTimer = setTimeout(dropShield, SHIELD_MS + 20);
  }

  /** Activa con un toque robusto: anda aunque haya otro dedo (o la palma) apoyado, cuando el navegador
      no genera 'click'. El ayudante es de la galería (se carga antes); si faltara, queda el click. */
  function onTap(node, fn) {
    if (CL.gallery && typeof CL.gallery.onTap === 'function') return CL.gallery.onTap(node, fn);
    node.addEventListener('click', fn);
    return node;
  }

  /** Elegir una sección: sonido, escudo y navegar. */
  function choose(to, sound, opts) {
    if (tooSoon()) return;
    CL.sound.play(sound, opts);
    shield();
    CL.router.go(to);
  }

  function card(c, i) {
    const b = el('button.home-card.home-card--' + c.id, {
      type: 'button',
      'aria-label': c.name || c.label,
      title: c.name || c.label,
      style: { animationDelay: (0.06 + i * 0.07).toFixed(2) + 's' },
    });
    b.insertAdjacentHTML('beforeend',
      `<svg class="home-art" viewBox="0 0 240 200" aria-hidden="true" focusable="false">${ART[c.id]}</svg>`);
    b.append(el('span.home-label', { 'aria-hidden': 'true' }, c.label));
    onTap(b, () => choose(c.to, 'select', { pitch: c.pitch }));
    const wrap = el('div.home-cell', null, b);
    if (c.id === 'pizarra') {
      // Accesos chiquitos a los otros modos de la pizarra.
      const mini = (icon, label, to) =>
        onTap(CL.ui.button({ icon, label, cls: 'btn-sm home-mini', sound: null }), () => choose(to, 'sparkle'));
      const minis = el('div.home-minis', null, [
        mini('modeNeon', 'Neón', 'neon'),
        mini('modeFuegos', 'Fuegos artificiales', 'fuegos'),
      ]);
      wrap.append(minis);
    }
    return wrap;
  }

  /* ---------- Para los grandes: "Para familias" y "Ayuda" ---------- */
  CL.icons.add({
    // Dos grandes y un chico adelante.
    homeFamily: `<circle cx="15" cy="12.5" r="6" fill="#ffd9b8" ${CL.icons.STROKE}/>
      <path d="M4.5 40c0-9.5 4.7-15.5 10.5-15.5S25.5 30.5 25.5 40z" fill="#4cc3ff" ${CL.icons.STROKE}/>
      <circle cx="33" cy="12.5" r="6" fill="#c98a5e" ${CL.icons.STROKE}/>
      <path d="M22.5 40c0-9.5 4.7-15.5 10.5-15.5S43.5 30.5 43.5 40z" fill="#ff8fc7" ${CL.icons.STROKE}/>
      <circle cx="24" cy="27" r="5" fill="#ffe3c4" ${CL.icons.STROKE}/>
      <path d="M16 44c0-6.5 3.6-10.5 8-10.5s8 4 8 10.5z" fill="#ffd23f" ${CL.icons.STROKE}/>`,
    homeHelp: `<circle cx="24" cy="24" r="19" fill="#4cc3ff" ${CL.icons.STROKE}/>
      <path d="M17.8 18.6a6.4 6.4 0 1 1 9.4 5.7c-2 1.1-3.2 2.3-3.2 4.5v1.2" fill="none" stroke="#fff" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="24" cy="35.8" r="2.7" fill="#fff"/>`,
    homeShare: `<path d="M16.5 19.5H11a3 3 0 0 0-3 3V38a3 3 0 0 0 3 3h26a3 3 0 0 0 3-3V22.5a3 3 0 0 0-3-3h-5.5" fill="#e3f5ff" ${CL.icons.STROKE}/>
      <path d="M24 30V7.5" stroke="#2bc48a" stroke-width="5" stroke-linecap="round"/>
      <path d="M15.5 15l8.5-8.5 8.5 8.5" fill="none" stroke="#2bc48a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`,
    homePalette: `<circle cx="14" cy="17" r="8.5" fill="#ff5a5f" ${CL.icons.STROKE}/>
      <circle cx="30" cy="15" r="8.5" fill="#ffd23f" ${CL.icons.STROKE}/>
      <circle cx="22" cy="30" r="8.5" fill="#4cc3ff" ${CL.icons.STROKE}/>
      <circle cx="37" cy="33" r="6" fill="#2bc48a" ${CL.icons.STROKE}/>`,
  });

  const SITE = 'www.colorines.com.ar';
  const SHARE = {
    title: 'Colorines',
    text: 'Colorines: para pintar, dibujar y jugar. Gratis, sin publicidad y pensada para chicos de 3 a 8 años.',
    url: 'https://' + SITE,
  };

  /** Comparte el enlace (menú de compartir del teléfono) o, si no se puede, lo copia. */
  async function share() {
    try {
      if (navigator.share) { await navigator.share(SHARE); return; }
    } catch (e) {
      if (e && e.name === 'AbortError') return; // cerró el menú sin elegir
    }
    try {
      await navigator.clipboard.writeText(SHARE.url);
      CL.ui.toast('check');
    } catch (e) {
      CL.sound.play('nope');
    }
  }

  const p = (...parts) => el('p', null, parts);
  const b = (t) => el('strong', null, t);
  const list = (items) => el('ul', null, items.map((i) => el('li', null, i)));

  /** Ventana para los grandes (texto con scroll adentro). */
  function infoModal(cls, children) {
    const m = CL.ui.modal(el('div.hm-info.' + cls, null, children), { cls: 'home-modal' });
    m.root.classList.add('scroll-y');
    return m;
  }

  function openFamily() {
    const head = el('div.hm-info-head', null, [
      el('img.hm-info-logo', { src: 'icons/icon.svg', alt: '', draggable: 'false' }),
      el('div', null, [el('h2', null, 'Colorines, para las familias'), el('div.hm-info-site', null, SITE)]),
    ]);
    const shareBtn = CL.ui.button({ icon: 'homeShare', text: 'Compartir Colorines', label: 'Compartir Colorines', cls: 'btn-pill btn-go hm-share', sound: 'pop', onTap: share });
    infoModal('hm-family', [
      head,
      el('h3', null, '¿Qué es Colorines?'),
      p('Es una app gratuita para que chicas y chicos de ', b('3 a 8 años'), ' pinten, dibujen y jueguen desde la tablet, el celular o la compu. ',
        'Está pensada para ', b('aprender jugando'), ': todo se maneja con dibujos y botones grandes, así que no hace falta saber leer.'),
      el('h3', null, '¿Qué aprenden?'),
      list([
        [b('Colores y números'), ': en Juegos tocan un color o un número y lo escuchan en voz alta; con los números también cuentan.'],
        [b('Motricidad fina'), ': pintar una zona, seguir un contorno, elegir el grosor del pincel.'],
        [b('Creatividad'), ': combinan colores, rellenos y patrones, dibujan libremente y guardan sus obras.'],
        [b('Autonomía'), ': pueden usarla solos, sin menús escondidos ni textos para leer.'],
      ]),
      el('h3', null, 'Tranquila y segura'),
      list([
        'Sin publicidad, sin cuentas y sin pedir datos.',
        'Todo lo que hacen se guarda sólo en este dispositivo: nada se sube a internet.',
        'Después de la primera vez funciona sin internet, y se puede instalar como una app.',
        'Para borrar algo hay que mantener apretado el botón: un toque sin querer no borra nada.',
      ]),
      el('h3', null, 'Ideas para acompañar'),
      list([
        'Pregúntenles de qué color van a pintar cada parte y nombren juntos los colores.',
        'Desde Mis obras pueden descargar o imprimir sus dibujos, pintados o sin pintar, para colorearlos con crayones.',
      ]),
      el('div.hm-help-us', null, [
        el('h3', null, [CL.icon('heart'), '¿Quieren colaborar?']),
        p('Colorines es gratis. Muy pronto van a poder colaborar con una ', b('donación'), ' para que siga creciendo con más dibujos y juegos. ',
          'Por ahora, la mejor ayuda es ', b('compartirla'), ': pásenle el enlace a la mayor cantidad de familias, amigos y docentes. ¡Gracias!'),
        shareBtn,
      ]),
    ]);
  }

  function openHelp() {
    const row = (icon, ...text) => el('div.hm-row', null, [CL.icon(icon), el('p', null, text)]);
    const section = (icon, title, rows) => el('section.hm-sec', null, [el('h3', null, [CL.icon(icon), title]), ...rows]);
    infoModal('hm-help', [
      el('h2', null, 'Ayuda: cómo se usa'),
      p('Todo se maneja con toques. Para borrar cualquier cosa hay que ', b('mantener apretado'), ' el botón hasta que se llene el anillo.'),
      section('home', 'Inicio', [
        row('galColorear', b('Colorear'), ': elegí una categoría y un dibujo para pintar.'),
        row('modePizarra', b('Pizarra'), ': dibujo libre. Los botoncitos de la tarjeta llevan a ', b('Neón'), ' y a ', b('Fuegos artificiales'), '.'),
        row('jgJuegos', b('Juegos'), ': Colores y Números, con voz.'),
        row('camera', b('Subir foto'), ': convertí una foto o un dibujo en una página para colorear.'),
        row('gallery', b('Mis obras'), ': todo lo que pintaron y dibujaron.'),
        row('soundOn', b('Sonido'), ': prende y apaga los sonidos y la voz.'),
      ]),
      section('galColorear', 'Colorear', [
        row('clBucket', b('Balde'), ': tocá una zona y se pinta entera.'),
        row('clBrush', b('Pincel'), ': pintá con el dedo, el lápiz o el mouse. Los puntitos eligen el grosor.'),
        row('clClipOn', b('No salirse'), ': con el corazón prendido, el pincel respeta las líneas del dibujo.'),
        row('clEraser', b('Goma'), ': borra lo pintado.'),
        row('undo', b('Deshacer'), ' y ', b('rehacer'), ' (también con Ctrl+Z y Ctrl+Y).'),
        row('clClear', b('Borrar todo'), ': mantené apretado para empezar de nuevo (se puede deshacer).'),
        row('clZoomIn', b('Zoom'), ': pellizcá con dos dedos, usá la rueda del mouse o estos botones.'),
        row('homePalette', b('Colores'), ': tocá uno para pintar con él. ', b('Mantenelo apretado'), ' (o clic derecho) para elegirlo como ',
          b('segundo color'), ' de los rellenos especiales: el de los lunares, las estrellas, la otra punta del degradé...'),
        row('star', b('Rellenos especiales'), ': arcoíris, degradé, brillitos, lunares, estrellas, corazones, rompecabezas, ondas y escamas. ',
          'El círculo con el arcoíris elige cualquier color.'),
        row('check', b('¡Terminé!'), ': guarda la obra en Mis obras con un festejo. Igual todo se guarda solo mientras pintan.'),
      ]),
      section('modePizarra', 'Pizarra, Neón y Fuegos', [
        row('modePizarra', b('Pizarra mágica'), ': lápiz, fibra, pincel, crayón, aerosol, sellos y goma, en 4 grosores y con distintos fondos. ',
          'Para borrar todo, deslizá la barrita.'),
        row('modeNeon', b('Neón'), ': trazos que brillan. El espejo repite el dibujo en 2, 4, 6 u 8 partes.'),
        row('modeFuegos', b('Fuegos artificiales'), ': dibujá una mecha y mirá cómo explota. Con varios dedos, varios fuegos a la vez.'),
      ]),
      section('camera', 'Subir foto', [
        row('photo', 'Elegí una foto o sacala con la cámara. Se pasa a blanco y negro (podés ajustar cuánto) y queda en ',
          b('Mis dibujos'), ', dentro de Colorear, lista para pintar.'),
      ]),
      section('gallery', 'Mis obras', [
        row('galDone', b('Terminadas'), ' y ', b('sin terminar'), ': tocá una obra para verla grande.'),
        row('pencilEdit', b('Seguir'), ' pintando o dibujando esa obra.'),
        row('download', b('Descargar'), ' la imagen. En los dibujos para colorear pregunta si la querés pintada o sin pintar.'),
        row('print', b('Imprimir'), ': arma un PDF con el logo de Colorines, pintado o para pintar a mano.'),
        row('trash', b('Borrar'), ': mantené apretado.'),
      ]),
      section('jgJuegos', 'Juegos', [
        row('jgColores', b('Colores'), ': tocá un color y escuchá su nombre.'),
        row('jgNumeros', b('Números'), ': tocá un número del 0 al 10, escuchalo y contá las cosas.'),
      ]),
    ]);
  }

  function footer() {
    const btn = (icon, text, fn) => {
      const x = CL.ui.button({ icon, text, label: text, cls: 'btn-pill home-foot-btn', sound: null });
      return onTap(x, () => { if (tooSoon()) return; CL.sound.play('open'); fn(); });
    };
    return el('footer.home-foot', null, [btn('homeFamily', 'Para familias', openFamily), btn('homeHelp', 'Ayuda', openHelp)]);
  }

  CL.router.register('inicio', {
    mount(root) {
      mountedAt = performance.now();
      root.append(decoLayer());
      const top = el('header.home-top', null, [logo(), el('div.home-sound', null, CL.ui.muteButton())]);
      const grid = el('nav.home-grid', { 'aria-label': 'Elegí qué hacer' }, CARDS.map(card));
      root.append(top, el('div.home-stage', null, grid), footer());
    },
    unmount() {},
  });
})(window.CL);
