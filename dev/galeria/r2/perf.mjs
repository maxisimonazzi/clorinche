// Revisión 1: rendimiento. (1) tareas largas al abrir la vista grande de obras reales (exportPNG en alta);
// (2) galería con 60 obras: tiempo de montaje y fps de scroll.
import { launch, appUrl, shot } from '../../lib.mjs';
import { ok, clean, PROFILE, seedSynthetic } from './lib.mjs';
const size = process.argv[2] || 'tablet';
{
  const t = await launch({ size, persistent: PROFILE });
  const { page } = t;
  await page.goto(appUrl('obras'));
  await page.waitForTimeout(1500);
  const ids = await page.evaluate(async () => {
    const l = await CL.db.works.list();
    return { colorear: l.find((w) => w.kind === 'colorear' && w.source === 'vaca' && w.paint).id, neon: l.find((w) => w.kind === 'neon' && w.meta && w.meta.view && w.meta.view.w > 1000).id };
  });
  for (const [k, id] of Object.entries(ids)) {
    const r = await page.evaluate(async (id) => {
      const longs = [];
      const po = new PerformanceObserver((l) => { for (const e of l.getEntries()) longs.push(Math.round(e.duration)); });
      po.observe({ type: 'longtask', buffered: false });
      let frames = 0, maxGap = 0, last = performance.now(), run = true;
      const tick = (now) => { frames++; maxGap = Math.max(maxGap, now - last); last = now; if (run) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
      const t0 = performance.now();
      document.querySelector(`.gal-card[data-id="${id}"]`).click();
      // esperar a que la imagen en alta esté puesta
      await new Promise((res) => { const iv = setInterval(() => { const i = document.querySelector('.gv-img'); if (i && i.src.startsWith('blob:') && i.naturalWidth > 1000) { clearInterval(iv); res(); } if (performance.now() - t0 > 8000) { clearInterval(iv); res(); } }, 20); });
      const tHi = performance.now() - t0;
      await new Promise((r) => setTimeout(r, 500));
      run = false; po.disconnect();
      const i = document.querySelector('.gv-img');
      return { tHi: Math.round(tHi), longs, maxFrameGap: Math.round(maxGap), nat: i.naturalWidth + 'x' + i.naturalHeight };
    }, id);
    console.log(`[${size}] abrir vista ${k}:`, JSON.stringify(r));
    ok(r.maxFrameGap < 250, `[${size}] abrir vista ${k}: el cuadro más largo ${r.maxFrameGap} ms (tareas largas ${r.longs.join(',')})`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
  }
  // Abrir y cerrar enseguida 5 obras de colorear (el chico "hojea"): ¿se acumulan exportaciones?
  const r2 = await page.evaluate(async () => {
    const longs = [];
    const po = new PerformanceObserver((l) => { for (const e of l.getEntries()) longs.push(Math.round(e.duration)); });
    po.observe({ type: 'longtask' });
    const cards = [...document.querySelectorAll('.gal-card')].slice(0, 6);
    for (const c of cards) {
      c.click();
      await new Promise((r) => setTimeout(r, 450));   // pasa los 280 ms: arranca la exportación
      const b = document.querySelector('.gv-close'); if (b) b.click();
      await new Promise((r) => setTimeout(r, 350));
    }
    await new Promise((r) => setTimeout(r, 2500));
    po.disconnect();
    return { longs, total: longs.reduce((a, b) => a + b, 0) };
  });
  console.log(`[${size}] hojear 6 obras (abrir 0.45 s y cerrar):`, JSON.stringify(r2));
  ok(clean(t.errors).length === 0, 'sin errores ' + JSON.stringify(clean(t.errors)).slice(0, 300));
  await t.close();
}
{
  const t = await launch({ size });
  const { page } = t;
  await page.goto(appUrl('inicio'));
  await page.waitForTimeout(600);
  await seedSynthetic(page, { done: 55, progress: 5 });
  const r = await page.evaluate(async () => {
    const t0 = performance.now();
    CL.router.go('obras');
    await new Promise((res) => { const iv = setInterval(() => { if (document.querySelectorAll('.gal-card').length >= 55) { clearInterval(iv); res(); } }, 10); });
    const tMount = performance.now() - t0;
    await new Promise((r) => setTimeout(r, 1200));
    const g = document.querySelector('.gal-grid');
    let frames = 0, maxGap = 0, last = performance.now();
    const t1 = performance.now();
    await new Promise((res) => {
      const tick = (now) => {
        frames++; maxGap = Math.max(maxGap, now - last); last = now;
        const p = (now - t1) / 2000;
        g.scrollTop = (g.scrollHeight - g.clientHeight) * (p < 0.5 ? p * 2 : 2 - p * 2);
        if (now - t1 < 2000) requestAnimationFrame(tick); else res();
      };
      requestAnimationFrame(tick);
    });
    return { tMount: Math.round(tMount), fps: Math.round(frames / 2), maxGap: Math.round(maxGap), imgs: document.querySelectorAll('.gal-grid img').length };
  });
  console.log(`[${size}] 60 obras:`, JSON.stringify(r));
  ok(r.fps >= 40, `[${size}] scroll con 60 obras: ${r.fps} fps (cuadro más largo ${r.maxGap} ms, ${r.imgs} <img>)`);
  await shot(page, `galeria/r2/perf-${size}-60`);
  await t.close();
}
