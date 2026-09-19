// Experimento: formas de codificar el lienzo de neón y cuánto tardan (en la pantalla neón, después de un trazo).
import { launch, appUrl, multiStroke, rect } from '../lib.mjs';
const t = await launch({ size: process.argv[2] || 'tablet' });
const { page } = t;
await page.goto(appUrl('neon'));
await page.waitForFunction(() => CL.neon && CL.neon.debug && CL.neon.debug.ready);
const r = await rect(page, '.neon-stage');
const pts = [];
for (let i = 0; i <= 40; i++) pts.push([r.x + r.width * (0.1 + 0.8 * i / 40), r.y + r.height * (0.5 + 0.3 * Math.sin(i / 3))]);
await multiStroke(page, [pts], { steps: 40, delay: 4 });
await page.waitForTimeout(3000);
const res = await page.evaluate(async () => {
  const c = document.querySelector('.neon-paint');
  const out = { size: c.width };
  const T = async (name, fn) => { const t0 = performance.now(); const b = await fn(); out[name] = Math.round(performance.now() - t0) + 'ms ' + (b && b.size ? Math.round(b.size / 1024) + 'KB' : ''); };
  await T('toBlobDOM', () => CL.util.canvasToBlob(c, 'image/png'));
  await T('toDataURL', () => ({ size: c.toDataURL('image/png').length * 0.75 }));
  await T('copia+toBlob', () => { const k = CL.util.canvas(c.width, c.height); k.getContext('2d').drawImage(c, 0, 0); return CL.util.canvasToBlob(k, 'image/png'); });
  await T('copia2x+toBlob', () => { const k = CL.util.canvas(c.width * 2 / 3 | 0, c.height * 2 / 3 | 0); k.getContext('2d').drawImage(c, 0, 0, k.width, k.height); return CL.util.canvasToBlob(k, 'image/png'); });
  await T('offscreen', async () => { const o = new OffscreenCanvas(c.width, c.height); o.getContext('2d').drawImage(c, 0, 0); return o.convertToBlob({ type: 'image/png' }); });
  await T('bitmap+offscreen', async () => { const bm = await createImageBitmap(c); const o = new OffscreenCanvas(c.width, c.height); o.getContext('bitmaprenderer').transferFromImageBitmap(bm); return o.convertToBlob({ type: 'image/png' }); });
  // ¿Qué anima? (idle)
  out.anims = document.getAnimations().map((a) => (a.effect && a.effect.target && a.effect.target.className) + ':' + a.animationName + ':' + a.playState).slice(0, 10);
  return out;
});
console.log(res, t.errors);
await t.close();
