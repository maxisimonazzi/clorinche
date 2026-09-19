import { launch, appUrl } from '../lib.mjs';
const size = process.argv[2] || 'tablet';
const t = await launch({ size });
const { page } = t;
await page.goto(appUrl('fuegos'));
await page.waitForTimeout(800);
for (const o of [{}, { overTrails: true }, { noSprites: true, overTrails: true }]) {
  const r = await page.evaluate(([o, W, H]) => new Promise((res) => {
    const d = CL.fuegos._debug; d.clear();
    Object.assign(o, { noTrails: !!o.noTrails, noSprites: !!o.noSprites, overTrails: !!o.overTrails });
    // acceso directo a opts
    d.opts ? d.opts(o) : 0;
    for (let i = 0; i < 6; i++) d.explode(W * (0.2 + 0.12 * i), H * 0.4, CL.fuegos.TYPES[i]);
    let n = 0; const t0 = performance.now();
    const f = (now) => { n++; if (now - t0 < 1200) requestAnimationFrame(f); else res(+(n / ((now - t0) / 1000)).toFixed(1)); };
    requestAnimationFrame(f);
  }), [o, t.size.width, t.size.height]).catch((e) => e.message);
  console.log(JSON.stringify(o), r);
  await page.waitForTimeout(3500);
}
await t.close();
