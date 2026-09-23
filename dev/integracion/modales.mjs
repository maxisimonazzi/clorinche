// Ventanas emergentes: el pulgar apoyado en el fondo NO cierra; un toque corto sí.
import { launch, appUrl, tap, touchStart, touches, shot } from '../lib.mjs';

const t = await launch({ size: 'tablet' });
const { page } = t;
const out = {};
const isOpen = () => page.evaluate(() => !!document.querySelector('.modal-back.in'));

async function probar(nombre, abrir) {
  await abrir();
  await page.waitForTimeout(700);
  const abierto = await isOpen();
  // Pulgar apoyado 1,2 s en el borde izquierdo del fondo (sin soltar) → debe seguir abierto.
  await touchStart(page, [{ x: 12, y: 400, id: 1 }]);
  await page.waitForTimeout(1200);
  const conPulgar = await isOpen();
  await touches(page, []);
  await page.waitForTimeout(300);
  const trasSoltarLargo = await isOpen();
  // Toque corto en el fondo → cierra.
  await tap(page, 12, 400);
  await page.waitForTimeout(500);
  const trasTap = await isOpen();
  out[nombre] = { abierto, conPulgar, trasSoltarLargo, cerroConTap: !trasTap };
}

await page.goto(appUrl('colorear/vaca'));
await page.waitForTimeout(2000);
await probar('colorear-selector', () => page.locator('.screen--colorear [aria-label*="olor" i]').filter({ visible: true }).first().click());

await page.goto(appUrl('pizarra'));
await page.waitForTimeout(1200);
await probar('pizarra-fondo', () => page.locator('.screen--pizarra [aria-label*="ondo" i]').filter({ visible: true }).first().click());

await page.evaluate(async () => {
  const c = document.createElement('canvas'); c.width = c.height = 200;
  const x = c.getContext('2d'); x.fillStyle = '#7b61ff'; x.fillRect(0, 0, 200, 200);
  const b = await CL.util.canvasToBlob(c);
  await CL.db.works.save({ kind: 'pizarra', source: 'pizarra', status: 'done', paint: b, thumb: b, w: 200, h: 200, meta: { bg: 'blanco' } });
});
await page.goto(appUrl('obras'));
await page.waitForTimeout(1500);
await probar('galeria-vista', () => page.locator('.screen--obras .gal-card').first().click());
console.log(JSON.stringify(out, null, 1));
console.log('errores:', t.errors.length ? t.errors : 'ninguno');
await t.close();
