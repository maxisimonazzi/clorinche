// Herramienta de desarrollo (fantasía): renderiza un SVG suelto (contenido interno) a PNG para iterar piezas.
//   node fantasia/pieza.mjs archivo.svgfrag salida.png
import fs from 'node:fs';
import path from 'node:path';
import { launch, SHOTS } from '../lib.mjs';
const [src, out] = process.argv.slice(2);
const inner = fs.readFileSync(src, 'utf8');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="700" height="700"><rect width="1000" height="1000" fill="#fff"/><g fill="#fff" stroke="#000" stroke-width="16" stroke-linecap="round" stroke-linejoin="round">${inner}</g></svg>`;
const t = await launch({ size: { width: 700, height: 700, dpr: 1 } });
await t.page.setContent(`<body style="margin:0">${svg}</body>`);
const file = path.join(SHOTS, 'fantasia', out);
fs.mkdirSync(path.dirname(file), { recursive: true });
await t.page.screenshot({ path: file });
await t.close();
console.log(file);
