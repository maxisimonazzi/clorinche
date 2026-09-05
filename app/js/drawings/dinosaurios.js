/* Colorinche — js/drawings/dinosaurios.js
   Dibujos para colorear de la categoría "Dinosaurios": T-rex, triceratops, diplodocus, estegosaurio
   y pterodáctilo. Lienzo 1000 × 1000, contorno 16, detalles internos 12 (ver dev/ARQUITECTURA.md, sección 5).
   El orden importa: lo que va adelante se dibuja después y su relleno blanco tapa las líneas de atrás.
   Criterio de la categoría: los que están parados pisan la misma loma de pasto (como en granja) con
   patas cortas; el pterodáctilo vuela entre dos nubes. */
'use strict';
(function (CL) {
  const add = (id, nombre, svg) => CL.drawings.add('dinosaurios', id, nombre, svg);
  const R = Math.round;
  const RAD = Math.PI / 180;

  /* ---------- Geometría ---------- */

  // Un "camino" es una lista plana de puntos de curvas cúbicas: [p0, c1, c2, p1, c1, c2, p2, ...].
  const d3 = (P) => {
    let d = `M${P[0][0]} ${P[0][1]}`;
    for (let i = 1; i + 2 < P.length; i += 3) d += `C${P[i].join(' ')} ${P[i + 1].join(' ')} ${P[i + 2].join(' ')}`;
    return d;
  };
  // Punto del tramo i (0, 1, 2...) de un camino, en t (0..1).
  function sobre(P, i, t) {
    const [a, b, c, e] = [P[3 * i], P[3 * i + 1], P[3 * i + 2], P[3 * i + 3]];
    const u = 1 - t;
    const f = (k) => u * u * u * a[k] + 3 * u * u * t * b[k] + 3 * u * t * t * c[k] + t * t * t * e[k];
    return [R(f(0)), R(f(1))];
  }
  // Punto del tramo i cuya coordenada k (0 = x, 1 = y) está más cerca de v.
  function cruce(P, i, k, v) {
    let best = null, bd = Infinity;
    for (let s = 0; s <= 400; s++) {
      const p = sobre(P, i, s / 400);
      const dd = Math.abs(p[k] - v);
      if (dd < bd) { bd = dd; best = p; }
    }
    return best;
  }
  // Punto sobre una elipse (ángulo en grados, 0 = derecha, 90 = abajo).
  const pe = (cx, cy, rx, ry, a) => [R(cx + rx * Math.cos(a * RAD)), R(cy + ry * Math.sin(a * RAD))];
  const P2 = (p) => `${p[0]} ${p[1]}`;
  // Sistema local para formas que "salen" de una base: u = de costado, v = hacia la punta.
  function local(bx, by, dx, dy) {
    const l = Math.hypot(dx, dy); dx /= l; dy /= l;
    return (u, v) => `${R(bx + dx * v - dy * u)} ${R(by + dy * v + dx * u)}`;
  }

  /* ---------- Piezas compartidas (mismo estilo en toda la categoría) ---------- */

  // Ojo tierno: pupila negra con un brillito grande y uno chiquito (los brillitos quedan blancos).
  const ojo = (x, y, rx = 32, ry = 40) =>
    `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#000"/>` +
    `<circle cx="${x - R(rx * 0.3)}" cy="${y - R(ry * 0.35)}" r="${Math.min(11, R(rx * 0.38))}" fill="#fff" stroke="none"/>` +
    `<circle cx="${x + R(rx * 0.35)}" cy="${y + R(ry * 0.4)}" r="${R(rx * 0.17)}" fill="#fff" stroke="none"/>`;

  // Cachete para pintar de rosado (bien redondo, del tamaño de un dedo).
  const cachete = (x, y, rx = 36, ry = 30) =>
    `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" stroke-width="12"/>`;

  // Línea de detalle (sonrisas, rayas, muslos): abierta y un poco más fina.
  const linea = (d) => `<path d="${d}" fill="none" stroke-width="12"/>`;

  // Fosa nasal: un puntito negro sin contorno (así no se confunde con un segundo ojo).
  const nariz = (x, y, rot = 0) =>
    `<ellipse cx="${x}" cy="${y}" rx="10" ry="7" fill="#000" stroke="none"` +
    (rot ? ` transform="rotate(${rot} ${x} ${y})"` : '') + '/>';

  // Mancha grande para pintar (mínimo 40 × 30 de radio: se pinta con el dedo).
  const mancha = (x, y, rx = 42, ry = 31, rot = 0) =>
    `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"` +
    (rot ? ` transform="rotate(${rot} ${x} ${y})"` : '') + ` stroke-width="12"/>`;

  // Raya entre dos puntos que están sobre contornos, apenas curvada (panza rayada).
  const raya = (a, b, curva = 10) =>
    linea(`M${P2(a)}Q${R((a[0] + b[0]) / 2)} ${R((a[1] + b[1]) / 2 + curva)} ${P2(b)}`);

  // Loma de pasto (igual que en granja) con dos matitas en los extremos.
  const LOMA = 900, PISO = 905;
  const mata = (x) => {
    const y = R(LOMA - 46 * Math.sqrt(1 - ((x - 500) / 440) ** 2)) + 6;
    return `M${x} ${y}l-24-44M${x} ${y}v-54M${x} ${y}l24-44`;
  };
  const suelo = (xa = 90, xb = 910) =>
    `<ellipse cx="500" cy="${LOMA}" rx="440" ry="46"/>` +
    `<path d="${xa ? mata(xa) : ''}${xb ? mata(xb) : ''}" fill="none" stroke-width="12"/>`;

  // Pata (la misma en toda la categoría): columna de x a x+w desde yTop (tapado por el cuerpo) hasta
  // el piso; abajo se ensancha `abre` a cada lado. Con `dedos` termina en tres deditos redondos (T-rex);
  // sin dedos, en un pie redondo liso (cuadrúpedos y pterodáctilo, como en granja).
  function pata(x, w, yTop, yBot = PISO, abre = 12, dedos = true) {
    const x0 = x - abre, x1 = x + w + abre;
    const r = R((x1 - x0) / 6);
    const yb = yBot - r;
    let d = `M${x} ${yTop}L${x} ${yb - 40}Q${x0} ${yb - 30} ${x0} ${yb}`;
    if (dedos) for (let i = 1; i <= 3; i++) d += `A${r} ${r} 0 0 0 ${R(x0 + ((x1 - x0) * i) / 3)} ${yb}`;
    else d += `A${R((x1 - x0) / 2)} ${r} 0 0 0 ${x1} ${yb}`;
    return `<path d="${d}Q${x1} ${yb - 30} ${x + w} ${yb - 40}L${x + w} ${yTop}Z"/>`;
  }

  // Par de patas de cuadrúpedo de perfil (como en granja): la de más lejos asoma `corre` u a la derecha,
  // detrás de la cercana; las dos con el mismo pie liso (los deditos quedan sólo para el T-rex, que es
  // bípedo) y pisando el mismo piso, así no hay escalón ni rendija.
  const parPatas = (x, yTop, w = 92, corre = 90) =>
    pata(x + corre, w - 6, yTop, PISO, 8, false) + pata(x, w, yTop, PISO, 8, false);

  // Nubecita.
  const nube = (x, y) =>
    `<path d="M${x - 80} ${y + 34}C${x - 122} ${y + 34} ${x - 118} ${y - 22} ${x - 74} ${y - 16}` +
    `C${x - 66} ${y - 62} ${x - 2} ${y - 68} ${x + 12} ${y - 30}C${x + 34} ${y - 56} ${x + 88} ${y - 44} ${x + 82} ${y - 4}` +
    `C${x + 122} ${y} ${x + 114} ${y + 34} ${x + 80} ${y + 34}Z"/>`;

  /* ---------- T-rex: cabezota, bocota con dos dientes, bracitos, patas fuertes y cola larga ---------- */
  function trex() {
    const cuerpo = [[540, 430], [420, 450], [285, 540], [265, 680], [250, 790], [340, 845], [470, 845],
      [610, 845], [705, 785], [715, 680], [725, 580], [700, 500], [690, 430]];
    // Panza: desde abajo de la cabeza hasta el borde de adelante del cuerpo (lejos de las patas).
    const panza = [[600, 440], [548, 570], [560, 700], sobre(cuerpo, 2, 0.75)];
    const rayas = [585, 670].map((y) => raya(cruce(panza, 0, 1, y), cruce(cuerpo, 3, 1, y)));
    // Muslo: sale del costado bien abajo (lejos de donde entra la cola) y baja entre las dos patas.
    const m0 = cruce(cuerpo, 1, 1, 700), m1 = cruce(cuerpo, 2, 0, 488);
    // Boca abierta: borde de arriba recto de A a B; dos colmillos que arrancan en las comisuras.
    const A = [622, 402], B = [856, 372];
    const boca = [B, [876, 452], [815, 496], [740, 498], [648, 500], [604, 470], A];
    const onAB = (t) => [R(A[0] + (B[0] - A[0]) * t), R(A[1] + (B[1] - A[1]) * t)];
    const diente = (t0, t1) => {
      const p0 = onAB(t0), p1 = onAB(t1), m = onAB((t0 + t1) / 2);
      return `<path d="M${P2(p0)}Q${p0[0] + 16} ${p0[1] + 44} ${m[0]} ${m[1] + 58}` +
        `Q${p1[0] - 16} ${p1[1] + 44} ${P2(p1)}Z" stroke-width="12"/>`;
    };
    // Lengua: loma ancha y baja entre los colmillos (con aire entre cada punta y la lengua).
    const l0 = cruce(boca, 1, 0, 690), l1 = cruce(boca, 0, 0, 800);
    return (
      suelo() +
      // Cola larga y gruesa en la base, que se afina y baja hacia el piso
      `<path d="M330 560C240 585 150 665 88 738C72 758 80 792 124 790C190 792 260 776 320 748Z"/>` +
      // Patas (atrás del cuerpo)
      pata(540, 108, 760) + pata(318, 124, 760) +
      // Bracito cortito con dos deditos, más abajo que la papada (se ve un poco de cuerpo entre los dos)
      `<path d="M660 576C730 556 772 570 784 602C791 622 776 636 760 626C760 645 740 652 729 635C716 618 690 618 660 632Z"/>` +
      // Cuerpo, mancha, panza rayada y muslo
      `<path d="${d3(cuerpo)}Z"/>` +
      mancha(400, 530, 42, 31, -35) +
      linea(d3(panza)) + rayas.join('') +
      linea(`M${P2(m0)}C330 650 425 610 452 672C474 722 482 790 ${P2(m1)}`) +
      mancha(372, 750, 44, 32, -10) +
      // Cabeza grandota
      `<path d="M470 335C455 225 555 160 670 165C780 170 870 205 905 285C930 350 925 460 858 500C785 543 620 545 550 515C490 490 478 400 470 335Z"/>` +
      // Boca abierta con dos dientes grandes y lengua
      `<path d="M${P2(A)}L${d3(boca).slice(1)}Z"/>` +
      diente(0, 0.34) + diente(0.66, 1) +
      linea(`M${P2(l0)}C690 435 800 435 ${P2(l1)}`) +
      // Carita: ojo, cachete junto a la comisura y fosa nasal en la punta del hocico
      ojo(655, 285, 34, 42) +
      cachete(566, 438, 32, 28) +
      nariz(850, 282, 20)
    );
  }

  // Borde festoneado alrededor de un círculo: n chichones hacia afuera.
  function festoneado(cx, cy, r, n, fase = 0, abulta = 0.62) {
    const v = [];
    for (let i = 0; i <= n; i++) v.push(pe(cx, cy, r, r, fase + (i * 360) / n));
    let d = `M${P2(v[0])}`;
    for (let i = 1; i <= n; i++) {
      const rr = R(Math.hypot(v[i][0] - v[i - 1][0], v[i][1] - v[i - 1][1]) * abulta);
      d += `A${rr} ${rr} 0 0 1 ${P2(v[i])}`;
    }
    return d + 'Z';
  }

  // Cuerno cónico que se apoya sobre la cabeza: base (bx, by) apenas redondeada, punta en (tx, ty),
  // ancho w. `curva` > 0 lo arquea hacia abajo en el medio, así la punta mira un poco para arriba.
  function cuerno(bx, by, tx, ty, w, curva = 8) {
    const L = Math.hypot(tx - bx, ty - by);
    const P = local(bx, by, tx - bx, ty - by);
    return `<path d="M${P(-w / 2, 0)}C${P(-w * 0.42 + curva, L * 0.4)} ${P(-w * 0.18 + curva, L * 0.8)} ${P(0, L)}` +
      `C${P(w * 0.18 + curva, L * 0.8)} ${P(w * 0.42 + curva, L * 0.4)} ${P(w / 2, 0)}` +
      `Q${P(0, -w * 0.2)} ${P(-w / 2, 0)}Z"/>`;
  }

  /* ---------- Triceratops: tres cuernos hacia adelante, gola de escudo y pico de loro ---------- */
  function triceratops() {
    const gx = 588, gy = 452; // gola detrás de la cabeza (la cara tapa el centro)
    return (
      suelo() +
      // Cola larga que se afina y apenas baja
      `<path d="M230 540C160 575 105 640 70 694C60 712 76 728 94 716C140 690 190 680 240 676Z"/>` +
      // Patas cortas y gruesas, de a pares (con un hueco ancho entre los pares)
      parPatas(206, 690) + parPatas(480, 690) +
      // Cuerpo con tres manchas grandes; la esquina de adelante es casi recta para tapar la pata de atrás
      `<path d="M188 612C188 482 300 432 420 432C552 434 670 500 670 620L670 730C670 770 650 790 610 790` +
      `L260 790C215 790 188 760 188 720Z"/>` +
      mancha(320, 515, 44, 32, -15) + mancha(262, 660, 40, 30, -50) + mancha(410, 668, 46, 33, -8) +
      // Gola de escudo: borde de afuera ondulado y un aro liso adentro (lejos de los cuernos)
      `<path d="${festoneado(gx, gy, 180, 11, -90, 0.66)}"/>` +
      `<circle cx="${gx - 16}" cy="${gy + 4}" r="108" stroke-width="12"/>` +
      // Cara redondeada; la sonrisa llega hasta la esquina de atrás del pico
      `<path d="M600 530C600 448 664 400 746 400C822 400 866 440 872 500C878 566 850 628 792 648` +
      `C736 668 656 660 626 624C608 602 600 570 600 530Z"/>` +
      linea('M738 608Q796 640 862 610') +
      // Pico de loro: forma propia que sale hacia adelante y termina en una punta ganchuda hacia abajo
      `<path d="M842 464C896 450 944 500 952 566C956 598 946 616 932 606C916 594 892 610 866 640` +
      `C836 606 826 520 842 464Z"/>` +
      // Dos cuernos largos juntos sobre la frente (el de atrás un poco más chico) y uno sobre el hocico
      cuerno(704, 424, 730, 272, 60) + cuerno(770, 408, 856, 256, 68) +
      cuerno(896, 478, 912, 388, 76, 4) +
      ojo(752, 502, 30, 38) +
      cachete(676, 590, 34, 28) +
      nariz(900, 528, 10)
    );
  }

  /* ---------- Diplodocus: cuello en S y cola larguísima, cabeza redondita ---------- */
  function diplodocus() {
    return (
      // Sin matita a la izquierda: ahí baja la punta de la cola
      suelo(0) +
      // Cola larguísima (contrapeso del cuello): sale ancha y casi horizontal y baja suave hasta una punta redonda
      `<path d="M244 580C150 596 92 640 62 708C52 734 74 750 92 732C132 700 184 700 256 702Z"/>` +
      // Cuello en S: la base se inclina hacia adelante y arriba vuelve hacia atrás antes de la cabeza
      // (la punta queda tapada por la cabeza y la base por el cuerpo)
      `<path d="M540 560C640 500 680 440 668 380C656 330 620 290 712 234L788 272C724 300 740 330 754 380` +
      `C768 450 730 560 664 620Z"/>` +
      // Patas cortas, de a pares (con un hueco ancho entre los pares)
      parPatas(210, 700, 88, 80) + parPatas(478, 700, 88, 80) +
      // Cuerpo ancho y bajo, con la panza plana para tapar arriba las patas, y tres manchas grandes
      `<path d="M198 662C198 560 310 508 452 508C600 508 702 562 702 662C702 740 680 782 620 786L290 786` +
      `C230 786 198 740 198 662Z"/>` +
      mancha(330, 590, 46, 33, -15) + mancha(492, 575, 42, 31, 5) + mancha(318, 706, 40, 30, -25) +
      // Cabeza (grande, estilo chibi) con hocico redondeado hacia adelante
      `<path d="M700 230C680 160 730 110 800 110C850 110 880 134 900 160C940 164 958 196 952 226` +
      `C946 258 910 268 870 266C820 290 740 300 700 230Z"/>` +
      ojo(808, 172, 24, 30) +
      cachete(778, 234, 34, 28) +
      linea('M836 246Q862 266 888 244') +
      nariz(916, 204, 10)
    );
  }

  /* ---------- Estegosaurio: lomo en arco con una fila de placas tipo rombo, cabeza chiquita y baja,
     cuatro púas en la cola ---------- */
  function estegosaurio() {
    // Silueta de una sola pieza: cola que sale ancha, baja un poco y sube suave hacia la punta, lomo en
    // arco bien alto y cuello que baja hasta la cabeza chiquita; la panza es plana sobre las patas.
    const cuerpo = [[300, 780], [210, 780], [140, 730], [104, 666], [90, 640], [68, 606], [64, 584],
      [60, 558], [90, 544], [110, 560], [176, 604], [262, 626], [336, 612], [392, 596], [420, 440], [524, 440],
      [626, 440], [706, 490], [750, 570], [770, 600], [800, 610], [830, 620], [840, 660], [830, 720], [810, 740],
      [780, 760], [750, 780], [690, 780]];
    // Punto del lomo en el tramo i, t, y dirección de la placa: perpendicular al lomo, con tope de 15°.
    const lomo = (i, t) => {
      const p = sobre(cuerpo, i, t), q = sobre(cuerpo, i, Math.min(1, t + 0.02)), o = sobre(cuerpo, i, Math.max(0, t - 0.02));
      const inc = Math.max(-15, Math.min(15, Math.atan2(q[1] - o[1], q[0] - o[0]) / RAD));
      return [p, Math.sin(inc * RAD), -Math.cos(inc * RAD)];
    };
    // Placa tipo rombo (base ancha, hombros anchos y punta redondeada pero marcada), casi vertical
    // (se inclina a lo sumo 15°, siguiendo el lomo, sin abrirse en abanico). La base se hunde
    // 50 u dentro del cuerpo (que se dibuja después y la tapa), así no asoman rayitas sobre el lomo.
    const placa = (i, t, h, w) => {
      const [p, dx, dy] = lomo(i, t);
      const H = h + 50;
      const P = local(p[0] - dx * 50, p[1] - dy * 50, dx, dy);
      return `<path d="M${P(-0.34 * w, 0)}L${P(-0.5 * w, 0.56 * H)}Q${P(-0.52 * w, 0.68 * H)} ${P(-0.4 * w, 0.76 * H)}` +
        `L${P(-0.12 * w, 0.97 * H)}Q${P(0, 1.05 * H)} ${P(0.12 * w, 0.97 * H)}` +
        `L${P(0.4 * w, 0.76 * H)}Q${P(0.52 * w, 0.68 * H)} ${P(0.5 * w, 0.56 * H)}L${P(0.34 * w, 0)}Z"/>`;
    };
    // Púa de la cola: cono ancho con la punta apenas redondeada y la base un poco curva, hundida
    // `hunde` u dentro de la cola desde el punto t del borde de arriba de la cola.
    const pua = (t, dx, dy, h, w, hunde) => {
      const b = sobre(cuerpo, 3, t), l = Math.hypot(dx, dy);
      const P = local(b[0] - (dx / l) * hunde, b[1] - (dy / l) * hunde, dx, dy);
      return `<path d="M${P(-w / 2, 0)}C${P(-w * 0.48, 0.44 * h)} ${P(-0.18 * w, 0.9 * h)} ${P(0, h)}` +
        `C${P(0.18 * w, 0.9 * h)} ${P(w * 0.48, 0.44 * h)} ${P(w / 2, 0)}Q${P(0, -0.16 * w)} ${P(-w / 2, 0)}Z"/>`;
    };
    return (
      suelo() +
      // Placas del lomo: una fila de seis, las del medio más grandes (las del medio se dibujan al final)
      placa(5, 0.8, 72, 88) + placa(4, 0.42, 100, 98) + placa(5, 0.56, 104, 98) +
      placa(4, 0.72, 130, 106) + placa(5, 0.3, 132, 106) + placa(5, 0.02, 148, 110) +
      // Patas cortas, de a pares (con un hueco ancho entre los pares)
      parPatas(262, 720, 88, 80) + parPatas(520, 720, 88, 80) +
      // Cuerpo con tres manchas grandes
      `<path d="${d3(cuerpo)}Z"/>` +
      mancha(430, 610, 46, 33, -12) + mancha(600, 590, 44, 32, 10) + mancha(480, 710, 46, 32, -4) +
      // Cuatro púas anchas apoyadas sobre la cola, hacia arriba y atrás, abiertas en abanico
      pua(0.1, -0.9, -1, 118, 64, 16) + pua(0.36, -0.52, -1, 124, 66, 16) +
      pua(0.62, -0.24, -1, 122, 64, 16) + pua(0.87, 0, -1, 112, 62, 16) +
      // Cabeza chiquita y baja, con carita
      `<ellipse cx="848" cy="660" rx="104" ry="90"/>` +
      ojo(862, 636, 22, 28) +
      cachete(820, 700, 34, 28) +
      linea('M860 708Q886 726 912 704') +
      nariz(928, 652, 20)
    );
  }

  /* ---------- Pterodáctilo: vuela con las alas abiertas; cresta y pico largos, en línea ---------- */
  function pterodactilo() {
    // Ala izquierda (la derecha es el espejo): borde de adelante hasta la muñeca (más baja que el pico,
    // así queda aire entre los dos), dedo largo hasta la punta y borde de atrás curvo que entra al cuerpo
    // bien arriba de la pata.
    const ala = `<path d="M450 580C380 510 300 462 215 448C150 474 90 516 50 576C170 570 320 600 440 690Z"/>`;
    // Cabeza ovalada que se afina en el pico, como una sola forma.
    const cabeza = [[372, 350], [372, 280], [425, 240], [488, 240], [552, 240], [600, 262], [660, 280],
      [740, 304], [806, 326], [846, 342], [870, 352], [866, 380], [838, 380], [780, 386], [700, 414],
      [628, 444], [588, 464], [540, 476], [488, 476], [420, 476], [372, 420], [372, 350]];
    return (
      nube(820, 140) + nube(180, 862) +
      ala + `<g transform="translate(1000 0) scale(-1 1)">${ala}</g>` +
      // Patitas cortas y gorditas, colgando, con pie liso y un hueco entre los pies
      pata(414, 66, 660, 806, 6, false) + pata(520, 66, 660, 806, 6, false) +
      // Cuerpo y panza
      `<ellipse cx="500" cy="600" rx="112" ry="140"/>` +
      `<ellipse cx="500" cy="604" rx="62" ry="76"/>` +
      // Cresta larga hacia atrás, en línea con el pico
      `<path d="M440 262C370 230 270 205 170 205C200 250 290 300 390 322Z"/>` +
      // Cabeza con pico (una sola forma); la boca empieza con un rulito de sonrisa y sigue por el pico
      `<path d="${d3(cabeza)}Z"/>` +
      ojo(488, 326, 30, 38) +
      cachete(532, 420, 32, 28) +
      linea('M590 382Q598 410 626 404L772 352')
    );
  }

  // Púa cónica de lados rectos con la punta redonda (radio r), de (bx, by) hacia (tx, ty), base w.
  function pua(bx, by, tx, ty, w, r = 12) {
    const L = Math.hypot(tx - bx, ty - by);
    const P = local(bx, by, tx - bx, ty - by);
    return `<path d="M${P(-w / 2, 0)}L${P(-r, L - r)}A${r} ${r} 0 0 1 ${P(r, L - r)}L${P(w / 2, 0)}Z"/>`;
  }

  add('trex', 'T-rex', trex());
  add('triceratops', 'Triceratops', triceratops());
  add('diplodocus', 'Diplodocus', diplodocus());
  add('estegosaurio', 'Estegosaurio', estegosaurio());
  add('pterodactilo', 'Pterodáctilo', pterodactilo());
})(window.CL);
