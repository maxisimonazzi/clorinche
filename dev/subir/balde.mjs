// El grave del modo foto: con los valores POR DEFECTO, ¿el balde queda dentro de cada zona?
// Para cada foto: se carga por la interfaz, se guarda, se abre colorear/u-<id>, se calculan las zonas con el
// motor real (CL.regions.compute sobre la capa de líneas guardada) y se pinta con el balde en un punto.
//   node subir/balde.mjs [desktop|tablet|phone] [archivo...]
import { launch, appUrl, shot, tap } from '../lib.mjs';
import { load, dbg, clearUploads } from '../review-subir/r2-common.mjs';

const size = ['desktop', 'tablet', 'phone', 'tabletV', 'phoneH'].includes(process.argv[2]) ? process.argv[2] : 'desktop';
const args = process.argv.slice(2).filter((a) => a !== size);
// [archivo, punto a pintar (fracción del ancho/alto), caja donde tiene que quedar la zona (fracciones) o null]
const CASES = [
  ['foto-color.jpg', [0.483, 0.467], [0.34, 0.35, 0.62, 0.65]], // cara (círculo 430–730 × 270–570 de 1200×900)
  ['foto-color.jpg', [0.21, 0.6], [0.09, 0.47, 0.33, 0.72]],    // pared de la casa
  ['foto-color.jpg', [0.48, 0.8], [0.38, 0.62, 0.59, 0.92]],     // remera
  ['rv:mascota.jpg', [0.5, 0.72], [0.23, 0.52, 0.8, 1]],         // cuerpo del gato
  ['sint-frutas.jpg', [0.26, 0.6], [0.13, 0.4, 0.42, 0.77]],     // manzana (círculo 230–610 × 530–910 de 1600×1200; el hueco con la naranja se suma)
  ['sint-auto.jpg', [0.25, 0.73], [0.2, 0.44, 0.8, 0.81]],       // carrocería
  ['sint-pastel.jpg', [0.5, 0.85], [0.1, 0.68, 0.9, 1], 'photo'], // remera celeste pastel (parece página: se elige foto)
  ['sint-borrosa.jpg', [0.3, 0.37], [0.22, 0.17, 0.45, 0.55]],   // oreja (foto borrosa)
  ['real-flor.jpg', [0.5, 0.5], null],
  ['real-paisaje.jpg', [0.6, 0.75], null],
];
const cases = args.length ? CASES.filter((c) => args.includes(c[0])) : CASES;
const t = await launch({ size });
const { page } = t;
await page.goto(appUrl('subir'));
await page.waitForTimeout(800);
await clearUploads(page);
const rows = [];
let k = 0;
for (const [file, [fx, fy], box, force] of cases) {
  k++;
  if (!(await page.evaluate(() => CL.router.current && CL.router.current.name === 'subir'))) {
    await page.evaluate(() => CL.router.go('subir'));
    await page.waitForTimeout(600);
  }
  await load(page, file);
  if (force && (await dbg(page)).mode !== force) {
    await page.click(force === 'photo' ? '.up-mode >> nth=1' : '.up-mode >> nth=0');
    await page.waitForFunction((m) => { const d = CL.upload.debug(); return d.mode === m && !d.busy; }, force);
    await page.waitForTimeout(300);
  }
  const d = await dbg(page);
  await page.click('.up-save');
  await page.waitForFunction(() => /^#colorear\/u-/.test(location.hash), null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  const id = await page.evaluate(() => location.hash.replace('#colorear/u-', ''));
  // Zonas con el motor real, sobre la imagen guardada.
  const z = await page.evaluate(async ({ id, fx, fy }) => {
    const up = await CL.db.uploads.get(id);
    const img = await createImageBitmap(up.blob);
    const map = CL.regions.compute(CL.regions.lineLayer(img, img.width, img.height));
    const N = map.w * map.h;
    const at = map.at(Math.round(fx * map.w), Math.round(fy * map.h));
    const b = map.bbox[at];
    let big = 0, fillable = 0, largest = 0;
    for (let i = 0; i < map.count; i++) {
      if (map.locked[i]) continue;
      fillable++;
      if (map.area[i] / N >= 0.01) big++;
      largest = Math.max(largest, map.area[i] / N);
    }
    return { zones: fillable, big, largest: +(100 * largest).toFixed(1), hitPct: +((100 * map.area[at]) / N).toFixed(2),
      hitBox: [b.x0 / map.w, b.y0 / map.h, (b.x1 + 1) / map.w, (b.y1 + 1) / map.h].map((v) => +v.toFixed(3)) };
  }, { id, fx, fy });
  const inside = box ? z.hitBox[0] >= box[0] && z.hitBox[1] >= box[1] && z.hitBox[2] <= box[2] && z.hitBox[3] <= box[3] : null;
  // Balde en captura.
  const bb = await (await page.$('.cl-board canvas')).boundingBox();
  const x = bb.x + bb.width * fx, y = bb.y + bb.height * fy;
  if (t.size.touch) await tap(page, x, y); else await page.mouse.click(x, y);
  await page.waitForTimeout(1100);
  const name = file.replace(/^rv:/, '').replace(/\.\w+$/, '');
  await shot(page, `subir/balde/${size}-${k}-${name}`);
  rows.push({ file, mode: d.mode + (force ? '*' : ''), level: d.level, ...z, hitBox: z.hitBox.join(' '), inside });
  await page.evaluate(() => CL.router.go('subir'));
  await page.waitForTimeout(700);
}
console.table(rows);
console.log('errors', t.errors);
await t.close();
