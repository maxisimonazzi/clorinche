import { launch, appUrl, stroke } from '../lib.mjs';
import { ready, board, at, T, resetDb } from './common.mjs';
const t = await launch({ size: 'tablet' });
const { page } = t;
page.on('console', (m) => console.log('console:', m.text()));
await page.goto(appUrl('pizarra'));
await ready(page);
await resetDb(page);
await page.reload();
await ready(page);
const b = await board(page);
await stroke(page, [at(b, 0.1, 0.1), at(b, 0.9, 0.9)], { pointer: 'touch', steps: 20 });
await page.waitForTimeout(300);
await page.evaluate(() => CL.pizarra.current.save());
const id = await page.evaluate(() => CL.pizarra.current.work.id);
console.log('saved', id);
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(500);
console.log('resized', await page.evaluate(() => JSON.stringify(CL.pizarra.current._test.scale)));
await page.evaluate((id) => { CL.router.go('pizarra/' + id); }, id);
console.log('go sent');
for (let i = 0; i < 6; i++) {
  const r = await Promise.race([page.evaluate(() => location.hash + ' ' + !!(CL.pizarra.current && CL.pizarra.current.doc)), new Promise((r) => setTimeout(() => r('TIMEOUT'), 3000))]);
  console.log(i, r);
  if (r === 'TIMEOUT') break;
  await new Promise((r) => setTimeout(r, 500));
}
console.log(t.errors);
await t.close();
