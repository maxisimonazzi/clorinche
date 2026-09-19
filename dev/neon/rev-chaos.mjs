// Revisión neón: uso "de chico de 4 años" en tablet (touch).
import { launch, appUrl, shot, multiStroke, touches, touchStart, tap, rect, SHOTS } from '../lib.mjs';
import path from 'node:path';
import fs from 'node:fs';

const size = process.argv[2] || 'tablet';
const prof = path.join(SHOTS, 'neon', 'rev', '_perfil-chaos-' + size);
fs.rmSync(prof, { recursive: true, force: true });
const t = await launch({ size, persistent: prof });
const { page } = t;
const out = {};
const ready = () => page.waitForFunction(() => CL.neon && CL.neon.debug && CL.neon.debug.ready);
const dbg = () => page.evaluate(() => CL.neon.debug);
const works = () => page.evaluate(async () => (await CL.db.works.list({ kind: 'neon' })).map((w) => w.id + ':' + w.status));
const cdp = await page.context().newCDPSession(page);
const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });

await page.goto(appUrl('neon'));
await ready();
let r = await rect(page, '.neon-stage');
const X = (f) => r.x + r.width * f, Y = (f) => r.y + r.height * f;

// 1) Toques rápidos en la pizarra (puntitos): 25 toques en 1 s.
await page.locator('.neon-swatch').nth(3).click();
for (let i = 0; i < 25; i++) {
  const x = X(0.1 + Math.random() * 0.8), y = Y(0.1 + Math.random() * 0.8);
  await touch('touchStart', [{ x, y, id: 1 }]);
  await touch('touchEnd', []);
  await page.waitForTimeout(30);
}
await page.waitForTimeout(150);
await shot(page, `neon/rev/chaos/${size}-1-toques`);
out.trasToques = await dbg();

// 2) Seis dedos a la vez (el máximo es 5): no se rompe.
await page.locator('.neon-swatch').nth(0).click();
const six = [];
for (let k = 0; k < 6; k++) { const p = []; for (let i = 0; i <= 20; i++) p.push([X(0.1 + k * 0.15), Y(0.15 + i * 0.03)]); six.push(p); }
await multiStroke(page, six, { steps: 20, delay: 6, release: false });
out.seisDedos = (await dbg()).strokes;
await shot(page, `neon/rev/chaos/${size}-2-seis-dedos-durante`);
await touches(page, []);
await page.waitForTimeout(100);
out.seisDedosDespues = (await dbg()).strokes;

// 3) Botones de espejo tocados muchas veces seguidas.
for (let i = 0; i < 12; i++) await page.locator('.neon-mirror').nth(i % 5).click({ delay: 0 });
await page.waitForTimeout(100);
out.espejoTrasRafaga = await page.evaluate(() => ({ n: CL.neon.debug.mirrorN, lines: document.querySelectorAll('.neon-guide line').length, cls: document.querySelector('.neon-stage').className }));

// 4) Tocar la papelera (sin mantener): no borra, se sacude.
const cb = await rect(page, '.neon-clear');
await tap(page, cb.x + cb.width / 2, cb.y + cb.height / 2);
await page.waitForTimeout(250);
await shot(page, `neon/rev/chaos/${size}-3-papelera-tap`);
out.trasTapPapelera = (await dbg()).hasInk;

// 5) Mantener la papelera y a la vez dibujar con otro dedo.
await touch('touchStart', [{ x: cb.x + cb.width / 2, y: cb.y + cb.height / 2, id: 1 }, { x: X(0.3), y: Y(0.5), id: 2 }]);
for (let i = 1; i <= 50; i++) {
  await touch('touchMove', [{ x: cb.x + cb.width / 2, y: cb.y + cb.height / 2, id: 1 }, { x: X(0.3 + i * 0.008), y: Y(0.5 + Math.sin(i / 5) * 0.1), id: 2 }]);
  await page.waitForTimeout(30);
  if (i === 25) await shot(page, `neon/rev/chaos/${size}-4-borrando-mientras-dibuja`);
}
await touch('touchEnd', []);
await page.waitForTimeout(1500);
out.trasBorrarDibujando = await dbg();
await shot(page, `neon/rev/chaos/${size}-5-tras-borrar`);

