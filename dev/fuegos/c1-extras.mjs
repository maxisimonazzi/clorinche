// Corrección 1 — crossette, movimiento reducido, color sólo por sesión, cambio de dpr y volumen del crepitar.
// Uso: node fuegos/c1-extras.mjs
import { launch, appUrl, shot, tap, touchStart, touches } from '../lib.mjs';
import os from 'node:os';
import path from 'node:path';

const out = {};
const st = (page) => page.evaluate(() => CL.fuegos._debug.state());
const hideHint = (page) => page.evaluate(() => document.querySelector('.fw-hint')?.classList.add('fw-hint--gone'));

/* A) Secuencia de la crossette (tablet) en una tira. */
{
  const t = await launch({ size: 'tablet' });
  const { page } = t;
  await page.goto(appUrl('fuegos'));
  await page.waitForTimeout(700);
  await hideHint(page);
  const times = [60, 200, 380, 520, 620, 760, 1000];
  const frames = [];
  for (const ms of times) {
    await page.evaluate(() => { CL.fuegos._debug.clear(); CL.fuegos._debug.timeScale(1); CL.fuegos._debug.explode(512, 380, 'crossette', 1); });
    await page.waitForTimeout(ms);
    await page.evaluate(() => CL.fuegos._debug.timeScale(0));
    await page.waitForTimeout(40);
    const buf = await page.screenshot({ clip: { x: 262, y: 130, width: 500, height: 500 } });
    frames.push('data:image/png;base64,' + buf.toString('base64'));
  }
  await page.setContent(`<body style="margin:0;background:#111;color:#fff;font:13px sans-serif"><div style="display:flex;gap:4px">${frames.map((f, i) => `<figure style="margin:0"><img src="${f}" style="width:250px;display:block"><figcaption>${times[i]} ms</figcaption></figure>`).join('')}</div></body>`);
  await page.setViewportSize({ width: 7 * 254, height: 290 });
  await shot(page, 'fuegos/c1-crossette-secuencia');
  out.errorsA = t.errors;
  await t.close();
}

/* B) Movimiento reducido: sin destello blanco grande. */
{
  const t = await launch({ size: 'phone' });
  const { page } = t;
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(appUrl('fuegos'));
  await page.waitForTimeout(700);
  await hideHint(page);
  await page.evaluate(() => { CL.fuegos._debug.explode(195, 380, 'peonia', 4); });
  await page.waitForTimeout(50);
  await page.evaluate(() => CL.fuegos._debug.timeScale(0));
  out.reduced = { calm: (await st(page)).calm };
  await shot(page, 'fuegos/c1-reducido');
  out.errorsB = t.errors;
  await t.close();
}

/* C) Color: se recuerda al recargar (misma sesión) pero no en una sesión nueva. */
{
  const dir = path.join(os.tmpdir(), 'colorinche-perfil-fuegos-c1-' + Date.now());
  const t = await launch({ size: 'phone', persistent: dir });
  const { page } = t;
  await page.goto(appUrl('fuegos'));
  await page.waitForTimeout(700);
  const b = await page.locator('.fw-swatch[data-color="celeste"]').boundingBox();
  await tap(page, b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(100);
  out.color = { chosen: (await st(page)).color };
  await page.reload();
  await page.waitForTimeout(700);
  out.color.afterReload = (await st(page)).color;
  await t.close();
  const t2 = await launch({ size: 'phone', persistent: dir });
  await t2.page.goto(appUrl('fuegos'));
  await t2.page.waitForTimeout(700);
  out.color.newSession = (await st(t2.page)).color;
  out.errorsC = t2.errors;
  await t2.close();
}

/* D) Cambio de dpr sin cambio de tamaño (otro monitor): el cielo se redibuja. */
{
  const t = await launch({ size: 'desktop' });
  const { page } = t;
  await page.goto(appUrl('fuegos'));
  await page.waitForTimeout(700);
  const before = await page.evaluate(() => document.querySelector('.fw-sky').width);
  const c = await page.context().newCDPSession(page);
  await c.send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 768, deviceScaleFactor: 2, mobile: false });
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => ({ sky: document.querySelector('.fw-sky').width, dpr: devicePixelRatio, fdpr: CL.fuegos._debug.state().fdpr }));
  out.dpr = { skyBefore: before, ...after };
  out.errorsD = t.errors;
  await t.close();
}

/* E) Volumen: crepitar de la mecha vs. tap y explosión (pico/RMS a la salida del master). */
{
  const t = await launch({ size: 'tablet' });
  const { page } = t;
  await page.goto(appUrl('fuegos'));
  await page.waitForTimeout(700);
  await tap(page, 500, 400);
  await page.waitForTimeout(3000);
  await page.evaluate(() => {
    const s = CL.sound.synth;
    const an = s.ac.createAnalyser();
    an.fftSize = 2048;
    s.out.connect(an);
    window.__meter = (ms) => new Promise((res) => {
      const buf = new Float32Array(an.fftSize);
      let peak = 0, sum = 0, n = 0;
      const t0 = performance.now();
      const iv = setInterval(() => {
        an.getFloatTimeDomainData(buf);
        for (const v of buf) { peak = Math.max(peak, Math.abs(v)); sum += v * v; n++; }
        if (performance.now() - t0 > ms) { clearInterval(iv); res({ peak: +peak.toFixed(3), rms: +Math.sqrt(sum / n).toFixed(4) }); }
      }, 20);
    });
  });
  const audio = {};
  audio.tap = await page.evaluate(() => { CL.sound.play('tap'); return window.__meter(300); });
  await page.waitForTimeout(300);
  await touchStart(page, [{ x: 100, y: 600 }]);
  await touches(page, [{ x: 900, y: 600 }]);
  await page.waitForTimeout(300);
  audio.fuse1 = await page.evaluate(() => window.__meter(800));
  const ten = [];
  for (let i = 0; i < 9; i++) ten.push({ x: 100 + i * 90, y: 300, id: i + 2 });
  await touchStart(page, [{ x: 900, y: 600, id: 1 }, ...ten]);
  await touches(page, [{ x: 900, y: 600, id: 1 }, ...ten.map((p) => ({ ...p, y: 700 }))]);
  await page.waitForTimeout(300);
  audio.fuse10 = await page.evaluate(() => window.__meter(800));
  await touches(page, []);
  await page.waitForFunction(() => CL.fuegos._debug.state().fuses.length === 0, null, { timeout: 20000 });
  await page.waitForTimeout(2500);
  audio.boom1 = await page.evaluate(() => { CL.fuegos._debug.explode(500, 300, 'peonia'); return window.__meter(1000); });
  out.audio = audio;
  out.errorsE = t.errors;
  await t.close();
}
console.log(JSON.stringify(out, null, 1));
