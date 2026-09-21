// Corrección 1: casos puntuales.
//  a) volver con "atrás" desde Seguir: pestaña "sin terminar", scroll y brillo suave en la obra (captura en medio).
//  b) refresco en vivo: otro módulo guarda una obra mientras la galería está abierta → miniatura nueva, sin
//     perder pestaña ni scroll, y la descarga usa la versión nueva.
//  c) colorear sin paint: la vista grande deja la miniatura (no la pisa con el dibujo en blanco); descarga = miniatura.
//  d) neón sin paint (exportPNG devuelve la miniatura JPEG) → el archivo descargado es PNG de verdad.
//  e) prefers-reduced-motion: las tarjetas no rebotan al entrar (la salida al borrar sí queda).
// Uso: cd dev && node galeria/c1/extra.mjs [tamaño=tablet]
import { launch, appUrl, shot, tap } from '../../lib.mjs';
import { ok, clean, center, seedSynthetic, state } from './r1-lib.mjs';

const size = process.argv[2] || 'tablet';
const t = await launch({ size });
const { page } = t;
const OUT = 'galeria/c1/extra-' + size;
await page.goto(appUrl('inicio'));
await page.waitForTimeout(800);
await seedSynthetic(page, { done: 12, progress: 8 });
await page.evaluate(() => CL.router.go('obras'));
await page.waitForTimeout(1300);
const tapSel = async (sel) => { const [x, y] = await center(page, sel); await tap(page, x, y); };

// a) Pestaña "sin terminar", scroll hasta abajo, abrir la última, Seguir, atrás.
{
  await tapSel('.gal-tab[data-tab="progress"]');
  await page.waitForTimeout(700);
  const lastId = await page.evaluate(() => { const c = [...document.querySelectorAll('.gal-card')].pop(); c.scrollIntoView({ block: 'end' }); return c.dataset.id; });
  await page.waitForTimeout(500);
  const top0 = await page.evaluate(() => document.querySelector('.gal-grid').scrollTop);
  await tapSel(`.gal-card[data-id="${lastId}"]`);
  await page.waitForTimeout(800);
  await tapSel('.gv-go');
  await page.waitForTimeout(2500);
  const h = (await state(page)).hash;
  await page.evaluate(() => history.back());
  await page.waitForTimeout(900); // en medio del brillo (dura 3 s)
  const r = await page.evaluate((id) => {
    const g = document.querySelector('.gal-grid'), c = document.querySelector(`.gal-card[data-id="${id}"]`);
    const gr = g.getBoundingClientRect(), cr = c && c.getBoundingClientRect();
    return { tab: document.querySelector('.gal-tab.active').dataset.tab, top: Math.round(g.scrollTop), back: !!c && c.classList.contains('gal-back'), visible: !!c && cr.top >= gr.top - 12 && cr.bottom <= gr.bottom + 12 };
  }, lastId);
  await shot(page, OUT + '-a-volver-brillo');
  ok(r.tab === 'progress' && r.visible && r.back, `a) Seguir (${h}) y atrás → pestaña ${r.tab}, scroll ${top0}→${r.top}, obra a la vista y marcada (${r.visible}, ${r.back})`);
  // Y la pestaña elegida sobrevive a ir al inicio y volver con atrás.
  await tapSel('.btn-home');
  await page.waitForTimeout(1200);
  await page.evaluate(() => history.back());
  await page.waitForTimeout(1300);
  const tab2 = await page.evaluate(() => document.querySelector('.gal-tab.active').dataset.tab);
  ok(tab2 === 'progress', 'a) casita y atrás → sigue en "sin terminar" (' + tab2 + ')');
  // Abrir una terminada, cerrar, elegir "sin terminar" a mano, casita y atrás → manda la pestaña elegida.
  await tapSel('.gal-tab[data-tab="done"]');
  await page.waitForTimeout(700);
  await tapSel('.gal-card >> nth=0');
  await page.waitForTimeout(800);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
  await tapSel('.gal-tab[data-tab="progress"]');
  await page.waitForTimeout(700);
  await tapSel('.btn-home');
  await page.waitForTimeout(1200);
  await page.evaluate(() => history.back());
  await page.waitForTimeout(1300);
  const tab3 = await page.evaluate(() => document.querySelector('.gal-tab.active').dataset.tab);
  ok(tab3 === 'progress', 'a) obra terminada abierta, después pestaña "sin terminar" a mano, casita y atrás → ' + tab3);
}

