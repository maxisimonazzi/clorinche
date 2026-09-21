// Revisión 1: resaltado de la obra MÁS NUEVA (el caso real tras "¡Terminé!": queda primera, arriba a la izquierda).
import { launch, appUrl, shot } from '../../lib.mjs';
import { ok, PROFILE } from './lib.mjs';
for (const size of ['desktop', 'tablet', 'phone', 'phoneH']) {
  const t = await launch({ size, persistent: PROFILE });
  const { page } = t;
  await page.goto(appUrl('inicio'));
  await page.waitForTimeout(500);
  const id = await page.evaluate(async () => (await CL.db.works.list({ status: 'done' }))[0].id);
  await page.evaluate((id) => CL.router.go('obras/' + id), id);
  await page.waitForTimeout(950);
  await shot(page, `galeria/r2/nueva-${size}-pulso`);
  const m = await page.evaluate((id) => {
    const c = document.querySelector(`.gal-card[data-id="${id}"]`); const g = document.querySelector('.gal-grid');
    const r = c.getBoundingClientRect(), gr = g.getBoundingClientRect();
    const s = c.querySelector('.gal-new-star').getBoundingClientRect();
    return { gridTop: Math.round(gr.top), cardTop: Math.round(r.top), ringTop: Math.round(r.top - 9), starTop: Math.round(s.top), starClip: Math.round(gr.top - s.top), ringClip: Math.round(gr.top - (r.top - 9)), scrollTop: g.scrollTop };
  }, id);
  ok(m.starClip <= 0 && m.ringClip <= 0, `[${size}] obra nueva resaltada sin recortes arriba ${JSON.stringify(m)}`);
  await page.waitForTimeout(4200);
  await shot(page, `galeria/r2/nueva-${size}-reposo`);
  await t.close();
}
