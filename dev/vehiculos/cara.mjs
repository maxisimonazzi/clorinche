// Geometría de la carita de vehiculos.js (mismas fórmulas que carita()): huecos blancos pupila↔cachete y
// sonrisa↔cachete, y caja de tinta de la carita. Sirve para acomodar caras sin prueba y error.
//   node vehiculos/cara.mjs 730 575 88 rx=25 ry=31 cx=40 cy=66 cr=34 sy=54 sw=56
const [x, y, sep = 84, ...rest] = process.argv.slice(2);
const o = Object.fromEntries(rest.map((s) => s.split('=')).map(([k, v]) => [k, Number(v)]));
const { rx = 25, ry = 31, cx = 36, cy = 58, cr = 34, sy = 50, sw = 56, sh = 26 } = o;
const X = Number(x), Y = Number(y), S = Number(sep);
const cry = Math.round(cr * 0.65);
const elipse = (ex, ey, a, b, n = 720) => Array.from({ length: n }, (_, i) => {
  const t = (i / n) * Math.PI * 2; return [ex + a * Math.cos(t), ey + b * Math.sin(t)];
});
const d2 = (P, Q) => { let m = 1e9; for (const p of P) for (const q of Q) m = Math.min(m, Math.hypot(p[0] - q[0], p[1] - q[1])); return m; };
const ojoD = elipse(X + S / 2, Y, rx, ry);
const cacheD = elipse(X + S / 2 + cx, Y + cy, cr, cry);
const x0 = X - sw / 2, y0 = Y + sy;
const sonr = Array.from({ length: 200 }, (_, i) => {
  const t = i / 199; return [x0 + sw * t, y0 + 2 * t * (1 - t) * sh];
});
// Tinta: pupila rellena con trazo 16 (medio trazo 8); cachete y sonrisa con trazo 12 (medio 6).
const gapOjo = d2(ojoD, cacheD) - 8 - 6;
const gapSon = d2(sonr, cacheD) - 6 - 6;
const ink = [X - S / 2 - cx - cr - 6, Y - ry - 8, X + S / 2 + cx + cr + 6, Math.max(Y + cy + cry + 6, y0 + sh / 2 + 6)];
console.log(`cachete ${cr}x${cry}  hueco pupila-cachete ${gapOjo.toFixed(1)}  sonrisa-cachete ${gapSon.toFixed(1)}`);
console.log(`caja de tinta x ${ink[0]}..${ink[2]}  y ${ink[1]}..${ink[3]}  ` +
  `cachete der x ${X + S / 2 + cx - cr - 6}..${X + S / 2 + cx + cr + 6} y ${Y + cy - cry - 6}..${Y + cy + cry + 6}`);
