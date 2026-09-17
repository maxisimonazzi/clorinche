// Layout en todos los tamaños: vacío, con un trazo de cada herramienta (elegida tocando la interfaz), y chequeos
// de cortes/superposiciones/desbordes. Uso: node review-pizarra/layout.mjs [tamaños...]
import { open, S, click, board, wave, at, info, controls, stroke, multiStroke } from './h.mjs';

const sizes = process.argv.slice(2).length ? process.argv.slice(2) : ['desktop', 'tablet', 'tabletV', 'phone', 'phoneH', 'phoneSmall'];
const tools = ['lapiz', 'fibra', 'pincel', 'crayon', 'aerosol', 'arcoiris', 'brillitos', 'sellos', 'goma'];
const colors = ['#ff3b30', '#2f5bea', '#1fb35a', '#8b4dff', '#ff8a1f', null, 'multi', '#ff78c4', null];

for (const size of sizes) {
  const t = await open(size);
  const { page } = t;
  const out = { size };
  await S(page, `layout/${size}-0-empty`);
  out.controls0 = await controls(page);
  out.overflow = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const f = (e) => e && { sh: e.scrollHeight, ch: e.clientHeight, sw: e.scrollWidth, cw: e.clientWidth };
    return { tools: f(q('.pz-tools')), panel: f(q('.pz-panel')), pal: f(q('.pz-palette-wrap')), top: f(q('.pz-top')), rows: getComputedStyle(q('.pz-tools')).getPropertyValue('--pz-rows') };
  });
  const b = await board(page);
  for (let i = 0; i < tools.length; i++) {
    const id = tools[i];
    await click(t, `.pz-tool[data-tool="${id}"]`, 300);
    if (id === 'sellos') {
      // se abre el selector: elegir uno tocando
      await S(page, `layout/${size}-stamp-picker`);
      await click(t, '.pz-pick[aria-label="Perro"]', 350);
    }
    if (colors[i]) await click(t, `.pz-swatch[data-color="${colors[i]}"]`, 120);
    const y = 0.08 + (i / (tools.length - 1)) * 0.84;
    const pts = id === 'goma' ? [at(b, 0.5, 0.02), at(b, 0.52, 0.98)] : wave(b, y, 0.1, 0.9, 0.03, 8);
    await stroke(page, pts, { pointer: t.size.touch ? 'touch' : 'mouse', steps: 28, delay: 10 });
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(500);
  await S(page, `layout/${size}-1-drawn`);
  out.controls1 = await controls(page);
  out.info = await info(page);
  // Fondo
  await click(t, '.pz-bgbtn', 400);
  await S(page, `layout/${size}-bg-picker`);
  out.bgModal = await page.evaluate(() => { const m = document.querySelector('.modal'); const r = m.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, sh: m.scrollHeight, ch: m.clientHeight, sw: m.scrollWidth, cw: m.clientWidth }; });
  await click(t, '.pz-pick[aria-label="Pizarrón negro"]', 400);
  await S(page, `layout/${size}-2-chalk`);
  out.errors = t.errors;
  console.log(JSON.stringify(out));
  await t.close();
}
