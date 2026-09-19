import { launch, appUrl, multiStroke, rect } from '../lib.mjs';
const t = await launch({ size: 'tablet' });
const { page } = t;
for (const route of ['inicio', 'neon', 'pizarra']) {
  await page.goto(appUrl(route));
  await page.waitForTimeout(1500);
  const res = await page.evaluate(async () => {
    const t0 = performance.now();
    const idle = await new Promise((r) => requestIdleCallback((d) => r(Math.round(performance.now() - t0) + 'ms rem ' + d.timeRemaining().toFixed(1))));
    let n = 0; const orig = window.requestAnimationFrame; window.requestAnimationFrame = (f) => { n++; return orig(f); };
    await new Promise((r) => setTimeout(r, 1000));
    window.requestAnimationFrame = orig;
    const c = CL.util.canvas(1000, 1000); c.getContext('2d').fillRect(0, 0, 500, 500);
    const t1 = performance.now(); await CL.util.canvasToBlob(c); 
    return { idle, rafs: n, toBlob: Math.round(performance.now() - t1), anims: document.getAnimations().filter(a=>a.playState==='running').map((a) => (a.effect.target.className && a.effect.target.className.baseVal !== undefined ? a.effect.target.className.baseVal : a.effect.target.className) + ':' + a.animationName) };
  });
  console.log(route, res);
}
await t.close();
