// Revisión 1: recargar con la vista grande abierta y después "atrás": ¿queda un "atrás" que no hace nada?
import { launch, appUrl } from '../../lib.mjs';
import { ok, state, seedSynthetic } from './lib.mjs';
const t = await launch({ size: 'phone' });
const { page } = t;
await page.goto(appUrl('inicio'));
await page.waitForTimeout(600);
await seedSynthetic(page, { done: 4, progress: 0 });
await page.evaluate(() => CL.router.go('obras'));
await page.waitForTimeout(1200);
await page.locator('.gal-card').first().click();
await page.waitForTimeout(700);
await page.reload();
await page.waitForTimeout(1500);
const s0 = await state(page);
await page.evaluate(() => history.back());
await page.waitForTimeout(1200);
const s1 = await state(page);
// Otro atrás sale de la app (antes del #inicio no hay nada): puede destruir el contexto.
await page.evaluate(() => history.back()).catch(() => {});
await page.waitForTimeout(1200);
const s2 = await state(page).catch(() => ({ hash: page.url(), screen: '(fuera de la app)' }));
ok(s1.hash === '#inicio', `recargar con la vista abierta; atrás → ${s1.hash} (${s1.screen}); otro atrás → ${s2.hash} (${s2.screen}) [tras recargar: ${s0.hash} modal ${s0.modal}]`);
await t.close();
