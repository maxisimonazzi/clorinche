/* Colorinche — js/drawings/fantasia.js
   Dibujos para colorear de la categoría "Fantasía": unicornio, dragón, castillo, sirena, robot y monstruito.
   Lienzo 1000 × 1000, contorno 16, detalles internos 10–12 (ver dev/ARQUITECTURA.md, sección 5).
   El orden importa: lo que va adelante se dibuja después y su relleno blanco tapa las líneas de atrás. */
'use strict';
(function (CL) {
  const add = (id, nombre, svg) => CL.drawings.add('fantasia', id, nombre, svg);
  const R = Math.round;
  const RAD = Math.PI / 180;
  const P = (p) => `${R(p[0])} ${R(p[1])}`;

  /* ---------- Geometría ---------- */

  // Punto de una curva cúbica (a, b, c, d) en t.
  function bz(a, b, c, d, t) {
    const u = 1 - t;
    const k = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
    return [0, 1].map((i) => k[0] * a[i] + k[1] * b[i] + k[2] * c[i] + k[3] * d[i]);
  }

  // Tramo de una cúbica entre t0 y t1 (de Casteljau): devuelve "C c1 c2 fin" (arranca en bz(t0)).
  function tramo(a, b, c, d, t0, t1) {
    const parte = (p0, p1, p2, p3, t) => {
      const m = (u, v) => [u[0] + (v[0] - u[0]) * t, u[1] + (v[1] - u[1]) * t];
      const ab = m(p0, p1), bc = m(p1, p2), cd = m(p2, p3), abc = m(ab, bc), bcd = m(bc, cd), f = m(abc, bcd);
      return [[p0, ab, abc, f], [f, bcd, cd, p3]];
    };
    let [, dcha] = parte(a, b, c, d, t0);
    const [izq] = parte(...dcha, (t1 - t0) / (1 - t0));
    return `C${P(izq[1])} ${P(izq[2])} ${P(izq[3])}`;
  }

  /* ---------- Piezas compartidas (mismo estilo en toda la categoría) ---------- */

  // Mechón de pelo (crin, cola, pelo de la sirena): un "trazo grueso" cerrado alrededor de una línea central
  // hecha de cúbicas encadenadas [p0, c1, c2, p1, c1, c2, p2, ...]. El ancho va de w0 (base, que queda
  // escondida detrás de otra forma) a w1 (punta, redondeada). Los bordes se suavizan con cuadráticas.
  function mechon(seg, w0, w1, n = 6) {
    const c = [];
    for (let i = 0; i + 3 < seg.length; i += 3) {
      for (let k = i ? 1 : 0; k <= n; k++) c.push(bz(seg[i], seg[i + 1], seg[i + 2], seg[i + 3], k / n));
    }
    const m = c.length - 1, izq = [], der = [];
    c.forEach((p, i) => {
      const a = c[Math.max(0, i - 1)], b = c[Math.min(m, i + 1)];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const w = (w0 + (w1 - w0) * i / m) / 2;
      const nx = -(b[1] - a[1]) / l * w, ny = (b[0] - a[0]) / l * w;
      izq.push([p[0] + nx, p[1] + ny]);
      der.push([p[0] - nx, p[1] - ny]);
    });
    const suave = (q) => q.slice(1, -1).reduce((d, p, i) =>
      d + `Q${P(p)} ${P([(p[0] + q[i + 2][0]) / 2, (p[1] + q[i + 2][1]) / 2])}`, '') + `L${P(q[q.length - 1])}`;
    const r = R(w1 / 2);
    return `<path d="M${P(izq[0])}${suave(izq)}A${r} ${r} 0 0 0 ${P(der[m])}${suave(der.reverse())}Z"/>`;
  }

  // Ojo tierno: pupila negra con un brillito grande y uno chiquito.
  const ojo = (x, y, rx = 28, ry = 35) =>
    `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#000"/>` +
    `<circle cx="${x - R(rx * 0.3)}" cy="${y - R(ry * 0.35)}" r="${Math.min(10, R(rx * 0.34))}" fill="#fff" stroke="none"/>` +
    `<circle cx="${x + R(rx * 0.35)}" cy="${y + R(ry * 0.4)}" r="${R(rx * 0.17)}" fill="#fff" stroke="none"/>`;

  // Cachete para pintar de rosado.
  const cachete = (x, y, rx = 32, ry = 21) =>
    `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" stroke-width="12"/>`;

  // Línea de detalle abierta (sonrisas, rayitas).
  const linea = (d, w = 12) => `<path d="${d}" fill="none" stroke-width="${w}"/>`;

  // Estrella de 5 puntas (zona para pintar).
  function estrella(cx, cy, r, rot = 0, w = 14) {
    let d = '';
    for (let i = 0; i < 10; i++) {
      const a = (-90 + rot + i * 36) * RAD;
      const k = i % 2 ? r * 0.5 : r;
      d += (i ? 'L' : 'M') + P([cx + k * Math.cos(a), cy + k * Math.sin(a)]);
    }
    return `<path d="${d}Z" stroke-width="${w}"/>`;
  }

  // Contorno festoneado (nube, pelaje): n arcos hacia afuera sobre una elipse.
  function nube(cx, cy, rx, ry, n, fase = 0, abulta = 0.56) {
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

  /* ---------- Unicornio: cuerno en espiral, crin y cola en mechones, carita dulce, estrellitas ---------- */
  // Cuerno curvado hacia adelante con la punta redondeada. Borde de atrás a→p1, arco de la punta p1→p2,
  // borde de adelante p2→b, y la base apenas combada. Las franjas en espiral son curvas en S que van de
  // un borde al otro en diagonal (cada extremo cruza el borde para cerrar bien la zona).
  function cuerno(a, ca1, ca2, p1, p2, cb2, cb1, b, cortes) {
    const atras = [a, ca1, ca2, p1], adelante = [b, cb1, cb2, p2];
    const franjas = cortes.map(([s1, s2]) => {
      const p = bz(...atras, s1), q = bz(...adelante, s2);
      const d = [q[0] - p[0], q[1] - p[1]], n = [-d[1] * 0.18, d[0] * 0.18];
      const ext = (u, v, k) => [u[0] + (u[0] - v[0]) * k, u[1] + (u[1] - v[1]) * k];
      return `M${P(p)}C${P([p[0] + d[0] / 3 + n[0], p[1] + d[1] / 3 + n[1]])} ` +
        `${P([p[0] + d[0] * 2 / 3 - n[0], p[1] + d[1] * 2 / 3 - n[1]])} ${P(q)}`;
    }).join('');
    const rp = R(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 2);
    return `<path d="M${P(a)}C${P(ca1)} ${P(ca2)} ${P(p1)}A${rp} ${rp} 0 0 1 ${P(p2)}` +
      `C${P(cb2)} ${P(cb1)} ${P(b)}Q${R((a[0] + b[0]) / 2)} ${R((a[1] + b[1]) / 2 + 14)} ${P(a)}Z"/>` + linea(franjas, 12);
  }

  // Pata de caballo: x = borde izquierdo, w = ancho, desde y0 (escondido bajo el cuerpo) hasta el piso y1.
  function pataCaballo(x, w, y0, y1, casco = 62) {
    const r = 24, h = w - 2 * r;
    return `<path d="M${x} ${y0}V${y1 - r}q0 ${r} ${r} ${r}h${h}q${r} 0 ${r}-${r}V${y0}z"/>` +
      `<path d="M${x} ${y1 - casco}q${w / 2} 12 ${w} 0V${y1 - r}q0 ${r}-${r} ${r}h-${h}q-${r} 0-${r}-${r}z"/>`;
  }

  add('unicornio', 'Unicornio', `
    <ellipse cx="490" cy="905" rx="420" ry="32"/>
    ${linea('M880 895l-20-40M880 895v-50M880 895l20-40')}
    ${estrella(130, 165, 62, -8)}
    ${estrella(330, 100, 52, 10)}
    ${estrella(885, 585, 58, 12)}
    ${mechon([[232, 585], [170, 530], [94, 565], [94, 650], [94, 720], [128, 760], [110, 820], [100, 850], [72, 856], [66, 830]], 92, 28)}
    ${mechon([[234, 610], [180, 594], [136, 628], [144, 690], [166, 735], [218, 752], [210, 790], [204, 812], [180, 816], [174, 798]], 62, 26)}
    ${pataCaballo(324, 80, 700, 885)}${pataCaballo(630, 80, 700, 885)}
    ${pataCaballo(260, 80, 700, 905)}${pataCaballo(566, 80, 700, 905)}
    <path d="M500 430C480 500 410 516 330 520 240 524 198 578 202 635 206 690 248 725 310 728 380 732 430 748 490 748 560 748 630 738 680 728 755 712 790 668 786 612 782 555 742 525 735 470Z"/>
    ${mechon([[600, 380], [520, 350], [440, 400], [420, 500], [396, 530], [376, 560], [350, 556], [336, 552], [336, 530], [352, 526]], 100, 28)}
    ${mechon([[560, 290], [470, 250], [414, 310], [404, 390], [392, 430], [370, 452], [346, 446], [330, 440], [332, 418], [348, 416]], 96, 28)}
    ${mechon([[610, 230], [560, 160], [470, 160], [440, 220], [424, 256], [400, 290], [374, 300], [356, 306], [348, 286], [362, 278]], 90, 28)}
    <path d="M540 215C505 165 520 110 560 85 600 110 616 160 606 208Z"/>
    ${linea('M565 190C556 160 558 134 566 116')}
    <path d="M470 330C470 240 540 182 620 182 700 184 750 240 770 300 830 305 870 350 868 405 866 460 820 490 760 490 700 490 660 482 620 482 530 482 470 420 470 330Z"/>
    ${linea('M770 300C730 350 725 440 760 490')}
    ${mechon([[676, 212], [636, 186], [592, 196], [586, 232], [582, 256], [594, 276], [614, 268]], 64, 28)}
    ${cuerno([628, 222], [616, 150], [676, 96], [736, 62], [766, 76], [752, 120], [724, 170], [714, 222], [[0.36, 0.22], [0.7, 0.56]])}
    ${ojo(648, 330, 30, 38)}
    ${linea('M670 298l22-16M679 316l27-6')}
    ${cachete(662, 412, 40, 26)}
    <ellipse cx="842" cy="366" rx="12" ry="8" fill="#000"/>
    ${linea('M790 448q28 18 55-4')}
  `);

  // Camino cerrado de cúbicas [inicio, c1, c2, fin, c1, c2, fin, ...] en coordenadas locales (0,0 = ancla),
  // girado `ang` grados (horario) y escalado `k` alrededor de (x, y). El giro se aplica a los puntos.
  function girada(x, y, ang, k, pts) {
    const c = Math.cos(ang * RAD), sn = Math.sin(ang * RAD);
    const p = (dx, dy) => P([x + k * (dx * c - dy * sn), y + k * (dx * sn + dy * c)]);
    return `M${p(...pts[0])}` +
      pts.slice(1).reduce((d, _, i, a) => (i % 3 ? d : d + `C${p(...a[i])} ${p(...a[i + 1])} ${p(...a[i + 2])}`), '') + 'Z';
  }

  /* ---------- Dragón: de frente, cuernos curvos, cresta redonda, panza con escamas, alas, cola con púas y fuego ---------- */
  // Escamas de la panza: arcos que siguen la curva de abajo de la panza (cada extremo queda dentro del contorno).
  function panzaEscamas(cx, cy, rx, ry, ys, cae) {
    return ys.map((y) => {
      const k = rx * Math.sqrt(1 - ((y - cy) / ry) ** 2) - 2;
      return `M${R(cx - k)} ${y - 4}Q${cx} ${y + cae} ${R(cx + k)} ${y - 4}`;
    }).join('');
  }
  // Fuego que sale de la boca: llama de 3 lenguas (la del medio, grande y curvada) que nace en punta en (x, y)
  // y se abre hacia la dirección `ang` (grados, 90 = a la derecha), escalada `k`. Adentro, una llamita.
  function fuego(x, y, ang, k) {
    const d = (pts) => girada(x, y, ang, k, pts);
    const fuera = [[0, 0],
      [-30, -14], [-80, -40], [-82, -90], // borde izquierdo
      [-80, -115], [-92, -135], [-84, -172], // lengua chica izquierda
      [-66, -146], [-50, -136], [-38, -128], // hueco
      [-45, -164], [-25, -209], [14, -256], // lengua grande del medio
      [32, -214], [47, -179], [44, -144], // bajada
      [57, -154], [68, -166], [74, -192], // lengua chica derecha
      [98, -154], [96, -110], [84, -80], // lado derecho
      [70, -40], [30, -14], [0, 0]];
    const dentro = [[0, -46], [-36, -58], [-46, -90], [-30, -112], [-18, -127], [-6, -142], [0, -182],
      [10, -142], [20, -127], [32, -112], [46, -90], [36, -58], [0, -46]];
    return `<path d="${d(fuera)}"/><path d="${d(dentro)}" stroke-width="12"/>`;
  }

  // Ala de murciélago: borde de arriba (cúbica desde la raíz `r` hasta la punta), borde de abajo festoneado
  // (arcos hacia adentro entre los puntos `bs`; el último queda escondido detrás del cuerpo) y dos "dedos"
  // que arrancan lejos de la raíz para que no se amontonen líneas.
  function ala(r, c1, c2, punta, bs, tj = 0.45) {
    let d = `M${P(r)}C${P(c1)} ${P(c2)} ${P(punta)}`;
    let prev = punta;
    for (const b of bs) {
      const m = [(prev[0] + b[0]) / 2, (prev[1] + b[1]) / 2];
      const v = [r[0] - m[0], r[1] - m[1]], k = 58 / Math.hypot(...v);
      d += `Q${P([m[0] + v[0] * k, m[1] + v[1] * k])} ${P(b)}`;
      prev = b;
    }
    const j = bz(r, c1, c2, punta, tj);
    return `<path d="${d}Z"/>` + linea(`M${P(j)}L${P(bs[0])}M${P(j)}L${P(bs[1])}`, 12);
  }
  // Cola gruesa (mechón) con el borde de arriba convexo, 3 púas iguales que achican hacia la punta
  // (siguiendo la normal del borde, con la base metida adentro de la cola) y punta de corazón.
  function colaDragon(c, w0, w1) {
    const borde = (t) => {
      const p = bz(...c, t), a = bz(...c, Math.max(0, t - 0.01)), b = bz(...c, Math.min(1, t + 0.01));
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]), u = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
      let n = [u[1], -u[0]];
      if (n[1] > 0) n = [-n[0], -n[1]]; // hacia arriba
      const w = (w0 + (w1 - w0) * t) / 2;
      return { p: [p[0] + n[0] * w, p[1] + n[1] * w], u, n, c: p };
    };
    const pua = (t, alto, ancho) => {
      const { p, u, n } = borde(t);
      const q = (s, h) => [p[0] + u[0] * s * ancho / 2 + n[0] * h, p[1] + u[1] * s * ancho / 2 + n[1] * h];
      return `<path d="M${P(q(-1, -18))}C${P(q(-0.8, alto * 0.6))} ${P(q(-0.3, alto))} ${P(q(0, alto))}` +
        `C${P(q(0.3, alto))} ${P(q(0.8, alto * 0.6))} ${P(q(1, -18))}Z"/>`;
    };
    const { c: T, u, n } = borde(1);
    const q = (s, h) => [T[0] + u[0] * h + n[0] * s, T[1] + u[1] * h + n[1] * s];
    const flecha = `<path d="M${P(q(0, 76))}C${P(q(30, 46))} ${P(q(54, 24))} ${P(q(48, -2))}C${P(q(42, -26))} ${P(q(12, -26))} ${P(q(0, -8))}` +
      `C${P(q(-12, -26))} ${P(q(-42, -26))} ${P(q(-48, -2))}C${P(q(-54, 24))} ${P(q(-30, 46))} ${P(q(0, 76))}Z"/>`;
    return pua(0.42, 76, 84) + pua(0.6, 66, 74) + pua(0.76, 58, 66) + mechon(c, w0, w1) + flecha;
  }

  // Media cara izquierda del dragón (la derecha se espeja alrededor de x = 430): cuerno curvo que se afina y bracito.
  const cuernoDragon =
    `<path d="M296 222C246 196 198 150 204 90A12 12 0 0 1 228 90C238 132 290 158 348 172Z"/>`;
  const bracito =
    `<path d="M362 522C320 525 275 548 245 585 228 580 206 584 208 602 190 606 190 628 208 632 200 648 218 660 232 648 262 628 310 612 366 606Z"/>`;
  const espejo = (s) => `<g transform="translate(860 0) scale(-1 1)">${s}</g>`;

  add('dragon', 'Dragón', `
    ${ala([330, 470], [250, 420], [150, 410], [66, 450], [[80, 585], [160, 590], [250, 556], [330, 540]])}
    ${ala([530, 470], [620, 446], [760, 460], [880, 486], [[874, 600], [780, 600], [690, 562], [600, 540]])}
    ${colaDragon([[470, 800], [660, 760], [820, 790], [880, 866]], 124, 46)}
    <ellipse cx="430" cy="640" rx="200" ry="195"/>
    <g transform="translate(0 20)">${bracito}${espejo(bracito)}</g>
    <ellipse cx="430" cy="662" rx="108" ry="190"/>
    ${linea(panzaEscamas(430, 662, 108, 190, [560, 645, 730], 62))}
    <ellipse cx="320" cy="856" rx="95" ry="55"/>
    <ellipse cx="540" cy="856" rx="95" ry="55"/>
    ${linea('M290 880v-26M330 882v-26M510 882v-26M550 884v-26', 10)}
    <g transform="translate(-20 10)">
      <path d="M322 170C312 112 336 72 370 64 394 90 404 126 400 152Z"/>
      <path d="M538 170C548 112 524 72 490 64 466 90 456 126 460 152Z"/>
      <path d="M388 150C378 90 400 50 430 42 460 50 482 90 472 150Z"/>
      ${cuernoDragon}${espejo(cuernoDragon)}
    </g>
    <path d="M410 135C520 135 590 190 600 250 660 245 715 270 728 322 740 380 700 435 630 445 560 458 470 472 400 468 340 466 300 452 275 430 230 398 218 350 220 300 222 200 300 135 410 135Z"/>
    ${ojo(340, 255, 30, 38)}${ojo(478, 250, 26, 34)}
    ${cachete(292, 335, 38, 26)}${cachete(532, 334, 38, 26)}
    <ellipse cx="664" cy="298" rx="9" ry="13" fill="#000"/>
    <ellipse cx="692" cy="312" rx="8" ry="12" fill="#000"/>
    ${linea('M548 398Q640 436 724 368')}
    ${fuego(712, 376, 90, 0.8)}
  `);

  /* ---------- Castillo: torres con techos cónicos y banderines, almenas, puerta con arco, nubes ---------- */
  const techo = (x0, x1, apex, h) =>
    `<path d="M${x0} ${apex[1] + h}Q${R((x0 + apex[0]) / 2) + 12} ${apex[1] + h * 0.55} ${P(apex)}Q${R((x1 + apex[0]) / 2) - 12} ${apex[1] + h * 0.55} ${x1} ${apex[1] + h}Q${apex[0]} ${apex[1] + h + 26} ${x0} ${apex[1] + h}Z"/>`;
  const bandera = (x, y) =>
    linea(`M${x} ${y + 5}V${y - 84}`, 14) +
    `<path d="M${x} ${y - 88}Q${x + 52} ${y - 100} ${x + 112} ${y - 62}Q${x + 52} ${y - 34} ${x} ${y - 26}Z"/>`;
  const ventana = (x, y, w = 64, h = 90) =>
    `<path d="M${x} ${y + h}V${y + w / 2}A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2}V${y + h}Z"/>`;
  // Ventanita con forma de corazón (el detalle tierno del castillo), centrada en (x, y).
  const corazon = (x, y, k = 1) => {
    const p = (dx, dy) => `${R(x + dx * k)} ${R(y + dy * k)}`;
    return `<path d="M${p(0, 44)}C${p(-30, 22)} ${p(-58, 2)} ${p(-54, -22)}C${p(-50, -48)} ${p(-14, -52)} ${p(0, -24)}` +
      `C${p(14, -52)} ${p(50, -48)} ${p(54, -22)}C${p(58, 2)} ${p(30, 22)} ${p(0, 44)}Z"/>`;
  };

  add('castillo', 'Castillo', `
    ${nube(138, 112, 80, 42, 7)}
    ${nube(866, 108, 78, 40, 7, 0.4)}
    <ellipse cx="500" cy="900" rx="440" ry="50"/>
    ${linea('M425 870L398 940M575 870L602 940', 16)}
    ${bandera(500, 150)}
    <rect x="410" y="330" width="180" height="280"/>
    ${techo(385, 615, [500, 150], 190)}
    ${corazon(500, 418)}
    <path d="M270 880V490H350V560H410V490H470V560H530V490H590V560H650V490H730V880Z"/>
    ${ventana(322, 610)}${ventana(614, 610)}
    <path d="M425 880V775A75 75 0 0 1 575 775V880Z"/>
    ${linea('M500 700V880')}
    <circle cx="476" cy="815" r="9" fill="#000"/><circle cx="524" cy="815" r="9" fill="#000"/>
    <circle cx="500" cy="628" r="38"/>
    ${bandera(200, 275)}${bandera(800, 275)}
    <rect x="110" y="470" width="180" height="410"/>
    <rect x="710" y="470" width="180" height="410"/>
    ${techo(88, 312, [200, 275], 200)}${techo(688, 912, [800, 275], 200)}
    ${ventana(168, 540)}${ventana(768, 540)}
    ${ventana(168, 720)}${ventana(768, 720)}
  `);

  /* ---------- Sirena: pelo largo ondulado con rulos, top de conchitas, cola con escamas y aleta, algas ---------- */
  function sirena() {
    // Cola: borde exterior (iz, iz2) e interior (de, de2) como cúbicas; arriba, la cintura con escamitas
    // (arcos que abultan hacia abajo; quedan tapados en el medio por las conchitas).
    const iz = [[346, 612], [304, 718], [350, 830], [490, 860]];
    const iz2 = [[490, 860], [610, 885], [700, 855], [760, 805]];
    const de = [[494, 612], [500, 708], [540, 760], [600, 765]];
    const de2 = [[600, 765], [660, 770], [710, 752], [748, 720]];
    let cintura = '';
    for (let i = 1; i <= 4; i++) cintura += `A22 22 0 0 1 ${494 - i * 37} 612`;
    const cola = `M${P(iz[0])}C${P(iz[1])} ${P(iz[2])} ${P(iz[3])}C${P(iz2[1])} ${P(iz2[2])} ${P(iz2[3])}` +
      `L${P(de2[3])}C${P(de2[2])} ${P(de2[1])} ${P(de2[0])}C${P(de[2])} ${P(de[1])} ${P(de[0])}${cintura}Z`;
    // Franjas de escamas: festón de 2 arcos entre un punto del borde exterior y uno del interior,
    // todos abultados hacia la punta de la cola.
    const franja = (p, q) => {
      const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      const r = R(Math.hypot(q[0] - p[0], q[1] - p[1]) / 4 + 4);
      return `M${P(p)}A${r} ${r} 0 0 0 ${P(m)}A${r} ${r} 0 0 0 ${P(q)}`;
    };
    const f1 = franja(bz(...iz, 0.45), bz(...de, 0.4));
    const f2 = franja(bz(...iz, 0.9), bz(...de, 0.85));
    const f3 = franja(bz(...iz2, 0.5), bz(...de2, 0.45));
    return { cola, franjas: f1 + f2 + f3 };
  }
  const sir = sirena();
  // Conchita: abanico con el borde de arriba festoneado (3 lóbulos) y dos rayitas en abanico que nacen de la base.
  const concha = (x, y) =>
    `<path d="M${x} ${y + 40}C${x - 33} ${y + 31} ${x - 51} ${y + 7} ${x - 50} ${y - 13}A17 17 0 0 1 ${x - 17} ${y - 22}` +
    `A17 17 0 0 1 ${x + 17} ${y - 22}A17 17 0 0 1 ${x + 50} ${y - 13}C${x + 51} ${y + 7} ${x + 33} ${y + 31} ${x} ${y + 40}Z" stroke-width="12"/>` +
    linea(`M${x - 3} ${y + 32}L${x - 17} ${y + 2}M${x + 3} ${y + 32}L${x + 17} ${y + 2}`, 10);
  // Mano abierta (manopla con pulgar) centrada en (x, y), girada `ang` grados (0 = dedos para arriba).
  const manopla = (x, y, ang) => `<path d="${girada(x, y, ang, 1, [[-26, 44],
    [-30, 24], [-34, 12], [-40, 2], [-58, -12], [-54, -42], [-32, -36],
    [-30, -54], [-24, -66], [-2, -68], [24, -68], [38, -50], [36, -20], [34, 10], [30, 28], [26, 44]])}"/>`;

  add('sirena', 'Sirena', `
    ${mechon([[134, 900], [124, 840], [64, 812], [84, 750]], 66, 38)}
    ${mechon([[200, 900], [218, 850], [176, 830], [200, 780]], 62, 36)}
    <path d="M56 932C64 884 104 868 162 868 220 868 260 884 268 932Z"/>
    ${mechon([[340, 320], [250, 360], [196, 420], [226, 500], [256, 580], [186, 610], [204, 680], [210, 704], [190, 724], [168, 714], [150, 706], [156, 680], [174, 684]], 124, 44)}
    ${mechon([[500, 320], [590, 360], [644, 420], [614, 500], [584, 580], [654, 610], [636, 680], [630, 704], [650, 724], [672, 714], [690, 706], [684, 680], [666, 684]], 124, 44)}
    <path d="M745 715C790 660 850 610 925 600 905 660 885 700 852 740 905 760 945 800 952 862 870 862 800 830 760 800Z"/>
    ${linea('M790 740C825 700 860 670 890 650M800 770C840 790 880 810 910 835')}
    ${mechon([[470, 505], [560, 505], [640, 470], [690, 420]], 58, 54)}
    ${manopla(706, 378, 25)}
    <path d="M384 430V470C350 474 334 492 338 520L352 630H488L502 520C506 492 490 474 456 470V430Z"/>
    <path d="${sir.cola}"/>
    ${linea(sir.franjas)}
    ${concha(370, 530)}${concha(470, 530)}
    <circle cx="420" cy="290" r="155"/>
    <path d="M252 350C230 225 292 100 420 100 548 100 610 225 588 350Q546 332 538 258Q505 282 468 236Q430 280 392 236Q355 282 322 258Q304 322 252 350Z"/>
    ${estrella(544, 168, 46, 12)}
    ${ojo(368, 322, 22, 28)}${ojo(472, 322, 22, 28)}
    ${cachete(355, 394, 30, 21)}${cachete(485, 394, 30, 21)}
    ${linea('M400 392q20 16 40 0')}
    <circle cx="720" cy="150" r="30" stroke-width="12"/>
    <circle cx="850" cy="220" r="40" stroke-width="12"/>
    <circle cx="880" cy="350" r="28" stroke-width="12"/>
  `);

  /* ---------- Robot: antena, ojos redondos, panel de botones, brazos con pinzas, patas ---------- */
  // Pinza en forma de "C": anillo grueso con la boca abierta hacia `dir` (grados).
  function pinza(cx, cy, dir, ro = 66, ri = 20, abre = 70) {
    const a1 = (dir + abre / 2) * RAD, a2 = (dir - abre / 2 + 360) * RAD;
    const pt = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    return `<path d="M${P(pt(ro, a1))}A${ro} ${ro} 0 1 1 ${P(pt(ro, a2))}L${P(pt(ri, a2))}A${ri} ${ri} 0 1 0 ${P(pt(ri, a1))}Z"/>`;
  }
  // Brazo recto: barra de ancho w que nace en el centro del hombro (a) y llega a b; la pinza va 50 u más allá,
  // siguiendo el brazo, así la punta queda escondida debajo del anillo y no asoma por el agujero.
  function brazoRobot(a, b, w) {
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]), u = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
    const n = [-u[1] * w / 2, u[0] * w / 2];
    const q = (p, s) => P([p[0] + n[0] * s, p[1] + n[1] * s]);
    return `<path d="M${q(a, 1)}L${q(b, 1)} ${q(b, -1)} ${q(a, -1)}Z"/>` +
      pinza(b[0] + u[0] * 50, b[1] + u[1] * 50, Math.atan2(u[1], u[0]) / RAD);
  }

  add('robot', 'Robot', `
    ${linea('M500 158V118', 16)}
    <circle cx="500" cy="84" r="36"/>
    <rect x="190" y="240" width="72" height="100" rx="20"/>
    <rect x="738" y="240" width="72" height="100" rx="20"/>
    ${brazoRobot([282, 548], [205, 690], 62)}
    ${brazoRobot([718, 548], [840, 440], 62)}
    <circle cx="282" cy="548" r="55"/>
    <circle cx="718" cy="548" r="55"/>
    <rect x="370" y="730" width="80" height="110"/>
    <rect x="550" y="730" width="80" height="110"/>
    <path d="M320 910V875Q320 830 365 830H445Q470 830 470 855V910Z"/>
    <path d="M680 910V875Q680 830 635 830H555Q530 830 530 855V910Z"/>
    <rect x="290" y="440" width="420" height="310" rx="50"/>
    <rect x="360" y="495" width="280" height="205" rx="28"/>
    <path d="M500 595C470 570 440 565 440 540 440 525 460 515 475 520 488 525 495 535 500 543 505 535 512 525 525 520 540 515 560 525 560 540 560 565 530 570 500 595Z" stroke-width="12"/>
    <circle cx="430" cy="645" r="28" stroke-width="12"/>
    <circle cx="500" cy="645" r="28" stroke-width="12"/>
    <circle cx="570" cy="645" r="28" stroke-width="12"/>
    <rect x="255" y="150" width="490" height="310" rx="64"/>
    <circle cx="395" cy="262" r="68"/>
    <circle cx="605" cy="262" r="68"/>
    ${ojo(395, 264, 22, 24)}${ojo(605, 264, 22, 24)}
    ${cachete(322, 382, 36, 24)}${cachete(678, 382, 36, 24)}
    <path d="M428 364H572Q572 428 500 428Q428 428 428 364Z"/>
  `);

  /* ---------- Monstruito: redondo y peludito, tres ojos, cuernitos, dientitos y manchas ---------- */
  function boca() {
    // Boca: borde de arriba (sonrisa) y dos mitades de abajo; lengua y dientitos calzan justo en el borde.
    const top = [[385, 560], [440, 585], [560, 585], [615, 560]];
    const der = [[615, 560], [615, 670], [560, 725], [500, 725]];
    const izq = [[500, 725], [440, 725], [385, 670], [385, 560]];
    const d = `M${P(top[0])}C${P(top[1])} ${P(top[2])} ${P(top[3])}C${P(der[1])} ${P(der[2])} ${P(der[3])}` +
      `C${P(izq[1])} ${P(izq[2])} ${P(izq[3])}Z`;
    // Lengua: arco que arranca en la mitad izquierda, sube y baja a la derecha, y vuelve por el borde de la boca.
    const a = bz(...izq, 0.5), b = bz(...der, 0.5);
    const lengua = `M${P(a)}C${P([a[0] + 15, 664])} ${P([b[0] - 15, 664])} ${P(b)}` +
      tramo(...der, 0.5, 1) + tramo(...izq, 0, 0.5) + 'Z';
    // Colmillito: triángulo colgado del borde de arriba con la punta redondeada.
    const diente = (t0, t1) => {
      const p = bz(...top, t0), q = bz(...top, t1);
      const tip = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2 + 56];
      return `<path d="M${P(p)}L${P([tip[0] - 10, tip[1] - 6])}A12 12 0 0 0 ${P([tip[0] + 10, tip[1] - 6])}L${P(q)}Z" stroke-width="12"/>`;
    };
    return `<path d="${d}"/><path d="${lengua}" stroke-width="12"/>${diente(0.15, 0.34)}${diente(0.66, 0.85)}`;
  }
  // Mancha con forma de poroto (irregular, para que no se confunda con otro ojo), girada `ang` grados.
  const mancha = (x, y, ang, k = 1) => `<path d="${girada(x, y, ang, k, [[-46, 4],
    [-48, -30], [-16, -42], [0, -32], [14, -24], [44, -38], [50, -4],
    [54, 28], [20, 42], [-2, 38], [-26, 36], [-44, 28], [-46, 4]])}"/>`;
  // Bracito derecho levantado, saludando con la manito abierta (el izquierdo es su espejo).
  const bracitoMonstruo =
    mechon([[730, 500], [790, 490], [825, 455], [838, 415]], 66, 60) + manopla(857, 372, 25);

  add('monstruito', 'Monstruito', `
    <path d="M350 300C300 262 282 200 302 138 322 200 372 240 440 262Z"/>
    <path d="M650 300C700 262 718 200 698 138 678 200 628 240 560 262Z"/>
    <path d="M455 262C440 225 460 185 500 165 540 185 560 225 545 262Z"/>
    ${bracitoMonstruo}
    <g transform="translate(1000 0) scale(-1 1)">${bracitoMonstruo}</g>
    <ellipse cx="385" cy="865" rx="100" ry="52"/>
    <ellipse cx="615" cy="865" rx="100" ry="52"/>
    ${linea('M350 890v-26M410 890v-26M590 890v-26M650 890v-26', 10)}
    ${nube(500, 545, 285, 280, 22, -Math.PI / 2, 0.62)}
    ${mancha(338, 700, 60, 0.85)}
    ${mancha(662, 700, 125, 0.85)}
    <circle cx="500" cy="395" r="80"/>
    <circle cx="345" cy="470" r="62"/>
    <circle cx="655" cy="470" r="62"/>
    ${ojo(500, 402, 34, 40)}
    ${ojo(345, 472, 18, 22)}${ojo(655, 472, 18, 22)}
    ${cachete(298, 578, 34, 22)}${cachete(702, 578, 34, 22)}
    ${boca()}
  `);
})(window.CL);
