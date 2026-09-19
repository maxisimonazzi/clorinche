// Corrección 1 — mechas: límite (dedo nuevo nunca ignorado), garabato largo (espera acotada),
// velocidad constante con el dedo apoyado, mouse soltado fuera de la ventana y rotación a mitad de trazo.
// Uso: node fuegos/c1-mechas.mjs
import { launch, appUrl, shot, interp, touchStart, touches, tap } from '../lib.mjs';

const out = {};
const st = (page) => page.evaluate(() => CL.fuegos._debug.state());
const hideHint = (page) => page.evaluate(() => document.querySelector('.fw-hint')?.classList.add('fw-hint--gone'));

/* A) 10 mechas largas soltadas + dedo nuevo; luego más mechas hasta pasar el tope. */
{
  const t = await launch({ size: 'tablet' });
  const { page } = t;
  await page.goto(appUrl('fuegos'));
  await page.waitForTimeout(700);
  await hideHint(page);
  await page.evaluate(() => CL.fuegos._debug.timeScale(0));
  for (let i = 0; i < 10; i++) {
    const y = 180 + i * 50;
    const pts = interp([[60, y], [960, y], [60, y + 20], [960, y + 20]], 8);
    await touchStart(page, [{ x: pts[0][0], y: pts[0][1] }]);
    for (const p of pts.slice(1)) await touches(page, [{ x: p[0], y: p[1] }]);
    await touches(page, []);
  }
  await page.evaluate(() => CL.fuegos._debug.timeScale(1));
  await page.waitForTimeout(300);
  const before = await st(page);
  await touchStart(page, [{ x: 500, y: 130 }]);
  await touches(page, [{ x: 600, y: 140 }]);
  await page.waitForTimeout(80);
  const s = await st(page);
  out.limit = {
    fusesBefore: before.fuses.length, allReleased: before.fuses.every((f) => !f.down),
    maxSecondsLeft: +Math.max(...before.fuses.map((f) => (f.len - f.sd) / f.v)).toFixed(2),
    fusesWithNewFinger: s.fuses.length, newFuse: s.fuses.some((f) => f.down),
  };
  await shot(page, 'fuegos/c1-limite-dedo-nuevo');
  await touches(page, []);
  // 16 toques rapidísimos con el tiempo congelado: nunca más de 14 mechas, todos prenden algo.
  await page.evaluate(() => { CL.fuegos._debug.clear(); CL.fuegos._debug.timeScale(0); });
  const counts = [];
  for (let i = 0; i < 16; i++) {
    await touchStart(page, [{ x: 100 + i * 50, y: 400 }]);
    await touches(page, [{ x: 100 + i * 50, y: 300 }]);
    await touches(page, []);
    counts.push((await st(page)).fuses.length);
  }
  out.limit.fusesAfterEachTouch = counts;
  out.limit.particlesFromHurried = (await st(page)).particles;
  await page.evaluate(() => CL.fuegos._debug.timeScale(1));
  await page.waitForTimeout(250);
  await shot(page, 'fuegos/c1-limite-apurada');
  // 11 dedos a la vez: el 11° se ignora (10 mechas).
  await page.evaluate(() => CL.fuegos._debug.clear());
  const f11 = Array.from({ length: 11 }, (_, i) => ({ x: 60 + i * 85, y: 600, id: i + 1 }));
  await touchStart(page, f11);
  await touches(page, f11.map((p) => ({ ...p, y: 500 })));
  out.limit.elevenFingers = (await st(page)).fuses.length;
  await touches(page, []);
  out.errorsA = t.errors;
  await t.close();
}

