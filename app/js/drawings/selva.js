/* Colorinche — js/drawings/selva.js
   Dibujos para colorear de la categoría "Selva": león, elefante, jirafa, mono, cebra y cocodrilo.
   Lienzo 1000 × 1000, contorno 16, detalles internos 12 (ver dev/ARQUITECTURA.md, sección 5).
   El orden importa: lo que va adelante se dibuja después y su relleno blanco tapa las líneas de atrás. */
'use strict';
(function (CL) {
  const add = (id, nombre, svg) => CL.drawings.add('selva', id, nombre, svg);
  const R = Math.round;
  const RAD = Math.PI / 180;

  /* ---------- Piezas compartidas (mismo estilo en toda la categoría) ---------- */

  // Ojo tierno: pupila negra con un brillito grande y uno chiquito.
  const ojo = (x, y, rx = 27, ry = 33) =>
    `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#000"/>` +
    `<circle cx="${x - R(rx * 0.3)}" cy="${y - R(ry * 0.35)}" r="${R(rx * 0.38)}" fill="#fff" stroke="none"/>` +
    `<circle cx="${x + R(rx * 0.35)}" cy="${y + R(ry * 0.4)}" r="${R(rx * 0.17)}" fill="#fff" stroke="none"/>`;

  // Cachete para pintar de rosado.
  const cachete = (x, y, rx = 30, ry = 20) =>
    `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" stroke-width="12"/>`;

  // Línea de detalle (sonrisas, arrugas, dedos): abierta y un poco más fina.
  const linea = (d) => `<path d="${d}" fill="none" stroke-width="12"/>`;

  // Punto sobre una elipse (ángulo en grados, 0 = derecha, 90 = abajo).
  const pe = (cx, cy, rx, ry, a) => [R(cx + rx * Math.cos(a * RAD)), R(cy + ry * Math.sin(a * RAD))];
  const lerp2 = (a, b, t) => [R(a[0] + (b[0] - a[0]) * t), R(a[1] + (b[1] - a[1]) * t)];

  // Contorno festoneado: n chichones hacia afuera sobre una elipse (melenas, pompones).
  function festoneado(cx, cy, rx, ry, n, fase = 0, abulta = 0.58) {
    let d = '';
    let p0 = null;
    for (let i = 0; i <= n; i++) {
      const p = pe(cx, cy, rx, ry, fase + (i * 360) / n);
      if (!p0) d += `M${p[0]} ${p[1]}`;
      else {
        const r = R(Math.hypot(p[0] - p0[0], p[1] - p0[1]) * abulta);
        d += `A${r} ${r} 0 0 1 ${p[0]} ${p[1]}`;
      }
      p0 = p;
    }
    return `<path d="${d}Z"/>`;
  }

  // Chichones a lo largo de una línea de puntos (crines): bultos hacia la izquierda del recorrido;
  // `cierre` son puntos que vuelven por adentro (quedan tapados por lo que se dibuja después).
  function crin(pts, cierre, abulta = 0.62) {
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [a, b] = [pts[i - 1], pts[i]];
      const r = R(Math.hypot(b[0] - a[0], b[1] - a[1]) * abulta);
      d += `A${r} ${r} 0 0 1 ${b[0]} ${b[1]}`;
    }
    for (const p of cierre) d += `L${p[0]} ${p[1]}`;
    return `<path d="${d}Z"/>`;
  }

  // Tubo cerrado a partir de un recorrido (colas, brazos): trazo negro ancho + trazo blanco encima.
  // `w` es el ancho interior pintable; los extremos redondeados quedan cerrados.
  const tubo = (d, w) =>
    `<path d="${d}" fill="none" stroke-width="${w + 32}"/>` +
    `<path d="${d}" fill="none" stroke="#fff" stroke-width="${w}"/>`;

  // Punto [x, y] y normal [nx, ny] (a la derecha del avance: hacia afuera si el contorno va
  // en sentido antihorario) de una curva cúbica p = [p0, c1, c2, p1].
  const bz = (p, t) => {
    const u = 1 - t;
    const f = (i) => u * u * u * p[0][i] + 3 * u * u * t * p[1][i] + 3 * u * t * t * p[2][i] + t * t * t * p[3][i];
    const g = (i) => 3 * u * u * (p[1][i] - p[0][i]) + 6 * u * t * (p[2][i] - p[1][i]) + 3 * t * t * (p[3][i] - p[2][i]);
    return [f(0), f(1), -g(1), g(0)];
  };
  const C = (p) => `C${p[1]} ${p[2]} ${p[3]}`;

  // Raya ancha (cebra): nace en el borde de la elipse E entre los ángulos a1 < a2 (el tramo del borde
  // sigue la elipse, así no hay doble contorno) y avanza hacia T con los lados casi paralelos; se afina
  // recién en el último tercio y termina redondeada con ancho `punta`. `comba`: cuánto se dobla la punta
  // hacia un costado (hacia p2 si es positiva), como una banana, para seguir la curva del cuerpo.
  function raya(E, a1, a2, T, punta = 40, comba = 0) {
    const p1 = pe(E[0], E[1], E[2], E[3], a1), p2 = pe(E[0], E[1], E[2], E[3], a2);
    const M = lerp2(p1, p2, 0.5), L = Math.hypot(T[0] - M[0], T[1] - M[1]);
    const u = [(T[0] - M[0]) / L, (T[1] - M[1]) / L];
    let n = [-u[1], u[0]];
    if (n[0] * (p2[0] - M[0]) + n[1] * (p2[1] - M[1]) < 0) n = [-n[0], -n[1]]; // n apunta al lado de p2
    const w = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 2, h = punta / 2;
    const P = (along, side) => `${R(M[0] + u[0] * L * along + n[0] * (side + comba * along * along))} ` +
      `${R(M[1] + u[1] * L * along + n[1] * (side + comba * along * along))}`;
    return `<path d="M${p1}A${E[2]} ${E[3]} 0 0 1 ${p2}C${P(0.45, w)} ${P(0.72, w * 0.96)} ${P(1, h)}` +
      `C${P(1 + h / L * 1.3, h)} ${P(1 + h / L * 1.3, -h)} ${P(1, -h)}C${P(0.72, -w * 0.96)} ${P(0.45, -w)} ${p1}Z" stroke-width="12"/>`;
  }
  // Rayas que entran desde el borde de arriba o de abajo de una elipse, entre las abscisas x1 < x2.
  const angX = (E, x) => Math.acos((x - E[0]) / E[2]) / RAD;
  const rayaArriba = (E, x1, x2, T, punta, comba) => raya(E, 360 - angX(E, x1), 360 - angX(E, x2), T, punta, comba);
  const rayaAbajo = (E, x1, x2, T, punta, comba) => raya(E, angX(E, x2), angX(E, x1), T, punta, comba);

  // Franja que cruza un cuello de lados rectos: atras = [p0, p1], adelante = [q0, q1]; t y u en 0..1.
  function franjaCuello(atras, adelante, t1, t2, u1, u2, curva = 14) {
    const a1 = lerp2(atras[0], atras[1], t1), a2 = lerp2(atras[0], atras[1], t2);
    const b1 = lerp2(adelante[0], adelante[1], u1), b2 = lerp2(adelante[0], adelante[1], u2);
    const m1 = lerp2(a1, b1, 0.5), m2 = lerp2(a2, b2, 0.5);
    return `<path d="M${a1}L${a2}Q${m2[0]} ${m2[1] + curva} ${b2}L${b1}Q${m1[0]} ${m1[1] + curva} ${a1}Z"/>`;
  }

  // Franja horizontal apenas curva sobre una pata rectangular (x, ancho w) entre y1 e y2.
  const franjaPata = (x, w, y1, y2) =>
    `<path d="M${x} ${y1}Q${x + w / 2} ${y1 + 12} ${x + w} ${y1}V${y2}Q${x + w / 2} ${y2 + 12} ${x} ${y2}Z"/>`;

  // Mancha redondeada e irregular (jirafa): polígono suavizado con curvas.
  function mancha(cx, cy, rx, ry, radios, fase = 0) {
    const n = radios.length;
    const pts = radios.map((k, i) => pe(cx, cy, rx * k, ry * k, fase + (i * 360) / n));
    const mid = (a, b) => [R((a[0] + b[0]) / 2), R((a[1] + b[1]) / 2)];
    let d = `M${mid(pts[0], pts[1])}`;
    for (let i = 1; i <= n; i++) d += `Q${pts[i % n]} ${mid(pts[i % n], pts[(i + 1) % n])}`;
    return `<path d="${d}Z"/>`;
  }

  /* ---------- León ---------- */
  // Hocico de dos lóbulos simétricos (un solo path); la línea central sale de la punta de la nariz.
  const hocicoLeon = (x, y, rx, ry, sep) => {
    const dy = R(ry * Math.sqrt(1 - (sep / rx) ** 2)); // cruce de los dos lóbulos sobre el eje
    return `<path d="M${x} ${y - dy}A${rx} ${ry} 0 1 0 ${x} ${y + dy}A${rx} ${ry} 0 1 0 ${x} ${y - dy}Z"/>`;
  };
  add('leon', 'León', `
    ${tubo('M628 800C790 850 850 750 838 640', 40)}
    ${festoneado(838, 590, 44, 50, 8, -90, 0.62)}
    <ellipse cx="500" cy="725" rx="195" ry="150"/>
    <ellipse cx="330" cy="812" rx="95" ry="92"/>
    <ellipse cx="670" cy="812" rx="95" ry="92"/>
    <ellipse cx="292" cy="900" rx="85" ry="44"/>
    <ellipse cx="708" cy="900" rx="85" ry="44"/>
    <rect x="390" y="690" width="84" height="200" rx="42"/>
    <rect x="526" y="690" width="84" height="200" rx="42"/>
    <ellipse cx="430" cy="895" rx="58" ry="40"/>
    <ellipse cx="570" cy="895" rx="58" ry="40"/>
    ${linea('M413 933q-4-14 0-28M447 933q4-14 0-28M553 933q-4-14 0-28M587 933q4-14 0-28')}
    ${festoneado(500, 385, 248, 244, 13, -90, 0.53)}
    <circle cx="382" cy="252" r="62"/><circle cx="618" cy="252" r="62"/>
    <circle cx="500" cy="395" r="192"/>
    <ellipse cx="500" cy="518" rx="38" ry="36"/>
    ${hocicoLeon(500, 474, 46, 40, 34)}
    <path d="M462 425Q500 410 538 425Q532 458 500 470Q468 458 462 425Z"/>
    ${linea('M500 466V506')}
    ${ojo(430, 358)}${ojo(570, 358)}
    ${cachete(372, 430, 38, 26)}${cachete(628, 430, 38, 26)}
  `);

  /* ---------- Elefante ---------- */
  // Pata delantera: columna con la parte de arriba redonda y el pie chato, con una franja de pie
  // (línea apenas curva a 62 u del piso, como las pezuñas de la jirafa) que deja una zona para pintar.
  const pataEle = (x, w, y0, y1) => {
    const r = w / 2;
    return `<path d="M${x} ${y1 - 16}V${y0 + r}A${r} ${r} 0 0 1 ${x + w} ${y0 + r}V${y1 - 16}` +
      `Q${x + w} ${y1} ${x + w - 16} ${y1}H${x + 16}Q${x} ${y1} ${x} ${y1 - 16}Z"/>` +
      linea(`M${x - 2} ${y1 - 62}Q${x + r} ${y1 - 48} ${x + w + 2} ${y1 - 62}`);
  };
  add('elefante', 'Elefante', `
    <ellipse cx="255" cy="390" rx="190" ry="205"/>
    <ellipse cx="745" cy="390" rx="190" ry="205"/>
    <ellipse cx="250" cy="400" rx="125" ry="145" stroke-width="12"/>
    <ellipse cx="750" cy="400" rx="125" ry="145" stroke-width="12"/>
    <ellipse cx="500" cy="720" rx="215" ry="148"/>
    <circle cx="298" cy="858" r="82"/>
    <circle cx="702" cy="858" r="82"/>
    <ellipse cx="298" cy="876" rx="50" ry="42" stroke-width="12"/>
    <ellipse cx="702" cy="876" rx="50" ry="42" stroke-width="12"/>
    ${pataEle(366, 106, 740, 926)}${pataEle(528, 106, 740, 926)}
    <path d="M545 551A205 190 0 1 0 455 551C450 640 462 730 540 742C610 752 650 715 648 652A28 28 0 0 0 592 650C588 674 574 688 558 684C546 680 545 640 545 551Z"/>
    ${linea('M488 186c-12-40 10-62 36-60M515 186c5-30 30-40 50-30')}
    ${linea('M474 600q26 12 52 0M476 648q24 12 46 0')}
    ${linea('M414 490q18 28 44 24M586 490q-18 28-44 24')}
    ${ojo(420, 345)}${ojo(580, 345)}
    ${cachete(374, 436, 38, 26)}${cachete(626, 436, 38, 26)}
  `);

  /* ---------- Jirafa ---------- */
  // Cuernito (osicono): palito y bolita en una sola forma, así se pinta de una vez.
  const cuernito = (x, y, r = 32, w = 48, largo = 110) => {
    const yb = R(y + Math.sqrt(r * r - (w / 2) ** 2));
    return `<path d="M${x - w / 2} ${y + largo}V${yb}A${r} ${r} 0 1 1 ${x + w / 2} ${yb}V${y + largo}Z"/>`;
  };
  add('jirafa', 'Jirafa', `<g transform="translate(0 6)"><g transform="translate(0 14)">
    <path d="M228 690C186 704 156 740 150 806" fill="none"/>
    <path d="M150 778C104 816 106 874 150 898C194 874 196 816 150 778Z"/>
    ${[[232, 5], [324, 5], [446, -2], [536, -2]].map(([x, g]) => `<g transform="rotate(${g} ${x + 32} 640)">` +
      `<rect x="${x}" y="640" width="64" height="290" rx="28"/>` +
      linea(`M${x - 2} 868Q${x + 32} 880 ${x + 66} 868`) + '</g>').join('')}
    ${crin([[458, 560], [478, 495], [498, 430], [518, 365], [538, 300]], [[660, 260], [590, 600]])}
    <path d="M490 600L585 300L750 300L595 640Z"/>
    ${mancha(614, 442, 50, 36, [1, 1.06, 0.94, 1, 1.04], 15)}${mancha(582, 526, 50, 36, [1, 0.94, 1.06, 1, 0.96], 50)}
    <ellipse cx="400" cy="650" rx="210" ry="118"/>
    ${mancha(298, 632, 58, 46, [1, 0.85, 1.08, 0.92, 1], 10)}
    ${mancha(430, 608, 52, 40, [1, 1.08, 0.86, 1, 0.92], 40)}
    ${mancha(392, 710, 60, 36, [0.92, 1, 1.08, 0.88, 1], 0)}
    ${mancha(530, 670, 48, 46, [1, 0.9, 1, 1.08, 0.86], 20)}</g>
    ${cuernito(605, 66)}${cuernito(715, 66)}
    <path d="M515 204C470 156 410 158 390 188C406 238 470 248 515 236Z"/>
    <path d="M805 204C850 156 910 158 930 188C914 238 850 248 805 236Z"/>
    <ellipse cx="660" cy="240" rx="175" ry="138"/>
    <ellipse cx="660" cy="350" rx="84" ry="56"/>
    <ellipse cx="624" cy="340" rx="7" ry="9" fill="#000"/>
    <ellipse cx="696" cy="340" rx="7" ry="9" fill="#000"/>
    ${linea('M636 382q24 16 48 0')}
    ${ojo(608, 205)}${ojo(712, 205)}
    ${cachete(556, 276, 38, 26)}${cachete(764, 276, 38, 26)}
  </g>`);

  /* ---------- Mono ---------- */
  add('mono', 'Mono', `
    ${tubo('M400 830C300 870 170 830 160 700C150 610 230 580 262 630C285 670 245 700 218 675', 40)}
    <g transform="translate(38 8)">
      <path d="M805 595C725 500 740 368 858 312L878 258A16 16 0 0 1 908 268L894 342C832 410 832 500 872 584Z"/>
      <circle cx="893" cy="262" r="12" fill="#000"/>
    </g>
    ${tubo('M620 646C730 636 800 620 850 588', 56)}
    <ellipse cx="500" cy="715" rx="160" ry="165"/>
    <ellipse cx="500" cy="750" rx="92" ry="104"/>
    <circle cx="870" cy="578" r="44"/>
    <ellipse cx="365" cy="820" rx="80" ry="70"/>
    <ellipse cx="635" cy="820" rx="80" ry="70"/>
    <ellipse cx="430" cy="876" rx="90" ry="52"/>
    <ellipse cx="570" cy="876" rx="90" ry="52"/>
    ${tubo('M388 604C350 650 336 700 352 740', 56)}
    <circle cx="358" cy="758" r="40"/>
    <circle cx="292" cy="372" r="88"/><circle cx="708" cy="372" r="88"/>
    <ellipse cx="274" cy="378" rx="36" ry="46" stroke-width="12"/><ellipse cx="726" cy="378" rx="36" ry="46" stroke-width="12"/>
    <circle cx="500" cy="355" r="195"/>
    ${linea('M492 162c-8-42 28-66 58-48')}
    <path d="M500 283A80 80 0 1 0 391 397A140 88 0 1 0 609 397A80 80 0 1 0 500 283Z"/>
    ${ojo(445, 338)}${ojo(555, 338)}
    <ellipse cx="482" cy="420" rx="7" ry="10" fill="#000"/>
    <ellipse cx="518" cy="420" rx="7" ry="10" fill="#000"/>
    ${linea('M462 474Q500 506 538 474')}
    ${cachete(420, 446, 38, 26)}${cachete(580, 446, 38, 26)}
  `);

  /* ---------- Cebra ---------- */
  // Caballito rayado de perfil mirando a la izquierda (así no se parece a la jirafa, que mira a la
  // derecha): cabeza de caballo larga (cráneo redondo + hocico que se afina), cuello corto y gordo,
  // crin de cepillo parada cortada en bloques, patas de a pares y rayas anchas que siguen el cuerpo.
  const cc = [604, 648, 248, 132]; // cuerpo: cx, cy, rx, ry
  // Cabeza: cápsula entre el cráneo (c1, r1) y el hocico (c2, r2); devuelve el contorno y las dos
  // rectas del hocico (arriba y abajo, desde el cráneo hacia la punta) para cruzarlo con rayas.
  function capsula([x1, y1], r1, [x2, y2], r2) {
    const d = Math.hypot(x2 - x1, y2 - y1), v = [(x2 - x1) / d, (y2 - y1) / d];
    const ca = (r1 - r2) / d, sa = Math.sqrt(1 - ca * ca);
    const nA = [v[0] * ca + v[1] * sa, v[1] * ca - v[0] * sa], nB = [v[0] * ca - v[1] * sa, v[1] * ca + v[0] * sa];
    const t = (c, r, n) => [R(c[0] + r * n[0]), R(c[1] + r * n[1])];
    const [pA, qA, pB, qB] = [t([x1, y1], r1, nA), t([x2, y2], r2, nA), t([x1, y1], r1, nB), t([x2, y2], r2, nB)];
    return {
      d: `M${pA}L${qA}A${r2} ${r2} 0 0 1 ${qB}L${pB}A${r1} ${r1} 0 1 1 ${pA}Z`,
      arriba: [pA, qA], abajo: [pB, qB],
    };
  }
  const c1 = [448, 248], c2 = [198, 342];
  const cab = capsula(c1, 128, c2, 86);
  const enCab = (a, r) => pe(c1[0], c1[1], r, r, a);
  const franjaHocico = (t1, t2) => franjaCuello(cab.arriba, cab.abajo, t1, t2, t1, t2, 8);
  // Crin: arco alrededor del cráneo (radio 184) y bajada por el cuello hasta la cruz (tapada por el cuerpo).
  const crinBaja = [enCab(38, 194), [628, 430], [664, 476], [664, 548]];
  const cuelloAtras = [[606, 560], [552, 334]];
  const cuelloAdelante = [[392, 720], [384, 360]];
  // Pata con una raya; se dibujan de a pares (la de atrás corrida a la derecha y tapada por la de adelante).
  const pataCebra = (x) => `<rect x="${x}" y="700" width="86" height="252" rx="32"/>` + franjaPata(x, 86, 824, 886);
  const parCebra = (x) => pataCebra(x + 76) + pataCebra(x);
  // Oreja de hoja parada: base (escondida en el cráneo), punta y ancho.
  const oreja = ([bx, by], [tx, ty], w) => {
    const h = by - ty;
    return `<path d="M${bx - w / 2} ${by}C${bx - w / 2} ${R(by - h * 0.6)} ${R(tx - w * 0.3)} ${R(ty + h * 0.2)} ${tx} ${ty}` +
      `C${R(tx + w * 0.3)} ${R(ty + h * 0.2)} ${bx + w / 2} ${R(by - h * 0.6)} ${bx + w / 2} ${by}Z"/>`;
  };
  add('cebra', 'Cebra', `
    <path d="M820 576C874 590 904 630 906 690" fill="none"/>
    <path d="M906 670C868 696 854 740 856 786A18 18 0 0 0 890 798A18 18 0 0 0 924 798A18 18 0 0 0 958 786C960 740 944 696 906 670Z"/>
    ${parCebra(388)}${parCebra(650)}
    <path d="M${enCab(-62, 60)}L${enCab(-62, 194)}A194 194 0 0 1 ${crinBaja[0]}${C(crinBaja)}L560 560L480 300Z"/>
    ${linea([-22, 16].map((a) => `M${enCab(a, 194)}L${enCab(a, 90)}`).join('') + (() => {
      const [x, y, nx, ny] = bz(crinBaja, 0.42), n = Math.hypot(nx, ny);
      return `M${R(x)} ${R(y)}L${R(x + (nx / n) * 110)} ${R(y + (ny / n) * 110)}`;
    })())}
    <path d="M${cuelloAtras[0]}L${cuelloAtras[1]}L${cuelloAdelante[1]}L${cuelloAdelante[0]}Z"/>
    ${franjaCuello(cuelloAtras, cuelloAdelante, 0.5, 0.74, 0.55, 0.73, 10)}
    <ellipse cx="${cc[0]}" cy="${cc[1]}" rx="${cc[2]}" ry="${cc[3]}"/>
    ${rayaAbajo(cc, 388, 474, [444, 606], 46, 16)}${rayaArriba(cc, 496, 582, [540, 706], 46, -16)}
    ${rayaAbajo(cc, 610, 696, [650, 592], 46, -16)}${rayaArriba(cc, 718, 804, [758, 694], 46, 16)}
    ${oreja([496, 156], [506, 46], 78)}${oreja([420, 154], [404, 42], 78)}
    <path d="${cab.d}"/>
    ${franjaHocico(0.12, 0.36)}${franjaHocico(0.6, 0.84)}
    <ellipse cx="140" cy="316" rx="7" ry="9" fill="#000"/>
    ${linea('M126 390q32 20 72 4')}
    ${ojo(410, 232)}
    ${cachete(458, 310, 38, 26)}
  `);

  /* ---------- Cocodrilo ---------- */
  // Todo en un solo contorno (lomo con crestas → cabeza → hocico → mandíbula → panza → cola), así no
  // hay costura entre cabeza y cuerpo y un toque de balde pinta cuerpo y crestas juntos.
  // Crestas: triangulitos de punta redondeada sobre un borde dado por f(t) → [x, y, ux, uy] (punto y
  // normal hacia afuera), de t0 a t1; `alto(t)` da la altura de cada una.
  function sierra(f, t0, t1, n, alto) {
    let d = '';
    for (let i = 0; i < n; i++) {
      const [ta, tb] = [t0 + ((t1 - t0) * i) / n, t0 + ((t1 - t0) * (i + 1)) / n];
      const [a, b, m] = [f(ta), f(tb), f((ta + tb) / 2)], h = alto((ta + tb) / 2);
      const pico = [m[0] + m[2] * h, m[1] + m[3] * h];
      d += `L${lerp2(a, pico, 0.62)}Q${R(pico[0])} ${R(pico[1])} ${lerp2(pico, b, 0.38)}L${R(b[0])} ${R(b[1])}`;
    }
    return d;
  }
  // Pata corta que asoma bajo la panza, con el pie hacia adelante y tres deditos redondos.
  // (x, y): talón y piso; la parte de arriba queda escondida adentro del cuerpo.
  const pataCoco = (x, y, inc = 0) =>
    `<path d="M${x + inc} ${y - 190}L${x} ${y - 30}Q${x} ${y} ${x + 30} ${y}H${x + 64}` +
    `A17 17 0 0 0 ${x + 98} ${y - 2}A17 17 0 0 0 ${x + 122} ${y - 24}A17 17 0 0 0 ${x + 122} ${y - 58}` +
    `Q${x + 104} ${y - 72} ${x + 72} ${y - 70}L${x + 72 + inc} ${y - 190}Z"/>`;
  // Borde de arriba: cola y lomo (de la punta de la cola hacia la cabeza), con el afuera hacia arriba.
  const colaArriba = [[74, 490], [180, 474], [290, 424], [400, 394]];
  const lomo = [[400, 394], [476, 374], [572, 378], [640, 412]];
  const borde = (c) => (t) => { const [x, y, nx, ny] = bz(c, t), k = Math.hypot(nx, ny); return [x, y, -nx / k, -ny / k]; };
  const punta = [[935, 460], [985, 478], [995, 570], [955, 600]];
  const papada = [[690, 670], [620, 690], [560, 772], [450, 774]];
  const colaAbajo = [[450, 774], [330, 776], [190, 700], [64, 534]];
  const cuerpo = `M${colaArriba[0]}${sierra(borde(colaArriba), 0.06, 1, 5, (t) => 18 + 20 * t)}` +
    `${sierra(borde(lomo), 0, 1, 3, () => 42)}` +
    'C690 420 730 446 790 452C850 458 905 450 935 460' + // cabeza y hocico
    `${C(punta)}C915 640 790 655 690 670${C(papada)}${C(colaAbajo)}` + // punta, mandíbula, panza y cola
    `A23 23 0 0 1 ${colaArriba[0]}Z`; // punta de la cola
  // Panza: franja de ~70 u sobre el borde de abajo, de la cola a la papada.
  const [p0, p1] = [bz(colaAbajo, 0.62), bz(papada, 0.3)];
  // Boca: de la punta del hocico hacia atrás, subiendo al final (sonrisa); dientes colgando.
  const boca = [bz(punta, 0.6).slice(0, 2).map(R), [900, 610], [800, 614], [700, 604]];
  const dientes = [0.18, 0.38, 0.58, 0.78].map((t) => {
    const [a, b, m] = [bz(boca, t - 0.058), bz(boca, t + 0.058), bz(boca, t)];
    const k = Math.hypot(m[2], m[3]); // la normal apunta hacia abajo
    return `<path d="M${R(a[0])} ${R(a[1])}L${R(m[0] + (m[2] / k) * 30)} ${R(m[1] + (m[3] / k) * 30)}L${R(b[0])} ${R(b[1])}Z" stroke-width="10"/>`;
  }).join('');

  add('cocodrilo', 'Cocodrilo', `
    ${pataCoco(560, 874, 10)}${pataCoco(340, 874, 20)}
    <path d="${cuerpo}"/>
    ${linea(`M${R(p0[0])} ${R(p0[1])}C300 690 470 708 ${R(p1[0])} ${R(p1[1])}`)}
    <ellipse cx="368" cy="532" rx="48" ry="36" stroke-width="12"/>
    <ellipse cx="490" cy="490" rx="52" ry="38" stroke-width="12"/>
    <ellipse cx="610" cy="540" rx="42" ry="32" stroke-width="12"/>
    ${linea(`M${boca[0]}${C(boca)}c-30-6-46-20-50-40`)}
    ${dientes}
    <ellipse cx="934" cy="488" rx="8" ry="6" fill="#000"/>
    ${cachete(640, 616, 36, 24)}
    <circle cx="780" cy="402" r="58"/>
    <circle cx="672" cy="384" r="64"/>
    ${ojo(684, 386, 25, 31)}${ojo(798, 402, 18, 24)}
  `);

  /* ---------- Tigre ---------- */
  // Gatito rayado parado de costado con la cabeza grande de frente (sin melena, así no se confunde con el
  // león): orejas redondas, hocico blanco de dos lóbulos, rayas en cuña que nacen en el borde (frente,
  // costados de la cara y lomo) y bandas que cruzan la cola.
  // Raya en cuña: nace en el borde de la elipse E entre los ángulos a1 < a2 y se afina de a poco hasta T,
  // donde termina redondeada con ancho `punta`.
  function cuna(E, a1, a2, T, punta = 22) {
    const p1 = pe(E[0], E[1], E[2], E[3], a1), p2 = pe(E[0], E[1], E[2], E[3], a2);
    const M = lerp2(p1, p2, 0.5), L = Math.hypot(T[0] - M[0], T[1] - M[1]);
    const u = [(T[0] - M[0]) / L, (T[1] - M[1]) / L];
    let n = [-u[1], u[0]];
    if (n[0] * (p2[0] - M[0]) + n[1] * (p2[1] - M[1]) < 0) n = [-n[0], -n[1]];
    const w = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 2, h = punta / 2, m = (w + h) / 2 + w * 0.1;
    const P = (al, s) => `${R(M[0] + u[0] * L * al + n[0] * s)} ${R(M[1] + u[1] * L * al + n[1] * s)}`;
    return `<path d="M${p1}A${E[2]} ${E[3]} 0 0 1 ${p2}Q${P(0.5, m)} ${P(1, h)}` +
      `C${P(1 + h / L * 1.3, h)} ${P(1 + h / L * 1.3, -h)} ${P(1, -h)}Q${P(0.5, -m)} ${p1}Z" stroke-width="12"/>`;
  }
  // Bandas que cruzan un tubo de ancho w (ver `tubo`) en los puntos t de la curva cúbica p.
  const bandasTubo = (p, w, ts) => linea(ts.map((t) => {
    const [x, y, nx, ny] = bz(p, t), k = (w / 2 + 10) / Math.hypot(nx, ny);
    return `M${R(x - nx * k)} ${R(y - ny * k)}L${R(x + nx * k)} ${R(y + ny * k)}`;
  }).join(''));
  {
    const H = [330, 375, 240, 202]; // cabeza: cx, cy, rx, ry
    const B = [610, 650, 260, 155]; // cuerpo
    const [cx, cy] = H;
    const ph = (a, k = 0) => pe(H[0], H[1], H[2] + k, H[3] + k, a);
    const F = (x, y) => `${cx + x} ${cy + y}`;
    const lomo = (x1, x2, T, punta) => cuna(B, 360 - angX(B, x1), 360 - angX(B, x2), T, punta);
    const oreja = (a) => {
      const [x, y] = ph(a, 26); // asoman bastante, así la parte de adentro es grande
      return `<circle cx="${x}" cy="${y}" r="76"/><circle cx="${x}" cy="${y}" r="36" stroke-width="12"/>`;
    };
    // Pata con deditos; la de atrás de cada par (corrida a la derecha y tapada) sólo muestra el dedito de afuera.
    const pata = (x, atras) => `<rect x="${x}" y="700" width="104" height="238" rx="44"/>` +
      linea((atras ? '' : `M${x + 35} 938q-4-16 0-30`) + `M${x + 69} 938q4-16 0-30`);
    const par = (x) => pata(x + 80, true) + pata(x);
    const cola = [[855, 615], [925, 595], [940, 460], [885, 390]];
    const dy = R(48 * Math.sqrt(1 - (42 / 60) ** 2)); // cruce de abajo de los lóbulos del hocico
    add('tigre', 'Tigre', `
      ${tubo(`M${cola[0]}${C(cola)}`, 44)}
      ${bandasTubo(cola, 44, [0.4, 0.62, 0.84])}
      ${par(385)}${par(655)}
      <ellipse cx="${B[0]}" cy="${B[1]}" rx="${B[2]}" ry="${B[3]}"/>
      ${lomo(585, 650, [610, 690], 24)}${lomo(690, 755, [712, 700], 24)}${lomo(790, 845, [805, 672], 22)}
      ${oreja(230)}${oreja(310)}
      <ellipse cx="${cx}" cy="${cy}" rx="${H[2]}" ry="${H[3]}"/>
      ${cuna(H, 262, 278, [cx, cy - 95], 20)}${cuna(H, 243, 257, [cx - 44, cy - 106], 20)}
      ${cuna(H, 283, 297, [cx + 44, cy - 106], 20)}
      ${cuna(H, 186, 204, [cx - 140, cy - 30], 20)}${cuna(H, 336, 354, [cx + 140, cy - 30], 20)}
      ${hocicoLeon(cx, cy + 78, 60, 48, 42)}
      <path d="M${F(-44, 24)}Q${F(0, 6)} ${F(44, 24)}Q${F(38, 62)} ${F(0, 74)}Q${F(-38, 62)} ${F(-44, 24)}Z"/>
      ${linea(`M${F(0, 70)}V${cy + 78 + dy}`)}
      ${ojo(cx - 78, cy - 20, 28, 34)}${ojo(cx + 78, cy - 20, 28, 34)}
      ${cachete(cx - 155, cy + 52, 36, 25)}${cachete(cx + 155, cy + 52, 36, 25)}
    `);
  }

  /* ---------- Hipopótamo ---------- */
  // De frente y metido en el agua hasta la panza: cabeza de maní (cráneo con dos chichones de ojos saltones
  // arriba y un hocico enorme y más ancho abajo) con fosas grandes, orejitas chiquitas, sonrisa con dos
  // dientitos y cachetes; adelante, el agua con olas (una sola zona cerrada) y unas ondas sueltas.
  // Elipse girada `rot` grados, como path (sin transform).
  const elipseRot = (cx, cy, rx, ry, rot, attrs = '') => {
    const c = Math.cos(rot * RAD), s = Math.sin(rot * RAD);
    const a = [R(cx + rx * c), R(cy + rx * s)], b = [R(cx - rx * c), R(cy - rx * s)];
    return `<path d="M${a}A${rx} ${ry} ${rot} 1 1 ${b}A${rx} ${ry} ${rot} 1 1 ${a}Z"${attrs}/>`;
  };
  {
    const cr = [500, 330, 205, 175]; // cráneo
    const [bx, by, br] = [418, 200, 60]; // chichón del ojo izquierdo (el derecho es simétrico)
    // Puntos donde el chichón izquierdo cruza el borde del cráneo (el de más a la izquierda primero).
    const f = (a) => ((bx + br * Math.cos(a * RAD) - cr[0]) / cr[2]) ** 2 + ((by + br * Math.sin(a * RAD) - cr[1]) / cr[3]) ** 2 - 1;
    const cruces = [];
    for (let a = 0; a < 360; a++) {
      if (Math.sign(f(a)) === Math.sign(f(a + 1))) continue;
      let [lo, hi] = [a, a + 1];
      for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (Math.sign(f(m)) === Math.sign(f(lo))) lo = m; else hi = m; }
      cruces.push([R(bx + br * Math.cos(lo * RAD)), R(by + br * Math.sin(lo * RAD))]);
    }
    const [p1, p2] = cruces.sort((p, q) => p[0] - q[0]), p3 = [1000 - p2[0], p2[1]], p4 = [1000 - p1[0], p1[1]];
    const pc = (a) => pe(cr[0], cr[1], cr[2], cr[3], a);
    const e = (p) => `A${cr[2]} ${cr[3]} 0 0 1 ${p}`, c = (p) => `A${br} ${br} 0 0 1 ${p}`;
    const craneo = `M${pc(150)}${e(p1)}${c(p2)}${e(p3)}${c(p4)}${e(pc(30))}${e(pc(150))}Z`;
    const oreja = (a) => { const [x, y] = pe(cr[0], cr[1], cr[2] + 14, cr[3] + 14, a); return `<circle cx="${x}" cy="${y}" r="44"/>`; };
    // Sonrisa: curva cuadrática simétrica de (x0, y0) a (1000 - x0, y0) que baja `h` en el medio.
    const [x0, y0, h] = [366, 516, 76];
    const ys = (x) => { const t = (x - x0) / (1000 - 2 * x0); return y0 + 2 * h * t * (1 - t); };
    // Dientito que cuelga de la sonrisa entre xa y xb (el borde de arriba sigue la curva).
    const diente = (xa, xb) => {
      const yb = R(Math.max(ys(xa), ys(xb)) + 50);
      return `<path d="M${xa} ${R(ys(xa))}V${yb - 14}Q${xa} ${yb} ${xa + 14} ${yb}H${xb - 14}` +
        `Q${xb} ${yb} ${xb} ${yb - 14}V${R(ys(xb))}Z" stroke-width="12"/>`;
    };
    const olas = 'q61-44 122 0'.repeat(7);
    add('hipopotamo', 'Hipopótamo', `
      <ellipse cx="500" cy="700" rx="330" ry="215"/>
      ${oreja(216)}${oreja(324)}
      <path d="${craneo}"/>
      <ellipse cx="500" cy="500" rx="258" ry="154"/>
      ${elipseRot(436, 428, 18, 26, 20, ' fill="#000"')}${elipseRot(564, 428, 18, 26, -20, ' fill="#000"')}
      ${linea(`M${x0} ${y0}Q500 ${y0 + 2 * h} ${1000 - x0} ${y0}`)}
      ${diente(422, 476)}${diente(524, 578)}
      ${ojo(bx, 228)}${ojo(1000 - bx, 228)}
      ${cachete(304, 488, 38, 26)}${cachete(696, 488, 38, 26)}
      <path d="M73 760${olas}C927 870 760 936 500 936C240 936 73 870 73 760Z"/>
      ${linea('M150 820q34-22 68 0M782 820q34-22 68 0M318 890q34-22 68 0M614 890q34-22 68 0')}
    `);
  }

  /* ---------- Rinoceronte ---------- */
  // De perfil mirando a la derecha: cuerpo de barril con dos pliegues del cuero (paleta y cadera) que lo
  // dividen en tres placas, patas gruesas de a pares con la franja del pie, colita con pompón, cabeza grande
  // con un cuerno grande en la punta del hocico y uno chico atrás, orejitas ovaladas y carita simpática.
  // Las orejas y los cuernos van antes que la cabeza: la cabeza tapa sus bases. Todo corrido 16 u a la izquierda.
  {
    const cu = [415, 628, 285, 180]; // cuerpo
    const yb = (x, s) => R(cu[1] + s * cu[3] * Math.sqrt(1 - ((x - cu[0]) / cu[2]) ** 2)); // borde del cuerpo
    // Pliegue que cruza el cuerpo de arriba (en xa) a abajo (en xb), combado hacia xm en el medio.
    const pliegue = (xa, xm, xb) => `M${xa} ${yb(xa, -1)}Q${xm} ${cu[1]} ${xb} ${yb(xb, 1)}`;
    const pata = (x) => `<path d="M${x} 700V912Q${x} 936 ${x + 24} 936H${x + 100}Q${x + 124} 936 ${x + 124} 912V700Z"/>` +
      linea(`M${x - 2} 880Q${x + 62} 894 ${x + 126} 880`);
    const par = (x) => pata(x + 76) + pata(x);
    // Cuerno: de la base de atrás b1 sube hasta la punta T con el borde de atrás apenas cóncavo (control ca)
    // y baja hasta la base de adelante b2 con el borde de adelante inflado (control cb).
    const cuerno = (b1, ca, T, cb, b2) => `<path d="M${b1}Q${ca} ${T}Q${cb} ${b2}Z"/>`;
    add('rinoceronte', 'Rinoceronte', `<g transform="translate(-16 0)">
      <path d="M136 606C112 630 104 664 106 700" fill="none"/>
      <path d="M106 680C78 698 70 742 88 768C104 786 130 776 134 750C140 720 130 694 106 680Z"/>
      ${par(166)}${par(466)}
      <ellipse cx="${cu[0]}" cy="${cu[1]}" rx="${cu[2]}" ry="${cu[3]}"/>
      ${linea(pliegue(236, 290, 244) + pliegue(480, 424, 486))}
      ${elipseRot(590, 300, 32, 56, -24)}${elipseRot(646, 286, 32, 56, 6)}
      ${cuerno([742, 344], [768, 294], [760, 240], [830, 298], [828, 382])}
      ${cuerno([840, 398], [874, 300], [852, 204], [944, 300], [936, 426])}
      <path d="M566 350C600 300 684 296 746 322C800 344 840 372 882 386C940 404 966 450 964 504C962 564 928 602 866 608C784 618 680 612 624 588C566 564 542 516 544 456C546 410 550 376 566 350Z"/>
      ${ojo(706, 424)}
      <ellipse cx="932" cy="468" rx="8" ry="11" fill="#000"/>
      ${linea('M954 552Q926 584 874 578')}
      ${cachete(776, 516, 38, 26)}
    </g>`);
  }

  /* ---------- Tucán ---------- */
  // Parado en una rama con hojas grandes, mirando a la izquierda: cuerpo ovalado con pechera clara, ala,
  // patitas agarradas a la rama, cola larga que cuelga detrás, ojo con antifaz y un pico GIGANTE dividido
  // en franjas. La panza tapa el borde de arriba de la rama y la rama tapa el nacimiento de la cola.
  {
    const cu = [630, 510, 170, 265]; // cuerpo (cabeza incluida)
    const pc = (a) => pe(cu[0], cu[1], cu[2], cu[3], a);
    // Pico: borde de arriba (de la base a la punta) y de abajo (de la punta a la base).
    const arriba = [[530, 278], [420, 232], [200, 260], [72, 450]];
    const abajo = [[72, 450], [190, 440], [380, 462], [520, 458]];
    // Franja: línea que cruza el pico en t (0 = base, 1 = punta) de un borde al otro.
    const franja = (t) => {
      const a = bz(arriba, t), b = bz(abajo, 1 - t);
      return `M${R(a[0])} ${R(a[1])}L${R(b[0])} ${R(b[1])}`;
    };
    // Hoja grande con nervio (el nervio sale de la base y termina antes de la punta).
    const hoja = (bx, by, tx, ty, w) => {
      const L = Math.hypot(tx - bx, ty - by), u = [(tx - bx) / L, (ty - by) / L], n = [-u[1], u[0]];
      const P = (al, s) => `${R(bx + u[0] * L * al + n[0] * s)} ${R(by + u[1] * L * al + n[1] * s)}`;
      return `<path d="M${bx} ${by}C${P(0.25, w)} ${P(0.75, w * 0.8)} ${tx} ${ty}C${P(0.75, -w * 0.8)} ${P(0.25, -w)} ${bx} ${by}Z"/>` +
        linea(`M${bx} ${by}Q${P(0.45, w * 0.1)} ${P(0.78, 0)}`);
    };
    // Patita agarrada a la rama: tres deditos redondos que caen por delante.
    const pata = (x, y) => `<path d="M${x - 54} ${y + 8}C${x - 54} ${y - 30} ${x + 54} ${y - 30} ${x + 54} ${y + 8}` +
      `A18 18 0 0 1 ${x + 18} ${y + 8}A18 18 0 0 1 ${x - 18} ${y + 8}A18 18 0 0 1 ${x - 54} ${y + 8}Z" stroke-width="12"/>`;
    add('tucan', 'Tucán', `
      <path d="M596 700L672 916Q682 944 710 944H756Q788 944 776 914L680 700Z"/>
      ${hoja(170, 800, 66, 620, 80)}${hoja(262, 836, 150, 958, 76)}${hoja(858, 784, 950, 594, 80)}
      <path d="M60 780Q500 730 940 760A45 45 0 0 1 940 850Q500 822 60 870A45 45 0 0 1 60 780Z"/>
      <ellipse cx="${cu[0]}" cy="${cu[1]}" rx="${cu[2]}" ry="${cu[3]}"/>
      <path d="M${pc(200)}A${cu[2]} ${cu[3]} 0 0 0 ${pc(146)}C620 610 596 490 ${pc(200)}Z"/>
      <path d="M708 494C786 510 806 608 782 700C766 740 728 738 714 706C672 628 666 548 708 494Z"/>
      ${pata(590, 776)}${pata(706, 772)}
      <path d="M${arriba[0]}${C(arriba)}${C(abajo)}Q584 370 530 278Z"/>
      ${linea(franja(0.22) + franja(0.46) + franja(0.7))}
      <ellipse cx="634" cy="336" rx="76" ry="70"/>
      ${ojo(634, 336, 26, 31)}
      ${cachete(724, 430, 36, 24)}
    `);
  }

  /* ---------- Serpiente ---------- */
  // Enrollada en tres vueltas apiladas (la de abajo más ancha), con bandas que cruzan cada vuelta, la
  // colita que asoma abajo a la izquierda, el cuello que sube y una cabeza grande de frente con ojos
  // grandes, cachetes, sonrisa y la lengüita bífida afuera.
  {
    // Vuelta: elipse ancha [cx, cy, rx, ry] con bandas en las abscisas xs (de borde a borde, apenas curvas).
    const vuelta = (E, xs) => {
      const [cx, cy, rx, ry] = E;
      const y = (x, s) => R(cy + s * ry * Math.sqrt(1 - ((x - cx) / rx) ** 2));
      const bandas = xs.map((x) => { const k = R((x - cx) / rx * 16); return `M${x} ${y(x, -1)}Q${x + k} ${cy} ${x} ${y(x, 1)}`; }).join('');
      return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>` + linea(bandas);
    };
    const cuello = [[560, 640], [620, 560], [540, 470], [500, 420]];
    add('serpiente', 'Serpiente', `
      <path d="M170 880C120 880 80 860 70 820C62 790 84 770 104 778C120 784 118 806 104 808C130 830 150 834 180 836Z"/>
      ${vuelta([500, 850, 360, 88], [240, 340, 440, 540, 640, 740])}
      ${vuelta([500, 730, 290, 82], [300, 400, 500, 600, 700])}
      ${tubo(`M${cuello[0]}${C(cuello)}`, 120)}
      ${vuelta([500, 620, 220, 76], [370, 470, 570])}
      <ellipse cx="500" cy="320" rx="175" ry="130"/>
      ${ojo(438, 300, 30, 36)}${ojo(562, 300, 30, 36)}
      ${cachete(390, 372, 36, 24)}${cachete(610, 372, 36, 24)}
      <path d="M484 404H516V470L536 500Q538 512 526 510L500 486L474 510Q462 512 464 500L484 470Z" stroke-width="12"/>
      ${linea('M440 392Q500 430 560 392')}
    `);
  }

})(window.CL);
