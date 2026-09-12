// Pérdida de datos: pintar y recargar/volver/cerrar enseguida (antes del autoguardado de 800 ms).
import path from 'node:path'; import fs from 'node:fs'; import os from 'node:os';
import { launch, appUrl, shot, ready, P, hit, hitSel, paintAt, samplePaint, filterErrors } from './common.mjs';
const size = process.argv[2] || 'tablet';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cl-rev-'));
const res = {};
const works = (page) => page.evaluate(async () => (await CL.db.works.list({ kind: 'colorear' })).map((w) => ({ id: w.id, s: w.source, st: w.status, p: w.paint && w.paint.size })));
let t = await launch({ size, persistent: profile });
let page = t.page;

// 1) Balde y recarga a los 150 ms
await page.goto(appUrl('colorear/vaca')); await ready(page); await page.waitForTimeout(300);
await hitSel(t, '.cl-sw[aria-label="Azul"]');
await paintAt(t, 0.08, 0.08, 150);
res.s1before = await samplePaint(page, [[0.08, 0.08]]);
await page.reload(); await ready(page); await page.waitForTimeout(400);
res.s1afterReload = await samplePaint(page, [[0.08, 0.08]]);
res.w1 = await works(page);

// 2) Balde y botón volver a los 100 ms
await hitSel(t, '.cl-sw[aria-label="Rojo"]');
await paintAt(t, 0.65, 0.57, 100);
await hitSel(t, '.cl-bar .btn-back');
await page.waitForTimeout(800);
res.hash2 = await page.evaluate(() => location.hash);
res.w2 = await works(page);
await page.goto(appUrl('colorear/vaca')); await ready(page); await page.waitForTimeout(300);
res.s2 = await samplePaint(page, [[0.08, 0.08], [0.65, 0.57]]);

// 3) Balde y cerrar el navegador enseguida (sin esperar)
await hitSel(t, '.cl-sw[aria-label="Amarillo"]');
await paintAt(t, 0.29, 0.28, 120);
await t.close();
t = await launch({ size, persistent: profile }); page = t.page;
await page.goto(appUrl('colorear/vaca')); await ready(page); await page.waitForTimeout(400);
res.s3 = await samplePaint(page, [[0.08, 0.08], [0.65, 0.57], [0.29, 0.28]]);

// 4) ¡Terminé! tocado 4 veces seguidas
await hitSel(t, '.cl-sw[aria-label="Verde"]'); await paintAt(t, 0.31, 0.46, 350);
const r4 = await page.locator('.cl-done').boundingBox();
res.t4 = [];
const t0 = Date.now();
for (let i = 0; i < 4; i++) { await hit(t, r4.x + r4.width / 2, r4.y + r4.height / 2); await page.waitForTimeout(60); res.t4.push([Date.now() - t0, await page.evaluate(() => location.hash + ' celebr=' + !!document.querySelector('.celebrate'))]); }
await page.waitForTimeout(300);
await shot(page, `colorear/datos-${size}-festejo`);
await page.waitForTimeout(2500);
res.hash4 = await page.evaluate(() => location.hash);
res.w4 = await works(page);
// 5) Volver a abrir el dibujo: empieza en blanco
await page.goto(appUrl('colorear/vaca')); await ready(page); await page.waitForTimeout(300);
res.s5blank = await samplePaint(page, [[0.08, 0.08]]);
res.w5 = await works(page);
// 6) Tocar Terminé sin pintar, luego abrir la obra terminada desde su id y pintar: sigue 'done' y no se duplica
const doneId = res.w4.find((w) => w.st === 'done')?.id;
await page.goto(appUrl('colorear/vaca/' + doneId)); await ready(page); await page.waitForTimeout(300);
res.s6 = await samplePaint(page, [[0.08, 0.08]]);
await hitSel(t, '.cl-sw[aria-label="Negro"]'); await paintAt(t, 0.5, 0.95, 1300);
res.w6 = await works(page);
console.log(JSON.stringify(res, null, 1));
console.log('errores', JSON.stringify(filterErrors(t.errors)));
await t.close();

