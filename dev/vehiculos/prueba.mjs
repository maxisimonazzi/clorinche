// Verifica que los dibujos de "vehiculos" carguen en la app, pesen < 6 KB y se vean en la pantalla de colorear.
import { launch, appUrl, shot } from '../lib.mjs';

const ids = ['auto', 'colectivo', 'camion-bomberos', 'tren', 'avion', 'cohete'];
for (const size of ['desktop', 'tablet', 'phone']) {
  const t = await launch({ size });
  await t.page.goto(appUrl('dibujos/vehiculos'));
  await t.page.waitForTimeout(1200);
  if (size === 'desktop') {
    const info = await t.page.evaluate((ids) => ids.map((id) => {
      const d = CL.drawings.get(id);
      return d ? { id, nombre: d.name, cat: d.cat, bytes: d.inner.length } : { id, falta: true };
    }), ids);
    console.log(JSON.stringify(info));
  }
  await shot(t.page, `vehiculos/${size}-catalogo`);
  await t.page.goto(appUrl('colorear/colectivo'));
  await t.page.waitForTimeout(1500);
  await shot(t.page, `vehiculos/${size}-colectivo`);
  console.log(size, 'errores:', JSON.stringify(t.errors.filter((e) => !/icons\/.*png/.test(e))));
  await t.close();
}
