/* Colorinche — js/drawings/naturaleza.js
   Dibujos para colorear de la categoría "Naturaleza": sol, flor, árbol, mariposa, arcoíris y hongo.
   Lienzo 1000 × 1000, contorno 16 (ver dev/ARQUITECTURA.md, sección 5). El orden importa: lo que va
   adelante se dibuja después y su relleno blanco tapa las líneas de atrás. */
'use strict';
(function (CL) {
  const add = (id, nombre, svg) => CL.drawings.add('naturaleza', id, nombre, svg);
  const R = Math.round;
  const RAD = Math.PI / 180;

  /* ---------- Piezas compartidas (mismo estilo en toda la categoría) ---------- */

  // Ojo tierno: pupila negra con un brillito grande y uno chiquito (el chiquito nunca baja de r 4–5,
  // así se ve también en los ojos chicos).
  const ojo = (x, y, rx = 27, ry = 34) =>
    `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#000"/>` +
    `<circle cx="${x - R(rx * 0.3)}" cy="${y - R(ry * 0.35)}" r="${R(rx * 0.38)}" fill="#fff" stroke="none"/>` +
    `<circle cx="${x + R(rx * 0.35)}" cy="${y + R(ry * 0.4)}" r="${Math.max(R(rx * 0.17), Math.min(5, R(rx * 0.3)))}" fill="#fff" stroke="none"/>`;

  // Cachete para pintar de rosado.
  const cachete = (x, y, rx = 34, ry = 22) =>
    `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" stroke-width="12"/>`;

  // Sonrisa simple (línea flotando dentro de la cara).
  const sonrisa = (x, y, w = 40, h = 30) =>
    `<path d="M${x - w} ${y}q${w} ${h} ${w * 2} 0" fill="none" stroke-width="14"/>`;

  // Carita completa; (x, y) = altura de los ojos. o.s = escala, o.ojos = media distancia entre ojos,
  // o.mej = distancia de los cachetes al centro, o.baja = cuánto más abajo que los ojos van los cachetes,
  // o.boca = cuánto más abajo que los ojos va la sonrisa, o.sw = media anchura de la sonrisa y
  // o.sh = su profundidad (achicarla cuando la cara es chica, para que no toque los cachetes).
  // Los cachetes nunca bajan de 36 × 24 para que se puedan pintar.
  const carita = (x, y, o = {}) => {
    const s = o.s || 1, oj = R((o.ojos || 62) * s), mej = R((o.mej || 118) * s), baja = R((o.baja || 58) * s);
    const crx = Math.max(36, R(38 * s)), cry = Math.max(24, R(25 * s));
    return ojo(x - oj, y, R(26 * s), R(33 * s)) + ojo(x + oj, y, R(26 * s), R(33 * s)) +
      cachete(x - mej, y + baja, crx, cry) + cachete(x + mej, y + baja, crx, cry) +
      sonrisa(x, y + R((o.boca || 60) * s), R((o.sw || 30) * s), R((o.sh || 24) * s));
  };

  // Contorno festoneado (nube, copa del árbol, corona del sol): n arcos hacia afuera sobre una elipse.
  // Las "cúspides" (piquitos entre arcos) caen en los ángulos fase + i·360°/n.
  function feston(cx, cy, rx, ry, n, fase = 0, abulta = 0.62, extra = '') {
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
    return `<path d="${d}Z"${extra}/>`;
  }

  // Corazón centrado en (cx, cy) de "radio" s.
  const corazon = (cx, cy, s) =>
    `<path d="M${cx} ${R(cy + s * 0.95)}C${R(cx - s * 1.35)} ${R(cy + s * 0.05)} ${R(cx - s * 0.85)} ${R(cy - s)} ${cx} ${R(cy - s * 0.4)}` +
    `C${R(cx + s * 0.85)} ${R(cy - s)} ${R(cx + s * 1.35)} ${R(cy + s * 0.05)} ${cx} ${R(cy + s * 0.95)}Z"/>`;

  // Matita de pasto (tres hojitas) con base en (x, y).
  const mata = (x, y, s = 1) =>
    `M${x} ${y}l${R(-24 * s)} ${R(-44 * s)}M${x} ${y}v${R(-56 * s)}M${x} ${y}l${R(24 * s)} ${R(-44 * s)}`;

  // Pasto: loma ovalada con matitas en los costados (igual que en granja).
  const pasto = (cy = 895, rx = 420, ry = 52, xs = [110, 890]) => {
    const tufts = xs.map((x) => {
      const y = R(cy - ry * Math.sqrt(Math.max(0, 1 - ((x - 500) / rx) ** 2)));
      return mata(x, y + 4);
    }).join('');
    return `<ellipse cx="500" cy="${cy}" rx="${rx}" ry="${ry}"/>` +
      (tufts ? `<path d="${tufts}" fill="none" stroke-width="12"/>` : '');
  };

  // Estrellita de 5 puntas (las puntas se redondean con el stroke-linejoin).
  const estrella = (cx, cy, ro, ri) => {
    let d = '';
    for (let i = 0; i < 10; i++) {
      const a = (-90 + i * 36) * RAD, r = i % 2 ? ri : ro;
      d += (i ? 'L' : 'M') + R(cx + r * Math.cos(a)) + ' ' + R(cy + r * Math.sin(a));
    }
    return `<path d="${d}Z"/>`;
  };

  /* ---------- Sol: corona de 12 festones, 12 rayos gorditos sueltos alrededor y carita ---------- */
  {
    const cx = 500, cy = 500, n = 12;
    // Rayo: triángulo gordito y petiso, con la base un poco curva y la punta redonda (lados tangentes
    // al círculo de la punta). Los rayos flotan a ~30 u de la corona: no hay uniones que se empasten.
    const rayo = (ang, base, wb, tip, rt) => {
      const a = ang * RAD, ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux;
      const p = (r, w) => `${R(cx + r * ux + w * vx)} ${R(cy + r * uy + w * vy)}`;
      const tc = tip - rt;
      const phi = Math.atan2(wb, base - tc), th = Math.acos(rt / Math.hypot(tc - base, wb));
      const tr = tc + rt * Math.cos(phi - th), tw = rt * Math.sin(phi - th);
      const grande = 2 * (phi - th) > Math.PI ? 1 : 0;
      // Esquinas de la base redondeadas (radio rc): puntos a rc de cada esquina sobre el lado y sobre la base.
      const rc = 16, Rb = wb * 3, rC = base + Math.sqrt(Rb * Rb - wb * wb);
      const L = Math.hypot(tr - base, tw - wb), sr = base + (tr - base) * rc / L, sw = wb + (tw - wb) * rc / L;
      const br = rC - Math.sqrt(Rb * Rb - (wb - rc) ** 2);
      return `<path d="M${p(sr, sw)}L${p(tr, tw)}A${rt} ${rt} 0 ${grande} 0 ${p(tr, -tw)}L${p(sr, -sw)}` +
        `Q${p(base, -wb)} ${p(br, rc - wb)}A${Rb} ${Rb} 0 0 0 ${p(br, wb - rc)}Q${p(base, wb)} ${p(sr, sw)}Z"/>`;
    };
    let rayos = '';
    // Todos iguales, apuntando al centro de cada festón (las cúspides caen entre rayo y rayo).
    for (let k = 0; k < n; k++) rayos += rayo(-90 + k * 30, 334, 56, 452, 30);
    add('sol', 'Sol', `
      ${rayos}
      ${feston(cx, cy, 262, 262, n, (-90 - 180 / n) * RAD, 0.62)}
      <circle cx="${cx}" cy="${cy}" r="212"/>
      ${ojo(425, 468, 30, 40)}${ojo(575, 468, 30, 40)}
      ${cachete(355, 548, 40, 26)}${cachete(645, 548, 40, 26)}
      <path d="M430 560C440 640 560 640 570 560Z"/>
    `);
  }

  /* ---------- Flor: pétalos grandes en dos capas, carita en el centro, hojas y maceta ---------- */
  {
    const cx = 500, cy = 314;
    const petalo = (ang, d, rx, ry) =>
      `<ellipse cx="${cx}" cy="${cy - d}" rx="${rx}" ry="${ry}" transform="rotate(${ang} ${cx} ${cy})"/>`;
    let atras = '', adelante = '';
    for (let k = 0; k < 4; k++) atras += petalo(45 + k * 90, 165, 80, 100);
    for (let k = 0; k < 4; k++) adelante += petalo(k * 90, 158, 84, 104);
    // Hojas con la vena flotando en el medio (lejos del tallo y de los bordes, ≥ 30 u de aire).
    add('flor', 'Flor', `
      <path d="M490 690C440 600 320 580 225 610C280 710 410 735 490 690Z"/>
      <path d="M440 674C390 652 330 640 272 634" fill="none" stroke-width="12"/>
      <path d="M510 650C560 560 680 540 775 570C720 670 590 695 510 650Z"/>
      <path d="M565 642C615 626 660 612 700 600" fill="none" stroke-width="12"/>
      <path d="M459 420C451 540 475 650 459 766H541C557 650 533 540 541 420Z"/>
      ${atras}${adelante}
      <circle cx="${cx}" cy="${cy}" r="150"/>
      ${carita(cx, cy - 12, { s: 0.85, ojos: 54, mej: 104, baja: 70, boca: 58, sw: 34, sh: 34 })}
      <path d="M325 822H675L640 931Q634 951 612 951H388Q366 951 360 931Z"/>
      <rect x="290" y="746" width="420" height="76" rx="28"/>
      ${corazon(500, 877, 52)}
    `);
  }

  /* ---------- Árbol: copa de nube con carita, manzanas, tronco con hueco, pasto y pajarito ---------- */
  {
    // Manzana con cabito; (x, y) = centro, k = escala.
    const manzana = (x, y, k = 1) => {
      const q = (v) => R(v * k);
      return `<path d="M${x} ${y - q(24)}C${x + q(28)} ${y - q(50)} ${x + q(62)} ${y - q(30)} ${x + q(60)} ${y + q(6)}` +
        `C${x + q(58)} ${y + q(40)} ${x + q(32)} ${y + q(56)} ${x} ${y + q(56)}` +
        `C${x - q(32)} ${y + q(56)} ${x - q(58)} ${y + q(40)} ${x - q(60)} ${y + q(6)}` +
        `C${x - q(62)} ${y - q(30)} ${x - q(28)} ${y - q(50)} ${x} ${y - q(24)}Z"/>` +
        `<path d="M${x} ${y - q(16)}q2 ${-q(26)} ${q(12)} ${-q(44)}" fill="none" stroke-width="12"/>`;
    };
    // Pajarito mirando al árbol (hacia la izquierda); (x, y) = centro del cuerpo, k = escala.
    // Las medidas están pensadas a escala 1 (cuerpo 100 × 86) y se multiplican por k; el ojo no se achica.
    // Atrás van las patitas, la cola en abanico y el pico; adelante el cuerpo, el ala y el ojo.
    const pajarito = (x, y, k, patas) => {
      const P = (dx, dy) => `${R(x + dx * k)} ${R(y + dy * k)}`;
      // Cola: abanico de 3 plumas redondeadas que sale hacia atrás (derecha) y un poco hacia arriba.
      const ox = 58, oy = -6, L = 112, angs = [-66, -41, -16, 9];
      const q = angs.map((a) => [ox + L * Math.cos(a * RAD), oy + L * Math.sin(a * RAD)]);
      const rr = R(2 * L * Math.sin(12.5 * RAD) * 0.6 * k);
      let cola = `M${P(40, -60)}L${P(q[0][0], q[0][1])}`;
      for (let i = 1; i < q.length; i++) cola += `A${rr} ${rr} 0 0 1 ${P(q[i][0], q[i][1])}`;
      cola += `L${P(70, 40)}Z`;
      // Rayitas entre plumas: salen de las cúspides y quedan flotando dentro de la cola.
      let plumas = '';
      for (const i of [1, 2]) {
        const [px, py] = q[i], ux = (px - ox) / L, uy = (py - oy) / L;
        plumas += `M${P(px, py)}L${P(px - ux * 30, py - uy * 30)}`;
      }
      // Patitas: de adentro del cuerpo hasta el pasto (y = patas), con tres deditos.
      const pie = (dx) => {
        const xx = R(x + dx * k);
        return `M${xx} ${R(y + 60 * k)}V${patas}m-20 8l20-8 20 8m-20-8v12`;
      };
      return `<path d="${pie(-30)}${pie(30)}" fill="none" stroke-width="12"/>` +
        `<path d="${cola}"/>` +
        `<path d="${plumas}" fill="none" stroke-width="12"/>` +
        // Pico chiquito de punta redonda, a media altura de la cara (redondeado para que se pueda pintar).
        `<path d="M${P(-80, -38)}C${P(-114, -34)} ${P(-142, -16)} ${P(-142, -4)}C${P(-142, 8)} ${P(-114, 24)} ${P(-82, 26)}Z"/>` +
        `<ellipse cx="${x}" cy="${y}" rx="${R(100 * k)}" ry="${R(86 * k)}"/>` +
        // Ala: gota acostada sobre el costado, redonda adelante y con la punta hacia la cola (atrás y abajo).
        `<path d="M${P(64, 38)}C${P(48, 58)} ${P(6, 62)} ${P(-16, 50)}C${P(-34, 40)} ${P(-30, 6)} ${P(-4, 2)}C${P(22, -2)} ${P(50, 16)} ${P(64, 38)}Z"/>` +
        `<path d="M${P(-30, -82)}c-6-24 4-44 22-52M${P(-30, -82)}c10-18 28-26 46-22" fill="none" stroke-width="12"/>` +
        ojo(R(x - 46 * k), R(y - 30 * k), 17, 21);
    };
    // El árbol va 40 u a la izquierda para dejarle lugar al pajarito.
    add('arbol', 'Árbol', `<g transform="translate(-40 0)">
      <path d="M410 560C422 670 415 750 385 810C368 845 330 858 296 884H704C670 858 632 845 615 810C585 750 578 670 590 560Z"/>
      <ellipse cx="500" cy="720" rx="46" ry="60"/>
      ${feston(500, 330, 350, 245, 13, -Math.PI / 2, 0.64)}
      ${carita(500, 344)}
      ${manzana(270, 300)}${manzana(730, 300)}${manzana(392, 172)}${manzana(608, 172)}
      ${manzana(342, 490, 0.8)}${manzana(658, 490, 0.8)}</g>
      ${pasto(896, 432, 56, [125, 205])}
      ${pajarito(752, 800, 1, 910)}
    `);
  }

  /* ---------- Mariposa: alas grandes con dibujos simétricos, cuerpito con carita y antenas ---------- */
  {
    // Ala de abajo: su borde de arriba sale del cuerpo más abajo que el ala de arriba, así las dos
    // se juntan en una V clara (sin correr pegadas).
    const alas =
      `<path d="M492 570C430 580 300 585 200 640C120 690 140 810 230 856C320 902 430 822 470 722C486 682 494 630 492 570Z"/>` +
      `<circle cx="292" cy="740" r="64"/>` +
      `<path d="M492 470C430 300 320 130 190 120C70 112 30 250 70 360C110 470 300 560 492 540Z"/>` +
      corazon(212, 290, 88) +
      `<circle cx="318" cy="440" r="40"/>`;
    // Rayitas del cuerpo: terminan justo sobre el contorno (rx 60, ry 210, centro 500/580).
    const raya = (y, h) => {
      const w = R(60 * Math.sqrt(1 - ((y - 580) / 210) ** 2));
      return `M${500 - w} ${y}Q500 ${y + h} ${500 + w} ${y}`;
    };
    // Todo baja 32 u para quedar centrado en vertical.
    add('mariposa', 'Mariposa', `<g transform="translate(0 32)">
      ${alas}
      <g transform="translate(1000 0) scale(-1 1)">${alas}</g>
      <ellipse cx="500" cy="580" rx="60" ry="210"/>
      <path d="${raya(530, 30)}${raya(626, 30)}${raya(714, 26)}" fill="none"/>
      <path d="M470 200C455 140 430 110 395 100M530 200C545 140 570 110 605 100" fill="none"/>
      <circle cx="390" cy="92" r="32"/><circle cx="610" cy="92" r="32"/>
      <circle cx="500" cy="298" r="144"/>
      ${carita(500, 270, { s: 0.8, ojos: 50, mej: 98, baja: 76, boca: 64, sw: 24 })}
    </g>`);
  }

  /* ---------- Arcoíris: 6 bandas en media luna, dos nubes con carita en las puntas y estrellas ---------- */
  {
    // Arcos concéntricos proporcionales (alto = ancho × 1,05): el hueco del medio queda redondo.
    // La huella de cada punta (x 76–388 y su espejo) es más angosta que la nube, así los bordes del
    // arco entran a la nube por un festón de arriba; la fase de la nube deja cada línea de banda
    // a ≥ 20 u de un piquito (fase buscada con dev/naturaleza/nube.mjs; la derecha es el espejo).
    const cx = 500, cy = 736, n = 6, paso = 52, rin = 112, k = 1.05;
    const rx0 = rin + n * paso;
    let bandas = '';
    for (let i = 0; i < n; i++) {
      const ax = rx0 - i * paso, bx = ax - paso, ay = R(ax * k), by = R(bx * k);
      bandas += `<path d="M${cx - ax} ${cy}A${ax} ${ay} 0 0 1 ${cx + ax} ${cy}H${cx + bx}A${bx} ${by} 0 0 0 ${cx - bx} ${cy}Z"/>`;
    }
    const xc = R(cx - (rx0 + rin) / 2); // centro de la huella izquierda
    const nube = (x, fase) => feston(x, cy, 172, 104, 9, fase * RAD, 0.62) +
      carita(x, cy - 24, { s: 0.8, ojos: 60, mej: 112, baja: 74, boca: 62, sw: 24 });
    add('arcoiris', 'Arcoíris', `
      ${bandas}
      ${nube(xc, 26)}${nube(1000 - xc, 34)}
      ${estrella(162, 196, 102, 54)}${estrella(838, 196, 102, 54)}
    `);
  }

  /* ---------- Hongo: sombrero con lunares grandes, tronquito con carita, hongo bebé y pastito ---------- */
  {
    // Loma de pasto: arriba una curva suave y los extremos redondeados; es más alta que un óvalo
    // cerca de las puntas, así el hongo bebé queda bien parado adentro y lejos de la punta.
    const lomaD = [[52, 896], [52, 836], [300, 818], [500, 818], [700, 818], [948, 836], [948, 896],
      [948, 948], [700, 950], [500, 950], [300, 950], [52, 948], [52, 896]];
    // Altura del borde de arriba de la loma en x (para plantar las matitas justo encima).
    const lomaY = (x) => {
      const [p0, p1, p2, p3] = x < 500 ? lomaD.slice(0, 4) : lomaD.slice(3, 7);
      let best = p0[1], dmin = 1e9;
      for (let i = 0; i <= 200; i++) {
        const s = i / 200, u = 1 - s;
        const bx = u * u * u * p0[0] + 3 * u * u * s * p1[0] + 3 * u * s * s * p2[0] + s * s * s * p3[0];
        const by = u * u * u * p0[1] + 3 * u * u * s * p1[1] + 3 * u * s * s * p2[1] + s * s * s * p3[1];
        if (Math.abs(bx - x) < dmin) { dmin = Math.abs(bx - x); best = by; }
      }
      return R(best);
    };
    const loma = `<path d="M${lomaD[0].join(' ')}C${lomaD.slice(1, 4).flat().join(' ')}C${lomaD.slice(4, 7).flat().join(' ')}` +
      `C${lomaD.slice(7, 10).flat().join(' ')}C${lomaD.slice(10, 13).flat().join(' ')}Z"/>` +
      `<path d="${mata(140, lomaY(140) + 4)}${mata(245, lomaY(245) + 4)}" fill="none" stroke-width="12"/>`;
    // Hongo bebé: sombrerito con lunar y tronquito con carita chiquita pegada al sombrero, con una
    // franja libre abajo para pintar. Queda a ~25 u del tronco grande y bien adentro de la loma.
    const bx = 832;
    const bebe =
      `<path d="M${bx - 54} 744C${bx - 62} 792 ${bx - 64} 846 ${bx - 58} 892H${bx + 58}C${bx + 64} 846 ${bx + 62} 792 ${bx + 54} 744Z"/>` +
      `<path d="M${bx - 118} 748C${bx - 118} 668 ${bx - 56} 620 ${bx} 620C${bx + 56} 620 ${bx + 118} 668 ${bx + 118} 748` +
      `C${bx + 118} 764 ${bx - 118} 764 ${bx - 118} 748Z"/>` +
      `<circle cx="${bx}" cy="682" r="34"/>` +
      ojo(bx - 22, 792, 10, 13) + ojo(bx + 22, 792, 10, 13) +
      `<path d="M${bx - 12} 818q12 10 24 0" fill="none" stroke-width="10"/>`;
    // El sombrero grande (con el cuello y los lunares) va 24 u más arriba que antes para dejarle
    // lugar al sombrerito del bebé.
    add('hongo', 'Hongo', `
      <path d="M362 566C318 680 312 800 350 880H650C688 800 682 680 638 566Z"/>
      ${carita(500, 700, { s: 0.9, ojos: 62, mej: 112, baja: 70, boca: 60 })}
      <g transform="translate(0 -24)">
        <ellipse cx="500" cy="580" rx="310" ry="58"/>
        <path d="M80 550C60 300 270 80 500 80C730 80 940 300 920 550C924 592 880 612 840 598C620 530 380 530 160 598C120 612 76 592 80 550Z"/>
        <circle cx="500" cy="200" r="70"/>
        <circle cx="288" cy="290" r="60"/><circle cx="712" cy="290" r="60"/>
        <circle cx="400" cy="430" r="50"/><circle cx="600" cy="430" r="50"/>
        <circle cx="176" cy="450" r="44"/><circle cx="824" cy="450" r="44"/>
      </g>
      ${loma}
      ${bebe}
    `);
  }

  // Nube de festones parejos: como feston(), pero las n cúspides se reparten a igual distancia sobre
  // la elipse (por largo de arco), así los copos quedan del mismo tamaño aunque la nube sea alargada.
  // La cúspide k cae en el largo de arco (k + off)/n medido desde la punta derecha: con n múltiplo de 4
  // y off = 0,5 hay un copo centrado arriba, abajo y en cada punta.
  function nube(cx, cy, rx, ry, n, off = 0.5, abulta = 0.62) {
    const N = 1440, pts = [], acc = [0];
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * 2 * Math.PI;
      pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
      if (i) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    }
    const cus = [];
    for (let k = 0, j = 0; k < n; k++) {
      while (acc[j] < ((k + off) / n) * acc[N]) j++;
      cus.push(pts[j].map(R));
    }
    cus.push(cus[0]);
    let d = `M${cus[0].join(' ')}`;
    for (let k = 1; k <= n; k++) {
      const r = R(Math.hypot(cus[k][0] - cus[k - 1][0], cus[k][1] - cus[k - 1][1]) * abulta);
      d += `A${r} ${r} 0 0 1 ${cus[k].join(' ')}`;
    }
    return `<path d="${d}Z"/>`;
  }
})(window.CL);
