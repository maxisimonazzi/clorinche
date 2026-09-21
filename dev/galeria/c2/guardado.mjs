// Corrección 2: la galería y los guardados en segundo plano.
//  a) Salir de colorear directo a la galería (el guardado sigue ~1 s en segundo plano, CPU lenta): la galería
//     espera CL.coloring.whenSaved() y la PRIMERA miniatura que muestra ya es la guardada (nunca la vieja).
//  b) Cambio de la base con la galería abierta (otro módulo guarda): la grilla se pone al día sin parpadeo
//     (las tarjetas que no cambiaron son los mismos nodos, las imágenes nuevas llegan ya decodificadas)
//     y sin perder pestaña ni scroll.
// Uso: cd dev && node galeria/c2/guardado.mjs [tamaño=tablet]
import { launch, appUrl, shot, tap } from '../../lib.mjs';
import { ok, clean, center, seedSynthetic } from '../c1/r1-lib.mjs';

const size = process.argv[2] || 'tablet';
const t = await launch({ size });
const { page } = t;
const OUT = 'galeria/c2/guardado-' + size;
await page.goto(appUrl('inicio'));
await page.waitForTimeout(800);

// Espía: cada miniatura que aparece en la grilla (id de la obra, tamaño del blob, ¿ya decodificada?).
await page.evaluate(() => {
  window.__shown = [];
  const mo = new MutationObserver((muts) => {
    for (const m of muts) for (const n of m.addedNodes) {
      if (!(n instanceof Element)) continue;
      const imgs = n.matches('img.gal-thumb') ? [n] : [...n.querySelectorAll('img.gal-thumb')];
      for (const i of imgs) {
        const card = i.closest('.gal-card');
        if (card && card.__mark) continue; // tarjeta reusada (se movió de lugar): no es una imagen nueva
        window.__shown.push({ id: card && card.dataset.id, src: i.src, complete: i.complete && i.naturalWidth > 0, t: performance.now() });
      }
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });
  window.__resetShown = () => { window.__shown = []; };
});

// a) Colorear con CPU lenta, salir directo a la galería.
{
  const cdp = await page.context().newCDPSession(page);
  await page.evaluate(() => CL.router.go('colorear/vaca'));
  await page.waitForTimeout(2500);
  const bb = await page.locator('.cl-board').boundingBox();
  for (const [fx, fy] of [[0.5, 0.5], [0.3, 0.7], [0.7, 0.7]]) {
    await page.mouse.click(bb.x + bb.width * fx, bb.y + bb.height * fy);
    await page.waitForTimeout(120);
  }
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
  await page.evaluate((noWait) => {
    window.__resetShown();
    window.__savedAt = null;
    const ws = CL.coloring.whenSaved;
    if (noWait) CL.coloring.whenSaved = undefined; // control: sin la espera, la prueba tiene que fallar
    CL.router.go('obras');
    // Cuándo terminó de verdad el guardado de colorear.
    setTimeout(() => ws().then(() => { window.__savedAt = performance.now(); }), 0);
  }, !!process.env.NOWAIT);
  await page.waitForTimeout(6000);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const r = await page.evaluate(async () => {
    const list = await CL.db.works.list({ kind: 'colorear', source: 'vaca' });
    const w = list[0];
    const shown = window.__shown.filter((s) => s.id === w.id);
    const firstCard = window.__shown.length ? window.__shown[0].t : null;
    const now = document.querySelector(`.gal-card[data-id="${w.id}"] .gal-thumb`);
    const size = async (src) => (await (await fetch(src)).blob()).size;
    return {
      id: w.id, status: w.status, dbThumb: w.thumb.size,
      shown: await Promise.all(shown.map(async (s) => ({ size: await size(s.src).catch(() => -1), complete: s.complete }))),
      nowSize: now ? await size(now.src) : null,
      beforeSave: firstCard != null && window.__savedAt != null ? firstCard < window.__savedAt : null,
      tab: document.querySelector('.gal-tab.active').dataset.tab,
      first: document.querySelector('.gal-card')?.dataset.id,
    };
  });
  await shot(page, OUT + '-a-galeria');
  console.log('   ' + JSON.stringify(r));
  ok(r.shown.length >= 1 && r.shown[0].size === r.dbThumb, `a) la primera miniatura de la vaca ya es la guardada (${r.shown.map((s) => s.size).join(' → ')} vs base ${r.dbThumb})`);
  ok(r.beforeSave === false, 'a) la grilla aparece después de que colorear terminó de guardar (' + r.beforeSave + ')');
  ok(r.tab === 'progress' && r.first === r.id, `a) sin terminar (la única obra) y primera (${r.tab}, ${r.first === r.id})`);
}

// a2) Desde la galería: abrir la vaca, Seguir, pintar más y "atrás" enseguida (CPU lenta). La obra ya existe
//     con la miniatura vieja: la galería no tiene que mostrar la vieja y después cambiarla.
{
  const cdp = await page.context().newCDPSession(page);
  const tapSel = async (sel) => { const [x, y] = await center(page, sel); await tap(page, x, y); };
  await tapSel('.gal-card >> nth=0');
  await page.waitForTimeout(900);
  await tapSel('.gv-go');
  await page.waitForTimeout(2500);
  const bb = await page.locator('.cl-board').boundingBox();
  for (const [fx, fy] of [[0.5, 0.2], [0.2, 0.3], [0.8, 0.3], [0.5, 0.85]]) {
    await page.mouse.click(bb.x + bb.width * fx, bb.y + bb.height * fy);
    await page.waitForTimeout(120);
  }
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
  await page.evaluate((noWait) => {
    window.__resetShown();
    const ws = CL.coloring.__ws || CL.coloring.whenSaved;
    CL.coloring.__ws = ws;
    if (noWait) CL.coloring.whenSaved = undefined;
    history.back();
  }, !!process.env.NOWAIT);
  await page.waitForTimeout(6000);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const r = await page.evaluate(async () => {
    const w = (await CL.db.works.list({ kind: 'colorear', source: 'vaca' }))[0];
    const size = async (src) => (await (await fetch(src)).blob()).size;
    const shown = window.__shown.filter((s) => s.id === w.id);
    return { hash: location.hash, db: w.thumb.size, shown: await Promise.all(shown.map((s) => size(s.src).catch(() => -1))) };
  });
  console.log('   ' + JSON.stringify(r));
  ok(r.hash === '#obras' && r.shown.length === 1 && r.shown[0] === r.db, `a2) Seguir, pintar y atrás: una sola miniatura, la nueva (${r.shown.join(' → ')} vs base ${r.db})`);
}

// b) Cambio de la base con la galería abierta: sin parpadeo y sin perder scroll.
{
  await seedSynthetic(page, { done: 14, progress: 6 });
  await page.evaluate(() => CL.router.go('inicio'));
  await page.waitForTimeout(900);
  await page.evaluate(() => CL.router.go('obras'));
  await page.waitForTimeout(1500);
  const [x, y] = await center(page, '.gal-tab[data-tab="done"]');
  await tap(page, x, y);
  await page.waitForTimeout(700);
  const setup = await page.evaluate(() => {
    const g = document.querySelector('.gal-grid');
    g.scrollTop = 260;
    const cards = [...document.querySelectorAll('.gal-card')];
    cards.forEach((c) => { c.__mark = true; });
    return { top: Math.round(g.scrollTop), ids: cards.map((c) => c.dataset.id) };
  });
  await page.waitForTimeout(400);
  // Una obra del medio se guarda de nuevo (fecha nueva, miniatura verde): pasa primera, la grilla se reordena.
  const moved = setup.ids[6];
  await page.evaluate(async ({ moved }) => {
    window.__resetShown();
    const mk = async (color) => { const c = CL.util.canvas(300, 300); const x = c.getContext('2d'); x.fillStyle = color; x.fillRect(0, 0, 300, 300); return CL.util.canvasToBlob(c, 'image/png'); };
    const w = await CL.db.works.get(moved);
    w.thumb = await mk('#00c000');
    await CL.db.works.save(w);
  }, { moved });
  await page.waitForTimeout(1500);
  const r = await page.evaluate(({ moved, ids }) => {
    const g = document.querySelector('.gal-grid');
    const cards = [...document.querySelectorAll('.gal-card')];
    const reused = cards.filter((c) => c.__mark).map((c) => c.dataset.id);
    return {
      top: Math.round(g.scrollTop), first: cards[0].dataset.id === moved,
      reused: reused.length, expectReused: ids.length - 1, movedReused: cards.find((c) => c.dataset.id === moved)?.__mark || false,
      shown: window.__shown.map((s) => ({ id: s.id, complete: s.complete })),
      tab: document.querySelector('.gal-tab.active').dataset.tab,
      anim: getComputedStyle(cards[1]).animationName,
    };
  }, { moved, ids: setup.ids });
  await shot(page, OUT + '-b-refresco');
  console.log('   ' + JSON.stringify(r));
  ok(r.first && r.tab === 'done', 'b) la obra guardada de nuevo pasa primera, misma pestaña (' + r.tab + ')');
  ok(r.reused === r.expectReused && !r.movedReused, `b) las tarjetas que no cambiaron son las mismas (${r.reused}/${r.expectReused}); la cambiada es nueva`);
  ok(r.shown.length === 1 && r.shown.every((s) => s.complete), 'b) la miniatura nueva entra ya decodificada (sin cuadro en blanco) ' + JSON.stringify(r.shown));
  ok(Math.abs(r.top - setup.top) <= 1 && r.anim === 'none', `b) scroll ${setup.top} → ${r.top}, sin animación de entrada (${r.anim})`);

  // 3) Varios guardados seguidos (ráfaga): un solo refresco al final, sin errores.
  await page.evaluate(async (ids) => {
    document.querySelectorAll('.gal-card').forEach((c) => { c.__mark = true; });
    window.__resetShown();
    for (const id of ids.slice(8, 11)) {
      const w = await CL.db.works.get(id);
      await CL.db.works.save(w);
    }
  }, setup.ids);
  await page.waitForTimeout(1500);
  const r3 = await page.evaluate(() => ({ n: window.__shown.length, cards: document.querySelectorAll('.gal-card').length, top: Math.round(document.querySelector('.gal-grid').scrollTop) }));
  ok(r3.n === 3 && r3.cards === 14, 'b) ráfaga de 3 guardados → 3 tarjetas nuevas, 14 en total ' + JSON.stringify(r3));
}

ok(clean(t.errors).length === 0, 'sin errores ' + JSON.stringify(clean(t.errors)).slice(0, 300));
await t.close();
