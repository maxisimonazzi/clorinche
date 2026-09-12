// (corrección 1) Ventana de pérdida: balde y recarga a distintos tiempos; y balde + cerrar sólo la pestaña.
import path from 'node:path'; import fs from 'node:fs'; import os from 'node:os';
import { launch, appUrl, ready, hitSel, paintAt, samplePaint } from './common.mjs';
const size = process.argv[2] || 'tablet';
const res = [];
for (const delay of (process.argv[3] || '0,30,100,250,400,800,1400').split(',').map(Number)) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cl-win-'));
  const t = await launch({ size, persistent: profile });
  await t.page.goto(appUrl('colorear/vaca')); await ready(t.page); await t.page.waitForTimeout(300);
  await hitSel(t, '.cl-sw[aria-label="Azul"]');
  await paintAt(t, 0.08, 0.08, delay);
  await t.page.reload(); await ready(t.page); await t.page.waitForTimeout(300);
  const s = await samplePaint(t.page, [[0.08, 0.08]]);
  res.push(['recarga a ' + delay + ' ms', s[0][3] ? 'GUARDADO' : 'PERDIDO']);
  await t.close();
}
// cerrar sólo la pestaña (el navegador sigue abierto) 200 ms después del balde
{
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cl-win-'));
  const t = await launch({ size, persistent: profile });
  await t.page.goto(appUrl('colorear/vaca')); await ready(t.page); await t.page.waitForTimeout(300);
  await hitSel(t, '.cl-sw[aria-label="Azul"]');
  await paintAt(t, 0.08, 0.08, 200);
  const p2 = await t.context.newPage();
  await t.page.close({ runBeforeUnload: true });
  await p2.waitForTimeout(2500);
  await p2.goto(appUrl('colorear/vaca'));
  await p2.waitForFunction(() => !!document.querySelector('.screen--colorear.cl-ready'), null, { timeout: 15000 });
  await p2.waitForTimeout(300);
  const s = await p2.evaluate(() => { const c = CL.coloring.screen.painter.canvas; return c.getContext('2d').getImageData(Math.round(c.width * 0.08), Math.round(c.height * 0.08), 1, 1).data[3]; });
  res.push(['cerrar pestaña a 200 ms', s ? 'GUARDADO' : 'PERDIDO']);
  await t.close();
}
console.log(size, JSON.stringify(res));


