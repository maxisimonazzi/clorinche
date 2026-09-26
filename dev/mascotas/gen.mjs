// Escribe en app/js/drawings/mascotas.js las escamas y la agalla del pez con los parámetros elegidos
// (encontrados con pez-busca.mjs). Uso: cd dev && node mascotas/gen.mjs [--write]
import fs from 'node:fs';
import { escamas } from './escamas.mjs';

export const PARAMS = { b: 74, s: 76, h: 150, x0: 486, y0: 500, min: 70 };
const e = escamas(PARAMS);
console.log('agalla:', e.gill);
console.log('escamas:', e.d);
if (process.argv.includes('--write')) {
  const f = new URL('../../app/js/drawings/mascotas.js', import.meta.url);
  let s = fs.readFileSync(f, 'utf8');
  // agalla: la primera curva abierta después de la elipse del cuerpo; escamas: la línea siguiente
  const re = /(<ellipse cx="470" cy="500" rx="330" ry="245"\/>\n\s*<path d=")[^"]*(" fill="none"\/>\n\s*<path d=")[^"]*(" fill="none" stroke-width="12"\/>)/;
  if (!re.test(s)) throw new Error('no encontré la agalla/escamas del pez en mascotas.js');
  s = s.replace(re, (m, a, b, c) => a + e.gill + b + e.d + c);
  fs.writeFileSync(f, s);
  console.log('escamas escritas');
}
