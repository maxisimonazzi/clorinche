// Revisión 1: galería "a prueba de un chico de 4 años" con toques reales (CDP).
// Uso: cd dev && node galeria/r2-torpe.mjs [tamaño=tablet]
import { launch, appUrl, shot, tap, touchStart, touches } from '../../lib.mjs';
import { ok, clean, state, dbWorks, instrument, seedSynthetic, center } from './lib.mjs';

const size = process.argv[2] || 'tablet';
const OUT = 'galeria/r2';
const t = await launch({ size });
const { page } = t;
await page.addInitScript(instrument);
await page.goto(appUrl('inicio'));
await page.waitForTimeout(700);
await seedSynthetic(page, { done: 14, progress: 4 });
await page.evaluate(() => CL.router.go('obras'));
await page.waitForTimeout(1300);
const nWorks = async () => (await dbWorks(page)).length;
const openCard = async (nth) => {
  const [x, y] = await center(page, `.gal-card >> nth=${nth}`);
  await tap(page, x, y);
  await page.waitForTimeout(700);
};
const closeIfOpen = async () => { if ((await state(page)).modal) { await page.keyboard.press('Escape'); await page.waitForTimeout(500); } };

// D) Pestañas: 12 toques rápidos alternando → estado coherente
{
  const [ax, ay] = await center(page, '.gal-tab >> nth=0');
  const [bx2, by2] = await center(page, '.gal-tab >> nth=1');
  for (let i = 0; i < 12; i++) { await tap(page, i % 2 ? ax : bx2, i % 2 ? ay : by2); await page.waitForTimeout(40); }
  await page.waitForTimeout(800);
  const s = await state(page);
  const w = await dbWorks(page);
  const nd = w.filter((x) => x.status === 'done').length;
  ok(s.tab === 'Terminadas' && s.cards === nd && s.modal === 0, `D) 12 toques rápidos en pestañas → Terminadas con ${nd} (${JSON.stringify(s)})`);
}

// E) Doble toque en "Seguir" → una sola navegación; atrás → galería; atrás → inicio.
{
  await openCard(3);
  const h0 = await page.evaluate(() => history.length);
  const [gx, gy] = await center(page, '.gv-go');
  await tap(page, gx, gy); await page.waitForTimeout(90); await tap(page, gx, gy);
  await page.waitForTimeout(2500);
  const s1 = await state(page);
  await page.evaluate(() => history.back());
  await page.waitForTimeout(1500);
  const s2 = await state(page);
  await page.evaluate(() => history.back());
  await page.waitForTimeout(1500);
  const s3 = await state(page);
  ok(/^#(colorear|pizarra|neon)\//.test(s1.hash) && s2.hash === '#obras' && s2.modal === 0 && s3.hash === '#inicio',
    `E) doble toque en Seguir → ${s1.hash}; atrás → ${s2.hash} (modal ${s2.modal}); atrás → ${s3.hash} (history ${h0}→${s1.hist})`);
  await page.evaluate(() => CL.router.go('obras'));
  await page.waitForTimeout(1300);
}

// F) Dos dedos a la vez sobre dos obras distintas.
{
  const [x1, y1] = await center(page, '.gal-card >> nth=0');
  const [x2, y2] = await center(page, '.gal-card >> nth=1');
  await touchStart(page, [{ x: x1, y: y1, id: 1 }, { x: x2, y: y2, id: 2 }]);
  await page.waitForTimeout(60);
  await touches(page, []);
  await page.waitForTimeout(800);
  const s = await state(page);
  ok(s.modal <= 1, `F) dos dedos sobre dos obras → ${s.modal} vista(s)`);
  await closeIfOpen();
  const s2 = await state(page);
  ok(s2.modal === 0 && s2.hash === '#obras', 'F) cerrada queda en la galería');
}

