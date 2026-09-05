/* Colorinche — js/drawings/vehiculos.js
   Dibujos para colorear de la categoría "Vehículos": auto, colectivo, camión de bomberos, tren,
   avión y cohete. Vista lateral y tierna, con carita en el frente.
   Lienzo 1000 × 1000, contorno 16, detalles internos 10–12 (ver dev/ARQUITECTURA.md, sección 5).
   El orden importa: lo que va adelante se dibuja después y su relleno blanco tapa las líneas de atrás.
   Reglas prácticas de esta categoría:
   - dos piezas vecinas o comparten borde o quedan a ≥ 45 u libres (nada de ranuras de 4–20 u que se
     ven como línea doble);
   - los faros son "medias lunas" apoyadas en el borde de la chapa (comparten el borde), nunca óvalos
     montados sobre el contorno;
   - en la carita quedan ≥ 12 u de blanco entre pupila y cachete y ≥ 10 u entre sonrisa y cachete
     (se puede medir con dev/vehiculos/cara.mjs). */
'use strict';
(function (CL) {
  const add = (id, nombre, svg) => CL.drawings.add('vehiculos', id, nombre, svg);
  const R = Math.round;
  const P = (p) => `${R(p[0])} ${R(p[1])}`;

  /* ---------- Geometría ---------- */

  // Parte una curva cúbica [a, b, c, d] en t (de Casteljau): devuelve [primera, segunda].
  function partir([a, b, c, d], t) {
    const m = (p, q) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
    const ab = m(a, b), bc = m(b, c), cd = m(c, d);
    const abc = m(ab, bc), bcd = m(bc, cd), e = m(abc, bcd);
    return [[a, ab, abc, e], [e, bcd, cd, d]];
  }
  // Tramo cúbico como texto "C..." (sin el punto inicial).
  const C = (k) => `C${P(k[1])} ${P(k[2])} ${P(k[3])}`;
  // Curva al revés.
  const rev = ([a, b, c, d]) => [d, c, b, a];
  // Espejo horizontal respecto de x = 500.
  const esp = (k) => k.map(([x, y]) => [1000 - x, y]);

  /* ---------- Piezas compartidas (mismo estilo en toda la categoría) ---------- */

  // Ojo tierno: pupila negra con un brillito grande y uno chiquito.
  const ojo = (x, y, rx = 25, ry = 31) =>
    `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#000"/>` +
    `<circle cx="${x - R(rx * 0.3)}" cy="${y - R(ry * 0.35)}" r="${R(rx * 0.38)}" fill="#fff" stroke="none"/>` +
    `<circle cx="${x + R(rx * 0.35)}" cy="${y + R(ry * 0.4)}" r="${R(rx * 0.17)}" fill="#fff" stroke="none"/>`;

  // Cachete para pintar de rosado (34 × 22: zona pintable de ~52 × 30 u, como en las otras categorías).
  const cachete = (x, y, rx = 34, ry = 22) =>
    `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" stroke-width="12"/>`;

  // Sonrisa: arco abierto de ancho w y profundidad h.
  const sonrisa = (x, y, w = 56, h = 26) =>
    `<path d="M${x - w / 2} ${y}q${w / 2} ${h} ${w} 0" fill="none" stroke-width="12"/>`;

  // Carita completa: ojos separados por `sep`; cachetes corridos (cx, cy) desde cada ojo hacia afuera y
  // abajo; sonrisa a `sy` debajo de los ojos. Los valores por defecto dejan ≥ 12 u entre pupila y cachete.
  const carita = (x, y, sep = 92, o = {}) => {
    const { rx = 26, ry = 32, cx = 40, cy = 76, cr = 34, sy = cy - 12, sw = 52 } = o;
    return ojo(x - sep / 2, y, rx, ry) + ojo(x + sep / 2, y, rx, ry) +
      cachete(x - sep / 2 - cx, y + cy, cr, R(cr * 0.65)) + cachete(x + sep / 2 + cx, y + cy, cr, R(cr * 0.65)) +
      sonrisa(x, y + sy, sw);
  };

  // Rueda grande (r ≥ 75): cubierta, llanta (radio rl) y tuerca central.
  const rueda = (x, y, r = 90, rl = R(r * 0.46)) =>
    `<circle cx="${x}" cy="${y}" r="${r}"/>` +
    `<circle cx="${x}" cy="${y}" r="${rl}" stroke-width="12"/>` +
    `<circle cx="${x}" cy="${y}" r="9" fill="#000" stroke="none"/>`;

  // Rueda chica (r < 75): disco pintable con tuerca, sin llanta (la llanta dejaría aros finitos).
  const ruedita = (x, y, r) =>
    `<circle cx="${x}" cy="${y}" r="${r}"/>` +
    `<circle cx="${x}" cy="${y}" r="10" fill="#000" stroke="none"/>`;

  // Calle: óvalo apoyado debajo de las ruedas.
  const calle = (cy = 872, rx = 445, ry = 42) => `<ellipse cx="500" cy="${cy}" rx="${rx}" ry="${ry}"/>`;

  // Faro en media luna apoyado sobre un borde vertical x (hacia adentro = sentido de `dir`, -1 izquierda,
  // +1 derecha), de y0 a y1, con una panza de `panza` u. Comparte el borde con la chapa.
  const faro = (x, y0, y1, panza, dir = -1) => {
    const k = x + dir * R(panza / 0.75); // control de la cúbica para que la panza mida `panza`
    return `<path d="M${x} ${y0}C${k} ${y0} ${k} ${y1} ${x} ${y1}Z"/>`;
  };

  // Estrella gordita de 5 puntas con las puntas redondeadas (radio externo r, interno r·0.6).
  function estrella(cx, cy, r, giro = 0) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = ((giro - 90 + i * 36) * Math.PI) / 180;
      const rr = i % 2 ? r * 0.6 : r;
      pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
    }
    // En cada punta: se corta un 28 % de cada lado y se redondea con una curva que pasa cerca del vértice.
    const f = 0.28;
    const hacia = (p, q) => [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f];
    let d = '';
    for (let i = 0; i < 10; i += 2) {
      const o = pts[i], antes = pts[(i + 9) % 10], despues = pts[i + 1];
      const a = hacia(o, antes), b = hacia(o, despues);
      d += (i ? 'L' : 'M') + P(a) + 'Q' + P(o) + ' ' + P(b) + 'L' + P(despues);
    }
    return `<path d="${d}Z"/>`;
  }

  // Contorno festoneado (nube, humo): n arcos hacia afuera sobre una elipse.
  function nube(cx, cy, rx, ry, n, fase = 0, abulta = 0.58) {
    let d = '';
    let px = 0, py = 0;
    for (let i = 0; i <= n; i++) {
      const a = fase + (i / n) * Math.PI * 2;
      const x = R(cx + rx * Math.cos(a));
      const y = R(cy + ry * Math.sin(a));
      if (i === 0) d += `M${x} ${y}`;
      else {
        const r = R(Math.hypot(x - px, y - py) * abulta);
        d += `A${r} ${r} 0 0 1 ${x} ${y}`;
      }
      px = x; py = y;
    }
    return `<path d="${d}Z"/>`;
  }

  // Tubo grueso (manguera) a lo largo de un recorrido: contorno negro de 16 y adentro blanco de ancho `w`.
  const tubo = (d, w = 50) =>
    `<path d="${d}" fill="none" stroke-width="${w + 32}" stroke-linecap="butt"/>` +
    `<path d="${d}" fill="none" stroke="#fff" stroke-width="${w}" stroke-linecap="butt"/>`;

  /* ---------- Auto: dos ventanillas, ruedas con llanta y luces ---------- */
  // Todo subido 75 u para que quede centrado en la hoja. Los faros son medias lunas sobre el borde
  // y el paragolpes les tapa la punta de abajo (comparten borde).
  add('auto', 'Auto', `
    <g transform="translate(0 -75)">
    ${calle()}
    <path d="M240 515L310 300Q325 250 375 250H610Q655 250 682 285L800 515Z"/>
    <path d="M312 450L350 340Q360 305 390 305H470V450Z"/>
    <path d="M530 450V305H615Q640 305 655 330L718 450Z"/>
    <path d="M150 500H700Q815 500 865 540Q920 585 920 650V705Q920 765 860 765H155Q95 765 95 705V555Q95 500 150 500Z"/>
    <path d="M500 500V765" fill="none" stroke-width="12"/>
    <rect x="410" y="540" width="56" height="18" rx="9" fill="#000" stroke="none"/>
    <path d="M909 596Q920 621 920 650V720C840 720 830 612 909 596Z"/>
    ${faro(95, 585, 725, 60, 1)}
    <rect x="800" y="700" width="145" height="68" rx="30"/>
    <rect x="55" y="700" width="150" height="68" rx="30"/>
    ${carita(705, 566, 92, { cx: 36, cy: 74, sy: 62, sw: 52 })}
    ${rueda(275, 765, 90)}${rueda(725, 765, 90)}
    </g>
  `);

  /* ---------- Colectivo: largo, ventanillas, puerta de dos hojas y cartel de recorrido ---------- */
  // La puerta va del techo al piso (comparte borde con los dos) y su vidrio es mucho más alto que las
  // ventanillas, así se lee como puerta. Ventanillas y franja terminan contra la puerta.
  // Todo subido 90 u para que quede centrado en la hoja.
  add('colectivo', 'Colectivo', `
    <g transform="translate(0 -90)">
    ${calle()}
    <path d="M120 280H840A100 100 0 0 1 940 380V700Q940 752 888 752H112Q60 752 60 700V340Q60 280 120 280Z"/>
    <path d="M60 510H580A30 30 0 0 1 580 570H60Z"/>
    <path d="M350 340H120Q100 340 100 360V440Q100 460 120 460H350Z"/>
    <path d="M490 340H630Q650 340 650 360V440Q650 460 630 460H490Z"/>
    <path d="M235 340V460M570 340V460" fill="none" stroke-width="12"/>
    <path d="M350 752V360Q350 340 370 340H470Q490 340 490 360V752Z"/>
    <path d="M420 340V752M350 620H490" fill="none" stroke-width="12"/>
    <path d="M704 280H840A100 100 0 0 1 940 380V440H720Q704 440 704 424Z"/>
    <path d="M704 355H934" fill="none"/>
    ${carita(785, 508, 96, { rx: 28, ry: 35, cx: 38, cy: 76, sy: 64, sw: 50 })}
    ${faro(940, 615, 720, 66)}
    <rect x="800" y="692" width="150" height="60" rx="28"/>
    <rect x="50" y="692" width="110" height="60" rx="28"/>
    ${rueda(200, 758, 90)}${rueda(760, 758, 90)}
    </g>
  `);

  /* ---------- Camión de bomberos: escalera, sirena, carretel con manguera y cabina ---------- */
  // La escalera apoya sobre el techo de la caja (comparten borde) y termina contra la cabina.
  // El carretel es un tambor visto de costado (dos tapas y tres vueltas de manguera); la manguera es un
  // tubo grueso que sale de arriba del tambor, se curva y cuelga con la lanza apuntando hacia abajo.
  // Todo subido 37 u para que quede centrado en la hoja.
  add('camion-bomberos', 'Camión de bomberos', `
    <g transform="translate(0 -37)">
    ${calle()}
    <path d="M110 380H660V730H110Q70 730 70 690V420Q70 380 110 380Z"/>
    <path d="M50 310H650M50 380H120" fill="none"/>
    <path d="M60 310V380M153 310V380M247 310V380M340 310V380M433 310V380M527 310V380" fill="none" stroke-width="13"/>
    ${tubo('M330 500C440 500 505 512 505 566')}
    <path d="M464 558H546V594L528 652H482L464 594Z"/>
    <ellipse cx="505" cy="652" rx="23" ry="8" fill="#000"/>
    <rect x="140" y="450" width="240" height="104" rx="12"/>
    <path d="M231 450V554M289 450V554" fill="none" stroke-width="12"/>
    <ellipse cx="140" cy="502" rx="32" ry="66"/><ellipse cx="380" cy="502" rx="32" ry="66"/>
    <path d="M770 345V262Q770 225 805 225Q840 225 840 262V345Z"/>
    <path d="M620 730V340Q620 300 660 300H790Q830 300 850 335L915 470Q935 505 935 545V690Q935 730 895 730Z"/>
    <path d="M665 345H785Q808 345 820 368L858 445H665Z"/>
    <path d="M752 205l-20-20M805 190v-30M858 205l20-20" fill="none" stroke-width="12"/>
    ${carita(772, 515, 96, { rx: 28, ry: 35, cx: 38, cy: 76, sy: 64, sw: 50 })}
    ${faro(935, 612, 720, 64)}
    <rect x="790" y="685" width="155" height="60" rx="26"/>
    ${rueda(190, 770, 88)}${rueda(420, 770, 88)}${rueda(780, 770, 88)}
    </g>
  `);

  /* ---------- Tren: locomotora con chimenea y domo, cabina, dos ruedas grandes y un vagón ---------- */
  // Apoyado en una vía recta. El domo comparte borde con la cabina, el enganche con el chasis y la
  // pala (quitapiedras) apoya en la vía. El techo de la cabina es una pieza aparte.
  add('tren', 'Tren', `
    <rect x="50" y="832" width="900" height="56" rx="28"/>
    ${nube(550, 127, 95, 56, 8, 0.3)}
    ${nube(690, 205, 72, 50, 7, 0.1)}
    ${nube(784, 272, 52, 38, 6, 0.4)}
    <path d="M752 352L762 470H818L828 352Z"/>
    <path d="M722 296H858Q872 296 866 311L848 352H732L714 311Q708 296 722 296Z"/>
    <path d="M600 470V455Q600 375 650 375Q700 375 700 455V470Z"/>
    <path d="M560 450H850Q920 450 920 565Q920 680 850 680H560Z"/>
    <rect x="310" y="610" width="110" height="70" rx="10"/>
    <rect x="400" y="320" width="200" height="400"/>
    <rect x="360" y="278" width="280" height="56" rx="14"/>
    <rect x="440" y="380" width="120" height="100" rx="18"/>
    ${carita(758, 521, 96, { rx: 28, ry: 35, cx: 38, cy: 76, sy: 64, sw: 50 })}
    <path d="M330 680H900V735H330Z"/>
    <path d="M880 680H905L948 840H852Z"/>
    <path d="M50 445Q55 385 120 380H280Q345 385 350 445Z"/>
    <path d="M70 440H330V700H70Z"/>
    <rect x="98" y="480" width="84" height="90" rx="16"/>
    <rect x="218" y="480" width="84" height="90" rx="16"/>
    <path d="M78 680H330V735H78Q60 735 60 717V698Q60 680 78 680Z"/>
    ${rueda(490, 760, 80, 36)}${rueda(730, 760, 80, 36)}
    ${ruedita(112, 780, 56)}${ruedita(288, 780, 56)}
  `);

  /* ---------- Avión: fuselaje, ventanillas redondas, alas, cola, hélice y nubecitas ---------- */
  // Las alas apuntan hacia la cola y el fuselaje se afina hacia atrás y arriba. La deriva nace tangente
  // a la curva de la cola y el estabilizador es una alita barrida hacia atrás.
  add('avion', 'Avión', `
    ${nube(205, 800, 125, 58, 8, 0.2)}
    ${nube(815, 175, 110, 52, 7, 0.4)}
    <g transform="translate(-34 0)">
    <path d="M578 388L483 290Q470 276 450 279L418 285Q402 290 411 306L460 388Z"/>
    <path d="M140 440Q124 396 118 330L114 232Q112 200 145 200H182Q208 200 220 222L310 400Z"/>
    <path d="M165 380H700C840 380 900 420 900 500C900 580 840 620 700 620H340Q260 620 205 545L140 440Q125 400 165 380Z"/>
    <path d="M180 425H240Q262 425 250 441L205 503Q196 515 180 515H100Q78 515 92 498L165 433Q172 425 180 425Z"/>
    <rect x="300" y="420" width="62" height="120" rx="30"/>
    <circle cx="470" cy="455" r="36"/><circle cx="568" cy="455" r="36"/>
    <path d="M405 532H560Q588 532 574 556L465 765Q455 785 430 785H400Q375 785 378 760L392 552Q394 532 405 532Z"/>
    ${carita(740, 478, 80, { rx: 29, ry: 36, cx: 40, cy: 78, sy: 66, sw: 46 })}
    <ellipse cx="950" cy="410" rx="34" ry="76"/>
    <ellipse cx="950" cy="590" rx="34" ry="76"/>
    <path d="M892 452Q956 464 956 500Q956 536 892 548Z"/>
    </g>
  `);

  /* ---------- Cohete: punta, ventanita redonda, aletas, llama de tres lenguas y estrellitas ---------- */
  // Costado derecho del cohete: dos cúbicas (de la punta a la panza y de la panza a la base).
  const cA = [[500, 55], [615, 125], [680, 250], [680, 410]];
  const cB = [[680, 410], [680, 560], [655, 660], [628, 735]];
  const [, cA2] = partir(cA, 0.58); // tramo debajo de la costura de la punta
  const costura = cA2[0];
  const silueta = `M500 55${C(cA)}${C(cB)}H372${C(esp(rev(cB)))}${C(esp(rev(cA)))}Z`;
  const cuerpo = `M${P(costura)}${C(cA2)}${C(cB)}H372${C(esp(rev(cB)))}${C(esp(rev(cA2)))}` +
    `Q500 ${R(costura[1] + 48)} ${P(costura)}Z`;
  // Llama: tres lenguas en forma de gota. Las de los costados, más cortas, asoman detrás de la del medio
  // con la punta abierta hacia afuera; adentro de la del medio, una gota más chica.
  const llama =
    '<path d="M372 792C352 840 338 885 336 928C372 900 420 860 452 792Z"/>' +
    '<path d="M628 792C648 840 662 885 664 928C628 900 580 860 548 792Z"/>' +
    '<path d="M396 792C392 855 452 900 500 950C548 900 608 855 604 792Z"/>' +
    '<path d="M452 795C450 845 478 875 500 905C522 875 550 845 548 795Z"/>';
  add('cohete', 'Cohete', `
    ${estrella(160, 190, 66, 8)}${estrella(845, 165, 62, -10)}
    ${estrella(135, 470, 62, -6)}${estrella(870, 480, 64, 12)}
    <circle cx="262" cy="318" r="34"/><circle cx="742" cy="316" r="34"/>
    <circle cx="878" cy="690" r="34"/><circle cx="122" cy="690" r="34"/>
    <path d="M370 510C262 550 205 650 205 765Q205 810 252 796L402 722Z"/>
    <path d="M630 510C738 550 795 650 795 765Q795 810 748 796L598 722Z"/>
    ${llama}
    <path d="M398 725H602L632 795H368Z"/>
    <path d="${silueta}"/>
    <path d="${cuerpo}"/>
    <circle cx="500" cy="410" r="106"/>
    <circle cx="500" cy="410" r="52"/>
    <path d="M470 410L494 386M480 432L516 396" fill="none" stroke-width="10"/>
    <circle cx="444" cy="354" r="7" fill="#000" stroke="none"/><circle cx="556" cy="354" r="7" fill="#000" stroke="none"/>
    <circle cx="444" cy="466" r="7" fill="#000" stroke="none"/><circle cx="556" cy="466" r="7" fill="#000" stroke="none"/>
    ${carita(500, 585, 104, { rx: 25, ry: 31, cx: 32, cy: 74, sy: 62, sw: 56 })}
  `);
})(window.CL);
