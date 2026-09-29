/* Colorines — sellos de la pizarra (CL.stamps).
   Dibujos vectoriales tiernos en una caja de 100×100 centrada en (0, 0), con contorno oscuro.
   Se pintan en el color elegido (partes secundarias en tonos derivados) o, con 'multi', en sus colores propios.

   CL.stamps.list                       -> [{ id, name }]
   CL.stamps.draw(ctx, id, x, y, size, rot, color, opts)   (size = lado de la caja en las unidades del ctx;
                                        opts.halo = borde claro alrededor, para fondos oscuros)
   CL.stamps.thumb(id, cssPx, color)    -> <canvas> nítido para usar como miniatura */
'use strict';
(function (CL) {
  const U = CL.util;
  const INK = '#2b2240';
  const TAU = Math.PI * 2;
  const LW = 4.6; // grosor del contorno (unidades de la caja de 100)

  /* ---------- Ayudas ---------- */
  /** Contorno. Con `p` es una línea de detalle (boca, bigotes) que sobre relleno oscuro va en blanco. */
  function ol(c, w, p) {
    c.lineWidth = w || LW;
    c.strokeStyle = p && p.inv ? '#fff' : INK;
    c.lineJoin = 'round';
    c.lineCap = 'round';
    c.stroke();
  }
  function fillOl(c, fill, w) { c.fillStyle = fill; c.fill(); ol(c, w); }
  function ellipse(c, x, y, rx, ry, rot = 0) { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); }
  function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, TAU); }
  /** Ojo. Sobre un relleno muy oscuro (p.inv) lleva un blanco alrededor para que la carita se vea. */
  function eye(c, x, y, r, p) {
    if (p && p.inv) { circle(c, x, y, r * 1.5); c.fillStyle = '#fff'; c.fill(); }
    circle(c, x, y, r); c.fillStyle = INK; c.fill();
    circle(c, x - r * 0.32, y - r * 0.34, r * 0.4); c.fillStyle = '#fff'; c.fill();
  }
  function cheek(c, x, y, r) { ellipse(c, x, y, r, r * 0.66); c.fillStyle = 'rgba(255,105,140,0.55)'; c.fill(); }
  function smile(c, x, y, w, lw, p) {
    c.beginPath(); c.arc(x, y - w * 0.35, w * 0.7, 0.22 * Math.PI, 0.78 * Math.PI);
    ol(c, lw || 3.4, p);
  }
  function glint(c, x, y, rx, ry, rot) { ellipse(c, x, y, rx, ry, rot); c.fillStyle = 'rgba(255,255,255,0.75)'; c.fill(); }

  /** Paleta de un sello: main (color elegido o propio) + derivados. */
  function pal(main) {
    const lum0 = (() => { const [r, g, b] = U.hexToRgb(main); return 0.299 * r + 0.587 * g + 0.114 * b; })();
    // Negro (o casi): se aclara un poco el relleno y la carita va en blanco (si no, queda una mancha sin cara).
    const inv = lum0 < 70;
    if (inv) main = U.mix(main, '#6a5f80', 0.35);
    const light = U.mix(main, '#ffffff', inv ? 0.42 : 0.5);
    const dark = inv ? U.mix(main, '#ffffff', 0.22) : U.mix(main, INK, 0.3);
    return { main, light: lum0 > 235 ? '#ffe3ec' : light, dark: lum0 > 235 ? '#d9d2e6' : dark, lum: lum0, inv, ink: inv ? '#fff' : INK };
  }

  /* ---------- Sellos ---------- */
  const defs = [];
  function add(id, name, natural, draw) { defs.push({ id, name, natural, draw }); }

  add('estrella', 'Estrella', '#ffd21f', (c, p) => {
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 23 : 48;
      const a = (i * Math.PI) / 5 - Math.PI / 2;
      c.lineTo(Math.cos(a) * r, Math.sin(a) * r + 4);
    }
    c.closePath();
    fillOl(c, p.main, 5.5);
    glint(c, -14, -14, 7, 3.5, -0.7);
    eye(c, -9, 6, 4.3, p); eye(c, 9, 6, 4.3, p);
    cheek(c, -16, 14, 4.5); cheek(c, 16, 14, 4.5);
    smile(c, 0, 16, 6, undefined, p);
  });

  add('corazon', 'Corazón', '#ff4f7b', (c, p) => {
    c.beginPath();
    c.moveTo(0, 42);
    c.bezierCurveTo(-38, 18, -50, -6, -38, -26);
    c.bezierCurveTo(-26, -44, -6, -40, 0, -24);
    c.bezierCurveTo(6, -40, 26, -44, 38, -26);
    c.bezierCurveTo(50, -6, 38, 18, 0, 42);
    c.closePath();
    fillOl(c, p.main, 5.5);
    glint(c, -26, -20, 8, 4.5, -0.8);
    eye(c, -12, -2, 4.5, p); eye(c, 12, -2, 4.5, p);
    cheek(c, -21, 8, 5); cheek(c, 21, 8, 5);
    smile(c, 0, 9, 6.5, undefined, p);
  });

  add('flor', 'Flor', '#ff78c4', (c, p) => {
    for (let i = 0; i < 6; i++) {
      const a = (i * TAU) / 6 - Math.PI / 2;
      ellipse(c, Math.cos(a) * 29, Math.sin(a) * 29, 19, 15, a);
      fillOl(c, i % 2 ? p.main : p.light);
    }
    const mid = p.main.toLowerCase() === '#ffd21f' || p.main.toLowerCase() === '#ffd60a' ? '#ff8a1f' : '#ffd21f';
    circle(c, 0, 0, 21); fillOl(c, mid);
    eye(c, -7, -3, 3.6); eye(c, 7, -3, 3.6);
    cheek(c, -12, 5, 3.5); cheek(c, 12, 5, 3.5);
    smile(c, 0, 6, 5, 3);
  });

  add('mariposa', 'Mariposa', '#8b4dff', (c, p) => {
    for (const s of [-1, 1]) {
      // ala de arriba
      c.beginPath();
      c.moveTo(s * 4, -4);
      c.bezierCurveTo(s * 18, -44, s * 52, -44, s * 46, -14);
      c.bezierCurveTo(s * 42, 2, s * 20, 4, s * 4, -2);
      c.closePath();
      fillOl(c, p.main);
      circle(c, s * 30, -22, 8); fillOl(c, p.light, 3.4);
      // ala de abajo
      c.beginPath();
      c.moveTo(s * 4, 2);
      c.bezierCurveTo(s * 26, 2, s * 42, 16, s * 34, 32);
      c.bezierCurveTo(s * 26, 44, s * 8, 34, s * 4, 8);
      c.closePath();
      fillOl(c, p.light);
      circle(c, s * 24, 22, 5); c.fillStyle = p.main; c.fill();
    }
    // antenitas
    c.beginPath(); c.moveTo(-3, -24); c.quadraticCurveTo(-8, -40, -16, -42); ol(c, 3.4);
    c.beginPath(); c.moveTo(3, -24); c.quadraticCurveTo(8, -40, 16, -42); ol(c, 3.4);
    circle(c, -16, -42, 3.5); c.fillStyle = INK; c.fill();
    circle(c, 16, -42, 3.5); c.fill();
    // cuerpo
    ellipse(c, 0, 6, 7, 30); fillOl(c, '#5b4a86');
    circle(c, 0, -22, 10); fillOl(c, '#5b4a86');
    circle(c, -3.5, -23, 2.4); c.fillStyle = '#fff'; c.fill();
    circle(c, 3.5, -23, 2.4); c.fill();
  });

  add('gato', 'Gato', '#ff9f1c', (c, p) => {
    for (const s of [-1, 1]) {
      c.beginPath();
      c.moveTo(s * 36, -8); c.lineTo(s * 34, -46); c.lineTo(s * 8, -28); c.closePath();
      fillOl(c, p.main);
      c.beginPath();
      c.moveTo(s * 30, -16); c.lineTo(s * 30, -36); c.lineTo(s * 16, -26); c.closePath();
      c.fillStyle = '#ffb3c7'; c.fill();
    }
    ellipse(c, 0, 6, 42, 36); fillOl(c, p.main);
    // rayitas en la frente
    c.beginPath(); c.moveTo(0, -30); c.lineTo(0, -20); c.moveTo(-9, -28); c.lineTo(-7, -20); c.moveTo(9, -28); c.lineTo(7, -20);
    c.strokeStyle = p.dark; c.lineWidth = 4; c.lineCap = 'round'; c.stroke();
    ellipse(c, 0, 18, 16, 11); c.fillStyle = p.light; c.fill();
    eye(c, -15, 2, 5.5, p); eye(c, 15, 2, 5.5, p);
    cheek(c, -26, 14, 5.5); cheek(c, 26, 14, 5.5);
    c.beginPath(); c.moveTo(-4, 12); c.lineTo(4, 12); c.lineTo(0, 16.5); c.closePath();
    c.fillStyle = '#ff7aa2'; c.fill(); ol(c, 2.6);
    c.beginPath(); c.moveTo(0, 16.5); c.quadraticCurveTo(-1, 22, -7, 22); c.moveTo(0, 16.5); c.quadraticCurveTo(1, 22, 7, 22);
    ol(c, 3);
    // bigotes
    c.beginPath();
    for (const s of [-1, 1]) {
      c.moveTo(s * 22, 16); c.lineTo(s * 44, 12);
      c.moveTo(s * 22, 21); c.lineTo(s * 44, 24);
    }
    ol(c, 2.4, p);
  });

  add('perro', 'Perro', '#c98a4b', (c, p) => {
    circle(c, 0, 4, 36); fillOl(c, p.main);
    // manchita en un ojo
    ellipse(c, 14, -4, 13, 11, 0.3); c.fillStyle = p.light; c.fill();
    // orejas caídas
    for (const s of [-1, 1]) {
      ellipse(c, s * 33, -6, 10.5, 22, s * 0.42); fillOl(c, p.dark);
    }
    ellipse(c, 0, 20, 19, 14); fillOl(c, p.light, 3.6);
    eye(c, -13, -6, 5.2, p); eye(c, 13, -6, 5.2, p);
    cheek(c, -24, 10, 5); cheek(c, 24, 10, 5);
    ellipse(c, 0, 13, 7.5, 5.5); c.fillStyle = INK; c.fill();
    circle(c, -2.5, 11.5, 1.8); c.fillStyle = '#fff'; c.fill();
    // lengüita
    c.beginPath(); c.moveTo(-6, 25); c.quadraticCurveTo(0, 39, 6, 25); c.closePath();
    c.fillStyle = '#ff7aa2'; c.fill(); ol(c, 3);
    c.beginPath(); c.moveTo(0, 18); c.lineTo(0, 24); c.moveTo(-9, 24); c.quadraticCurveTo(0, 28, 9, 24); ol(c, 3);
  });

  add('conejo', 'Conejo', '#efeaf7', (c, p) => {
    for (const s of [-1, 1]) {
      ellipse(c, s * 14, -26, 11, 26, s * 0.12); fillOl(c, p.main);
      ellipse(c, s * 14, -24, 5, 17, s * 0.12); c.fillStyle = '#ffb3c7'; c.fill();
    }
    ellipse(c, 0, 16, 36, 30); fillOl(c, p.main);
    eye(c, -13, 10, 5, p); eye(c, 13, 10, 5, p);
    cheek(c, -23, 22, 5.5); cheek(c, 23, 22, 5.5);
    ellipse(c, 0, 20, 4.5, 3.4); c.fillStyle = '#ff7aa2'; c.fill(); ol(c, 2.4);
    c.beginPath(); c.moveTo(0, 23); c.quadraticCurveTo(-1, 28, -6, 28); c.moveTo(0, 23); c.quadraticCurveTo(1, 28, 6, 28); ol(c, 2.8, p);
    c.beginPath(); c.rect(-4, 28.5, 8, 6); c.fillStyle = '#fff'; c.fill(); ol(c, 2.4);
  });

  add('oso', 'Oso', '#a8683a', (c, p) => {
    for (const s of [-1, 1]) {
      circle(c, s * 28, -26, 14); fillOl(c, p.main);
      circle(c, s * 28, -26, 7); c.fillStyle = p.light; c.fill();
    }
    circle(c, 0, 6, 38); fillOl(c, p.main);
    ellipse(c, 0, 18, 17, 13); fillOl(c, p.light, 3.6);
    eye(c, -14, -2, 5.2, p); eye(c, 14, -2, 5.2, p);
    cheek(c, -25, 12, 5.5); cheek(c, 25, 12, 5.5);
    ellipse(c, 0, 12, 7, 5); c.fillStyle = INK; c.fill();
    c.beginPath(); c.moveTo(0, 16); c.lineTo(0, 21); c.moveTo(-7, 21); c.quadraticCurveTo(0, 26, 7, 21); ol(c, 3);
  });

  add('pato', 'Pato', '#ffd21f', (c, p) => {
    // cuerpo
    c.beginPath();
    c.moveTo(-26, 8);
    c.bezierCurveTo(-34, 44, 30, 50, 44, 18);
    c.bezierCurveTo(48, 8, 40, 2, 36, 10);
    c.bezierCurveTo(28, 20, 14, 10, 4, 6);
    c.closePath();
    fillOl(c, p.main);
    // ala
    c.beginPath(); c.moveTo(-2, 20); c.quadraticCurveTo(14, 16, 22, 26); c.quadraticCurveTo(8, 36, -2, 20); c.closePath();
    fillOl(c, p.light, 3.6);
    // cabeza
    circle(c, -14, -16, 24); fillOl(c, p.main);
    // pico
    c.beginPath(); c.moveTo(-34, -14); c.quadraticCurveTo(-52, -14, -48, -6); c.quadraticCurveTo(-42, 0, -30, -4); c.closePath();
    fillOl(c, '#ff8a1f', 3.8);
    eye(c, -18, -22, 4.8, p);
    cheek(c, -6, -10, 5);
    glint(c, -6, -32, 5, 2.6, -0.4);
  });

  add('pez', 'Pez', '#3cc3ff', (c, p) => {
    // cola
    c.beginPath(); c.moveTo(22, 0); c.lineTo(48, -24); c.quadraticCurveTo(40, 0, 48, 24); c.closePath();
    fillOl(c, p.dark);
    // aleta de arriba
    c.beginPath(); c.moveTo(-14, -22); c.quadraticCurveTo(0, -42, 16, -20); c.closePath();
    fillOl(c, p.dark);
    ellipse(c, -6, 0, 36, 26); fillOl(c, p.main);
    // rayas
    c.beginPath(); c.moveTo(4, -24); c.quadraticCurveTo(12, 0, 4, 24); c.lineTo(14, 22); c.quadraticCurveTo(22, 0, 14, -22); c.closePath();
    c.fillStyle = p.light; c.fill(); ol(c, 3);
    eye(c, -22, -6, 6, p);
    cheek(c, -24, 8, 5);
    c.beginPath(); c.arc(-34, 6, 5, -0.2 * Math.PI, 0.5 * Math.PI); ol(c, 3, p);
    // burbujas
    circle(c, -40, -30, 5); c.fillStyle = 'rgba(255,255,255,0.7)'; c.fill(); ol(c, 2.4);
    circle(c, -30, -42, 3.3); c.fill(); ol(c, 2.2);
  });

  add('vaquita', 'Vaquita de San Antonio', '#ff3b30', (c, p) => {
    // antenas
    c.beginPath(); c.moveTo(-6, -32); c.quadraticCurveTo(-12, -46, -20, -46); c.moveTo(6, -32); c.quadraticCurveTo(12, -46, 20, -46);
    ol(c, 3.4);
    circle(c, -20, -46, 3.6); c.fillStyle = INK; c.fill();
    circle(c, 20, -46, 3.6); c.fill();
    // cabeza
    circle(c, 0, -26, 17); fillOl(c, '#3d335a');
    circle(c, -6, -28, 4.2); c.fillStyle = '#fff'; c.fill();
    circle(c, 6, -28, 4.2); c.fill();
    circle(c, -5.4, -27.4, 2.2); c.fillStyle = INK; c.fill();
    circle(c, 6.6, -27.4, 2.2); c.fill();
    // caparazón
    circle(c, 0, 10, 38); fillOl(c, p.main);
    c.beginPath(); c.moveTo(0, -28); c.lineTo(0, 48); ol(c, 4, p);
    c.fillStyle = p.ink;
    for (const [x, y, r] of [[-18, -6, 7], [18, -6, 7], [-22, 20, 6.5], [22, 20, 6.5], [-9, 36, 5], [9, 36, 5]]) {
      circle(c, x, y, r); c.fill();
    }
    glint(c, -22, -12, 6, 3, -0.7);
  });

  add('huella', 'Huellita', '#ffa24d', (c, p) => {
    c.beginPath();
    c.moveTo(0, -2);
    c.bezierCurveTo(22, -2, 32, 22, 26, 34);
    c.bezierCurveTo(20, 46, 6, 38, 0, 38);
    c.bezierCurveTo(-6, 38, -20, 46, -26, 34);
    c.bezierCurveTo(-32, 22, -22, -2, 0, -2);
    c.closePath();
    fillOl(c, p.main);
    for (const [x, y, rot] of [[-34, -8, -0.5], [-13, -30, -0.15], [13, -30, 0.15], [34, -8, 0.5]]) {
      ellipse(c, x, y, 10.5, 13.5, rot); fillOl(c, p.main);
    }
    glint(c, -10, 10, 6, 3, -0.5);
  });

  add('pollito', 'Pollito', '#ffe14d', (c, p) => {
    // patitas
    c.beginPath(); c.moveTo(-10, 38); c.lineTo(-10, 46); c.moveTo(10, 38); c.lineTo(10, 46); ol(c, 4.5);
    // cuerpo redondo
    circle(c, 0, 6, 38); fillOl(c, p.main);
    // copete
    c.beginPath(); c.moveTo(-4, -30); c.quadraticCurveTo(-8, -46, 2, -44); c.quadraticCurveTo(-2, -38, 4, -32); ol(c, 4);
    // alitas
    for (const s of [-1, 1]) {
      c.beginPath(); c.moveTo(s * 34, 6); c.quadraticCurveTo(s * 50, 12, s * 38, 24); c.quadraticCurveTo(s * 34, 18, s * 34, 6);
      c.closePath(); fillOl(c, p.light, 3.6);
    }
    eye(c, -13, -4, 5.4, p); eye(c, 13, -4, 5.4, p);
    cheek(c, -22, 8, 5.5); cheek(c, 22, 8, 5.5);
    c.beginPath(); c.moveTo(-8, 6); c.lineTo(8, 6); c.lineTo(0, 15); c.closePath();
    fillOl(c, '#ff8a1f', 3.4);
  });

  add('dino', 'Dinosaurio', '#5fd068', (c, p) => {
    // cola
    c.beginPath();
    c.moveTo(18, 14); c.quadraticCurveTo(44, 10, 50, -10); c.quadraticCurveTo(48, 20, 20, 32); c.closePath();
    fillOl(c, p.main);
    // placas del lomo
    for (const [x, y] of [[-8, -20], [6, -18], [18, -10]]) {
      c.beginPath(); c.moveTo(x - 7, y + 6); c.lineTo(x, y - 8); c.lineTo(x + 7, y + 6); c.closePath();
      fillOl(c, '#ffd21f', 3.6);
    }
    // patas (detrás del cuerpo)
    c.beginPath(); c.roundRect ? c.roundRect(-12, 24, 12, 20, 4) : c.rect(-12, 24, 12, 20);
    c.moveTo(22, 24); c.roundRect ? c.roundRect(10, 24, 12, 20, 4) : c.rect(10, 24, 12, 20);
    fillOl(c, p.main);
    // cuerpo
    ellipse(c, 4, 12, 28, 23); fillOl(c, p.main);
    // panza
    ellipse(c, -2, 17, 12, 12); c.fillStyle = p.light; c.fill();
    // cabeza y cuello
    ellipse(c, -26, -18, 22, 18, -0.2); fillOl(c, p.main);
    eye(c, -28, -24, 5, p);
    cheek(c, -34, -12, 4.5);
    c.beginPath(); c.arc(-38, -14, 6, 0.1 * Math.PI, 0.6 * Math.PI); ol(c, 3, p);
    circle(c, -44, -20, 1.8); c.fillStyle = p.ink; c.fill();
  });

  add('ballena', 'Ballena', '#4c8dff', (c, p) => {
    // chorrito de agua
    c.beginPath();
    c.moveTo(-14, -18); c.quadraticCurveTo(-16, -30, -14, -38);
    c.moveTo(-14, -30); c.quadraticCurveTo(-24, -40, -32, -34);
    c.moveTo(-14, -30); c.quadraticCurveTo(-4, -42, 4, -36);
    c.strokeStyle = INK; c.lineWidth = 9; c.lineCap = 'round'; c.stroke();
    c.strokeStyle = '#9fe0ff'; c.lineWidth = 4.6; c.stroke();
    for (const [x, y, r] of [[-14, -41, 4.5], [-34, -33, 4], [6, -35, 4]]) { circle(c, x, y, r); fillOl(c, '#9fe0ff', 3); }
    // cola (detrás del cuerpo)
    c.beginPath();
    c.moveTo(20, 14);
    c.quadraticCurveTo(36, 10, 38, -4);
    c.quadraticCurveTo(26, -10, 24, -24);
    c.quadraticCurveTo(36, -20, 41, -12);
    c.quadraticCurveTo(44, -24, 48, -30);
    c.quadraticCurveTo(52, -10, 40, 0);
    c.quadraticCurveTo(40, 18, 20, 24);
    c.closePath();
    fillOl(c, p.main);
    // cuerpo con panza clarita
    ellipse(c, -8, 12, 38, 27);
    c.fillStyle = p.main; c.fill();
    c.save(); c.clip();
    ellipse(c, -12, 30, 34, 14); c.fillStyle = p.light; c.fill();
    c.restore();
    ellipse(c, -8, 12, 38, 27); ol(c);
    glint(c, -22, -4, 7, 3.4, -0.4);
    eye(c, -24, 8, 5, p);
    cheek(c, -30, 18, 5);
    c.beginPath(); c.moveTo(-44, 16); c.quadraticCurveTo(-34, 26, -16, 20); ol(c, 3.2, p);
  });

  add('sol', 'Sol', '#ffb020', (c, p) => {
    // rayos
    c.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = (i * TAU) / 12;
      const R = i % 2 ? 42 : 48;
      c.moveTo(Math.cos(a - 0.2) * 28, Math.sin(a - 0.2) * 28);
      c.lineTo(Math.cos(a) * R, Math.sin(a) * R);
      c.lineTo(Math.cos(a + 0.2) * 28, Math.sin(a + 0.2) * 28);
      c.closePath();
    }
    c.fillStyle = p.main; c.fill(); ol(c, 4);
    // carita
    circle(c, 0, 0, 31); fillOl(c, p.inv ? p.main : p.light, 5);
    glint(c, -14, -16, 7, 3.4, -0.7);
    eye(c, -10, -4, 4.8, p); eye(c, 10, -4, 4.8, p);
    cheek(c, -18, 7, 5); cheek(c, 18, 7, 5);
    smile(c, 0, 10, 8, undefined, p);
  });

  const byId = Object.create(null);
  for (const d of defs) byId[d.id] = d;

  /** Dibuja un sello centrado en (x, y), con lado `size` y rotación `rot` (radianes). */
  function draw(ctx, id, x, y, size, rot, color, opts) {
    const d = byId[id] || defs[0];
    const main = !color || color === 'multi' ? d.natural : color;
    if (opts && opts.halo) { drawHalo(ctx, d, x, y, size, rot, main); return; }
    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    const k = size / 100;
    ctx.scale(k, k);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    d.draw(ctx, pal(main));
    ctx.restore();
  }

  /* Sello con un borde claro alrededor (sobre el pizarrón el contorno oscuro se perdería).
     Se arma en un lienzo aparte, a la resolución real del destino, y se "engorda" su silueta en blanco. */
  const scratch = { a: null, b: null };
  function drawHalo(ctx, d, x, y, size, rot, main) {
    const m = ctx.getTransform();
    const k = Math.hypot(m.a, m.b) || 1;         // píxeles reales por unidad del ctx
    const side = Math.max(4, Math.ceil(size * 1.3 * k));
    if (!scratch.a) { scratch.a = document.createElement('canvas'); scratch.b = document.createElement('canvas'); }
    const A = scratch.a, B = scratch.b;
    if (A.width < side || A.height < side) { A.width = A.height = B.width = B.height = side; }
    const a = A.getContext('2d'), b = B.getContext('2d');
    a.setTransform(1, 0, 0, 1, 0, 0); a.clearRect(0, 0, side, side);
    b.setTransform(1, 0, 0, 1, 0, 0); b.clearRect(0, 0, side, side);
    // el sello, centrado
    a.translate(side / 2, side / 2);
    if (rot) a.rotate(rot);
    a.scale((size / 100) * k, (size / 100) * k);
    d.draw(a, pal(main));
    a.setTransform(1, 0, 0, 1, 0, 0);
    // silueta blanca engordada
    const h = Math.max(1.2, size * 0.035 * k);
    for (let i = 0; i < 12; i++) {
      const t = (i / 12) * TAU;
      b.drawImage(A, 0, 0, side, side, Math.cos(t) * h, Math.sin(t) * h, side, side);
    }
    b.globalCompositeOperation = 'source-in';
    b.fillStyle = 'rgba(255,255,255,0.9)';
    b.fillRect(0, 0, side, side);
    b.globalCompositeOperation = 'source-over';
    b.drawImage(A, 0, 0);
    const u = side / k;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(B, 0, 0, side, side, x - u / 2, y - u / 2, u, u);
    ctx.restore();
  }

  function thumb(id, cssPx, color) {
    const dpr = U.dpr();
    const c = U.canvas(cssPx * dpr, cssPx * dpr);
    c.style.width = cssPx + 'px';
    c.style.height = cssPx + 'px';
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    draw(ctx, id, cssPx / 2, cssPx / 2, cssPx * 0.9, 0, color);
    return c;
  }

  CL.stamps = {
    list: defs.map((d) => ({ id: d.id, name: d.name, natural: d.natural })),
    has: (id) => !!byId[id],
    draw,
    thumb,
  };
})(window.CL);
