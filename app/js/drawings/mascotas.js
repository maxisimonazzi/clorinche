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
})(window.CL);
