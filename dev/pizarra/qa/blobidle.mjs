import { launch, appUrl } from '../../lib.mjs';
const probe = () => new Promise((res) => { const c = document.createElement('canvas'); c.width = 200; c.height = 200; c.getContext('2d').fillRect(0,0,10,10); const t0 = performance.now(); c.toBlob(() => res(Math.round(performance.now() - t0))); });
for (const size of ['tablet', { width: 1024, height: 768, dpr: 2, touch: false }, { width: 1024, height: 768, dpr: 1, touch: true }]) {
  const t = await launch({ size });
  const { page } = t;
  await page.goto(appUrl('inicio')); await page.waitForTimeout(1500);
  const a = await page.evaluate(probe);
  await page.goto(appUrl('pizarra')); await page.waitForTimeout(1500);
  const b = await page.evaluate(probe);
  const anims = await page.evaluate(() => document.getAnimations().map((x) => (x.animationName || x.constructor.name) + ':' + (x.effect && x.effect.target && x.effect.target.className)));
  await page.goto('about:blank'); 
  const c = await page.evaluate(probe);
  console.log(JSON.stringify(size), { inicio: a, pizarra: b, blank: c, anims });
  await t.close();
}
