// Galería "Mis obras": prueba funcional completa (desktop) + capturas en todos los tamaños.
// Uso: cd dev && node galeria/galeria.mjs [--solo-funcional | tamaño...]
import fs from 'node:fs';
import path from 'node:path';
import { launch, appUrl, shot, SHOTS } from '../lib.mjs';
import { seed } from './seed.mjs';

const argv = process.argv.slice(2);
const onlyFunc = argv.includes('--solo-funcional');
const sizes = argv.filter((a) => !a.startsWith('--'));
const ALL = sizes.length ? sizes : ['desktop', 'tablet', 'tabletV', 'phone', 'phoneH', 'phoneSmall'];
const ok = (cond, msg) => { console.log((cond ? 'OK   ' : 'FALLA') + ' ' + msg); if (!cond) process.exitCode = 1; };
const cleanErrors = (errs) => errs.filter((e) => !/icons\/.*\.(png|svg)|ERR_FILE_NOT_FOUND/.test(e));

// Cuenta URLs de blob vivas (para comprobar que se liberan al salir de la galería).
const countUrls = () => {
  const live = new Set();
  const c = URL.createObjectURL.bind(URL), r = URL.revokeObjectURL.bind(URL);
  URL.createObjectURL = (o) => { const u = c(o); live.add(u); return u; };
  URL.revokeObjectURL = (u) => { live.delete(u); return r(u); };
  window.__liveUrls = () => live.size;
};

