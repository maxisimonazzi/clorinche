// Vista previa de dibujos para colorear.
//   node dev/drawings/preview.mjs <categoria>          -> dev/shots/drawings/<categoria>.png (coloreado al azar)
//   node dev/drawings/preview.mjs <categoria> --plain  -> sólo líneas
//   node dev/drawings/preview.mjs --id vaca            -> dev/shots/drawings/single/vaca.png (líneas + coloreado, grande)
//   node dev/drawings/preview.mjs --all                -> hoja con todos los dibujos
// Imprime estadísticas por dibujo: zonas pintables, zonas diminutas, fracción de fondo.
import path from 'node:path';
import { launch, fileUrl, saveDataUrl, SHOTS, DEV } from '../lib.mjs';

const args = process.argv.slice(2);
const plain = args.includes('--plain');
const idIdx = args.indexOf('--id');
const all = args.includes('--all');
const cat = args.find((a) => !a.startsWith('--') && (idIdx < 0 || a !== args[idIdx + 1]));

const t = await launch({ size: { width: 800, height: 600, dpr: 1 } });
await t.page.goto(fileUrl(path.join(DEV, 'drawings', 'preview.html')) + (args.includes('--ejemplo') ? '#ejemplo' : ''));
await t.page.waitForFunction(() => window.ready);

if (idIdx >= 0) {
  const ids = args[idIdx + 1].split(',');
  for (const id of ids) {
    const r = await t.page.evaluate((id) => window.makeSingle(id), id);
    const f = saveDataUrl(r.png, path.join(SHOTS, 'drawings', 'single', id + '.png'));
    console.log(JSON.stringify(r.stats), '->', f);
  }
} else {
  const r = await t.page.evaluate(
    (o) => window.makeSheet(o),
    { cat: all ? null : cat, plain, cols: all ? 8 : 4, cell: all ? 300 : 420 }
  );
  const name = (all ? 'todos' : cat || 'todos') + (plain ? '-lineas' : '');
  const f = saveDataUrl(r.png, path.join(SHOTS, 'drawings', name + '.png'));
  for (const s of r.stats) console.log(JSON.stringify(s));
  console.log('->', f);
}
if (t.errors.length) console.log('ERRORES:\n' + t.errors.join('\n'));
await t.close();
