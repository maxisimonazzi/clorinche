// Tocar botones mientras la pizarra todavía está cargando la obra (IndexedDB lenta a propósito).
import { open, click, info, ready } from './h.mjs';
const t = await open('tablet');
const { page } = t;
await page.evaluate(() => CL.router.go('inicio'));
await page.waitForTimeout(500);
await page.evaluate(() => {
  const o = CL.db.works.findProgress;
  CL.db.works.findProgress = async (...a) => { await new Promise((r) => setTimeout(r, 2000)); return o(...a); };
});
await page.evaluate(() => CL.router.go('pizarra'));
await page.waitForTimeout(400);
await click(t, '.pz-bgbtn', 400);
await click(t, '.pz-pick[aria-label="Pizarrón negro"]', 300);
await page.waitForTimeout(2500);
console.log(JSON.stringify({ bg: (await info(page)).state.bg, boardChalk: await page.evaluate(() => document.querySelector('.pz-board').classList.contains('pz-board--chalk')), errors: t.errors }));
await t.close();
