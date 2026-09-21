// Corrección 1: vista grande y el fondo oscuro.
// - Un pulgar apoyado en el borde (agarrando la tablet) NO la cierra, ni al apoyarse ni al soltarlo tarde.
// - Un toque corto de un solo dedo (o un clic) en el fondo SÍ la cierra.
// - Con un pulgar apoyado, un toque de otro dedo en el fondo no la cierra (no es un toque "solo").
// - Con el pulgar apoyado, los botones de la vista (X) siguen andando.
// Uso: cd dev && node galeria/c1/agarre.mjs [tamaño=tablet]
import { launch, appUrl, tap, shot } from '../../lib.mjs';
import { ok, clean, center, seedSynthetic, state, tStart, lift, tEnd } from './r1-lib.mjs';
const size = process.argv[2] || 'tablet';
const t = await launch({ size });
const { page } = t;
const touch = t.size.touch;
await page.goto(appUrl('inicio'));
await page.waitForTimeout(800);
await seedSynthetic(page, { done: 4, progress: 0 });
await page.evaluate(() => CL.router.go('obras'));
await page.waitForTimeout(1300);
const vp = page.viewportSize();
const open = async () => {
  const [x, y] = await center(page, '.gal-card >> nth=0');
  await tap(page, x, y, { pointer: touch ? 'touch' : 'mouse' });
  await page.waitForTimeout(900);
};
const edgeInfo = async () => page.evaluate(() => { const r = document.querySelector('.gal-view .modal').getBoundingClientRect(); return { left: r.left, top: r.top, right: innerWidth - r.right }; });

await open();
await shot(page, 'galeria/c1/agarre-' + size + '-vista');
const edge = await edgeInfo();
console.log('   margen de fondo: izquierda', Math.round(edge.left), 'px, arriba', Math.round(edge.top), 'px');
// Punto del fondo: el borde izquierdo (donde va el pulgar que sostiene la tablet). En el celular vertical
// el margen es de 12 px y el navegador desvía un toque tan cerca del modal hacia el modal: ahí se usa
// la franja de arriba.
const bgOf = (e) => (e.left >= 40 ? { x: 8, y: vp.height / 2 } : { x: vp.width / 2, y: Math.max(4, e.top / 2) });
const bgPt = bgOf(edge);

if (touch) {
  // 1) pulgar apoyado en el fondo, se queda 1,5 s y se suelta: la vista sigue.
  await tStart(page, [{ ...bgPt, id: 1 }]);
  await page.waitForTimeout(500);
  ok((await state(page)).modal === 1, 'pulgar apoyado en el fondo → la vista sigue abierta');
  await page.waitForTimeout(1000);
  await tEnd(page);
  await page.waitForTimeout(500);
  ok((await state(page)).modal === 1, 'pulgar que se suelta después de 1,5 s → la vista sigue abierta');

  // 2) pulgar apoyado + otro dedo toca el fondo del otro lado: no cierra.
  const other = edge.left >= 40 ? { x: vp.width - 8, y: bgPt.y, id: 2 } : { x: vp.width / 2 + 60, y: bgPt.y, id: 2 };
  await tStart(page, [{ ...bgPt, id: 1 }]);
  await page.waitForTimeout(200);
  await tStart(page, [{ ...bgPt, id: 1 }, other]);
  await page.waitForTimeout(80);
  await lift(page, [other]);
  await page.waitForTimeout(400);
  ok((await state(page)).modal === 1, 'pulgar apoyado + toque de otro dedo en el fondo → sigue abierta');

  // 3) pulgar apoyado + la X con otro dedo: cierra (los botones andan con la palma).
  const [cx, cy] = await center(page, '.gv-close');
  await tStart(page, [{ ...bgPt, id: 1 }, { x: cx, y: cy, id: 3 }]);
  await page.waitForTimeout(80);
  await lift(page, [{ x: cx, y: cy, id: 3 }]);
  await page.waitForTimeout(500);
  const s3 = await state(page);
  ok(s3.modal === 0 && s3.hash === '#obras', `pulgar apoyado + X → se cierra (${s3.modal}, ${s3.hash})`);
  // 4) Con el pulgar todavía apoyado, tocar otra obra: la abre.
  const [ox, oy] = await center(page, '.gal-card >> nth=1');
  await tStart(page, [{ ...bgPt, id: 1 }, { x: ox, y: oy, id: 4 }]);
  await page.waitForTimeout(80);
  await lift(page, [{ x: ox, y: oy, id: 4 }]);
  await page.waitForTimeout(800);
  ok((await state(page)).modal === 1, 'pulgar apoyado + tocar otra obra → la abre');
  await tEnd(page);
  await page.waitForTimeout(400);
  // 5) Toque corto de un solo dedo en el fondo: cierra.
  const p5 = bgOf(await edgeInfo());
  await tap(page, p5.x, p5.y);
  await page.waitForTimeout(500);
  const s5 = await state(page);
  ok(s5.modal === 0 && s5.hash === '#obras', `toque corto en el fondo → se cierra (${s5.modal}, ${s5.hash})`);
} else {
  // Mouse: clic en el fondo cierra; mantener apretado el botón en el fondo y soltar tarde no.
  await page.mouse.move(bgPt.x, bgPt.y);
  await page.mouse.down();
  await page.waitForTimeout(900);
  await page.mouse.up();
  await page.waitForTimeout(400);
  ok((await state(page)).modal === 1, 'mouse apretado 0,9 s en el fondo → sigue abierta');
  await page.mouse.click(bgPt.x, bgPt.y);
  await page.waitForTimeout(500);
  const s = await state(page);
  ok(s.modal === 0 && s.hash === '#obras', `clic en el fondo → se cierra (${s.modal}, ${s.hash})`);
}
// Escape también cierra.
await open();
await page.keyboard.press('Escape');
await page.waitForTimeout(500);
ok((await state(page)).modal === 0, 'Escape cierra');
ok(clean(t.errors).length === 0, 'sin errores ' + JSON.stringify(clean(t.errors)).slice(0, 600));
await t.close();
