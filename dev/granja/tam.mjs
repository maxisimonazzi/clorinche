// Tamaño del SVG (bytes, espacios colapsados) de cada dibujo de granja.js, sin navegador.
// También sirve de chequeo de sintaxis rápido y avisa números no enteros en el SVG generado.
//   cd dev && node granja/tam.mjs [ids separados por coma]
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const code = fs.readFileSync(path.join(ROOT, 'app', 'js', 'drawings', 'granja.js'), 'utf8');
const lista = [];
const CL = { drawings: { add: (cat, id, nombre, inner) => lista.push({ cat, id, nombre, inner }) } };
vm.runInNewContext(code, { window: { CL }, Math, console });
const solo = process.argv[2] ? process.argv[2].split(',') : null;
for (const d of lista) {
  if (solo && !solo.includes(d.id)) continue;
  const svg = d.inner.replace(/\s+/g, ' ').trim();
  const decimales = svg.match(/\d\.\d/g);
  console.log(`${d.id.padEnd(10)} ${String(svg.length).padStart(5)} bytes` + (decimales ? `  ⚠ ${decimales.length} números con decimales` : ''));
}
