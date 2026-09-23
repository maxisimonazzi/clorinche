// Verificación independiente de fuegos artificiales: capturas en medio de la animación y fps.
import { launch, appUrl, shot, multiStroke, touchStart, touches } from '../lib.mjs';

for (const size of process.argv.slice(2).length ? process.argv.slice(2) : ['tablet', 'desktop', 'phone']) {
  const t = await launch({ size });
  const { page } = t;
  const W = t.size.width, H = t.size.height;
  await page.goto(appUrl('fuegos'));
  await page.waitForTimeout(900);
  await shot(page, `integracion/fuegos-${size}-0-cielo`);

  // Mecha con el dedo apoyado: arrancar un trazo largo y sacar captura a mitad de camino (dedo sigue apoyado).
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const a = i / 40;
    pts.push({ x: W * (0.15 + 0.7 * a), y: H * (0.7 - 0.35 * Math.sin(a * Math.PI)) });
  }
  if (t.size.touch) {
    await touchStart(page, [{ ...pts[0], id: 1 }]);
    for (const p of pts.slice(1)) { await touches(page, [{ ...p, id: 1 }]); await page.waitForTimeout(12); }
  } else {
    await page.mouse.move(pts[0].x, pts[0].y); await page.mouse.down();
    for (const p of pts.slice(1)) { await page.mouse.move(p.x, p.y); await page.waitForTimeout(12); }
  }
  await page.waitForTimeout(250);
  await shot(page, `integracion/fuegos-${size}-1-mecha-ardiendo`);
  await page.waitForTimeout(2600);
  await shot(page, `integracion/fuegos-${size}-2-esperando-dedo`);
  if (t.size.touch) await touches(page, []); else await page.mouse.up();
  await page.waitForTimeout(350);
  await shot(page, `integracion/fuegos-${size}-3-explosion`);
  await page.waitForTimeout(900);
  await shot(page, `integracion/fuegos-${size}-4-cayendo`);

  // Tres dedos a la vez, trazos cortos → varias explosiones.
  if (t.size.touch) {
    await multiStroke(page, [
      [[W * 0.15, H * 0.85], [W * 0.25, H * 0.35]],
      [[W * 0.5, H * 0.9], [W * 0.5, H * 0.3]],
      [[W * 0.85, H * 0.85], [W * 0.72, H * 0.35]],
    ], { steps: 20, delay: 10 });
    await page.waitForTimeout(900);
    await shot(page, `integracion/fuegos-${size}-5-tres-mechas`);
    await page.waitForTimeout(1300);
    await shot(page, `integracion/fuegos-${size}-6-tres-explosiones`);
  }

  // fps durante explosiones simultáneas forzadas
  const fps = await page.evaluate(async ({ W, H }) => {
    const d = CL.fuegos._debug;
    const types = CL.fuegos.TYPES;
    types.forEach((ty, i) => d.explode(W * (0.15 + 0.7 * (i / (types.length - 1))), H * (0.3 + 0.2 * (i % 2)), ty));
    let n = 0; const t0 = performance.now();
    await new Promise((r) => { const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(); }; requestAnimationFrame(f); });
    return Math.round(n / ((performance.now() - t0) / 1000));
  }, { W, H });
  await page.waitForTimeout(100);
  await shot(page, `integracion/fuegos-${size}-7-todos-los-tipos`);
  console.log(size, 'fps con', 'todos los tipos a la vez:', fps, 'errores:', t.errors.length ? t.errors : 'ninguno');
  await t.close();
}
