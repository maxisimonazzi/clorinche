// Fuegos: mecha, chispa, espera, explosión, multitouch, tipos, velocidad y fps.
// Uso: node fuegos/mecha.mjs [tamaño] [--tipos] [--solo-tipos]
import { launch, appUrl, shot, interp, touchStart, touches, multiStroke, stroke } from '../lib.mjs';

const size = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'desktop';
const doTypes = process.argv.includes('--tipos') || process.argv.includes('--solo-tipos');
const onlyTypes = process.argv.includes('--solo-tipos');
const t = await launch({ size });
const { page } = t;
const W = t.size.width, H = t.size.height;
const out = { size };
const dir = `fuegos/${size}`;
await page.goto(appUrl('fuegos'));
await page.waitForTimeout(700);

const st = () => page.evaluate(() => CL.fuegos._debug.state());
const freeze = () => page.evaluate(() => CL.fuegos._debug.timeScale(0));
const unfreeze = () => page.evaluate(() => CL.fuegos._debug.timeScale(1));
const waitFor = async (fn, arg, timeout = 8000) => page.waitForFunction(fn, arg, { timeout, polling: 'raf' });

// Recorrido largo en zigzag dentro de la zona libre.
const top = H < 500 ? 90 : 120, bottom = H - (H < 500 ? 70 : 150);
const left = 40, right = W - (W < 600 ? 90 : 40);
const path = [[left, bottom], [left + (right - left) * 0.3, top], [left + (right - left) * 0.55, bottom - (bottom - top) * 0.15], [left + (right - left) * 0.85, top + (bottom - top) * 0.15], [left + (right - left) * 0.62, top + (bottom - top) * 0.45]]; // termina hacia el centro: la explosión entra entera

