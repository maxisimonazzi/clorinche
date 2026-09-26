// Generador de las escamas del pez: columnas de arcos ")" recortados exactamente al contorno del cuerpo
// (elipse) y a la línea de la agalla, así ninguna línea sobresale ni deja huecos.
// Lo usan gen.mjs (imprime / escribe el path) y pez-busca.mjs (busca los parámetros con zonas más parejas).
export function escamas(p = {}) {
  const E = { cx: 470, cy: 500, rx: 330, ry: 245 };
  const ellY = (x, sign) => E.cy + sign * E.ry * Math.sqrt(Math.max(0, 1 - ((x - E.cx) / E.rx) ** 2));
  const gx = p.gx ?? 370, gcx = p.gcx ?? 470;
  const GILL = [[gx, ellY(gx, -1)], [gcx, E.cy], [gx, ellY(gx, 1)]];
  const B = p.b ?? 74, S = p.s ?? 68, H = p.h ?? 160, X0 = p.x0 ?? 463, Y0 = p.y0 ?? 500, MIN = p.min ?? 30;

  const q = (p0, p1, p2, t) => [0, 1].map((i) => (1 - t) ** 2 * p0[i] + 2 * (1 - t) * t * p1[i] + t * t * p2[i]);
  const blossom = (p0, p1, p2, a, b) => [0, 1].map((i) => (1 - a) * (1 - b) * p0[i] + ((1 - a) * b + a * (1 - b)) * p1[i] + a * b * p2[i]);
  const gillPts = Array.from({ length: 401 }, (_, i) => q(GILL[0], GILL[1], GILL[2], i / 400));
  const gillX = (y) => { let best = gillPts[0], bd = 1e9; for (const g of gillPts) { const d = Math.abs(g[1] - y); if (d < bd) { bd = d; best = g; } } return best[0]; };
  const inside = ([x, y]) => ((x - E.cx) / E.rx) ** 2 + ((y - E.cy) / E.ry) ** 2 <= 1 && x >= gillX(y);
  const clip = (p0, p1, p2) => {
    const N = 300, segs = []; let start = null;
    const refine = (a, b) => { const ia = inside(q(p0, p1, p2, a)); for (let k = 0; k < 30; k++) { const m = (a + b) / 2; if (inside(q(p0, p1, p2, m)) === ia) a = m; else b = m; } return (a + b) / 2; };
    let prevIn = inside(q(p0, p1, p2, 0)); if (prevIn) start = 0;
    for (let i = 1; i <= N; i++) {
      const t = i / N, cur = inside(q(p0, p1, p2, t));
      if (cur !== prevIn) { const tc = refine((i - 1) / N, t); if (cur) start = tc; else { segs.push([start, tc]); start = null; } }
      prevIn = cur;
    }
    if (start != null) segs.push([start, 1]);
    return segs;
  };
  const len = (p0, p1, p2, a, b) => { let L = 0, pr = q(p0, p1, p2, a); for (let i = 1; i <= 20; i++) { const c = q(p0, p1, p2, a + (b - a) * i / 20); L += Math.hypot(c[0] - pr[0], c[1] - pr[1]); pr = c; } return L; };
  const r = Math.round;
  let d = '';
  for (let k = -3; k < 14; k++) {
    const x = X0 + k * S;
    if (x > E.cx + E.rx || x + 2 * B < 300) continue;
    const off = Y0 - H / 2 + (((k % 2) + 2) % 2) * (H / 2);
    for (let n = -6; n <= 6; n++) {
      const c = off + n * H;
      const p0 = [x, c], p1 = [x + 2 * B, c + H / 2], p2 = [x, c + H];
      for (const [a, b] of clip(p0, p1, p2)) {
        if (len(p0, p1, p2, a, b) < MIN) continue;
        const A = q(p0, p1, p2, a), C = blossom(p0, p1, p2, a, b), Z = q(p0, p1, p2, b);
        d += `M${r(A[0])} ${r(A[1])}Q${r(C[0])} ${r(C[1])} ${r(Z[0])} ${r(Z[1])}`;
      }
    }
  }
  const gill = `M${r(GILL[0][0])} ${r(GILL[0][1])}Q${r(GILL[1][0])} ${r(GILL[1][1])} ${r(GILL[2][0])} ${r(GILL[2][1])}`;
  return { gill, d };
}
