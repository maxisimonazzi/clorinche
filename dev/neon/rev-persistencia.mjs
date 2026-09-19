// Revisión neón: ¿cuánto tiempo después de un trazo hay que esperar para que sobreviva a una recarga?
// Y: obra en progreso abierta por id -> "borrar todo" -> dibujar -> recargar.
import { launch, appUrl, shot, multiStroke, rect, SHOTS } from '../lib.mjs';
import path from 'node:path';
import fs from 'node:fs';

const size = process.argv[2] || 'tablet';
const prof = path.join(SHOTS, 'neon', 'rev', '_perfil-pers-' + size);
fs.rmSync(prof, { recursive: true, force: true });
const t = await launch({ size, persistent: prof });
const { page } = t;
const out = { size, ventana: [] };
const ready = () => page.waitForFunction(() => CL.neon && CL.neon.debug && CL.neon.debug.ready);
const works = () => page.evaluate(async () => (await CL.db.works.list({ kind: 'neon' })).map((w) => ({ id: w.id, st: w.status, up: w.updatedAt })));

await page.goto(appUrl('neon'));
await ready();
let r = await rect(page, '.neon-stage');
const X = (f) => r.x + r.width * f, Y = (f) => r.y + r.height * f;

// Tiempo real desde que se suelta el dedo hasta que queda en la base.
await multiStroke(page, [[[X(0.1), Y(0.1)], [X(0.4), Y(0.2)]]], { steps: 10 });
const t0 = Date.now();
while (Date.now() - t0 < 8000 && !(await works()).length) await page.waitForTimeout(25);
out.msPrimerGuardado = Date.now() - t0;

let n = 1;
for (const wait of [100, 500, 900, 1200, 1600, 2500]) {
  const before = (await works())[0];
  await multiStroke(page, [[[X(0.1), Y(0.2 + n * 0.1)], [X(0.9), Y(0.25 + n * 0.1)]]], { steps: 10 });
  await page.waitForTimeout(wait);
  await page.reload();
  await ready();
  const after = (await works())[0];
  out.ventana.push({ esperaMs: wait, guardado: !!after && after.up !== before.up });
  n++;
}
await shot(page, `neon/rev/persistencia/${size}-final`);

// Pasar a segundo plano (visibilitychange) enseguida: ¿se guarda?
{
  const before = (await works())[0];
  await multiStroke(page, [[[X(0.5), Y(0.1)], [X(0.5), Y(0.9)]]], { steps: 10 });
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(600);
  const after = (await works())[0];
  out.segundoPlano600ms = after.up !== before.up;
  await page.reload();
  await ready();
}

// Obra en progreso abierta por id (#neon/<id>) -> borrar todo -> dibujar -> recargar.
const id0 = (await works()).find((w) => w.st === 'progress').id;
await page.evaluate((id) => CL.router.go('neon/' + id), id0);
await page.waitForFunction((id) => CL.neon.debug && CL.neon.debug.ready && CL.neon.debug.workId === id, id0);
r = await rect(page, '.neon-stage');
const cb = await rect(page, '.neon-clear');
await page.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2);
await page.mouse.down(); await page.waitForTimeout(1350); await page.mouse.up();
await page.waitForTimeout(1500);
await multiStroke(page, [[[X(0.2), Y(0.5)], [X(0.5), Y(0.3)], [X(0.8), Y(0.5)]]], { steps: 16 });
await page.waitForTimeout(2500);
out.trasBorrarYDibujar = { hash: await page.evaluate(() => location.hash), works: await works() };
await page.reload();
await ready();
await page.waitForTimeout(300);
out.recargado = { hash: await page.evaluate(() => location.hash), dbg: await page.evaluate(() => CL.neon.debug) };
await shot(page, `neon/rev/persistencia/${size}-id-borrado-recargado`);

// #neon/<id inexistente>: dibujar, esperar, recargar.
await page.evaluate(() => CL.router.go('neon/noexiste123'));
await ready();
await multiStroke(page, [[[X(0.2), Y(0.2)], [X(0.8), Y(0.8)]]], { steps: 16 });
await page.waitForTimeout(2500);
await page.reload();
await ready();
await page.waitForTimeout(300);
out.idInexistente = { hash: await page.evaluate(() => location.hash), hasInk: await page.evaluate(() => CL.neon.debug.hasInk), works: (await works()).length };

out.errors = t.errors;
console.log(JSON.stringify(out, null, 1));
await t.close();
