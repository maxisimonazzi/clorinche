// Colorines — genera los PNG del ícono a partir de app/icons/icon.svg (rasteriza Edge headless).
// Uso: cd dev && node pwa/build-icons.mjs
//   app/icons/icon-192.png          (any, esquinas redondeadas transparentes)
//   app/icons/icon-512.png          (any)
//   app/icons/icon-maskable-512.png (fondo a sangre, motivo dentro de la zona segura del 80 %)
//   app/icons/apple-touch-icon.png  (180×180, sin transparencia)
// y, desde app/icons/icon-small.svg (versión simplificada para tamaños chicos: gotita grande, sin arcoíris):
//   app/icons/icon-16.png, icon-32.png, icon-48.png  (pestaña del navegador, íconos chicos de Windows)
import fs from 'node:fs';
import path from 'node:path';
import { launch, APP } from '../lib.mjs';
import { variants } from './icon-variants.mjs';

const DIR = path.join(APP, 'icons');
const v = variants(fs.readFileSync(path.join(DIR, 'icon.svg'), 'utf8'));
const small = fs.readFileSync(path.join(DIR, 'icon-small.svg'), 'utf8');
const uri = (s) => 'data:image/svg+xml;base64,' + Buffer.from(s).toString('base64');

const jobs = [
  { file: 'icon-192.png', svg: v.any, size: 192 },
  { file: 'icon-512.png', svg: v.any, size: 512 },
  { file: 'icon-maskable-512.png', svg: v.maskable, size: 512, opaque: true },
  { file: 'apple-touch-icon.png', svg: v.apple, size: 180, opaque: true },
  { file: 'icon-16.png', svg: small, size: 16 },
  { file: 'icon-32.png', svg: small, size: 32 },
  { file: 'icon-48.png', svg: small, size: 48 },
];

const t = await launch({ size: { width: 600, height: 600, dpr: 1 } });
await t.page.setContent('<body></body>');
for (const j of jobs) {
  const data = await t.page.evaluate(async ({ src, size, opaque }) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    if (opaque) { g.fillStyle = '#ffb938'; g.fillRect(0, 0, size, size); }
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, 0, 0, size, size);
    return c.toDataURL('image/png');
  }, { src: uri(j.svg), size: j.size, opaque: !!j.opaque });
  const out = path.join(DIR, j.file);
  fs.writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
  console.log(j.file, j.size + 'px', fs.statSync(out).size, 'bytes');
}
if (t.errors.length) console.log('errores:', t.errors);
await t.close();
