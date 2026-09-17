// Lámina de muestra: un trazo de cada herramienta en cada fondo (tablet, dpr 2) + recortes con zoom.
// Uso: node pizarra/sheet.mjs [fondo1,fondo2,...] [tamaño]
import { launch, appUrl, shot, stroke, touchStart, touches, SIZES } from '../lib.mjs';
import { ready, board, at, wave, T, resetDb, zoom } from './common.mjs';

const size = process.argv[3] || 'tablet';
const t = await launch({ size });
const { page } = t;
const touch = SIZES[size].touch;
const pointer = touch ? 'touch' : 'mouse';
await page.goto(appUrl('pizarra'));
await ready(page);
await resetDb(page);
await page.reload();
await ready(page);
const api = T(page);
const bgs = process.argv[2] ? process.argv[2].split(',') : await page.evaluate(() => CL.pizarra.backgrounds.map((b) => b.id));

async function hold(pts, ms) {
  // mantiene el dedo quieto en el primer punto `ms` y después recorre el resto
  if (touch) {
    await touchStart(page, [{ x: pts[0][0], y: pts[0][1] }]);
    await page.waitForTimeout(ms);
    for (const p of pts.slice(1)) { await touches(page, [{ x: p[0], y: p[1] }]); await page.waitForTimeout(16); }
    await touches(page, []);
  } else {
    await page.mouse.move(pts[0][0], pts[0][1]);
    await page.mouse.down();
    await page.waitForTimeout(ms);
    for (const p of pts.slice(1)) { await page.mouse.move(p[0], p[1]); await page.waitForTimeout(16); }
    await page.mouse.up();
  }
}

for (const bg of bgs) {
  await page.evaluate(() => { const c = CL.pizarra.current; c._test.wipe(); });
  await page.waitForTimeout(1100);
  await api.bg(bg);
  const b = await board(page);
  const dark = bg.startsWith('pizarron');
  const rows = [
    ['lapiz', dark ? '#ffffff' : '#2f5bea', 2],
    ['fibra', '#ff3b30', 2],
    ['pincel', '#1fb35a', 3],
    ['crayon', '#8b4dff', 3],
    ['aerosol', '#ff8a1f', 2],
    ['arcoiris', null, 2],
    ['brillitos', 'multi', 2],
    ['sellos', 'multi', 1],
  ];
  const n = rows.length + 1;
  for (let i = 0; i < rows.length; i++) {
    const [tool, color, sz] = rows[i];
    await api.tool(tool);
    if (color) await api.color(color);
    await api.size(sz);
    const y = (i + 0.7) / n;
    if (tool === 'pincel') {
      // lento a la izquierda (grueso) y rápido a la derecha (fino)
      await stroke(page, [at(b, 0.06, y), at(b, 0.3, y - 0.02), at(b, 0.45, y + 0.02)], { pointer, steps: 40, delay: 26 });
      await stroke(page, [at(b, 0.52, y + 0.02), at(b, 0.72, y - 0.03), at(b, 0.94, y + 0.02)], { pointer, steps: 6, delay: 12 });
    } else if (tool === 'aerosol') {
      await hold([at(b, 0.08, y), ...wave(b, y, 0.08, 0.7, 0.02, 12)], 700);
    } else if (tool === 'sellos') {
      for (const [k, id] of ['estrella', 'gato', 'pez', 'mariposa'].entries()) {
        await page.evaluate((id) => { CL.pizarra.current.state.stamp = id; }, id);
        const p = at(b, 0.1 + k * 0.12, y);
        await stroke(page, [p, p], { pointer, steps: 1, delay: 0 });
      }
      await page.evaluate(() => { CL.pizarra.current.state.stamp = 'corazon'; });
      await stroke(page, [at(b, 0.6, y), at(b, 0.95, y)], { pointer, steps: 20, delay: 14 });
    } else {
      await stroke(page, wave(b, y, 0.06, 0.94, 0.02, 12), { pointer, steps: 36, delay: 10 });
    }
    await page.waitForTimeout(80);
  }
  // goma: pasa por el medio de todos los trazos (deja ver el fondo)
  await api.tool('goma');
  await api.size(1);
  await stroke(page, [at(b, 0.85, 0.02), at(b, 0.8, 0.98)], { pointer, steps: 30, delay: 10 });
  await page.waitForTimeout(500);
  await shot(page, `pizarra/sheet/${size}-${bg}`, { clip: b });
  if (bg === bgs[0] || dark) {
    // recortes ampliados ×3 (píxeles reales): lápiz, fibra, pincel, crayón, aerosol, brillitos
    await zoom(page, `sheet/${size}-${bg}-zoom-lapiz`, 0.3, 0.03, 0.14, 0.09);
    await zoom(page, `sheet/${size}-${bg}-zoom-fibra-pincel`, 0.3, 0.13, 0.16, 0.22);
    await zoom(page, `sheet/${size}-${bg}-zoom-crayon`, 0.02, 0.36, 0.16, 0.1);
    await zoom(page, `sheet/${size}-${bg}-zoom-aerosol`, 0.02, 0.45, 0.2, 0.14);
    await zoom(page, `sheet/${size}-${bg}-zoom-brillitos`, 0.3, 0.66, 0.18, 0.14);
  }
}
console.log('errores:', JSON.stringify(t.errors));
await t.close();
