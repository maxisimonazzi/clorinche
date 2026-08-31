/* Colorinche — js/drawings/granja.js
   Dibujos para colorear de la categoría "Granja": vaca, chancho, gallina, oveja, caballo y pato.
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
})(window.CL);
