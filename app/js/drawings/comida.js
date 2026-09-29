/* Colorines — js/drawings/comida.js
   Dibujos para colorear de la categoría "Comida": helado, torta, frutilla, pizza, manzana y sandía.
   Estilo kawaii (todos con carita). Lienzo 1000 × 1000, contorno 16 (ver dev/ARQUITECTURA.md, sección 5).
   El orden importa: lo que va adelante se dibuja después y su relleno blanco tapa las líneas de atrás. */
'use strict';
(function (CL) {
  const add = (id, nombre, svg) => CL.drawings.add('comida', id, nombre, svg);
  const R = Math.round;

  /* ---------- Piezas compartidas (mismo estilo en toda la categoría) ---------- */

  // Ojo tierno: pupila negra con un brillito grande y uno chiquito.
  const ojo = (x, y, rx, ry) =>
    `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#000"/>` +
    `<circle cx="${x - R(rx * 0.3)}" cy="${y - R(ry * 0.35)}" r="${Math.min(10, R(rx * 0.38))}" fill="#fff" stroke="none"/>` +
    `<circle cx="${x + R(rx * 0.35)}" cy="${y + R(ry * 0.4)}" r="${R(rx * 0.17)}" fill="#fff" stroke="none"/>`;

  // Ojito feliz cerrado (arco "∩" suelto): para reírse o guiñar.
  const ojoFeliz = (x, y, rx) =>
    `<path d="M${x - rx} ${y + 10}Q${x} ${y - R(rx * 1.5)} ${x + rx} ${y + 10}" fill="none" stroke-width="12"/>`;

  // Cachete para pintar de rosado.
  const cachete = (x, y, rx, ry) =>
    `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" stroke-width="12"/>`;

  // Boca abierta (media luna cerrada, se puede pintar).
  const boca = (x, y, w, h) =>
    `<path d="M${x - w} ${y}q0 ${h} ${w} ${h}q${w} 0 ${w}-${h}z" stroke-width="12"/>`;

  /* Boca grande con lengüita: la lengua es una zona cerrada abajo, separada por un arco que sale
     del borde de la boca (a mitad de cada curva) y sube un poco en el medio. */
  const bocaLengua = (x, y, w, h) => boca(x, y, w, h) +
    `<path d="M${x - R(w * 0.8)} ${y + R(h * 0.7)}Q${x} ${y + R(h * 0.02)} ${x + R(w * 0.8)} ${y + R(h * 0.7)}" fill="none" stroke-width="12"/>`;

  /* Carita completa; (x, y) = centro entre los ojos. k escala todo (1 = carita mediana).
     sep = media distancia entre ojos. ojos: 'normal' | 'felices' (los dos cerrados) | 'guino' (el derecho
     cerrado). lengua: boca más grande con lengüita. Cachetes y boca con zonas de ≥ 45 u para el dedo.
     mc (opcional): cuánto se corren los cachetes hacia afuera de cada ojo (para caritas angostas). */
  function cara(x, y, { k = 1, sep = 80, ojos = 'normal', lengua = false, mc } = {}) {
    const rx = R(27 * k), ry = R(33 * k), m = mc != null ? mc : R(66 * k), dy = R(54 * k);
    const izq = ojos === 'felices' ? ojoFeliz(x - sep, y, R(rx * 1.2)) : ojo(x - sep, y, rx, ry);
    const der = ojos === 'normal' ? ojo(x + sep, y, rx, ry) : ojoFeliz(x + sep, y, R(rx * 1.2));
    const ch = (cx) => cachete(cx, y + dy, R(42 * k), R(28 * k));
    const b = lengua ? bocaLengua(x, y + R(44 * k), R(50 * k), R(88 * k)) : boca(x, y + R(38 * k), R(36 * k), R(50 * k));
    return izq + der + ch(x - sep - m) + ch(x + sep + m) + b;
  }

  /* Gotita cerrada (semilla): punta hacia arriba, girada `ang` grados y escalada `s`.
     Con ang = 180 queda con la panza arriba (semilla de frutilla, que no parezca una lágrima). */
  const gotita = (x, y, ang = 0, s = 1) =>
    `<path d="M0 ${R(-34 * s)}C${R(26 * s)} ${R(-6 * s)} ${R(26 * s)} ${R(28 * s)} 0 ${R(28 * s)}` +
    `C${R(-26 * s)} ${R(28 * s)} ${R(-26 * s)} ${R(-6 * s)} 0 ${R(-34 * s)}z" stroke-width="12"` +
    ` transform="translate(${x} ${y}) rotate(${ang})"/>`;

  // Borde de gotas (crema, helado derretido): desde (x, y) avanza `ancho` (negativo = a la derecha),
  // una "U" por cada profundidad de la lista (la gota baja más o menos esa profundidad).
  function gotas(x, y, ancho, prof) {
    const w = ancho / prof.length;
    let d = '';
    prof.forEach((g, i) => {
      const a = R(x - i * w), b = R(x - (i + 1) * w), k = R(g * 4 / 3);
      d += `C${a} ${y + k} ${b} ${y + k} ${b} ${y}`;
    });
    return d;
  }

  /* ---------- Helado: cucurucho cuadriculado, dos bochas, cereza y chispitas ---------- */

  // Bocha: domo redondo arriba y borde de gotitas abajo.
  function bocha(cx, top, hw, base, prof) {
    const H = base - top;
    return `<path d="M${cx - hw} ${base}` +
      `C${cx - hw - 34} ${R(base - H * 0.5)} ${R(cx - hw * 0.62)} ${top} ${cx} ${top}` +
      `C${R(cx + hw * 0.62)} ${top} ${cx + hw + 34} ${R(base - H * 0.5)} ${cx + hw} ${base}` +
      gotas(cx + hw, base, 2 * hw, prof) + 'Z"/>';
  }

  /* Cucurucho: triángulo con la punta redondeada, cuadriculado grande en diagonal y un borde de
     barquillo arriba. Los lados del cono siguen derecho por debajo del barquillo (así salen de su borde
     de abajo, que es recto, sin escalón). Las rejas son paralelas a los lados y se cruzan sobre el borde
     del barquillo en los tercios: las tres celdas de arriba quedan del mismo tamaño (el más grande posible). */
  function cucurucho(cx, T, hw, tipY) {
    const h = tipY - T, q = hw / h, L = cx - hw, Rr = cx + hw;
    const f = 0.9; // dónde empieza el redondeo de la punta
    const sube = 40, dx = R(q * sube);
    const cono = `M${L - dx} ${T - sube}L${R(L + hw * f)} ${R(T + h * f)}Q${cx} ${tipY + 6} ${R(Rr - hw * f)} ${R(T + h * f)}` +
      `L${Rr + dx} ${T - sube}Z`;
    let rejas = '';
    for (const x0 of [L + (2 * hw) / 3, L + (4 * hw) / 3]) {
      // Paralela al lado izquierdo (baja hacia la derecha) hasta tocar el lado derecho, y su espejo.
      const d = (Rr - x0) / (2 * q);
      rejas += `M${R(x0)} ${T}L${R(x0 + q * d)} ${R(T + d)}`;
      const xm = 2 * cx - x0;
      rejas += `M${R(xm)} ${T}L${R(xm - q * d)} ${R(T + d)}`;
    }
    // Barquillo: banda redondeada un poco más ancha que el cono, con el borde de abajo recto.
    const borde = `M${L - 38} ${T - 76}Q${L - 40} ${T - 98} ${L - 16} ${T - 98}H${Rr + 16}Q${Rr + 40} ${T - 98} ${Rr + 38} ${T - 76}` +
      `L${Rr + 26} ${T - 14}Q${Rr + 24} ${T} ${Rr + 10} ${T}H${L - 10}Q${L - 24} ${T} ${L - 26} ${T - 14}Z`;
    // Las rejas se dibujan y después se repasa el contorno para que los cruces queden prolijos.
    return `<path d="${cono}"/><path d="${rejas}" fill="none" stroke-width="12"/><path d="${cono}" fill="none"/>` +
      `<path d="${borde}"/>`;
  }

  add('helado', 'Helado', `
    ${cucurucho(500, 708, 180, 958)}
    ${bocha(500, 350, 250, 618, [38, 28, 32, 24, 24, 32, 28, 38])}
    ${bocha(500, 165, 200, 385, [30, 46, 30, 30, 46, 30])}
    <path d="M382 298l-28 16M618 294l28 14M462 248l14 24M548 306l-4 32M428 352l-26-8M584 350l24-16M538 234l26-6" fill="none" stroke-width="14"/>
    <path d="M506 92q16-32 62-40" fill="none" stroke-width="14"/>
    <circle cx="500" cy="140" r="57"/>
    <path d="M473 122q12-17 30-18" fill="none" stroke-width="10"/>
    ${cara(500, 505, { ojos: 'guino' })}
  `);

  /* ---------- Torta: tres pisos con crema chorreando, velitas y frutillitas ---------- */

  // Piso de torta: cuerpo con esquinas redondeadas y cobertura de crema con gotas encima.
  function piso(x0, x1, top, bot, crema, prof) {
    const r = 30;
    const cuerpo = `M${x0} ${top + r}V${bot - r}q0 ${r} ${r} ${r}H${x1 - r}q${r} 0 ${r}-${r}V${top + r}` +
      `q0-${r}-${r}-${r}H${x0 + r}q-${r} 0-${r} ${r}z`;
    const cob = `M${x1} ${top + crema}V${top + r}q0-${r}-${r}-${r}H${x0 + r}q-${r} 0-${r} ${r}V${top + crema}` +
      gotas(x0, top + crema, x0 - x1, prof) + 'Z';
    return `<path d="${cuerpo}"/><path d="${cob}"/>`;
  }

  /* Frutillita: corazón redondo con una corona de tres hojas en punta metida en el tercio de arriba
     (sin domo que asome: su borde de arriba sólo toca el hundido del corazón, de donde sale el cabito)
     y tres semillas abajo, lejos de las hojas y sin formar una carita. s = escala. */
  function frutillita(x, y, s) {
    const P = (dx, dy) => `${R(x + dx * s)} ${R(y + dy * s)}`;
    return `<path d="M${P(0, -26)}C${P(20, -54)} ${P(62, -50)} ${P(60, -4)}C${P(56, 32)} ${P(22, 60)} ${P(0, 68)}` +
      `C${P(-22, 60)} ${P(-56, 32)} ${P(-60, -4)}C${P(-62, -50)} ${P(-20, -54)} ${P(0, -26)}z"/>` +
      `<path d="M${P(0, -30)}L${P(4, -48)}" fill="none" stroke-width="12"/>` +
      `<path d="M${P(-32, -20)}Q${P(0, -38)} ${P(32, -20)}Q${P(44, -12)} ${P(44, 4)}Q${P(30, -4)} ${P(15, -4)}` +
      `Q${P(12, 5)} ${P(0, 12)}Q${P(-12, 5)} ${P(-15, -4)}Q${P(-30, -4)} ${P(-44, 4)}Q${P(-44, -12)} ${P(-32, -20)}z" stroke-width="12"/>` +
      [[0, 30], [-15, 47], [15, 47]].map(([dx, dy]) =>
        `<circle cx="${R(x + dx * s)}" cy="${R(y + dy * s)}" r="6" fill="#000" stroke="none"/>`).join('');
  }

  // Velita ancha con mecha y llamita.
  const vela = (x) =>
    `<rect x="${x - 34}" y="196" width="68" height="120" rx="16"/>` +
    `<path d="M${x} 188V146" fill="none" stroke-width="12"/>` +
    `<path d="M${x} 50C${x + 24} 84 ${x + 40} 110 ${x + 36} 134C${x + 32} 162 ${x - 32} 162 ${x - 36} 134` +
    `C${x - 40} 110 ${x - 24} 84 ${x} 50z"/>`;

  add('torta', 'Torta', `
    <ellipse cx="500" cy="888" rx="440" ry="56"/>
    ${vela(390)}${vela(500)}${vela(610)}
    ${piso(330, 670, 290, 470, 50, [30, 56, 30, 56, 30])}
    ${piso(235, 765, 450, 640, 55, [36, 64, 36, 28, 28, 36, 64, 36])}
    ${piso(140, 860, 620, 880, 55, [40, 70, 26, 24, 24, 26, 70, 40])}
    ${frutillita(186, 556, 1.45)}${frutillita(814, 556, 1.45)}
    ${cara(500, 770, { k: 0.92, ojos: 'felices' })}
  `);

  /* ---------- Frutilla: corazón con semillas, corona de hojitas y cabito ---------- */

  /* Corona de cinco hojas en estrella, toda adentro del cuerpo: su borde de arriba corre por debajo
     del contorno (se ve el cuerpo por encima en los hombros) y el cabito, que va delante del cuerpo,
     tapa el único punto donde se acercan. */
  const corona =
    '<path d="M500 296Q400 300 262 346Q340 364 404 340Q354 378 334 430Q410 416 456 368Q468 420 500 452' +
    'Q532 420 544 368Q590 416 666 430Q646 378 596 340Q660 364 738 346Q600 300 500 296Z"/>';

  // Todo el dibujo sube 25 u (translate) para quedar centrado en el lienzo.
  add('frutilla', 'Frutilla', `<g transform="translate(0 -25)">
    <path d="M500 262C710 215 885 300 868 470C852 660 650 890 530 918Q500 926 470 918C350 890 148 660 132 470C115 300 290 215 500 262Z"/>
    <path d="M470 320C466 206 476 170 498 140Q524 120 550 144C532 174 526 212 530 320Z"/>
    ${corona}
    ${gotita(238, 452, 160, 1.38)}${gotita(762, 452, 200, 1.38)}
    ${gotita(315, 722, 170, 1.38)}${gotita(685, 722, 190, 1.38)}
    ${gotita(415, 792, 174, 1.38)}${gotita(585, 792, 186, 1.38)}
    ${gotita(500, 738, 180, 1.38)}
    ${cara(500, 548, { k: 1.1 })}
  </g>`);

  /* ---------- Pizza: porción grande con borde, salsa, pepperoni y aceitunas ---------- */

  // Aceituna en rodaja (como aparece en la pizza): aro blanco para pintar con el agujero negro.
  const aceituna = (x, y) =>
    `<circle cx="${x}" cy="${y}" r="38"/><circle cx="${x}" cy="${y}" r="12" fill="#000" stroke="none"/>`;

  // Rodaja de pepperoni con tres puntitos salteados, lejos del borde (que no formen una carita).
  const pepperoni = (x, y, r) =>
    `<circle cx="${x}" cy="${y}" r="${r}"/>` +
    [[-0.4, -0.3], [0.38, 0.05], [-0.1, 0.42]].map(([dx, dy]) =>
      `<circle cx="${x + R(r * dx)}" cy="${y + R(r * dy)}" r="5" fill="#000" stroke="none"/>`).join('');

  /* Porción: queso en triángulo con los lados apenas inflados y la punta redondeada; arriba, el borde
     inflado de la masa y debajo una banda de salsa que chorrea en gotas. Se diseñó en coordenadas
     "base" y se agranda 1,08 alrededor de (500, 510) con P(). */
  const K = 1.08;
  const P = (x, y) => `${R(500 + (x - 500) * K)} ${R(510 + (y - 510) * K)}`;
  // Borde de abajo de la masa: Q de (128, 292) a (872, 292) con control (500, 214); la salsa va 58 u más abajo.
  const ySalsa = (x) => { const t = (x - 128) / 744; return 292 - 156 * t * (1 - t) + 58; };
  function salsa() {
    const x0 = 188, x1 = 812, prof = [26, 40, 26, 26, 40, 26], w = (x1 - x0) / prof.length;
    let d = `M${P(x0, ySalsa(x0))}`;
    prof.forEach((g, i) => {
      const a = x0 + i * w, b = a + w, k = g * 4 / 3;
      d += `C${P(a, ySalsa(a) + k)} ${P(b, ySalsa(b) + k)} ${P(b, ySalsa(b))}`;
    });
    return `<path d="${d}" fill="none"/>`;
  }

  add('pizza', 'Pizza', `
    <path d="M${P(168, 262)}Q${P(500, 200)} ${P(832, 262)}C${P(790, 470)} ${P(640, 700)} ${P(542, 848)}` +
    `Q${P(500, 910)} ${P(458, 848)}C${P(360, 700)} ${P(210, 470)} ${P(168, 262)}Z"/>
    ${salsa()}
    <path d="M${P(128, 292)}C${P(98, 222)} ${P(146, 184)} ${P(228, 168)}Q${P(500, 116)} ${P(772, 168)}` +
    `C${P(854, 184)} ${P(902, 222)} ${P(872, 292)}Q${P(500, 214)} ${P(128, 292)}Z"/>
    <path d="M${P(292, 200)}Q${P(332, 191)} ${P(368, 188)}M${P(632, 188)}Q${P(672, 191)} ${P(708, 200)}" fill="none" stroke-width="12"/>
    ${pepperoni(292, 425, 44)}${aceituna(710, 420)}
    ${aceituna(400, 630)}${pepperoni(588, 642, 46)}
    ${pepperoni(500, 742, 44)}
    ${cara(500, 470, { sep: 86, lengua: true })}
  `);

  /* ---------- Manzana: cabito, hoja con nervadura y brillo ---------- */
  // Un solo brillo grande (uno chiquito extra quedaba demasiado chico para el dedo).
  add('manzana', 'Manzana', `
    <path d="M530 180C576 98 694 70 792 98C756 184 644 218 530 180Z"/>
    <path d="M590 158Q690 142 760 118" fill="none" stroke-width="12"/>
    <path d="M466 318C464 236 478 160 516 100L578 126C546 180 534 244 538 318Z"/>
    <path d="M500 300C565 235 715 215 805 300C915 405 900 655 800 800C730 900 610 925 500 880C390 925 270 900 200 800C100 655 85 405 195 300C285 215 435 235 500 300Z"/>
    <path d="M232 472C238 404 280 358 332 340C356 332 370 358 350 374C314 400 294 440 290 482C288 508 230 508 232 472Z"/>
    ${cara(500, 580, { k: 1.15, sep: 88 })}
  `);

  /* ---------- Sandía: tajada con cáscara, franja blanca, pulpa y semillas ---------- */

  // Tajada triangular con la punta arriba en (500, 65); el arco de abajo tiene radio Rad.
  // `redondo` redondea las esquinas de abajo (sólo la cáscara, que es la de afuera).
  function tajada(Rad, redondo = 0) {
    const ax = 500, ay = 65, s = 0.5, c = 0.866;
    const p = (r, sg) => `${R(ax + sg * r * s)} ${R(ay + r * c)}`;
    const punta = `M${p(60, -1)}Q${ax} ${ay - 4} ${p(60, 1)}`;
    if (!redondo) return `<path d="${punta}L${p(Rad, 1)}A${Rad} ${Rad} 0 0 1 ${p(Rad, -1)}Z"/>`;
    // Esquina: el lado termina antes y un arco chiquito (Q) empalma con el arco grande.
    const da = redondo / Rad, a1 = Math.PI / 3 + da, a2 = Math.PI * 2 / 3 - da; // ángulos desde la punta
    const q = (a) => `${R(ax + Rad * Math.cos(a))} ${R(ay + Rad * Math.sin(a))}`;
    return `<path d="${punta}L${p(Rad - redondo, 1)}Q${p(Rad, 1)} ${q(a1)}` +
      `A${Rad} ${Rad} 0 0 1 ${q(a2)}Q${p(Rad, -1)} ${p(Rad - redondo, -1)}Z"/>`;
  }

  // Semillas lejos de la cara: tres arriba y cuatro en arco abajo, siguiendo la curva de la pulpa.
  add('sandia', 'Sandía', `
    ${tajada(850, 44)}${tajada(780)}${tajada(705)}
    ${gotita(500, 237, 0, 1.35)}
    ${gotita(418, 347, -12, 1.35)}${gotita(582, 347, 12, 1.35)}
    ${gotita(310, 650, -22, 1.35)}${gotita(690, 650, 22, 1.35)}
    ${gotita(432, 678, -8, 1.35)}${gotita(568, 678, 8, 1.35)}
    ${cara(500, 477, { k: 1.1 })}
  `);

  /* ======================= Dibujos nuevos ======================= */

  // Chispita grande: palito redondeado cerrado (se pinta), centrado en (x, y) y girado `ang` grados.
  const chispita = (x, y, ang) =>
    `<rect x="-46" y="-22" width="92" height="44" rx="22" stroke-width="12" transform="translate(${x} ${y}) rotate(${ang})"/>`;

  // Onda suave (sin puntas) de x1 a x0 (hacia la izquierda) sobre la altura y: n medias ondas de alto amp.
  function ola(x1, x0, y, amp, n) {
    const w = (x1 - x0) / n, k = amp * 4 / 3;
    let d = '';
    for (let i = 0; i < n; i++) {
      const a = x1 - i * w, b = a - w, s = i % 2 ? -1 : 1;
      d += `C${R(a - w * 0.4)} ${R(y + s * k)} ${R(b + w * 0.4)} ${R(y + s * k)} ${R(b)} ${y}`;
    }
    return d;
  }

  /* ---------- Hamburguesa: pan con semillas, lechuga, tomate, queso que chorrea, carne y pan ---------- */
  const semilla = (x, y, ang) =>
    `<ellipse cx="${x}" cy="${y}" rx="25" ry="40" stroke-width="12" transform="rotate(${ang} ${x} ${y})"/>`;

  add('hamburguesa', 'Hamburguesa', `
    <path d="M160 775H840Q865 775 865 800V825C865 885 815 918 750 918H250C185 918 135 885 135 825V800Q135 775 160 775Z"/>
    <rect x="105" y="640" width="790" height="160" rx="80"/>
    <path d="M190 592H810L848 722L732 662L615 730L500 662L385 730L268 662L152 722Z"/>
    <rect x="150" y="485" width="700" height="124" rx="62"/>
    <path d="M160 420H840C890 414 918 440 912 474C908 500 890 514 870 522${ola(870, 130, 522, 18, 8)}C112 534 86 524 84 494C82 454 112 420 160 420Z"/>
    <path d="M130 400C126 228 300 110 500 110C700 110 874 228 870 400Q872 440 832 440H168Q128 440 130 400Z"/>
    ${semilla(500, 180, 0)}${semilla(362, 212, -35)}${semilla(638, 212, 35)}
    ${semilla(250, 296, -62)}${semilla(750, 296, 62)}
    ${cara(500, 305, { k: 1.05 })}
  `);

  /* ---------- Banana: medio pelada, con la cáscara abierta en tres tiras ---------- */
  add('banana', 'Banana', `
    <rect x="443" y="856" width="74" height="84" rx="18"/>
    <path d="M290 520C284 360 335 180 452 104C500 72 585 76 622 112C680 168 716 330 710 520Z"/>
    <path d="M282 470C276 645 342 818 446 874Q480 892 516 882C622 834 724 662 718 470Z"/>
    <path d="M410 485C360 443 285 432 240 462C185 498 158 600 138 742C185 690 265 600 338 556C367 538 390 508 410 485Z"/>
    <path d="M590 485C640 443 715 432 760 462C815 498 842 600 862 742C815 690 735 600 662 556C633 538 610 508 590 485Z"/>
    <path d="M372 482Q500 452 628 482C634 586 588 696 492 802C424 702 368 592 372 482Z"/>
    ${cara(502, 345, { k: 0.92, sep: 64 })}
  `);

  /* ---------- Cupcake: pirotín con pliegues, crema en tres pisos, cereza y chispitas ---------- */
  add('cupcake', 'Cupcake', `
    <path d="M215 620L288 892Q296 918 324 918H676Q704 918 712 892L785 620Z"/>
    <path d="M310 620L360 918M405 620L430 918M500 620V918M595 620L570 918M690 620L640 918" fill="none" stroke-width="12"/>
    <path d="M215 620L288 892Q296 918 324 918H676Q704 918 712 892L785 620" fill="none"/>
    <path d="M250 400H750C835 400 872 460 866 530C862 590 830 640 790 650${gotas(790, 650, 580, [24, 30, 24, 24, 30, 24])}C170 640 138 590 134 530C128 460 165 400 250 400Z"/>
    <rect x="245" y="290" width="510" height="150" rx="75"/>
    <rect x="320" y="200" width="360" height="120" rx="60"/>
    <path d="M506 116q10-40 50-66" fill="none" stroke-width="14"/>
    <circle cx="500" cy="170" r="58"/>
    <path d="M473 150q12-17 30-18" fill="none" stroke-width="10"/>
    ${chispita(330, 368, 30)}${chispita(670, 368, -30)}${chispita(400, 258, -10)}${chispita(600, 258, 10)}
    ${chispita(215, 515, 70)}${chispita(785, 515, -70)}
    ${cara(500, 525, { k: 1.1, ojos: 'felices' })}
  `);

  /* ---------- Dona: rosca con glaseado chorreado, agujero, chispitas ---------- */
  // Borde de gotas a lo largo de una curva y = f(x): de x1 a x0 (hacia la izquierda), una "U" por profundidad.
  function ondas(x1, x0, f, prof) {
    const w = (x1 - x0) / prof.length;
    let d = '';
    prof.forEach((g, i) => {
      const a = x1 - i * w, b = a - w, k = g * 4 / 3;
      d += `C${R(a)} ${R(f(a) + k)} ${R(b)} ${R(f(b) + k)} ${R(b)} ${R(f(b))}`;
    });
    return d;
  }
  // El glaseado es una elipse (centro 500, 495; radios 370 × 255) y chorrea en la mitad de abajo.
  const yGlaseado = (x) => 495 + 255 * Math.sqrt(Math.max(0, 1 - ((x - 500) / 370) ** 2));
  add('dona', 'Dona', `
    <path d="M70 520C70 300 285 180 500 180C715 180 930 300 930 520C930 740 730 880 500 880C270 880 70 740 70 520Z"/>
    <path d="M150 ${R(yGlaseado(150))}A370 255 0 1 1 850 ${R(yGlaseado(850))}${ondas(850, 150, yGlaseado, [30, 48, 38, 54, 44, 54, 38, 48, 30])}Z"/>
    <ellipse cx="500" cy="400" rx="140" ry="78"/>
    <path d="M365 420A140 78 0 1 1 635 420A135 45 0 0 0 365 420Z"/>
    ${chispita(310, 340, -28)}${chispita(690, 340, 28)}${chispita(208, 455, 78)}${chispita(792, 455, -78)}
    ${chispita(228, 585, -50)}${chispita(772, 585, 50)}
    ${cara(500, 585, { k: 1.1, ojos: 'guino' })}
  `);

  /* ---------- Uvas: racimo con cabito, hoja con nervaduras y carita en la uva del frente ---------- */
  // Uva: bolita con un brillito (arco suelto arriba a la izquierda, no corta la zona).
  const uva = (x, y, r = 112) => `<circle cx="${x}" cy="${y}" r="${r}"/>` +
    `<path d="M${x - R(r * 0.56)} ${y - R(r * 0.14)}Q${x - R(r * 0.5)} ${y - R(r * 0.5)} ${x - R(r * 0.14)} ${y - R(r * 0.56)}" fill="none" stroke-width="10"/>`;
  add('uvas', 'Uvas', `
    <g transform="translate(0 13) rotate(-12 522 132)">
      <path d="M522 132C540 96 586 64 634 58C660 55 676 72 668 90C720 62 810 70 868 122C812 176 724 184 668 160C676 180 660 196 634 194C586 190 540 168 522 132Z"/>
      <path d="M574 131Q705 124 842 122M612 130Q628 104 640 86M612 132Q628 158 640 176M722 127Q742 108 758 98M722 127Q742 144 758 152" fill="none" stroke-width="12"/>
    </g>
    <path d="M476 250C478 200 486 150 494 100L540 108C532 156 526 204 526 250Z"/>
    ${uva(248, 338)}${uva(416, 338)}${uva(584, 338)}${uva(752, 338)}
    ${uva(332, 474)}${uva(500, 474)}${uva(668, 474)}
    ${uva(412, 604)}${uva(588, 604)}
    <circle cx="500" cy="748" r="190"/>
    ${cara(500, 712, { k: 0.9, sep: 60 })}
  `);
})(window.CL);
