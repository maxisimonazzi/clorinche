// Prueba del núcleo: arranque sin errores, router en file://, IndexedDB, botón de mantener apretado, festejo.
import { launch, appUrl, shot } from './lib.mjs';

const t = await launch({ size: 'tablet' });
const { page } = t;
await page.goto(appUrl());
await page.waitForTimeout(500);
const out = {};
out.screen = await page.evaluate(() => document.body.dataset.screen);
await page.evaluate(() => CL.router.go('obras'));
await page.waitForTimeout(200);
out.hashAfterGo = await page.evaluate(() => location.hash);
await page.evaluate(() => CL.router.back());
await page.waitForTimeout(300);
out.hashAfterBack = await page.evaluate(() => location.hash + ' screen=' + document.body.dataset.screen);
out.db = await page.evaluate(async () => {
  const w = await CL.db.works.save({ kind: 'pizarra', source: 'pizarra', paint: new Blob(['x']) });
  const p = await CL.db.works.findProgress('pizarra', 'pizarra');
  const l = await CL.db.works.list({ status: 'progress' });
  await CL.db.works.del(w.id);
  return { found: p && p.id === w.id, listed: l.length, after: (await CL.db.works.list()).length };
});
// Botón de mantener apretado
out.hold = await page.evaluate(async () => {
  let confirmed = 0;
  const b = CL.ui.holdButton({ onConfirm: () => confirmed++, duration: 600 });
  b.style.position = 'fixed'; b.style.left = '40px'; b.style.bottom = '40px';
  b.id = 'hb';
  document.body.append(b);
  window.__hold = () => confirmed;
  return true;
});
const bb = await page.locator('#hb').boundingBox();
await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
await page.mouse.down(); await page.waitForTimeout(150); await page.mouse.up();
await page.waitForTimeout(100);
out.afterShortTap = await page.evaluate(() => window.__hold() + ' hint=' + document.getElementById('hb').classList.contains('hint'));
await shot(page, 'core/hold-hint');
await page.mouse.down(); await page.waitForTimeout(350);
await shot(page, 'core/hold-progress');
await page.waitForTimeout(450); await page.mouse.up();
out.afterLongHold = await page.evaluate(() => window.__hold());
page.evaluate(() => CL.ui.celebrate());
await page.waitForTimeout(700);
await shot(page, 'core/celebrate');
await page.waitForTimeout(2500);
out.errors = t.errors;
console.log(JSON.stringify(out, null, 2));
await t.close();
