// Modo foto por zonas de color: para cada imagen, procesa con el modo foto (nivel por defecto u otro)
// y cuenta las zonas con el motor real de colorear (CL.regions.compute). Guarda una lámina
// original | líneas | zonas pintadas al azar en dev/shots/subir/zonas/<nombre>-<nivel>.png.
//   node subir/zonas.mjs [nivel] [archivo...]
import { launch, appUrl, saveDataUrl, SHOTS } from '../lib.mjs';
import { IMG } from '../review-subir/r2-common.mjs';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const level = args.length && /^\d+$/.test(args[0]) ? +args.shift() : null;
const files = args.length ? args : ['foto-color.jpg', 'rv:mascota.jpg', 'real-flor.jpg', 'real-paisaje.jpg', 'sint-frutas.jpg', 'sint-auto.jpg', 'sint-pastel.jpg', 'sint-borrosa.jpg'];
const t = await launch({ size: 'desktop' });
const { page } = t;
await page.goto(appUrl('inicio'));
await page.waitForFunction(() => window.CL && CL.upload && CL.regions);
const rows = [];
for (const f of files) {
  const p = fs.existsSync(IMG(f)) ? IMG(f) : path.join(SHOTS, '..', 'subir', 'img-sint', f);
  const b64 = fs.readFileSync(p).toString('base64');
  const r = await page.evaluate(async ({ b64, level, name }) => {
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const blob = new Blob([bin], { type: /png$/.test(name) ? 'image/png' : 'image/jpeg' });
    const src = await CL.upload.decode(blob);
    const lv = level == null ? CL.upload.DEFAULT_LEVEL : level;
    const P = CL.upload._p;
    const small = P.fitCanvas(src, src.width, src.height, 800);
    const px = P.readPixels(small);
    const t0 = performance.now();
    const sc = P.preparePhoto(px, small.width, small.height);
    const tPrep = performance.now() - t0;
    const t1 = performance.now();
    const bw = CL.upload.process(src, { mode: 'photo', level: lv, thick: true });
    const tProc = performance.now() - t1;
    const map = CL.regions.compute(bw);
    const N = map.w * map.h;
    const zones = [];
    for (let i = 0; i < map.count; i++) if (!map.locked[i]) zones.push(map.area[i] / N);
    zones.sort((a, b) => b - a);
    // Lámina: original | líneas | zonas al azar.
    const W = 600, H = Math.round((W * src.height) / src.width);
    const c = document.createElement('canvas'); c.width = W * 3 + 20; c.height = H;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#888'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(src, 0, 0, W, H);
    ctx.drawImage(bw, W + 10, 0, W, H);
    const col = document.createElement('canvas'); col.width = map.w; col.height = map.h;
    const cx = col.getContext('2d');
    const im = cx.createImageData(map.w, map.h);
    const pal = new Uint32Array(map.count);
    let s = 7;
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < map.count; i++) pal[i] = 0xff000000 | ((80 + rnd() * 175) << 16) | ((80 + rnd() * 175) << 8) | (80 + rnd() * 175);
    const u = new Uint32Array(im.data.buffer);
    const lp = CL.upload._p.readPixels(bw);
    for (let i = 0; i < N; i++) {
      const l = map.label[i];
      u[i] = lp[i * 4] === 0 ? 0xff000000 : l < 0 || map.locked[l] ? 0xffffffff : pal[l];
    }
    cx.putImageData(im, 0, 0);
    ctx.drawImage(col, W * 2 + 20, 0, W, H);
    let black = 0;
    for (let i = 0; i < N; i++) if (lp[i * 4] === 0) black++;
    return {
      url: c.toDataURL('image/png'),
      stats: { level: lv, src: src.width + 'x' + src.height, prepMs: Math.round(tPrep), procMs: Math.round(tProc),
        zones: zones.length, locked: map.count - zones.length, big: zones.filter((a) => a > 0.01).length,
        top: zones.slice(0, 5).map((a) => +(a * 100).toFixed(1)).join(' '), blackPct: +((100 * black) / N).toFixed(1) },
    };
  }, { b64, level, name: f });
  const name = path.basename(f.replace(/^rv:/, '')).replace(/\.\w+$/, '');
  saveDataUrl(r.url, path.join(SHOTS, 'subir', 'zonas', `${name}-${r.stats.level}.png`));
  rows.push({ f, ...r.stats });
}
console.table(rows);
console.log('errors', t.errors);
await t.close();
