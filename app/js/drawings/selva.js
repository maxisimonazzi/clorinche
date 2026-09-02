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

})(window.CL);
