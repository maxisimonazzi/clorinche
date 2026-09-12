// Historial con memoria acotada (pasos viejos comprimidos) + chequeo numérico de halos + tiempos.
import { launch, appUrl } from '../lib.mjs';
const t = await launch({ size: 'desktop' });
const { page } = t;
await page.goto(appUrl('colorear/cebra'));
await page.waitForFunction(() => document.querySelectorAll('.screen').length === 1 && document.querySelector('.cl-ready'), null, { timeout: 10000 });
const r = await page.evaluate(async () => {
  const p = CL.coloring.screen.painter, m = p.regions, W = p.w;
  const cols = [];
  const times = [];
  // 45 baldes sobre el fondo (el paso más caro: la zona más grande) alternando colores
  for (let i = 0; i < 45; i++) {
    const c = CL.util.hsl(i * 37, 80, 55);
    const hex = CL.util.rgbToHex(...(() => { const d = document.createElement('canvas').getContext('2d'); d.fillStyle = c; d.fillRect(0,0,1,1); return d.getImageData(0,0,1,1).data; })());
    cols.push(hex);
    const t0 = performance.now();
    await p.fillAt(5, 5, { kind: 'solid', color: hex }, { animate: false });
    times.push(performance.now() - t0);
  }
  await new Promise((res) => setTimeout(res, 2500)); // compresión en segundo plano
  const px = () => Array.from(p.ctx.getImageData(5, 5, 1, 1).data.slice(0, 3));
  const undoTimes = [];
  for (let i = 0; i < 30; i++) { const t0 = performance.now(); await p.undo(); undoTimes.push(performance.now() - t0); }
  const afterUndo = px(), expected = CL.util.hexToRgb(cols[14]);
  for (let i = 0; i < 5; i++) await p.redo();
  const afterRedo = px(), expectedRedo = CL.util.hexToRgb(cols[19]);
  // Halos: todos los píxeles de la zona pintada (incluida su media línea) con alfa 255.
  const zones = [m.bg, m.nearest(W * 0.5, W * 0.45), m.nearest(W * 0.3, W * 0.8)].filter((z) => z >= 0);
  for (const z of zones.slice(1)) {
    const b = m.bbox[z];
    await p.fillAt((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, { kind: 'dots', color: '#ff3f97' }, { animate: false });
  }
  const img = p.ctx.getImageData(0, 0, W, p.h).data;
  const halo = zones.map((z) => { let n = 0, holes = 0; for (let i = 0; i < m.label.length; i++) if (m.label[i] === z) { n++; if (img[i * 4 + 3] < 255) holes++; } return { zone: z, pixels: n, holes }; });
  // ¿Hay píxeles de línea (oscuros) sin zona asignada?
  let unassigned = 0; for (let i = 0; i < m.label.length; i++) if (m.label[i] < 0) unassigned++;
  return {
    steps: p.historyLength, fillAvg: Math.round(times.reduce((a, b) => a + b) / times.length), fillMaxBg: Math.round(Math.max(...times)),
    undoMax: Math.round(Math.max(...undoTimes)), undoOk: JSON.stringify(afterUndo) === JSON.stringify(expected), redoOk: JSON.stringify(afterRedo) === JSON.stringify(expectedRedo),
    halo, unassigned, regionsTimings: m.timings,
  };
});
console.log(JSON.stringify(r, null, 1), t.errors);
await t.close();
