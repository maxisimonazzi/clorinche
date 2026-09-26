// Colorear un dinosaurio en celular (vertical y horizontal) navegando con el router, sin recargar.
//   cd dev && node dinosaurios/phone.mjs
import { launch, appUrl, shot, settle } from '../lib.mjs';
for (const [size, id] of [['phone', 'triceratops'], ['phoneH', 'estegosaurio'], ['phone', 'pterodactilo']]) {
  const t = await launch({ size });
  await t.page.goto(appUrl('dibujos/dinosaurios'));
  await t.page.waitForFunction(() => window.CL && CL.router);
  await settle(t.page, 600);
  await t.page.evaluate((id) => CL.router.go('colorear/' + id), id);
  await settle(t.page, 1800);
  await shot(t.page, `dinosaurios/${size}-colorear-${id}`);
  console.log(size, id, t.errors.length ? t.errors.join('\n') : 'sin errores');
  await t.close();
}