async function funcional() {
  const t = await launch({ size: 'desktop' });
  const { page } = t;
  await page.addInitScript(countUrls);
  await page.goto(appUrl('obras'));
  await page.waitForTimeout(800);
  ok(await page.locator('.gal-empty').count() === 1, 'estado vacío visible sin obras');
  await shot(page, 'galeria/obras-vacio-desktop');
  // Botones del estado vacío
  await page.locator('.gal-go--pizarra').click({ force: true });
  await page.waitForTimeout(250);
  ok((await page.evaluate(() => location.hash)) === '#pizarra', 'vacío → pizarra');
  await page.goto(appUrl('obras'));
  await page.waitForTimeout(500);
  await page.locator('.gal-go--colorear').click({ force: true });
  await page.waitForTimeout(250);
  ok((await page.evaluate(() => location.hash)) === '#dibujos', 'vacío → dibujos');

  const ids = await seed(page, { done: 9, progress: 3 });
  const doneIds = ids.filter((w) => w.status === 'done').map((w) => w.id);
  const progIds = ids.filter((w) => w.status === 'progress').map((w) => w.id);
  await page.goto(appUrl('inicio'));
  await page.waitForTimeout(300);
  await page.evaluate(() => CL.router.go('obras'));
  await page.waitForTimeout(1000);
  await shot(page, 'galeria/obras-grilla-desktop');
  const g = await page.evaluate(() => ({
    cards: [...document.querySelectorAll('.gal-card')].map((c) => c.dataset.id),
    counts: [...document.querySelectorAll('.gal-count')].map((c) => c.textContent),
    active: document.querySelector('.gal-tab.active').getAttribute('aria-label'),
    imgsOk: [...document.querySelectorAll('.gal-thumb')].every((i) => i.complete && i.naturalWidth > 0 && i.src.startsWith('blob:')),
    cols: getComputedStyle(document.querySelector('.gal-grid')).gridTemplateColumns.split(' ').length,
  }));
  ok(g.active === 'Terminadas', 'pestaña por defecto: terminadas');
  ok(g.cards.length === 9 && g.cards[0] === doneIds[doneIds.length - 1], 'terminadas: 9, la más nueva primero');
  ok(g.counts.join(',') === '9,3', 'contadores 9 y 3 → ' + g.counts);
  ok(g.imgsOk, 'miniaturas cargadas desde blob URL');
  ok(g.cols === 5, 'desktop: 5 columnas → ' + g.cols);

  await page.locator('.gal-tab').nth(1).click({ force: true });
  await page.waitForTimeout(700);
  const p = await page.evaluate(() => [...document.querySelectorAll('.gal-card')].map((c) => c.dataset.id));
  ok(p.length === 3 && p[0] === progIds[2], 'sin terminar: 3, la más nueva primero');
  await shot(page, 'galeria/obras-sinterminar-desktop');
  await page.locator('.gal-tab').nth(0).click({ force: true });
  await page.waitForTimeout(600);

  // Vista grande
  const target = doneIds[doneIds.length - 1];
  await page.locator(`.gal-card[data-id="${target}"]`).click({ force: true });
  await page.waitForTimeout(600);
  await shot(page, 'galeria/obras-vista-desktop');
  const v = await page.evaluate(() => {
    const m = document.querySelector('.gal-view .modal').getBoundingClientRect();
    const i = document.querySelector('.gv-img').getBoundingClientRect();
    return { m: [m.x, m.y, m.right, m.bottom].map(Math.round), img: [Math.round(i.width), Math.round(i.height)], vw: innerWidth, vh: innerHeight, btns: document.querySelectorAll('.gv-actions .btn').length };
  });
  ok(v.m[0] >= 0 && v.m[1] >= 0 && v.m[2] <= v.vw && v.m[3] <= v.vh, 'vista grande entra en pantalla ' + JSON.stringify(v));
  ok(v.btns === 4, '4 botones en la vista grande');

  // Descarga (la obra 8 tiene miniatura PNG; probamos también una JPEG)
  for (const id of [target, doneIds[doneIds.length - 2]]) {
    if (id !== target) {
      await page.locator('.gv-close').click({ force: true });
      await page.waitForTimeout(300);
      await page.locator(`.gal-card[data-id="${id}"]`).click({ force: true });
      await page.waitForTimeout(500);
    }
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), page.locator('.gv-down').click({ force: true })]);
    const file = path.join(SHOTS, 'galeria', 'descarga-' + dl.suggestedFilename());
    await dl.saveAs(file);
    const buf = fs.readFileSync(file);
    const isPng = buf.slice(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
    ok(isPng && w > 0 && h > 0 && /^colorinche-.+-\d{4}-\d{2}-\d{2}\.png$/.test(dl.suggestedFilename()),
      `descarga PNG válida ${dl.suggestedFilename()} ${w}x${h} ${buf.length} bytes`);
  }
  await page.waitForTimeout(400);

  // Borrar: un toque corto NO borra
  const del = page.locator('.gv-del');
  const bb = await del.boundingBox();
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await page.mouse.down(); await page.waitForTimeout(200); await page.mouse.up();
  await page.waitForTimeout(250);
  await shot(page, 'galeria/obras-borrar-toquecorto-desktop');
  const victim = doneIds[doneIds.length - 2];
  ok(!!(await page.evaluate((id) => CL.db.works.get(id), victim)), 'toque corto no borra');
  ok(await page.locator('.gal-view').count() === 1, 'la vista sigue abierta tras toque corto');
  await page.waitForTimeout(1300);
  // Mantener apretado sí borra
  await page.mouse.down(); await page.waitForTimeout(700);
  await shot(page, 'galeria/obras-borrar-manteniendo-desktop');
  await page.waitForFunction(() => !!document.querySelector('.gal-card.gal-leaving'), null, { timeout: 3000, polling: 16 });
  await page.waitForTimeout(120);
  await shot(page, 'galeria/obras-borrar-animacion-desktop');
  await page.mouse.up();
  await page.waitForTimeout(1000);
  const after = await page.evaluate(async (id) => ({
    db: !!(await CL.db.works.get(id)),
    card: !!document.querySelector(`.gal-card[data-id="${id}"]`),
    count: document.querySelector('.gal-count').textContent,
    modal: !!document.querySelector('.gal-view'),
  }), victim);
  ok(!after.db && !after.card && after.count === '8' && !after.modal, 'mantener apretado borra y la tarjeta se va ' + JSON.stringify(after));

  // Seguir → ruta correcta por tipo
  const seguir = {};
  for (const w of ids.slice(0, 3)) {
    await page.goto(appUrl('obras'));
    await page.waitForTimeout(600);
    await page.locator(`.gal-card[data-id="${w.id}"]`).click({ force: true });
    await page.waitForTimeout(400);
    await page.locator('.gv-go').click({ force: true });
    await page.waitForTimeout(300);
    seguir[w.kind] = await page.evaluate(() => decodeURIComponent(location.hash));
  }
  ok(seguir.colorear === `#colorear/u-prueba/${ids[0].id}` && seguir.pizarra === `#pizarra/${ids[1].id}` && seguir.neon === `#neon/${ids[2].id}`,
    'seguir abre la ruta de cada tipo ' + JSON.stringify(seguir));

  // Resaltado #obras/<id> (una obra vieja, hay que scrollear)
  const old = doneIds[0];
  await page.goto(appUrl('obras/' + old));
  await page.waitForTimeout(1200);
  await shot(page, 'galeria/obras-resaltada-desktop');
  const hl = await page.evaluate((id) => {
    const c = document.querySelector(`.gal-card[data-id="${id}"]`);
    const g = document.querySelector('.gal-grid');
    const r = c.getBoundingClientRect(), gr = g.getBoundingClientRect();
    return { cls: c.classList.contains('gal-new'), visible: r.top >= gr.top - 20 && r.bottom <= gr.bottom + 20, scrollTop: g.scrollTop };
  }, old);
  ok(hl.cls && hl.visible, 'obra resaltada y visible ' + JSON.stringify(hl));
  // Resaltado de una sin terminar → cambia de pestaña
  await page.goto(appUrl('obras/' + progIds[0]));
  await page.waitForTimeout(900);
  const hp = await page.evaluate((id) => ({
    tab: document.querySelector('.gal-tab.active').getAttribute('aria-label'),
    cls: !!document.querySelector(`.gal-card.gal-new[data-id="${id}"]`),
  }), progIds[0]);
  ok(hp.tab === 'Sin terminar' && hp.cls, 'resaltar una sin terminar abre esa pestaña');

  // Escape cierra la vista
  await page.locator('.gal-card').first().click({ force: true });
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  ok(await page.locator('.gal-view').count() === 0, 'Escape cierra la vista grande');

  // URLs liberadas al salir
  await page.locator('.gal-card').first().click({ force: true });
  await page.waitForTimeout(400);
  const liveIn = await page.evaluate(() => window.__liveUrls());
  await page.evaluate(() => CL.router.go('inicio'));
  await page.waitForTimeout(900);
  const liveOut = await page.evaluate(() => window.__liveUrls());
  ok(liveIn > 0 && liveOut === 0, `URLs de blob liberadas al salir (${liveIn} → ${liveOut})`);
  ok(await page.locator('.gal-view').count() === 0, 'la vista grande se cierra al salir');

  const errs = cleanErrors(t.errors);
  ok(errs.length === 0, 'sin errores de consola ' + JSON.stringify(errs));
  await t.close();
}

