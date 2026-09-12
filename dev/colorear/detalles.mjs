// Detalles: arcoíris con pincel y "no salirse" (activado por defecto), marca del selector al abrir, festejo, tiempos de especiales.
import { launch, appUrl, shot, ready, P, hit, hitSel, paintAt, stroke, multiStroke, filterErrors } from './common.mjs';
const size = process.argv[2] || 'tablet';
const t = await launch({ size });
const { page } = t;
const out = {};
await page.goto(appUrl('colorear/oveja')); await ready(page); await page.waitForTimeout(300);
const b = await page.evaluate(() => document.querySelector('.cl-board').getBoundingClientRect().toJSON());
const at = (fx, fy) => [b.x + b.width * fx, b.y + b.height * fy];
const drag = async (pts) => { const abs = pts.map(([x, y]) => at(x, y)); if (t.size.touch) await multiStroke(page, [abs], { steps: 30 }); else await stroke(page, abs, { steps: 30 }); await page.waitForTimeout(200); };
// Arcoíris + pincel con "no salirse" (por defecto): trazo horizontal largo sobre el fondo y otro sobre el cuerpo
await hitSel(t, '[aria-label="Pincel"]'); await hitSel(t, '[aria-label="Pincel grueso"]');
await hitSel(t, '[data-kind="rainbow"]');
out.clip = await page.evaluate(() => CL.coloring.screen.st.clip);
await drag([[0.06, 0.1], [0.94, 0.1]]);
await drag([[0.06, 0.93], [0.94, 0.93]]);
await drag([[0.3, 0.5], [0.7, 0.5]]);
await shot(page, `colorear/d-${size}-1-arcoiris-pincel-nosalirse`);
// Muestras de color a lo largo del trazo del fondo
out.rainbowSamples = await page.evaluate(() => { const c = CL.coloring.screen.painter.canvas, x = c.getContext('2d'); const r = []; for (let i = 1; i < 9; i++) r.push(Array.from(x.getImageData(Math.round(c.width * (0.06 + i * 0.1)), Math.round(c.height * 0.1), 1, 1).data.slice(0, 3)).join(',')); return [...new Set(r)]; });
// Sin "no salirse": para comparar
await hitSel(t, '[aria-label="No salirse de las líneas"]');
await drag([[0.06, 0.2], [0.94, 0.2]]);
await hitSel(t, '[aria-label="No salirse de las líneas"]');
await shot(page, `colorear/d-${size}-2-arcoiris-libre`);
// Tiempos de balde con especiales sobre el fondo (zona más grande)
await hitSel(t, '[aria-label="Balde de pintura"]');
out.specialMs = {};
for (const k of ['sparkle', 'dots', 'gradient', 'rainbow']) {
  await hitSel(t, `[data-kind="${k}"]`);
  await hit(t, ...at(0.03, 0.5)); await page.waitForTimeout(400);
  out.specialMs[k] = await page.evaluate(() => Math.round(CL.coloring.stats.lastFillMs));
  await hitSel(t, `[data-kind="${k}"]`); // volver a liso
}
// Selector: marca al abrir
await hitSel(t, '.cl-pick'); await page.waitForTimeout(400);
out.mark = await page.evaluate(() => { const m = document.querySelector('.cl-pk-mark'); const r = m.getBoundingClientRect(), mb = document.querySelector('.cl-pk-map').getBoundingClientRect(); return { left: m.style.left, top: m.style.top, bg: m.style.background, rel: [Math.round(r.left - mb.left), Math.round(r.top - mb.top)] }; });
await shot(page, `colorear/d-${size}-3-selector-al-abrir`);
await hitSel(t, '[aria-label="Listo"]'); await page.waitForTimeout(300);
// Festejo
await hitSel(t, '.cl-done'); await page.waitForTimeout(900);
await shot(page, `colorear/d-${size}-4-festejo`);
await page.waitForTimeout(2500);
out.hash = await page.evaluate(() => location.hash);
await shot(page, `colorear/d-${size}-5-despues-festejo`);
console.log(size, JSON.stringify(out), JSON.stringify(filterErrors(t.errors)));
await t.close();

