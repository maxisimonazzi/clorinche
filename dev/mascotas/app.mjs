// Prueba en la app real de los dibujos de "mascotas": catálogo + pintar con el balde varias zonas
// de cada dibujo, en compu, tablet y celular (y orientaciones alternativas).
// Uso: cd dev && node mascotas/app.mjs [size ...]   → capturas en dev/shots/mascotas/
import { launch, appUrl, shot, tap, settle } from '../lib.mjs';

const sizes = process.argv.slice(2).length ? process.argv.slice(2) : ['desktop', 'tablet', 'phone', 'tabletV', 'phoneH'];

// Puntos (coordenadas del lienzo 0..1000) de zonas grandes para probar el balde en cada dibujo.
const TAPS = {
  perro: [[500, 200], [240, 330], [760, 330], [450, 600], [345, 770], [450, 800], [820, 700], [500, 530], [500, 615]],
  gato: [[500, 250], [300, 150], [500, 600], [350, 760], [560, 915], [465, 760], [362, 432], [640, 450]],
  conejo: [[500, 350], [400, 200], [600, 250], [320, 800], [500, 780], [830, 720], [800, 520], [340, 690], [700, 690], [500, 550]],
  pez: [[250, 350], [500, 180], [880, 400], [560, 420], [470, 600], [150, 200], [520, 780]],
  tortuga: [[180, 250], [560, 485], [560, 285], [330, 395], [300, 625], [360, 715], [900, 625], [255, 515]],
  hamster: [[500, 600], [500, 260], [270, 160], [326, 200], [500, 850], [244, 500], [390, 720], [500, 690], [456, 800], [480, 540]],
};

const allErrors = [];
for (const size of sizes) {
  const t = await launch({ size });
  const { page } = t;
  await page.goto(appUrl('dibujos/mascotas'));
  await settle(page, 1500);
  await shot(page, `mascotas/${size}-catalogo`);

  for (const [id, pts] of Object.entries(TAPS)) {
    // Solo en compu se prueban todos; en los demás tamaños, dos dibujos para no eternizar.
    if (size !== 'desktop' && !['perro', 'pez', 'hamster', 'conejo'].includes(id)) continue;
    await page.goto(appUrl('colorear/' + id));
    await page.waitForSelector('.cl-lines', { timeout: 10000 });
    await settle(page, 1500);
    const box = await page.locator('.cl-lines').boundingBox();
    const sw = page.locator('.cl-colors .cl-sw');
    const nsw = await sw.count();
    for (let i = 0; i < pts.length; i++) {
      if (nsw) await sw.nth((i * 5 + 2) % nsw).click();
      const [x, y] = pts[i];
      await tap(page, box.x + (x / 1000) * box.width, box.y + (y / 1000) * box.height, { pointer: t.size.touch ? 'touch' : 'mouse' });
      await settle(page, 250);
    }
    await settle(page, 600);
    await shot(page, `mascotas/${size}-${id}`);
  }
  if (t.errors.length) allErrors.push(`[${size}]\n` + t.errors.join('\n'));
  await t.close();
}
console.log(allErrors.length ? 'ERRORES:\n' + allErrors.join('\n') : 'sin errores');
