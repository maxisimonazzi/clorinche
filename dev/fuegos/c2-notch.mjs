// Corrección 2 (fuegos): iPhone apaisado con muesca (viewport-fit=cover => safe-area izq/der ~47 px, abajo ~21 px).
// Se emulan los env() pisando las variables --safe-* del núcleo.
import { launch, appUrl, shot } from '../lib.mjs';
const res = {};
for (const [name, size, safe] of [
  ['iphone14H', { width: 844, height: 390, dpr: 3, touch: true }, { l: 47, r: 47, b: 21, t: 0 }],
  ['iphone14ProMaxH', { width: 932, height: 430, dpr: 3, touch: true }, { l: 59, r: 59, b: 21, t: 0 }],
  ['iphone14V', { width: 390, height: 844, dpr: 3, touch: true }, { l: 0, r: 0, b: 34, t: 47 }],
]) {
  const t = await launch({ size });
  await t.context.addInitScript((s) => {
    document.addEventListener('DOMContentLoaded', () => {
      const r = document.documentElement.style;
      r.setProperty('--safe-l', s.l + 'px'); r.setProperty('--safe-r', s.r + 'px');
      r.setProperty('--safe-b', s.b + 'px'); r.setProperty('--safe-t', s.t + 'px');
    });
  }, safe);
  await t.page.goto(appUrl('fuegos'));
  await t.page.waitForTimeout(800);
  res[name] = await t.page.evaluate(() => {
    const vw = innerWidth, vh = innerHeight;
    const btns = [...document.querySelectorAll('.screen--fuegos button')].map((b) => { const r = b.getBoundingClientRect(); return { l: b.getAttribute('aria-label'), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; });
    const out = btns.filter((b) => b.x < 0 || b.y < 0 || b.x + b.w > vw || b.y + b.h > vh).map((b) => `${b.l}@${b.x},${b.y}`);
    const ov = [];
    for (let i = 0; i < btns.length; i++) for (let j = i + 1; j < btns.length; j++) { const a = btns[i], b = btns[j]; if (a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1) ov.push(a.l + ' / ' + b.l); }
    const top = document.querySelector('.fw-top');
    return { out, ov, topScrollW: top.scrollWidth, topClientW: top.clientWidth, float: document.querySelector('.fw-colors').classList.contains('fw-colors--float') };
  });
  await shot(t.page, `fuegos/c2-notch-${name}`);
  res[name].errors = t.errors;
  await t.close();
}
console.log(JSON.stringify(res, null, 1));
