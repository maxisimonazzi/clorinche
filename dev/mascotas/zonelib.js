// Se inyecta en dev/drawings/preview.html. Analiza las zonas de un SVG interior (sin el <g> de estilo):
// área (u²), grosor (diámetro del mayor círculo inscripto, en u) y centro de cada zona.
window.zoneList = async (inner, RESO = 1000) => {
  const img = await CL.util.svgToImage(CL.drawings.wrap(inner, RESO));
  const c = CL.util.canvas(RESO, RESO);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, RESO, RESO); ctx.drawImage(img, 0, 0, RESO, RESO);
  const W = RESO, H = RESO, k = W / 1000;
  const { label, sizes, n } = regions(ctx, W, H);
  const bg = label[2 * W + 2];
  const dist = new Float32Array(W * H);
  for (let p = 0; p < W * H; p++) dist[p] = label[p] < 0 ? 0 : 1e9;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x; if (!dist[p]) continue; let d = dist[p];
    if (x > 0) d = Math.min(d, dist[p - 1] + 3);
    if (y > 0) { d = Math.min(d, dist[p - W] + 3); if (x > 0) d = Math.min(d, dist[p - W - 1] + 4); if (x < W - 1) d = Math.min(d, dist[p - W + 1] + 4); }
    dist[p] = d;
  }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
    const p = y * W + x; if (!dist[p]) continue; let d = dist[p];
    if (x < W - 1) d = Math.min(d, dist[p + 1] + 3);
    if (y < H - 1) { d = Math.min(d, dist[p + W] + 3); if (x < W - 1) d = Math.min(d, dist[p + W + 1] + 4); if (x > 0) d = Math.min(d, dist[p + W - 1] + 4); }
    dist[p] = d;
  }
  const maxd = new Float32Array(n), cx = new Int32Array(n), cy = new Int32Array(n);
  for (let p = 0; p < W * H; p++) {
    const l = label[p]; if (l < 0) continue;
    if (dist[p] > maxd[l]) { maxd[l] = dist[p]; cx[l] = p % W; cy[l] = (p / W) | 0; }
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    if (i === bg) continue;
    out.push({ area: Math.round(sizes[i] / (k * k)), grosor: Math.round((2 * maxd[i]) / 3 / k), x: Math.round(cx[i] / k), y: Math.round(cy[i] / k) });
  }
  return { zones: out, bgFrac: sizes[bg] / (W * H) };
};
