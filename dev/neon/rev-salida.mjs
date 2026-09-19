// Revisión neón: al tocar "inicio" o una pestaña justo después de dibujar, la pantalla espera el guardado.
// ¿Cuánto tarda en cambiar? ¿Se puede seguir dibujando o tocar ¡Terminé! en ese intervalo? ¿Se pierde?
import { launch, appUrl, multiStroke, rect, shot } from '../lib.mjs';

const size = process.argv[2] || 'tablet';
const t = await launch({ size });
const { page } = t;
const out = {};
const ready = () => page.waitForFunction(() => CL.neon && CL.neon.debug && CL.neon.debug.ready);
await page.goto(appUrl('neon'));
await ready();
let r = await rect(page, '.neon-stage');
const X = (f) => r.x + r.width * f, Y = (f) => r.y + r.height * f;
const cdp = await page.context().newCDPSession(page);
const tapAt = async (x, y) => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); };

// 1) Latencia al tocar inicio justo después de un trazo.
await multiStroke(page, [[[X(0.2), Y(0.2)], [X(0.8), Y(0.3)]]], { steps: 12 });
const home = await rect(page, '.screen--neon .btn-home');
const t0 = Date.now();
await tapAt(home.x + home.width / 2, home.y + home.height / 2);
// 2) Mientras espera: otro trazo en la pizarra (todavía visible).
await page.waitForTimeout(120);
out.neonSigueVisible = await page.evaluate(() => !!document.querySelector('.screen--neon'));
await multiStroke(page, [[[X(0.2), Y(0.7)], [X(0.8), Y(0.8)]]], { steps: 8, delay: 4 });
out.dibujoDuranteSalida = await page.evaluate(() => { const c = document.querySelector('.neon-paint'); return c ? 'hay lienzo' : 'sin lienzo'; });
await page.waitForFunction(() => !document.querySelector('.screen--neon') && document.querySelector('.screen--inicio'), null, { timeout: 10000 });
out.msHastaInicio = Date.now() - t0;
await page.evaluate(() => CL.router.go('neon'));
await ready();
await page.waitForTimeout(300);
await shot(page, `neon/rev/salida/${size}-reentrada`);
out.reentrada = await page.evaluate(() => CL.neon.debug.workId);

// 3) Tocar inicio y enseguida ¡Terminé! (dedos torpes en la barra de arriba).
await multiStroke(page, [[[X(0.3), Y(0.5)], [X(0.7), Y(0.5)]]], { steps: 12 });
const home2 = await rect(page, '.screen--neon .btn-home');
const done = await rect(page, '.screen--neon .neon-done');
await tapAt(home2.x + home2.width / 2, home2.y + home2.height / 2);
await page.waitForTimeout(80);
await tapAt(done.x + done.width / 2, done.y + done.height / 2);
await page.waitForTimeout(3500);
out.homeLuegoTermine = await page.evaluate(async () => ({ hash: location.hash, festejo: document.querySelectorAll('.celebrate').length,
  works: (await CL.db.works.list({ kind: 'neon' })).map((w) => w.status) }));
await shot(page, `neon/rev/salida/${size}-home-luego-termine`);
out.errors = t.errors;
console.log(JSON.stringify(out, null, 1));
await t.close();
