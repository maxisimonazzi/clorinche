// Revisión (rv): ¿abrir un dibujo / la pizarra / el neón sin hacer nada deja obras vacías en "sin terminar"?
import { launch, appUrl } from '../../lib.mjs';
import { ok, clean } from './r1-lib.mjs';
const t = await launch({ size: 'tablet' });
const { page } = t;
await page.goto(appUrl('inicio'));
await page.waitForTimeout(800);
for (const r of ['colorear/leon', 'pizarra', 'neon', 'fuegos']) {
  await page.evaluate((r) => CL.router.go(r), r);
  await page.waitForTimeout(2500);
  await page.evaluate(() => CL.router.go('inicio'));
  await page.waitForTimeout(1500);
}
const n = await page.evaluate(async () => (await CL.db.works.list()).map((w) => w.kind + ':' + w.status));
ok(n.length === 0, 'entrar y salir sin dibujar no crea obras: ' + JSON.stringify(n));
ok(clean(t.errors).length === 0, 'sin errores ' + JSON.stringify(clean(t.errors)).slice(0, 300));
await t.close();
