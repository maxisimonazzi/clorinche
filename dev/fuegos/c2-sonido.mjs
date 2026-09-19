// Corrección 2 — sonido de la explosión: (a) cuánta potencia queda por encima de 200 Hz (lo que
// reproducen los parlantes de celular/tablet) y nivel "audible" comparado con un toque de botón;
// (b) costo de explode() en el hilo principal con y sin sonido (búfer pre-sintetizado).
// Uso: node fuegos/c2-sonido.mjs
import { launch, appUrl, tap } from '../lib.mjs';

const t = await launch({ size: 'tablet' });
const { page } = t;
await page.goto(appUrl('fuegos'));
await page.waitForTimeout(600);
await tap(page, 60, 400); // gesto: desbloquea el audio
await page.evaluate(() => CL.sound.unlock());
await page.waitForFunction(() => CL.fuegos._debug.state().booms.length === CL.fuegos.TYPES.length, null, { timeout: 15000 });
const ready = await page.evaluate(() => CL.fuegos._debug.state().booms.length);
await page.waitForTimeout(3500);

await page.evaluate(() => {
  const s = CL.sound.synth;
  const an = s.ac.createAnalyser();
  an.fftSize = 4096;
  an.smoothingTimeConstant = 0;
  s.out.connect(an);
  // "Parlante chico": pasa-altos de 250 Hz (2 etapas) y medición de RMS.
  const hp1 = s.ac.createBiquadFilter(); hp1.type = 'highpass'; hp1.frequency.value = 250;
  const hp2 = s.ac.createBiquadFilter(); hp2.type = 'highpass'; hp2.frequency.value = 250;
  const an2 = s.ac.createAnalyser(); an2.fftSize = 2048;
  s.out.connect(hp1); hp1.connect(hp2); hp2.connect(an2);
  window.__meas = (ms) => new Promise((res) => {
    const buf = new Float32Array(an.frequencyBinCount);
    const tb = new Float32Array(an2.fftSize);
    const hz = s.ac.sampleRate / an.fftSize;
    const bands = { lt200: 0, gt200: 0 };
    let peakRms = 0;
    const t0 = performance.now();
    const iv = setInterval(() => {
      an.getFloatFrequencyData(buf);
      for (let i = 1; i < buf.length; i++) {
        const p = Math.pow(10, buf[i] / 10);
        if (i * hz < 200) bands.lt200 += p; else bands.gt200 += p;
      }
      an2.getFloatTimeDomainData(tb);
      let q = 0; for (const v of tb) q += v * v;
      peakRms = Math.max(peakRms, Math.sqrt(q / tb.length));
      if (performance.now() - t0 > ms) {
        clearInterval(iv);
        const tot = bands.lt200 + bands.gt200;
        res({ gt200: +(100 * bands.gt200 / tot).toFixed(1) + '%', rmsHP: +peakRms.toFixed(4) });
      }
    }, 15);
  });
});
const spec = {};
for (const type of await page.evaluate(() => CL.fuegos.TYPES)) {
  spec[type] = await page.evaluate((type) => { CL.fuegos._debug.clear(); CL.fuegos._debug.explode(500, 380, type); return window.__meas(700); }, type);
  await page.waitForTimeout(2000);
}
spec.tap = await page.evaluate(() => { CL.sound.play('tap'); return window.__meas(250); });

const cost = await page.evaluate(async () => {
  const out = {};
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (const muted of [false, true]) {
    CL.sound.setMuted(muted);
    const row = {};
    for (const type of CL.fuegos.TYPES) {
      const ms = [];
      for (let i = 0; i < 6; i++) {
        CL.fuegos._debug.clear();
        await sleep(300);
        const a = performance.now();
        CL.fuegos._debug.explode(500, 380, type, 2);
        ms.push(performance.now() - a);
      }
      ms.sort((x, y) => x - y);
      row[type] = +ms[3].toFixed(2);
    }
    out[muted ? 'mudo' : 'conSonido'] = row;
  }
  CL.sound.setMuted(false);
  return out;
});
console.log(JSON.stringify({ ready, spec, cost, errors: t.errors }, null, 1));
await t.close();
