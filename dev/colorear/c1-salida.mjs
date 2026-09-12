// Cuánto tarda en cambiar de pantalla al tocar "volver" justo después de pintar (unmount espera el guardado).
import { launch, appUrl, ready, hitSel, paintAt, tap, P, filterErrors } from '../review-colorear/common.mjs';
const size = process.argv[2] || 'tablet';
const rate = +(process.argv[3] || 1);
const t = await launch({ size });
const { page } = t;
const cdp = await page.context().newCDPSession(page);
await page.goto(appUrl('colorear/vaca')); await ready(page); await page.waitForTimeout(400);
if (rate > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate });
const out = [];
for (let i = 0; i < 2; i++) {
  await paintAt(t, i ? 0.65 : 0.08, i ? 0.57 : 0.08, 300);
  const bb = await page.locator('.cl-bar .btn-back').boundingBox();
  const t0 = Date.now();
  await tap(page, bb.x + bb.width / 2, bb.y + bb.height / 2);
  await page.waitForFunction(() => !!document.querySelector('.screen--dibujos'), null, { timeout: 20000, polling: 16 });
  out.push(Date.now() - t0);
  await page.evaluate(() => CL.router.go('colorear/vaca')); await ready(page, 60000); await page.waitForTimeout(300);
}
console.log(size, 'cpu x' + rate, 'ms hasta ver el catálogo tras tocar volver:', JSON.stringify(out), JSON.stringify(filterErrors(t.errors)));
await t.close();