if (!onlyTypes) {
  /* 1) Mecha con la chispa a mitad de camino, dedo apoyado (touch en tablet/phone, mouse en desktop). */
  const touch = t.size.touch;
  if (touch) {
    const pts = interp(path, H < 500 ? 14 : 40); // en phoneH el recorrido es corto: dibujarlo más rápido
    // En pantallas bajas el recorrido es corto y el envío táctil por CDP es lento: se pausa la simulación
    // mientras se dibuja para que la captura muestre la chispa a mitad de camino (la velocidad se mide aparte).
    if (H < 500) await freeze();
    await touchStart(page, [{ x: pts[0][0], y: pts[0][1] }]);
    for (const [x, y] of pts.slice(1)) { await touches(page, [{ x, y }]); }
    if (H < 500) await unfreeze();
  } else {
    await stroke(page, path, { pointer: 'mouse', steps: 40, delay: 0, release: false });
  }
  let s = await st();
  out.afterDraw = { fuses: s.fuses.length, len: Math.round(s.fuses[0]?.len), sd: Math.round(s.fuses[0]?.sd) };

  // Medición de velocidad: posición de la chispa vs tiempo, dentro de la página.
  out.speed = await page.evaluate(() => new Promise((res) => {
    const samples = [];
    const t0 = performance.now();
    const f = () => {
      const s = CL.fuegos._debug.state();
      if (s.fuses[0]) samples.push([performance.now() - t0, s.fuses[0].sd, s.fuses[0].x, s.fuses[0].y]);
      if (performance.now() - t0 < 900 && s.fuses[0] && !s.fuses[0].waiting) requestAnimationFrame(f);
      else {
        // Regresión lineal sd(t) y velocidad por tramos de ~100 ms.
        const n = samples.length;
        const mt = samples.reduce((a, b) => a + b[0], 0) / n, md = samples.reduce((a, b) => a + b[1], 0) / n;
        let num = 0, den = 0;
        for (const [tt, d] of samples) { num += (tt - mt) * (d - md); den += (tt - mt) ** 2; }
        const slope = (num / den) * 1000;
        let maxRes = 0;
        for (const [tt, d] of samples) maxRes = Math.max(maxRes, Math.abs(md + (slope / 1000) * (tt - mt) - d));
        const chunks = [];
        for (let i = 0, j = 0; i < n; i = j) {
          j = i + 1;
          while (j < n && samples[j][0] - samples[i][0] < 100) j++;
          if (j < n) chunks.push(Math.round(((samples[j][1] - samples[i][1]) / (samples[j][0] - samples[i][0])) * 1000));
        }
        // Distancia euclídea recorrida por la posición (x,y) vs sd.
        let geo = 0;
        for (let i = 1; i < n; i++) geo += Math.hypot(samples[i][2] - samples[i - 1][2], samples[i][3] - samples[i - 1][3]);
        res({ samples: n, pxPerSec: Math.round(slope), maxResidualPx: +maxRes.toFixed(1), chunks, geoVsSd: +(geo / (samples[n - 1][1] - samples[0][1])).toFixed(3) });
      }
    };
    requestAnimationFrame(f);
  }));

  await waitFor(() => { const s = CL.fuegos._debug.state(); return s.fuses[0] && s.fuses[0].sd >= s.fuses[0].len * 0.5; });
  await freeze();
  s = await st();
  out.mid = { sd: Math.round(s.fuses[0].sd), len: Math.round(s.fuses[0].len), particles: s.particles };
  await shot(page, `${dir}-1-mitad`);
  await unfreeze();

  /* 2) Chispa esperando al dedo. */
  await waitFor(() => { const s = CL.fuegos._debug.state(); return s.fuses[0] && s.fuses[0].waiting; });
  await page.waitForTimeout(500);
  await freeze();
  s = await st();
  out.waiting = { waiting: s.fuses[0].waiting, down: s.fuses[0].down, crackle: s.crackle, particles: s.particles };
  await shot(page, `${dir}-2-espera`);
  await unfreeze();

  /* 3) Levantar el dedo: explota. */
  if (touch) await touches(page, []); else await page.mouse.up();
  await page.waitForTimeout(140);
  await freeze();
  s = await st();
  out.boom = { fuses: s.fuses.length, particles: s.particles };
  await shot(page, `${dir}-3-explosion`);
  await unfreeze();
  await page.waitForTimeout(1100);
  await freeze();
  await shot(page, `${dir}-4-cayendo`);
  out.falling = { particles: (await st()).particles };
  await unfreeze();
  await page.waitForTimeout(2500);

  /* 4) Toque sin mover: mecha mínima que explota. */
  if (touch) {
    await touchStart(page, [{ x: W / 2, y: H / 2 }]);
    await page.waitForTimeout(250);
    await touches(page, []);
  } else {
    await page.mouse.move(W / 2, H / 2); await page.mouse.down(); await page.waitForTimeout(250); await page.mouse.up();
  }
  await page.waitForTimeout(120);
  s = await st();
  out.tap = { fuses: s.fuses.length, particles: s.particles };
  await page.waitForTimeout(3000);
  await page.evaluate(() => CL.fuegos._debug.clear());

  /* 5) Tres dedos a la vez (en táctiles) + explosiones de tipos distintos en pantalla. */
  if (touch) {
    const x1 = W * 0.12, x2 = W * 0.45, x3 = W * 0.75;
    const y0 = H * 0.8, y1 = H * 0.3;
    // Recorridos largos con el tiempo justo para que ardan mientras explotan otras.
    await page.evaluate(([w, h]) => {
      CL.fuegos._debug.explode(w * 0.3, h * 0.35, 'peonia', 0);
      setTimeout(() => CL.fuegos._debug.explode(w * 0.7, h * 0.3, 'anillo', 4), 150);
      setTimeout(() => CL.fuegos._debug.explode(w * 0.5, h * 0.55, 'corazon', 7), 300);
    }, [W, H]);
    await multiStroke(page, [
      [[x1, y0], [x1 + W * 0.06, y1], [x1 + W * 0.12, y0 - 40]],
      [[x2, y0], [x2 - W * 0.05, (y0 + y1) / 2], [x2 + W * 0.04, y1]],
      [[x3, y0], [x3 + W * 0.08, y1 + 60], [x3 + W * 0.02, y1]],
    ], { steps: 16, delay: 4, release: false }); // los tres dedos siguen apoyados durante la captura
    await page.waitForTimeout(150);
    await freeze();
    s = await st();
    out.multi = { fuses: s.fuses.length, down: s.fuses.filter((f) => f.down).length, colors: s.fuses.map((f) => f.color), particles: s.particles };
    await shot(page, `${dir}-5-multi`);
    await unfreeze();
    await touches(page, []); // se levantan los tres dedos
    await page.waitForFunction(() => CL.fuegos._debug.state().fuses.length === 0, null, { timeout: 8000 });
    await page.waitForTimeout(250);
    await freeze();
    out.multiAfter = { particles: (await st()).particles };
    await shot(page, `${dir}-6-multi-explotan`);
    await unfreeze();
    await page.waitForTimeout(2500);
  }

  /* 6) FPS durante muchas explosiones simultáneas + mechas. */
  out.fps = await page.evaluate(([w, h]) => new Promise((res) => {
    const types = CL.fuegos.TYPES;
    let i = 0;
    const iv = setInterval(() => {
      for (let k = 0; k < 2; k++) CL.fuegos._debug.explode(w * (0.15 + Math.random() * 0.7), h * (0.2 + Math.random() * 0.45), types[i++ % types.length]);
    }, 250);
    let frames = 0, maxP = 0, worst = 0, last = performance.now();
    const t0 = last;
    const f = (now) => {
      frames++;
      worst = Math.max(worst, now - last); last = now;
      maxP = Math.max(maxP, CL.fuegos._debug.state().particles);
      if (now - t0 < 2500) requestAnimationFrame(f);
      else { clearInterval(iv); const s = CL.fuegos._debug.state(); res({ fps: +(frames / ((now - t0) / 1000)).toFixed(1), maxParticles: maxP, worstFrameMs: Math.round(worst), quality: +s.quality.toFixed(2) }); }
    };
    requestAnimationFrame(f);
  }), [W, H]);
  await shot(page, `${dir}-7-muchas`);
  await page.waitForTimeout(3500);
  await page.evaluate(() => CL.fuegos._debug.clear());
}

