// Neón: fluidez con caleidoscopio de 8 y dos dedos durante un trazo largo.
import { launch, appUrl, shot, multiStroke, touches, rect } from '../lib.mjs';

for (const size of process.argv.slice(2).length ? process.argv.slice(2) : ['tablet', 'desktop', 'phone']) {
  const t = await launch({ size: size === 'desktop' ? { width: 1366, height: 768, dpr: 1, touch: true } : size });
  const { page } = t;
  await page.goto(appUrl('neon'));
  await page.waitForFunction(() => CL.neon && CL.neon.debug && CL.neon.debug.ready);
  await page.locator('.neon-mirror').nth(4).click();
  await page.locator('.neon-swatch').nth(+(process.env.NEON_COLOR ?? 8)).click();
  await page.locator('.neon-size').nth(3).click();
  const r = await rect(page, '.neon-stage');
  const mk = (ph, rad) => { const p = []; for (let i = 0; i <= 120; i++) { const a = ph + i / 120 * Math.PI * 6; const rr = rad * (0.35 + 0.65 * Math.abs(Math.sin(a * 0.7))); p.push([r.x + r.width / 2 + Math.cos(a) * rr, r.y + r.height / 2 + Math.sin(a) * rr]); } return p; };
  const R = Math.min(r.width, r.height) * 0.45;
  await page.evaluate(() => {
    window.__f = 0; window.__run = true; window.__ev = []; window.__long = 0;
    let last = performance.now();
    const loop = (now) => { window.__f++; if (now - last > 50) window.__long++; last = now; if (window.__run) requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    let t0 = 0;
    window.addEventListener('pointermove', () => { t0 = performance.now(); }, true);
    window.addEventListener('pointermove', () => { window.__ev.push(performance.now() - t0); }, false);
    window.__t0 = performance.now();
  });
  await multiStroke(page, [mk(0, R), mk(Math.PI, R * 0.8)], { steps: 240, delay: 8, release: false });
  await shot(page, `neon/fps-${size}-durante`);
  await touches(page, []);
  const res = await page.evaluate(() => {
    window.__run = false;
    const ms = performance.now() - window.__t0;
    const ev = window.__ev.slice().sort((a, b) => a - b);
    return { ms: Math.round(ms), fps: +(window.__f / (ms / 1000)).toFixed(1), framesLargos: window.__long, eventos: ev.length,
      evMedio: +(ev.reduce((a, b) => a + b, 0) / ev.length).toFixed(2), evP95: +ev[Math.floor(ev.length * 0.95)].toFixed(2), evMax: +ev[ev.length - 1].toFixed(2) };
  });
  await page.waitForTimeout(200);
  await shot(page, `neon/fps-${size}-despues`);
  console.log(size, JSON.stringify(res), 'errors', t.errors);
  await t.close();
}
