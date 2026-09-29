/* Colorines — íconos SVG a color (viewBox 0 0 48 48).
   Los módulos agregan los suyos con CL.icons.add({ nombre: '<path .../>' }).
   CL.icon('nombre') devuelve un <svg> listo para insertar. */
'use strict';
(function (CL) {
  const INK = '#2b2240';
  const S = `stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"`;
  const lib = Object.create(null);

  const icons = {
    INK,
    /** Atributos de trazo estándar para dibujar íconos con el mismo estilo. */
    STROKE: S,
    add(map) { Object.assign(lib, map); },
    has(name) { return name in lib; },
    svg(name) {
      const body = lib[name] || lib.star;
      return `<svg class="icon" viewBox="0 0 48 48" aria-hidden="true" focusable="false">${body}</svg>`;
    },
  };

  icons.add({
    home: `<path d="M10 22v17a3 3 0 0 0 3 3h22a3 3 0 0 0 3-3V22" fill="#ffd23f" ${S}/>
      <rect x="19.5" y="28" width="9" height="14" rx="2" fill="#4cc3ff" ${S}/>
      <path d="M5 24 24 7l19 17" fill="none" stroke="#ff5a5f" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>`,
    back: `<path d="M29 9 14 24l15 15" fill="none" stroke="${INK}" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>`,
    close: `<path d="M13 13l22 22M35 13 13 35" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`,
    undo: `<path d="M13 19h16a10 10 0 0 1 0 20h-9" fill="none" stroke="#7b61ff" stroke-width="5.5" stroke-linecap="round"/>
      <path d="M20 10l-9 9 9 9" fill="none" stroke="#7b61ff" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>`,
    redo: `<path d="M35 19H19a10 10 0 0 0 0 20h9" fill="none" stroke="#2bb3ff" stroke-width="5.5" stroke-linecap="round"/>
      <path d="M28 10l9 9-9 9" fill="none" stroke="#2bb3ff" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>`,
    trash: `<path d="M12 16h24l-2.2 23.5a3 3 0 0 1-3 2.5H17.2a3 3 0 0 1-3-2.5z" fill="#ff8fa3" ${S}/>
      <path d="M8.5 15h31M19 14.5V10h10v4.5" fill="none" ${S}/>
      <path d="M20 22v13M28 22v13" fill="none" ${S}/>`,
    soundOn: `<path d="M7 19h8l10-8v26l-10-8H7z" fill="#ffd23f" ${S}/>
      <path d="M31 18.5a8 8 0 0 1 0 11M35.5 13.5a15 15 0 0 1 0 21" fill="none" stroke="#2bc48a" stroke-width="3.8" stroke-linecap="round"/>`,
    soundOff: `<path d="M7 19h8l10-8v26l-10-8H7z" fill="#d7d2e3" ${S}/>
      <path d="M31 18l10 12M41 18 31 30" fill="none" stroke="#ff5a5f" stroke-width="4.5" stroke-linecap="round"/>`,
    check: `<circle cx="24" cy="24" r="19" fill="#2bc48a" ${S}/>
      <path d="m14.5 24.5 6.5 6.5 12.5-14" fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>`,
    download: `<path d="M9 31v6a3 3 0 0 0 3 3h24a3 3 0 0 0 3-3v-6" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M24 7v22" stroke="#2bb3ff" stroke-width="5.5" stroke-linecap="round"/>
      <path d="m15 21 9 9 9-9" fill="none" stroke="#2bb3ff" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>`,
    plus: `<path d="M24 11v26M11 24h26" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`,
    minus: `<path d="M11 24h26" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`,
    camera: `<path d="M16 14.5l3-5h10l3 5" fill="#ffd23f" ${S}/>
      <rect x="5.5" y="14.5" width="37" height="25" rx="5" fill="#4cc3ff" ${S}/>
      <circle cx="24" cy="27" r="7.5" fill="#fff" ${S}/><circle cx="24" cy="27" r="3" fill="${INK}"/>
      <circle cx="36" cy="20" r="1.8" fill="#fff"/>`,
    photo: `<rect x="6.5" y="9" width="35" height="30" rx="4" fill="#e3f5ff" ${S}/>
      <circle cx="17" cy="19" r="4.2" fill="#ffd23f" stroke="${INK}" stroke-width="2.5"/>
      <path d="M8 36.5l10.5-11 7 7 5-5 9.5 9.5" fill="#2bc48a" ${S}/>`,
    gallery: `<rect x="5.5" y="7.5" width="37" height="33" rx="4" fill="#ffb454" ${S}/>
      <rect x="11" y="13" width="26" height="22" rx="1.5" fill="#fff" ${S}/>
      <path d="M24 16.5l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.6-4.8 2.6.9-5.4-3.9-3.8 5.4-.8z" fill="#ffd23f" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`,
    star: `<path d="M24 5.5l5.6 11.4 12.6 1.8-9.1 8.9 2.1 12.5L24 34.2l-11.2 5.9 2.1-12.5-9.1-8.9 12.6-1.8z" fill="#ffd23f" ${S}/>`,
    heart: `<path d="M24 40S7 29.5 7 18.5A9 9 0 0 1 24 14a9 9 0 0 1 17 4.5C41 29.5 24 40 24 40z" fill="#ff5a8a" ${S}/>`,
    hand: `<path d="M19 27V11.5a3 3 0 0 1 6 0V24v-4.5a3 3 0 0 1 6 0V25v-3a3 3 0 0 1 6 0v8c0 7-4.5 12-11.5 12-5 0-8-2.5-10.5-6.5l-4.5-7a3 3 0 0 1 5-3.3z" fill="#ffd9b8" ${S}/>`,
    play: `<circle cx="24" cy="24" r="19" fill="#ff9f1c" ${S}/><path d="M20 15.5v17l13-8.5z" fill="#fff" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>`,
    pencilEdit: `<path d="M9 39l2.5-9.5L31 10a3.5 3.5 0 0 1 5 0l2 2a3.5 3.5 0 0 1 0 5L18.5 36.5z" fill="#ffd23f" ${S}/>
      <path d="M11.5 29.5l7 7M28 13l7 7" fill="none" ${S}/>`,
    folder: `<path d="M5.5 14a3 3 0 0 1 3-3h10l4 4.5h17a3 3 0 0 1 3 3V37a3 3 0 0 1-3 3h-31a3 3 0 0 1-3-3z" fill="#ffc94a" ${S}/>
      <path d="M5.5 20.5h37" fill="none" ${S}/>`,
  });

  CL.icons = icons;

  /** Devuelve un elemento <svg> del ícono. */
  CL.icon = (name, cls) => {
    const t = document.createElement('template');
    t.innerHTML = icons.svg(name).trim();
    const svg = t.content.firstChild;
    if (cls) svg.classList.add(...cls.split(' '));
    return svg;
  };
})(window.CL);
