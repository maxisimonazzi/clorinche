// Colorines — ícono rasterizado a 32 y 48 px y ampliado (pixelado) para juzgar la legibilidad en chico.
// Uso: cd dev && node pwa/icon-small.mjs  → dev/shots/pwa/icon-small.png
import fs from 'node:fs';
import path from 'node:path';
import { launch, shot, APP } from '../lib.mjs';

const svg = fs.readFileSync(path.join(APP, 'icons', 'icon.svg'), 'utf8');
const uri = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
const t = await launch({ size: { width: 900, height: 360, dpr: 1 } });
await t.page.setContent(`<body style="margin:0;background:#fff;display:flex;gap:30px;padding:20px;align-items:center">
  <canvas id="a" width="16" height="16"></canvas><canvas id="b" width="32" height="32"></canvas><canvas id="c" width="48" height="48"></canvas>
  <style>canvas{image-rendering:pixelated}#a{width:128px;height:128px}#b{width:256px;height:256px}#c{width:288px;height:288px}</style></body>`);
await t.page.evaluate(async (src) => {
  const img = new Image(); img.src = src; await img.decode();
  for (const id of ['a', 'b', 'c']) {
    const c = document.getElementById(id); const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, c.width, c.height);
  }
}, uri);
console.log(await shot(t.page, 'pwa/icon-small'), t.errors);
await t.close();
