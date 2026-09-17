// Selectores de sellos y de fondo en todos los tamaños (que entren sin scroll y parejos).
import { launch, appUrl, shot } from '../lib.mjs';
import { ready } from './common.mjs';
const sizes = process.argv[2] ? process.argv[2].split(',') : ['desktop', 'tablet', 'tabletV', 'phone', 'phoneH', 'phoneSmall'];
for (const size of sizes) {
  const t = await launch({ size });
  const { page } = t;
  await page.goto(appUrl('pizarra'));
  await ready(page);
  const res = {};
  for (const [btn, name] of [['.pz-tool[data-tool="sellos"]', 'stamps'], ['.pz-bgbtn', 'bg']]) {
    await page.click(btn);
    await page.waitForTimeout(400);
    res[name] = await page.evaluate(() => {
      const m = document.querySelector('.modal'); const r = m.getBoundingClientRect();
      return { scroll: m.scrollHeight > m.clientHeight + 1 || m.scrollWidth > m.clientWidth + 1, inside: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight };
    });
    await shot(page, `pizarra/pickers/${size}-${name}`);
    await page.click('.modal-close');
    await page.waitForTimeout(300);
  }
  console.log(size, JSON.stringify(res), JSON.stringify(t.errors));
  await t.close();
}
