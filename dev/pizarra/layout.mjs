// Distribución de la pizarra en todos los tamaños: pantalla vacía y con algunos trazos.
import { launch, appUrl, shot, stroke, SIZES } from '../lib.mjs';
import { ready, board, wave, T, resetDb } from './common.mjs';

const sizes = process.argv[2] ? process.argv[2].split(',') : ['desktop', 'tablet', 'tabletV', 'phone', 'phoneH', 'phoneSmall'];
for (const size of sizes) {
  const t = await launch({ size });
  const { page } = t;
  await page.goto(appUrl('pizarra'));
  await ready(page);
  await resetDb(page);
  await page.reload();
  await ready(page);
  await shot(page, `pizarra/layout-${size}-empty`);
  const b = await board(page);
  const pointer = SIZES[size].touch ? 'touch' : 'mouse';
  const api = T(page);
  const tools = ['lapiz', 'fibra', 'pincel', 'crayon', 'arcoiris'];
  const cols = ['#2f5bea', '#ff3b30', '#1fb35a', '#8b4dff', null];
  for (let i = 0; i < tools.length; i++) {
    await api.tool(tools[i]);
    if (cols[i]) await api.color(cols[i]);
    await stroke(page, wave(b, 0.14 + i * 0.17), { pointer, steps: 30 });
  }
  await page.waitForTimeout(200);
  await shot(page, `pizarra/layout-${size}-drawn`);
  const info = await api.info();
  // Todo lo tocable dentro de la pantalla y sin superposición con el tablero.
  const overflow = await page.evaluate(() => {
    const out = [];
    const W = innerWidth, H = innerHeight;
    const bd = document.querySelector('.pz-board').getBoundingClientRect();
    for (const e of document.querySelectorAll('.screen--pizarra button')) {
      const r = e.getBoundingClientRect();
      const inScroll = e.closest('.scroll-x, .scroll-y');
      if (!inScroll && (r.left < -1 || r.top < -1 || r.right > W + 1 || r.bottom > H + 1)) out.push('fuera: ' + (e.getAttribute('aria-label') || e.className));
      if (r.right > bd.left + 2 && r.left < bd.right - 2 && r.bottom > bd.top + 2 && r.top < bd.bottom - 2) out.push('encima del tablero: ' + e.getAttribute('aria-label'));
    }
    const tl = document.querySelector('.pz-tools');
    const pw = document.querySelector('.pz-palette-wrap');
    out.push(`tools scroll ${tl.scrollHeight}>${tl.clientHeight}? palette scroll ${pw.scrollWidth}>${pw.clientWidth}?`);
    return out;
  });
  console.log(size, JSON.stringify(info), overflow.join(' | '), 'errores:', JSON.stringify(t.errors));
  await t.close();
}
