// QA pizarra: tocar botones mientras la obra todavía se está cargando (IndexedDB lenta a propósito).
import { open, click, ready } from './h.mjs';

const t = await open('tablet');
const { page } = t;
await page.evaluate(() => { CL.pizarra.current._test.selectTool('fibra'); });
const out = {};
for (const what of ['done', 'bg']) {
  await page.evaluate(() => CL.router.go('inicio'));
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    if (!window.__origFP) window.__origFP = CL.db.works.findProgress;
    CL.db.works.findProgress = async (...a) => { await new Promise((r) => setTimeout(r, 1500)); return window.__origFP(...a); };
  });
  await page.evaluate(() => CL.router.go('pizarra'));
  await page.waitForTimeout(250);
  const n0 = t.errors.length;
  if (what === 'done') await click(t, '.pz-done', 100);
  else { await click(t, '.pz-bgbtn', 400); await click(t, '.pz-pick[aria-label="Rosa"]', 100); }
  await page.waitForTimeout(2000);
  out[what] = { newErrors: t.errors.slice(n0), hash: await page.evaluate(() => location.hash), docOk: await page.evaluate(() => !!(CL.pizarra.current && CL.pizarra.current.doc)) };
  await page.evaluate(() => { CL.db.works.findProgress = window.__origFP; });
}
console.log(JSON.stringify(out, null, 1));
await t.close();
