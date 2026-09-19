// Neón: cada color y el arcoíris; cada modo de espejo con dos dedos (capturas durante y después del gesto).
import { launch, appUrl, shot, multiStroke, touches, rect } from '../lib.mjs';

const size = process.argv[2] || 'tablet';
const t = await launch({ size });
const { page } = t;
await page.goto(appUrl('neon'));
await page.waitForFunction(() => CL.neon && CL.neon.debug && CL.neon.debug.ready);
const r = await rect(page, '.neon-stage');
const X = (f) => r.x + r.width * f, Y = (f) => r.y + r.height * f;
const tapSel = async (sel, i) => { await page.locator(sel).nth(i).click(); await page.waitForTimeout(60); };
const clear = async () => {
  const b = await rect(page, '.neon-clear');
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down(); await page.waitForTimeout(1400); await page.mouse.up();
  await page.waitForTimeout(1300);
};
const wave = (y0, amp, n = 30, x0 = 0.08, x1 = 0.92) => {
  const p = [];
  for (let i = 0; i <= n; i++) { const a = i / n; p.push([X(x0 + (x1 - x0) * a), Y(y0) + Math.sin(a * Math.PI * 4) * amp]); }
  return p;
};

// 1) Todos los colores (9 trazos, grosor mediano)
await tapSel('.neon-mirror', 0);
await tapSel('.neon-size', 1);
for (let i = 0; i < 9; i++) {
  await tapSel('.neon-swatch', i);
  await multiStroke(page, [wave(0.08 + i * 0.105, r.height * 0.03)], { steps: 40, delay: 4 });
}
await page.waitForTimeout(200);
await shot(page, `neon/modos/${size}-colores`);
await clear();
await shot(page, `neon/modos/${size}-borrado`);

// 2) Espejos 2, 4, 6, 8 con dos dedos: captura en medio del gesto y al soltar.
const colorsFor = { 2: 1, 4: 7, 6: 2, 8: 0 };
for (const [mi, n] of [[1, 2], [2, 4], [3, 6], [4, 8]]) {
  await tapSel('.neon-mirror', mi);
  await tapSel('.neon-swatch', colorsFor[n]);
  await tapSel('.neon-size', n === 8 ? 0 : 1);
  const f1 = [[X(0.55), Y(0.2)], [X(0.7), Y(0.3)], [X(0.62), Y(0.45)], [X(0.8), Y(0.4)], [X(0.85), Y(0.25)]];
  const f2 = [[X(0.35), Y(0.6)], [X(0.42), Y(0.8)], [X(0.25), Y(0.85)], [X(0.2), Y(0.7)]];
  await multiStroke(page, [f1, f2], { steps: 36, delay: 6, release: false });
  await page.waitForTimeout(50);
  await shot(page, `neon/modos/${size}-espejo${n}-durante`);
  await touches(page, []);
  await page.waitForTimeout(200);
  await shot(page, `neon/modos/${size}-espejo${n}-despues`);
  await clear();
}
// 3) Arcoíris con caleidoscopio de 8 y un trazo largo en espiral.
await tapSel('.neon-mirror', 4);
await tapSel('.neon-swatch', 8);
await tapSel('.neon-size', 1);
const sp = [];
for (let i = 0; i <= 60; i++) { const a = i / 60 * Math.PI * 2.2, rr = 40 + i * Math.min(r.width, r.height) * 0.0055; sp.push([X(0.5) + Math.cos(a) * rr, Y(0.5) + Math.sin(a) * rr]); }
await multiStroke(page, [sp], { steps: 90, delay: 4, release: false });
await shot(page, `neon/modos/${size}-arcoiris8-durante`);
await touches(page, []);
await page.waitForTimeout(200);
await shot(page, `neon/modos/${size}-arcoiris8-despues`);
console.log(JSON.stringify(await page.evaluate(() => CL.neon.debug)));
console.log('errors', t.errors);
await t.close();
