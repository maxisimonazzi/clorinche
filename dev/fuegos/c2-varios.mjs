// Corrección 2 — varios: la pista se va del DOM, el cielo se dibuja una sola vez al entrar,
// rotar a mitad de la animación no deforma, recortes de la mecha amarilla y del color elegido,
// resolución del canvas de efectos con carga.
// Uso: node fuegos/c2-varios.mjs
import { launch, appUrl, shot, tap, touchStart, touches, interp } from '../lib.mjs';
const out = {};

/* A) Pista */
{
  const t = await launch({ size: 'tablet' });
  const { page } = t;
  await page.goto(appUrl('fuegos'));
  await page.waitForTimeout(700);
  const anims = () => page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length);
  out.hint = { animsBefore: await anims() };
  await tap(page, 500, 400);
  await page.waitForTimeout(1500);
  out.hint.animsAfter = await anims();
  out.hint.inDom = await page.evaluate(() => !!document.querySelector('.fw-hint'));
  out.hint.errors = t.errors;
  await t.close();
}

/* B) Cielo: cuántas veces se dibuja al entrar */
{
  const t = await launch({ size: 'phone' });
  await t.context.addInitScript(() => {
    window.__sky = 0;
    const o = CanvasRenderingContext2D.prototype.createLinearGradient;
    CanvasRenderingContext2D.prototype.createLinearGradient = function (...a) {
      if (this.canvas.classList && this.canvas.classList.contains('fw-sky')) window.__sky++;
      return o.apply(this, a);
    };
  });
  await t.page.goto(appUrl('inicio'));
  await t.page.waitForTimeout(700);
  out.sky = await t.page.evaluate(async () => {
    window.__sky = 0;
    CL.router.go('fuegos');
    await new Promise((r) => setTimeout(r, 1200));
    const onMount = window.__sky;
    document.querySelector('.fw-stage').style.bottom = '1px'; // cambio real de tamaño: sí redibuja
    await new Promise((r) => setTimeout(r, 300));
    return { onMount, afterResize: window.__sky };
  });
  out.sky.errors = t.errors;
  await t.close();
}

/* C) Rotar con explosiones en el aire y una mecha ardiendo */
{
  const t = await launch({ size: 'phone' });
  const { page } = t;
  await page.goto(appUrl('fuegos'));
  await page.waitForTimeout(700);
  await page.evaluate(() => { CL.fuegos._debug.explode(120, 300, 'peonia', 0); CL.fuegos._debug.explode(250, 600, 'anillo', 4); });
  await touchStart(page, [{ x: 120, y: 640 }]);
  for (const p of interp([[120, 640], [250, 560], [200, 470]], 8).slice(1)) await touches(page, [{ x: p[0], y: p[1] }]);
  await page.waitForTimeout(150);
  await page.evaluate(() => CL.fuegos._debug.timeScale(0));
  await shot(page, 'fuegos/c2-rotar-antes');
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(300);
  await shot(page, 'fuegos/c2-rotar-medio');
  await page.evaluate(() => CL.fuegos._debug.timeScale(1));
  await touches(page, []);
  await page.waitForTimeout(3000);
  out.rotate = { st: await page.evaluate(() => { const s = CL.fuegos._debug.state(); return { W: s.W, H: s.H, fuses: s.fuses.length, band: s.band, float: s.colorsFloat }; }), errors: t.errors };
  await t.close();
}

/* D) Recortes: mecha amarilla y color elegido (celular y tablet) */
for (const size of ['phone', 'tablet']) {
  const t = await launch({ size });
  const { page } = t;
  await page.goto(appUrl('fuegos'));
  await page.waitForTimeout(700);
  const sw = await page.locator('.fw-swatch[data-color="amarillo"]').boundingBox();
  await tap(page, sw.x + sw.width / 2, sw.y + sw.height / 2);
  await page.waitForTimeout(200);
  await page.evaluate(() => CL.fuegos._debug.timeScale(0.0001));
  const W = t.size.width, H = t.size.height;
  await touchStart(page, [{ x: W * 0.2, y: H * 0.45 }]);
  for (const p of interp([[W * 0.2, H * 0.45], [W * 0.5, H * 0.3], [W * 0.8, H * 0.5]], 20).slice(1)) await touches(page, [{ x: p[0], y: p[1] }]);
  await page.waitForTimeout(200);
  await shot(page, `fuegos/c2-zoom-${size}-mecha`, { clip: { x: W * 0.35, y: H * 0.26, width: Math.min(200, W * 0.4), height: 110 } });
  const c = await page.locator('.fw-colors').boundingBox();
  await shot(page, `fuegos/c2-zoom-${size}-swatch`, { clip: { x: c.x - 12, y: c.y - 12, width: Math.min(c.width + 24, 300), height: c.height + 24 } });
  await touches(page, []);
  await t.close();
}

/* E) Resolución con carga: muchas explosiones + mecha ardiendo */
for (const size of ['tablet', 'phone']) {
  const t = await launch({ size });
  const { page } = t;
  await page.goto(appUrl('fuegos'));
  await page.waitForTimeout(1500);
  const W = t.size.width, H = t.size.height;
  await touchStart(page, [{ x: W * 0.15, y: H * 0.6 }]);
  const res = page.evaluate(() => new Promise((done) => {
    const W = innerWidth, H = innerHeight;
    let k = 0, minF = 9, n = 0;
    const t0 = performance.now();
    const iv = setInterval(() => {
      for (let j = 0; j < 3; j++) CL.fuegos._debug.explode(W * (0.2 + Math.random() * 0.6), H * (0.25 + Math.random() * 0.4));
      if (++k >= 12) clearInterval(iv);
    }, 200);
    const f = () => {
      n++;
      const s = CL.fuegos._debug.state();
      minF = Math.min(minF, s.fdpr);
      if (performance.now() - t0 < 3000) requestAnimationFrame(f);
      else done({ fps: +(n / 3).toFixed(1), minFdpr: minF, fdprMax: s.fdprMax, quality: +s.quality.toFixed(2), parts: s.particles });
    };
    requestAnimationFrame(f);
  }));
  for (let i = 0; i < 30; i++) { await touches(page, [{ x: W * (0.15 + i * 0.02), y: H * (0.6 - 0.2 * Math.sin(i / 5)) }]); await page.waitForTimeout(60); }
  out['load-' + size] = await res;
  await shot(page, `fuegos/c2-carga-${size}`);
  await touches(page, []);
  out['load-' + size].errors = t.errors;
  await t.close();
}
console.log(JSON.stringify(out, null, 1));
