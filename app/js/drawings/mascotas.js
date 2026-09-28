/* Colorinche — dibujos para colorear: categoría "Mascotas".
   Lienzo 1000×1000, contorno 16 (el <g> con el estilo lo pone registry.js).
   Orden de cada dibujo: lo de atrás primero; lo que va adelante tapa con su relleno blanco. */
'use strict';
(function (CL) {
  const add = (id, nombre, svg) => CL.drawings.add('mascotas', id, nombre, svg);

  /* ---------- Perro: orejas caídas, parche en el ojo, lengua afuera, collar con chapita y cola ---------- */
  add('perro', 'Perro', `
  <path d="M660 790C750 780 805 720 818 640C825 598 878 600 875 650C868 760 785 840 670 850z"/>
  <path d="M390 515C320 590 285 700 290 800C292 850 320 875 370 880H630C680 875 708 850 710 800C715 700 680 590 610 515z"/>
  <circle cx="345" cy="785" r="100"/>
  <circle cx="655" cy="785" r="100"/>
  <path d="M405 885V735C405 695 500 695 500 735V885z"/>
  <path d="M500 885V735C500 695 595 695 595 735V885z"/>
  <ellipse cx="308" cy="885" rx="90" ry="42"/>
  <ellipse cx="692" cy="885" rx="90" ry="42"/>
  <ellipse cx="447" cy="890" rx="62" ry="40"/>
  <ellipse cx="553" cy="890" rx="62" ry="40"/>
  <path d="M290 927V900M330 927V900M427 930V903M467 930V903M533 930V903M573 930V903M670 927V900M710 927V900" fill="none" stroke-width="12"/>
  <path d="M372 522Q500 580 628 522Q664 548 660 590Q500 654 340 590Q336 548 372 522z"/>
  <circle cx="500" cy="638" r="34"/>
  <ellipse cx="500" cy="340" rx="245" ry="220"/>
  <path d="M526 270C526 222 560 194 606 194C652 194 692 228 694 274C696 322 660 352 608 352C574 352 552 342 540 324C530 308 526 290 526 270z"/>
  <path d="M385 175C300 115 180 160 160 275C142 385 180 492 245 505C305 518 330 440 330 370C330 290 355 235 385 175z"/>
  <path d="M615 175C700 115 820 160 840 275C858 385 820 492 755 505C695 518 670 440 670 370C670 290 645 235 615 175z"/>
  <ellipse cx="410" cy="272" rx="30" ry="38" fill="#000"/>
  <ellipse cx="590" cy="272" rx="30" ry="38" fill="#000"/>
  <circle cx="400" cy="258" r="11" fill="#fff" stroke="none"/>
  <circle cx="580" cy="258" r="11" fill="#fff" stroke="none"/>
  <circle cx="419" cy="288" r="5" fill="#fff" stroke="none"/>
  <circle cx="599" cy="288" r="5" fill="#fff" stroke="none"/>
  <ellipse cx="384" cy="436" rx="40" ry="28" stroke-width="12"/>
  <ellipse cx="616" cy="436" rx="40" ry="28" stroke-width="12"/>
  <path d="M470 452Q490 456 500 436Q510 456 530 452C556 470 552 524 500 524C448 524 444 470 470 452z"/>
  <path d="M500 452V474" fill="none" stroke-width="12"/>
  <path d="M460 377C460 353 540 353 540 377C540 402 514 416 500 416C486 416 460 402 460 377z"/>
  <path d="M500 416V436M454 428Q458 448 470 452Q490 456 500 436Q510 456 530 452Q542 448 546 428" fill="none"/>
`);

  /* ---------- Gato: sentado con las patitas juntas, orejas en punta, bigotes y la cola en signo de pregunta ---------- */
  add('gato', 'Gato', `
  <path d="M640 800C730 800 800 750 810 670C815 630 862 632 862 675C858 790 770 860 650 858z"/>
  <path d="M415 525C352 600 322 710 326 800C328 845 360 860 410 860H590C640 860 672 845 674 800C678 710 648 600 585 525z"/>
  <path d="M337 688C392 700 418 740 430 780M663 688C608 700 582 740 570 780" fill="none"/>
  <path d="M430 860V712C430 676 500 676 500 712V860z"/>
  <path d="M500 860V712C500 676 570 676 570 712V860z"/>
  <ellipse cx="342" cy="855" rx="64" ry="36"/>
  <ellipse cx="658" cy="855" rx="64" ry="36"/>
  <ellipse cx="462" cy="856" rx="48" ry="34"/>
  <ellipse cx="538" cy="856" rx="48" ry="34"/>
  <path d="M285 320C258 225 250 130 272 80C284 55 310 50 334 64C390 98 450 150 485 195z"/>
  <path d="M715 320C742 225 750 130 728 80C716 55 690 50 666 64C610 98 550 150 515 195z"/>
  <path d="M312 262C300 200 302 148 320 116C370 144 414 182 440 218z" stroke-width="12"/>
  <path d="M688 262C700 200 698 148 680 116C630 144 586 182 560 218z" stroke-width="12"/>
  <ellipse cx="500" cy="355" rx="250" ry="195"/>
  <path d="M500 164V215M452 170L460 208M548 170L540 208" fill="none" stroke-width="12"/>
  <path d="M232 396L160 378M251 440L158 450M768 396L840 378M749 440L842 450" fill="none" stroke-width="12"/>
  <ellipse cx="410" cy="350" rx="34" ry="42" fill="#000"/>
  <ellipse cx="590" cy="350" rx="34" ry="42" fill="#000"/>
  <circle cx="399" cy="334" r="11" fill="#fff" stroke="none"/>
  <circle cx="579" cy="334" r="11" fill="#fff" stroke="none"/>
  <circle cx="420" cy="368" r="5" fill="#fff" stroke="none"/>
  <circle cx="600" cy="368" r="5" fill="#fff" stroke="none"/>
  <ellipse cx="362" cy="432" rx="40" ry="28" stroke-width="12"/>
  <ellipse cx="638" cy="432" rx="40" ry="28" stroke-width="12"/>
  <path d="M458 408C458 386 542 386 542 408C542 434 514 452 500 452C486 452 458 434 458 408z"/>
  <path d="M500 452V468M450 461C466 491 492 488 500 468C508 488 534 491 550 461" fill="none"/>
`);

  /* ---------- Conejo: orejas largas, dientes de conejo y una zanahoria en la mano ---------- */
  add('conejo', 'Conejo', `
  <g transform="rotate(-10 400 330)"><ellipse cx="400" cy="205" rx="80" ry="160"/><ellipse cx="400" cy="225" rx="34" ry="110" stroke-width="12"/></g>
  <g transform="rotate(10 600 330)"><ellipse cx="600" cy="205" rx="80" ry="160"/><ellipse cx="600" cy="225" rx="34" ry="110" stroke-width="12"/></g>
  <path d="M400 580C320 650 285 760 290 840C293 890 325 905 380 905H620C675 905 707 890 710 840C715 760 680 650 600 580z"/>
  <ellipse cx="500" cy="780" rx="105" ry="110"/>
  <g transform="translate(45 20)">
  <g transform="rotate(-40 790 600)"><path d="M790 600C734 562 736 492 790 446C844 492 846 562 790 600z"/></g>
  <g transform="rotate(40 790 600)"><path d="M790 600C734 562 736 492 790 446C844 492 846 562 790 600z"/></g>
  <path d="M790 600C742 550 744 474 790 422C836 474 838 550 790 600z"/>
  <path d="M725 600C760 578 820 578 855 600C862 700 825 800 800 875C795 890 785 890 780 875C755 800 718 700 725 600z"/>
  <path d="M854 650L815 660M752 788L776 794M833 772L806 778" fill="none" stroke-width="12"/>
  </g>
  <path d="M362 560C340 598 320 636 305 675C293 707 342 730 358 702C378 666 400 628 422 590z"/>
  <path d="M590 560C640 600 700 650 752 670C792 686 800 732 768 745C725 762 660 730 612 690C590 670 580 620 585 560z"/>
  <ellipse cx="395" cy="895" rx="100" ry="45"/>
  <ellipse cx="605" cy="895" rx="100" ry="45"/>
  <path d="M375 935V910M415 935V910M585 935V910M625 935V910" fill="none" stroke-width="12"/>
  <ellipse cx="500" cy="440" rx="215" ry="175"/>
  <ellipse cx="420" cy="412" rx="28" ry="36" fill="#000"/>
  <ellipse cx="580" cy="412" rx="28" ry="36" fill="#000"/>
  <circle cx="410" cy="398" r="10" fill="#fff" stroke="none"/>
  <circle cx="570" cy="398" r="10" fill="#fff" stroke="none"/>
  <circle cx="429" cy="428" r="5" fill="#fff" stroke="none"/>
  <circle cx="589" cy="428" r="5" fill="#fff" stroke="none"/>
  <ellipse cx="358" cy="478" rx="40" ry="28" stroke-width="12"/>
  <ellipse cx="642" cy="478" rx="40" ry="28" stroke-width="12"/>
  <path d="M454 512H546V552Q546 570 528 570H472Q454 570 454 552z"/>
  <path d="M500 512V570" fill="none" stroke-width="12"/>
  <path d="M424 492C434 508 446 512 464 512M576 492C566 508 554 512 536 512" fill="none"/>
  <path d="M462 450C462 426 538 426 538 450C538 480 514 498 500 498C486 498 462 480 462 450z"/>
  <path d="M500 498V512" fill="none"/>
`);

  /* ---------- Pez: aletas, escamas en "C", cola y burbujas ---------- */
  add('pez', 'Pez', `
  <path d="M760 500C800 420 850 340 905 320C945 310 950 360 930 420C915 460 905 480 905 500C905 520 915 540 930 580C950 640 945 690 905 680C850 660 800 580 760 500z"/>
  <path d="M845 450L900 400M845 550L900 600" fill="none" stroke-width="12"/>
  <path d="M405 282C440 185 510 134 590 140C650 145 660 230 646 312z"/>
  <path d="M470 720C480 790 530 830 590 830C610 820 610 790 600 720z"/>
  <ellipse cx="470" cy="500" rx="330" ry="245"/>
  <path d="M370 267Q470 500 370 733" fill="none"/>
  <path d="M548 262C556 300 650 330 548 381Q638 440 548 500Q638 560 548 619C650 670 556 700 548 738M668 304C674 344 752 372 668 435Q744 500 668 565C752 628 674 656 668 696" fill="none" stroke-width="12"/>
  <path d="M424 564Q475 552 521 569A25 25 0 0 1 517 613A25 25 0 0 1 494 652A25 25 0 0 1 458 679Q425 650 405 597A19 19 0 0 1 424 564z"/>
  <path d="M444 590L486 604M438 601L470 631" fill="none" stroke-width="10"/>
  <ellipse cx="265" cy="440" rx="36" ry="44" fill="#000"/>
  <circle cx="253" cy="424" r="11" fill="#fff" stroke="none"/>
  <circle cx="275" cy="458" r="5" fill="#fff" stroke="none"/>
  <ellipse cx="300" cy="540" rx="40" ry="28" stroke-width="12"/>
  <path d="M195 515Q220 545 245 515" fill="none"/>
  <circle cx="145" cy="212" r="48"/>
  <circle cx="252" cy="128" r="38"/>
  <circle cx="118" cy="96" r="34"/>
`);

  /* ---------- Tortuga: caparazón con placas grandes, cabeza sonriente y patas ---------- */
  add('tortuga', 'Tortuga', `
  <g transform="translate(0 -45)">
  <path d="M850 620C910 620 944 648 946 686C922 712 884 718 850 718z"/>
  <path d="M400 680C400 730 393 765 400 785C410 812 490 812 500 785C507 765 500 730 500 680z"/>
  <path d="M660 680C660 730 653 765 660 785C670 812 750 812 760 785C767 765 760 730 760 680z"/>
  <path d="M150 470C150 560 160 615 200 665H370L360 450z"/>
  <path d="M270 660A290 370 0 0 1 850 660z"/>
  <path d="M478 420H642L710 530L650 640H470L410 530z"/>
  <path d="M478 420L415 340M642 420L705 340M410 530L291 521M710 530L829 521" fill="none"/>
  <path d="M300 680C300 740 290 785 298 808C310 842 410 842 422 808C430 785 420 740 420 680z"/>
  <path d="M740 680C740 740 730 785 738 808C750 842 850 842 862 808C870 785 860 740 860 680z"/>
  <path d="M340 832V806M380 832V806M780 832V806M820 832V806" fill="none" stroke-width="12"/>
  <rect x="212" y="630" width="668" height="76" rx="38"/>
  <path d="M368 630V706M496 630V706M624 630V706M752 630V706" fill="none"/>
  <ellipse cx="200" cy="390" rx="150" ry="130"/>
  <ellipse cx="145" cy="348" rx="25" ry="31" fill="#000"/>
  <ellipse cx="255" cy="348" rx="25" ry="31" fill="#000"/>
  <circle cx="137" cy="335" r="9" fill="#fff" stroke="none"/>
  <circle cx="247" cy="335" r="9" fill="#fff" stroke="none"/>
  <circle cx="153" cy="361" r="5" fill="#fff" stroke="none"/>
  <circle cx="263" cy="361" r="5" fill="#fff" stroke="none"/>
  <ellipse cx="118" cy="436" rx="34" ry="28" stroke-width="12"/>
  <ellipse cx="282" cy="436" rx="34" ry="28" stroke-width="12"/>
  <path d="M180 420C188 454 212 454 220 420" fill="none"/>
  </g>
`);

  /* ---------- Hámster: cachetes inflados, orejitas, bigotes, dientitos, panza clara y semilla de girasol ---------- */
  add('hamster', 'Hámster', `
  <circle cx="316" cy="196" r="76"/>
  <circle cx="684" cy="196" r="76"/>
  <circle cx="326" cy="208" r="34" stroke-width="12"/>
  <circle cx="674" cy="208" r="34" stroke-width="12"/>
  <path d="M155 490C155 320 310 200 500 200C690 200 845 320 845 490C845 545 812 575 804 605C798 628 800 660 810 700C818 732 822 755 822 780C818 868 660 915 500 915C340 915 182 868 178 780C178 755 182 732 190 700C200 660 202 628 196 605C188 575 155 545 155 490z"/>
  <path d="M157 452C220 380 330 322 500 322C670 322 780 380 843 452" fill="none"/>
  <ellipse cx="244" cy="500" rx="40" ry="28" stroke-width="12"/>
  <ellipse cx="756" cy="500" rx="40" ry="28" stroke-width="12"/>
  <ellipse cx="500" cy="745" rx="185" ry="150"/>
  <path d="M500 614C546 650 566 722 556 780C548 824 452 824 444 780C434 722 454 650 500 614z"/>
  <path d="M481 676C474 698 473 720 476 740M519 676C526 698 527 720 524 740" fill="none" stroke-width="10"/>
  <ellipse cx="456" cy="796" rx="50" ry="34"/>
  <ellipse cx="544" cy="796" rx="50" ry="34"/>
  <path d="M440 758V776M470 758V776M530 758V776M560 758V776" fill="none" stroke-width="10"/>
  <ellipse cx="425" cy="905" rx="82" ry="40"/>
  <ellipse cx="575" cy="905" rx="82" ry="40"/>
  <path d="M405 941V918M445 941V918M555 941V918M595 941V918" fill="none" stroke-width="12"/>
  <ellipse cx="400" cy="410" rx="30" ry="38" fill="#000"/>
  <ellipse cx="600" cy="410" rx="30" ry="38" fill="#000"/>
  <circle cx="390" cy="396" r="11" fill="#fff" stroke="none"/>
  <circle cx="590" cy="396" r="11" fill="#fff" stroke="none"/>
  <circle cx="409" cy="426" r="5" fill="#fff" stroke="none"/>
  <circle cx="609" cy="426" r="5" fill="#fff" stroke="none"/>
  <path d="M412 472L322 452M410 498L318 500M412 524L322 548M588 472L678 452M590 498L682 500M588 524L678 548" fill="none" stroke-width="10"/>
  <path d="M458 444C458 422 542 422 542 444C542 470 514 488 500 488C486 488 458 470 458 444z"/>
  <path d="M500 488V508M438 482C446 498 454 504 468 504M562 482C554 498 546 504 532 504" fill="none"/>
  <path d="M460 504H540V546Q540 562 524 562H476Q460 562 460 546z"/>
  <path d="M500 504V562" fill="none" stroke-width="12"/>
`);

  /* ---------- Piezas compartidas de los dibujos nuevos (mismo estilo que los de arriba) ---------- */
  const R = Math.round;
  // Ojo tierno: pupila negra con un brillito grande y uno chiquito (como el perro, el gato y el hámster).
  // El brillito grande no pasa de r = 11 para que quede bloqueado (blanco) y no sea una zona para pintar.
  const ojo = (x, y, rx = 30, ry = 38) =>
    `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#000"/>` +
    `<circle cx="${x - R(rx / 3)}" cy="${y - R(ry * 0.37)}" r="${Math.min(11, R(rx * 0.37))}" fill="#fff" stroke="none"/>` +
    `<circle cx="${x + R(rx * 0.3)}" cy="${y + R(ry * 0.42)}" r="5" fill="#fff" stroke="none"/>`;
  // Cachete para pintar de rosado.
  const cachete = (x, y, rx = 40, ry = 28) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" stroke-width="12"/>`;

  /* ---------- Loro: pico curvo grande, ojo con aro, ala de plumas grandes y cola larga, parado en una rama ---------- */
  add('loro', 'Loro', `
  <g transform="rotate(18 460 590)"><path d="M418 590C414 745 420 852 436 894Q460 928 484 894C500 852 506 745 502 590z"/></g>
  <g transform="rotate(-10 460 590)"><path d="M418 590C414 740 420 845 436 887Q460 921 484 887C500 845 506 740 502 590z"/></g>
  <g transform="rotate(4 460 590)"><path d="M418 590C414 765 420 880 438 922Q460 956 482 922C500 880 506 765 502 590z"/></g>
  <path d="M88 668C300 650 600 646 830 654C872 656 872 734 830 736C600 730 300 734 90 750C46 752 44 670 88 668z"/>
  <g transform="rotate(-30 790 664)"><path d="M790 664C820 606 900 602 950 664C900 726 820 722 790 664z"/><path d="M830 664H910" fill="none" stroke-width="12"/></g>
  <g transform="rotate(40 720 730)"><path d="M720 730C750 672 830 668 880 730C830 792 750 788 720 730z"/><path d="M760 730H840" fill="none" stroke-width="12"/></g>
  <g transform="rotate(-140 190 668)"><path d="M190 668C220 610 300 606 350 668C300 730 220 726 190 668z"/><path d="M230 668H310" fill="none" stroke-width="12"/></g>
  <path d="M590 640V745C590 790 632 790 632 758C632 790 674 790 674 745C674 715 664 690 660 640z"/>
  <path d="M534 640C530 690 520 715 520 745C520 790 562 790 562 758C562 790 604 790 604 745V640z"/>
  <path d="M420 420C470 385 600 380 650 430C700 480 725 560 712 615C702 660 670 676 620 680C560 684 440 686 405 676C380 668 372 640 374 600C372 530 385 460 420 420z"/>
  <g transform="rotate(18 515 535)">
  <path d="M428 465C428 422 468 405 515 405C562 405 602 422 602 465V585C602 622 590 640 574 640C557 640 547 627 544 608C542 633 530 650 515 650C500 650 488 633 486 608C483 627 473 640 456 640C440 640 428 622 428 585z"/>
  <path d="M428 515Q457 555 486 530Q515 558 544 530Q573 555 602 515M486 530V608M544 530V608" fill="none"/>
  </g>
  <circle cx="530" cy="270" r="168"/>
  <path d="M668 350C706 342 746 352 756 380C764 408 736 430 704 430C678 430 660 405 668 350z"/>
  <path d="M650 195C720 165 812 205 824 295C832 355 808 402 772 408C774 383 766 360 744 350C720 340 692 344 668 356C648 318 640 240 650 195z"/>
  <ellipse cx="555" cy="232" rx="74" ry="78"/>
  ${ojo(563, 232)}
  ${cachete(585, 370)}
`);

  /* ---------- Canario: pajarito redondo cantando con dos notas musicales, sobre una ramita con hojas ---------- */
  add('canario', 'Canario', `
  <g transform="rotate(28 260 590)"><path d="M260 556C170 546 90 560 80 590C90 620 170 634 260 624z"/></g>
  <g transform="rotate(4 260 600)"><path d="M260 566C170 556 80 570 70 600C80 630 170 644 260 634z"/></g>
  <g transform="rotate(-20 260 612)"><path d="M260 578C170 568 90 582 80 612C90 642 170 656 260 646z"/></g>
  <g transform="rotate(55 700 800)"><path d="M700 800C730 745 800 742 845 800C800 858 730 855 700 800z"/><path d="M738 800H812" fill="none" stroke-width="12"/></g>
  <path d="M118 790C330 772 600 762 820 750C858 748 862 808 822 810C600 820 330 830 120 850C82 854 80 792 118 790z"/>
  <g transform="rotate(-40 805 755)"><path d="M805 755C835 700 905 697 950 755C905 813 835 810 805 755z"/><path d="M843 755H917" fill="none" stroke-width="12"/></g>
  <g transform="rotate(-160 200 785)"><path d="M200 785C230 730 300 727 345 785C300 843 230 840 200 785z"/><path d="M238 785H312" fill="none" stroke-width="12"/></g>
  <path d="M420 740V835C420 892 462 892 462 850C462 892 504 892 504 835C504 805 496 780 492 740z"/>
  <path d="M350 740C346 780 336 805 336 835C336 892 378 892 378 850C378 892 420 892 420 835V740z"/>
  <path d="M358 385C332 340 338 292 366 290C380 289 388 304 389 322C388 280 398 258 416 258C436 258 442 284 436 322C444 300 456 292 468 298C486 310 472 352 458 385z"/>
  <circle cx="410" cy="575" r="235"/>
  <path d="M637 636A235 235 0 0 1 311 788C360 700 500 640 637 636z"/>
  <path d="M430 555C410 520 345 512 285 528C248 538 234 558 244 574C222 586 224 614 250 618C238 640 256 660 286 652C340 668 410 655 436 618C450 598 448 574 430 555z"/>
  <path d="M616 458C668 446 716 452 742 470C748 476 745 482 738 484C712 490 688 500 668 515C688 528 710 542 728 556C734 562 732 570 724 572C690 578 650 578 620 570C600 540 600 490 616 458z"/>
  ${ojo(505, 468, 32, 40)}
  ${cachete(518, 565)}
  <path d="M592 270V90L816 50V230H772V122L636 146V270z"/>
  <ellipse cx="580" cy="270" rx="58" ry="44" transform="rotate(-20 580 270)"/>
  <ellipse cx="760" cy="230" rx="58" ry="44" transform="rotate(-20 760 230)"/>
  <path d="M862 470V285C862 262 880 256 898 266C940 290 962 335 948 400C938 378 922 356 906 348V470z"/>
  <ellipse cx="850" cy="470" rx="58" ry="44" transform="rotate(-20 850 470)"/>
`);

  /* ---------- Ratón: orejas redondas grandes, bigotes, cola larga en curva y un pedazo de queso con agujeros ---------- */
  add('raton', 'Ratón', `
  <path d="M660 820C760 900 900 900 915 780C925 700 895 640 855 612C830 596 800 610 812 632C850 660 868 705 862 760C852 840 760 850 680 800z"/>
  <circle cx="300" cy="195" r="125"/>
  <circle cx="305" cy="202" r="76"/>
  <circle cx="700" cy="195" r="125"/>
  <circle cx="695" cy="202" r="76"/>
  <path d="M400 510C300 570 282 690 290 800C296 870 340 900 410 900H590C660 900 704 870 710 800C718 690 700 570 600 510z"/>
  <ellipse cx="400" cy="905" rx="85" ry="40"/>
  <ellipse cx="600" cy="905" rx="85" ry="40"/>
  <path d="M380 945V920M420 945V920M580 945V920M620 945V920" fill="none" stroke-width="12"/>
  <ellipse cx="500" cy="375" rx="215" ry="170"/>
  <path d="M262 420L170 395M282 458L180 465M312 494L215 528M738 420L830 395M718 458L820 465M688 494L785 528" fill="none" stroke-width="12"/>
  ${ojo(420, 350)}
  ${ojo(580, 350)}
  ${cachete(372, 436)}
  ${cachete(628, 436)}
  <ellipse cx="500" cy="440" rx="36" ry="28"/>
  <path d="M500 468V486M462 482Q481 508 500 486Q519 508 538 482" fill="none"/>
  <path d="M360 660L760 580L640 660z"/>
  <path d="M640 660L760 580V720L640 840z"/>
  <path d="M360 660H640V840H380Q360 840 360 820z"/>
  <circle cx="465" cy="737" r="34"/>
  <circle cx="568" cy="728" r="32"/>
  <circle cx="701" cy="700" r="32"/>
  <ellipse cx="375" cy="805" rx="42" ry="36"/>
  <ellipse cx="640" cy="808" rx="42" ry="36"/>
  <path d="M360 770V790M390 770V790M625 773V793M655 773V793" fill="none" stroke-width="10"/>
`);

  /* ---------- Erizo: púas grandes redondeadas, carita puntiaguda con nariz redonda, patitas y una manzana ---------- */
  add('erizo', 'Erizo', `
  <ellipse cx="300" cy="828" rx="64" ry="40"/>
  <ellipse cx="680" cy="828" rx="64" ry="40"/>
  <path d="M692 812L829 828Q884 834 854 788L779 672z"/>
  <path d="M721 753L856 721Q909 709 865 675L755 591z"/>
  <path d="M728 688L844 612Q890 582 837 565L705 524z"/>
  <path d="M713 624L795 513Q828 469 773 472L635 479z"/>
  <path d="M676 570L716 437Q732 385 681 406L554 459z"/>
  <path d="M623 531L616 393Q613 338 572 375L470 469z"/>
  <path d="M561 513L506 385Q484 335 459 384L396 507z"/>
  <path d="M495 517L400 416Q363 376 356 431L338 568z"/>
  <path d="M435 543L292 460Q244 432 259 485L305 645z"/>
  <path d="M327 810A240 240 0 1 1 753 810z"/>
  <path d="M600 230C635 202 690 210 702 260C715 315 680 370 638 380C620 384 610 378 600 374C590 378 580 384 562 380C520 370 485 315 498 260C510 210 565 202 600 230z"/>
  <path d="M600 230C598 205 602 180 615 162" fill="none"/>
  <path d="M613 166C638 118 712 108 745 140C713 180 648 190 613 166z"/>
  <path d="M530 272Q526 302 542 326" fill="none" stroke-width="12"/>
  <circle cx="464" cy="484" r="54"/>
  <path d="M170 675C225 610 290 495 400 490C495 486 555 560 555 650C555 750 480 810 390 810C310 810 250 775 200 738C168 715 158 690 170 675z"/>
  <circle cx="150" cy="695" r="32"/>
  ${ojo(345, 610)}
  ${cachete(390, 705)}
  <path d="M212 722Q240 746 270 726" fill="none"/>
`);

  /* ---------- Pecera: pecera redonda con agua, pececito, algas, piedritas y burbujas ---------- */
  add('pecera', 'Pecera', `
  <path d="M292 190A390 390 0 0 0 328 870H672A390 390 0 0 0 708 190z"/>
  <path d="M193 280Q270 254 347 280T500 280T653 280T807 280A390 390 0 0 1 672 870H328A390 390 0 0 1 193 280z"/>
  <path d="M370 837C371 830 375 811 373 797C371 783 365 765 357 751C349 737 336 726 325 715C314 704 301 694 292 686C283 677 276 669 271 663C266 656 265 654 265 647C264 640 266 633 267 622C268 612 274 593 269 584C264 574 246 564 237 565C228 566 220 581 216 589C211 596 213 601 212 611C210 621 205 634 206 647C207 661 211 679 218 692C225 706 237 719 248 731C258 742 272 753 280 762C289 772 296 780 300 787C304 794 304 796 304 802C304 808 300 819 300 823z"/>
  <path d="M664 860C669 856 684 846 694 839C703 831 713 823 721 815C729 806 735 796 740 787C744 778 746 768 748 761C750 754 750 749 751 744C752 739 753 736 755 732C758 728 761 723 767 718C772 712 784 709 789 700C793 691 800 672 795 665C790 658 771 655 760 656C749 658 740 669 731 677C723 684 714 692 708 700C702 709 698 719 695 726C692 734 691 742 689 747C687 752 686 755 683 759C681 762 679 765 674 769C669 773 662 778 655 783C647 789 631 798 626 800z"/>
  <path d="M205 775Q352 750 500 775T795 775A390 390 0 0 1 672 870H328A390 390 0 0 1 205 775z"/>
  <ellipse cx="360" cy="768" rx="56" ry="36"/>
  <ellipse cx="595" cy="786" rx="56" ry="36"/>
  <ellipse cx="478" cy="790" rx="80" ry="40"/>
  <path d="M575 525C615 485 665 440 708 440C732 440 738 464 726 488C715 510 710 525 726 562C738 586 732 610 708 610C665 610 615 565 575 525z"/>
  <path d="M405 430C445 380 520 335 580 340C595 380 588 430 572 472z"/>
  <ellipse cx="460" cy="525" rx="135" ry="120"/>
  ${ojo(395, 495)}
  ${cachete(432, 582)}
  <path d="M348 546Q361 564 379 554" fill="none"/>
  <circle cx="280" cy="445" r="32"/>
  <circle cx="335" cy="352" r="34"/>
  <circle cx="722" cy="365" r="32"/>
  <path d="M790 330Q835 380 838 450" fill="none" stroke-width="12"/>
  <rect x="200" y="158" width="600" height="64" rx="30"/>
  <rect x="290" y="870" width="420" height="65" rx="26"/>
`);
})(window.CL);
