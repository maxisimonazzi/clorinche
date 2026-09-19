// Corrección — arcoíris: cada puntito (toque sin mover) sale de otro color; y festejo sobre el neón.
// node neon/fix-toques.mjs [size]
import { launch, appUrl, shot, multiStroke, rect } from '../lib.mjs';

const size = process.argv[2] || 'tablet';
const t = await launch({ size });
const { page } = t;
await page.goto(appUrl('neon'));
await page.waitForFunction(() => CL.neon && CL.neon.debug && CL.neon.debug.ready);
const cdp = await page.context().newCDPSession(page);
const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
const r = await rect(page, '.neon-stage');
const X = (f) => r.x + r.width * f, Y = (f) => r.y + r.height * f;

await page.locator('.neon-swatch--rainbow').click();
await page.locator('.neon-size').nth(3).click();
const pts = [];
for (let i = 0; i < 25; i++) {
  const p = { x: X(0.1 + (i % 5) * 0.2), y: Y(0.1 + Math.floor(i / 5) * 0.2) };
  pts.push(p);
  await touch('touchStart', [{ ...p, id: 1 }]);
  await touch('touchEnd', []);
  await page.waitForTimeout(25);
}
await page.waitForTimeout(300);
await shot(page, `neon/fix/toques/${size}-1-toques`);

// Tono de cada puntito (se mira un anillo del halo, donde el color está saturado).
const hues = await page.evaluate(({ pts, sr }) => {
  const c = document.querySelector('.neon-paint:not(.neon-ghost)');
  const cr = c.getBoundingClientRect();
  const g = c.getContext('2d');
  const kx = c.width / cr.width, ky = c.height / cr.height;
  return pts.map((p) => {
    let best = null;
    for (const dx of [8, 10, 12, 14]) {
      const x = Math.round((p.x - cr.left + dx) * kx), y = Math.round((p.y - cr.top) * ky);
      const [R, G, B, A] = g.getImageData(x, y, 1, 1).data;
      if (A < 40) continue;
      const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
      if (mx - mn < 40) continue;
      let h;
      if (mx === R) h = ((G - B) / (mx - mn)) % 6; else if (mx === G) h = (B - R) / (mx - mn) + 2; else h = (R - G) / (mx - mn) + 4;
      best = Math.round((h * 60 + 360) % 360);
      break;
    }
    return best;
  });
}, { pts, sr: 0 });
const buckets = new Set(hues.filter((h) => h != null).map((h) => Math.round(h / 30) % 12));
console.log('tonos de los puntitos', JSON.stringify(hues));
console.log('grupos de color distintos (de 12):', buckets.size, buckets.size >= 6 ? 'OK' : 'FALLA');

// Festejo sobre la pantalla oscura.
await multiStroke(page, [[[X(0.2), Y(0.5)], [X(0.5), Y(0.4)], [X(0.8), Y(0.55)]]], { steps: 30, delay: 5 });
await page.waitForTimeout(300);
await page.locator('.neon-done').click();
await page.waitForTimeout(900);
await shot(page, `neon/fix/toques/${size}-2-festejo`);
const bg = await page.evaluate(() => {
  const c = document.querySelector('.celebrate');
  return c ? getComputedStyle(c).backgroundImage.slice(0, 90) : null;
});
console.log('fondo del festejo', bg);
await page.waitForFunction(() => document.body.dataset.screen === 'obras', null, { timeout: 8000 });
console.log('errors', t.errors);
await t.close();
