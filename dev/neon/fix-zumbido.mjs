// QA neón: zumbido eléctrico que queda sonando para siempre si se apoya un dedo en la pizarra
// mientras la pantalla se está cerrando (guardando) y el dedo sigue apoyado cuando se va.
// Cuenta osciladores de Web Audio arrancados sin stop() (evidencia independiente del módulo).
import { launch, appUrl, multiStroke, rect } from '../lib.mjs';

const size = process.argv[2] || 'tablet';
const t = await launch({ size });
const { page } = t;
await page.addInitScript(() => {
  window.__osc = { start: 0, stop: 0 };
  const S = AudioScheduledSourceNode.prototype;
  const st = S.start, sp = S.stop;
  S.start = function (...a) { if (this instanceof OscillatorNode) window.__osc.start++; return st.apply(this, a); };
  S.stop = function (...a) { if (this instanceof OscillatorNode && !this.__s) { this.__s = 1; window.__osc.stop++; } return sp.apply(this, a); };
});
await page.goto(appUrl('neon'));
await page.waitForFunction(() => CL.neon && CL.neon.debug && CL.neon.debug.ready);
const running = () => page.evaluate(() => window.__osc.start - window.__osc.stop);
const r = await rect(page, '.neon-stage');
const cdp = await page.context().newCDPSession(page);
const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });

// Caso normal: dibujar y soltar -> 0 osciladores colgados
await multiStroke(page, [[[r.x + 100, r.y + 100], [r.x + 500, r.y + 300]]], { steps: 20, delay: 5 });
await page.waitForTimeout(1200);
console.log('normal, tras soltar: osciladores sin parar =', await running());

// Caso chico: toca la pestaña "Pizarra" y enseguida apoya el dedo en la pizarra y lo deja apoyado
await multiStroke(page, [[[r.x + 100, r.y + 400], [r.x + 500, r.y + 500]]], { steps: 20, delay: 5 });
const tab = await rect(page, '.screen--neon .mode-tab');
await touch('touchStart', [{ x: tab.x + tab.width / 2, y: tab.y + tab.height / 2, id: 1 }]);
await touch('touchEnd', []);
await touch('touchStart', [{ x: r.x + 300, y: r.y + 300, id: 2 }]);
for (let k = 0; k < 40; k++) {
  await touch('touchMove', [{ x: r.x + 300 + k * 3, y: r.y + 300, id: 2 }]);
  await page.waitForTimeout(30);
  if (await page.evaluate(() => document.body.dataset.screen === 'pizarra' && !document.querySelector('.screen--neon'))) break;
}
await page.waitForFunction(() => document.body.dataset.screen === 'pizarra');
await touch('touchEnd', []);
await page.waitForTimeout(2000);
console.log('salida con dedo apoyado, 2 s después en la pizarra: osciladores sin parar =', await running(), '(3 = o1, o2 y lfo del zumbido neonHum)');
console.log('errors', t.errors);
await t.close();
