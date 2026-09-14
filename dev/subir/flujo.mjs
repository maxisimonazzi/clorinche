// Etapa 3: guardar, IndexedDB, recargar, imagen enorme, EXIF, transparente, rota, rotar y "ver original".
//   node subir/flujo.mjs [tamaño]
import path from 'node:path';
import { launch, appUrl, shot, DEV } from '../lib.mjs';

const size = process.argv[2] || 'desktop';
const IMG = (f) => path.join(DEV, 'subir', 'img', f);
const INPUT = '.screen--subir .up-input:not([capture])';
const t = await launch({ size });
const { page } = t;
const out = { size };
const ok = (name, cond, extra) => { out[name] = cond ? 'OK' : 'FALLA ' + JSON.stringify(extra ?? ''); };

async function load(file) {
  await page.evaluate(() => CL.router.current && CL.router.current.name !== 'subir' && CL.router.go('subir'));
  await page.waitForFunction(() => CL.upload.debug());
  const back = page.locator('.up-bar .btn-back');
  if (await back.isVisible()) { await back.click(); await page.waitForTimeout(150); }
  const before = await page.evaluate(() => CL.upload.debug().renders);
  await page.setInputFiles(INPUT, IMG(file));
  await page.waitForFunction((b) => CL.upload.debug().view === 'edit' && CL.upload.debug().renders > b && !CL.upload.debug().busy, before, { timeout: 30000 });
  await page.waitForTimeout(350);
}

/** Analiza un upload guardado: sólo 0/255, opaco, tamaño. */
const inspect = (id) => page.evaluate(async (id) => {
  const up = await CL.db.uploads.get(id);
  if (!up) return null;
  const img = await createImageBitmap(up.blob);
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  let gray = 0, transp = 0, black = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] !== 255) transp++;
    const r = d[i], g = d[i + 1], b = d[i + 2];
    if (!((r === 0 && g === 0 && b === 0) || (r === 255 && g === 255 && b === 255))) gray++;
    if (r === 0) black++;
  }
  const th = await createImageBitmap(up.thumb);
  return { type: up.blob.type, w: up.w, h: up.h, imgW: img.width, imgH: img.height, gray, transp,
    blackPct: +(100 * black / (d.length / 4)).toFixed(2), thumb: [th.width, th.height], bytes: up.blob.size };
}, id);

await page.goto(appUrl('subir'));
await page.waitForTimeout(500);
await page.evaluate(async () => { for (const u of await CL.db.uploads.list()) await CL.db.uploads.remove(u.id); });