async function capturas(size) {
  const t = await launch({ size });
  const { page } = t;
  await page.goto(appUrl('obras'));
  await page.waitForTimeout(900);
  await shot(page, `galeria/obras-vacio-${size}`);
  const ids = await seed(page, { done: 9, progress: 3 });
  const doneIds = ids.filter((w) => w.status === 'done').map((w) => w.id);
  await page.reload();
  await page.waitForTimeout(1100);
  await shot(page, `galeria/obras-grilla-${size}`);
  const info = await page.evaluate(() => {
    const g = document.querySelector('.gal-grid');
    const top = document.querySelector('.gal-top').getBoundingClientRect();
    const tabs = document.querySelector('.gal-tabs').getBoundingClientRect();
    return {
      cols: getComputedStyle(g).gridTemplateColumns.split(' ').length,
      cardW: Math.round(document.querySelector('.gal-card').getBoundingClientRect().width),
      topOverflow: Math.round(tabs.right) > innerWidth || Math.round(top.right) > innerWidth,
      pageScroll: document.scrollingElement.scrollHeight > innerHeight,
    };
  });
  await page.locator('.gal-card').nth(1).click({ force: true });
  await page.waitForTimeout(700);
  await shot(page, `galeria/obras-vista-${size}`);
  info.view = await page.evaluate(() => {
    const m = document.querySelector('.gal-view .modal').getBoundingClientRect();
    const a = document.querySelector('.gv-actions').getBoundingClientRect();
    const box = document.querySelector('.gal-view .modal');
    return {
      inside: m.left >= 0 && m.top >= 0 && m.right <= innerWidth && m.bottom <= innerHeight,
      actionsInside: a.right <= m.right && a.bottom <= m.bottom,
      noScroll: box.scrollHeight <= box.clientHeight + 1 && box.scrollWidth <= box.clientWidth + 1,
      btn: Math.round(document.querySelector('.gv-go').getBoundingClientRect().width),
    };
  });
  await page.locator('.gv-close').click({ force: true });
  await page.waitForTimeout(300);
  await page.goto(appUrl('obras/' + doneIds[0]));
  await page.waitForTimeout(1300);
  await shot(page, `galeria/obras-resaltada-${size}`);
  info.errors = cleanErrors(t.errors);
  console.log(size, JSON.stringify(info));
  if (info.errors.length || info.topOverflow || info.pageScroll || !info.view.inside || !info.view.noScroll) process.exitCode = 1;
  await t.close();
}

if (!sizes.length) await funcional();
if (!onlyFunc) for (const s of ALL) await capturas(s);
