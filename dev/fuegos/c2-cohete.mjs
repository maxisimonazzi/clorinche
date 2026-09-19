// Corrección 2 — trazos "cohete" que terminan arriba de todo (debajo de las pestañas) o abajo
// (sobre el selector flotante): el estallido tiene que quedar en el cielo libre y verse.
// Uso: node fuegos/c2-cohete.mjs
import { launch, appUrl, shot, multiStroke, SIZES } from '../lib.mjs';

const sizes = {
  phone: SIZES.phone, phoneH: SIZES.phoneH, tablet: SIZES.tablet, tabletV: SIZES.tabletV, desktop: SIZES.desktop,
  seH: { width: 568, height: 320, dpr: 2, touch: true },
  androidH: { width: 740, height: 360, dpr: 3, touch: true },
};
const only = process.argv.slice(2);
const out = {};
for (const [name, size] of Object.entries(sizes)) {
  if (only.length && !only.includes(name)) continue;
  const t = await launch({ size });
  const { page } = t;
  await page.goto(appUrl('fuegos'));
  await page.waitForTimeout(700);
  const W = size.width, H = size.height;
  const cases = [
    ['arriba', [[W * 0.45, H * 0.72], [W * 0.5, 4]]],
    ['abajo', [[W * 0.5, H * 0.35], [W * 0.55, H - 6]]],
    ['esquina', [[W * 0.5, H * 0.5], [W - 4, H - 4]]],
  ];
  out[name] = {};
  for (const [cn, path] of cases) {
    await page.evaluate(() => CL.fuegos._debug.clear());
    await multiStroke(page, [path], { steps: 12, delay: 0 });
    await page.waitForFunction(() => CL.fuegos._debug.state().fuses.length === 0, null, { polling: 'raf', timeout: 10000 });
    await page.waitForTimeout(330);
    await page.evaluate(() => CL.fuegos._debug.timeScale(0));
    const s = await page.evaluate(() => CL.fuegos._debug.state());
    const ui = await page.evaluate(() => {
      const r = (sel) => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)]; };
      return { tabs: r('.mode-tabs'), colors: r('.fw-colors') };
    });
    const [bx, by, R] = s.lastBurst;
    // ¿el centro del estallido queda tapado por algún botón/cápsula?
    const covered = Object.entries(ui).filter(([, b]) => b && bx >= b[0] && bx <= b[2] && by >= b[1] && by <= b[3]).map(([k]) => k);
    out[name][cn] = {
      end: path[1].map(Math.round), burst: [Math.round(bx), Math.round(by)], R: Math.round(R),
      band: [Math.round(s.band.top), Math.round(s.band.bottom)], covered,
      visibleTop: Math.round(by - R) >= Math.round(s.band.top) - R * 0.55,
    };
    if (['phone', 'phoneH', 'seH', 'tablet'].includes(name)) await shot(page, `fuegos/c2-cohete-${name}-${cn}`);
    await page.evaluate(() => CL.fuegos._debug.timeScale(1));
  }
  out[name].errors = t.errors;
  await t.close();
}
console.log(JSON.stringify(out, null, 1));
