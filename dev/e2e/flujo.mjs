// Prueba de punta a punta (integración):
//  1. Subir una imagen (página para colorear sintética) → se limpia a B/N → se guarda en "Mis dibujos".
//  2. Pintar un poco (balde + pincel) → autoguardado.
//  3. Recargar la página → la pintura y la imagen siguen ahí.
//  4. ¡Terminé! → galería con la obra; descargar PNG.
//  5. Pizarra: dibujar, recargar, sigue.
// Uso: cd dev && node e2e/flujo.mjs [tablet|desktop|phone]
import path from 'node:path';
import fs from 'node:fs';
import { launch, appUrl, shot, stroke, tap, DEV } from '../lib.mjs';

const size = process.argv[2] || 'tablet';
const OUT = `e2e/${size}`;
const t = await launch({ size });
const { page } = t;
const log = (...a) => console.log('•', ...a);
const touch = t.size.touch ? 'touch' : 'mouse';

// Imagen de prueba: página para colorear con luz despareja (como foto de un papel).
const pngPath = path.join(DEV, 'e2e', 'pagina-prueba.png');
if (!fs.existsSync(pngPath)) {
  const g = await launch({ size: { width: 400, height: 300, dpr: 1 } });
  const data = await g.page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 1600; c.height = 1200;
    const x = c.getContext('2d');
    const grd = x.createLinearGradient(0, 0, 1600, 1200);
    grd.addColorStop(0, '#f4f1ea'); grd.addColorStop(1, '#b9b3a6');
    x.fillStyle = grd; x.fillRect(0, 0, 1600, 1200);
    x.strokeStyle = '#1d1d1d'; x.lineWidth = 14; x.lineJoin = 'round';
    x.beginPath(); x.arc(800, 600, 380, 0, Math.PI * 2); x.stroke();          // cara
    x.beginPath(); x.arc(660, 500, 60, 0, Math.PI * 2); x.stroke();           // ojo
    x.beginPath(); x.arc(940, 500, 60, 0, Math.PI * 2); x.stroke();           // ojo
    x.beginPath(); x.moveTo(620, 720); x.quadraticCurveTo(800, 880, 980, 720); x.closePath(); x.stroke(); // boca
    x.strokeRect(120, 120, 240, 240);                                          // cuadrado
    return c.toDataURL('image/png');
  });
  fs.writeFileSync(pngPath, Buffer.from(data.split(',')[1], 'base64'));
  await g.close();
}

await page.goto(appUrl('inicio'));
await page.waitForTimeout(600);
await shot(page, `${OUT}/01-inicio`);

// 1. Subir
await page.goto(appUrl('subir'));
await page.waitForTimeout(500);
const input = page.locator('input[type=file]').first();
await input.setInputFiles(pngPath);
await page.waitForTimeout(1500);
await shot(page, `${OUT}/02-subir-preview`);
const uploadsBefore = await page.evaluate(async () => (await CL.db.uploads.list()).length);
// El botón de guardar es el botón verde (.btn-go) visible.
await page.locator('.screen--subir .btn-go').first().click();
await page.waitForFunction(() => location.hash.startsWith('#colorear/u-'), null, { timeout: 15000 });
await page.waitForTimeout(2500);
const uploads = await page.evaluate(async () => (await CL.db.uploads.list()).map((u) => ({ id: u.id, w: u.w, h: u.h })));
log('uploads', uploadsBefore, '→', uploads.length, JSON.stringify(uploads[0]));
await shot(page, `${OUT}/03-colorear-subida`);

// 2. Pintar: tocar el centro del lienzo (balde) y un trazo de pincel.
const cv = await page.locator('.screen--colorear canvas').first().boundingBox();
log('canvas', JSON.stringify(cv));
await tap(page, cv.x + cv.width * 0.5, cv.y + cv.height * 0.35, { pointer: touch });
await page.waitForTimeout(600);
await tap(page, cv.x + cv.width * 0.05, cv.y + cv.height * 0.05, { pointer: touch });
await page.waitForTimeout(1800);
await shot(page, `${OUT}/04-pintado`);
const hash = await page.evaluate(() => location.hash);
const works1 = await page.evaluate(async () => (await CL.db.works.list()).map((w) => ({ id: w.id, kind: w.kind, source: w.source, status: w.status })));
log('obras tras pintar', JSON.stringify(works1));

// 3. Recargar
await page.reload();
await page.waitForTimeout(3000);
await shot(page, `${OUT}/05-tras-recargar`);
log('hash tras recargar', await page.evaluate(() => location.hash), '(antes', hash + ')');

// Catálogo "Mis dibujos"
await page.goto(appUrl('dibujos/mis'));
await page.waitForTimeout(1200);
await shot(page, `${OUT}/06-mis-dibujos`);

// 4. Volver a colorear y terminar
await page.goto(appUrl(hash.slice(1)));
await page.waitForTimeout(2500);
const fin = page.locator('.screen--colorear .btn-go').first();
if (await fin.count()) {
  await fin.click();
  await page.waitForTimeout(900);
  await shot(page, `${OUT}/07-festejo`);
  await page.waitForFunction(() => location.hash.startsWith('#obras'), null, { timeout: 15000 });
  await page.waitForTimeout(1200);
  await shot(page, `${OUT}/08-galeria`);
} else log('NO se encontró el botón ¡Terminé! (.btn-go)');
const works2 = await page.evaluate(async () => (await CL.db.works.list()).map((w) => ({ kind: w.kind, status: w.status })));
log('obras tras terminar', JSON.stringify(works2));

// 5. Pizarra
await page.goto(appUrl('pizarra'));
await page.waitForTimeout(1200);
const pz = await page.locator('.screen--pizarra canvas').last().boundingBox();
await stroke(page, [[pz.x + pz.width * 0.2, pz.y + pz.height * 0.3], [pz.x + pz.width * 0.5, pz.y + pz.height * 0.7], [pz.x + pz.width * 0.8, pz.y + pz.height * 0.3]], { pointer: touch, steps: 30 });
await page.waitForTimeout(1800);
await page.reload();
await page.waitForTimeout(2000);
await shot(page, `${OUT}/09-pizarra-tras-recargar`);

console.log('ERRORES:', t.errors.length ? '\n' + t.errors.join('\n') : 'ninguno');
await t.close();
