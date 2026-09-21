// QA: ¿qué pasa al soltar el dedo después de borrar manteniendo apretado? (¿se abre otra obra?)
// Uso: cd dev && node galeria/borrar.mjs [tamaño=tablet] [mouse]
import { launch, appUrl, shot, touchStart, touches } from '../lib.mjs';
import { seed } from './seed2.mjs';

const size = process.argv[2] || 'tablet';
const useMouse = process.argv.includes('mouse');
const t = await launch({ size });
const { page } = t;
await page.goto(appUrl('inicio'));
await page.waitForTimeout(500);
await seed(page, { done: 14, progress: 2 });
await page.evaluate(() => CL.router.go('obras'));
await page.waitForTimeout(1200);
await page.evaluate(() => {
  window.__ev = [];
  for (const type of ['pointerdown', 'pointerup', 'pointercancel', 'click', 'contextmenu']) {
    document.addEventListener(type, (e) => {
      const tg = e.target.closest ? (e.target.closest('.gal-card, .btn, .modal-back') || e.target) : e.target;
      window.__ev.push(type + ':' + (tg.className && tg.className.baseVal === undefined ? String(tg.className).split(' ').slice(0, 2).join('.') : tg.tagName) + (tg.dataset && tg.dataset.id ? '#' + tg.dataset.id : '') + '@' + Math.round(performance.now()));
    }, true);
  }
});
for (let round = 0; round < 3; round++) {
  const card = page.locator('.gal-card').nth(round * 3 + 1);
  const id = await card.getAttribute('data-id');
  await card.click({ force: true });
  await page.waitForTimeout(700);
  const b = await page.locator('.gv-del').boundingBox();
  const x = b.x + b.width / 2, y = b.y + b.height / 2;
  const under = await page.evaluate(([x, y]) => {
    const els = document.elementsFromPoint(x, y);
    const c = els.find((e) => e.classList && e.classList.contains('gal-card'));
    return c ? c.dataset.id : null;
  }, [x, y]);
  await page.evaluate(() => { window.__ev = []; });
  if (useMouse) {
    await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(1600); await page.mouse.up();
  } else {
    await touchStart(page, [{ x, y }]); await page.waitForTimeout(1600); await touches(page, []);
  }
  await page.waitForTimeout(900);
  const r = await page.evaluate((id) => ({
    ev: window.__ev,
    modal: document.querySelectorAll('.modal-back').length,
    deletedCardGone: !document.querySelector(`.gal-card[data-id="${id}"]`),
  }), id);
  console.log(`ronda ${round}: borrada ${id}, tarjeta debajo del botón borrar: ${under}`, JSON.stringify(r));
  await shot(page, `galeria/borrar-${size}${useMouse ? '-mouse' : ''}-ronda${round}`);
  if (r.modal) { await page.keyboard.press('Escape'); await page.waitForTimeout(400); }
}
console.log('errores', JSON.stringify(t.errors.filter((x) => !/icons\/.*\.png/.test(x))));
await t.close();
