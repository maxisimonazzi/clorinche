// Mide cuánto tardan distintas formas de codificar la capa (toBlob, convertToBlob, toDataURL) en Edge headless.
import { launch, appUrl } from '../../lib.mjs';
const t = await launch({ size: 'tablet' });
const { page } = t;
await page.goto(appUrl('pizarra'));
await page.waitForFunction(() => window.CL && CL.pizarra && CL.pizarra.current && CL.pizarra.current.doc);
await page.waitForTimeout(500);
const r = await page.evaluate(async () => {
  const src = CL.pizarra.current._test.layer;
  const x = src.getContext('2d');
  x.fillStyle = '#f33'; for (let i = 0; i < 300; i++) { x.beginPath(); x.arc(Math.random() * src.width, Math.random() * src.height, 20, 0, 7); x.fill(); }
  const out = { w: src.width, h: src.height };
  const time = async (name, fn) => { const t0 = performance.now(); const b = await fn(); out[name] = { ms: Math.round(performance.now() - t0), kb: Math.round((b.size || b.length) / 1024) }; };
  await time('toBlob', () => new Promise((r) => src.toBlob(r, 'image/png')));
  await time('toBlob2par', async () => { const [a, b] = await Promise.all([new Promise((r) => src.toBlob(r, 'image/png')), new Promise((r) => src.toBlob(r, 'image/png'))]); return a; });
  await time('offscreen', async () => { const bm = await createImageBitmap(src); const oc = new OffscreenCanvas(src.width, src.height); oc.getContext('2d').drawImage(bm, 0, 0); bm.close(); return oc.convertToBlob({ type: 'image/png' }); });
  await time('offscreenDirect', async () => { const oc = new OffscreenCanvas(src.width, src.height); oc.getContext('2d').drawImage(src, 0, 0); return oc.convertToBlob({ type: 'image/png' }); });
  await time('dataURL', async () => src.toDataURL('image/png'));
  const th = CL.util.thumbnail(src, 480);
  await time('thumbToBlob', () => new Promise((r) => th.toBlob(r, 'image/png')));
  await time('thumbOff', async () => { const oc = new OffscreenCanvas(th.width, th.height); oc.getContext('2d').drawImage(th, 0, 0); return oc.convertToBlob({ type: 'image/png' }); });
  await time('thumbDataURL', async () => th.toDataURL('image/png'));
  return out;
});
console.log(JSON.stringify(r, null, 1));
await t.close();
