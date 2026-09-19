// Revisión neón: (a) confirmar "borrar todo" y salir durante el parpadeo; (b) girar a mitad del trazo
// de horizontal a vertical (el lienzo no crece): ¿el trazo salta?
import { launch, appUrl, shot, multiStroke, rect, SHOTS } from '../lib.mjs';
import path from 'node:path';
import fs from 'node:fs';

const prof = path.join(SHOTS, 'neon', 'rev', '_perfil-sospechas');
fs.rmSync(prof, { recursive: true, force: true });
const t = await launch({ size: 'phoneH', persistent: prof });
const { page } = t;
const out = {};
const ready = () => page.waitForFunction(() => CL.neon && CL.neon.debug && CL.neon.debug.ready);
await page.goto(appUrl('neon'));
await ready();
let r = await rect(page, '.neon-stage');
const X = (f) => r.x + r.width * f, Y = (f) => r.y + r.height * f;
const cdp = await page.context().newCDPSession(page);
const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });

// (a)
await multiStroke(page, [[[X(0.2), Y(0.3)], [X(0.8), Y(0.6)]]], { steps: 12 });
await page.waitForTimeout(2600); // guardado
const cb = await rect(page, '.neon-clear');
await touch('touchStart', [{ x: cb.x + cb.width / 2, y: cb.y + cb.height / 2, id: 1 }]);
await page.waitForTimeout(1300);
await touch('touchEnd', []);
await page.waitForTimeout(250); // en pleno parpadeo
const home = await rect(page, '.screen--neon .btn-home');
await touch('touchStart', [{ x: home.x + home.width / 2, y: home.y + home.height / 2, id: 1 }]);
await touch('touchEnd', []);
await page.waitForTimeout(1500);
out.hashTrasSalir = await page.evaluate(() => location.hash);
out.obrasTrasBorrarYSalir = await page.evaluate(async () => (await CL.db.works.list({ kind: 'neon' })).map((w) => w.status));
await page.evaluate(() => CL.router.go('neon'));
await ready();
await page.waitForTimeout(300);
out.alVolver = await page.evaluate(() => CL.neon.debug.hasInk);
await shot(page, 'neon/rev/sospechas/a-borrar-y-salir-al-volver');

// (b) horizontal -> vertical a mitad del trazo (S no cambia: 572 >= 504)
await page.evaluate(() => CL.router.go('pizarra'));
await page.waitForTimeout(400);
await page.evaluate(() => CL.router.go('neon'));
await ready();
// limpiar
const cb2 = await rect(page, '.neon-clear');
await touch('touchStart', [{ x: cb2.x + cb2.width / 2, y: cb2.y + cb2.height / 2, id: 1 }]);
await page.waitForTimeout(1300); await touch('touchEnd', []); await page.waitForTimeout(1300);
r = await rect(page, '.neon-stage');
await page.locator('.neon-swatch').nth(2).click();
await touch('touchStart', [{ x: X(0.3), y: Y(0.5), id: 1 }]);
for (let i = 1; i <= 10; i++) { await touch('touchMove', [{ x: X(0.3 + i * 0.02), y: Y(0.5), id: 1 }]); await page.waitForTimeout(16); }
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
out.durGiro = await page.evaluate(() => ({ S: CL.neon.debug.S, strokes: CL.neon.debug.strokes }));
r = await rect(page, '.neon-stage');
// el dedo "sigue" en el mismo lugar físico relativo de la pizarra nueva y se mueve un poco
for (let i = 1; i <= 10; i++) { await touch('touchMove', [{ x: X(0.5 + i * 0.01), y: Y(0.5 + i * 0.01), id: 1 }]); await page.waitForTimeout(16); }
await touch('touchEnd', []);
await page.waitForTimeout(200);
await shot(page, 'neon/rev/sospechas/b-giro-vertical');
out.errors = t.errors;
console.log(JSON.stringify(out, null, 1));
await t.close();
