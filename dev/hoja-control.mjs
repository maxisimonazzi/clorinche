// Hoja de control de TODOS los dibujos, coloreados al azar con el motor real de la app (CL.regions).
//   node hoja-control.mjs            -> shots/hoja-control/todos.png + una hoja por categoría (<cat>.png)
//   node hoja-control.mjs --ejemplo  -> incluye el pollito de ejemplo (dev/drawings/ejemplo-pollito.js)
//   node hoja-control.mjs granja     -> sólo esa categoría
// El fondo va siempre en celeste pálido: si una parte de un dibujo sale celeste pálido, esa zona se escapa.
// Imprime por dibujo: zonas pintables, brillitos bloqueados, % de fondo y tiempo de cálculo; marca avisos.
import path from 'node:path';
import { launch, fileUrl, saveDataUrl, SHOTS, DEV } from './lib.mjs';

const args = process.argv.slice(2);
const only = args.find((a) => !a.startsWith('--'));
const t = await launch({ size: { width: 1200, height: 800, dpr: 1 } });
await t.page.goto(fileUrl(path.join(DEV, 'hoja-control.html')) + (args.includes('--ejemplo') ? '#ejemplo' : ''));
await t.page.waitForFunction(() => window.ready);
t.page.setDefaultTimeout(0);

const cats = only ? [only] : await t.page.evaluate(() => window.categories());
const all = [];
if (!only) {
  const r = await t.page.evaluate(() => window.makeSheet({ cols: 8, cell: 300 }));
  const f = saveDataUrl(r.png, path.join(SHOTS, 'hoja-control', 'todos.png'));
  all.push(...r.stats);
  console.log('->', f);
}
for (const cat of cats) {
  const r = await t.page.evaluate((c) => window.makeSheet({ cat: c, cols: 4, cell: 420, seed: 3 }), cat);
  const f = saveDataUrl(r.png, path.join(SHOTS, 'hoja-control', cat + '.png'));
  if (only) all.push(...r.stats);
  console.log('->', f);
}
for (const s of all) console.log((s.warn ? '⚠ ' : '  ') + JSON.stringify(s));
console.log(`${all.length} dibujos, ${all.filter((s) => s.warn || s.error).length} con avisos.`);
if (t.errors.length) console.log('ERRORES:\n' + t.errors.join('\n'));
await t.close();
