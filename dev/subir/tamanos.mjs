// Pasada completa de diseño en todos los tamaños: elegir, página fotografiada con varios umbrales,
// foto real en modo foto, giro de pantalla, error. Mide botones (tamaño, fuera de pantalla, superpuestos).
//   node subir/tamanos.mjs [tamaño ...]
import path from 'node:path';
import { launch, appUrl, shot, SIZES, DEV } from '../lib.mjs';

const IMG = (f) => path.join(DEV, 'subir', 'img', f);
const INPUT = '.screen--subir .up-input:not([capture])';
const sizes = process.argv.slice(2).length ? process.argv.slice(2) : ['desktop', 'tablet', 'tabletV', 'phone', 'phoneH', 'phoneSmall'];

async function load(page, file) {
  const before = await page.evaluate(() => CL.upload.debug().renders);
  await page.setInputFiles(INPUT, IMG(file));
  await page.waitForFunction((b) => CL.upload.debug().view === 'edit' && CL.upload.debug().renders > b && !CL.upload.debug().busy, before, { timeout: 30000 });
  await page.waitForTimeout(450);
}

const setLevel = (page, v) => page.evaluate((v) => {
  const r = document.querySelector('.up-range'); r.value = v; r.dispatchEvent(new Event('input'));
}, v);

/** Controles visibles: tamaño mínimo, dentro del viewport, sin superponerse ni tapar el papel. */
const measure = (page) => page.evaluate(() => {
  const vw = innerWidth, vh = innerHeight;
  const root = document.querySelector('.screen--subir');
  const els = [...root.querySelectorAll('button, input[type=range]')].filter((e) => {
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && !e.closest('[hidden]');
  });
  const info = els.map((e) => ({ name: (e.getAttribute('aria-label') || e.className).slice(0, 22), r: e.getBoundingClientRect() }));
  const problems = [];
  for (const a of info) {
    if (a.r.left < -0.5 || a.r.top < -0.5 || a.r.right > vw + 0.5 || a.r.bottom > vh + 0.5) problems.push('fuera: ' + a.name);
    if (Math.min(a.r.width, a.r.height) < 46) problems.push('chico: ' + a.name + ' ' + Math.round(a.r.width) + 'x' + Math.round(a.r.height));
  }
  const over = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
  for (let i = 0; i < info.length; i++) for (let j = i + 1; j < info.length; j++) {
    if (over(info[i].r, info[j].r)) problems.push('superpuestos: ' + info[i].name + ' / ' + info[j].name);
  }
  const paper = root.querySelector('.up-paper');
  let paperPct = null;
  if (paper && !paper.closest('[hidden]')) {
    const p = paper.getBoundingClientRect();
    paperPct = +((100 * p.width * p.height) / (vw * vh)).toFixed(1);
    for (const a of info) if (over(a.r, p)) problems.push('tapa el papel: ' + a.name);
  }
  const scroll = document.documentElement.scrollWidth > vw || document.documentElement.scrollHeight > vh;
  // Nitidez: píxeles físicos del papel por píxel de la vista previa (1 = nítido, > 1.2 = se estira).
  let upscale = null;
  if (paper && !paper.closest('[hidden]')) upscale = +((paper.getBoundingClientRect().width * devicePixelRatio) / root.querySelector('.up-out').width).toFixed(2);
  return { problems, paperPct, scroll, upscale };
});

const report = {};
for (const size of sizes) {
  const t = await launch({ size });
  const { page } = t;
  const r = (report[size] = {});
  await page.goto(appUrl('subir'));
  await page.waitForFunction(() => window.CL && CL.upload && CL.upload.debug());
  await page.waitForTimeout(700);
  await shot(page, `subir/${size}-1-elegir`);
  r.elegir = await measure(page);

  // Página de libro fotografiada (papel grisáceo, sombra, perspectiva).
  await load(page, 'foto-pagina-dragon.jpg');
  r.modoAuto = await page.evaluate(() => CL.upload.debug().mode);
  await shot(page, `subir/${size}-2-pagina`);
  r.pagina = await measure(page);
  await setLevel(page, 15);
  await page.evaluate(() => document.querySelector('.up-range').dispatchEvent(new Event('change')));
  await page.waitForTimeout(250);
  await shot(page, `subir/${size}-2b-pagina-umbral15`);
  await setLevel(page, 95);
  await page.evaluate(() => document.querySelector('.up-range').dispatchEvent(new Event('change')));
  await page.waitForTimeout(250);
  await shot(page, `subir/${size}-2c-pagina-umbral95`);
  await setLevel(page, 60);

  // Foto real (flor) -> modo foto automático.
  await page.click('.up-bar .btn-back');
  await page.waitForTimeout(200);
  await load(page, 'real-flor.jpg');
  r.fotoModo = await page.evaluate(() => CL.upload.debug().mode);
  await shot(page, `subir/${size}-3-foto-real`);
  r.foto = await measure(page);

  // Giro de pantalla con la vista previa abierta.
  const s = SIZES[size];
  await page.setViewportSize({ width: s.height, height: s.width });
  await page.waitForTimeout(600);
  await shot(page, `subir/${size}-4-girada`);
  r.girada = await measure(page);
  await page.setViewportSize({ width: s.width, height: s.height });
  await page.waitForTimeout(400);

  // Archivo que no es una imagen válida: burbuja de error.
  await page.click('.up-bar .btn-back');
  await page.waitForTimeout(200);
  await page.setInputFiles(INPUT, IMG('rota.jpg'));
  await page.waitForTimeout(600);
  await shot(page, `subir/${size}-5-error`);
  r.error = await page.evaluate(() => ({ view: CL.upload.debug().view, visible: !document.querySelector('.up-err').hidden }));
  r.errors = t.errors;
  await t.close();
}
for (const [k, v] of Object.entries(report)) console.log(k, JSON.stringify(v));
