// QA pizarra: distribución en todos los tamaños + selectores + medidas de tocables.
// node review-pizarra/q-layout.mjs [tamaños...]
import { open, S, board, wave, stroke, controls, info, click } from './h.mjs';

const sizes = process.argv.slice(2).length ? process.argv.slice(2) : ['desktop', 'tablet', 'tabletV', 'phone', 'phoneH', 'phoneSmall'];
for (const size of sizes) {
  const t = await open(size);
  const { page } = t;
  const out = { size };
  await S(page, `q/layout/${size}-0-empty`);
  out.controls = await controls(page);
  // Medidas de tocables (mínimo 46 px según ARQUITECTURA.md)
  out.touchSizes = await page.evaluate(() => {
    const m = {};
    for (const [k, sel] of Object.entries({ tool: '.pz-tool', size: '.pz-size', swatch: '.pz-swatch', bg: '.pz-bgbtn', undo: '.pz-undo', clear: '.pz-clear', home: '.btn-home', tab: '.mode-tab', done: '.pz-done', mute: '.btn-mute' })) {
      const e = document.querySelector(sel);
      if (!e) continue;
      const r = e.getBoundingClientRect();
      m[k] = Math.round(r.width) + 'x' + Math.round(r.height);
    }
    const sw = [...document.querySelectorAll('.pz-swatch')].map((e) => e.getBoundingClientRect());
    let minGap = 99;
    for (let i = 1; i < sw.length; i++) {
      const a = sw[i - 1], b = sw[i];
      const gx = Math.max(b.left - a.right, a.left - b.right), gy = Math.max(b.top - a.bottom, a.top - b.bottom);
      const g = Math.max(gx, gy);
      if (g >= 0) minGap = Math.min(minGap, g);
    }
    m.swatchGap = Math.round(minGap * 10) / 10;
    const pnl = document.querySelector('.pz-panel');
    m.panelScroll = pnl.scrollHeight - pnl.clientHeight;
    const tl = document.querySelector('.pz-tools');
    m.toolsScroll = tl.scrollHeight - tl.clientHeight;
    const pw = document.querySelector('.pz-palette-wrap');
    m.paletteScrollX = pw.scrollWidth - pw.clientWidth;
    return m;
  });
  // Dibujo de muestra con varias herramientas
  const b = await board(page);
  const ptr = t.size.touch ? 'touch' : 'mouse';
  const tools = ['fibra', 'crayon', 'arcoiris', 'pincel', 'brillitos'];
  const cols = ['#ff3b30', '#2f5bea', null, '#1fb35a', 'multi'];
  for (let i = 0; i < tools.length; i++) {
    await page.evaluate(([tl, c]) => { const T = CL.pizarra.current._test; T.selectTool(tl); if (c) T.selectColor(c); T.selectSize(2); }, [tools[i], cols[i]]);
    await stroke(page, wave(b, 0.14 + i * 0.17), { pointer: ptr, steps: 22 });
  }
  await page.evaluate(() => { const T = CL.pizarra.current._test; T.selectTool('sellos'); T.selectColor('#ff78c4'); });
  await page.waitForTimeout(200);
  if (await page.$('.modal-back')) await page.evaluate(() => document.querySelector('.modal-close').click());
  await page.waitForTimeout(300);
  await S(page, `q/layout/${size}-1-drawn`);
  // Selector de sellos (tocando el botón real)
  await click(t, '.pz-tool[data-tool="sellos"]', 450);
  await S(page, `q/layout/${size}-2-stamps`);
  out.stampPicker = await page.evaluate(() => {
    const m = document.querySelector('.modal'); const r = m.getBoundingClientRect();
    const picks = [...document.querySelectorAll('.pz-pick')].map((e) => e.getBoundingClientRect());
    const rows = new Set(picks.map((p) => Math.round(p.top)));
    return { modal: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], vw: innerWidth, vh: innerHeight, n: picks.length, rows: rows.size, pick: Math.round(picks[0].width), overflow: m.scrollHeight - m.clientHeight, off: r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight };
  });
  await page.evaluate(() => document.querySelector('.modal-close').click());
  await page.waitForTimeout(350);
  await click(t, '.pz-bgbtn', 450);
  await S(page, `q/layout/${size}-3-bg`);
  out.bgPicker = await page.evaluate(() => {
    const m = document.querySelector('.modal'); const r = m.getBoundingClientRect();
    const picks = [...document.querySelectorAll('.pz-pick')].map((e) => e.getBoundingClientRect());
    const rows = new Set(picks.map((p) => Math.round(p.top)));
    return { modal: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], n: picks.length, rows: rows.size, overflow: m.scrollHeight - m.clientHeight, off: r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight };
  });
  // elegir pizarrón negro tocando la muestra
  await click(t, '.pz-pick[aria-label="Pizarrón negro"]', 500);
  await S(page, `q/layout/${size}-4-chalk`);
  out.info = await info(page);
  out.errors = t.errors;
  console.log(JSON.stringify(out));
  await t.close();
}
