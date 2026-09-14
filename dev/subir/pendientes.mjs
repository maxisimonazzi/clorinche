// Arreglos menores de la revisión 2: atrás del sistema en la edición, página vacía, permiso de cámara
// negado tarde, Worker al salir.
//   node subir/pendientes.mjs [desktop|tablet|phone]
import { launch, appUrl, shot } from '../lib.mjs';
import { load, dbg, clearUploads } from '../review-subir/r2-common.mjs';

const size = process.argv[2] || 'desktop';
const t = await launch({ size });
const { page } = t;
const out = {};
const nUploads = () => page.evaluate(async () => (await CL.db.uploads.list()).length);
await page.goto(appUrl('inicio'));
await page.waitForTimeout(700);
await clearUploads(page);

// 1. Atrás del sistema en la edición: vuelve a elegir (sigue en #subir); otro atrás sale a inicio.
await page.evaluate(() => CL.router.go('subir'));
await page.waitForTimeout(600);
await load(page, 'pagina-sombra.jpg');
const h0 = await page.evaluate(() => history.length);
await page.goBack();
await page.waitForTimeout(500);
out.atras1 = { ...(({ view, hist }) => ({ view, hist }))(await dbg(page)), hash: await page.evaluate(() => location.hash) };
await page.goBack();
await page.waitForTimeout(600);
out.atras2 = { hash: await page.evaluate(() => location.hash) };

// 2. Botón volver de la app y después atrás del sistema: no queda una entrada "fantasma".
await page.evaluate(() => CL.router.go('subir'));
await page.waitForTimeout(600);
await load(page, 'foto-color.jpg');
await page.click('.up-bar .btn-back');
await page.waitForTimeout(600);
out.volverApp = (({ view, hist }) => ({ view, hist }))(await dbg(page));
await page.goBack();
await page.waitForTimeout(600);
out.volverAppLuegoAtras = await page.evaluate(() => location.hash);

// 3. Guardar y después atrás desde colorear: vuelve a inicio (no a una pantalla de subir vacía).
await page.evaluate(() => CL.router.go('subir'));
await page.waitForTimeout(600);
await load(page, 'foto-color.jpg');
await page.click('.up-save');
await page.waitForFunction(() => /^#colorear\/u-/.test(location.hash), null, { timeout: 30000 });
await page.waitForTimeout(1200);
await page.goBack();
await page.waitForTimeout(900);
out.atrasDesdeColorear = await page.evaluate(() => location.hash);

// 4. Página vacía (foto toda negra): primer toque avisa y no guarda; el segundo guarda.
await page.evaluate(() => CL.router.go('subir'));
await page.waitForTimeout(600);
await clearUploads(page);
await load(page, 'rv:negra.jpg');
const blk = (await dbg(page)).black;
await page.click('.up-save');
await page.waitForTimeout(250);
out.vacia1 = {
  black: blk,
  aviso: await page.evaluate(() => !document.querySelector('.up-err').hidden && !!document.querySelector('.up-err svg')),
  tiembla: await page.evaluate(() => document.querySelector('.up-paper').classList.contains('up-shake')),
  guardadas: await nUploads(),
};
await shot(page, `subir/pendientes/${size}-vacia-aviso`);
await page.waitForTimeout(700);
await page.click('.up-save');
await page.waitForFunction(() => /^#colorear\/u-/.test(location.hash), null, { timeout: 30000 });
out.vacia2 = { guardadas: await nUploads() };
await page.waitForTimeout(800);

// 5. Permiso de cámara negado a los 4 s (fuera del gesto): no se intenta abrir el selector; la tarjeta late.
if (!t.size.touch) {
  await page.evaluate(() => CL.router.go('subir'));
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    navigator.mediaDevices.getUserMedia = () => new Promise((_, rej) => setTimeout(() => rej(new Error('NotAllowedError')), 4000));
  });
  let chooser = 0;
  page.on('filechooser', () => chooser++);
  await page.click('.up-card--cam');
  await page.waitForTimeout(4600);
  out.camaraTarde = { chooser, view: (await dbg(page)).view, late: await page.evaluate(() => document.querySelector('.up-card--file').classList.contains('up-hint')) };
  await shot(page, `subir/pendientes/${size}-camara-tarde`);
}

// 6. Worker al salir de la pantalla.
await page.evaluate(() => CL.router.go('inicio'));
await page.waitForTimeout(600);
out.workerTrasSalir = await page.evaluate(() => CL.upload._p.workerState());
console.log(JSON.stringify(out, null, 1));
console.log('errors', t.errors, 'h0', h0);
await t.close();
