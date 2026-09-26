// Verificación en la app de los dibujos nuevos de la granja (pollito, cabra, burro, pavo, tractor).
//   cd dev && node granja/nuevos.mjs
// - Catálogo #dibujos/granja en tablet y phone: tienen que aparecer los 11 dibujos (captura).
// - #colorear/pavo y #colorear/tractor en tablet y phone: pinta con el balde varias zonas (cambiando de color)
//   y comprueba que cada toque haya pintado algo en la capa de pintura (captura).
// Capturas en dev/shots/granja/. Los errores de consola que vienen de OTROS archivos de dibujos (otros
// agentes los editan en paralelo) se listan aparte y no cuentan como falla.
import { launch, appUrl, shot, tap, settle } from '../lib.mjs';

const NUEVOS = ['pollito', 'cabra', 'burro', 'pavo', 'tractor'];
// Puntos (en coordenadas del dibujo, 0..1000) dentro de zonas grandes de cada dibujo.
const TOQUES = {
  pavo: [[500, 175], [240, 330], [150, 560], [820, 440], [500, 640], [300, 640], [700, 640], [500, 260], [478, 480], [500, 400]],
  tractor: [[660, 530], [660, 610], [660, 670], [541, 509], [680, 360], [826, 400], [440, 560], [240, 700], [385, 400], [292, 156]],
};
const fallas = [];
const ajenos = new Set();

for (const size of ['tablet', 'phone']) {
  const t = await launch({ size });
  const { page } = t;
  const pointer = t.size.touch ? 'touch' : 'mouse';

  // Catálogo de la granja.
  await page.goto(appUrl('dibujos/granja'));
  await page.waitForFunction(() => document.querySelectorAll('.dj-item').length > 0);
  await settle(page, 1200);
  const items = await page.$$eval('.dj-item', (bs) => bs.map((b) => b.getAttribute('aria-label')));
  console.log(size, 'catálogo:', items.length, 'dibujos →', items.join(', '));
  if (items.length !== 11) fallas.push(`${size}: el catálogo muestra ${items.length} dibujos (se esperaban 11)`);
  for (const n of ['Pollito', 'Cabra', 'Burro', 'Pavo', 'Tractor']) if (!items.includes(n)) fallas.push(`${size}: falta ${n}`);
  const rotas = await page.$$eval('.dj-item img', (is) => is.filter((i) => i.complete && !i.naturalWidth).length);
  if (rotas) fallas.push(`${size}: ${rotas} miniaturas sin cargar`);
  console.log('  ', await shot(page, `granja/${size}-catalogo-11`));
  // Bajar hasta el final de la grilla para ver los nuevos.
  await page.evaluate(() => { const g = document.querySelector('.dj-item:last-child'); if (g) g.scrollIntoView({ block: 'end' }); });
  await settle(page, 600);
  console.log('  ', await shot(page, `granja/${size}-catalogo-11-fin`));

  // Colorear dos de los nuevos.
  for (const id of ['pavo', 'tractor']) {
    await page.goto(appUrl('colorear/' + id));
    await page.waitForSelector('.screen--colorear.cl-ready', { timeout: 20000 });
    await settle(page, 600);
    const r = await page.evaluate(() => {
      const cs = [...document.querySelectorAll('.screen--colorear .cl-stage canvas')]
        .map((c) => c.getBoundingClientRect()).filter((b) => b.width > 0);
      cs.sort((a, b) => b.width * b.height - a.width * a.height);
      return cs[0] ? { x: cs[0].x, y: cs[0].y, w: cs[0].width, h: cs[0].height } : null;
    });
    if (!r) { fallas.push(`${size}/${id}: no encontré el lienzo`); continue; }
    const sws = await page.$$('.cl-colors .cl-sw');
    let pintados = 0;
    for (const [i, [X, Y]] of TOQUES[id].entries()) {
      // Elegir un color distinto de la paleta (saltando el blanco) y tocar la zona.
      const sw = sws[(i * 3 + 1) % sws.length];
      const b = await sw.boundingBox();
      await tap(page, b.x + b.width / 2, b.y + b.height / 2, { pointer });
      await settle(page, 120);
      const px = r.x + (r.w * X) / 1000, py = r.y + (r.h * Y) / 1000;
      await tap(page, px, py, { pointer });
      await settle(page, 250);
      // ¿Quedó pintado ese punto? Se mira el color de la pantalla en ese punto (no tiene que ser blanco).
      const buf = await page.screenshot({ clip: { x: px - 1, y: py - 1, width: 3, height: 3 } });
      const blanco = await page.evaluate(async (b64) => {
        const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        const x = c.getContext('2d'); x.drawImage(img, 0, 0);
        const d = x.getImageData(Math.floor(img.width / 2), Math.floor(img.height / 2), 1, 1).data;
        return d[0] > 245 && d[1] > 245 && d[2] > 245;
      }, buf.toString('base64'));
      if (blanco) fallas.push(`${size}/${id}: el toque ${i} en (${X}, ${Y}) no pintó`);
      else pintados++;
    }
    console.log(`${size}/${id}: ${pintados}/${TOQUES[id].length} zonas pintadas →`, await shot(page, `granja/${size}-colorear-${id}`));
  }

  for (const e of t.errors) {
    if (/ERR_FILE_NOT_FOUND.*icons\//.test(e)) continue;
    if (/granja/.test(e)) fallas.push(`${size}: error de granja: ${e}`);
    else ajenos.add(e.split('\n')[0]);
  }
  await t.close();
}
if (ajenos.size) console.log('Errores de OTROS archivos (no cuentan):\n  ' + [...ajenos].join('\n  '));
console.log(fallas.length ? 'FALLAS:\n  ' + fallas.join('\n  ') : 'OK: sin errores de granja; ' + NUEVOS.join(', ') + ' en el catálogo.');
