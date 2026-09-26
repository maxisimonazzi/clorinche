// Imprime el SVG interno de dibujos de vehiculos.js (sin navegador) y su tamaño en bytes.
//   node vehiculos/svg.mjs globo-aerostatico        -> SVG completo
//   node vehiculos/svg.mjs --tam                    -> tamaño de cada dibujo
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { APP } from '../lib.mjs';

const dibujos = {};
const window = { CL: { drawings: { add: (cat, id, nombre, svg) => { dibujos[id] = svg; } } } };
vm.runInNewContext(fs.readFileSync(path.join(APP, 'js', 'drawings', 'vehiculos.js'), 'utf8'), { window });
const arg = process.argv[2];
if (arg === '--tam' || !arg) {
  for (const [id, s] of Object.entries(dibujos)) console.log(id.padEnd(20), Buffer.byteLength(s.replace(/\s+/g, ' ').trim()), 'bytes');
} else {
  console.log(dibujos[arg]);
  const malos = dibujos[arg].match(/NaN|undefined|Infinity|\d\.\d{3,}/g);
  if (malos) console.log('SOSPECHOSOS:', [...new Set(malos)].join(' '));
}
