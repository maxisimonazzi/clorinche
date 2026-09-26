// Vista previa de una variante del pez (escamas + aleta) sin tocar mascotas.js.
// Uso: cd dev && node mascotas/pez-ver.mjs '{"b":74,"s":76,"h":150,"x0":486,"y0":500}' '{"a":10,"dx":40,"dy":0}' nombre
import path from 'node:path';
import { launch, fileUrl, DEV, SHOTS, saveDataUrl } from '../lib.mjs';
import { escamas } from './escamas.mjs';

const p = JSON.parse(process.argv[2] || '{}'), fin = JSON.parse(process.argv[3] || '{"a":0,"dx":0,"dy":0}');
const name = process.argv[4] || 'pez-variante';
const t = await launch({ size: { width: 800, height: 600, dpr: 1 } });
await t.page.goto(fileUrl(path.join(DEV, 'drawings', 'preview.html')));
await t.page.waitForFunction(() => window.ready);
const base = await t.page.evaluate(() => CL.drawings.get('pez').inner);
const finM = base.match(/<g id="aleta"[^>]*>([\s\S]*?)<\/g>/);
const e = escamas(p);
const inner = base
  .replace(/<path d="M370 267Q470 500 370 733" fill="none"\/>/, `<path d="${e.gill}" fill="none"/>`)
  .replace(/<path d="M397 261[^"]*"/, `<path d="${e.d}"`)
  .replace(finM[0], `<g transform="translate(${fin.dx} ${fin.dy}) rotate(${fin.a} 470 590)">${finM[1]}</g>`);
const r = await t.page.evaluate(async (inner) => { CL.drawings.add('mascotas', 'tmp', 'tmp', inner); return window.makeSingle('tmp'); }, inner);
console.log(JSON.stringify(r.stats), saveDataUrl(r.png, path.join(SHOTS, 'drawings', 'single', name + '.png')));
if (process.argv.includes('--print')) console.log(inner);
await t.close();
