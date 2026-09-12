// Catálogo: categorías, una categoría con progreso, "Mis dibujos" vacío y con imágenes, quitar una imagen.
import { launch, appUrl, shot, tap } from '../lib.mjs';
const sizes = process.argv.slice(2).length ? process.argv.slice(2) : ['desktop', 'tablet', 'phone'];
for (const size of sizes) {
  const t = await launch({ size });
  const { page } = t;
  const out = { size };
  await page.goto(appUrl('dibujos/mis'));
  await page.waitForTimeout(700);
  await shot(page, `colorear/cat-${size}-mis-vacio`);
  // progreso en un dibujo + dos imágenes subidas
  await page.evaluate(async () => {
    const mk = async (draw) => { const c = CL.util.canvas(900, 700), x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 900, 700); x.strokeStyle = '#000'; x.lineWidth = 12; draw(x); return { w: 900, h: 700, blob: await CL.util.canvasToBlob(c), thumb: await CL.util.canvasToBlob(CL.util.thumbnail(c, 320)) }; };
    await CL.db.uploads.save(await mk((x) => { x.beginPath(); x.arc(450, 350, 250, 0, 7); x.stroke(); }));
    await CL.db.uploads.save(await mk((x) => { x.strokeRect(150, 150, 600, 400); x.beginPath(); x.moveTo(150, 150); x.lineTo(750, 550); x.stroke(); }));
  });
  await page.goto(appUrl('colorear/perro'));
  await page.waitForFunction(() => document.querySelectorAll('.screen').length === 1 && document.querySelector('.cl-ready'), null, { timeout: 10000 });
  const b = await page.evaluate(() => document.querySelector('.cl-board').getBoundingClientRect().toJSON());
  for (const [fx, fy] of [[0.05, 0.05], [0.5, 0.4], [0.5, 0.75]]) {
    if (t.size.touch) await tap(page, b.x + b.width * fx, b.y + b.height * fy); else await page.mouse.click(b.x + b.width * fx, b.y + b.height * fy);
    await page.waitForTimeout(300);
  }
  await page.goto(appUrl('dibujos'));   // unmount guarda
  await page.waitForTimeout(2500);
  await shot(page, `colorear/cat-${size}-categorias`);
  await page.goto(appUrl('dibujos/mascotas'));
  await page.waitForTimeout(900);
  await shot(page, `colorear/cat-${size}-mascotas`);
  await page.goto(appUrl('dibujos/mis'));
  await page.waitForTimeout(900);
  await shot(page, `colorear/cat-${size}-mis`);
  // Quitar una imagen manteniendo apretado
  const del = await page.locator('.dj-del').first().boundingBox();
  await page.mouse.move(del.x + del.width / 2, del.y + del.height / 2);
  await page.mouse.down(); await page.waitForTimeout(1400); await page.mouse.up();
  await page.waitForTimeout(700);
  out.uploadsLeft = await page.evaluate(async () => (await CL.db.uploads.list()).length);
  out.tiles = await page.evaluate(() => document.querySelectorAll('.dj-item').length);
  out.scrollW = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  out.errors = t.errors;
  console.log(JSON.stringify(out));
  await t.close();
}
