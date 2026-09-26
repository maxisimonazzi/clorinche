// Reescribe las escamas del pez en app/js/drawings/mascotas.js con escamas-c.mjs (la línea que empieza en "M548 262").
// Uso: cd dev && node mascotas/pez-escamas.mjs '<json de columnas>'
import fs from 'node:fs';
import { columna } from './escamas-c.mjs';
const d = JSON.parse(process.argv[2]).map(columna).join('');
const f = new URL('../../app/js/drawings/mascotas.js', import.meta.url);
const s = fs.readFileSync(f, 'utf8');
const re = /<path d="M548 262[^"]*" fill="none" stroke-width="12"\/>/;
if (!re.test(s)) throw new Error('no encontré las escamas del pez');
fs.writeFileSync(f, s.replace(re, `<path d="${d}" fill="none" stroke-width="12"/>`));
console.log(d);
