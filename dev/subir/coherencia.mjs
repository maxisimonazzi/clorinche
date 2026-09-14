// Corrección 1: ¿la vista previa REAL de la pantalla muestra lo que se guarda?
// Carga cada imagen por el input, pone el nivel con el deslizador, toma el canvas de la vista previa
// (.up-out) y lo compara con lo que se guardaría (CL.upload.process sobre la imagen de trabajo, igual que
// "guardar"), reducido al tamaño de la vista previa. Arma hojas "vista previa | guardado".
//   node subir/coherencia.mjs [tamaño]
import path from 'node:path';
import { launch, appUrl, saveDataUrl, SHOTS } from '../lib.mjs';
import { IMG, INPUT } from '../review-subir/common.mjs';

const size = process.argv[2] || 'desktop';
const cases = [
  ['lapiz.jpg', null, [60, 80, 95]],
  ['rv:mascota.jpg', 'photo', [40, 60, 80]],
  ['real-flor.jpg', 'photo', [60]],
  ['rv:foto-pagina-vaca.jpg', null, [60]],
  ['pagina-sombra.jpg', null, [30, 60]],
  ['enorme.jpg', 'page', [60]],
  ['rv:crayon.jpg', null, [60, 95]],
  ['rv:pagina-oscura.jpg', null, [60]],
];
const t = await launch({ size });
const { page } = t;
await page.goto(appUrl('subir'));
await page.waitForFunction(() => window.CL && CL.upload && CL.upload.debug());
// Input propio para volver a leer el archivo (el de la app se vacía al elegir).
await page.evaluate(() => { const i = document.createElement('input'); i.type = 'file'; i.id = 'qa-file'; i.style.display = 'none'; document.body.append(i); });
const out = [];
for (const [f, forceMode, levels] of cases) {
  const before = await page.evaluate(() => CL.upload.debug().renders);
  await page.setInputFiles('#qa-file', IMG(f));
  await page.setInputFiles(INPUT, IMG(f));
  await page.waitForFunction((b) => CL.upload.debug().view === 'edit' && CL.upload.debug().renders > b && !CL.upload.debug().busy, before, { timeout: 30000 });
  const auto = await page.evaluate(() => CL.upload.debug().mode);
  if (forceMode && forceMode !== auto) {
    await page.click(`.up-mode[aria-label^="${forceMode === 'photo' ? 'Foto' : 'Página'}"]`);
    await page.waitForFunction((m) => CL.upload.debug().mode === m && !CL.upload.debug().busy, forceMode, { timeout: 30000 });
  }
  for (const level of levels) {
    const r = await page.evaluate(async (level) => {
      const range = document.querySelector('.up-range');
      range.value = String(level);
      range.dispatchEvent(new Event('input', { bubbles: true }));
      range.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const d = CL.upload.debug();
      const prev = document.querySelector('.up-out');
      const orig = document.querySelector('.up-orig');
      return { d, pw: prev.width, ph: prev.height, ow: orig.width };
    }, level);
    // El guardado real se calcula con la API pública sobre la imagen decodificada del mismo archivo.
    const res = await page.evaluate(async ({ level, mode, thick }) => {
      const file = document.getElementById('qa-file').files[0];
      const src = await CL.upload.decode(file);
      const t0 = performance.now();
      const full = CL.upload.process(src, { mode, level, thick });
      const fullMs = Math.round(performance.now() - t0);
      const prev = document.querySelector('.up-out');
      const red = document.createElement('canvas'); red.width = prev.width; red.height = prev.height;
      const rx = red.getContext('2d'); rx.imageSmoothingQuality = 'high'; rx.drawImage(full, 0, 0, red.width, red.height);
      const a = prev.getContext('2d').getImageData(0, 0, prev.width, prev.height).data;
      const b = rx.getImageData(0, 0, red.width, red.height).data;
      let pa = 0, pb = 0, diff = 0;
      for (let i = 0; i < a.length; i += 4) { const A = a[i] < 128, B = b[i] < 160; if (A) pa++; if (B) pb++; if (A !== B) diff++; }
      const n = a.length / 4;
      const W = 700, H = Math.round((W * prev.height) / prev.width);
      const sheet = document.createElement('canvas'); sheet.width = W * 2 + 30; sheet.height = H + 40;
      const sx = sheet.getContext('2d'); sx.fillStyle = '#cfc6e0'; sx.fillRect(0, 0, sheet.width, sheet.height);
      sx.font = '18px sans-serif'; sx.fillStyle = '#222';
      sx.fillText(`vista previa real ${prev.width}x${prev.height} ${mode} ${level}`, 10, 24); sx.fillText(`guardado ${full.width}x${full.height} (reducido)`, W + 20, 24);
      sx.drawImage(prev, 10, 34, W, H); sx.drawImage(full, W + 20, 34, W, H);
      return { prevBlack: +(100 * pa / n).toFixed(2), fullBlack: +(100 * pb / n).toFixed(2), diffPct: +(100 * diff / n).toFixed(2), full: [full.width, full.height], fullMs, sheet: sheet.toDataURL('image/png') };
    }, { level, mode: r.d.mode, thick: r.d.thick });
    const name = path.basename(f.replace(/^rv:/, '')).replace(/\.\w+$/, '');
    saveDataUrl(res.sheet, path.join(SHOTS, 'subir', 'coherencia', `${size}-${name}-${r.d.mode}-${level}.png`));
    delete res.sheet;
    out.push({ f, auto, mode: r.d.mode, level, prev: [r.pw, r.ph], side: r.d.side, fullRenderMs: Math.round(r.d.fullMs), ...res });
  }
  await page.click('.up-bar .btn-back');
  await page.waitForTimeout(150);
}
for (const o of out) console.log(JSON.stringify(o));
console.log('errors', JSON.stringify(t.errors));
await t.close();
