// Neón: girar la pantalla no pierde el dibujo (lienzo cuadrado centrado); sonidos propios sin errores.
import { launch, appUrl, shot, multiStroke, rect } from '../lib.mjs';

const t = await launch({ size: 'phone' });
const { page } = t;
await page.goto(appUrl('neon'));
await page.waitForFunction(() => CL.neon && CL.neon.debug && CL.neon.debug.ready);
await page.locator('.neon-mirror').nth(2).click();
await page.locator('.neon-swatch').nth(3).click();
const r = await rect(page, '.neon-stage');
await multiStroke(page, [[[r.x + 40, r.y + 60], [r.x + r.width * 0.45, r.y + r.height * 0.4], [r.x + 60, r.y + r.height - 50]]], { steps: 30 });
await page.waitForTimeout(200);
await shot(page, 'neon/giro-1-vertical');
const a = await page.evaluate(() => CL.neon.debug);
await page.setViewportSize({ width: 844, height: 390 });
await page.waitForTimeout(500);
await shot(page, 'neon/giro-2-horizontal');
const b = await page.evaluate(() => CL.neon.debug);
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(500);
await shot(page, 'neon/giro-3-vertical-otra-vez');
const c = await page.evaluate(() => CL.neon.debug);
const snd = await page.evaluate(async () => {
  CL.sound.unlock();
  const h = CL.sound.loop('neonHum');
  const real = h.update.toString().length > 20;
  h.update({ speed: 1.2 }); await CL.util.sleep(200); h.stop();
  CL.sound.play('neonOn'); CL.sound.play('neonOff');
  CL.sound.setMuted(true);
  const muted = CL.sound.loop('neonHum');
  const dummy = muted.update.toString().length < 20;
  CL.sound.setMuted(false);
  return { real, dummyMuted: dummy, ctx: CL.sound.synth.ac && CL.sound.synth.ac.state };
});
// Desmontar limpio (ir a otra pantalla y volver)
await page.evaluate(() => CL.router.go('inicio'));
await page.waitForTimeout(700);
await page.evaluate(() => CL.router.go('neon'));
await page.waitForFunction(() => CL.neon.debug && CL.neon.debug.ready);
await page.waitForTimeout(300);
await shot(page, 'neon/giro-4-vuelta');
console.log(JSON.stringify({ a: [a.S, a.stageW, a.stageH], b: [b.S, b.stageW, b.stageH], c: [c.S, c.stageW, c.stageH], snd, vuelta: await page.evaluate(() => CL.neon.debug.hasInk) }), 'errors', t.errors);
await t.close();