// b) Refresco en vivo.
{
  const sc = await page.evaluate(() => { const g = document.querySelector('.gal-grid'); g.scrollTop = 120; return g.scrollTop; });
  await page.waitForTimeout(400);
  const id = await page.evaluate(() => document.querySelectorAll('.gal-card')[2].dataset.id);
  const before = await page.evaluate((id) => document.querySelector(`.gal-card[data-id="${id}"] .gal-thumb`).src, id);
  // Otro módulo guarda una versión nueva (miniatura verde) sin cambiar la fecha de orden... sí la cambia: save().
  await page.evaluate(async (id) => {
    const w = await CL.db.works.get(id);
    const c = CL.util.canvas(300, 300); const x = c.getContext('2d'); x.fillStyle = '#00c000'; x.fillRect(0, 0, 300, 300);
    w.thumb = await CL.util.canvasToBlob(c, 'image/png');
    await CL.db.works.save(w);
  }, id);
  await page.waitForTimeout(900);
  const r = await page.evaluate(async (id) => {
    const img = document.querySelector(`.gal-card[data-id="${id}"] .gal-thumb`);
    const b = await (await fetch(img.src)).blob();
    const im = await CL.util.blobToImage(b); const c = CL.util.canvas(im.width, im.height); const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    const d = x.getImageData(150, 150, 1, 1).data;
    return { src: img.src, px: [d[0], d[1], d[2]].join(','), tab: document.querySelector('.gal-tab.active').dataset.tab, first: document.querySelector('.gal-card').dataset.id, top: document.querySelector('.gal-grid').scrollTop, anim: getComputedStyle(document.querySelector('.gal-card')).animationName };
  }, id);
  await shot(page, OUT + '-b-refresco');
  ok(r.px === '0,192,0' && r.src !== before && r.tab === 'progress', `b) guardado de otro módulo → miniatura nueva (${r.px}), misma pestaña (${r.tab})`);
  ok(r.first === id && r.anim === 'none', `b) la obra actualizada pasa primera y la grilla no rebota (${r.first === id}, anim ${r.anim}; scroll ${sc}→${r.top})`);
}

// c) Colorear sin paint + d) neón sin paint (miniatura JPEG).
{
  const ids = await page.evaluate(async () => {
    const U = CL.util;
    const mk = async (color, type) => { const c = U.canvas(480, 480); const x = c.getContext('2d'); x.fillStyle = color; x.fillRect(0, 0, 480, 480); return U.canvasToBlob(c, type, 0.9); };
    const a = await CL.db.works.save({ kind: 'colorear', source: 'vaca', status: 'done', w: 1024, h: 1024, paint: null, thumb: await mk('#ff00ff', 'image/png'), meta: {} });
    const b = await CL.db.works.save({ kind: 'neon', source: 'neon', status: 'done', w: 480, h: 480, paint: null, thumb: await mk('#2040ff', 'image/jpeg'), meta: {} });
    return { a: a.id, b: b.id };
  });
  await page.waitForTimeout(900);
  await tapSel('.gal-tab[data-tab="done"]');
  await page.waitForTimeout(700);
  await tapSel(`.gal-card[data-id="${ids.a}"]`);
  await page.waitForTimeout(1500);
  await shot(page, OUT + '-c-colorear-sin-paint');
  const v = await page.evaluate(() => ({ layers: !!document.querySelector('.gal-view .gv-layers'), src: document.querySelector('.gal-view .gv-img').src.startsWith('blob:') }));
  ok(!v.layers && v.src, 'c) colorear sin paint: la vista deja la miniatura (sin capas en blanco) ' + JSON.stringify(v));
  const out = await page.evaluate(async (ids) => {
    const res = {};
    for (const [k, id] of Object.entries(ids)) {
      const w = await CL.db.works.get(id);
      const b = await CL.gallery.exportPNG(w);
      const head = new Uint8Array(await b.slice(0, 8).arrayBuffer());
      const im = await CL.util.blobToImage(b); const c = CL.util.canvas(im.width, im.height); const x = c.getContext('2d'); x.drawImage(im, 0, 0);
      const d = x.getImageData(10, 10, 1, 1).data;
      res[k] = { type: b.type, png: head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47, px: [d[0], d[1], d[2]].join(',') };
    }
    return res;
  }, ids);
  ok(out.a.png && out.a.px === '255,0,255', 'c) colorear sin paint: descarga = la miniatura en PNG ' + JSON.stringify(out.a));
  ok(out.b.png && out.b.type === 'image/png', 'd) neón con miniatura JPEG: descarga PNG de verdad ' + JSON.stringify(out.b));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
}

// e) Movimiento reducido.
{
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => CL.router.go('inicio'));
  await page.waitForTimeout(800);
  await page.evaluate(() => CL.router.go('obras'));
  await page.waitForTimeout(1200);
  const a = await page.evaluate(() => {
    const c = document.querySelector('.gal-card');
    const card = getComputedStyle(c).animationName;
    c.classList.add('gal-leaving');
    const leaving = getComputedStyle(c).animationName;
    c.classList.remove('gal-leaving');
    return { card, leaving };
  });
  ok(a.card === 'none' && a.leaving === 'gal-out', 'e) reduced-motion: tarjetas quietas, la salida al borrar queda ' + JSON.stringify(a));
}
ok(clean(t.errors).length === 0, 'sin errores ' + JSON.stringify(clean(t.errors)).slice(0, 600));
await t.close();
