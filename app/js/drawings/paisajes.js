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
  const sol = (cx, cy, o = {}) => {
    const { r = 105, n = 12, g = 24, l1 = 48, l2 = 30, fase = -90 } = o;
    let d = '';
    for (let i = 0; i < n; i++) {
      const a = (fase + i * 360 / n) * RAD, l = i % 2 ? l2 : l1, c = Math.cos(a), s = Math.sin(a);
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
      ${nube(470, 110, 112, 54)}
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
      `<rect x="-30" y="230" width="262" height="460"/>` + ventana(60, 290, 100) +
      `<rect x="232" y="200" width="240" height="490"/>` + ventana(302, 250, 100) + ventana(302, 372, 100) + ventana(302, 494, 100) +
      `<rect x="472" y="290" width="260" height="400"/>` + ventana(514, 340) + ventana(622, 340) + ventana(514, 460) + ventana(622, 460) +
      `<rect x="732" y="250" width="300" height="440"/>` + ventana(778, 300) + ventana(886, 300);
    // Colectivo mirando a la derecha: carrocería, tres ventanillas, parabrisas, carita, faro y ruedas.
    const colectivo =
      `<rect x="330" y="636" width="490" height="266" rx="44"/>` +
      ventana(368, 676, 96, 84) + ventana(506, 676, 96, 84) + ventana(644, 676, 80, 84) +
      `<path d="M766 676H800Q820 676 820 700V760H766Z"/>` +
      ojo(612, 818, 16, 20) + ojo(700, 818, 16, 20) +
      cachete(566, 860, 24, 15) + cachete(746, 860, 24, 15) + sonrisa(656, 850, 18, 16) +
      `<path d="M820 820C790 824 790 870 820 874Z"/>` +
      `<circle cx="440" cy="902" r="54"/><circle cx="440" cy="902" r="12" fill="#000" stroke="none"/>` +
      `<circle cx="718" cy="902" r="54"/><circle cx="718" cy="902" r="12" fill="#000" stroke="none"/>`;
    // Semáforo: caja con tres luces sobre un poste.
    const semaforo =
      `<path d="M95 670V742" fill="none" stroke-width="22"/>` +
      `<rect x="40" y="400" width="110" height="272" rx="26"/>` +
      `<circle cx="95" cy="453" r="28"/><circle cx="95" cy="536" r="28"/><circle cx="95" cy="619" r="28"/>`;
    // Árbol de vereda: tronco y copa redonda festoneada.
    const arbol =
      `<rect x="886" y="590" width="52" height="150" rx="8"/>` +
      feston(912, 520, 92, 86, 9, -90 * RAD, 0.6);
    add('ciudad', 'Ciudad', `
      ${nube(150, 110, 104, 50)}${carita(150, 102, { ex: 30, er: [11, 14], cx: 50, cy: 20, cr: [18, 12], sy: 10, sw: 11, sh: 10 })}
      ${nube(612, 110, 96, 46, 7)}
      ${edificios}
      <path d="M-30 690H1030V1030H-30Z"/>
      <path d="M-30 760H1030" fill="none"/>
      <rect x="20" y="866" width="120" height="44" rx="18"/><rect x="860" y="866" width="120" height="44" rx="18"/>
      ${semaforo}
      ${arbol}
      ${colectivo}
    `);
  }
})(window.CL);
