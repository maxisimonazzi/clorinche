// Revisión QA 2 — selector de color en tamaños chicos/acostados y cierre tocando afuera / con Escape.
import { launch, appUrl, shot } from '../lib.mjs';
import { ready, hitSel, filterErrors } from '../review-colorear/common.mjs';
for (const size of ['phoneH', 'phoneSmall', 'tabletV']) {
  const t = await launch({ size });
  const { page } = t;
  await page.goto(appUrl('colorear/pulpo'));
  await ready(page);
  await hitSel(t, '.cl-pick');
  await page.waitForSelector('.cl-picker');
  await page.waitForTimeout(400);
  await shot(page, `colorear/c1-sel-${size}`);
  const fit = await page.evaluate(() => {
    const m = document.querySelector('.cl-pk-back .modal').getBoundingClientRect();
    const ok = document.querySelector('.cl-pk-ok').getBoundingClientRect();
    const map = document.querySelector('.cl-pk-map').getBoundingClientRect();
    const modal = document.querySelector('.cl-pk-back .modal');
    return { modal: [m.top, m.bottom, innerHeight].map(Math.round), okVisible: ok.bottom <= innerHeight && ok.top >= 0, mapH: Math.round(map.height), scrolls: modal.scrollHeight > modal.clientHeight + 1 };
  });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const escClosed = await page.evaluate(() => !document.querySelector('.cl-picker'));
  console.log(size, JSON.stringify(fit), 'escape cierra:', escClosed, JSON.stringify(filterErrors(t.errors)));
  await t.close();
}
