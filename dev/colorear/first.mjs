import { launch, appUrl, shot, tap } from '../lib.mjs';
const sizes = process.argv.slice(2).length ? process.argv.slice(2) : ['desktop', 'tablet', 'phone'];
for (const size of sizes) {
  const t = await launch({ size });
  const { page } = t;
  await page.goto(appUrl('colorear/vaca'));
  await page.waitForFunction(() => document.querySelectorAll('.screen').length === 1 && document.querySelector('.screen--colorear.cl-ready'), null, { timeout: 10000 });
  await page.waitForTimeout(300);
  const info = await page.evaluate(() => ({ ms: CL.coloring.stats.regionsMs, board: document.querySelector('.cl-board').getBoundingClientRect().toJSON() }));
  const b = info.board;
  // balde en varios puntos
  const pts = [[0.3, 0.3], [0.5, 0.55], [0.1, 0.1], [0.62, 0.62]];
  for (const [fx, fy] of pts) {
    if (t.size.touch) await tap(page, b.x + b.width * fx, b.y + b.height * fy);
    else await page.mouse.click(b.x + b.width * fx, b.y + b.height * fy);
    await page.waitForTimeout(350);
  }
  await shot(page, `colorear/first-${size}`);
  console.log(size, info.ms, JSON.stringify(t.errors));
  await t.close();
}
