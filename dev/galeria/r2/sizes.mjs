// Revisión 1: inicio y galería en todos los tamaños (con las obras reales del perfil de r1-real.mjs).
// Uso: cd dev && node galeria/r2-sizes.mjs [tamaños...]
import { launch, appUrl, shot } from '../../lib.mjs';
import { ok, clean, PROFILE } from './lib.mjs';

const OUT = 'galeria/r2';
const argv = process.argv.slice(2);
const SIZES = argv.length ? argv : ['desktop', 'tablet', 'tabletV', 'phone', 'phoneH', 'phoneSmall'];

const homeMetrics = (page) => page.evaluate(() => {
  const R = (e) => { const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), r: Math.round(r.right), b: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) }; };
  const cards = [...document.querySelectorAll('.home-card')].map(R);
  const minis = [...document.querySelectorAll('.home-mini')].map(R);
  const title = R(document.querySelector('.home-title'));
  const icon = document.querySelector('.home-icon');
  const mute = R(document.querySelector('.home-sound .btn'));
  const labels = [...document.querySelectorAll('.home-label')].map((l) => ({ t: l.textContent, clipped: l.scrollWidth > l.clientWidth + 1, fs: getComputedStyle(l).fontSize }));
  const vw = innerWidth, vh = innerHeight;
  const out = [...cards, ...minis, title, mute].some((r) => r.x < -1 || r.y < -1 || r.r > vw + 1 || r.b > vh + 1);
  // superposición entre encabezado y tarjetas
  const top = Math.min(...cards.map((c) => c.y));
  const overlapTitle = title.b > top + 2;
  const overlapMute = cards.some((c) => mute.r > c.x && mute.x < c.r && mute.b > c.y && mute.y < c.b);
  // aire: fracción de la pantalla ocupada por las tarjetas
  const area = cards.reduce((a, c) => a + c.w * c.h, 0) / (vw * vh);
  return { cards, minis, title, icon: icon ? R(icon) : null, mute, labels, out, overlapTitle, overlapMute, area: Math.round(area * 100) + '%', scroll: document.documentElement.scrollHeight > vh + 1 };
});

const galMetrics = (page) => page.evaluate(() => {
  const g = document.querySelector('.gal-grid');
  const cards = [...document.querySelectorAll('.gal-card')];
  const r0 = cards[0] && cards[0].getBoundingClientRect();
  const top = [...document.querySelectorAll('.gal-top > *')].map((e) => { const r = e.getBoundingClientRect(); return [String(e.className.baseVal ?? e.className).split(' ')[0], Math.round(r.x), Math.round(r.right), Math.round(r.height)]; });
  const tabs = [...document.querySelectorAll('.gal-tab')].map((b) => { const r = b.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });
  return {
    cols: getComputedStyle(g).gridTemplateColumns.split(' ').length,
    card: r0 ? [Math.round(r0.width), Math.round(r0.height)] : null,
    hOverflow: g.scrollWidth > g.clientWidth + 1 || document.querySelector('.gal-top').scrollWidth > innerWidth + 1,
    topOut: top.some((x) => x[2] > innerWidth + 1 || x[1] < -1), top, tabs,
  };
});

const viewMetrics = (page) => page.evaluate(() => {
  const m = document.querySelector('.gal-view .modal'); const mr = m.getBoundingClientRect();
  const i = document.querySelector('.gv-img').getBoundingClientRect();
  const btns = [...document.querySelectorAll('.gv-actions .btn')].map((b) => Math.round(b.getBoundingClientRect().width));
  const bb = [...document.querySelectorAll('.gv-actions .btn')].map((b) => b.getBoundingClientRect());
  const btnOut = bb.some((r) => r.bottom > mr.bottom + 1 || r.right > mr.right + 1 || r.left < mr.left - 1);
  return {
    inside: mr.left >= -0.5 && mr.top >= -0.5 && mr.right <= innerWidth + 0.5 && mr.bottom <= innerHeight + 0.5,
    scroll: m.scrollHeight > m.clientHeight + 1 || m.scrollWidth > m.clientWidth + 1,
    img: [Math.round(i.width), Math.round(i.height)], imgArea: Math.round(100 * i.width * i.height / (innerWidth * innerHeight)) + '%',
    btns, btnOut,
  };
});

