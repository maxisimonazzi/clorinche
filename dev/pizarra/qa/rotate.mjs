// Rotar / cambiar de tamaño a mitad de uso: con dibujo, en medio de un trazo, y abrir una obra en otro tamaño.
import { open, S, board, at, wave, stroke, multiStroke, info, inked, works, ready, SIZES } from './h.mjs';
import { touches } from '../../lib.mjs';

const pairs = [['tablet', 'tabletV'], ['phone', 'phoneH']];
for (const [a, bName] of pairs) {
  const t = await open(a);
  const { page } = t;
  const out = { from: a, to: bName };
  let b = await board(page);
  await page.evaluate(() => { CL.pizarra.current._test.selectTool('fibra'); CL.pizarra.current._test.selectSize(2); CL.pizarra.current._test.selectColor('#2f5bea'); });
  // un marco para ver si se escala entero
  await stroke(page, [at(b, 0.03, 0.03), at(b, 0.97, 0.03), at(b, 0.97, 0.97), at(b, 0.03, 0.97), at(b, 0.03, 0.03)], { pointer: 'touch', steps: 60, delay: 6 });
  await stroke(page, [at(b, 0.2, 0.5), at(b, 0.8, 0.5)], { pointer: 'touch', steps: 20 });
  await page.waitForTimeout(300);
  out.before = { board: b, info: await info(page) };
  // rotar
  const s2 = SIZES[bName];
  await page.setViewportSize({ width: s2.width, height: s2.height });
  await page.waitForTimeout(600);
  b = await board(page);
  out.afterRotate = { board: b, scale: (await info(page)).scale, stage: await page.evaluate(() => { const r = document.querySelector('.pz-stage').getBoundingClientRect(); return { w: r.width, h: r.height }; }) };
  out.afterRotate.boardAreaPct = Math.round((b.width * b.height) / (out.afterRotate.stage.w * out.afterRotate.stage.h) * 100);
  await S(page, `rotate/${a}-to-${bName}-1-rotated`);
  // dibujar después de rotar: el trazo cae donde está el dedo
  await page.evaluate(() => CL.pizarra.current._test.selectColor('#ff3b30'));
  await stroke(page, [at(b, 0.5, 0.2), at(b, 0.5, 0.8)], { pointer: 'touch', steps: 20 });
  await page.waitForTimeout(200);
  await S(page, `rotate/${a}-to-${bName}-2-drawn-after`);
  // tocar en la zona vacía del escenario (fuera del tablero): ¿pasa algo?
  const st = await page.locator('.pz-stage').boundingBox();
  const offX = b.x - st.x > 30 ? st.x + (b.x - st.x) / 2 : null;
  const offY = b.y - st.y > 30 ? st.y + (b.y - st.y) / 2 : null;
  out.emptyStageBand = { left: Math.round(b.x - st.x), top: Math.round(b.y - st.y) };
  // rotar EN MEDIO de un trazo
  const path = wave(b, 0.35, 0.1, 0.9);
  await multiStroke(page, [path.slice(0, 6)], { steps: 12, delay: 10, release: false });
  const s1 = SIZES[a];
  await page.setViewportSize({ width: s1.width, height: s1.height });
  await page.waitForTimeout(400);
  const b3 = await board(page);
  // seguir moviendo el mismo dedo hacia donde "estaba" el recorrido, en la pantalla nueva (en fracciones del tablero nuevo)
  for (let k = 6; k < path.length; k++) {
    const fx = (path[k][0] - b.x) / b.width, fy = (path[k][1] - b.y) / b.height;
    await touches(page, [{ x: b3.x + fx * b3.width, y: b3.y + fy * b3.height, id: 1 }]);
    await page.waitForTimeout(20);
  }
  await touches(page, []);
  await page.waitForTimeout(300);
  out.backRotate = { board: b3, info: await info(page) };
  await S(page, `rotate/${a}-to-${bName}-3-rotated-mid-stroke`);
  out.errors = t.errors;
  console.log(JSON.stringify(out));
  await t.close();
}
