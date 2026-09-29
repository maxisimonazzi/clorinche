/* Colorines — js/drawings/naturaleza.js
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

  /* ======================= Dibujos nuevos: luna, nube, cactus, vaquita, abeja ======================= */

  // Ojo cerrado (dormido): arco hacia abajo, como un párpado relajado.
  const ojoCerrado = (x, y, w = 30, h = 22) =>
    `<path d="M${x - w} ${y}q${w} ${h} ${w * 2} 0" fill="none" stroke-width="14"/>`;

  // Media luna: el círculo (cx, cy, r1) menos otro de radio r2 corrido d hacia el ángulo ang (grados).
  // Las puntas se redondean con radio rp (círculo tangente a los dos bordes).
  function medialuna(cx, cy, r1, ang, d, r2, rp) {
    const ux = Math.cos(ang * RAD), uy = Math.sin(ang * RAD), vx = -uy, vy = ux;
    const c2x = cx + d * ux, c2y = cy + d * uy;
    const a = r1 - rp, b = r2 + rp;
    const x = (d * d + a * a - b * b) / (2 * d), h = Math.sqrt(a * a - x * x);
    const punta = (s) => {
      const fx = cx + x * ux + s * h * vx, fy = cy + x * uy + s * h * vy;
      return {
        o: [R(cx + (fx - cx) * r1 / a), R(cy + (fy - cy) * r1 / a)],
        i: [R(c2x + (fx - c2x) * r2 / b), R(c2y + (fy - c2y) * r2 / b)],
      };
    };
    const A = punta(1), B = punta(-1);
    const ang2 = (p, qx, qy) => Math.atan2(p[1] - qy, p[0] - qx);
    const giro = (t) => ((t % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const lg1 = giro(ang2(B.o, cx, cy) - ang2(A.o, cx, cy)) > Math.PI ? 1 : 0;
    const lg2 = giro(ang2(B.i, c2x, c2y) - ang2(A.i, c2x, c2y)) > Math.PI ? 1 : 0;
    return `<path d="M${A.o.join(' ')}A${r1} ${r1} 0 ${lg1} 1 ${B.o.join(' ')}A${rp} ${rp} 0 0 1 ${B.i.join(' ')}` +
      `A${r2} ${r2} 0 ${lg2} 0 ${A.i.join(' ')}A${rp} ${rp} 0 0 1 ${A.o.join(' ')}Z"/>`;
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

  /* ---------- Luna: media luna dormida con gorrito, estrellas grandes y nubecita ---------- */
  {
    // Gorrito de dormir armado "parado" con la vincha centrada en (0, 0); después se gira sobre la punta.
    // Cono panzón que sube y se dobla hacia la derecha; el pompón cuelga de la punta.
    const gorro =
      `<path d="M-92 -8C-100 -130 -40 -236 60 -250C160 -262 222 -186 214 -96C176 -138 128 -150 92 -126C94 -80 94 -40 92 -8Z"/>` +
      `<circle cx="212" cy="-84" r="46"/>` +
      `<rect x="-110" y="-36" width="220" height="72" rx="36"/>`;
    // Ojo dormido con dos pestañitas que cuelgan del párpado del lado de afuera (lado = -1 izq., 1 der.).
    const dormido = (x, y, lado, w = 36, h = 26) => {
      let d = '';
      for (const t of [0.15, 0.4]) {
        const tt = lado < 0 ? t : 1 - t;
        const px = x - w + 2 * w * tt, py = y + 2 * h * tt * (1 - tt);
        const tx = 2 * w, ty = 2 * h * (1 - 2 * tt), n = Math.hypot(tx, ty);
        d += `M${R(px)} ${R(py)}l${R(-ty / n * 18)} ${R(tx / n * 18)}`;
      }
      return ojoCerrado(x, y, w, h) + `<path d="${d}" fill="none" stroke-width="12"/>`;
    };
    add('luna', 'Luna', `
      ${estrella(872, 136, 62, 33)}${estrella(898, 500, 56, 30)}${estrella(112, 112, 58, 31)}
      ${estrella(862, 850, 60, 32)}
      ${medialuna(450, 500, 380, -40, 250, 300, 30)}
      ${estrella(700, 400, 96, 50)}
      ${dormido(242, 592, -1)}${dormido(370, 592, 1)}
      ${cachete(190, 656)}${cachete(422, 656)}
      ${sonrisa(306, 670, 30, 24)}
      <g transform="translate(300 242) rotate(40)">${gorro}</g>
      ${nube(440, 836, 320, 68, 8)}
    `);
  }

  // Forma orgánica suave y cerrada que pasa por los puntos dados (Catmull-Rom → curvas de Bézier).
  function blob(pts, extra = '') {
    const n = pts.length, P = (i) => pts[(i + n) % n];
    let d = `M${P(0).join(' ')}`;
    for (let i = 0; i < n; i++) {
      const [x0, y0] = P(i - 1), [x1, y1] = P(i), [x2, y2] = P(i + 1), [x3, y3] = P(i + 2);
      d += `C${R(x1 + (x2 - x0) / 6)} ${R(y1 + (y2 - y0) / 6)} ${R(x2 - (x3 - x1) / 6)} ${R(y2 - (y3 - y1) / 6)} ${x2} ${y2}`;
    }
    return `<path d="${d}Z"${extra}/>`;
  }

  // Rayo de sol como los del dibujo "sol" (triángulo gordito de punta redonda) alrededor de (cx, cy):
  // base a distancia `base` con media anchura wb, punta a distancia `tip` con radio rt.
  const rayoSol = (cx, cy, ang, base, wb, tip, rt) => {
    const a = ang * RAD, ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux;
    const p = (r, w) => `${R(cx + r * ux + w * vx)} ${R(cy + r * uy + w * vy)}`;
    const tc = tip - rt;
    const phi = Math.atan2(wb, base - tc), th = Math.acos(rt / Math.hypot(tc - base, wb));
    const tr = tc + rt * Math.cos(phi - th), tw = rt * Math.sin(phi - th);
    const grande = 2 * (phi - th) > Math.PI ? 1 : 0;
    const rc = Math.min(16, R(wb * 0.4)), Rb = wb * 3, rC = base + Math.sqrt(Rb * Rb - wb * wb);
    const L = Math.hypot(tr - base, tw - wb), sr = base + (tr - base) * rc / L, sw = wb + (tw - wb) * rc / L;
    const br = rC - Math.sqrt(Rb * Rb - (wb - rc) ** 2);
    return `<path d="M${p(sr, sw)}L${p(tr, tw)}A${rt} ${rt} 0 ${grande} 0 ${p(tr, -tw)}L${p(sr, -sw)}` +
      `Q${p(base, -wb)} ${p(br, rc - wb)}A${Rb} ${Rb} 0 0 0 ${p(br, wb - rc)}Q${p(base, wb)} ${p(sr, sw)}Z"/>`;
  };

  // Gota de lluvia: punta arriba y panza redonda; (x, y) = centro de la panza, r = su radio.
  const gota = (x, y, r = 42) =>
    `<path d="M${x} ${y - R(r * 2)}C${x + R(r * 0.3)} ${y - R(r * 1.4)} ${x + r} ${y - R(r * 0.7)} ${x + r} ${y}` +
    `A${r} ${r} 0 0 1 ${x - r} ${y}C${x - r} ${y - R(r * 0.7)} ${x - R(r * 0.3)} ${y - R(r * 1.4)} ${x} ${y - R(r * 2)}Z"/>`;

  /* ---------- Nube: nube grande con carita, gotas gordas, charquito y un sol que asoma ---------- */
  {
    // El sol queda atrás de la nube, arriba a la derecha: sólo asoman su borde y cinco rayos.
    const sx = 750, sy = 240;
    const rayos = [-115, -65, -20, 25, 70].map((a) => rayoSol(sx, sy, a, 130, 32, 206, 20)).join('');
    // Brillito de la gota: rayita curva flotando adentro, del lado izquierdo.
    const brillo = (x, y, r) =>
      `<path d="M${x - R(r * 0.5)} ${y - R(r * 0.15)}q${-R(r * 0.05)} ${R(r * 0.4)} ${R(r * 0.3)} ${R(r * 0.55)}" fill="none" stroke-width="10"/>`;
    const gotas = [[270, 630, 46], [490, 630, 46], [710, 630, 46], [380, 730, 42], [600, 730, 42]]
      .map(([x, y, r]) => gota(x, y, r) + brillo(x, y, r)).join('');
    add('nube', 'Nube', `
      ${rayos}<circle cx="${sx}" cy="${sy}" r="104"/>
      ${nube(430, 300, 320, 168, 12)}
      ${carita(430, 296, { s: 1.15 })}
      ${gotas}
      ${blob([[214, 882], [236, 846], [300, 828], [370, 832], [440, 810], [520, 806], [600, 814], [670, 804],
        [750, 820], [820, 850], [840, 888], [800, 926], [710, 938], [620, 948], [520, 942], [420, 950], [320, 944],
        [248, 926]])}
      <ellipse cx="530" cy="877" rx="150" ry="28"/>
    `);
  }

  // Flor de pétalos redondos sueltos (cada pétalo es una zona) con el centro encima.
  // (x, y) = centro, n pétalos de radio rp a distancia d, centro de radio rc, fase en grados.
  const florcita = (x, y, n = 5, d = 54, rp = 42, rc = 36, fase = -90) => {
    let s = '';
    for (let k = 0; k < n; k++) {
      const a = (fase + (k * 360) / n) * RAD;
      s += `<circle cx="${R(x + d * Math.cos(a))}" cy="${R(y + d * Math.sin(a))}" r="${rp}"/>`;
    }
    return s + `<circle cx="${x}" cy="${y}" r="${rc}"/>`;
  };

  /* ---------- Cactus: cuerpo con carita, dos brazos, flor arriba, pinchitos sueltos y maceta ---------- */
  {
    // Pinchito: una "v" chiquita que flota adentro de la zona (no corta nada).
    const pinchos = (pts) => `<path d="${pts.map(([x, y]) => `M${x - 12} ${y - 13}L${x} ${y}L${x + 12} ${y - 13}`).join('')}" fill="none" stroke-width="10"/>`;
    add('cactus', 'Cactus', `
      <path d="M400 656H218Q140 656 140 580V400A58 58 0 0 1 256 400V508Q256 540 288 540H400Z"/>
      <path d="M600 556H782Q860 556 860 480V320A58 58 0 0 0 744 320V408Q744 440 712 440H600Z"/>
      <path d="M314 790C298 600 292 420 316 320C342 220 416 180 500 180C584 180 658 220 684 320C708 420 702 600 686 790Z"/>
      ${carita(500, 420, { s: 1, ojos: 62, mej: 112, baja: 62, boca: 60 })}
      ${pinchos([[392, 316], [612, 318], [392, 592], [608, 600], [500, 690], [198, 468], [206, 604], [802, 378], [800, 500]])}
      ${florcita(530, 172, 5, 72, 42, 48)}
      <rect x="280" y="752" width="440" height="68" rx="32"/>
      <path d="M306 820H694L654 930Q646 952 622 952H378Q354 952 346 930Z"/>
      <path d="M328 880Q371 854 414 880T500 880T586 880T672 880" fill="none" stroke-width="12"/>
    `);
  }

  // Hoja grande con punta: eje desde la base (ax, ay) hasta la punta (bx, by); w da el ancho (la media
  // anchura máxima es ~0,84·w). P(s, t) = punto a la fracción s del eje y a distancia t del eje (t > 0 a la
  // izquierda del eje mirando hacia la punta); media(s) = media anchura de la hoja a la fracción s.
  function hoja(ax, ay, bx, by, w) {
    const L = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / L, uy = (by - ay) / L, vx = uy, vy = -ux;
    const P = (s, t) => `${R(ax + s * L * ux + t * vx)} ${R(ay + s * L * uy + t * vy)}`;
    const k = [0.2, 1.2, 0.8, 1.1];
    const contorno = `<path d="M${P(0, 0)}C${P(k[0], k[1] * w)} ${P(k[2], k[3] * w)} ${P(1, 0)}` +
      `C${P(k[2], -k[3] * w)} ${P(k[0], -k[1] * w)} ${P(0, 0)}Z"/>`;
    const media = (s) => {
      let best = 0, dmin = 1;
      for (let i = 0; i <= 400; i++) {
        const t = i / 400, q = 1 - t;
        const x = 3 * q * q * t * k[0] + 3 * q * t * t * k[2] + t * t * t, y = 3 * q * q * t * k[1] + 3 * q * t * t * k[3];
        if (Math.abs(x - s) < dmin) { dmin = Math.abs(x - s); best = y * w; }
      }
      return best;
    };
    return { contorno, P, media };
  }

  /* ---------- Vaquita de San Antonio: caparazón con raya y lunares, cabeza con carita, sobre una hoja ---------- */
  {
    // Hoja grande acostada (cabito a la izquierda, punta a la derecha, apenas en subida); la vaquita va
    // un poco a la izquierda para que se vea bien la punta de la hoja con sus nervaduras.
    const cx = 440, cy = 650, rx = 214, ry = 192, hy = 408;
    const h = hoja(96, 700, 948, 600, 300);
    const lado = (x0, y0, qx, qy, x1, y1) => `M${x0} ${y0}Q${qx} ${qy} ${x1} ${y1}M${2 * cx - x0} ${y0}Q${2 * cx - qx} ${qy} ${2 * cx - x1} ${y1}`;
    // Nervaduras: pares que salen de la vena del medio y se curvan hacia la punta, sin llegar al borde.
    const nerv = (s0, s1, f) => [1, -1].map((l) =>
      `M${h.P(s0, 0)}Q${h.P(s0 + (s1 - s0) * 0.25, l * h.media(s1) * f * 0.6)} ${h.P(s1, l * h.media(s1) * f)}`).join('');
    const venas = `M${h.P(0.62, 0)}L${h.P(0.96, 0)}${nerv(0.72, 0.79, 0.62)}${nerv(0.8, 0.87, 0.6)}${nerv(0.88, 0.935, 0.55)}`;
    // Lunares del ala izquierda (el derecho es el espejo).
    const lunares = [[352, 650, 44], [370, 764, 34]]
      .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/><circle cx="${2 * cx - x}" cy="${y}" r="${r}"/>`).join('');
    // Patitas: rayitas apenas curvas que asoman de abajo del caparazón, tres de cada lado.
    const patas = lado(258, 584, 232, 570, 206, 584) + lado(244, 664, 212, 656, 180, 668) + lado(262, 748, 234, 772, 204, 768);
    add('vaquita-de-san-antonio', 'Vaquita de San Antonio', `<g transform="translate(0 -36)">
      <path d="M96 700C70 700 52 724 60 750C68 772 96 770 100 750" fill="none"/>
      ${h.contorno}
      <path d="${venas}" fill="none" stroke-width="12"/>
      <path d="${patas}" fill="none"/>
      <path d="${lado(cx - 36, hy - 120, cx - 48, hy - 170, cx - 84, hy - 206)}" fill="none" stroke-width="14"/>
      <circle cx="${cx - 94}" cy="${hy - 216}" r="32"/><circle cx="${cx + 94}" cy="${hy - 216}" r="32"/>
      <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>
      <path d="M${cx} ${hy + 110}V${cy + ry}" fill="none"/>
      ${lunares}
      <ellipse cx="${cx}" cy="${hy}" rx="178" ry="146"/>
      ${carita(cx, hy - 8, { s: 0.9, ojos: 62, mej: 116, baja: 62 })}
    </g>`);
  }

  /* ---------- Abeja: cuerpo con rayas, alas grandes, antenas, aguijón y carita, sobre una flor ---------- */
  {
    const bx = 600, by = 430, brx = 250, bry = 170;
    // Rayas del cuerpo: curvas ")" que empiezan y terminan justo sobre el contorno de la panza.
    const raya = (x, panza = 22) => {
      const dy = R(bry * Math.sqrt(1 - ((x - bx) / brx) ** 2));
      return `M${x} ${by - dy}Q${x + panza} ${by} ${x} ${by + dy}`;
    };
    add('abeja', 'Abeja', `
      <path d="M222 800C218 860 226 910 222 954M770 820C766 870 774 914 770 954" fill="none"/>
      <path d="M222 934C176 934 130 910 112 866C160 858 206 884 222 934Z"/>
      <path d="M770 936C820 932 870 902 884 852C832 850 786 880 770 936Z"/>
      ${florcita(222, 764, 5, 66, 42, 46)}
      <path d="M770 836C720 836 694 790 700 718C730 734 752 760 770 790C788 760 810 734 840 718C846 790 820 836 770 836Z"/>
      <path d="M770 836C736 836 722 800 726 756C732 726 752 704 770 690C788 704 808 726 814 756C818 800 804 836 770 836Z"/>
      <g transform="translate(20 -24)">
        <path d="M560 300C520 240 470 150 510 100C550 50 640 90 650 170C656 220 640 270 620 300Z"/>
        <path d="M578 250C560 200 548 160 560 130" fill="none" stroke-width="12"/>
        <path d="M640 300C660 230 700 140 770 120C840 100 880 170 840 230C810 275 740 300 690 310Z"/>
        <path d="M700 262C720 220 750 184 790 166" fill="none" stroke-width="12"/>
        <path d="M840 400L926 438L842 476Z"/>
        <ellipse cx="${bx}" cy="${by}" rx="${brx}" ry="${bry}"/>
        <path d="${raya(580, 30)}${raya(672, 30)}${raya(764, 26)}" fill="none"/>
        <path d="M300 250C290 200 260 170 220 160M360 240C366 190 360 150 340 120" fill="none" stroke-width="14"/>
        <circle cx="210" cy="156" r="30"/><circle cx="336" cy="108" r="30"/>
        <circle cx="330" cy="390" r="165"/>
        ${carita(330, 386, { s: 0.85, ojos: 58, mej: 108, baja: 62, boca: 58 })}
      </g>
    `);
  }
})(window.CL);
