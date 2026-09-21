// Fugas de URLs de blob: entrar/salir de la galería varias veces (con y sin vista grande abierta).
// Uso: cd dev && node galeria/fugas.mjs
import { launch, appUrl } from '../lib.mjs';
import { seed } from './seed2.mjs';
const t = await launch({ size: 'tablet' });
const { page } = t;
await page.addInitScript(() => {
  const live = new Map();
  const c = URL.createObjectURL.bind(URL), r = URL.revokeObjectURL.bind(URL);
  URL.createObjectURL = (o) => { const u = c(o); live.set(u, new Error().stack.split('\n').slice(2, 5).join(' | ')); return u; };
  URL.revokeObjectURL = (u) => { live.delete(u); return r(u); };
  window.__live = () => [...live.values()];
});
await page.goto(appUrl('inicio'));
await page.waitForTimeout(500);
await seed(page, { done: 8, progress: 2 });
for (let i = 0; i < 6; i++) {
  await page.evaluate(() => CL.router.go('obras'));
  await page.waitForTimeout(500);
  if (i % 2) { await page.locator('.gal-card').first().click({ force: true }); await page.waitForTimeout(500); }
  await page.evaluate(() => CL.router.go('inicio'));
  await page.waitForTimeout(700);
}
await page.waitForTimeout(1500);
const live = await page.evaluate(() => window.__live());
console.log(live.length === 0 ? 'OK    sin URLs vivas' : 'FALLA URLs vivas: ' + JSON.stringify(live, null, 1));
console.log('errores', JSON.stringify(t.errors.filter((x) => !/icons\/.*\.png/.test(x))));
await t.close();
