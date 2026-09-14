// Etapa 1–2: pantalla de elegir y vista previa en varios tamaños.
//   node subir/ver.mjs [tamaño ...]
import path from 'node:path';
import { launch, appUrl, shot, DEV } from '../lib.mjs';

const IMG = (f) => path.join(DEV, 'subir', 'img', f);
const sizes = process.argv.slice(2).length ? process.argv.slice(2) : ['desktop', 'tablet', 'phone'];
const report = {};

for (const size of sizes) {
  const t = await launch({ size });
  const { page } = t;
  await page.goto(appUrl('subir'));
  await page.waitForTimeout(700);
  await shot(page, `subir/${size}-1-elegir`);

  // Página fotografiada con sombra
  await page.setInputFiles('.screen--subir .up-input:not([capture])', IMG('pagina-sombra.jpg'));
  await page.waitForFunction(() => CL.upload.debug() && CL.upload.debug().view === 'edit' && CL.upload.debug().renders > 0);
  await page.waitForTimeout(450);
  const d1 = await page.evaluate(() => CL.upload.debug());
  await shot(page, `subir/${size}-2-pagina`);

  // Foto con colores (modo automático)
  await page.click('.up-bar .btn-back');
  await page.waitForTimeout(200);
  await page.setInputFiles('.screen--subir .up-input:not([capture])', IMG('foto-color.jpg'));
  await page.waitForFunction(() => CL.upload.debug().view === 'edit');
  await page.waitForTimeout(450);
  const d2 = await page.evaluate(() => CL.upload.debug());
  await shot(page, `subir/${size}-3-foto`);
  report[size] = { pagina: d1, foto: d2, errors: t.errors };
  await t.close();
}
console.log(JSON.stringify(report, null, 1));
