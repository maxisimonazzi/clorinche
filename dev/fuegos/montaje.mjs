// Arma una hoja con varias capturas (para revisarlas de un vistazo).
// Uso: node fuegos/montaje.mjs <salida> <columnas> <ancho-celda> <captura1> <captura2> ...
// (las capturas son nombres dentro de dev/shots/fuegos, sin .png)
import { launch, shot, SHOTS } from '../lib.mjs';
import fs from 'node:fs';
import path from 'node:path';

const [outName, colsArg, cellArg, ...names] = process.argv.slice(2);
const cols = +colsArg || 3;
const cell = +cellArg || 440;
const t = await launch({ size: { width: cols * (cell + 8) + 8, height: 400, dpr: 1 } });
const imgs = names.map((n) => ({ n, src: 'data:image/png;base64,' + fs.readFileSync(path.join(SHOTS, 'fuegos', n + '.png')).toString('base64') }));
await t.page.setContent(`<body style="margin:0;background:#222;font:14px sans-serif;color:#fff">
  <div style="display:grid;grid-template-columns:repeat(${cols},${cell}px);gap:8px;padding:8px">
  ${imgs.map((i) => `<figure style="margin:0"><img src="${i.src}" style="width:${cell}px;display:block"><figcaption>${i.n}</figcaption></figure>`).join('')}
  </div></body>`);
await t.page.waitForFunction(() => [...document.images].every((i) => i.complete));
await shot(t.page, 'fuegos/' + outName, { fullPage: true });
await t.close();