// G) Abrir y cerrar la vista 15 veces rápido: listeners y URLs no se acumulan.
{
  const l0 = await page.evaluate(() => window.__listeners());
  const u0 = await page.evaluate(() => window.__liveUrls());
  for (let i = 0; i < 15; i++) {
    const [x, y] = await center(page, `.gal-card >> nth=${i % 6}`);
    await tap(page, x, y);
    await page.waitForTimeout(i % 3 === 0 ? 700 : 450);
    const [cx, cy] = await center(page, '.gv-close');
    await tap(page, cx, cy);
    await page.waitForTimeout(350);
  }
  await page.waitForTimeout(1500);
  const l1 = await page.evaluate(() => window.__listeners());
  const u1 = await page.evaluate(() => window.__liveUrls());
  const diff = {};
  for (const k of new Set([...Object.keys(l0), ...Object.keys(l1)])) if ((l1[k] || 0) !== (l0[k] || 0)) diff[k] = (l1[k] || 0) - (l0[k] || 0);
  const s = await state(page);
  ok(Object.keys(diff).length === 0 && u1 === u0 && s.modal === 0 && s.hash === '#obras', `G) 15 abrir/cerrar: listeners Δ${JSON.stringify(diff)} URLs ${u0}→${u1} ${JSON.stringify({ modal: s.modal, hash: s.hash, hist: s.hist })}`);
  // después de todo eso, "atrás" debería volver al inicio (sin entradas colgadas)
  await page.evaluate(() => history.back());
  await page.waitForTimeout(1300);
  ok((await state(page)).hash === '#inicio', 'G) atrás tras 15 abrir/cerrar → inicio (' + (await state(page)).hash + ')');
  await page.evaluate(() => CL.router.go('obras'));
  await page.waitForTimeout(1300);
}

// H) Entrar y salir de la galería 8 veces rápido (casita / Mis obras).
{
  const l0 = await page.evaluate(() => window.__listeners());
  for (let i = 0; i < 8; i++) {
    await page.evaluate(() => CL.router.go('inicio'));
    await page.waitForTimeout(i % 2 ? 60 : 250);
    await page.evaluate(() => CL.router.go('obras'));
    await page.waitForTimeout(i % 2 ? 60 : 250);
  }
  await page.waitForTimeout(2000);
  const l1 = await page.evaluate(() => window.__listeners());
  const diff = {};
  for (const k of new Set([...Object.keys(l0), ...Object.keys(l1)])) if ((l1[k] || 0) !== (l0[k] || 0)) diff[k] = (l1[k] || 0) - (l0[k] || 0);
  const scr = await page.evaluate(() => ({ screens: document.querySelectorAll('#app > .screen').length, cards: document.querySelectorAll('.gal-card').length, urls: window.__liveUrls() }));
  ok(scr.screens === 1 && Object.keys(diff).length === 0, `H) 8 entradas/salidas rápidas: ${JSON.stringify(scr)} listeners Δ${JSON.stringify(diff)}`);
}

// I) Rotar con la vista abierta (celular/tablet) y con la grilla.
{
  const vp = page.viewportSize();
  await openCard(4);
  await page.setViewportSize({ width: vp.height, height: vp.width });
  await page.waitForTimeout(700);
  await shot(page, `${OUT}/torpe-${size}-rotada-vista`);
  const m = await page.evaluate(() => {
    const mm = document.querySelector('.gal-view .modal'); if (!mm) return null; const r = mm.getBoundingClientRect();
    const bs = [...document.querySelectorAll('.gv-actions .btn')].map((b) => b.getBoundingClientRect());
    return { inside: r.left >= -0.5 && r.top >= -0.5 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5, scroll: mm.scrollHeight > mm.clientHeight + 1, btnsVisible: bs.every((b) => b.bottom <= r.bottom + 1 && b.right <= r.right + 1) };
  });
  ok(m && m.inside && !m.scroll && m.btnsVisible, `I) vista abierta y se rota la pantalla: entra ${JSON.stringify(m)}`);
  await closeIfOpen();
  await shot(page, `${OUT}/torpe-${size}-rotada-grilla`);
  await page.setViewportSize(vp);
  await page.waitForTimeout(500);
}

// J) Borrar la última terminada con sin terminar pendientes → ¿qué ve el chico?
{
  const w = await dbWorks(page);
  const done = w.filter((x) => x.status === 'done');
  // borrar por DB todas las terminadas menos una, recargar, borrar la última con la UI
  await page.evaluate(async (ids) => { for (const id of ids) await CL.db.works.del(id); }, done.slice(1).map((x) => x.id));
  await page.reload();
  await page.waitForTimeout(1500);
  await openCard(0);
  const [bx, by] = await center(page, '.gv-del');
  await touchStart(page, [{ x: bx, y: by }]);
  await page.waitForTimeout(1600);
  await touches(page, []);
  await page.waitForTimeout(1200);
  await shot(page, `${OUT}/torpe-${size}-ultima-borrada`);
  const s = await state(page);
  const empty = await page.evaluate(() => !!document.querySelector('.gal-empty'));
  console.log('J) tras borrar la última terminada:', JSON.stringify({ tab: s.tab, empty, counts: await page.evaluate(() => [...document.querySelectorAll('.gal-count')].map((e) => e.textContent)) }));
}

const errs = clean(t.errors);
ok(errs.length === 0, 'sin errores de consola ' + JSON.stringify(errs).slice(0, 400));
await t.close();
