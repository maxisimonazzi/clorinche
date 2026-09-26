// Prueba de integración: los dibujos de "naturaleza" en la app (catálogo y pantalla de colorear).
// Uso: cd dev && node naturaleza/app.mjs
import { launch, appUrl, shot } from '../lib.mjs';

const sizes = ['desktop', 'tablet', 'phone'];
for (const size of sizes) {
  const t = await launch({ size });
  await t.page.goto(appUrl('dibujos/naturaleza'));
  await t.page.waitForTimeout(1200);
  const info = await t.page.evaluate(() => CL.drawings.list('naturaleza').map((d) => [d.id, d.name, CL.drawings.svg(d.id).length]));
  if (size === 'desktop') console.log(JSON.stringify(info));
  await shot(t.page, `naturaleza/${size}-catalogo`);
  const ids = size === 'phone' ? ['sol', 'flor', 'arbol', 'mariposa', 'arcoiris', 'hongo'] : ['arbol', 'mariposa', 'arcoiris', 'hongo'];
  for (const id of ids) {
    await t.page.goto(appUrl('colorear/' + id));
    await t.page.waitForTimeout(1500);
    await shot(t.page, `naturaleza/${size}-colorear-${id}`);
  }
  console.log(size, 'errores:', t.errors.length ? t.errors.join('\n') : 'ninguno');
  await t.close();
}
