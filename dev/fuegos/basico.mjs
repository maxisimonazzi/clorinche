// Fuegos: carga de la pantalla, cielo y barras en todos los tamaños.
// Uso: node fuegos/basico.mjs [tamaño ...]
import { launch, appUrl, shot, SIZES } from '../lib.mjs';

const sizes = process.argv.slice(2).length ? process.argv.slice(2) : ['desktop', 'tablet', 'tabletV', 'phone', 'phoneH', 'phoneSmall'];
const report = {};
for (const size of sizes) {
  const t = await launch({ size });
  const { page } = t;
  await page.goto(appUrl('fuegos'));
  await page.waitForTimeout(900);
  const info = await page.evaluate(() => {
    const st = CL.fuegos._debug.state();
    const boxes = [...document.querySelectorAll('.screen--fuegos button')].map((b) => {
      const r = b.getBoundingClientRect();
      return { l: b.getAttribute('aria-label'), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    });
    const out = boxes.filter((b) => b.x < 0 || b.y < 0 || b.x + b.w > innerWidth || b.y + b.h > innerHeight);
    // Superposiciones entre botones
    const over = [];
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) over.push(a.l + ' / ' + b.l);
    }
    return { st: { W: st.W, H: st.H, fdpr: st.fdpr, running: st.running }, nButtons: boxes.length, out, over, small: boxes.filter((b) => b.w < 46).map((b) => b.l) };
  });
  await shot(page, `fuegos/${size}-inicio`);
  report[size] = { ...info, errors: t.errors };
  await t.close();
}
console.log(JSON.stringify(report, null, 1));
