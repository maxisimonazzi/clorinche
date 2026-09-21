// Revisión (rv): inicio y galería en todos los tamaños con el perfil de rv-real.mjs.
// Uso: cd dev && node review-galeria/rv-sizes.mjs [tamaños...]
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { launch, appUrl, shot } from '../../lib.mjs';
import { ok, clean } from './r1-lib.mjs';

const BASE = path.join(os.tmpdir(), 'colorinche-rv-profile');
const OUT = 'galeria/c1';
const argv = process.argv.slice(2);
const SIZES = argv.length ? argv : ['desktop', 'tablet', 'tabletV', 'phone', 'phoneH', 'phoneSmall'];

const homeMetrics = (page) => page.evaluate(() => {
  const R = (e) => { const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), r: Math.round(r.right), b: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) }; };
  const cards = [...document.querySelectorAll('.home-card')].map(R);
  const minis = [...document.querySelectorAll('.home-mini')].map(R);
  const title = R(document.querySelector('.home-title'));
  const icon = document.querySelector('.home-icon');
  const mute = R(document.querySelector('.home-sound .btn'));
  const arts = [...document.querySelectorAll('.home-art')].map(R);
  const labels = [...document.querySelectorAll('.home-label')].map((l) => ({ t: l.textContent, clipped: l.scrollWidth > l.clientWidth + 1, fs: getComputedStyle(l).fontSize }));
  const vw = innerWidth, vh = innerHeight;
  const out = [...cards, ...minis, title, mute].some((r) => r.x < -1 || r.y < -1 || r.r > vw + 1 || r.b > vh + 1);
  const top = Math.min(...cards.map((c) => c.y));
  const overlapTitle = title.b > top + 2;
  const hit = (a, b) => a.r > b.x && a.x < b.r && a.b > b.y && a.y < b.b;
  const overlapMute = cards.some((c) => hit(mute, c));
  const iconR = icon ? R(icon) : null;
  const overlapIconMute = iconR ? hit(mute, iconR) : false;
  const overlapTitleMute = hit(mute, title);
  const area = cards.reduce((a, c) => a + c.w * c.h, 0) / (vw * vh);
  return { cards, minis, title, icon: iconR, mute, arts, labels, out, overlapTitle, overlapMute, overlapIconMute, overlapTitleMute, area: Math.round(area * 100) + '%', scroll: document.documentElement.scrollHeight > vh + 1 };
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
    visibleRows: Math.round(g.clientHeight / (r0 ? r0.height : 1) * 10) / 10,
  };
});

const viewMetrics = (page) => page.evaluate(() => {
  const m = document.querySelector('.gal-view .modal'); const mr = m.getBoundingClientRect();
  const i = document.querySelector('.gv-img').getBoundingClientRect();
  const bb = [...document.querySelectorAll('.gv-actions .btn')].map((b) => b.getBoundingClientRect());
  const btnOut = bb.some((r) => r.bottom > mr.bottom + 1 || r.right > mr.right + 1 || r.left < mr.left - 1);
  return {
    inside: mr.left >= -0.5 && mr.top >= -0.5 && mr.right <= innerWidth + 0.5 && mr.bottom <= innerHeight + 0.5,
    scroll: m.scrollHeight > m.clientHeight + 1 || m.scrollWidth > m.clientWidth + 1,
    img: [Math.round(i.width), Math.round(i.height)], imgArea: Math.round(100 * i.width * i.height / (innerWidth * innerHeight)) + '%',
    btns: bb.map((r) => Math.round(r.width)), btnOut,
    layers: !!document.querySelector('.gv-layers.in'),
  };
});