// 1) Página con sombra: subir sensibilidad con "+", guardar.
await load('pagina-sombra.jpg');
const lvl0 = await page.evaluate(() => CL.upload.debug().level);
await page.click('.up-more');
await page.click('.up-more');
const lvl = await page.evaluate(() => CL.upload.debug().level);
ok('mas-sube-nivel', lvl === Math.min(100, lvl0 + 16), { lvl0, lvl });
await page.waitForTimeout(200);
await shot(page, `subir/${size}-4-nivel-mas`);
await page.click('.up-save');
await page.waitForTimeout(250);
await shot(page, `subir/${size}-5-guardando`);
await page.waitForSelector('.toast.in', { timeout: 15000 });
await page.waitForTimeout(250);
await shot(page, `subir/${size}-5b-festejo`);
await page.waitForFunction(() => /^#colorear\/u-/.test(location.hash), null, { timeout: 15000 });
const id1 = await page.evaluate(() => location.hash.replace('#colorear/u-', ''));
await page.waitForTimeout(1500);
await shot(page, `subir/${size}-5c-colorear`); // integración: pantalla del módulo colorear (otro agente)
out.pantallaTrasGuardar = await page.evaluate(() => document.body.dataset.screen);
const r1 = await inspect(id1);
out.pagina = r1;
ok('pagina-bn-puro', r1 && r1.gray === 0 && r1.transp === 0 && r1.type === 'image/png', r1);
ok('pagina-tamano', r1 && r1.w === 1600 && r1.h === 1200 && r1.imgW === 1600, r1);
ok('pagina-miniatura', r1 && Math.max(...r1.thumb) === 320, r1 && r1.thumb);

// 2) Enorme 4000x3000 -> 2048x1536.
await load('enorme.jpg');
out.enormeDebug = await page.evaluate(() => CL.upload.debug());
await page.click('.up-save');
await page.waitForFunction((prev) => /^#colorear\/u-/.test(location.hash) && location.hash !== prev, '#colorear/u-' + id1, { timeout: 20000 });
const id2 = await page.evaluate(() => location.hash.replace('#colorear/u-', ''));
const r2 = await inspect(id2);
out.enorme = r2;
ok('enorme-achicada', r2 && r2.w === 2048 && r2.h === 1536 && r2.gray === 0 && r2.transp === 0, r2);

// 3) Recargar y comprobar que siguen ahí.
await page.reload();
await page.waitForTimeout(800);
const list = await page.evaluate(async () => (await CL.db.uploads.list()).map((u) => u.id));
ok('persisten-tras-recargar', list.includes(id1) && list.includes(id2), list);
const r1b = await inspect(id1);
ok('blob-intacto-tras-recargar', r1b && r1b.gray === 0 && r1b.w === 1600 && r1b.bytes === r1.bytes, r1b);

// 4) EXIF orientación 6: 800x600 guardado -> se ve 600x800 con la flecha hacia abajo.
await load('exif6.jpg');
const dx = await page.evaluate(() => CL.upload.debug());
// 800x600 con EXIF 6 -> vertical 3:4 (agrandada a lado mayor 1400 por ser chica).
ok('exif-orientacion', dx.src[1] === 1400 && Math.abs(dx.src[0] / dx.src[1] - 0.75) < 0.01, dx.src);
await shot(page, `subir/${size}-6-exif`);

// 5) Rotar 90°.
await page.click('.up-rotate');
await page.waitForTimeout(450);
const dr = await page.evaluate(() => CL.upload.debug());
ok('rotar', dr.src[0] === dx.src[1] && dr.src[1] === dx.src[0], dr.src);
await shot(page, `subir/${size}-7-rotada`);

// 6) Transparente: debe quedar líneas negras sobre blanco (no todo negro).
await load('transparente.png');
const blackT = await page.evaluate(() => {
  const c = document.querySelector('.up-out');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let b = 0; for (let i = 0; i < d.length; i += 4) if (d[i] === 0) b++;
  return +(100 * b / (d.length / 4)).toFixed(2);
});
ok('transparente-ok', blackT > 1 && blackT < 25, blackT);

// 7) Foto: modo automático, cambio de modo y "ver original".
await load('foto-color.jpg');
const df = await page.evaluate(() => CL.upload.debug());
ok('foto-modo-auto', df.mode === 'photo', df.mode);
const eye = await page.locator('.up-eye').boundingBox();
await page.mouse.move(eye.x + eye.width / 2, eye.y + eye.height / 2);
await page.mouse.down();
await page.waitForTimeout(250);
const showing = await page.evaluate(() => document.querySelector('.up-paper').classList.contains('show-orig'));
await shot(page, `subir/${size}-8-ver-original`);
await page.mouse.up();
await page.waitForTimeout(200);
const hidden = await page.evaluate(() => !document.querySelector('.up-paper').classList.contains('show-orig'));
ok('ver-original', showing && hidden, { showing, hidden });
await page.click('.up-mode >> nth=0');
await page.waitForTimeout(300);
ok('cambiar-modo', (await page.evaluate(() => CL.upload.debug().mode)) === 'page');
await shot(page, `subir/${size}-9-foto-en-modo-pagina`);
await page.click('.up-thick');
await page.waitForTimeout(250);
ok('engrosar-apagado', (await page.evaluate(() => CL.upload.debug().thick)) === false);
await page.click('.up-thick');

// 8) Archivo roto: burbuja de error y sigue en elegir.
await page.click('.up-bar .btn-back');
await page.waitForTimeout(150);
await page.setInputFiles(INPUT, IMG('rota.jpg'));
await page.waitForTimeout(700);
const err = await page.evaluate(() => ({ view: CL.upload.debug().view, err: !document.querySelector('.up-err').hidden }));
ok('error-visual', err.view === 'pick' && err.err, err);
await shot(page, `subir/${size}-10-error`);

// 9) Volver sin guardar no crea nada.
const n0 = await page.evaluate(async () => (await CL.db.uploads.list()).length);
await load('foto-color.jpg');
await page.click('.up-bar .btn-back');
await page.waitForTimeout(200);
const n1 = await page.evaluate(async () => (await CL.db.uploads.list()).length);
ok('cancelar-no-guarda', n0 === n1 && (await page.evaluate(() => CL.upload.debug().view)) === 'pick', { n0, n1 });

out.errors = t.errors;
console.log(JSON.stringify(out, null, 1));
await t.close();
