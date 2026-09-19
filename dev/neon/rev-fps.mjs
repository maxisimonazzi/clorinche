// Revisión neón: fluidez con caleidoscopio de 8, 3 dedos, grosor máximo y arcoíris, trazo largo.
// Mide fps (rAF), frames largos y el costo de los handlers de pointermove; captura en medio.
import { launch, appUrl, shot, multiStroke, touches, rect } from '../lib.mjs';

const sizes = process.argv.slice(2).length ? process.argv.slice(2) : ['tablet', 'phone', 'desktop', 'phoneH'];
for (const size of sizes) {
  const t = await launch({ size: size === 'desktop' ? { width: 1366, height: 768, dpr: 1, touch: true } : size });
  const { page } = t;
  await page.goto(appUrl('neon'));
  await page.waitForFunction(() => CL.neon && CL.neon.debug && CL.neon.debug.ready);
  await page.locator('.neon-mirror').nth(4).click();
  await page.locator('.neon-swatch').nth(8).click();
  await page.locator('.neon-size').nth(3).click();
  const r = await rect(page, '.neon-stage');
  const cx = r.x + r.width / 2, cy = r.y + r.height / 2, R = Math.min(r.width, r.height) * 0.46;
  const mk = (ph, k) => { const p = []; for (let i = 0; i <= 160; i++) { const a = ph + i / 160 * Math.PI * 8; const rr = R * k * (0.3 + 0.7 * Math.abs(Math.sin(a * 0.9))); p.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } return p; };
  await page.evaluate(() => {
    window.__f = []; window.__run = true; window.__h = [];
    let last = performance.now();
    const loop = (now) => { window.__f.push(now - last); last = now; if (window.__run) requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    const st = document.querySelector('.neon-stage');
    let t0 = 0;
    st.addEventListener('pointermove', () => { t0 = performance.now(); }, { capture: true });
    window.addEventListener('pointermove', () => { window.__h.push(performance.now() - t0); });
  });
  await multiStroke(page, [mk(0, 1), mk(2.1, 0.8), mk(4.2, 0.6)], { steps: 300, delay: 6, release: false });
  await shot(page, `neon/rev/fps/${size}-durante`);
  await touches(page, []);
  const res = await page.evaluate(() => {
    window.__run = false;
    const f = window.__f.slice(2);
    const tot = f.reduce((a, b) => a + b, 0);
    const h = window.__h.slice().sort((a, b) => a - b);
    const p = (arr, q) => arr[Math.min(arr.length - 1, Math.floor(arr.length * q))];
    const fs = f.slice().sort((a, b) => a - b);
    return { fps: +(f.length / (tot / 1000)).toFixed(1), frameP95: +p(fs, 0.95).toFixed(1), frames50: f.filter((x) => x > 50).length,
      frameMax: +fs[fs.length - 1].toFixed(1), moves: h.length, handlerMedio: +(h.reduce((a, b) => a + b, 0) / h.length).toFixed(2), handlerP95: +p(h, 0.95).toFixed(2), handlerMax: +h[h.length - 1].toFixed(2) };
  });
  await page.waitForTimeout(250);
  await shot(page, `neon/rev/fps/${size}-despues`);
  console.log(size, JSON.stringify(res), 'errors', JSON.stringify(t.errors));
  await t.close();
}
