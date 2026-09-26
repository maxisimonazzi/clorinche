/* Colorinche — js/drawings/granja.js
   Dibujos para colorear de la categoría "Granja": vaca, chancho, gallina, oveja, caballo, pato, pollito,
   cabra, burro, pavo y tractor.
   Lienzo 1000 × 1000, contorno 16 (ver dev/ARQUITECTURA.md, sección 5). El orden importa: lo que va
   adelante se dibuja después y su relleno blanco tapa las líneas de atrás. */
'use strict';
(function (CL) {
  const add = (id, nombre, svg) => CL.drawings.add('granja', id, nombre, svg);
  const r0 = Math.round;

  /* ---------- Piezas compartidas (mismo estilo en toda la categoría) ---------- */

  // Ojo tierno: pupila negra con un brillito grande y uno chiquito.
  const ojo = (x, y, rx = 27, ry = 33) =>
    `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#000"/>` +
    `<circle cx="${x - r0(rx * 0.3)}" cy="${y - r0(ry * 0.35)}" r="${r0(rx * 0.38)}" fill="#fff" stroke="none"/>` +
    `<circle cx="${x + r0(rx * 0.35)}" cy="${y + r0(ry * 0.4)}" r="${r0(rx * 0.17)}" fill="#fff" stroke="none"/>`;

  // Cachete para pintar de rosado.
  const cachete = (x, y, rx = 34, ry = 24) =>
    `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" stroke-width="12"/>`;

  // Loma de pasto debajo de las patas, con matitas de tres hojitas en los extremos.
  const LOMA_Y = 895;
  const mata = (x) => {
    const y = r0(LOMA_Y - 48 * Math.sqrt(1 - ((x - 500) / 440) ** 2)) + 6;
    return `M${x} ${y}l-24-44M${x} ${y}v-54M${x} ${y}l24-44`;
  };
  const pasto = (xa = 85, xb = 915) =>
    `<ellipse cx="500" cy="${LOMA_Y}" rx="440" ry="48"/>` +
    `<path d="${xa ? mata(xa) : ''}${xb ? mata(xb) : ''}" fill="none" stroke-width="12"/>`;

  /* Pata: x = borde izquierdo, w = ancho, desde y0 (tapado por el cuerpo) hasta el piso.
     casco = alto del casco (0 = sin casco); raja = línea de pezuña partida (chancho).
     Las patas van de a pares: primero la de atrás (corrida a la derecha) y encima la de adelante,
     así queda un solo hueco grande debajo de la panza en vez de una fila de tiritas. */
  function pata(x, w = 80, y0 = 700, casco = 86, raja = false) {
    const y1 = LOMA_Y + 5, r = 26, h = w - 2 * r;
    let s = `<path d="M${x} ${y0}V${y1 - r}q0 ${r} ${r} ${r}h${h}q${r} 0 ${r}-${r}V${y0}z"/>`;
    if (casco) s += `<path d="M${x} ${y1 - casco}q${w / 2} 14 ${w} 0V${y1 - r}q0 ${r}-${r} ${r}h-${h}q-${r} 0-${r}-${r}z"/>`;
    if (raja) s += `<path d="M${x + w / 2} ${y1}v-34" fill="none" stroke-width="12"/>`;
    return s;
  }
  // Par de patas: la de atrás en x + dx (dibujada primero) y la de adelante en x, encima.
  const par = (x, dx, w, y0, casco, raja) => pata(x + dx, w, y0, casco, raja) + pata(x, w, y0, casco, raja);

  // Contorno festoneado (lana, nube, pompón): n arcos hacia afuera sobre una elipse.
  function nube(cx, cy, rx, ry, n, fase = 0, abulta = 0.56) {
    let d = '';
    let px = 0, py = 0;
    for (let i = 0; i <= n; i++) {
      const a = fase + (i / n) * Math.PI * 2;
      const x = r0(cx + rx * Math.cos(a));
      const y = r0(cy + ry * Math.sin(a));
      if (i === 0) d += `M${x} ${y}`;
      else {
        const r = r0(Math.hypot(x - px, y - py) * abulta);
        d += `A${r} ${r} 0 0 1 ${x} ${y}`;
      }
      px = x; py = y;
    }
    return `<path d="${d}Z"/>`;
  }

  /* ---------- Vaca: manchas, cuernitos, hocico grande con fosas, campana y ubre ---------- */
  add('vaca', 'Vaca', `
    ${pasto()}
    <path d="M860 490C915 480 925 440 915 385" fill="none"/>
    ${nube(915, 335, 42, 52, 6)}
    ${par(372, 56, 80, 675)}${par(735, 60, 80, 640)}
    <path d="M572 690C544 718 538 768 560 790V798A13 13 0 0 0 586 798V790H602V800A13 13 0 0 0 628 800V790H644V798A13 13 0 0 0 670 798V790C692 768 686 718 658 690Z"/>
    <path d="M455 410H760C830 410 885 465 885 535V610C885 680 830 730 760 730H455C385 730 330 680 330 610V535C330 465 385 410 455 410Z"/>
    <path d="M520 410C505 465 540 515 590 505 610 545 680 550 700 505 745 505 760 455 740 410Z"/>
    <path d="M885 538C845 520 800 545 805 585 810 630 850 648 885 608Z"/>
    <path d="M540 595C560 565 620 565 640 595 675 600 690 645 660 670 640 700 580 700 560 675 525 675 515 625 540 595Z"/>
    <path d="M216 500C226 560 224 600 212 632H368C356 600 354 560 364 500Z"/>
    <path d="M206 612Q290 656 374 612V676Q290 720 206 676Z"/>
    <path d="M268 684C238 684 232 712 232 734 232 758 226 770 218 780H318C310 770 304 758 304 734 304 712 298 684 268 684Z"/>
    <circle cx="268" cy="794" r="15" fill="#000"/>
    <path d="M168 244C136 216 114 184 112 152A28 28 0 0 1 166 140C174 166 196 186 230 202Z"/>
    <path d="M412 244C444 216 466 184 468 152A28 28 0 0 0 414 140C406 166 384 186 350 202Z"/>
    <path d="M140 290C95 255 40 265 35 295 45 330 105 345 150 330Z"/>
    <path d="M440 290C485 255 540 265 545 295 535 330 475 345 430 330Z"/>
    <path d="M230 205C210 152 240 114 268 132 278 92 312 92 318 132 344 114 374 152 350 205Z"/>
    <ellipse cx="290" cy="320" rx="172" ry="150"/>
    <ellipse cx="290" cy="465" rx="158" ry="100"/>
    ${ojo(236, 280)}${ojo(344, 280)}
    ${cachete(178, 334, 30, 21)}${cachete(402, 334, 30, 21)}
    <ellipse cx="230" cy="455" rx="18" ry="12" fill="#000" transform="rotate(10 230 455)"/>
    <ellipse cx="350" cy="455" rx="18" ry="12" fill="#000" transform="rotate(-10 350 455)"/>
    <path d="M255 512q35 26 70 0" fill="none" stroke-width="12"/>
  `);

  /* ---------- Chancho: hocico redondo con fosas, orejas en punta, panza, colita enrulada, patitas gorditas ---------- */
  // Oreja de chancho (izquierda): triángulo redondeado inclinado hacia afuera, con la punta redonda y una
  // oreja interna más chica (segunda zona). Ambas van antes de la cabeza, que tapa su base.
  const oreja =
    '<path d="M345 250C305 192 232 150 152 138Q102 130 106 180C110 228 136 268 180 302Z"/>' +
    '<path d="M300 240C272 208 226 186 182 180Q152 176 155 202C158 226 170 248 190 268Z"/>';
  // Par de patas del chancho: la de atrás sin raja (sólo asoma el costado) y la de adelante con pezuña partida.
  const parCh = (x) => pata(x + 70, 86, 640, 0) + pata(x, 86, 640, 0, true);
  add('chancho', 'Chancho', `
    ${pasto()}
    <path d="M850 575C910 585 955 555 955 510 955 473 918 457 895 477 878 493 890 523 915 517" fill="none"/>
    ${parCh(372)}${parCh(672)}
    <ellipse cx="590" cy="568" rx="295" ry="205"/>
    <path d="M455 750C530 650 740 640 815 701" fill="none"/>
    ${oreja}
    <g transform="translate(640 0) scale(-1 1)">${oreja}</g>
    <ellipse cx="320" cy="395" rx="215" ry="190"/>
    <ellipse cx="320" cy="448" rx="85" ry="62"/>
    <ellipse cx="290" cy="448" rx="13" ry="22" fill="#000"/>
    <ellipse cx="350" cy="448" rx="13" ry="22" fill="#000"/>
    ${ojo(238, 322)}${ojo(402, 322)}
    ${cachete(172, 440, 28, 20)}${cachete(468, 440, 28, 20)}
    <path d="M276 538q44 26 88 0" fill="none" stroke-width="12"/>
  `);

  /* ---------- Gallina: cresta ondulada, barbilla, pico, ala, cola en abanico y patas ---------- */
  // Pata de gallina: pierna gordita (56 u) y un pie de 3 dedos redondeados (44 u) en tridente, sin membrana:
  // los dedos de los costados nacen en el borde de abajo de la pierna, abiertos ~48°, y las muescas entre
  // dedos quedan cerca del final de la pierna. El talón del pie queda tapado por la pierna, que va encima.
  const patita = (x) =>
    `<path d="M${x - 26} 822L${x - 82} 873A22 22 0 0 0 ${x - 53} 906L${x - 22} 878V900A22 22 0 0 0 ${x + 22} 900` +
    `V878L${x + 53} 906A22 22 0 0 0 ${x + 82} 873L${x + 26} 822Z"/>` +
    `<path d="M${x - 28} 700V850Q${x} 864 ${x + 28} 850V700Z"/>`;
  add('gallina', 'Gallina', `
    ${pasto()}
    <path d="M712 430C700 330 730 220 800 170 830 150 870 165 868 205 866 280 845 360 815 440Z"/>
    <path d="M758 455C788 358 838 288 896 256 926 240 954 266 941 298 918 362 882 432 852 492Z"/>
    <path d="M805 505C845 448 890 414 930 400 957 392 968 434 948 452 915 482 880 516 845 562Z"/>
    ${patita(390)}${patita(650)}
    <path d="M258 205C225 160 240 105 290 110 295 55 365 45 380 100 410 65 470 85 460 145 495 160 490 205 455 215Z"/>
    <path d="M345 160C430 160 490 220 490 300C490 330 500 385 560 410C590 422 690 410 760 385C815 365 852 430 848 505C845 590 805 670 720 715C665 745 600 760 520 760C360 760 240 700 214 600C202 530 220 470 245 435C215 405 200 360 200 300C200 220 265 160 345 160Z"/>
    <path d="M175 318C215 330 240 370 250 410 262 452 232 478 200 476 160 474 140 440 144 405 148 372 152 340 175 318Z"/>
    <path d="M252 255C200 272 150 295 110 320 150 346 200 368 265 386 282 340 278 290 252 255Z"/>
    <path d="M460 535C505 470 645 470 695 545 718 605 690 660 635 662 620 692 575 698 555 672 525 690 478 676 482 640 445 618 438 572 460 535Z"/>
    <path d="M545 572C575 562 620 562 650 577M532 620C567 610 612 610 647 625" fill="none" stroke-width="12"/>
    ${ojo(330, 285)}
    ${cachete(362, 370, 30, 22)}
  `);

  /* ---------- Oveja: cuerpo de lana festoneado con rulitos, carita, orejas y patitas ---------- */
  // Rulito de lana: espiral (tres medias vueltas cada vez más grandes), ~65 × 55 u, trazo 10.
  const rulo = (x, y) =>
    `M${x} ${y}a10 10 0 0 1 20 0a21 21 0 0 1-42 0a32 32 0 0 1 64 0`;
  add('oveja', 'Oveja', `
    ${pasto()}
    ${par(350, 70, 76, 620, 82)}${par(710, 70, 76, 620, 82)}
    ${nube(895, 475, 70, 62, 6)}
    ${nube(605, 535, 290, 195, 16, Math.PI / 16, 0.53)}
    <path d="${rulo(600, 440)}${rulo(745, 560)}${rulo(540, 610)}" fill="none" stroke-width="10"/>
    <path d="M175 385c-60-25-120-5-135 25 20 45 95 45 145 15z"/>
    <path d="M425 385c60-25 120-5 135 25-20 45-95 45-145 15z"/>
    <ellipse cx="300" cy="425" rx="156" ry="165"/>
    ${nube(300, 280, 122, 62, 9, 0, 0.53)}
    ${ojo(238, 420, 23, 29)}${ojo(362, 420, 23, 29)}
    ${cachete(206, 480, 28, 22)}${cachete(394, 480, 28, 22)}
    <ellipse cx="300" cy="500" rx="24" ry="15" fill="#000"/>
    <path d="M300 510v38M270 538q30 22 60 0" fill="none" stroke-width="12"/>
  `);

  /* ---------- Caballo: flequillo y crin con mechones, cuello largo, hocico alargado, cola, cascos ---------- */
  add('caballo', 'Caballo', `
    ${pasto()}
    <path d="M835 515C875 470 930 475 940 525A40 40 0 0 1 942 585A40 40 0 0 1 945 645A40 40 0 0 1 930 705C922 732 905 748 886 746Q868 744 873 722C878 700 880 680 872 660 864 640 862 625 850 610Z"/>
    <path d="M942 585C918 575 902 560 894 538M945 645C920 640 902 625 894 602" fill="none" stroke-width="12"/>
    ${par(390, 70, 72, 640)}${par(672, 70, 72, 640)}
    <path d="M350 405C330 470 300 520 298 580 296 650 350 712 440 724 530 732 650 730 740 726 815 722 860 685 874 625 890 560 862 485 790 478 720 472 680 510 605 512 565 514 545 490 530 450 515 410 505 370 500 330Z"/>
    <path d="M390 150C425 95 510 110 515 195 565 215 582 278 550 315 600 335 610 395 570 420 615 450 628 500 598 520Q580 532 562 520C520 500 470 450 440 392 418 345 420 250 430 190Z"/>
    <path d="M512 205C490 225 480 250 470 280M550 318C520 330 490 342 440 352" fill="none" stroke-width="12"/>
    <path d="M280 165C258 115 266 72 298 40 338 72 354 120 344 165Z"/>
    <path d="M368 168C366 114 390 76 426 54 456 92 462 142 440 184Z"/>
    <path d="M330 145C410 145 470 200 470 280 470 350 430 395 370 410 320 425 290 452 230 456 140 462 85 420 85 365 85 318 110 292 150 270 190 248 240 160 330 145Z"/>
    <path d="M172 262C215 305 238 390 228 450" fill="none" stroke-width="12"/>
    <path d="M412 156C398 112 312 96 262 124 228 144 208 178 214 210Q218 226 234 220C252 210 262 196 272 184 282 202 282 216 292 226Q300 236 312 226C324 212 330 200 336 188 346 204 348 216 358 222Q366 228 376 218C394 200 406 180 412 156Z"/>
    <ellipse cx="118" cy="372" rx="11" ry="15" fill="#000"/>
    <path d="M138 404q28 16 58 4" fill="none" stroke-width="12"/>
    ${ojo(305, 296)}
    ${cachete(370, 352)}
  `);

  /* ---------- Pato: pico ancho de dos partes, cuerpo tipo gota con cola levantada, ala con plumas, sobre el agua ---------- */
  add('pato', 'Pato', `
    <path d="M235 620C232 530 262 470 300 430L470 420C530 470 600 482 680 470 760 458 826 446 862 398L895 350Q912 328 928 352C942 382 922 412 945 448 964 505 958 570 930 630 905 690 850 740 780 770 700 805 600 830 470 830 330 830 235 760 235 620Z"/>
    <path d="M440 596C470 532 610 515 720 525 780 530 830 522 862 500A60 60 0 0 1 814 592A54 54 0 0 1 742 640A56 56 0 0 1 650 662C560 668 452 652 440 596Z"/>
    <path d="M814 592C775 580 735 578 700 582M742 640C705 622 665 616 625 618" fill="none" stroke-width="12"/>
    <path d="M350 162C340 112 365 82 400 87M385 157C395 122 425 112 450 127" fill="none"/>
    <path d="M300 300C250 300 180 300 128 300 96 300 82 335 96 362 112 390 165 395 205 380 232 368 250 350 300 345Z"/>
    <path d="M300 262C255 240 200 196 140 192 90 190 52 228 58 270 64 300 95 310 128 306 170 302 205 298 240 282L300 285Z"/>
    <circle cx="370" cy="305" r="158"/>
    ${ojo(345, 272)}
    ${cachete(405, 352)}
    <path d="M55 750q44-35 89 0t89 0 89 0 89 0 89 0 89 0 89 0 89 0 89 0 89 0v5C945 840 780 895 500 895 220 895 55 840 55 755Z"/>
    <path d="M170 815q40-25 80 0M455 860q40-25 80 0M730 825q40-25 80 0" fill="none" stroke-width="12"/>
  `);

  /* ---------- Pollito: bolita saliendo del huevo (la cáscara de abajo como pantaloncito), alitas, pico y patitas ---------- */
  // Pie de pollito: pierna corta que se abre en tres deditos redondos (una sola zona: pierna + pie).
  const piePollito = (x) =>
    `<path d="M${x - 24} 700V844C${x - 28} 860 ${x - 60} 862 ${x - 66} 882A22 22 0 0 0 ${x - 22} 882` +
    `A22 22 0 0 0 ${x + 22} 882A22 22 0 0 0 ${x + 66} 882C${x + 60} 862 ${x + 28} 860 ${x + 24} 844V700Z"/>`;
  // Alita izquierda levantada (saludando), con tres plumitas en el borde de abajo; la derecha es su espejo.
  const alaPollito = '<path d="M300 462A32 32 0 0 1 244 442A32 32 0 0 1 200 402A34 34 0 0 1 166 348' +
    'C150 310 170 286 200 296 240 308 270 328 300 350Z"/>';
  add('pollito', 'Pollito', `
    ${pasto()}
    ${piePollito(405)}${piePollito(595)}
    ${alaPollito}<g transform="translate(1000 0) scale(-1 1)">${alaPollito}</g>
    <circle cx="500" cy="410" r="230"/>
    <g transform="rotate(-12 500 210)"><path d="M380 232A120 110 0 0 1 620 232L580 265 540 232 500 265 460 232 420 265Z"/></g>
    ${ojo(430, 362, 30, 36)}${ojo(570, 362, 30, 36)}
    ${cachete(378, 435)}${cachete(622, 435)}
    <path d="M460 414Q500 400 540 414Q527 462 500 468 473 462 460 414Z"/>
    <path d="M250 560A250 215 0 0 0 750 560L700 500 650 570 600 500 550 570 500 500 450 570 400 500 350 570 300 500Z"/>
  `);

  /* ---------- Cabra: cuernos curvos hacia atrás, chivita, orejas a los costados, pezuñas y colita parada ---------- */
  add('cabra', 'Cabra', `
    ${pasto()}
    <path d="M800 490C812 440 840 398 876 376Q900 364 906 384C900 420 878 460 850 520Z"/>
    ${par(410, 58, 68, 660, 72)}${par(712, 58, 68, 660, 72)}
    <path d="M370 440H740C820 440 868 496 868 570 868 648 820 708 740 708H470C400 708 370 660 370 600Z"/>
    <path d="M205 228C193 150 227 88 287 72Q315 66 311 92C273 104 255 150 259 212Z"/>
    <path d="M333 200C329 130 367 75 433 66Q461 64 455 92C411 100 383 148 385 206Z"/>
    <path d="M167 285C125 270 78 282 50 318 80 350 131 352 175 336Z"/>
    <path d="M423 285C465 270 512 282 540 318 510 350 459 352 415 336Z"/>
    <path d="M259 525C253 575 271 622 297 652 317 620 335 575 331 525Z"/>
    <path d="M295 178C387 178 445 240 445 315 445 385 410 440 375 484H215C180 440 145 385 145 315 145 240 203 178 295 178Z"/>
    <ellipse cx="295" cy="482" rx="98" ry="66"/>
    ${ojo(247, 312)}${ojo(343, 312)}
    ${cachete(209, 382, 30, 20)}${cachete(381, 382, 30, 20)}
    <ellipse cx="265" cy="470" rx="12" ry="16" fill="#000"/>
    <ellipse cx="325" cy="470" rx="12" ry="16" fill="#000"/>
    <path d="M267 510q28 20 56 0" fill="none" stroke-width="12"/>
  `);

  /* ---------- Burro: orejas larguísimas, hocico grande, crin corta y parada, mantita y cola con pompón ---------- */
  // Punto de una cúbica k = [[x,y] ×4] en t, corrido `off` u sobre la normal izquierda (en pantalla) del avance.
  function sobre(k, t, off = 0) {
    const s = 1 - t, [a, b, c, d] = k;
    const f = (i) => s * s * s * a[i] + 3 * s * s * t * b[i] + 3 * s * t * t * c[i] + t * t * t * d[i];
    const g = (i) => 3 * (s * s * (b[i] - a[i]) + 2 * s * t * (c[i] - b[i]) + t * t * (d[i] - c[i]));
    const l = Math.hypot(g(0), g(1));
    return [r0(f(0) + (g(1) / l) * off), r0(f(1) - (g(0) / l) * off)];
  }
  /* Crin corta y parada sobre el borde k (cúbica) entre t0 y t1: n mechones redondeados (medias elipses de
     alto h) cuya base queda `fuera` u afuera del borde (así forman una sola zona) y que se meten `aden` u
     adentro por debajo de la pieza que va encima. (x0, y0): punto escondido detrás de la cabeza. */
  function crin(k, t0, t1, n, fuera, aden, h, x0, y0) {
    let d = `M${x0} ${y0}L${sobre(k, t0, fuera).join(' ')}`;
    let [px, py] = sobre(k, t0, fuera);
    for (let i = 1; i <= n; i++) {
      const [x, y] = sobre(k, t0 + ((t1 - t0) * i) / n, fuera);
      d += `A${r0(Math.hypot(x - px, y - py) / 2)} ${h} ${r0((Math.atan2(y - py, x - px) * 180) / Math.PI)} 0 1 ${x} ${y}`;
      px = x; py = y;
    }
    for (let i = 8; i >= 0; i--) d += `L${sobre(k, t0 + ((t1 - t0) * i) / 8, -aden).join(' ')}`;
    return `<path d="${d}Z"/>`;
  }
  // Oreja izquierda de burro: larga, con la puntita marcada (la línea termina justo sobre el contorno),
  // inclinada hacia afuera; la derecha es su espejo.
  const orejaBurro =
    '<g transform="rotate(-15 215 280)"><path d="M165 280C150 200 160 110 190 65 200 50 230 50 240 65 270 110 280 200 265 280Z"/>' +
    '<path d="M168 124Q215 110 262 124" fill="none" stroke-width="12"/></g>';
  // Borde de atrás del cuello (lo sigue la crin).
  const cuelloBurro = [[370, 280], [430, 320], [480, 430], [565, 460]];
  add('burro', 'Burro', `
    ${pasto()}
    <path d="M860 520C905 505 925 470 918 425" fill="none"/>
    ${nube(918, 378, 36, 46, 6)}
    ${par(425, 58, 72, 660, 72)}${par(712, 58, 72, 660, 72)}
    ${crin(cuelloBurro, 0.08, 0.85, 4, 26, 30, 34, 300, 330)}
    <path d="M410 650C398 600 380 550 355 500L370 280C430 320 480 430 565 460H760C830 460 875 510 875 580V625C875 685 830 720 760 720H500C450 720 415 690 410 650Z"/>
    <path d="M590 460H762L770 612A27 27 0 0 1 722 612A27 27 0 0 1 675 612A27 27 0 0 1 628 612A27 27 0 0 1 580 612Z"/>
    <path d="M676 574C648 554 631 536 631 518 631 504 641 494 654 494 664 494 673 501 676 510 679 501 688 494 698 494 711 494 721 504 721 518 721 536 704 554 676 574Z"/>
    ${orejaBurro}<g transform="translate(550 0) scale(-1 1)">${orejaBurro}</g>
    <ellipse cx="275" cy="345" rx="140" ry="120"/>
    <ellipse cx="275" cy="482" rx="122" ry="82"/>
    ${ojo(228, 316, 26, 32)}${ojo(322, 316, 26, 32)}
    ${cachete(192, 378, 30, 20)}${cachete(358, 378, 30, 20)}
    <ellipse cx="240" cy="470" rx="13" ry="17" fill="#000"/>
    <ellipse cx="310" cy="470" rx="13" ry="17" fill="#000"/>
    <path d="M243 518q32 22 64 0" fill="none" stroke-width="12"/>
  `);

  /* ---------- Pavo: cola en abanico enorme, cuerpo redondo, moco rojo junto al pico y patitas ---------- */
  /* Abanico de n plumas de punta redonda entre los ángulos a0 y a1 (grados, sentido horario desde las 3), con
     centro (cx, cy) y radio r en las uniones. Rayas entre plumas y una franja concéntrica a radio rb que le
     marca la punta a cada pluma. El centro queda tapado por el cuerpo. */
  function abanico(cx, cy, r, n, a0, a1, rb) {
    const P = (a, rr) => [r0(cx + rr * Math.cos((a * Math.PI) / 180)), r0(cy + rr * Math.sin((a * Math.PI) / 180))];
    const paso = (a1 - a0) / n, ra = r0(2 * r * Math.sin((paso * Math.PI) / 360) * 0.62);
    let d = `M${cx} ${cy}L${P(a0, r).join(' ')}`, rayas = '';
    for (let i = 1; i <= n; i++) {
      const p = P(a0 + i * paso, r).join(' ');
      d += `A${ra} ${ra} 0 0 1 ${p}`;
      if (i < n) rayas += `M${cx} ${cy}L${p}`;
    }
    return `<path d="${d}Z"/><path d="${rayas}M${P(a0, rb).join(' ')}A${rb} ${rb} 0 1 1 ${P(a1, rb).join(' ')}" fill="none"/>`;
  }
  // Alita izquierda del pavo, plegada al costado del cuerpo, con plumitas abajo; la derecha es su espejo.
  const alaPavo = '<path d="M345 560C300 565 255 600 240 650A28 28 0 0 0 272 690A28 28 0 0 0 310 710A28 28 0 0 0 350 706' +
    'C368 670 370 610 345 560Z"/>';
  add('pavo', 'Pavo', `
    ${pasto()}
    ${abanico(500, 585, 410, 7, 165, 375, 330)}
    ${piePollito(405)}${piePollito(595)}
    <ellipse cx="500" cy="610" rx="200" ry="160"/>
    ${alaPavo}<g transform="translate(1000 0) scale(-1 1)">${alaPavo}</g>
    <circle cx="500" cy="355" r="140"/>
    ${ojo(450, 330)}${ojo(550, 330)}
    ${cachete(420, 398, 30, 20)}${cachete(580, 398, 30, 20)}
    <path d="M486 398C470 400 462 414 462 432 462 448 452 462 452 480A30 30 0 0 0 512 484C512 464 500 452 498 438Z"/>
    <path d="M470 382Q500 370 530 382Q518 424 500 434 482 424 470 382Z"/>
  `);

  /* ---------- Tractor: rueda de atrás enorme con tacos, rueda chica adelante, cabina, caño con humo y carita ---------- */
  // Rueda de tractor: cubierta con n tacos (entre los radios r y R), llanta (radio rl) y maza (radio rm) con tuerca.
  function ruedaTractor(cx, cy, R, r, n, rl, rm) {
    const P = (a, rr) => `${r0(cx + rr * Math.cos(a))} ${r0(cy + rr * Math.sin(a))}`;
    const paso = (2 * Math.PI) / n, base = paso * 0.3, punta = paso * 0.22;
    let d = '';
    for (let i = 0; i < n; i++) {
      const a = i * paso;
      d += `${i ? `A${r} ${r} 0 0 1 ` : 'M'}${P(a - base, r)}L${P(a - punta, R)}A${R} ${R} 0 0 1 ${P(a + punta, R)}L${P(a + base, r)}`;
    }
    return `<path d="${d}A${r} ${r} 0 0 1 ${P(-base, r)}Z"/><circle cx="${cx}" cy="${cy}" r="${rl}" stroke-width="12"/>` +
      `<circle cx="${cx}" cy="${cy}" r="${rm}" stroke-width="12"/><circle cx="${cx}" cy="${cy}" r="10" fill="#000" stroke="none"/>`;
  }
  add('tractor', 'Tractor', `
    ${pasto()}
    ${nube(292, 156, 58, 44, 7)}${nube(384, 256, 40, 32, 6)}
    <path d="M356 480V346Q356 330 372 330H396Q412 330 412 346V480Z"/>
    <path d="M490 245H850V600H490Z"/>
    <path d="M586 298H777Q803 298 803 324V560H560V324Q560 298 586 298Z"/>
    <rect x="478" y="186" width="402" height="64" rx="22"/>
    <path d="M150 480H540V700H150C128 700 110 682 110 660V520C110 498 128 480 150 480Z"/>
    <path d="M415 700A245 245 0 0 1 905 700Z"/>
    ${ruedaTractor(660, 700, 205, 183, 12, 120, 48)}
    <circle cx="240" cy="780" r="110"/>
    <circle cx="240" cy="780" r="52" stroke-width="12"/>
    <circle cx="240" cy="780" r="10" fill="#000" stroke="none"/>
    <path d="M110 520C177 520 177 600 110 600Z"/>
    ${ojo(232, 548, 25, 31)}${ojo(322, 548, 25, 31)}
    ${cachete(192, 612, 30, 20)}${cachete(362, 612, 30, 20)}
    <path d="M249 600q28 20 56 0" fill="none" stroke-width="12"/>
  `);
})(window.CL);