for (const size of SIZES) {
  const t = await launch({ size, persistent: PROFILE });
  const { page } = t;
  // Inicio
  await page.goto(appUrl('inicio'));
  await page.waitForTimeout(1600);
  await shot(page, `${OUT}/home-${size}`);
  const hm = await homeMetrics(page);
  ok(!hm.out && !hm.overlapTitle && !hm.overlapMute && !hm.scroll, `[${size}] inicio: nada afuera/superpuesto/scroll ` + JSON.stringify({ out: hm.out, ot: hm.overlapTitle, om: hm.overlapMute, sc: hm.scroll, area: hm.area }));
  ok(hm.cards.every((c) => Math.min(c.w, c.h) >= 120), `[${size}] tarjetas de inicio grandes (${hm.cards.map((c) => c.w + 'x' + c.h).join(' ')})`);
  ok(hm.minis.every((c) => c.w >= 46), `[${size}] accesos neón/fuegos >= 46px (${hm.minis.map((c) => c.w).join(',')})`);
  ok(hm.labels.every((l) => !l.clipped), `[${size}] etiquetas sin cortar ` + JSON.stringify(hm.labels));
  console.log(size, 'home', JSON.stringify({ title: hm.title, icon: hm.icon, area: hm.area }));

  // Galería
  const ids = await page.evaluate(async () => {
    const l = await CL.db.works.list();
    const f = (p) => (l.find(p) || {}).id;
    return {
      colorear: f((w) => w.kind === 'colorear' && w.source === 'vaca' && w.status === 'done' && w.paint),
      neon: f((w) => w.kind === 'neon' && w.status === 'done' && w.meta && w.meta.view && w.meta.view.w > 1000),
      pizarra: f((w) => w.kind === 'pizarra' && w.status === 'done' && w.meta && w.meta.bg && !w.meta.docW),
      subida: f((w) => w.kind === 'colorear' && /^u-m/.test(w.source)),
      oldest: l.filter((w) => w.status === 'done').slice(-1)[0].id,
    };
  });
  await page.evaluate(() => CL.router.go('obras'));
  await page.waitForTimeout(1500);
  await shot(page, `${OUT}/obras-${size}`);
  const gm = await galMetrics(page);
  ok(!gm.hOverflow && !gm.topOut, `[${size}] galería sin desborde horizontal ` + JSON.stringify(gm));
  await page.locator('.gal-tab').nth(1).click();
  await page.waitForTimeout(900);
  await shot(page, `${OUT}/obras-${size}-sinterminar`);
  await page.locator('.gal-tab').nth(0).click();
  await page.waitForTimeout(600);
  for (const [nm, id] of [['neon', ids.neon], ['subida', ids.subida], ['colorear', ids.colorear]]) {
    if (!id) { console.log('sin id para', nm); continue; }
    await page.locator(`.gal-card[data-id="${id}"]`).scrollIntoViewIfNeeded();
    await page.locator(`.gal-card[data-id="${id}"]`).click();
    await page.waitForTimeout(1700);
    await shot(page, `${OUT}/vista-${size}-${nm}`);
    const vm = await viewMetrics(page);
    ok(vm.inside && !vm.scroll && !vm.btnOut && vm.btns.every((b) => b >= 54), `[${size}] vista ${nm} entra, botones grandes ` + JSON.stringify(vm));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }
  // Resaltado de una vieja (hay que scrollear)
  await page.evaluate((id) => CL.router.go('obras/' + id), ids.oldest);
  await page.waitForTimeout(1300);
  await shot(page, `${OUT}/resaltada-${size}`);
  const hl = await page.evaluate((id) => {
    const c = document.querySelector(`.gal-card[data-id="${id}"]`); const g = document.querySelector('.gal-grid');
    const r = c.getBoundingClientRect(), gr = g.getBoundingClientRect();
    return { hl: c.classList.contains('gal-new'), visible: r.top >= gr.top - 10 && r.bottom <= gr.bottom + 10 };
  }, ids.oldest);
  ok(hl.hl && hl.visible, `[${size}] #obras/<vieja> resaltada y visible ` + JSON.stringify(hl));
  ok(clean(t.errors).length === 0, `[${size}] sin errores ` + JSON.stringify(clean(t.errors)).slice(0, 300));
  await t.close();

  // Estado vacío (perfil nuevo)
  const e = await launch({ size });
  await e.page.goto(appUrl('obras'));
  await e.page.waitForTimeout(1300);
  await shot(e.page, `${OUT}/vacio-${size}`);
  const em = await e.page.evaluate(() => {
    const go = [...document.querySelectorAll('.gal-go')].map((b) => { const r = b.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.bottom)]; });
    const g = document.querySelector('.gal-grid');
    return { go, overflow: g.scrollHeight > g.clientHeight + 1, vh: innerHeight };
  });
  ok(em.go.length === 2 && !em.overflow && em.go.every((x) => x[0] >= 70 && x[1] <= em.vh), `[${size}] vacío: 2 botones grandes a la vista ` + JSON.stringify(em));
  await e.close();
}