/* B) Garabato de chico en desktop (zigzag ~3 s) y velocidad constante con el dedo apoyado. */
{
  const t = await launch({ size: 'desktop' });
  const { page } = t;
  await page.goto(appUrl('fuegos'));
  await page.waitForTimeout(700);
  await hideHint(page);
  const pts = [];
  for (let i = 0; i < 18; i++) pts.push([200 + (i % 2) * 900, 200 + i * 20]);
  await page.mouse.move(pts[0][0], pts[0][1]);
  await page.mouse.down();
  const samples = [];
  const ip = interp(pts, 120);
  for (const [k, p] of ip.slice(1).entries()) {
    await page.mouse.move(p[0], p[1]);
    await page.waitForTimeout(16);
    if (k % 20 === 0) samples.push(await page.evaluate(() => { const f = CL.fuegos._debug.state().fuses[0]; return { t: performance.now(), sd: f.sd, v: f.v }; }));
  }
  // Velocidad de la chispa (px/s) entre muestras mientras el dedo sigue apoyado.
  out.speedWhileDown = samples.slice(1).map((s, i) => Math.round((s.sd - samples[i].sd) / ((s.t - samples[i].t) / 1000)));
  await page.mouse.up();
  const t0 = Date.now();
  const s = await st(page);
  out.scribble = { len: Math.round(s.fuses[0].len), sd: Math.round(s.fuses[0].sd), vAfterRelease: Math.round(s.fuses[0].v) };
  await page.waitForTimeout(900);
  await shot(page, 'fuegos/c1-garabato-soltado');
  await page.waitForFunction(() => CL.fuegos._debug.state().fuses.length === 0, null, { timeout: 15000, polling: 20 });
  out.scribble.secondsToBoom = +((Date.now() - t0) / 1000).toFixed(2);
  await page.waitForTimeout(250);
  await shot(page, 'fuegos/c1-garabato-explota');

  /* C) Mouse que sale de la ventana y suelta afuera: la explosión se ve. */
  await page.evaluate(() => CL.fuegos._debug.clear());
  await page.mouse.move(1150, 400);
  await page.mouse.down();
  await page.mouse.move(1300, 420, { steps: 5 });
  await page.mouse.move(1600, 450, { steps: 8 });
  const s2 = await st(page);
  await page.mouse.up();
  const lastX = s2.fuses[0] ? Math.max(...[s2.fuses[0].x]) : null;
  await page.waitForFunction(() => CL.fuegos._debug.state().fuses.length === 0, null, { timeout: 5000, polling: 20 });
  await page.waitForTimeout(200);
  out.outside = { W: s2.W, fuseLen: Math.round(s2.fuses[0].len), sparkX: Math.round(lastX), particles: (await st(page)).particles };
  await shot(page, 'fuegos/c1-afuera');
  out.errorsB = t.errors;
  await t.close();
}

/* D) Rotar el celular con el dedo apoyado y explosiones en el aire. */
{
  const t = await launch({ size: 'phone' });
  const { page } = t;
  await page.goto(appUrl('fuegos'));
  await page.waitForTimeout(700);
  await page.evaluate(() => { CL.fuegos._debug.explode(120, 300, 'peonia', 0); CL.fuegos._debug.explode(250, 600, 'anillo', 4); });
  await touchStart(page, [{ x: 120, y: 720 }]);
  for (const p of interp([[120, 720], [250, 650], [200, 560]], 8).slice(1)) await touches(page, [{ x: p[0], y: p[1] }]);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(250);
  const mid = await st(page);
  await shot(page, 'fuegos/c1-rotado-medio');
  for (const p of interp([[430, 250], [600, 150], [700, 180]], 8)) await touches(page, [{ x: p[0], y: p[1] }]);
  const mid2 = await st(page);
  await touches(page, []);
  await page.waitForTimeout(250);
  await shot(page, 'fuegos/c1-rotado-sigue');
  out.rotate = {
    W: mid.W, H: mid.H,
    midFuses: mid.fuses.map((f) => ({ x: Math.round(f.x), y: Math.round(f.y), len: Math.round(f.len) })),
    afterMoreDrawing: mid2.fuses.map((f) => ({ x: Math.round(f.x), y: Math.round(f.y), len: Math.round(f.len) })),
  };
  out.errorsD = t.errors;
  await t.close();
}
console.log(JSON.stringify(out, null, 1));