// 6) Dibujar justo mientras se apaga (durante la animación): se ignora.
await multiStroke(page, [[[X(0.2), Y(0.2)], [X(0.8), Y(0.3)]]], { steps: 12 });
const cb2 = await rect(page, '.neon-clear');
await touch('touchStart', [{ x: cb2.x + cb2.width / 2, y: cb2.y + cb2.height / 2, id: 1 }]);
await page.waitForTimeout(1300);
await touch('touchEnd', []);
await page.waitForTimeout(300);
await multiStroke(page, [[[X(0.2), Y(0.7)], [X(0.8), Y(0.8)]]], { steps: 12 });
await page.waitForTimeout(1200);
out.dibujoDuranteApagado = await dbg();
await shot(page, `neon/rev/chaos/${size}-6-dibujo-durante-apagado`);

// 7) Doble toque rápido a ¡Terminé! (con dibujo).
await multiStroke(page, [[[X(0.3), Y(0.3)], [X(0.6), Y(0.6)], [X(0.7), Y(0.3)]]], { steps: 20 });
const depth0 = await page.evaluate(() => history.length);
const db = await rect(page, '.neon-done');
await tap(page, db.x + db.width / 2, db.y + db.height / 2);
await page.waitForTimeout(60);
await tap(page, db.x + db.width / 2, db.y + db.height / 2);
await page.waitForTimeout(3600);
out.dobleTermine = { hash: await page.evaluate(() => location.hash), historyDelta: (await page.evaluate(() => history.length)) - depth0, celebra: await page.evaluate(() => document.querySelectorAll('.celebrate').length), works: await works() };

// 8) Volver atrás (botón del navegador) desde la galería: ¿qué muestra?
await page.goBack();
await ready();
await page.waitForTimeout(300);
out.trasAtras = { hash: await page.evaluate(() => location.hash), st: await dbg() };
await shot(page, `neon/rev/chaos/${size}-7-atras`);

// 9) Entrar y salir rápido: neon -> fuegos -> neon -> pizarra -> neon con toques seguidos en pestañas.
for (const i of [2, 1, 0, 1, 2, 1]) { await page.locator('.mode-tab').nth(i).click({ delay: 0 }).catch(() => {}); await page.waitForTimeout(40); }
await page.waitForTimeout(1200);
out.pestanas = { hash: await page.evaluate(() => location.hash), screens: await page.evaluate(() => document.querySelectorAll('#app > .screen').length) };
await ready().catch(() => {});

// 10) Dibujar y recargar enseguida (antes del autoguardado de 900 ms).
r = await rect(page, '.neon-stage');
await multiStroke(page, [[[X(0.2), Y(0.4)], [X(0.5), Y(0.2)], [X(0.8), Y(0.4)]]], { steps: 16 });
await page.waitForTimeout(150);
await page.reload();
await ready();
await page.waitForTimeout(300);
out.recargaRapida = { st: await dbg(), works: await works() };
await shot(page, `neon/rev/chaos/${size}-8-recarga-rapida`);

// 11) Dibujar y salir a inicio enseguida, volver a entrar.
await multiStroke(page, [[[X(0.2), Y(0.8)], [X(0.5), Y(0.6)], [X(0.8), Y(0.8)]]], { steps: 16 });
await page.evaluate(() => CL.router.go('inicio'));
await page.waitForTimeout(500);
await page.evaluate(() => CL.router.go('neon'));
await ready();
await page.waitForTimeout(300);
out.salirEntrar = { st: await dbg(), works: await works() };
await shot(page, `neon/rev/chaos/${size}-9-salir-entrar`);

// 12) Fugas: RAF/listeners de neón tras salir.
await page.evaluate(() => {
  window.__rafCount = 0;
  const orig = window.requestAnimationFrame;
  window.requestAnimationFrame = (f) => { window.__rafCount++; return orig(f); };
});
await page.evaluate(() => CL.router.go('inicio'));
await page.waitForTimeout(1500);
out.rafEnInicio = await page.evaluate(() => { const c = window.__rafCount; window.__rafCount = 0; return c; });
await page.waitForTimeout(1000);
out.rafEnInicio2 = await page.evaluate(() => window.__rafCount);

out.errors = t.errors;
console.log(JSON.stringify(out, null, 1));
await t.close();
