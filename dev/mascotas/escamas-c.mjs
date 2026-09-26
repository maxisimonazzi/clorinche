// Genera las columnas de escamas del pez como arcos en "C" (convexos hacia la cola).
// Cada columna sigue una curva guía Q (de un punto del contorno arriba a otro abajo) dividida en n arcos.
// El primer y el último arco son cúbicas que salen del contorno perpendiculares a él (sin cuñas tangentes
// ni espolones). ell = [cx, cy, rx, ry] del cuerpo (para la normal del contorno).
// Uso: cd dev && node mascotas/escamas-c.mjs '[{"p0":[548,262],"c":[600,500],"p2":[548,738],"n":4,"r":0.45}]'
const ELL = [470, 500, 330, 245];
export function columna({ p0, c, p2, n, r = 0.45, rEnd = r, ell = ELL, k = 0.35, vertical = true }) {
  const P = (t) => [
    (1 - t) ** 2 * p0[0] + 2 * t * (1 - t) * c[0] + t * t * p2[0],
    (1 - t) ** 2 * p0[1] + 2 * t * (1 - t) * c[1] + t * t * p2[1],
  ];
  const N = 2000, pts = [], len = [0];
  for (let i = 0; i <= N; i++) pts.push(P(i / N));
  for (let i = 1; i <= N; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = len[N];
  const at = (s) => { let i = len.findIndex((v) => v >= s); if (i < 0) i = N; return pts[i]; };
  const q = [p0];
  for (let j = 1; j < n; j++) q.push(at((L * j) / n));
  q.push(p2);
  // normal hacia adentro del cuerpo en un punto del contorno
  const inward = (p) => {
    const gx = (p[0] - ell[0]) / (ell[2] * ell[2]), gy = (p[1] - ell[1]) / (ell[3] * ell[3]);
    if (vertical) return [0, p[1] < ell[1] ? 1 : -1]; // salida vertical: más prolija que la normal exacta
    const m = Math.hypot(gx, gy); return [-gx / m, -gy / m];
  };
  const R = (v) => Math.round(v);
  const ctrl = (a, b, r) => { // control de la Q de un arco que abomba hacia la derecha (la cola)
    const dx = b[0] - a[0], dy = b[1] - a[1], ch = Math.hypot(dx, dy), off = 2 * r * ch;
    return [(a[0] + b[0]) / 2 + (dy / ch) * off, (a[1] + b[1]) / 2 + (-dx / ch) * off, ch];
  };
  let d = `M${R(p0[0])} ${R(p0[1])}`;
  for (let j = 1; j <= n; j++) {
    const a = q[j - 1], b = q[j], [cx, cy, ch] = ctrl(a, b, j === 1 || j === n ? rEnd : r);
    if (j === 1) {
      const u = inward(a);
      d += `C${R(a[0] + u[0] * k * ch)} ${R(a[1] + u[1] * k * ch)} ${R(b[0] + (2 / 3) * (cx - b[0]))} ${R(b[1] + (2 / 3) * (cy - b[1]))} ${R(b[0])} ${R(b[1])}`;
    } else if (j === n) {
      const u = inward(b);
      d += `C${R(a[0] + (2 / 3) * (cx - a[0]))} ${R(a[1] + (2 / 3) * (cy - a[1]))} ${R(b[0] + u[0] * k * ch)} ${R(b[1] + u[1] * k * ch)} ${R(b[0])} ${R(b[1])}`;
    } else {
      d += `Q${R(cx)} ${R(cy)} ${R(b[0])} ${R(b[1])}`;
    }
  }
  return d;
}
if (process.argv[1] && process.argv[1].endsWith('escamas-c.mjs')) {
  const cfg = JSON.parse(process.argv[2] || '[]');
  console.log(cfg.map(columna).join(''));
}
