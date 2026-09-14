// Fotos sintéticas nuevas para el modo foto (zonas de color), en dev/subir/img/sint-*.jpg.
//   node subir/gen-fotos.mjs
// - sint-frutas.jpg : frutas con sombreado (degradés radiales), mesa de madera, pared con luz, ruido fuerte
// - sint-auto.jpg   : auto rojo, ruedas, cielo en degradé, ruta gris, pasto, un poco desenfocada
// - sint-pastel.jpg : bajo contraste: cara rosada sobre pared durazno, pelo marrón claro, remera celeste pastel
// - sint-borrosa.jpg: perro con bordes muy suaves (foto movida/desenfocada) y viñeteado
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { DEV } from '../lib.mjs';

const OUT = path.join(DEV, 'subir', 'img');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage();
await page.setContent('<body></body>');
const imgs = await page.evaluate(() => {
  function rng(seed) { let s = seed; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  function noise(ctx, w, h, amt, seed) {
    const r = rng(seed), im = ctx.getImageData(0, 0, w, h), d = im.data;
    for (let i = 0; i < d.length; i += 4) { const v = (r() - 0.5) * amt; d[i] += v; d[i + 1] += v * 0.9 + (r() - 0.5) * amt * 0.3; d[i + 2] += v; }
    ctx.putImageData(im, 0, 0);
  }
  function blur(c, px) {
    const o = document.createElement('canvas'); o.width = c.width; o.height = c.height;
    const x = o.getContext("2d"); x.drawImage(c, 0, 0); x.filter = `blur(${px}px)`; x.drawImage(c, 0, 0); return o; // base nítida: sin borde oscuro
  }
  const out = {};
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
  const radial = (ctx, x, y, r, c1, c2) => { const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r * 1.1); g.addColorStop(0, c1); g.addColorStop(1, c2); return g; };

  // Frutas
  {
    const [c, ctx] = mk(1600, 1200);
    let g = ctx.createLinearGradient(0, 0, 1600, 0); g.addColorStop(0, '#d9cbb3'); g.addColorStop(1, '#f3ead8');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1600, 760);
    g = ctx.createLinearGradient(0, 760, 0, 1200); g.addColorStop(0, '#a8703f'); g.addColorStop(1, '#6e4524');
    ctx.fillStyle = g; ctx.fillRect(0, 760, 1600, 440);
    ctx.strokeStyle = 'rgba(60,35,15,0.25)'; ctx.lineWidth = 3;
    for (let y = 800; y < 1200; y += 55) { ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(500, y + 12, 1000, y - 12, 1600, y + 6); ctx.stroke(); }
    ctx.fillStyle = 'rgba(40,25,10,0.28)';
    for (const [x, r] of [[420, 190], [800, 170], [1180, 200]]) { ctx.beginPath(); ctx.ellipse(x + 40, 900, r * 1.05, 45, 0, 0, 7); ctx.fill(); }
    ctx.fillStyle = radial(ctx, 420, 720, 190, '#ff6b5e', '#a8161b'); ctx.beginPath(); ctx.arc(420, 720, 190, 0, 7); ctx.fill();
    ctx.fillStyle = radial(ctx, 800, 740, 170, '#ffc34d', '#d06a00'); ctx.beginPath(); ctx.arc(800, 740, 170, 0, 7); ctx.fill();
    ctx.fillStyle = radial(ctx, 1180, 710, 200, '#c8f06a', '#4f8f1c'); ctx.beginPath(); ctx.ellipse(1180, 710, 170, 200, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#5a3b1c'; ctx.lineWidth = 14; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(420, 540); ctx.quadraticCurveTo(430, 490, 460, 470); ctx.stroke();
    ctx.fillStyle = '#3f9b2f'; ctx.beginPath(); ctx.ellipse(500, 500, 60, 24, -0.4, 0, 7); ctx.fill();
    noise(ctx, 1600, 1200, 34, 3);
    out['sint-frutas.jpg'] = blur(c, 1.2).toDataURL('image/jpeg', 0.88);
  }
  // Auto
  {
    const [c, ctx] = mk(1800, 1100);
    let g = ctx.createLinearGradient(0, 0, 0, 640); g.addColorStop(0, '#3d8ee8'); g.addColorStop(1, '#cfe6f7');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1800, 640);
    ctx.fillStyle = '#5fae4a'; ctx.fillRect(0, 600, 1800, 140);
    g = ctx.createLinearGradient(0, 740, 0, 1100); g.addColorStop(0, '#77777c'); g.addColorStop(1, '#4b4b50');
    ctx.fillStyle = g; ctx.fillRect(0, 740, 1800, 360);
    ctx.fillStyle = '#f2f2f2'; for (let x = 60; x < 1800; x += 260) ctx.fillRect(x, 960, 150, 22);
    g = ctx.createLinearGradient(0, 520, 0, 860); g.addColorStop(0, '#f0443c'); g.addColorStop(1, '#a3161a');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(420, 860); ctx.lineTo(420, 700); ctx.quadraticCurveTo(440, 660, 560, 650); ctx.lineTo(700, 520);
    ctx.lineTo(1080, 520); ctx.lineTo(1240, 650); ctx.quadraticCurveTo(1380, 660, 1400, 720); ctx.lineTo(1400, 860); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#a9d8f2';
    ctx.beginPath(); ctx.moveTo(730, 545); ctx.lineTo(880, 545); ctx.lineTo(880, 645); ctx.lineTo(620, 645); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(910, 545); ctx.lineTo(1060, 545); ctx.lineTo(1190, 645); ctx.lineTo(910, 645); ctx.closePath(); ctx.fill();
    for (const x of [620, 1200]) {
      ctx.fillStyle = '#1d1d22'; ctx.beginPath(); ctx.arc(x, 860, 105, 0, 7); ctx.fill();
      ctx.fillStyle = radial(ctx, x, 860, 50, '#e8e8ee', '#8d8d99'); ctx.beginPath(); ctx.arc(x, 860, 50, 0, 7); ctx.fill();
    }
    ctx.fillStyle = '#ffe36b'; ctx.beginPath(); ctx.ellipse(1375, 735, 22, 30, 0, 0, 7); ctx.fill();
    noise(ctx, 1800, 1100, 22, 9);
    out['sint-auto.jpg'] = blur(c, 2).toDataURL('image/jpeg', 0.85);
  }
  // Pastel (bajo contraste)
  {
    const [c, ctx] = mk(1200, 1500);
    let g = ctx.createLinearGradient(0, 0, 1200, 1500); g.addColorStop(0, '#f6dcc6'); g.addColorStop(1, '#e9c6aa');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1200, 1500);
    ctx.fillStyle = '#b9dcef';
    ctx.beginPath(); ctx.moveTo(180, 1500); ctx.quadraticCurveTo(220, 1060, 600, 1040); ctx.quadraticCurveTo(980, 1060, 1020, 1500); ctx.fill();
    ctx.fillStyle = radial(ctx, 600, 680, 300, '#fbd3c0', '#eab39c'); ctx.beginPath(); ctx.ellipse(600, 680, 280, 330, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#b98a62';
    ctx.beginPath(); ctx.moveTo(320, 620); ctx.quadraticCurveTo(330, 330, 600, 320); ctx.quadraticCurveTo(870, 330, 880, 620);
    ctx.quadraticCurveTo(760, 470, 600, 450); ctx.quadraticCurveTo(440, 470, 320, 620); ctx.fill();
    ctx.fillStyle = '#5b4636'; ctx.beginPath(); ctx.arc(500, 700, 26, 0, 7); ctx.arc(700, 700, 26, 0, 7); ctx.fill();
    ctx.fillStyle = '#f29a9a'; ctx.beginPath(); ctx.ellipse(430, 800, 50, 30, 0, 0, 7); ctx.ellipse(770, 800, 50, 30, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#c0605e'; ctx.lineWidth = 16; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(600, 820, 90, 0.3, Math.PI - 0.3); ctx.stroke();
    noise(ctx, 1200, 1500, 20, 5);
    out['sint-pastel.jpg'] = blur(c, 1).toDataURL('image/jpeg', 0.9);
  }
  // Borrosa
  {
    const [c, ctx] = mk(1500, 1125);
    let g = ctx.createLinearGradient(0, 0, 0, 1125); g.addColorStop(0, '#9fc3a0'); g.addColorStop(1, '#6f9b6f');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1500, 1125);
    ctx.fillStyle = '#d7b184'; ctx.beginPath(); ctx.ellipse(760, 800, 360, 260, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#e3c197'; ctx.beginPath(); ctx.ellipse(740, 430, 250, 220, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#8a5a34';
    ctx.beginPath(); ctx.ellipse(520, 420, 80, 170, 0.35, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(960, 420, 80, 170, -0.35, 0, 7); ctx.fill();
    ctx.fillStyle = '#2a211b'; ctx.beginPath(); ctx.arc(660, 420, 26, 0, 7); ctx.arc(820, 420, 26, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(740, 520, 46, 32, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#e05050'; ctx.beginPath(); ctx.ellipse(740, 600, 36, 44, 0, 0, Math.PI); ctx.fill();
    g = ctx.createRadialGradient(750, 560, 300, 750, 560, 950); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1500, 1125);
    noise(ctx, 1500, 1125, 26, 11);
    out['sint-borrosa.jpg'] = blur(c, 6).toDataURL('image/jpeg', 0.85);
  }
  return out;
});
for (const [name, url] of Object.entries(imgs)) {
  fs.writeFileSync(path.join(OUT, name), Buffer.from(url.split(',')[1], 'base64'));
  console.log('ok', name);
}
await browser.close();
