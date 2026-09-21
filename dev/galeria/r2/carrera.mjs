// Revisión 1: dibujar y salir enseguida a la galería (casita + Mis obras rápido): ¿aparece la obra al día?
import { launch, appUrl, shot, stroke, tap } from '../../lib.mjs';
import { ok, clean, center } from './lib.mjs';
const size = process.argv[2] || 'tablet';
const t = await launch({ size });
const { page } = t;
for (const mode of ['pizarra', 'neon', 'colorear/perro']) {
  await page.goto('about:blank');
  await page.goto(appUrl(mode));
  await page.waitForTimeout(2200);
  const sel = mode === 'pizarra' ? '.pz-board' : mode === 'neon' ? '.neon-stage' : '.cl-board';
  const b = await page.locator(sel).boundingBox();
  if (mode.startsWith('colorear')) {
    await tap(page, b.x + b.width * 0.5, b.y + b.height * 0.55);
    await page.waitForTimeout(60);
  } else {
    await stroke(page, [[b.x + b.width * 0.2, b.y + b.height * 0.2], [b.x + b.width * 0.8, b.y + b.height * 0.8]], { pointer: 'touch', steps: 12, delay: 5 });
  }
  // casita + Mis obras lo más rápido posible
  const [hx, hy] = await center(page, '.btn-home');
  await tap(page, hx, hy);
  await page.waitForSelector('.home-card--obras');
  await page.waitForTimeout(420);
  const [ox, oy] = await center(page, '.home-card--obras');
  await tap(page, ox, oy);
  await page.waitForSelector('.gal-tab');
  await page.waitForTimeout(1500);
  const r = await page.evaluate(async () => {
    const db = await CL.db.works.list();
    const counts = [...document.querySelectorAll('.gal-count')].map((e) => e.textContent);
    return { db: db.length, counts, cards: document.querySelectorAll('.gal-card').length, tab: document.querySelector('.gal-tab.active').getAttribute('aria-label') };
  });
  await shot(page, `galeria/r2/carrera-${size}-${mode.replace('/', '-')}`);
  const shown = r.counts.reduce((a, b) => a + +b, 0);
  ok(shown === r.db, `[${size}] ${mode} → galería rápido: DB ${r.db} obras, galería muestra ${shown} ${JSON.stringify(r)}`);
  await page.evaluate(async () => { for (const w of await CL.db.works.list()) await CL.db.works.del(w.id); });
}
ok(clean(t.errors).length === 0, 'sin errores ' + JSON.stringify(clean(t.errors)).slice(0, 300));
await t.close();