for (const size of SIZES) {
  // Copia del perfil para cada tamaño (así nada de lo que hace un tamaño afecta al siguiente).
  const prof = BASE + '-' + size;
  fs.rmSync(prof, { recursive: true, force: true });
  fs.cpSync(BASE, prof, { recursive: true });
  const t = await launch({ size, persistent: prof });
  const { page } = t;
  await page.goto(appUrl('inicio'));
  await page.waitForTimeout(1700);
  await shot(page, `${OUT}/home-${size}`);
  const hm = await homeMetrics(page);
  ok(!hm.out && !hm.overlapTitle && !hm.overlapMute && !hm.overlapIconMute && !hm.overlapTitleMute && !hm.scroll, `[${size}] inicio: nada afuera/superpuesto/scroll ` + JSON.stringify({ out: hm.out, ot: hm.overlapTitle, om: hm.overlapMute, oim: hm.overlapIconMute, otm: hm.overlapTitleMute, sc: hm.scroll, area: hm.area }));
  ok(hm.cards.every((c) => Math.min(c.w, c.h) >= 120), `[${size}] tarjetas grandes (${hm.cards.map((c) => c.w + 'x' + c.h).join(' ')})`);
  ok(hm.minis.every((c) => c.w >= 46), `[${size}] accesos neón/fuegos >= 46px (${hm.minis.map((c) => c.w).join(',')})`);
  ok(hm.labels.every((l) => !l.clipped), `[${size}] etiquetas sin cortar ` + JSON.stringify(hm.labels.map((l) => l.fs)));
  console.log(size, 'home', JSON.stringify({ title: hm.title, icon: hm.icon, arts: hm.arts.map((a) => a.w + 'x' + a.h), minis: hm.minis }));

  const ids = await page.evaluate(async () => {
    const l = await CL.db.works.list();
    const f = (p) => (l.find(p) || {}).id;
    return {
      colorear: f((w) => w.kind === 'colorear' && w.source === 'vaca' && w.status === 'done' && w.w === 2048),
      neon: f((w) => w.kind === 'neon' && w.status === 'done'),
      pizarra: f((w) => w.kind === 'pizarra' && w.status === 'done' && w.h > w.w),
      subida: f((w) => w.kind === 'colorear' && /^u-/.test(w.source)),
      oldest: l.filter((w) => w.status === 'done').slice(-1)[0].id,
    };
  });
  await page.evaluate(() => CL.router.go('obras'));
  await page.waitForTimeout(1500);
  await shot(page, `${OUT}/obras-${size}`);
  const gm = await galMetrics(page);
  ok(!gm.hOverflow && !gm.topOut, `[${size}] galería sin desborde ` + JSON.stringify(gm));
  await page.locator('.gal-tab').nth(1).click();
  await page.waitForTimeout(900);
  await shot(page, `${OUT}/obras-${size}-sinterminar`);
  await page.locator('.gal-tab').nth(0).click();
  await page.waitForTimeout(700);
  for (const [nm, id] of [['colorear', ids.colorear], ['neon', ids.neon], ['pizarra', ids.pizarra], ['subida', ids.subida]]) {
    if (!id) { console.log('sin id para', nm); continue; }
    await page.locator(`.gal-card[data-id="${id}"]`).scrollIntoViewIfNeeded();
    await page.locator(`.gal-card[data-id="${id}"]`).click();
    await page.waitForTimeout(1800);
    await shot(page, `${OUT}/vista-${size}-${nm}`);
    const vm = await viewMetrics(page);
    ok(vm.inside && !vm.scroll && !vm.btnOut && vm.btns.every((b) => b >= 54), `[${size}] vista ${nm} entra, botones grandes ` + JSON.stringify(vm));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }
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

  const e = await launch({ size });
  await e.page.goto(appUrl('obras'));
  await e.page.waitForTimeout(1300);
  await shot(e.page, `${OUT}/vacio-${size}`);
  const em = await e.page.evaluate(() => {
    const go = [...document.querySelectorAll('.gal-go, .gal-empty-art')].map((b) => { const r = b.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.top), Math.round(r.bottom)]; });
    const g = document.querySelector('.gal-grid');
    return { go, overflow: g.scrollHeight > g.clientHeight + 1, vh: innerHeight };
  });
  ok(!em.overflow && em.go.every((x) => x[2] <= em.vh && x[1] >= 0), `[${size}] vacío entra ` + JSON.stringify(em));
  ok(clean(e.errors).length === 0, `[${size}] vacío sin errores`);
  await e.close();
}
