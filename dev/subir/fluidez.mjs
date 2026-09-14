// Corrección 1: tiempos reales (hasta que la pantalla deja de estar ocupada) con la CPU frenada.
//   node subir/fluidez.mjs [tamaño] [factor]
import { launch, appUrl, shot } from '../lib.mjs';
import { IMG, INPUT } from '../review-subir/common.mjs';

const size = process.argv[2] || 'tablet';
const rate = +(process.argv[3] || 4);
const t = await launch({ size });
const { page } = t;
await page.goto(appUrl('subir'));
await page.waitForFunction(() => window.CL && CL.upload && CL.upload.debug());
const cdp = await page.context().newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate });
const out = { size, rate };

/** Ejecuta `fn` en la página y mide hasta que no está ocupada y hubo un render nuevo. Cuenta cuadros largos. */
const timed = (fnSrc) => page.evaluate(async (fnSrc) => {
  const d0 = CL.upload.debug();
  let frames = 0, long = 0, last = performance.now(), run = true;
  const tick = (n) => { frames++; if (n - last > 120) long++; last = n; if (run) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  const t0 = performance.now();
  (0, eval)(fnSrc)();
  await new Promise((r) => requestAnimationFrame(r));
  while (CL.upload.debug().busy || CL.upload.debug().renders === d0.renders) await new Promise((r) => setTimeout(r, 10));
  const ms = Math.round(performance.now() - t0);
  run = false;
  return { ms, framesMientras: frames, cuadrosLargos: long, spinnerVisto: !!document.querySelector('.screen--subir > .spinner') };
}, fnSrc);

for (const f of ['enorme.jpg', 'rv:mascota.jpg', 'pagina-sombra.jpg']) {
  const t0 = Date.now();
  const before = await page.evaluate(() => CL.upload.debug().renders);
  await page.setInputFiles(INPUT, IMG(f));
  await page.waitForFunction((b) => CL.upload.debug().view === 'edit' && CL.upload.debug().renders > b && !CL.upload.debug().busy, before, { timeout: 60000, polling: 20 });
  const openMs = Date.now() - t0;
  const d0 = await page.evaluate(() => CL.upload.debug());
  // Deslizador: 12 pasos como un arrastre (input cada ~30 ms), después se suelta.
  const drag = await page.evaluate(async () => {
    const range = document.querySelector('.up-range');
    const res = [];
    for (let i = 0; i < 12; i++) {
      range.value = String(20 + i * 6);
      const t0 = performance.now();
      range.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      res.push(Math.round(performance.now() - t0));
    }
    const side = CL.upload.debug().shownSide;
    const t1 = performance.now();
    range.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return { pasosMs: res, ladoMientras: side, soltarMs: Math.round(performance.now() - t1), ladoAlSoltar: CL.upload.debug().shownSide };
  });
  const other = d0.mode === 'page' ? 'Foto' : 'Página';
  const modo = await timed(`() => document.querySelector('.up-mode[aria-label^="${other}"]').click()`);
  const modoVuelta = await timed(`() => document.querySelector('.up-mode[aria-label^="${other === 'Foto' ? 'Página' : 'Foto'}"]').click()`);
  const girar = await timed(`() => document.querySelector('.up-rotate').click()`);
  const t1 = Date.now();
  await page.click('.up-save');
  await page.waitForFunction(() => document.querySelector('.toast'), null, { timeout: 60000, polling: 20 });
  const saveMs = Date.now() - t1;
  out[f] = { openMs, src: d0.src, lado: d0.side, primerRenderMs: Math.round(d0.fullMs), drag, cambiarModo: modo, volverModo: modoVuelta, girar, saveMs };
  await page.waitForFunction(() => /^#colorear/.test(location.hash), null, { timeout: 20000 });
  await page.evaluate(() => CL.router.go('subir'));
  await page.waitForFunction(() => CL.upload.debug() && CL.upload.debug().view === 'pick');
}
out.errors = t.errors;
console.log(JSON.stringify(out, null, 1));
await t.close();
