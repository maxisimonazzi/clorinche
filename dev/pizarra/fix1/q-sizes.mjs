// QA pizarra: tamaños "raros" reales (notebook chica, tablet 7", pantalla dividida, Full HD).
import { launch, appUrl } from '../../lib.mjs';
import { S, ready, controls } from './h.mjs';

const sizes = {
  laptop1280x600: { width: 1280, height: 600, dpr: 1, touch: false },
  tab7V_600x960: { width: 600, height: 960, dpr: 2, touch: true },
  tab7H_960x600: { width: 960, height: 600, dpr: 2, touch: true },
  split_507x768: { width: 507, height: 768, dpr: 2, touch: true },
  fullHD: { width: 1920, height: 1080, dpr: 1, touch: false },
  phoneMini_320x568: { width: 320, height: 568, dpr: 2, touch: true },
};
for (const [name, s] of Object.entries(sizes)) {
  const t = await launch({ size: s });
  await t.page.goto(appUrl('pizarra'));
  await ready(t.page);
  const c = await controls(t.page);
  const extra = await t.page.evaluate(() => {
    const p = document.querySelector('.pz-panel'), tl = document.querySelector('.pz-tools'), pw = document.querySelector('.pz-palette-wrap');
    const b = document.querySelector('.pz-board').getBoundingClientRect();
    return { panelScrollY: p.scrollHeight - p.clientHeight, toolsScrollY: tl.scrollHeight - tl.clientHeight, paletteScrollX: pw.scrollWidth - pw.clientWidth, boardPctArea: Math.round((b.width * b.height) / (innerWidth * innerHeight) * 100), tool: document.querySelector('.pz-tool').getBoundingClientRect().width, swatch: document.querySelector('.pz-swatch').getBoundingClientRect().width };
  });
  await S(t.page, `q/sizes/${name}`);
  console.log(name, JSON.stringify({ bad: c.bad, board: c.board, ...extra, errors: t.errors }));
  await t.close();
}
