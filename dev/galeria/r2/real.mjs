// Revisión 1: obras REALES (colorear, pizarra, neón, imagen subida) en un perfil persistente,
// recarga (¿todo sigue ahí?), descargas PNG de cada tipo y respaldo cuando exportPNG falla.
// Uso: cd dev && node galeria/r2-real.mjs
import fs from 'node:fs';
import path from 'node:path';
import { launch, appUrl, shot, SHOTS } from '../../lib.mjs';
import { ok, clean, state, dbWorks, instrument, makeReal, seedSynthetic, freshProfile, center } from './lib.mjs';

const OUT = 'galeria/r2';
const profile = freshProfile();
let t = await launch({ size: 'desktop', persistent: profile });
let page = t.page;
await page.addInitScript(instrument);
const real = await makeReal(page, appUrl);
console.log('reales', real);

// Imagen subida + obra terminada de esa imagen (y otra con una subida que ya no existe → exportPNG falla)
const up = await page.evaluate(async () => {
  const U = CL.util;
  const c = U.canvas(600, 800); const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, 600, 800);
  x.strokeStyle = '#000'; x.lineWidth = 18; x.strokeRect(60, 60, 480, 680);
  x.beginPath(); x.arc(300, 400, 160, 0, 7); x.stroke();
  const blob = await U.canvasToBlob(c, 'image/png');
  const u = await CL.db.uploads.save({ w: 600, h: 800, blob, thumb: blob });
  // pintura: medio círculo rojo
  const p = U.canvas(600, 800); const px = p.getContext('2d'); px.fillStyle = '#ff5a5f'; px.fillRect(0, 0, 600, 400);
  const thumbC = U.thumbnail(c, 480); thumbC.getContext('2d').globalAlpha = 0.5;
  const thumb = await U.canvasToBlob(thumbC, 'image/jpeg', 0.8);
  const w1 = await CL.db.works.save({ kind: 'colorear', source: 'u-' + u.id, status: 'done', w: 600, h: 800, paint: await U.canvasToBlob(p, 'image/png'), thumb, meta: {} });
  const w2 = await CL.db.works.save({ kind: 'colorear', source: 'u-noexiste', status: 'done', w: 600, h: 800, paint: null, thumb, meta: {} });
  return { up: u.id, work: w1.id, broken: w2.id };
});
await seedSynthetic(page, { done: 8, progress: 2, tag: 'S' });
const before = await dbWorks(page);
console.log('obras', before.length, JSON.stringify(before.map((w) => w.kind + '/' + w.source + '/' + w.status)));

// Recargar el navegador entero (cerrar y abrir con el mismo perfil) → todo sigue.
await t.close();
t = await launch({ size: 'desktop', persistent: profile });
page = t.page;
await page.addInitScript(instrument);
await page.goto(appUrl('obras'));
await page.waitForTimeout(1500);
const after = await dbWorks(page);
ok(after.length === before.length, `tras cerrar y abrir el navegador siguen las ${before.length} obras (${after.length})`);
const counts = await page.evaluate(() => [...document.querySelectorAll('.gal-count')].map((e) => e.textContent));
const nDone = before.filter((w) => w.status === 'done').length, nProg = before.length - nDone;
ok(counts[0] === String(nDone) && counts[1] === String(nProg), `contadores de pestañas ${counts} (esperado ${nDone},${nProg})`);
await shot(page, `${OUT}/real-grilla-desktop`);

// Descargas de cada tipo
const dl = async (id, name) => {
  await page.locator(`.gal-card[data-id="${id}"]`).scrollIntoViewIfNeeded();
  await page.locator(`.gal-card[data-id="${id}"]`).click();
  await page.waitForTimeout(1600);
  await shot(page, `${OUT}/real-vista-${name}`);
  const info = await page.evaluate(() => { const i = document.querySelector('.gv-img'); const r = i.getBoundingClientRect(); return { nw: i.naturalWidth, nh: i.naturalHeight, w: Math.round(r.width), h: Math.round(r.height), hi: i.src.startsWith('blob:') }; });
  let file = null, fname = null, err = null;
  try {
    const [d] = await Promise.all([page.waitForEvent('download', { timeout: 12000 }), page.locator('.gv-down').click()]);
    fname = d.suggestedFilename();
    file = path.join(SHOTS, OUT, 'dl-' + name + '.png');
    await d.saveAs(file);
  } catch (e) { err = String(e).slice(0, 120); }
  let res = { name, fname, err, info };
  if (file) {
    const buf = fs.readFileSync(file);
    res.png = buf.slice(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    res.dim = buf.readUInt32BE(16) + 'x' + buf.readUInt32BE(20);
    res.bytes = buf.length;
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  console.log('descarga', JSON.stringify(res));
  return res;
};
const rc = await dl(real.colorearDone, 'colorear');
ok(rc.png && /^colorinche-vaca-\d{4}-\d\d-\d\d\.png$/.test(rc.fname), 'descarga colorear PNG con nombre ' + rc.fname + ' ' + rc.dim);
const rp = await dl(real.pizarraDone, 'pizarra');
ok(rp.png && /^colorinche-pizarra-/.test(rp.fname), 'descarga pizarra PNG ' + rp.fname + ' ' + rp.dim);
const rn = await dl(real.neonDone, 'neon');
ok(rn.png && /^colorinche-neon-/.test(rn.fname), 'descarga neón PNG ' + rn.fname + ' ' + rn.dim);
const ru = await dl(up.work, 'subida');
ok(ru.png, 'descarga de una imagen subida PNG ' + ru.fname + ' ' + ru.dim);
const rb = await dl(up.broken, 'rota');
ok(rb.png, 'descarga de obra cuyo exportPNG falla (JPEG→PNG de respaldo) ' + rb.fname + ' ' + rb.dim);

// Seguir en la subida → colorear/u-<id>/<workId>
await page.locator(`.gal-card[data-id="${up.work}"]`).click();
await page.waitForTimeout(700);
await page.locator('.gv-go').click();
await page.waitForTimeout(2500);
const hs = (await state(page)).hash;
ok(hs === `#colorear/u-${up.up}/${up.work}`, 'seguir una imagen subida abre colorear/u-<id>/<obra> ' + hs);
await shot(page, `${OUT}/real-seguir-subida`);
await page.goBack();
await page.waitForTimeout(1500);
const s2 = await state(page);
ok(s2.hash === '#obras' && s2.modal === 0, 'atrás desde colorear → galería ' + JSON.stringify(s2));
// ¿la obra sigue igual (no se duplicó, sigue done)?
const w2 = (await dbWorks(page)).filter((w) => w.source === 'u-' + up.up);
ok(w2.length === 1 && w2[0].status === 'done', 'seguir+volver no duplica ni cambia estado ' + JSON.stringify(w2));

await page.evaluate(() => CL.router.go('inicio'));
await page.waitForTimeout(900);
const live = await page.evaluate(() => window.__liveUrls());
ok(live <= 1, 'URLs de blob vivas al volver al inicio: ' + live);
ok(clean(t.errors).length === 0, 'sin errores de consola ' + JSON.stringify(clean(t.errors)).slice(0, 400));
await t.close();
