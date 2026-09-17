// Tamaño real (px CSS) de lo tocable en cada pantalla (regla: mínimo 46 px).
import { open } from './h.mjs';
for (const size of ['desktop', 'tablet', 'tabletV', 'phone', 'phoneH', 'phoneSmall']) {
  const t = await open(size);
  const r = await t.page.evaluate(() => {
    const m = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return Math.round(Math.min(r.width, r.height)); };
    const tools = document.querySelector('.pz-tools');
    return { swatch: m('.pz-swatch'), tool: m('.pz-tool'), sizeBtn: m('.pz-size'), bgBtn: m('.pz-bgbtn'), undo: m('.pz-undo'), toolsW: Math.round(tools.getBoundingClientRect().width), toolsRows: getComputedStyle(tools).getPropertyValue('--pz-rows'), board: (() => { const r = document.querySelector('.pz-board').getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); })() };
  });
  console.log(size, JSON.stringify(r));
  await t.close();
}
