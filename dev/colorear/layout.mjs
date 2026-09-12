// Layout de la pantalla de colorear en todos los tamaños (+ selector de color) y chequeo de cosas cortadas.
import { launch, appUrl, shot, tap } from '../lib.mjs';
const sizes = process.argv.slice(2).length ? process.argv.slice(2) : ['desktop', 'tablet', 'tabletV', 'phone', 'phoneH', 'phoneSmall'];
for (const size of sizes) {
  const t = await launch({ size });
  const { page } = t;
  await page.goto(appUrl('colorear/leon'));
  await page.waitForFunction(() => document.querySelectorAll('.screen').length === 1 && document.querySelector('.cl-ready'), null, { timeout: 10000 });
  await page.waitForTimeout(300);
  const click = async (sel) => { await page.locator(sel).first().scrollIntoViewIfNeeded(); await page.waitForTimeout(150); const r = await page.locator(sel).first().boundingBox(); if (t.size.touch) await tap(page, r.x + r.width / 2, r.y + r.height / 2); else await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2); await page.waitForTimeout(120); };
  const b = await page.evaluate(() => document.querySelector('.cl-board').getBoundingClientRect().toJSON());
  for (const [fx, fy, c] of [[0.04, 0.04, 'Verde agua'], [0.5, 0.25, 'Amarillo'], [0.5, 0.6, 'Naranja']]) {
    await click(`.cl-sw[aria-label="${c}"]`);
    if (t.size.touch) await tap(page, b.x + b.width * fx, b.y + b.height * fy); else await page.mouse.click(b.x + b.width * fx, b.y + b.height * fy);
    await page.waitForTimeout(300);
  }
  await click('[aria-label="Pincel"]');
  // chequeo: todos los botones/círculos dentro de la ventana (salvo la paleta que scrollea) y tamaño mínimo
  const chk = await page.evaluate(() => {
    const W = innerWidth, H = innerHeight, bad = [], small = [];
    const pal = document.querySelector('.cl-pal').getBoundingClientRect();
    for (const e of document.querySelectorAll('.screen--colorear button')) {
      const r = e.getBoundingClientRect();
      const inPal = !!e.closest('.cl-pal');
      const box = inPal ? pal : { left: 0, top: 0, right: W, bottom: H };
      if (!inPal && (r.left < -1 || r.top < -1 || r.right > W + 1 || r.bottom > H + 1)) bad.push(e.getAttribute('aria-label') + ' ' + JSON.stringify([r.left, r.top, r.right, r.bottom].map(Math.round)));
      if (inPal && (r.top < pal.top - 1 || r.bottom > pal.bottom + 1)) bad.push('pal ' + e.getAttribute('aria-label'));
      if (Math.min(r.width, r.height) < 46) small.push(e.getAttribute('aria-label') + ' ' + Math.round(r.width));
    }
    const board = document.querySelector('.cl-board').getBoundingClientRect();
    const pan = document.querySelector('.cl-pal');
    return { bad, small, board: [Math.round(board.width), Math.round(board.height)], palScroll: [pan.scrollWidth, pan.clientWidth, pan.scrollHeight, pan.clientHeight], docScroll: [document.documentElement.scrollWidth, W] };
  });
  await shot(page, `colorear/layout-${size}`);
  await click('.cl-pick');
  await page.waitForTimeout(350);
  const mb = await page.locator('.cl-pk-mapbox').boundingBox();
  if (t.size.touch) await tap(page, mb.x + mb.width * 0.8, mb.y + mb.height * 0.3); else await page.mouse.click(mb.x + mb.width * 0.8, mb.y + mb.height * 0.3);
  await page.waitForTimeout(200);
  const pk = await page.evaluate(() => { const r = document.querySelector('.cl-pk-back .modal').getBoundingClientRect(); return [r.top, r.bottom, innerHeight].map(Math.round); });
  await shot(page, `colorear/layout-${size}-selector`);
  console.log(size, JSON.stringify(chk), 'picker', JSON.stringify(pk), JSON.stringify(t.errors));
  await t.close();
}
