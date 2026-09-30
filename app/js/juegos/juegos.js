/* Colorines — juegos (#juegos, #juegos/colores, #juegos/numeros).
   - Menú con dos tarjetas grandes: Colores y Números.
   - Colores: gotitas de colores con el nombre abajo en MAYÚSCULAS; al tocar una se escucha su nombre.
   - Números: del 0 al 10, cada uno con esa cantidad de cosas (1 vaca, 2 caramelos...); al tocarlo se escucha
     el número y las cosas, que saltan de a una.
   La voz es la del navegador (speechSynthesis): se usa "Microsoft Sabina - Spanish (Mexico)" si está; si no, la
   voz por defecto del sistema si habla español, y si no, cualquier voz en español (o la por defecto). El botón
   de sonido también la apaga. Sin voz igual hay un "pop" y la animación. */
'use strict';
(function (CL) {
  const U = CL.util;
  const el = U.el;
  const INK = CL.icons.INK;
  const S = CL.icons.STROKE;

  /* ---------- voz ---------- */
  const synth = 'speechSynthesis' in window && window.SpeechSynthesisUtterance ? window.speechSynthesis : null;
  let voice = null;
  function pickVoice() {
    let all = [];
    try { all = synth ? synth.getVoices() : []; } catch (e) { all = []; }
    const es = (v) => /^es([-_]|$)/i.test(v.lang || '');
    return all.find((v) => /sabina/i.test(v.name))
      || all.find((v) => v.default && es(v))
      || all.find((v) => es(v) && /mx/i.test(v.lang))
      || all.find(es)
      || all.find((v) => v.default)
      || null;
  }
  if (synth) {
    voice = pickVoice();
    // En Chrome la lista de voces llega un ratito después de abrir la página.
    const update = () => { voice = pickVoice(); };
    if (synth.addEventListener) synth.addEventListener('voiceschanged', update);
    else synth.onvoiceschanged = update;
  }
  /** Dice `text` en voz alta (corta lo que estaba diciendo). false si no hay voz o el sonido está apagado. */
  function say(text) {
    if (!synth || CL.sound.isMuted()) return false;
    try {
      if (synth.speaking || synth.pending) synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      if (!voice) voice = pickVoice();
      if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = 'es-MX';
      u.rate = 0.9;
      u.pitch = 1.08;
      synth.speak(u);
      return true;
    } catch (e) {
      return false;
    }
  }
  const hush = () => { try { if (synth) synth.cancel(); } catch (e) { /* nada */ } };

  /* ---------- dibujos ---------- */
  /** Gotita de pintura con carita (viewBox 0 0 100 100), como la del ícono de la app. */
  function drop(hex) {
    const mouth = CL.fills && CL.fills.luma(hex) < 110 ? '#fff' : INK;
    return `<path d="M50 5C63 25 83 45 83 66a33 33 0 0 1-66 0C17 45 37 25 50 5z" fill="${hex}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M31 57c1.5-9 6-16.5 11.5-22.5" fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round" opacity=".65"/>
      <circle cx="39" cy="66" r="8" fill="#fff" stroke="${INK}" stroke-width="2.5"/><circle cx="61" cy="66" r="8" fill="#fff" stroke="${INK}" stroke-width="2.5"/>
      <circle cx="40" cy="67.5" r="4.4" fill="${INK}"/><circle cx="62" cy="67.5" r="4.4" fill="${INK}"/>
      <circle cx="41.6" cy="65.6" r="1.5" fill="#fff"/><circle cx="63.6" cy="65.6" r="1.5" fill="#fff"/>
      <ellipse cx="28.5" cy="79" rx="5.5" ry="3.6" fill="#ff8fb3" opacity=".75"/><ellipse cx="71.5" cy="79" rx="5.5" ry="3.6" fill="#ff8fb3" opacity=".75"/>
      <path d="M42 81q8 7 16 0" fill="none" stroke="${mouth}" stroke-width="4" stroke-linecap="round"/>`;
  }

  // Cosas para contar (viewBox 0 0 48 48, mismo estilo que los íconos).
  const ITEMS = {
    vaca: `<path d="M12 16c-5-3-10-1-9 3s6 4 9 2" fill="#fff" ${S}/>
      <path d="M36 16c5-3 10-1 9 3s-6 4-9 2" fill="#fff" ${S}/>
      <path d="M15 12l-2.5-7.5 5.5 5.5z" fill="#f2d49b" ${S}/>
      <path d="M33 12l2.5-7.5-5.5 5.5z" fill="#f2d49b" ${S}/>
      <rect x="11" y="9" width="26" height="32" rx="12.5" fill="#fff" ${S}/>
      <path d="M15.5 13.5c3-1.5 6.5 0 6 3.5s-4.5 4-6.5 2-2-4.5.5-5.5z" fill="${INK}"/>
      <path d="M30 12.5c2.5-.5 4.5 1.5 3.5 4s-3.5 2.5-4.5 1-1.5-4.5 1-5z" fill="${INK}"/>
      <circle cx="19" cy="23" r="2.4" fill="${INK}"/><circle cx="29" cy="23" r="2.4" fill="${INK}"/>
      <ellipse cx="24" cy="33.5" rx="11" ry="7.5" fill="#ffb3c7" ${S}/>
      <ellipse cx="20" cy="33.5" rx="1.6" ry="2.1" fill="${INK}"/><ellipse cx="28" cy="33.5" rx="1.6" ry="2.1" fill="${INK}"/>`,
    caramelo: `<path d="M14 24 4 16.5v15z" fill="#ffd23f" ${S}/>
      <path d="M34 24l10-7.5v15z" fill="#ffd23f" ${S}/>
      <circle cx="24" cy="24" r="11" fill="#ff5a8a" ${S}/>
      <path d="M17.5 18.5c4 1.5 7.5 6 7.5 13.5M24 13.5c3.5 3.5 5 9 4 16.5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`,
    pelota: `<circle cx="24" cy="24" r="18" fill="#ff5a5f" ${S}/>
      <path d="M24 6c-7 4.5-10 11-10 18s3 13.5 10 18c7-4.5 10-11 10-18S31 10.5 24 6z" fill="#ffd23f" ${S}/>
      <path d="M24 6c-3 4.5-4 11-4 18s1 13.5 4 18c3-4.5 4-11 4-18s-1-13.5-4-18z" fill="#fff" ${S}/>
      <ellipse cx="14.5" cy="15" rx="2.6" ry="4.2" fill="#fff" opacity=".65" transform="rotate(35 14.5 15)"/>`,
    estrella: `<path d="M24 5.5l5.6 11.4 12.6 1.8-9.1 8.9 2.1 12.5L24 34.2l-11.2 5.9 2.1-12.5-9.1-8.9 12.6-1.8z" fill="#ffd23f" ${S}/>
      <circle cx="20.5" cy="22" r="1.9" fill="${INK}"/><circle cx="27.5" cy="22" r="1.9" fill="${INK}"/>
      <path d="M21 26.5q3 2.6 6 0" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`,
    flor: `<g fill="#ff8fc7" ${S}><circle cx="24" cy="11" r="7"/><circle cx="36.4" cy="20" r="7"/><circle cx="31.6" cy="34.6" r="7"/><circle cx="16.4" cy="34.6" r="7"/><circle cx="11.6" cy="20" r="7"/></g>
      <circle cx="24" cy="24" r="7.5" fill="#ffd23f" ${S}/>`,
    manzana: `<path d="M24 14.5c-4-3-12-3.5-15.5 3C4.5 25 9 38 15 40.5c3 1.3 6 .8 9-.7 3 1.5 6 2 9 .7 6-2.5 10.5-15.5 6.5-23-3.5-6.5-11.5-6-15.5-3z" fill="#ff5a5f" ${S}/>
      <path d="M24 14.5c0-4 1-7 3-9" fill="none" ${S}/>
      <path d="M26.5 10c3-4 8-4.5 10.5-2.5-2 4.5-7 5.5-10.5 2.5z" fill="#2bc48a" ${S}/>
      <ellipse cx="15.5" cy="22" rx="2.4" ry="4.2" fill="#fff" opacity=".6" transform="rotate(20 15.5 22)"/>`,
    pez: `<path d="M33 24l11-8.5v17z" fill="#ff9f1c" ${S}/>
      <ellipse cx="21" cy="24" rx="16" ry="11.5" fill="#ffb454" ${S}/>
      <path d="M24 13.5c3.5 3 3.5 18 0 21" fill="none" stroke="#ff9f1c" stroke-width="3" stroke-linecap="round"/>
      <circle cx="12.5" cy="21.5" r="3" fill="${INK}"/><circle cx="13.4" cy="20.6" r="1" fill="#fff"/>
      <path d="M7.5 27.5q2.5 1.8 5 0" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`,
    corazon: `<path d="M24 40S7 29.5 7 18.5A9 9 0 0 1 24 14a9 9 0 0 1 17 4.5C41 29.5 24 40 24 40z" fill="#ff5a8a" ${S}/>
      <ellipse cx="15" cy="19" rx="2.3" ry="3.6" fill="#fff" opacity=".6" transform="rotate(-30 15 19)"/>`,
    globo: `<path d="M24 34c-1.5 3.5-3.5 6-2 9s-1 3.5-2.5 4" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
      <path d="M21.5 34.5h5L24 31z" fill="#7b61ff" ${S}/>
      <ellipse cx="24" cy="18" rx="12" ry="14" fill="#7b61ff" ${S}/>
      <ellipse cx="19" cy="12.5" rx="2.8" ry="5" fill="#fff" opacity=".5" transform="rotate(-20 19 12.5)"/>`,
    mariposa: `<path d="M23 22C18 9 6 6 5.5 14.5 5 21 13 24 23 24z" fill="#4cc3ff" ${S}/>
      <path d="M25 22c5-13 17-16 17.5-7.5.5 6.5-7.5 9.5-17.5 9.5z" fill="#4cc3ff" ${S}/>
      <path d="M23 26c-8 0-13 4-11.5 9s9 3.5 11.5-4z" fill="#ffd23f" ${S}/>
      <path d="M25 26c8 0 13 4 11.5 9s-9 3.5-11.5-4z" fill="#ffd23f" ${S}/>
      <rect x="21.5" y="15" width="5" height="22" rx="2.5" fill="${INK}"/>
      <path d="M23 15.5c-1.5-4-3.5-6-6-7M25 15.5c1.5-4 3.5-6 6-7" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`,
  };

  const block = (x, y, color, digit) =>
    `<rect x="${x}" y="${y}" width="64" height="64" rx="12" fill="${color}" stroke="${INK}" stroke-width="5"/>` +
    `<text x="${x + 32}" y="${y + 49}" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="48" fill="#fff" stroke="${INK}" stroke-width="4" paint-order="stroke">${digit}</text>`;
  const thing = (name, x, y, s) => `<svg x="${x}" y="${y}" width="${s}" height="${s}" viewBox="0 0 48 48">${ITEMS[name]}</svg>`;

  // Ilustraciones de las tarjetas del menú (viewBox 240×200).
  const ART = {
    colores: `<ellipse cx="120" cy="188" rx="96" ry="8" fill="${INK}" opacity=".12"/>
      <g transform="translate(66 28) scale(1.24)">${drop('#ffd52e')}</g>
      <g transform="translate(10 76) scale(1.08)">${drop('#f23a3a')}</g>
      <g transform="translate(122 76) scale(1.08)">${drop('#2d68e0')}</g>
      <g fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"><path d="M200 30a16 16 0 0 1 0 26M213 20a31 31 0 0 1 0 46"/></g>`,
    numeros: `<ellipse cx="120" cy="188" rx="104" ry="8" fill="${INK}" opacity=".12"/>
      ${block(18, 110, '#ff5a5f', '1')}${block(88, 110, '#ffd23f', '2')}${block(158, 110, '#4cc3ff', '3')}
      ${thing('estrella', 31, 60, 38)}
      ${thing('corazon', 87, 66, 32)}${thing('corazon', 121, 66, 32)}
      ${thing('pelota', 156, 72, 26)}${thing('pelota', 177, 72, 26)}${thing('pelota', 198, 72, 26)}`,
  };

  CL.icons.add({
    // Tres gotitas de pintura (juego de los colores).
    jgColores: `<path d="M15 7c4 6 8.5 10 8.5 15a8.5 8.5 0 0 1-17 0C6.5 17 11 13 15 7z" fill="#ff5a5f" ${S}/>
      <path d="M33 7c4 6 8.5 10 8.5 15a8.5 8.5 0 0 1-17 0C24.5 17 29 13 33 7z" fill="#ffd23f" ${S}/>
      <path d="M24 20c4 6 8.5 10 8.5 15a8.5 8.5 0 0 1-17 0C15.5 30 20 26 24 20z" fill="#4cc3ff" ${S}/>`,
    // Bloques 1, 2, 3 (juego de los números).
    jgNumeros: `<rect x="3.5" y="24" width="19" height="19" rx="4" fill="#ff5a5f" ${S}/>
      <rect x="25.5" y="24" width="19" height="19" rx="4" fill="#4cc3ff" ${S}/>
      <rect x="14.5" y="4.5" width="19" height="19" rx="4" fill="#ffd23f" ${S}/>
      <g font-family="Fredoka, sans-serif" font-weight="700" font-size="14" text-anchor="middle" fill="#fff" stroke="${INK}" stroke-width="2.5" paint-order="stroke">
      <text x="13" y="38.5">1</text><text x="35" y="38.5">2</text><text x="24" y="19">3</text></g>`,
    // Pelota y bloque (la sección de juegos).
    jgJuegos: `<rect x="4.5" y="17.5" width="21" height="21" rx="4.5" fill="#7b61ff" ${S}/>
      <text x="15" y="33.5" font-family="Fredoka, sans-serif" font-weight="700" font-size="15" text-anchor="middle" fill="#fff" stroke="${INK}" stroke-width="2.5" paint-order="stroke">1</text>
      <circle cx="33" cy="30" r="11" fill="#2bc48a" ${S}/>
      <path d="M22.5 27q10.5 7 21 0" fill="none" stroke="#fff" stroke-width="3.5"/>
      <circle cx="33" cy="30" r="11" fill="none" ${S}/>`,
  });

  /* ---------- datos ---------- */
  const COLORS = [
    ['ROJO', '#f23a3a'], ['NARANJA', '#ff8a1c'], ['AMARILLO', '#ffd52e'], ['VERDE', '#27ae4f'],
    ['CELESTE', '#4cc3ff'], ['AZUL', '#2d68e0'], ['VIOLETA', '#8a4fdf'], ['ROSA', '#ff7eb6'],
    ['MARRÓN', '#8a5a2b'], ['NEGRO', '#262626'], ['BLANCO', '#ffffff'], ['GRIS', '#9a9aa4'],
  ];
  const NUMBERS = [
    { n: 0, item: null, say: 'Cero. No hay nada.' },
    { n: 1, item: 'vaca', say: 'Uno. Una vaca.' },
    { n: 2, item: 'caramelo', say: 'Dos. Dos caramelos.' },
    { n: 3, item: 'pelota', say: 'Tres. Tres pelotas.' },
    { n: 4, item: 'estrella', say: 'Cuatro. Cuatro estrellas.' },
    { n: 5, item: 'flor', say: 'Cinco. Cinco flores.' },
    { n: 6, item: 'manzana', say: 'Seis. Seis manzanas.' },
    { n: 7, item: 'pez', say: 'Siete. Siete peces.' },
    { n: 8, item: 'corazon', say: 'Ocho. Ocho corazones.' },
    { n: 9, item: 'globo', say: 'Nueve. Nueve globos.' },
    { n: 10, item: 'mariposa', say: 'Diez. Diez mariposas.' },
  ];
  const NUM_COLORS = ['#9a9aa4', '#ff5a5f', '#ff9f1c', '#f5b800', '#2bc48a', '#4cc3ff', '#2d68e0', '#7b61ff', '#ff6fb5', '#c8187c', '#27ae4f'];

  const GAMES = {
    colores: { label: 'Colores', icon: 'jgColores', build: colorsGame },
    numeros: { label: 'Números', icon: 'jgNumeros', build: numbersGame },
  };

  /* ---------- pantalla ---------- */
  /** Toque robusto (anda con la palma apoyada); el ayudante es de la galería. */
  function onTap(node, fn) {
    if (CL.gallery && typeof CL.gallery.onTap === 'function') return CL.gallery.onTap(node, fn);
    node.addEventListener('click', fn);
    return node;
  }
  const svg = (inner, cls, vb = '0 0 100 100') => {
    const t = document.createElement('template');
    t.innerHTML = `<svg class="${cls}" viewBox="${vb}" aria-hidden="true" focusable="false">${inner}</svg>`;
    return t.content.firstChild;
  };
  const title = (icon, text) => el('div.jg-title', null, [CL.icon(icon), el('span', null, text)]);

  /** Anima un elemento de nuevo (aunque ya estuviera animándose) y dice el texto. */
  function talk(node, text, pitch) {
    node.classList.remove('jg-talk');
    void node.offsetWidth;
    node.classList.add('jg-talk');
    if (!say(text)) CL.sound.play('pop', { pitch });
  }

  function menu(root) {
    const bar = el('div.topbar.jg-bar', null, [CL.ui.homeButton(), title('jgJuegos', 'Juegos'), el('div.spacer'), CL.ui.muteButton()]);
    const cards = Object.keys(GAMES).map((id, i) => {
      const g = GAMES[id];
      const b = el('button.jg-card.jg-card--' + id, { type: 'button', 'aria-label': g.label, title: g.label, style: { animationDelay: (0.05 + i * 0.08) + 's' } });
      b.append(svg(ART[id], 'jg-art', '0 0 240 200'), el('span.jg-card-label', null, g.label));
      onTap(b, () => { CL.sound.play('select', { pitch: 1 + i * 0.15 }); CL.router.go('juegos/' + id); });
      return b;
    });
    root.append(bar, el('div.jg-menu', null, el('nav.jg-menu-in', { 'aria-label': 'Elegí un juego' }, cards)));
  }

  function gameBar(id) {
    const g = GAMES[id];
    return el('div.topbar.jg-bar', null, [CL.ui.backButton('juegos'), CL.ui.homeButton('jg-home'), title(g.icon, g.label), el('div.spacer'), CL.ui.muteButton()]);
  }

  function colorsGame(root) {
    const grid = el('div.jg-grid.jg-colors');
    COLORS.forEach(([name, hex], i) => {
      const b = el('button.jg-color', { type: 'button', 'aria-label': name, title: name });
      b.append(svg(drop(hex), 'jg-drop'), el('span.jg-name', null, name));
      // Se dice con minúsculas: algunas voces deletrean las palabras en mayúsculas.
      const spoken = name.charAt(0) + name.slice(1).toLowerCase();
      onTap(b, () => talk(b, spoken, 0.8 + i * 0.05));
      grid.append(b);
    });
    root.append(gameBar('colores'), grid);
  }

  function numbersGame(root) {
    const grid = el('div.jg-grid.jg-nums.scroll-y');
    NUMBERS.forEach((d, i) => {
      const b = el('button.jg-num', { type: 'button', 'aria-label': d.say, title: String(d.n) });
      b.style.setProperty('--c', NUM_COLORS[i]);
      const tray = el('span.jg-tray', { 'aria-hidden': 'true' });
      // Hasta 5 cosas en una fila; de 6 a 10, en dos filas.
      tray.style.setProperty('--per', String(d.n <= 5 ? Math.max(1, d.n) : Math.ceil(d.n / 2)));
      tray.style.setProperty('--rows', d.n > 5 ? '2' : '1');
      if (d.item) {
        tray.innerHTML = Array.from({ length: d.n }, (_, k) =>
          `<svg class="jg-item" style="--k:${k}" viewBox="0 0 48 48" aria-hidden="true" focusable="false">${ITEMS[d.item]}</svg>`).join('');
      } else {
        tray.append(el('span.jg-empty')); // el cero: un plato vacío
      }
      b.append(el('span.jg-digit', null, String(d.n)), tray);
      onTap(b, () => talk(b, d.say, 0.8 + i * 0.06));
      grid.append(b);
    });
    root.append(gameBar('numeros'), grid);
  }

  CL.router.register('juegos', {
    mount(root, args) {
      const g = GAMES[args && args[0]];
      if (args && args[0] && !g) { CL.router.replace('juegos'); return; }
      if (g) g.build(root); else menu(root);
    },
    unmount() { hush(); },
  });

  CL.games = { say, pickVoice: () => voice || pickVoice() };
})(window.CL);
