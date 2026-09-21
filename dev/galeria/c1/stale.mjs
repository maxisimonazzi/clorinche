// Revisión (rv): ¿la galería muestra datos viejos si otro módulo guarda en segundo plano al arrancar?
// (guardado de emergencia de colorear: localStorage → IndexedDB al cargar la app). Abre #obras directo.
// Uso: cd dev && node review-galeria/rv-stale.mjs
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { launch, appUrl, shot } from '../../lib.mjs';
import { ok, clean } from './r1-lib.mjs';

const PROF = path.join(os.tmpdir(), 'colorinche-c1-stale');
fs.rmSync(PROF, { recursive: true, force: true });
let t = await launch({ size: 'desktop', persistent: PROF });
let page = t.page;
await page.goto(appUrl('inicio'));
await page.waitForTimeout(800);
const id = await page.evaluate(async () => {
  const U = CL.util;
  const src = await CL.coloring.loadSource('vaca', 512);
  const mk = (color) => { const c = U.canvas(512, 512); const x = c.getContext('2d'); x.fillStyle = color; x.fillRect(0, 0, 512, 512); return c; };
  const paint = mk('#ff0000');
  const thumb = CL.coloring.composite(paint, src.image, 480, 480);
  src.revoke();
  const w = await CL.db.works.save({ kind: 'colorear', source: 'vaca', status: 'done', w: 512, h: 512,
    paint: await U.canvasToBlob(paint), thumb: await U.canvasToBlob(thumb), meta: { name: 'Vaca', snap: Date.now() - 60000 } });
  // Anotación de emergencia más nueva (pintura azul), como la deja colorear al cerrarse de golpe.
  const blue = mk('#0070ff');
  localStorage.setItem('colorinche.colorear.pendiente.vaca', JSON.stringify({
    source: 'vaca', workId: w.id, status: 'done', name: 'Vaca', w: 512, h: 512, mountTs: Date.now() - 70000,
    ts: Date.now(), png: blue.toDataURL('image/png'),
  }));
  return w.id;
});
await t.close();

// Arranca la app directamente en la galería.
t = await launch({ size: 'desktop', persistent: PROF });
page = t.page;
await page.goto(appUrl('obras'));
await page.waitForTimeout(2500);
await shot(page, 'galeria/c1/stale-obras');
const r = await page.evaluate(async (id) => {
  const img = document.querySelector(`.gal-card[data-id="${id}"] .gal-thumb`);
  const shown = img ? await (await fetch(img.src)).blob() : null;
  const w = await CL.db.works.get(id);
  // color del centro de lo que se ve y de lo guardado
  const px = async (blob) => {
    const im = await CL.util.blobToImage(blob); const c = CL.util.canvas(im.width, im.height); const x = c.getContext('2d');
    x.drawImage(im, 0, 0); const d = x.getImageData(Math.round(im.width * 0.62), Math.round(im.height * 0.55), 1, 1).data; return [d[0], d[1], d[2]].join(',');
  };
  return { shownSize: shown && shown.size, dbSize: w.thumb.size, shownPx: shown && await px(shown), dbPx: await px(w.thumb), pending: localStorage.getItem('colorinche.colorear.pendiente.vaca') ? 'sí' : 'no' };
}, id);
console.log(JSON.stringify(r));
ok(r.shownPx === r.dbPx, `galería abierta al arrancar muestra lo guardado (visto ${r.shownPx} vs base ${r.dbPx}; pendiente: ${r.pending})`);
ok(clean(t.errors).length === 0, 'sin errores ' + JSON.stringify(clean(t.errors)).slice(0, 300));
await t.close();
