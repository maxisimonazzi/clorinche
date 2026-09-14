// Mide el tiempo de actualización de la vista previa al mover el deslizador.
import path from 'node:path';
import { launch, appUrl, DEV } from '../lib.mjs';
const t = await launch({ size: 'desktop' });
const { page } = t;
await page.goto(appUrl('subir'));
await page.waitForTimeout(300);
for (const f of ['pagina-sombra.jpg', 'foto-color.jpg']) {
  await page.setInputFiles('.screen--subir .up-input:not([capture])', path.join(DEV, 'subir', 'img', f));
  await page.waitForFunction(() => CL.upload.debug().view === 'edit' && CL.upload.debug().renders > 0);
  const first = await page.evaluate(() => CL.upload.debug().lastMs);
  const ms = [];
  for (const v of [30, 45, 60, 75, 90]) {
    await page.evaluate((v) => { const r = document.querySelector('.up-range'); r.value = v; r.dispatchEvent(new Event('input')); }, v);
    await page.waitForTimeout(150);
    ms.push(Math.round(await page.evaluate(() => CL.upload.debug().lastMs)));
  }
  console.log(f, 'primera', Math.round(first), 'deslizador', ms.join(' '));
  await page.click('.up-bar .btn-back');
}
console.log(t.errors);
await t.close();
