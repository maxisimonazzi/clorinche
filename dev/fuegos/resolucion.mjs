// Fuegos: la resolución del canvas de efectos baja con mucha carga y vuelve cuando la escena se calma.
import { launch, appUrl } from '../lib.mjs';
const t = await launch({ size: process.argv[2] || 'tablet' });
const { page } = t;
await page.goto(appUrl('fuegos'));
await page.waitForTimeout(800);
const st = () => page.evaluate(() => { const s = CL.fuegos._debug.state(); return { fdpr: s.fdpr, fdprMax: s.fdprMax, quality: +s.quality.toFixed(2), particles: s.particles, fxWidth: document.querySelector('.fw-fx').width }; });
const out = { antes: await st() };
await page.evaluate(([W, H]) => { for (let i = 0; i < 8; i++) CL.fuegos._debug.explode(W * (0.15 + 0.1 * i), H * 0.4, CL.fuegos.TYPES[i]); }, [t.size.width, t.size.height]);
await page.waitForTimeout(1500);
out.conCarga = await st();
await page.waitForTimeout(6000);
out.despues = await st();
out.errors = t.errors;
console.log(JSON.stringify(out));
await t.close();
