// Reemplaza el contenido (el SVG interior) de un dibujo de mascotas.js con el de un archivo borrador.
//   cd dev && node mascotas/poner.mjs <id> <archivo-borrador>
// El borrador es el texto que va entre las comillas invertidas de add('<id>', '<Nombre>', `...`);
// (puede usar ${ojo(...)} y ${cachete(...)}). El dibujo tiene que existir ya en el archivo.
import fs from 'node:fs';
import path from 'node:path';
import { APP } from '../lib.mjs';

const [id, file] = process.argv.slice(2);
const js = path.join(APP, 'js', 'drawings', 'mascotas.js');
let s = fs.readFileSync(js, 'utf8');
const start = s.indexOf(`  add('${id}', `);
if (start < 0) throw new Error('No encuentro el dibujo ' + id);
const open = s.indexOf('`', start) + 1;
const close = s.indexOf('`);', open);
let inner = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').replace(/^\n+|\s+$/g, '');
s = s.slice(0, open) + '\n' + inner + '\n' + s.slice(close);
fs.writeFileSync(js, s);
console.log(`${id}: ${inner.length} caracteres`);
