// Hoja de control del procesamiento: cada imagen de prueba con distintos modos y niveles,
// procesada en tamaño completo (lo que se guarda). Genera dev/shots/subir/proc-<imagen>.png
//   node subir/proc.mjs [imagen.jpg ...]
import fs from 'node:fs';
import path from 'node:path';
import { launch, appUrl, saveDataUrl, SHOTS, DEV } from '../lib.mjs';

const files = process.argv.slice(2).length ? process.argv.slice(2) : ['pagina-sombra.jpg', 'foto-color.jpg', 'enorme.jpg'];
const t = await launch({ size: 'desktop' });
const { page } = t;
await page.goto(appUrl('subir'));
await page.waitForTimeout(400);

for (const f of files) {
  const b64 = fs.readFileSync(path.join(DEV, 'subir', 'img', f)).toString('base64');
  const res = await page.evaluate(async ({ b64, type }) => {
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const src = await CL.upload.decode(new Blob([bin], { type }));
    const combos = [
      ['page', 20, true], ['page', 55, true], ['page', 75, true], ['page', 90, true], ['page', 55, false],
      ['photo', 30, true], ['photo', 60, true], ['photo', 85, true],
    ];
    const cellW = 480, cellH = Math.round((cellW * src.height) / src.width);
    const sheet = document.createElement('canvas');
    sheet.width = cellW * 4 + 50; sheet.height = (cellH + 30) * 3 + 10;
    const ctx = sheet.getContext('2d');
    ctx.fillStyle = '#88c'; ctx.fillRect(0, 0, sheet.width, sheet.height);
    ctx.font = '18px sans-serif';
    ctx.drawImage(src, 10, 30, cellW, cellH);
    ctx.fillStyle = '#000'; ctx.fillText('original ' + src.width + 'x' + src.height, 10, 22);
    const times = [];
    combos.forEach(([mode, level, thick], i) => {
      const t0 = performance.now();
      const out = CL.upload.process(src, { mode, level, thick });
      times.push(Math.round(performance.now() - t0));
      const col = (i + 1) % 4, row = Math.floor((i + 1) / 4);
      const x = 10 + col * (cellW + 10), y = 30 + row * (cellH + 30);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(out, x, y, cellW, cellH);
      ctx.fillStyle = '#000';
      ctx.fillText(`${mode} ${level} ${thick ? 'grueso' : 'fino'} (${times[i]} ms)`, x, y - 8);
    });
    return { url: sheet.toDataURL('image/png'), times, w: src.width, h: src.height };
  }, { b64, type: f.endsWith('.png') ? 'image/png' : 'image/jpeg' });
  saveDataUrl(res.url, path.join(SHOTS, 'subir', 'proc-' + f.replace(/\.\w+$/, '') + '.png'));
  console.log(f, res.w + 'x' + res.h, 'ms:', res.times.join(' '));
}
console.log('errors', t.errors);
await t.close();
