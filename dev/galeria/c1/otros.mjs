// Revisión (rv): inicio y galería en tamaños "raros" (no obligatorios) para ver que nada se rompa.
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { launch, appUrl, shot } from '../../lib.mjs';
import { ok, clean } from './r1-lib.mjs';
const BASE = path.join(os.tmpdir(), 'colorinche-rv-profile');
const sizes = { d1440: [1440, 900, 1, false], d1920: [1920, 1080, 1, false], se: [667, 375, 2, true], tab800: [800, 1280, 2, true], ipadAir: [1180, 820, 2, true], and412: [412, 915, 2.6, true], fold: [280, 653, 3, true] };
for (const [name, [w, h, dpr, touch]] of Object.entries(sizes)) {
  const prof = BASE + '-otros';
  fs.rmSync(prof, { recursive: true, force: true });
  fs.cpSync(BASE, prof, { recursive: true });
  const t = await launch({ size: { width: w, height: h, dpr, touch }, persistent: prof });
  const { page } = t;
  await page.goto(appUrl('inicio'));
  await page.waitForTimeout(1500);
  await shot(page, `galeria/c1/otros-home-${name}`);
  const m = await page.evaluate(() => {
    const els = [...document.querySelectorAll('.home-card, .home-mini, .home-title, .home-sound .btn, .home-icon')];
    const out = els.filter((e) => { const r = e.getBoundingClientRect(); return r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1; }).map((e) => e.className.baseVal ?? e.className);
    const title = document.querySelector('.home-title').getBoundingClientRect();
    const mute = document.querySelector('.home-sound .btn').getBoundingClientRect();
    const hit = mute.right > title.left && mute.left < title.right && mute.bottom > title.top && mute.top < title.bottom;
    const cards = [...document.querySelectorAll('.home-card')].map((c) => { const r = c.getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); });
    return { out, hit, cards };
  });
  ok(!m.out.length && !m.hit, `[${name}] inicio entra ${JSON.stringify(m)}`);
  await page.evaluate(() => CL.router.go('obras'));
  await page.waitForTimeout(1300);
  await shot(page, `galeria/c1/otros-obras-${name}`);
  const g = await page.evaluate(() => {
    const top = document.querySelector('.gal-top');
    const out = [...top.children].some((e) => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 1 || r.left < -1; });
    return { out, cols: getComputedStyle(document.querySelector('.gal-grid')).gridTemplateColumns.split(' ').length };
  });
  ok(!g.out, `[${name}] barra de la galería entra ${JSON.stringify(g)}`);
  await page.locator('.gal-card').first().click();
  await page.waitForTimeout(1500);
  await shot(page, `galeria/c1/otros-vista-${name}`);
  const v = await page.evaluate(() => {
    const r = document.querySelector('.gal-view .modal').getBoundingClientRect();
    const b = [...document.querySelectorAll('.gv-actions .btn')].map((x) => x.getBoundingClientRect());
    return { inside: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, btns: b.map((x) => Math.round(x.width)), btnIn: b.every((x) => x.bottom <= r.bottom && x.right <= r.right) };
  });
  ok(v.inside && v.btnIn && v.btns.every((x) => x >= 46), `[${name}] vista entra ${JSON.stringify(v)}`);
  ok(clean(t.errors).length === 0, `[${name}] sin errores`);
  await t.close();
}
