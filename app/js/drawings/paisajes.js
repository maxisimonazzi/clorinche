/* Colorinche — js/drawings/paisajes.js
   Dibujos para colorear de la categoría "Paisajes": escenarios completos (playa, montañas, campo, ciudad,
   bosque, fondo del mar, espacio, Polo Norte, plaza y casita).
   Lienzo 1000 × 1000 SIN marco: cielo, suelo y agua llegan a los bordes y el borde del lienzo cierra esas
   zonas, así que toda línea que toca un borde se pasa 30 u afuera (de −30 a 1030).
   Contorno 16, detalles internos 10–14 (ver dev/ARQUITECTURA.md, secciones 5 y 5 bis). El orden importa:
   lo que va adelante se dibuja después y su relleno blanco tapa las líneas de atrás. */
'use strict';
(function (CL) {
  const add = (id, nombre, svg) => CL.drawings.add('paisajes', id, nombre, svg);
  const R = Math.round;
  const RAD = Math.PI / 180;

  /* ---------- Piezas compartidas (mismo estilo en todos los paisajes) ---------- */

  // Ojo tierno: pupila negra con un brillito grande y uno chiquito.
  const ojo = (x, y, rx = 27, ry = 34) =>
    `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#000"/>` +
    `<circle cx="${x - R(rx * 0.3)}" cy="${y - R(ry * 0.35)}" r="${R(rx * 0.38)}" fill="#fff" stroke="none"/>` +
    `<circle cx="${x + R(rx * 0.35)}" cy="${y + R(ry * 0.4)}" r="${Math.max(R(rx * 0.17), Math.min(5, R(rx * 0.3)))}" fill="#fff" stroke="none"/>`;

  // Cachete para pintar de rosado (nunca menos de 24 × 15, así no queda bloqueado).
  const cachete = (x, y, rx = 30, ry = 19) =>
    `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" stroke-width="12"/>`;

  // Sonrisa: arco abierto centrado en x, de media anchura w y profundidad h.
  const sonrisa = (x, y, w = 16, h = 16) =>
    `<path d="M${x - w} ${y}q${w} ${h} ${w * 2} 0" fill="none" stroke-width="14"/>`;

  // Carita (ojos, cachetes y sonrisa) para caras chicas; (x, y) = altura de los ojos.
  // o: ex = media distancia entre ojos, er = [rx, ry] de los ojos, cx/cy = cachetes (corrimiento desde el
  // centro y hacia abajo), cr = [rx, ry] del cachete, sy/sw/sh = sonrisa (bajada, media anchura, profundidad).
  const carita = (x, y, o = {}) => {
    const { ex = 38, er = [16, 21], cx = 52, cy = 52, cr = [25, 16], sy = 32, sw = 16, sh = 16 } = o;
    return ojo(x - ex, y, er[0], er[1]) + ojo(x + ex, y, er[0], er[1]) +
      cachete(x - cx, y + cy, cr[0], cr[1]) + cachete(x + cx, y + cy, cr[0], cr[1]) +
      sonrisa(x, y + sy, sw, sh);
  };

  // Contorno festoneado (nube, copa de árbol, arbusto, humo): n arcos hacia afuera sobre una elipse.
  function feston(cx, cy, rx, ry, n, fase = 0, abulta = 0.62) {
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

  // Nube: festón aplastado (más ancha que alta).
  const nube = (cx, cy, rx = 120, ry = 58, n = 8, fase = 22) => feston(cx, cy, rx, ry, n, fase * RAD, 0.6);

  // Sol con carita (radio de la cara 105) y rayos de línea gruesa que flotan en el cielo, largos y cortos
  // alternados. Los rayos no cortan el cielo: quedan sueltos, a 24 u de la cara.
  // o.asoma = true: sólo los rayos de arriba (el sol se asoma detrás de algo).
  const sol = (cx, cy, o = {}) => {
    const { r = 105, n = 12, g = 24, l1 = 48, l2 = 30, fase = -90, asoma = false } = o;
    let d = '';
    for (let i = 0; i < n; i++) {
      const a = (fase + i * 360 / n) * RAD, l = i % 2 ? l2 : l1, c = Math.cos(a), s = Math.sin(a);
      if (asoma && s > 0.01) continue;
      d += `M${R(cx + (r + g) * c)} ${R(cy + (r + g) * s)}L${R(cx + (r + g + l) * c)} ${R(cy + (r + g + l) * s)}`;
    }
    return `<path d="${d}" fill="none"/><circle cx="${cx}" cy="${cy}" r="${r}"/>` +
      carita(cx, cy - 18, { cy: 52, sy: 32 });
  };

  // Ola: línea ondulada de −30 a 1030 a la altura y (crestas cada `p` u, altura `h`).
  const ola = (y, p = 125, h = 26) => {
    let d = `M-30 ${y}`;
    for (let x = -30; x < 1030; x += p) d += `q${p / 4} ${-h} ${p / 2} 0t${p / 2} 0`;
    return d;
  };

  // Estrella gordita de 5 puntas con las puntas redondeadas (radio externo ro, interno ri).
  const estrella = (cx, cy, ro, ri, giro = 0) => {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = (giro - 90 + i * 36) * RAD, r = i % 2 ? ri : ro;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    const f = 0.3, P = (p) => `${R(p[0])} ${R(p[1])}`;
    const hacia = (p, q) => [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f];
    let d = '';
    for (let i = 0; i < 10; i += 2) {
      const o = pts[i], a = hacia(o, pts[(i + 9) % 10]), b = hacia(o, pts[i + 1]);
      d += (i ? 'L' : 'M') + P(a) + 'Q' + P(o) + ' ' + P(b) + 'L' + P(pts[i + 1]);
    }
    return `<path d="${d}Z"/>`;
  };

  // Matita de pasto: tres hojitas curvas que salen de (x, y). Va suelta dentro del pasto.
  const mata = (x, y) =>
    `M${x - 30} ${y - 34}Q${x - 6} ${y - 26} ${x} ${y}Q${x - 2} ${y - 34} ${x + 6} ${y - 52}` +
    `M${x} ${y}Q${x + 8} ${y - 26} ${x + 32} ${y - 32}`;
  // Pastito en zigzag (tres puntas, la del medio más alta) apoyado en (x, y).
  const pastito = (x, y) => `M${x - 36} ${y}l12-30 12 30 12-40 12 40 12-30 12 30`;

  // Tubo grueso con puntas redondas a lo largo de un recorrido (puede tener varias ramas en el mismo `d`):
  // contorno negro de 16 y adentro blanco de ancho w. Todas las ramas forman UNA sola zona (algas, corales).
  const tubo = (d, w = 46) =>
    `<path d="${d}" fill="none" stroke-width="${w + 32}"/><path d="${d}" fill="none" stroke="#fff" stroke-width="${w}"/>`;

  // Almenas (comandos relativos): borde de arriba de una torre hacia la derecha desde el punto actual,
  // n dientes de ancho w y alto h separados por huecos de ancho w. Con w ≥ 41 quedan ≥ 25 u libres.
  const almenas = (n, w = 42, h = 40) => {
    let d = '';
    for (let i = 0; i < n; i++) d += `v-${h}h${w}v${h}` + (i < n - 1 ? `h${w}` : '');
    return d;
  };

  // Pino: copa de tres pisos en escalón (una sola zona) sobre un tronco. (x, y) = centro de la base de la
  // copa, w = ancho, h = alto de la copa, t = cuánto asoma el tronco.
  const pino = (x, y, w, h, t = 56) => {
    const P = (fx, fy) => `${R(x + fx * w)} ${R(y + fy * h)}`;
    const tw = Math.max(56, R(w * 0.3));
    return `<rect x="${R(x - tw / 2)}" y="${y - 20}" width="${tw}" height="${t + 20}" rx="6"/>` +
      `<path d="M${P(0, -1)}L${P(0.3, -0.64)}H${R(x + 0.16 * w)}L${P(0.41, -0.3)}H${R(x + 0.25 * w)}L${P(0.5, 0)}` +
      `H${R(x - 0.5 * w)}L${P(-0.25, -0.3)}H${R(x - 0.41 * w)}L${P(-0.16, -0.64)}H${R(x - 0.3 * w)}Z"/>`;
  };

  // Montaña con la punta redondeada: pie izquierdo (xa, ya), punta (xp, yp), pie derecho (xb, yb); sigue
  // hacia abajo hasta pasar el borde del lienzo (lo tapa lo que va adelante). nieve = cuánto baja la nieve
  // desde la punta: la línea de la nieve (con goterones) termina justo sobre las laderas.
  const montana = (xa, ya, xp, yp, xb, yb, nieve = 0) => {
    const la = Math.hypot(xa - xp, ya - yp), lb = Math.hypot(xb - xp, yb - yp);
    const c = 26;
    let s = `<path d="M${xa} ${ya}L${R(xp + (xa - xp) * c / la)} ${R(yp + (ya - yp) * c / la)}Q${xp} ${yp} ` +
      `${R(xp + (xb - xp) * c / lb)} ${R(yp + (yb - yp) * c / lb)}L${xb} ${yb}V1030H${xa}Z"/>`;
    if (nieve) {
      const y = yp + nieve;
      const x0 = R(xp + (xa - xp) * nieve / (ya - yp)), x1 = R(xp + (xb - xp) * nieve / (yb - yp));
      const n = 3, w = (x1 - x0) / n;
      let d = `M${x0} ${y}`;
      for (let i = 0; i < n; i++) d += `Q${R(x0 + w * (i + 0.5))} ${y + 60} ${R(x0 + w * (i + 1))} ${y}`;
      s += `<path d="${d}" fill="none"/>`;
    }
    return s;
  };

  /* ---------- Playa: mar con olas, arena, sol, sombrilla, balde con palita, castillo y pelota ---------- */
  {
    // Sombrilla: 4 gajos (las varillas salen de la punta) y borde de abajo con ondas. Está inclinada (gira
    // alrededor del extremo de arriba del palo) y el palo termina detrás de la pelota.
    const sombrilla =
      `<path d="M252 355L180 872" fill="none" stroke-width="18"/>` +
      `<g transform="rotate(8 252 355)">` +
      `<path d="M40 355C52 250 140 196 252 196C364 196 452 250 464 355Q411 322 358 355Q305 322 252 355Q199 322 146 355Q93 322 40 355Z"/>` +
      `<path d="M252 200C202 240 160 290 146 355M252 200V355M252 200C302 240 344 290 358 355" fill="none"/>` +
      `<circle cx="252" cy="190" r="24"/></g>`;
    // Castillo de arena en el centro: torre del medio alta (dos almenas, ventana redonda, puerta y la
    // banderita sobre una almena) y a cada lado una torre baja con forma de balde (el lado de afuera
    // inclinado) que muestra un diente y un hueco contra la torre del medio. Dientes y huecos de ≥ 41 u.
    // La banderita cruza la línea de la ola (la tapa), así no quedan rendijas entre las dos.
    const castillo =
      `<path d="M379 596V488" fill="none"/><path d="M379 494L464 527L379 560Z"/>` +
      `<path d="M262 884L272 742v-40h41v40H360V884Z"/>` +
      `<path d="M498 884V742H545v-40h41v40L596 884Z"/>` +
      `<path d="M354 890V636${almenas(2, 50)}V890Z"/>` +
      `<circle cx="429" cy="728" r="30"/>` +
      `<path d="M399 890V846A30 30 0 0 1 459 846V890Z"/>`;
    // Balde con manija, en primer plano a la derecha, y palita (mango con agarradera en T y pala ancha)
    // clavada al lado.
    const balde =
      `<path d="M652 830C652 716 798 716 798 830" fill="none"/>` +
      `<path d="M646 836H804L786 936Q783 954 765 954H685Q667 954 664 936Z"/>` +
      `<rect x="640" y="806" width="170" height="50" rx="20"/>`;
    const palita =
      `<rect x="875" y="720" width="44" height="112"/>` +
      `<rect x="863" y="690" width="68" height="46" rx="23"/>` +
      `<path d="M853 846Q853 826 873 826H921Q941 826 941 846V872Q941 922 897 950Q853 922 853 872Z"/>`;
    // Pelota de playa: tres gajos y un botoncito arriba.
    const pelota =
      `<circle cx="124" cy="874" r="80"/>` +
      `<path d="M124 794C81 828 81 920 124 954M124 794C167 828 167 920 124 954" fill="none"/>` +
      `<circle cx="124" cy="798" r="22"/>`;
    add('playa', 'Playa', `
      ${sol(808, 196)}
      ${nube(476, 112, 122, 60)}${carita(476, 102, { ex: 34, er: [13, 17], cx: 62, cy: 26, cr: [24, 15], sy: 14, sw: 12, sh: 11 })}
      <path d="M96 126q26-30 52 0q26-30 52 0" fill="none" stroke-width="14"/>
      <path d="M-30 440H1030V1030H-30Z"/>
      <path d="${ola(530, 120, 24)}" fill="none"/>
      <path d="M-30 660Q32 630 95 660T220 660T345 660T470 660T595 660T720 660T845 660T970 660T1095 660V1030H-30Z"/>
      ${sombrilla}
      ${castillo}
      ${balde}${palita}
      ${pelota}
    `);
  }

  /* ---------- Montañas: dos montañas nevadas con el sol en el medio, lago, pinos y una cabañita ---------- */
  {
    // Cabañita: paredes, techo a dos aguas, chimenea, puerta y ventana (≥ 42 u entre cada cosa).
    const cabana =
      `<rect x="830" y="530" width="50" height="130"/>` +
      `<rect x="646" y="640" width="250" height="160" rx="6"/>` +
      `<path d="M622 656L771 536L920 656Z"/>` +
      `<path d="M688 800V734A30 30 0 0 1 748 734V800Z"/>` +
      `<rect x="792" y="704" width="60" height="54" rx="8"/>`;
    // El pasto sube en los bordes: las laderas terminan adentro del pasto y no contra el borde.
    add('montanas', 'Montañas', `
      ${sol(500, 205)}
      ${nube(150, 118, 100, 48)}${nube(868, 124, 88, 44, 7)}
      ${montana(440, 700, 750, 270, 1030, 700, 110)}
      ${montana(-30, 700, 250, 230, 590, 700, 115)}
      <path d="M-30 560C120 580 260 640 500 646S860 610 1030 570V1030H-30Z"/>
      <path d="M692 796C700 880 740 950 760 1030H960C900 950 790 880 744 796Z"/>
      ${pino(358, 730, 124, 220, 70)}
      ${pino(164, 770, 170, 300, 74)}
      ${cabana}
      <ellipse cx="492" cy="886" rx="170" ry="74"/>
      <path d="M404 872q18-16 36 0t36 0M508 906q18-16 36 0t36 0" fill="none" stroke-width="12"/>
      <path d="${mata(120, 930)}${mata(250, 880)}${mata(930, 850)}" fill="none" stroke-width="12"/>
    `);
  }

  /* ---------- Campo: granero con puerta en X, molino, cerca de madera, lomas, camino, sol y pollito ---------- */
  {
    // Granero de frente: fachada con techo a la holandesa (banda de techo de 52 u), guarda a la altura
    // del alero, ventana redonda arriba y portón con la X.
    const granero =
      `<path d="M80 780V500L140 390L250 330L360 390L420 500V780Z"/>` +
      `<path d="M80 500H420" fill="none"/>` +
      `<path d="M70 518L140 390L250 330L360 390L430 518L475 493L398 352L250 271L102 352L25 493Z"/>` +
      `<circle cx="250" cy="430" r="40"/>` +
      `<rect x="176" y="590" width="148" height="190"/>` +
      `<path d="M176 590L324 780M324 590L176 780" fill="none"/>`;
    // Molino de campo: torre alta (con dos travesaños) y rueda de 10 aspas con el eje en el medio.
    let aspas = '';
    for (let i = 0; i < 10; i++) {
      const a = (i * 36 + 18) * RAD;
      aspas += `M${R(820 + 30 * Math.cos(a))} ${R(300 + 30 * Math.sin(a))}L${R(820 + 118 * Math.cos(a))} ${R(300 + 118 * Math.sin(a))}`;
    }
    const molino =
      `<path d="M760 730L795 320H845L880 730Z"/>` +
      `<path d="M782 470H858M771 600H869" fill="none"/>` +
      `<circle cx="820" cy="300" r="118"/><path d="${aspas}" fill="none"/>` +
      `<circle cx="820" cy="300" r="30"/>`;
    // Cerca de madera: dos postes en punta y dos travesaños (50 u de alto, 50 u entre ellos) que siguen
    // hasta pasar el borde.
    const poste = (x) => `<path d="M${x - 26} 962V796L${x} 770L${x + 26} 796V962Z"/>`;
    const cerca =
      `<rect x="700" y="796" width="340" height="50"/><rect x="700" y="896" width="340" height="50"/>` +
      poste(720) + poste(880);
    // Pollito de costado mirando a la derecha (como el pajarito de "Naturaleza"): cuerpo redondo, ala,
    // pico redondeado, ojo, copete y patitas.
    const pollito = (x, y) =>
      `<path d="M${x - 24} ${y + 68}v22M${x + 24} ${y + 68}v22M${x - 38} ${y + 90}h28M${x + 10} ${y + 90}h28" fill="none" stroke-width="12"/>` +
      `<path d="M${x - 8} ${y - 78}c-4-22 6-38 22-44M${x - 8} ${y - 78}c8-18 22-26 38-24" fill="none" stroke-width="12"/>` +
      `<path d="M${x + 64} ${y - 22}C${x + 106} ${y - 24} ${x + 130} ${y - 4} ${x + 122} ${y + 10}C${x + 114} ${y + 24} ${x + 90} ${y + 34} ${x + 64} ${y + 32}Z"/>` +
      `<circle cx="${x}" cy="${y}" r="80"/>` +
      `<path d="M${x - 50} ${y}C${x - 30} ${y - 6} ${x + 16} ${y + 2} ${x + 22} ${y + 26}C${x + 26} ${y + 50} ${x - 24} ${y + 50} ${x - 50} ${y}Z"/>` +
      ojo(x + 34, y - 26, 14, 18);
    add('campo', 'Campo', `
      ${sol(500, 190)}
      ${nube(160, 112, 100, 48)}
      <path d="M-30 520C120 450 300 470 450 520S760 470 1030 500V1030H-30Z"/>
      <path d="M-30 700C200 650 600 720 1030 670V1030H-30Z"/>
      <path d="M200 780C180 860 150 950 130 1030H520C460 950 340 860 300 780Z"/>
      <path d="${mata(80, 900)}${mata(640, 776)}" fill="none" stroke-width="12"/>
      ${granero}
      ${molino}
      ${cerca}
      ${pollito(526, 862)}
    `);
  }

  /* ---------- Ciudad: edificios con ventanas grandes, vereda, calle, colectivo, semáforo, árbol y nubes ---------- */
  {
    // Ventana: rectángulo redondeado.
    const ventana = (x, y, w = 70, h = 76) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10"/>`;
    // Edificios de fondo (la base queda tapada por la vereda). Las ventanas quedan a ≥ 42 u de los bordes
    // y de lo que va adelante (semáforo, árbol, colectivo).
    const edificios =
      `<rect x="-30" y="180" width="262" height="510"/>` + ventana(64, 224, 100, 70) +
      `<rect x="232" y="130" width="240" height="560"/>` + ventana(302, 176, 100, 70) + ventana(302, 288, 100, 70) + ventana(302, 400, 100, 70) +
      `<rect x="472" y="290" width="260" height="400"/>` + ventana(515, 340, 66, 72) + ventana(624, 340, 66, 72) + ventana(515, 456, 66, 72) + ventana(624, 456, 66, 72) +
      `<rect x="732" y="250" width="300" height="440"/>` + ventana(775, 300) + ventana(888, 300);
    // Colectivo mirando a la derecha: carrocería, tres ventanillas y parabrisas, carita entre las ruedas,
    // faro y ruedas.
    const colectivo =
      `<rect x="300" y="600" width="540" height="300" rx="44"/>` +
      ventana(342, 644, 90, 80) + ventana(474, 644, 90, 80) + ventana(606, 644, 90, 80) +
      `<path d="M738 644H796Q840 644 840 688V724H748Q738 724 738 714Z"/>` +
      ojo(540, 782, 15, 19) + ojo(610, 782, 15, 19) +
      cachete(497, 838, 24, 15) + cachete(653, 838, 24, 15) + sonrisa(575, 826, 16, 16) +
      `<path d="M840 770C814 774 814 822 840 826Z"/>` +
      `<circle cx="390" cy="900" r="52"/><circle cx="390" cy="900" r="12" fill="#000" stroke="none"/>` +
      `<circle cx="760" cy="900" r="52"/><circle cx="760" cy="900" r="12" fill="#000" stroke="none"/>`;
    // Semáforo: caja con tres luces sobre un poste corto.
    const semaforo =
      `<path d="M96 630V716" fill="none" stroke-width="22"/>` +
      `<rect x="34" y="340" width="124" height="300" rx="28"/>` +
      `<circle cx="96" cy="400" r="25"/><circle cx="96" cy="490" r="25"/><circle cx="96" cy="580" r="25"/>`;
    // Árbol de vereda: tronco y copa redonda festoneada que pasa el borde derecho.
    const arbol =
      `<rect x="900" y="580" width="52" height="136" rx="8"/>` +
      feston(935, 516, 100, 84, 9, -90 * RAD, 0.6);
    add('ciudad', 'Ciudad', `
      ${nube(122, 94, 72, 34, 7)}${nube(884, 124, 70, 34, 7)}
      ${nube(640, 128, 122, 60)}${carita(640, 118, { ex: 34, er: [13, 17], cx: 62, cy: 26, cr: [24, 15], sy: 14, sw: 12, sh: 11 })}
      ${edificios}
      <path d="M-30 690H1030V1030H-30Z"/>
      <path d="M-30 760H1030" fill="none"/>
      <rect x="-40" y="866" width="170" height="44" rx="18"/><rect x="880" y="866" width="170" height="44" rx="18"/>
      ${semaforo}
      ${arbol}
      ${colectivo}
    `);
  }

  /* ---------- Bosque: árboles grandes y pinos, hongos, arbustos, sendero, conejito y el sol que se asoma ---------- */
  {
    // Bosque lejano: fila de copas redondas (una sola zona) detrás de la que se asoma el sol.
    const cimas = [[-30, 416], [80, 404], [200, 420], [300, 402], [430, 424], [540, 410], [660, 420], [770, 402], [900, 422], [1030, 410]];
    let lejos = 'M-30 1030V416';
    for (let i = 1; i < cimas.length; i++) {
      const [x0, y0] = cimas[i - 1], [x1, y1] = cimas[i], r = R(Math.hypot(x1 - x0, y1 - y0) * 0.56);
      lejos += `A${r} ${r} 0 0 1 ${x1} ${y1}`;
    }
    lejos += 'V1030Z';
    // Árbol de copa redonda: tronco y copa festoneada.
    const arbol = (x, yc, r, yb) =>
      `<rect x="${x - 28}" y="${yc}" width="56" height="${yb - yc}" rx="8"/>` + feston(x, yc, r, R(r * 0.92), 9, -90 * RAD, 0.6);
    // Hongo: sombrero en cúpula con lunares (bien adentro) sobre un tronquito. (x, y) = base del sombrero.
    const hongo = (x, y, w, lunares) => {
      const k = (v) => R(v * w);
      return `<path d="M${x - k(0.15)} ${y - 10}C${x - k(0.19)} ${y + k(0.12)} ${x - k(0.18)} ${y + k(0.26)} ${x - k(0.14)} ${y + k(0.34)}` +
        `H${x + k(0.14)}C${x + k(0.18)} ${y + k(0.26)} ${x + k(0.19)} ${y + k(0.12)} ${x + k(0.15)} ${y - 10}Z"/>` +
        `<path d="M${x - k(0.5)} ${y}C${x - k(0.5)} ${y - k(0.66)} ${x + k(0.5)} ${y - k(0.66)} ${x + k(0.5)} ${y}Q${x} ${y - k(0.08)} ${x - k(0.5)} ${y}Z"/>` +
        lunares.map(([dx, dy, r]) => `<circle cx="${x + dx}" cy="${y + dy}" r="${r}"/>`).join('');
    };
    // Arbusto: festones arriba y base recta (y = base, w = ancho, h = alto).
    const arbusto = (x, y, w, h, n = 5) => {
      let d = `M${x - w / 2} ${y}`;
      let px = x - w / 2, py = y;
      for (let i = 1; i <= n; i++) {
        const a = Math.PI + (i / n) * Math.PI, qx = R(x + (w / 2) * Math.cos(a)), qy = R(y + h * Math.sin(a) * 0.82);
        const r = R(Math.hypot(qx - px, qy - py) * 0.58);
        d += `A${r} ${r} 0 0 1 ${qx} ${qy}`;
        px = qx; py = qy;
      }
      return `<path d="${d}Z"/>`;
    };
    // Conejito sentado de frente: orejas largas, cabeza grande con carita, cuerpo y patitas.
    const conejo = (x, y) =>
      `<ellipse cx="${x - 52}" cy="${y - 164}" rx="34" ry="80" transform="rotate(-12 ${x - 52} ${y - 164})"/>` +
      `<ellipse cx="${x + 52}" cy="${y - 164}" rx="34" ry="80" transform="rotate(12 ${x + 52} ${y - 164})"/>` +
      `<ellipse cx="${x}" cy="${y + 118}" rx="90" ry="62"/>` +
      `<ellipse cx="${x - 46}" cy="${y + 170}" rx="36" ry="19"/><ellipse cx="${x + 46}" cy="${y + 170}" rx="36" ry="19"/>` +
      `<circle cx="${x}" cy="${y}" r="100"/>` +
      ojo(x - 36, y - 16, 16, 20) + ojo(x + 36, y - 16, 16, 20) +
      cachete(x - 50, y + 34, 24, 15) + cachete(x + 50, y + 34, 24, 15) +
      `<ellipse cx="${x}" cy="${y + 12}" rx="11" ry="8" fill="#000"/>` +
      `<path d="M${x - 14} ${y + 26}q7 10 14 0q7 10 14 0" fill="none" stroke-width="10"/>`;
    add('bosque', 'Bosque', `
      ${sol(500, 196, { asoma: true })}
      <path d="${lejos}"/>
      <path d="M-30 636C200 610 400 646 600 630S900 612 1030 626V1030H-30Z"/>
      <path d="M470 636C440 760 380 900 300 1030H700C620 900 560 760 530 636Z"/>
      ${arbol(320, 420, 105, 690)}${arbol(680, 420, 105, 690)}
      ${pino(110, 650, 180, 400, 36)}${pino(890, 650, 180, 400, 36)}
      ${arbusto(110, 704, 220, 100)}${arbusto(890, 704, 220, 100)}
      ${hongo(180, 876, 240, [[-58, -46, 20], [4, -86, 22], [62, -44, 19]])}
      ${hongo(836, 930, 150, [[0, -50, 23]])}
      ${conejo(500, 768)}
    `);
  }

  /* ---------- Fondo del mar: algas, corales, peces, burbujas, cofre del tesoro, estrella y piedras ---------- */
  {
    // Pez mirando a la derecha: cola, aleta de arriba, cuerpo (con franja opcional) y carita: ojo adelante,
    // cachete atrás y abajo del ojo, sonrisa en la punta. (x, y) = centro del cuerpo.
    const pez = (x, y, rx, ry, franja) => {
      const P = (fx, fy) => `${R(x + fx * rx)} ${R(y + fy * ry)}`;
      let s = `<path d="M${P(-0.8, 0)}L${P(-1.42, -0.86)}Q${P(-1.2, 0)} ${P(-1.42, 0.86)}Z"/>` +
        `<path d="M${P(0.3, -0.92)}C${P(0.1, -1.5)} ${P(-0.5, -1.72)} ${P(-0.66, -1.44)}C${P(-0.64, -1.2)} ${P(-0.54, -1)} ${P(-0.46, -0.86)}Z"/>` +
        `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/>`;
      if (franja) {
        const yb = (dx) => R(ry * Math.sqrt(1 - (dx / rx) ** 2));
        s += '<path d="' + franja.map((a) => `M${x + a} ${y - yb(a)}Q${x + a - 12} ${y} ${x + a} ${y + yb(a)}`).join('') + '" fill="none"/>';
      }
      return s + ojo(R(x + rx * 0.44), R(y - ry * 0.22), 17, 21) + cachete(R(x + rx * 0.14), R(y + ry * 0.36), 24, 15) +
        sonrisa(R(x + rx * 0.78), R(y + ry * 0.18), 10, 10);
    };
    // Cofre del tesoro: tapa redondeada, caja, un fleje al medio y la cerradura (con ojo de llave) que tapa
    // la unión entre tapa y caja.
    const cofre =
      `<path d="M400 800V744Q400 690 460 690H540Q600 690 600 744V800Z"/>` +
      `<rect x="400" y="800" width="200" height="100" rx="10"/>` +
      `<path d="M470 692V900M530 692V900" fill="none"/>` +
      `<rect x="460" y="768" width="80" height="62" rx="14"/>` +
      `<path d="M500 784a9 9 0 0 1 6 16l5 16h-22l5-16a9 9 0 0 1 6-16Z" fill="#000" stroke-width="4"/>`;
    // Estrella de mar con carita (ojos y sonrisa; no le entran cachetes).
    const estrellaMar = (x, y) =>
      estrella(x, y, 100, 60, 6) + ojo(x - 22, y - 8, 13, 16) + ojo(x + 22, y - 8, 13, 16) + sonrisa(x, y + 20, 12, 12);
    // Coral: tronco y dos ramas (un solo tubo).
    const coral = (x, s = 1) =>
      tubo(`M${x} 830V690M${x} 770Q${x - 50 * s} 760 ${x - 54 * s} 660M${x} 740Q${x + 50 * s} 730 ${x + 54 * s} 640`, 44);
    add('fondo-del-mar', 'Fondo del mar', `
      <path d="${ola(64, 120, 24)}" fill="none"/>
      ${tubo('M92 830C62 770 122 720 92 650S62 530 100 400', 40)}
      ${tubo('M908 830C938 770 878 700 908 620S938 470 900 340', 40)}
      ${coral(272)}${coral(728, -1)}
      <path d="M-30 730C90 724 190 744 280 776S420 802 500 802S800 792 1030 800V1030H-30Z"/>
      <ellipse cx="864" cy="900" rx="82" ry="46"/><ellipse cx="760" cy="936" rx="46" ry="28"/>
      ${cofre}
      ${estrellaMar(150, 878)}
      <g transform="translate(1040 0) scale(-1 1)">${pez(520, 430, 150, 95, [-92, -50])}</g>
      ${pez(230, 210, 105, 66)}
      <circle cx="366" cy="382" r="20"/><circle cx="348" cy="312" r="24"/><circle cx="402" cy="246" r="26"/>
      <circle cx="790" cy="180" r="26"/><circle cx="846" cy="128" r="18"/>
    `);
  }

  /* ---------- Espacio: cohete, luna con cráteres, planeta con anillo, planeta a rayas, platillo y estrellas ---------- */
  {
    // Cohete (de pie en coordenadas propias, centro en 0,0; se gira con el grupo): llama de dos capas,
    // aletas, cuerpo con punta separada por una línea, franja y ventanita redonda.
    const cohete =
      `<path d="M-58 128Q-84 222 0 294Q84 222 58 128Z"/><path d="M-20 140Q-24 192 0 232Q24 192 20 140Z"/>` +
      `<path d="M-66 30Q-138 60 -128 160L-60 124Z"/><path d="M66 30Q138 60 128 160L60 124Z"/>` +
      `<path d="M-78 124V-40C-78 -130 -34 -190 0 -224C34 -190 78 -130 78 -40V124Q78 146 56 146H-56Q-78 146 -78 124Z"/>` +
      `<path d="M-62 -118Q0 -140 62 -118M-78 70H78" fill="none"/>` +
      `<circle cx="0" cy="-24" r="46"/>`;
    // Planeta con anillo, un poco inclinado: el anillo pasa por detrás arriba y por delante abajo.
    const anillo = (frente) =>
      `<path d="M-196 0A196 60 0 0 ${frente ? 0 : 1} 196 0H92A92 26 0 0 ${frente ? 1 : 0} -92 0Z"/>`;
    const saturno = (x, y) =>
      `<g transform="translate(${x} ${y}) rotate(-14)">${anillo(false)}<circle r="106"/>${anillo(true)}</g>`;
    // Luna grande en la esquina (pasa los bordes) con carita y cráteres.
    const luna =
      `<circle cx="140" cy="890" r="270"/>` +
      `<circle cx="110" cy="700" r="34"/><circle cx="328" cy="926" r="30"/><circle cx="80" cy="940" r="28"/>` +
      carita(200, 800);
    // Platillo volador: domo, plato y lucecitas.
    const platillo = (x, y) =>
      `<path d="M${x - 54} ${y}C${x - 54} ${y - 104} ${x + 54} ${y - 104} ${x + 54} ${y}Z"/>` +
      `<ellipse cx="${x}" cy="${y + 10}" rx="104" ry="38"/>` +
      `<circle cx="${x - 56}" cy="${y + 14}" r="9" fill="#000"/><circle cx="${x}" cy="${y + 24}" r="9" fill="#000"/><circle cx="${x + 56}" cy="${y + 14}" r="9" fill="#000"/>`;
    // Brillito de cuatro puntas (líneas sueltas).
    const brillo = (x, y, l = 22) => `M${x - l} ${y}H${x + l}M${x} ${y - l}V${y + l}`;
    add('espacio', 'Espacio', `
      ${luna}
      <circle cx="170" cy="190" r="74"/><path d="M104 158Q170 176 236 158M100 214Q170 232 240 214" fill="none"/>
      ${saturno(760, 226)}
      ${platillo(840, 610)}
      <g transform="rotate(35 520 540)"><g transform="translate(520 540)">${cohete}</g></g>
      ${estrella(430, 116, 56, 30)}${estrella(918, 424, 50, 27)}${estrella(620, 880, 56, 30)}${estrella(350, 410, 50, 27)}
      <path d="${brillo(70, 430)}${brillo(900, 880)}${brillo(560, 110)}" fill="none" stroke-width="12"/>
    `);
  }

  /* ---------- Polo Norte: iglú de bloques, pingüino, oso polar sobre un témpano, montañas y copos ---------- */
  {
    // Copo de nieve de línea (seis brazos con una V cada uno); queda suelto en el cielo.
    const copo = (x, y, r = 58) => {
      let d = '';
      for (let i = 0; i < 6; i++) {
        const a = (i * 60 - 90) * RAD, c = Math.cos(a), s = Math.sin(a), m = r * 0.56, v = r * 0.34;
        d += `M${x} ${y}L${R(x + r * c)} ${R(y + r * s)}`;
        for (const g of [-45, 45]) {
          const b = a + g * RAD;
          d += `M${R(x + m * c)} ${R(y + m * s)}l${R(v * Math.cos(b))} ${R(v * Math.sin(b))}`;
        }
      }
      return d;
    };
    // Iglú: domo de bloques en tres filas (las juntas de abajo coinciden con el túnel de la entrada) y el
    // túnel con la puerta oscura.
    const iglu = (x, y) => {
      const ex = (dy) => R(190 * Math.sqrt(1 - (dy / 210) ** 2));
      return `<path d="M${x - 190} ${y}A190 210 0 0 1 ${x + 190} ${y}Z"/>` +
        `<path d="M${x - ex(60)} ${y - 60}H${x + ex(60)}M${x - ex(140)} ${y - 140}H${x + ex(140)}` +
        `M${x - 100} ${y - 60}V${y - 140}M${x + 100} ${y - 60}V${y - 140}M${x} ${y - 140}V${y - 210}" fill="none"/>` +
        `<path d="M${x - 84} ${y}A84 84 0 0 1 ${x + 84} ${y}Z"/><path d="M${x - 42} ${y}A42 42 0 0 1 ${x + 42} ${y}Z"/>`;
    };
    // Pingüino de frente: aletas, cuerpo en huevo con la capucha oscura arriba, carita, pico y patas.
    const pinguino = (x, y) =>
      `<ellipse cx="${x - 118}" cy="${y + 40}" rx="26" ry="62" transform="rotate(24 ${x - 118} ${y + 40})"/>` +
      `<ellipse cx="${x + 118}" cy="${y + 40}" rx="26" ry="62" transform="rotate(-24 ${x + 118} ${y + 40})"/>` +
      `<ellipse cx="${x}" cy="${y}" rx="126" ry="146"/>` +
      `<path d="M${x - 108} ${y - 74}Q${x - 52} ${y - 82} ${x} ${y - 50}Q${x + 52} ${y - 82} ${x + 108} ${y - 74}" fill="none"/>` +
      `<ellipse cx="${x - 44}" cy="${y + 146}" rx="38" ry="20"/><ellipse cx="${x + 44}" cy="${y + 146}" rx="38" ry="20"/>` +
      ojo(x - 42, y - 8, 16, 20) + ojo(x + 42, y - 8, 16, 20) +
      cachete(x - 74, y + 44, 24, 15) + cachete(x + 74, y + 44, 24, 15) +
      `<path d="M${x - 24} ${y + 14}Q${x} ${y + 2} ${x + 24} ${y + 14}Q${x + 16} ${y + 44} ${x} ${y + 52}Q${x - 16} ${y + 44} ${x - 24} ${y + 14}Z"/>`;
    // Oso polar sentado de frente: orejas, cuerpo, patas, cabeza con hocico, nariz y boquita.
    const oso = (x, y) =>
      `<circle cx="${x - 68}" cy="${y - 78}" r="34"/><circle cx="${x + 68}" cy="${y - 78}" r="34"/>` +
      `<ellipse cx="${x}" cy="${y + 120}" rx="100" ry="74"/>` +
      `<ellipse cx="${x - 50}" cy="${y + 186}" rx="38" ry="22"/><ellipse cx="${x + 50}" cy="${y + 186}" rx="38" ry="22"/>` +
      `<circle cx="${x}" cy="${y}" r="96"/>` +
      ojo(x - 36, y - 18, 15, 19) + ojo(x + 36, y - 18, 15, 19) +
      `<ellipse cx="${x}" cy="${y + 38}" rx="32" ry="24"/>` +
      `<ellipse cx="${x}" cy="${y + 28}" rx="10" ry="7" fill="#000"/>` +
      `<path d="M${x - 12} ${y + 42}q6 8 12 0q6 8 12 0" fill="none" stroke-width="10"/>`;
    add('polo-norte', 'Polo Norte', `
      <path d="${copo(120, 130, 70)}${copo(540, 120, 60)}${copo(930, 116, 50)}" fill="none" stroke-width="13"/>
      ${montana(-30, 720, 160, 300, 380, 620, 86)}${montana(230, 620, 420, 250, 640, 620, 90)}
      <path d="M-30 560H1030V1030H-30Z"/>
      <path d="M696 600L716 530L746 500H918L948 530L962 600Z"/>
      ${oso(832, 320)}
      <path d="M-30 670Q60 650 150 672T330 668T510 672T690 668T870 672T1050 668V1030H-30Z"/>
      ${iglu(230, 860)}
      ${pinguino(640, 800)}
    `);
  }

  /* ---------- Plaza: tobogán, hamaca, subibaja, arenero, banco, árboles y sol ---------- */
  {
    // Árbol de copa redonda con tronco (la copa festoneada tapa la punta del tronco).
    const arbol = (x, yc, r, yb) =>
      `<rect x="${x - 28}" y="${yc}" width="56" height="${yb - yc}" rx="8"/>` + feston(x, yc, r, R(r * 0.9), 9, -90 * RAD, 0.6);
    // Tobogán: escalera (parantes y escalones en un solo tubo), plataforma y la rampa (otro tubo).
    const tobogan =
      tubo('M280 530C370 540 390 704 476 716', 44) +
      tubo('M92 750V530M182 750V530M92 700H182M92 616H182', 26) +
      `<rect x="66" y="506" width="232" height="48" rx="14"/>`;
    // Hamaca: travesaño y dos patas en A (un tubo; las patas de adentro casi derechas para que el asiento
    // quede lejos), sogas y asiento.
    const hamaca =
      tubo('M620 484H940M650 484L590 790M650 484L672 790M910 484L888 790M910 484L940 790', 26) +
      `<path d="M754 513V700M806 513V700" fill="none" stroke-width="12"/>` +
      `<rect x="738" y="696" width="84" height="44" rx="16"/>`;
    // Banco: respaldo, asiento, soportes y patas.
    const banco =
      `<path d="M384 836V884M494 836V884M378 924V958M500 924V958" fill="none"/>` +
      `<rect x="362" y="790" width="154" height="46" rx="14"/><rect x="352" y="880" width="174" height="46" rx="14"/>`;
    // Arenero: marco de madera y arena adentro.
    const arenero =
      `<path d="M36 960L86 820H296L334 960Z"/><path d="M100 916L118 866H261L274 916Z"/>`;
    // Subibaja: pie triangular y tabla inclinada.
    const subibaja =
      `<path d="M712 958L762 880L812 958Z"/>` +
      `<rect x="610" y="876" width="304" height="46" rx="18" transform="rotate(-10 762 899)"/>`;
    add('plaza', 'Plaza', `
      ${sol(500, 172)}
      ${arbol(84, 240, 104, 420)}${arbol(916, 240, 104, 420)}
      <path d="M-30 404C200 384 400 414 600 400S860 384 1030 400V1030H-30Z"/>
      ${tobogan}
      ${hamaca}
      ${arenero}
      ${banco}
      ${subibaja}
    `);
  }

  /* ---------- Casita: casa con techo, chimenea con humo, puerta y ventanas, cerca, jardín, camino, árbol y sol ---------- */
  {
    // Ventana con cruz (cuatro vidrios).
    const ventana = (x, y, s = 90) =>
      `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="8"/>` +
      `<path d="M${x + s / 2} ${y}V${y + s}M${x} ${y + s / 2}H${x + s}" fill="none" stroke-width="12"/>`;
    // Cerca de tablas en punta pegadas entre sí, de x0 a x1 (base y): cada tabla es una zona.
    const cerca = (x0, x1, y, w = 70, h = 110) => {
      let s = '';
      for (let x = x0; x < x1; x += w) s += `<path d="M${x} ${y}V${y - h + 26}L${x + w / 2} ${y - h}L${x + w} ${y - h + 26}V${y}Z"/>`;
      return s;
    };
    // Tulipán: flor en copa con tres puntas, tallo que pasa el borde de abajo y una hoja.
    const tulipan = (x, y, lado = 1) =>
      `<path d="M${x} ${y + 20}V1030" fill="none"/>` +
      `<path d="M${x} ${y + 82}Q${x + 52 * lado} ${y + 72} ${x + 64 * lado} ${y + 32}Q${x + 20 * lado} ${y + 42} ${x} ${y + 82}Z"/>` +
      `<path d="M${x - 36} ${y - 8}L${x - 40} ${y - 58}L${x - 16} ${y - 34}L${x} ${y - 64}L${x + 16} ${y - 34}L${x + 40} ${y - 58}L${x + 36} ${y - 8}` +
      `Q${x + 32} ${y + 26} ${x} ${y + 28}Q${x - 32} ${y + 26} ${x - 36} ${y - 8}Z"/>`;
    // Casa: chimenea, paredes, techo con ventanita redonda, dos ventanas con cruz arriba y la puerta.
    const casa =
      `<rect x="360" y="250" width="52" height="160"/>` +
      `<rect x="320" y="424" width="360" height="336" rx="6"/>` +
      `<path d="M286 444L500 230L714 444Z"/>` +
      `<circle cx="500" cy="362" r="34"/>` +
      ventana(364, 490) + ventana(546, 490) +
      `<path d="M464 760V668A36 36 0 0 1 536 668V760Z"/><circle cx="520" cy="710" r="7" fill="#000"/>`;
    // El pasto empieza detrás de la cerca y de la casa (entre las puntas de las tablas se ve el cielo).
    add('casita', 'Casita', `
      ${sol(820, 170)}
      ${nube(540, 96, 86, 42, 7)}
      ${feston(292, 160, 66, 42, 7, 20 * RAD, 0.6)}
      <rect x="862" y="590" width="56" height="140"/>
      ${feston(894, 510, 112, 100, 9, -90 * RAD, 0.6)}
      <path d="M-30 720H1030V1030H-30Z"/>
      ${cerca(-30, 320, 760)}${cerca(680, 1030, 760)}
      <path d="M464 760C440 860 404 950 380 1030H620C596 950 560 860 536 760Z"/>
      ${casa}
      ${tulipan(100, 872)}${tulipan(250, 888, -1)}${tulipan(750, 888)}${tulipan(900, 872, -1)}
    `);
  }
})(window.CL);
