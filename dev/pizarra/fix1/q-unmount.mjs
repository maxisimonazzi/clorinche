// QA pizarra: ¿se guarda el trazo que está en curso cuando se sale de la pantalla (atrás del sistema)?
import { open, board, wave, stroke, ready } from './h.mjs';

const size = process.argv[2] || 'desktop';
const t = await open(size);
const { page } = t;
const out = { size, runs: [] };
const ink = () => page.evaluate(() => {
  const c = CL.pizarra.current._test.layer; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0; for (let i = 3; i < d.length; i += 16) if (d[i] > 8) n++; return n;
});
const dbInk = () => page.evaluate(async () => {
  const w = (await CL.db.works.list({ kind: 'pizarra', status: 'progress' }))[0];
  if (!w) return 0;
  const img = await CL.util.blobToImage(w.paint);
  const c = CL.util.canvas(img.width, img.height); const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height).data;
  let n = 0; for (let i = 3; i < d.length; i += 16) if (d[i] > 8) n++; return n;
});
await page.evaluate(() => CL.router.go("inicio")); await page.waitForTimeout(400);
await page.evaluate(() => CL.router.go("pizarra")); await ready(page);
for (const tool of ['fibra', 'aerosol', 'sellos']) {
  let b = await board(page);
  await page.evaluate((tl) => { const T = CL.pizarra.current._test; T.selectTool(tl); T.selectColor('#2f5bea'); T.selectSize(3); }, tool);
  if (await page.$('.modal-back')) { await page.evaluate(() => document.querySelector('.modal-close').click()); await page.waitForTimeout(250); }
  await stroke(page, wave(b, 0.2), { steps: 12 });
  await page.waitForTimeout(3500); // primer trazo guardado seguro
  const saved1 = await dbInk();
  await stroke(page, wave(b, 0.6), { steps: 14, release: false });
  const during = await page.evaluate(() => {
    let n = 0;
    for (const c of [CL.pizarra.current._test.layer, ...document.querySelectorAll('.pz-live:not([hidden])')]) { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 3; i < d.length; i += 16) if (d[i] > 8) n++; }
    return n;
  });
  await page.evaluate(() => history.back()); // atrás del sistema en medio del trazo
  await page.waitForTimeout(1500);
  await page.mouse.up();
  const savedAfterLeave = await dbInk();
  await page.evaluate(() => CL.router.go('pizarra')); await ready(page);
  out.runs.push({ tool, saved1, during, savedAfterLeave, onReturn: await ink(), lost: savedAfterLeave <= saved1 + 50 });
  await page.evaluate(() => { const T = CL.pizarra.current._test; T.wipeMs = 30; T.wipe(); });
  await page.waitForTimeout(3500);
  await page.evaluate(() => CL.router.go('inicio')); await page.waitForTimeout(400);
  await page.evaluate(() => CL.router.go('pizarra')); await ready(page);
}
out.errors = t.errors;
console.log(JSON.stringify(out, null, 1));
await t.close();
