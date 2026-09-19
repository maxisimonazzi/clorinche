// Corrección 1 — calidad adaptativa: un equipo limitado a 30 fps NO debe degradar;
// uno realmente sobrecargado sí. Además: escena vacía redibuja a baja cadencia.
// Uso: node fuegos/c1-calidad.mjs
import { launch, appUrl, shot } from '../lib.mjs';

const out = {};
const st = (page) => page.evaluate(() => CL.fuegos._debug.state());
const pick = (s) => ({ quality: +s.quality.toFixed(2), fdpr: s.fdpr, fdprMax: s.fdprMax, baseInt: +s.baseInt.toFixed(1), frameEma: +s.frameEma.toFixed(1), work: +s.timing.total.toFixed(2) });

async function scenario(name, initScript) {
  const t = await launch({ size: 'tablet' });
  if (initScript) await t.context.addInitScript(initScript);
  const { page } = t;
  await page.goto(appUrl('fuegos'));
  await page.evaluate(() => document.querySelector('.fw-hint')?.classList.add('fw-hint--gone'));
  await page.waitForTimeout(4000);
  const s0 = await st(page);
  // Cadencia en reposo: cuadros dibujados vs. ticks de rAF durante 2 s.
  const a = await st(page);
  await page.waitForTimeout(2000);
  const b = await st(page);
  const idle = { rendersPerSec: (b.frames - a.frames) / 2, ticksPerSec: (b.ticks - a.ticks) / 2 };
  // Una peonía y una ráfaga de explosiones seguidas (uso intenso).
  await page.evaluate(() => { CL.fuegos._debug.clear(); CL.fuegos._debug.explode(512, 380, 'peonia', 3); });
  await page.waitForTimeout(90);
  const s1 = await st(page);
  await shot(page, `fuegos/c1-${name}-peonia`);
  for (let i = 0; i < 12; i++) {
    await page.evaluate((i) => CL.fuegos._debug.explode(150 + (i % 6) * 140, 250 + (i % 2) * 200), i);
    await page.waitForTimeout(150);
  }
  const s2 = await st(page);
  await page.waitForTimeout(5000);
  const s3 = await st(page);
  out[name] = { start: pick(s0), idle, peoniaParticles: s1.particles, busy: pick(s2), after: pick(s3), errors: t.errors };
  await t.close();
}

await scenario('60fps');
// 30 fps: cada callback de rAF se entrega un cuadro nativo más tarde (modo ahorro de batería).
await scenario('30fps', () => {
  const o = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => o(() => o(cb));
});
// Equipo sobrecargado de verdad: cada cuadro cuesta ~28 ms de trabajo extra cuando hay partículas.
await scenario('lento', () => {
  const o = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => o((t) => {
    const s = window.CL && CL.fuegos && CL.fuegos._debug.state && CL.fuegos._debug.state();
    if (s && s.particles > 0) { const e = performance.now() + 28; while (performance.now() < e) { /* ocupado */ } }
    cb(t);
  });
});
console.log(JSON.stringify(out, null, 1));
