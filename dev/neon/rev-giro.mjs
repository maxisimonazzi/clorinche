// Revisión neón: girar el celular a mitad del trazo y después; qué queda en miniatura y exportación.
import { launch, appUrl, shot, rect, saveDataUrl, SHOTS } from '../lib.mjs';
import path from 'node:path';

const t = await launch({ size: 'phone' });
const { page } = t;
const out = {};
const ready = () => page.waitForFunction(() => CL.neon && CL.neon.debug && CL.neon.debug.ready);
const cdp = await page.context().newCDPSession(page);
const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
const dbg = () => page.evaluate(() => CL.neon.debug);

await page.goto(appUrl('neon'));
await ready();
await page.locator('.neon-mirror').nth(2).click(); // 4
await page.locator('.neon-swatch').nth(1).click();
let r = await rect(page, '.neon-stage');

// 1) Trazo en vertical que sigue mientras se gira.
await touch('touchStart', [{ x: r.x + r.width * 0.6, y: r.y + r.height * 0.3, id: 1 }]);
for (let i = 1; i <= 15; i++) { await touch('touchMove', [{ x: r.x + r.width * (0.6 + i * 0.015), y: r.y + r.height * (0.3 + i * 0.01), id: 1 }]); await page.waitForTimeout(16); }
await shot(page, 'neon/rev/giro/1-vertical-durante');
await page.setViewportSize({ width: 844, height: 390 });
await page.waitForTimeout(250);
out.durGiro = await dbg();
r = await rect(page, '.neon-stage');
for (let i = 1; i <= 15; i++) { await touch('touchMove', [{ x: r.x + r.width * (0.6 + i * 0.01), y: r.y + r.height * (0.5 + i * 0.02), id: 1 }]); await page.waitForTimeout(16); }
await shot(page, 'neon/rev/giro/2-horizontal-sigue-el-dedo');
await touch('touchEnd', []);
await page.waitForTimeout(200);
await shot(page, 'neon/rev/giro/3-horizontal-soltado');

// 2) Dibujo en horizontal cerca de los bordes izquierdo y derecho (fuera de lo que se ve en vertical).
await page.locator('.neon-mirror').nth(0).click();
await page.locator('.neon-swatch').nth(3).click();
r = await rect(page, '.neon-stage');
const line = async (pts) => {
  await touch('touchStart', [{ x: pts[0][0], y: pts[0][1], id: 1 }]);
  for (const [x, y] of pts.slice(1)) { await touch('touchMove', [{ x, y, id: 1 }]); await page.waitForTimeout(12); }
  await touch('touchEnd', []);
};
const vline = (fx) => { const p = []; for (let i = 0; i <= 12; i++) p.push([r.x + r.width * fx, r.y + r.height * (0.15 + 0.7 * i / 12)]); return p; };
await line(vline(0.05)); await line(vline(0.95));
await page.waitForTimeout(2600);
await shot(page, 'neon/rev/giro/4-horizontal-bordes');

// 3) Volver a vertical, dibujar algo y esperar el guardado: ¿qué muestra la miniatura/exportación?
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
await shot(page, 'neon/rev/giro/5-vertical-otra-vez');
r = await rect(page, '.neon-stage');
await line([[r.x + r.width * 0.3, r.y + r.height * 0.8], [r.x + r.width * 0.7, r.y + r.height * 0.85]]);
await page.waitForTimeout(3000);
const res = await page.evaluate(async () => {
  const w = (await CL.db.works.list({ kind: 'neon' }))[0];
  const b = await CL.neon.exportPNG(w);
  const toUrl = (blob) => new Promise((res) => { const f = new FileReader(); f.onload = () => res(f.result); f.readAsDataURL(blob); });
  const img = await CL.util.blobToImage(b);
  return { meta: w.meta, exp: [img.width, img.height], expUrl: await toUrl(b), thUrl: await toUrl(w.thumb), paint: [w.w, w.h] };
});
saveDataUrl(res.expUrl, path.join(SHOTS, 'neon', 'rev', 'giro', '6-export.png'));
saveDataUrl(res.thUrl, path.join(SHOTS, 'neon', 'rev', 'giro', '7-thumb.png'));
out.guardado = { meta: res.meta, exp: res.exp, paint: res.paint };
out.final = await dbg();
out.errors = t.errors;
console.log(JSON.stringify(out, null, 1));
await t.close();
