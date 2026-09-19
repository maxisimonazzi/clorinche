// Fuegos: selector de color (y que se recuerde), rotación de pantalla, silencio, clic derecho ignorado.
import { launch, appUrl, shot, stroke, tap } from '../lib.mjs';
const out = {};
const t = await launch({ size: 'phone' });
const { page } = t;
await page.goto(appUrl('fuegos'));
await page.waitForTimeout(700);
// Elegir rojo con un toque
const red = await page.locator('.fw-swatch[data-color="rojo"]').boundingBox();
await tap(page, red.x + red.width / 2, red.y + red.height / 2);
await page.waitForTimeout(150);
out.checked = await page.evaluate(() => [...document.querySelectorAll('.fw-swatch')].filter((b) => b.getAttribute('aria-checked') === 'true').map((b) => b.dataset.color));
await stroke(page, [[60, 500], [200, 300]], { pointer: 'touch', steps: 6, release: false });
out.fuseColor = await page.evaluate(() => CL.fuegos._debug.state().fuses.map((f) => f.color));
await shot(page, 'fuegos/extra-rojo');
await tap(page, 5, 5); // otro dedo cualquiera no rompe nada
await page.evaluate(() => CL.fuegos._debug.clear());
// Recargar: el color elegido se recuerda
await page.reload();
await page.waitForTimeout(700);
out.afterReload = await page.evaluate(() => CL.fuegos._debug.state().color);
// Rotar a horizontal: el selector pasa a la barra
await page.setViewportSize({ width: 844, height: 390 });
await page.waitForTimeout(500);
out.rotated = await page.evaluate(() => ({ inTop: !!document.querySelector('.fw-top .fw-colors'), st: (({ W, H }) => ({ W, H }))(CL.fuegos._debug.state()), sky: document.querySelector('.fw-sky').width }));
await page.evaluate(() => CL.fuegos._debug.explode(420, 200, 'estrella', 3));
await page.waitForTimeout(400);
await shot(page, 'fuegos/extra-rotado');
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(400);
out.back = await page.evaluate(() => ({ float: !!document.querySelector('.screen--fuegos > .fw-colors--float') }));
// Silencio durante una mecha: no hay errores y el loop se recrea
await page.evaluate(() => CL.sound.setMuted(true));
await stroke(page, [[60, 500], [100, 450]], { pointer: 'touch', steps: 4, release: false });
await page.waitForTimeout(200);
await page.evaluate(() => CL.sound.setMuted(false));
await page.waitForTimeout(200);
out.crackleAfterUnmute = await page.evaluate(() => CL.fuegos._debug.state().crackle);
await tap(page, 5, 5);
await t.close();
// Desktop: clic derecho no prende mecha; ruedita del mouse / teclado no rompen
const d = await launch({ size: 'desktop' });
await d.page.goto(appUrl('fuegos'));
await d.page.waitForTimeout(600);
await d.page.mouse.click(600, 400, { button: 'right' });
out.rightClick = await d.page.evaluate(() => CL.fuegos._debug.state().fuses.length);
await d.page.mouse.click(600, 400);
await d.page.waitForTimeout(80);
out.leftClick = await d.page.evaluate(() => CL.fuegos._debug.state().particles > 50);
out.errors = [...t.errors, ...d.errors];
await d.close();
console.log(JSON.stringify(out, null, 1));
