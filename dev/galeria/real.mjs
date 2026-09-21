// QA galería con obras REALES creadas por los módulos (colorear, pizarra, neón) + "¡Terminé!" → #obras/<id>.
// Descarga de cada una (archivo guardado para mirarlo), Seguir y volver atrás.
// Uso: cd dev && node galeria/real.mjs [tamaño]
// (basado en el script de revisión; con aserciones OK/FALLA)
import fs from 'node:fs';
import path from 'node:path';
import { launch, appUrl, shot, SHOTS, stroke } from '../lib.mjs';
import { instrument } from './seed2.mjs';

const size = process.argv[2] || 'desktop';
const clean = (e) => e.filter((x) => !/icons\/.*\.png|ERR_FILE_NOT_FOUND/.test(x));
const log = (...a) => console.log(...a);
const ok = (cond, msg) => { console.log((cond ? 'OK   ' : 'FALLA') + ' ' + msg); if (!cond) process.exitCode = 1; };
const t = await launch({ size });
const { page } = t;
await page.addInitScript(instrument);

async function waitObras() {
  await page.waitForFunction(() => location.hash.startsWith('#obras/'), null, { timeout: 15000 });
  return page.evaluate(() => location.hash.slice(7));
}

// 1) Colorear: vaca, unos baldazos y ¡Terminé!
await page.goto(appUrl('colorear/vaca'));
await page.waitForTimeout(2500);
const bb = await page.locator('.cl-board').boundingBox();
for (const [fx, fy] of [[0.5, 0.5], [0.3, 0.7], [0.7, 0.7], [0.5, 0.2], [0.2, 0.3]]) {
  await page.mouse.click(bb.x + bb.width * fx, bb.y + bb.height * fy);
  await page.waitForTimeout(150);
}
await page.waitForTimeout(400);
await page.locator('.cl-done').click();
const idC = await waitObras();
await page.waitForTimeout(700);
await shot(page, `galeria/real-${size}-1-colorear-resaltada`);
ok(await page.evaluate((id) => !!document.querySelector(`.gal-card.gal-new[data-id="${id}"]`), idC), '¡Terminé! en colorear → obra resaltada');
log('colorear id', idC, await page.evaluate((id) => ({ hl: !!document.querySelector(`.gal-card.gal-new[data-id="${id}"]`), tab: document.querySelector('.gal-tab.active')?.getAttribute('aria-label') }), idC));

// 2) Pizarra
await page.evaluate(() => CL.router.go('pizarra'));
await page.waitForTimeout(1800);
let b = await page.locator('.pz-board').boundingBox();
await stroke(page, [[b.x + b.width * 0.2, b.y + b.height * 0.3], [b.x + b.width * 0.5, b.y + b.height * 0.7], [b.x + b.width * 0.8, b.y + b.height * 0.3]], { steps: 30 });
await page.waitForTimeout(400);
await page.locator('.pz-done').click();
const idP = await waitObras();
await page.waitForTimeout(700);
await shot(page, `galeria/real-${size}-2-pizarra-resaltada`);

// 3) Neón
await page.evaluate(() => CL.router.go('neon'));
await page.waitForTimeout(1800);
b = await page.locator('.neon-stage').boundingBox();
await stroke(page, [[b.x + b.width * 0.2, b.y + b.height * 0.5], [b.x + b.width * 0.5, b.y + b.height * 0.2], [b.x + b.width * 0.8, b.y + b.height * 0.6]], { steps: 30 });
await page.waitForTimeout(400);
await page.locator('.neon-done').click();
const idN = await waitObras();
await page.waitForTimeout(700);
await shot(page, `galeria/real-${size}-3-neon-resaltada`);
await page.waitForTimeout(4000);
await shot(page, `galeria/real-${size}-4-grilla`);

const works = await page.evaluate(async () => (await CL.db.works.list()).map((w) => ({ id: w.id, kind: w.kind, status: w.status, w: w.w, h: w.h, thumbType: w.thumb && w.thumb.type, thumbSize: w.thumb && w.thumb.size })));
log('works', JSON.stringify(works));

// 4) Vista grande + descarga de cada una
for (const [kind, id] of [['colorear', idC], ['pizarra', idP], ['neon', idN]]) {
  await page.locator(`.gal-card[data-id="${id}"]`).click();
  await page.waitForTimeout(1500);
  await shot(page, `galeria/real-${size}-vista-${kind}`);
  const imgInfo = await page.evaluate(() => { const i = document.querySelector('.gv-img'); const r = i.getBoundingClientRect(); return { src: i.src.slice(0, 5), nw: i.naturalWidth, nh: i.naturalHeight, w: Math.round(r.width), h: Math.round(r.height) }; });
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 10000 }), page.locator('.gv-down').click()]);
  const file = path.join(SHOTS, 'galeria', `descarga-${size}-${kind}.png`);
  await dl.saveAs(file);
  const buf = fs.readFileSync(file);
  const isPng = buf.slice(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const w = works.find((x) => x.id === id);
  ok(isPng && buf.readUInt32BE(16) >= 480, kind + ': descarga PNG en alta resolución');
  log(kind, 'descarga', dl.suggestedFilename(), isPng ? 'PNG' : 'NO-PNG', buf.readUInt32BE(16) + 'x' + buf.readUInt32BE(20), buf.length + 'B', 'obra', w.w + 'x' + w.h, 'img vista', JSON.stringify(imgInfo));
  await page.locator('.gv-close').click();
  await page.waitForTimeout(400);
}

// 5) Seguir la de colorear → vuelve a abrirse pintada; atrás → galería
await page.locator(`.gal-card[data-id="${idC}"]`).click();
await page.waitForTimeout(500);
await page.locator('.gv-go').click();
await page.waitForTimeout(2500);
const hs = await page.evaluate(() => location.hash);
ok(hs === `#colorear/vaca/${idC}`, 'seguir abre la vaca con esa obra ' + hs);
await shot(page, `galeria/real-${size}-seguir-colorear`);
await page.goBack();
await page.waitForTimeout(1200);
log('atrás ->', await page.evaluate(() => ({ hash: location.hash, tab: document.querySelector('.gal-tab.active')?.getAttribute('aria-label'), hl: document.querySelectorAll('.gal-new').length })));

// Estado de la obra de colorear después de Seguir+salir sin tocar nada (¿sigue done? ¿updatedAt cambió?)
log('colorear tras seguir', JSON.stringify(await page.evaluate(async (id) => { const w = await CL.db.works.get(id); return { status: w.status, upd: w.updatedAt }; }, idC)));

await page.evaluate(() => CL.router.go('inicio'));
await page.waitForTimeout(900);
log('urls vivas en inicio', await page.evaluate(() => window.__liveUrls()));
ok(clean(t.errors).length === 0, 'sin errores ' + JSON.stringify(clean(t.errors)));
await t.close();
