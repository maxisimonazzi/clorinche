// QA pizarra: guardado, recarga, salir/entrar, terminé, reabrir obra terminada, export.
import { open, S, board, at, wave, multiStroke, stroke, info, works, ready, click, appUrl } from './h.mjs';

const size = process.argv[2] || 'tablet';
const t = await open(size);
const { page } = t;
const ptr = t.size.touch ? 'touch' : 'mouse';
const out = { size };
const hash = () => page.evaluate(() => {
  const c = CL.pizarra.current._test.layer;
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let h = 0, n = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 0) { n++; h = (h * 31 + d[i - 3] + d[i - 2] * 7 + d[i - 1] * 13 + d[i] * 17 + i) >>> 0; }
  return { n, h };
});
let b = await board(page);

// 1) dibujar, cambiar fondo, esperar autoguardado, recargar
await page.evaluate(() => { const T = CL.pizarra.current._test; T.selectTool('crayon'); T.selectColor('#8b4dff'); T.selectSize(2); });
await stroke(page, wave(b, 0.3), { pointer: ptr, steps: 24 });
await page.evaluate(() => { const T = CL.pizarra.current._test; T.selectTool('sellos'); T.selectColor('multi'); });
if (await page.$('.modal-back')) { await page.evaluate(() => document.querySelector('.modal-close').click()); await page.waitForTimeout(250); }
await stroke(page, [at(b, 0.2, 0.7), at(b, 0.8, 0.7)], { pointer: ptr, steps: 20 });
await click(t, '.pz-bgbtn', 400);
await click(t, '.pz-pick[aria-label="Celeste"]', 300);
await page.waitForTimeout(1600);
const h1 = await hash();
out.s1_worksBefore = await works(page);
await page.reload();
await ready(page);
const h1b = await hash();
out.s1_reload = { same: h1.h === h1b.h && h1.n === h1b.n, before: h1, after: h1b, info: await info(page) };
await S(page, `q/persist/${size}-1-after-reload`);

// 2) trazo y recarga enseguida (300 ms): ¿se pierde?
b = await board(page);
await page.evaluate(() => { const T = CL.pizarra.current._test; T.selectTool('fibra'); T.selectColor('#ff3b30'); T.selectSize(3); });
await stroke(page, wave(b, 0.5), { pointer: ptr, steps: 20 });
await page.waitForTimeout(300);
const h2 = await hash();
await page.reload();
await ready(page);
const h2b = await hash();
out.s2_quickReload = { lost: h2b.n < h2.n, before: h2.n, after: h2b.n };

// 3) trazo y tocar Inicio enseguida; volver con la tarjeta de inicio
b = await board(page);
await page.evaluate(() => { const T = CL.pizarra.current._test; T.selectTool('arcoiris'); T.selectSize(3); });
await stroke(page, wave(b, 0.85), { pointer: ptr, steps: 20 });
const h3 = await hash();
await click(t, '.btn-home', 900);
out.s3_hashHome = await page.evaluate(() => location.hash);
await S(page, `q/persist/${size}-3-home`);
await page.evaluate(() => CL.router.go('pizarra'));
await ready(page);
const h3b = await hash();
out.s3_homeBack = { same: h3.h === h3b.h, before: h3.n, after: h3b.n };

// 4) pestañas: pizarra -> neon -> pizarra
await click(t, '.mode-tab[aria-label="Neón"]', 1200);
out.s4_hash = await page.evaluate(() => location.hash);
await click(t, '.mode-tab[aria-label="Pizarra mágica"]', 300);
await ready(page);
const h4 = await hash();
out.s4_tabs = { same: h4.h === h3b.h };

// 5) ¡Terminé!
out.s5_worksBeforeDone = await works(page);
await click(t, '.pz-done', 700);
await S(page, `q/persist/${size}-5-celebrate`);
await page.waitForFunction(() => location.hash.startsWith('#obras/'), null, { timeout: 12000 }).catch(() => {});
await page.waitForTimeout(1200);
out.s5_hash = await page.evaluate(() => location.hash);
out.s5_works = await works(page);
await S(page, `q/persist/${size}-5-obras`);
const doneId = out.s5_hash.split('/')[1];

// 6) #pizarra arranca en blanco
await page.evaluate(() => CL.router.go('pizarra'));
await ready(page);
out.s6_blank = (await hash()).n === 0;
out.s6_info = await info(page);
await S(page, `q/persist/${size}-6-new-blank`);

// 7) abrir la obra terminada, agregar algo, volver: sigue 'done' y no se crea progreso
await page.evaluate((id) => CL.router.go('pizarra/' + id), doneId);
await ready(page);
out.s7_open = await info(page);
b = await board(page);
await page.evaluate(() => { const T = CL.pizarra.current._test; T.selectTool('brillitos'); T.selectColor('#ffd60a'); T.selectSize(3); });
await stroke(page, wave(b, 0.6), { pointer: ptr, steps: 20 });
await page.waitForTimeout(1500);
await S(page, `q/persist/${size}-7-reopen-done`);
out.s7_works = await works(page);

// 8) borrar todo sobre la obra terminada: ¿qué pasa en la galería?
await page.evaluate(() => { const T = CL.pizarra.current._test; T.wipeMs = 60; T.wipe(); });
await page.waitForTimeout(1800);
out.s8_worksAfterWipeDone = await works(page);

// 9) export
out.s9_export = await page.evaluate(async (id) => {
  const w = await CL.db.works.get(id);
  const blob = await CL.pizarra.exportPNG(w);
  const img = await CL.util.blobToImage(blob);
  return { type: blob.type, w: img.width, h: img.height, bytes: blob.size };
}, doneId);

out.errors = t.errors;
console.log(JSON.stringify(out, null, 1));
await t.close();
