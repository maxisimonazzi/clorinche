// (corrección 1) Editar una obra terminada reabierta desde su id: se guarda, sigue 'done' y no se duplica.
import { launch, appUrl, ready, hitSel, paintAt, samplePaint, filterErrors } from './common.mjs';
const t = await launch({ size: 'tablet' });
const { page } = t;
await page.goto(appUrl('colorear/vaca')); await ready(page); await page.waitForTimeout(300);
await hitSel(t, '.cl-sw[aria-label="Azul"]'); await paintAt(t, 0.08, 0.08, 400);
await hitSel(t, '.cl-done'); await page.waitForFunction(() => location.hash.startsWith('#obras/'), null, { timeout: 10000 });
const id = (await page.evaluate(() => location.hash)).split('/')[1];
const info = () => page.evaluate(async (id) => { const w = await CL.db.works.get(id); return [w.status, w.updatedAt, w.paint.size, (await CL.db.works.list()).length]; }, id);
const a = await info();
await page.goto(appUrl('colorear/vaca/' + id)); await ready(page); await page.waitForTimeout(300);
await hitSel(t, '.cl-sw[aria-label="Negro"]'); await paintAt(t, 0.5, 0.95, 200);
const s = await samplePaint(page, [[0.5, 0.95]]);
await page.waitForTimeout(900);
const b = await info();
console.log(JSON.stringify({ before: a, after: b, painted: s }), JSON.stringify(filterErrors(t.errors)));
await t.close();
