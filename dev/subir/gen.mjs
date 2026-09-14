// Genera imágenes de prueba para el módulo Subir (en dev/subir/img/).
//   node subir/gen.mjs
// - pagina-sombra.jpg : página para colorear "fotografiada" con degradé de luz, sombra y ruido
// - foto-color.jpg    : foto con formas de colores, degradé y una carita
// - enorme.jpg        : 4000x3000 (para comprobar que se achica a 2048)
// - exif6.jpg         : 800x600 con EXIF orientación 6 (debe verse vertical, 600x800)
// - transparente.png  : líneas negras sobre fondo transparente
// - rota.jpg          : bytes basura (error visual)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { DEV } from '../lib.mjs';

const OUT = path.join(DEV, 'subir', 'img');
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage();
await page.setContent('<body></body>');

const imgs = await page.evaluate(() => {
  function rng(seed) { let s = seed; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

  // Dibujo "de libro para colorear" (líneas negras) en un contexto, escalado a w x h.
  function coloringPage(ctx, w, h, lw) {
    ctx.save();
    ctx.scale(w / 1000, h / 750);
    ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#1c1a1f';
    // gato
    ctx.beginPath(); ctx.arc(330, 380, 170, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(190, 290); ctx.lineTo(200, 150); ctx.lineTo(290, 222); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(470, 290); ctx.lineTo(460, 150); ctx.lineTo(370, 222); ctx.stroke();
    ctx.beginPath(); ctx.arc(270, 350, 32, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(390, 350, 32, 0, 7); ctx.stroke();
    ctx.fillStyle = '#1c1a1f';
    ctx.beginPath(); ctx.arc(276, 356, 14, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(396, 356, 14, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(315, 410); ctx.lineTo(345, 410); ctx.lineTo(330, 428); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(330, 428); ctx.quadraticCurveTo(300, 470, 280, 440); ctx.moveTo(330, 428); ctx.quadraticCurveTo(360, 470, 380, 440); ctx.stroke();
    ctx.lineWidth = lw * 0.6;
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(330 + s * 60, 420); ctx.lineTo(330 + s * 150, 400);
      ctx.moveTo(330 + s * 60, 435); ctx.lineTo(330 + s * 150, 445); ctx.stroke();
    }
    ctx.lineWidth = lw;
    // sol
    ctx.beginPath(); ctx.arc(780, 170, 80, 0, 7); ctx.stroke();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(780 + Math.cos(a) * 105, 170 + Math.sin(a) * 105); ctx.lineTo(780 + Math.cos(a) * 140, 170 + Math.sin(a) * 140); ctx.stroke();
    }
    // casa
    ctx.strokeRect(640, 420, 240, 220);
    ctx.beginPath(); ctx.moveTo(610, 430); ctx.lineTo(760, 310); ctx.lineTo(910, 430); ctx.closePath(); ctx.stroke();
    ctx.strokeRect(730, 530, 60, 110);
    ctx.strokeRect(665, 460, 50, 50); ctx.strokeRect(805, 460, 50, 50);
    // estrella
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 40 : 95, a = (i * Math.PI) / 5 - Math.PI / 2;
      ctx.lineTo(160 + Math.cos(a) * r * 0.8, 640 + Math.sin(a) * r * 0.8);
    }
    ctx.closePath(); ctx.stroke();
    // suelo
    ctx.beginPath(); ctx.moveTo(40, 700); ctx.bezierCurveTo(300, 670, 600, 730, 960, 690); ctx.stroke();
    ctx.restore();
  }

  function noise(ctx, w, h, amt, seed) {
    const r = rng(seed);
    const d = ctx.getImageData(0, 0, w, h);
    for (let i = 0; i < d.data.length; i += 4) {
      const n = (r() - 0.5) * amt;
      d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n;
    }
    ctx.putImageData(d, 0, 0);
  }

  const out = {};

  // 1) Página fotografiada con luz despareja.
  {
    const w = 1600, h = 1200;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#f3efe6'; ctx.fillRect(0, 0, w, h);
    ctx.filter = 'blur(1.2px)';
    coloringPage(ctx, w, h, 7);
    ctx.filter = 'none';
    // Degradé de luz (más oscuro abajo a la derecha) + sombra de un celular.
    ctx.globalCompositeOperation = 'multiply';
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#d4ccbd'); g.addColorStop(1, '#4a4238');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.filter = 'blur(60px)';
    ctx.fillStyle = '#5c5c5c';
    ctx.beginPath(); ctx.ellipse(250, 1150, 380, 260, -0.3, 0, 7); ctx.fill();
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-over';
    noise(ctx, w, h, 22, 7);
    out.pagina = c.toDataURL('image/jpeg', 0.85);
  }

  // 2) Foto con colores.
  {
    const w = 1200, h = 900;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#6ec6ff'); g.addColorStop(0.65, '#d7f0ff'); g.addColorStop(0.66, '#7cc96a'); g.addColorStop(1, '#3f8f3a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(1030, 150, 90, 0, 7); ctx.fill();
    ctx.fillStyle = '#ff5a5f'; ctx.fillRect(120, 420, 260, 220);
    ctx.fillStyle = '#b5413f'; ctx.beginPath(); ctx.moveTo(90, 430); ctx.lineTo(250, 290); ctx.lineTo(410, 430); ctx.fill();
    ctx.fillStyle = '#7b4a2a'; ctx.fillRect(820, 400, 60, 250);
    ctx.fillStyle = '#2f9e44'; ctx.beginPath(); ctx.arc(850, 360, 130, 0, 7); ctx.fill();
    // carita
    ctx.fillStyle = '#f4c7a1'; ctx.beginPath(); ctx.arc(580, 420, 150, 0, 7); ctx.fill();
    ctx.fillStyle = '#5a3a22'; ctx.beginPath(); ctx.arc(580, 360, 155, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
    ctx.fillStyle = '#2b2240'; ctx.beginPath(); ctx.arc(530, 420, 16, 0, 7); ctx.arc(630, 420, 16, 0, 7); ctx.fill();
    ctx.strokeStyle = '#b23a48'; ctx.lineWidth = 10; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(580, 470, 50, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.fillStyle = '#4c6ef5'; ctx.fillRect(470, 570, 220, 250);
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(300, 130, 120, 45, 0, 0, 7); ctx.fill();
    noise(ctx, w, h, 14, 3);
    out.foto = c.toDataURL('image/jpeg', 0.88);
  }

  // 3) Enorme 4000x3000.
  {
    const w = 4000, h = 3000;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fbfaf7'; ctx.fillRect(0, 0, w, h);
    coloringPage(ctx, w, h, 5);
    const g = ctx.createRadialGradient(w * 0.3, h * 0.3, 100, w * 0.5, h * 0.5, w * 0.8);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(60,50,30,.35)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    out.enorme = c.toDataURL('image/jpeg', 0.8);
  }

  // 4) Para EXIF: 800x600 con una flecha que apunta a la DERECHA (con orientación 6 debe apuntar ABAJO).
  {
    const w = 800, h = 600;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#000'; ctx.lineWidth = 24; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(120, 300); ctx.lineTo(660, 300); ctx.moveTo(500, 150); ctx.lineTo(660, 300); ctx.lineTo(500, 450); ctx.stroke();
    ctx.strokeRect(40, 40, 720, 520);
    out.exif = c.toDataURL('image/jpeg', 0.9);
  }

  // 6) Líneas muy gruesas y rellenos negros grandes (como los dibujos de la app impresos), luz despareja.
  {
    const w = 1400, h = 1050;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#f6f4ef'; ctx.fillRect(0, 0, w, h);
    coloringPage(ctx, w, h, 22);
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(w * 0.27, h * 0.47, 40, 0, 7); ctx.arc(w * 0.39, h * 0.47, 40, 0, 7); ctx.fill();
    ctx.fillRect(w * 0.1, h * 0.05, 120, 90);
    ctx.globalCompositeOperation = 'multiply';
    const g = ctx.createLinearGradient(w, 0, 0, h);
    g.addColorStop(0, '#fff'); g.addColorStop(1, '#8a8070');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    noise(ctx, w, h, 16, 11);
    out.gruesa = c.toDataURL('image/jpeg', 0.85);
  }

  // 7) Lápiz: líneas finas y grises (2 px, gris medio).
  {
    const w = 1500, h = 1125;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fbfaf6'; ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.55;
    coloringPage(ctx, w, h, 2.2);
    ctx.globalAlpha = 1;
    noise(ctx, w, h, 18, 5);
    out.lapiz = c.toDataURL('image/jpeg', 0.85);
  }

  // 5) Transparente.
  {
    const c = document.createElement('canvas'); c.width = 600; c.height = 450;
    const ctx = c.getContext('2d');
    coloringPage(ctx, 600, 450, 8);
    out.transp = c.toDataURL('image/png');
  }
  return out;
});

const buf = (d) => Buffer.from(d.split(',')[1], 'base64');
fs.writeFileSync(path.join(OUT, 'pagina-sombra.jpg'), buf(imgs.pagina));
fs.writeFileSync(path.join(OUT, 'foto-color.jpg'), buf(imgs.foto));
fs.writeFileSync(path.join(OUT, 'enorme.jpg'), buf(imgs.enorme));
fs.writeFileSync(path.join(OUT, 'transparente.png'), buf(imgs.transp));
fs.writeFileSync(path.join(OUT, 'gruesa.jpg'), buf(imgs.gruesa));
fs.writeFileSync(path.join(OUT, 'lapiz.jpg'), buf(imgs.lapiz));

// EXIF con orientación 6 (girar 90° a la derecha al mostrar), insertado después de SOI.
const jpg = buf(imgs.exif);
const tiff = Buffer.from([
  0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, // cabecera TIFF big-endian, IFD en 8
  0x00, 0x01,                                     // 1 entrada
  0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, 0x06, 0x00, 0x00, // Orientation = 6
  0x00, 0x00, 0x00, 0x00,                         // sin más IFDs
]);
const payload = Buffer.concat([Buffer.from('Exif\0\0', 'binary'), tiff]);
const len = payload.length + 2;
const app1 = Buffer.concat([Buffer.from([0xff, 0xe1, len >> 8, len & 255]), payload]);
fs.writeFileSync(path.join(OUT, 'exif6.jpg'), Buffer.concat([jpg.subarray(0, 2), app1, jpg.subarray(2)]));

// Basura con extensión de imagen.
const junk = Buffer.alloc(4096);
for (let i = 0; i < junk.length; i++) junk[i] = (i * 7919) & 255;
fs.writeFileSync(path.join(OUT, 'rota.jpg'), junk);

await browser.close();
for (const f of fs.readdirSync(OUT)) console.log(f, fs.statSync(path.join(OUT, f)).size);
