// Corrección 1 — botones dentro de pantalla y sin superposiciones en todos los tamaños (estándar + extra).
// Uso: node fuegos/c1-tamanos.mjs
import { launch, appUrl, shot, SIZES } from '../lib.mjs';

const extra = {
  seH: { width: 568, height: 320, dpr: 2, touch: true },
  seV: { width: 320, height: 568, dpr: 2, touch: true },
  androidH: { width: 740, height: 360, dpr: 3, touch: true },
  iphone8H: { width: 667, height: 375, dpr: 2, touch: true },
  tab7V: { width: 600, height: 960, dpr: 2, touch: true },
  mid520: { width: 520, height: 700, dpr: 2, touch: true },
};
const sizes = { ...Object.fromEntries(['desktop', 'tablet', 'tabletV', 'phone', 'phoneH', 'phoneSmall'].map((k) => [k, SIZES[k]])), ...extra };
const res = {};
for (const [name, size] of Object.entries(sizes)) {
  const t = await launch({ size });
  const { page } = t;
  await page.goto(appUrl('fuegos'));
  await page.waitForTimeout(700);
  res[name] = await page.evaluate(() => {
    const vw = innerWidth, vh = innerHeight;
    const btns = [...document.querySelectorAll('.screen--fuegos button')].map((b) => { const r = b.getBoundingClientRect(); return { l: b.getAttribute('aria-label'), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; });
    const out = btns.filter((b) => b.x < -1 || b.y < -1 || b.x + b.w > vw + 1 || b.y + b.h > vh + 1).map((b) => b.l + '@' + b.x + ',' + b.y);
    const ov = [];
    for (let i = 0; i < btns.length; i++) for (let j = i + 1; j < btns.length; j++) { const a = btns[i], b = btns[j]; if (a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1) ov.push(a.l + ' / ' + b.l); }
    const c = document.querySelector('.fw-colors').getBoundingClientRect();
    return { vw, vh, out, ov, small: btns.filter((b) => b.w < 46).map((b) => b.l), inTop: !document.querySelector('.fw-colors').classList.contains('fw-colors--float'), colors: [Math.round(c.x), Math.round(c.y), Math.round(c.width), Math.round(c.height)] };
  });
  res[name].errors = t.errors.filter((e) => !/drawings\//.test(e));
  res[name].ajenos = t.errors.length - res[name].errors.length;
  await shot(page, `fuegos/c1-tam-${name}`);
  await t.close();
}
console.log(JSON.stringify(res));