/* 7) Cada tipo de explosión (forzado). */
if (doTypes) {
  const types = await page.evaluate(() => CL.fuegos.TYPES);
  await page.evaluate(() => document.querySelector('.fw-hint')?.classList.add('fw-hint--gone'));
  const when = { sauce: 1300, confites: 900, crossette: 850, crisantemo: 700 };
  for (const [i, type] of types.entries()) {
    await page.evaluate(() => CL.fuegos._debug.clear());
    await page.waitForTimeout(60);
    await page.evaluate(([x, y, type, c]) => CL.fuegos._debug.explode(x, y, type, c), [W / 2, H * 0.45, type, i % 8]);
    await page.waitForTimeout(when[type] || 420);
    await freeze();
    await shot(page, `${dir}-tipo-${type}`);
    await unfreeze();
  }
}

// 8) Pausa con la pestaña oculta y parada al salir.
out.hidden = await page.evaluate(async () => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
  document.dispatchEvent(new Event('visibilitychange'));
  const f0 = CL.fuegos._debug.state().frames;
  await new Promise((r) => setTimeout(r, 300));
  const f1 = CL.fuegos._debug.state().frames;
  delete document.visibilityState;
  document.dispatchEvent(new Event('visibilitychange'));
  await new Promise((r) => setTimeout(r, 300));
  const f2 = CL.fuegos._debug.state().frames;
  return { pausedFrames: f1 - f0, resumedFrames: f2 - f1 };
});
await page.evaluate(() => CL.router.go('inicio'));
await page.waitForTimeout(600);
out.afterLeave = await page.evaluate(() => CL.fuegos._debug.state());
out.errors = t.errors;
console.log(JSON.stringify(out, null, 1));
await t.close();
