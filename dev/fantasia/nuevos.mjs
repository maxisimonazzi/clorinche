// Prueba en la app de los 5 dibujos nuevos de fantasía (hada, princesa, caballero, fantasmita, ovni).
//   cd dev && node fantasia/nuevos.mjs            -> capturas en dev/shots/fantasia/nuevos-*.png
// - Catálogo #dibujos/fantasia en tablet y celular: tienen que aparecer los 11 dibujos, con las líneas cargadas.
// - Colorear (hada y ovni en tablet y celular): el balde pinta varias zonas, cambiando de color entre toques;
//   se comprueba en el lienzo de pintura que cada toque pintó ese lugar.
// Los errores de consola que vienen de OTROS archivos de dibujos (otros agentes) se informan aparte.
import { launch, appUrl, shot, tap, settle } from '../lib.mjs';

const NOMBRES = ['Unicornio', 'Dragón', 'Castillo', 'Sirena', 'Robot', 'Monstruito',
  'Hada', 'Princesa', 'Caballero', 'Fantasmita', 'Platillo volador'];
// Puntos (coordenadas 0..1000 del dibujo) adentro de zonas distintas.
const ZONAS = {
  hada: [[82, 380], [200, 390], [272, 740], [370, 690], [500, 680], [500, 490], [500, 350], [500, 170],
    [500, 80], [404, 102], [752, 190], [118, 196], [438, 846], [562, 846]],
  ovni: [[500, 860], [500, 770], [500, 690], [500, 620], [180, 530], [250, 530], [500, 540], [750, 530],
    [350, 330], [440, 300], [432, 198], [500, 440], [648, 326], [140, 160]],
};
const fallas = [];
const ajeno = (e) => /js\/drawings\/(?!fantasia)\w+\.js/.test(e);

for (const size of ['tablet', 'phone']) {
  const t = await launch({ size });
  const { page } = t;
  const pointer = t.size.touch ? 'touch' : 'mouse';

  // Catálogo de la categoría.
  await page.goto(appUrl('dibujos/fantasia'));
  await page.waitForSelector('.screen--dibujos .dj-item');
  await settle(page, 1200);
  const cat = await page.evaluate(async () => {
    const imgs = [...document.querySelectorAll('.screen--dibujos .dj-item img')];
    await Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
    return {
      nombres: [...document.querySelectorAll('.screen--dibujos .dj-item')].map((b) => b.getAttribute('aria-label')),
      rotas: imgs.filter((i) => !i.naturalWidth).length,
    };
  });
  console.log(size, 'catálogo:', cat.nombres.length, 'dibujos ·', cat.nombres.join(', '), '· imágenes rotas:', cat.rotas);
  if (cat.nombres.join('|') !== NOMBRES.join('|')) fallas.push(`${size}: catálogo inesperado: ${cat.nombres.join(', ')}`);
  if (cat.rotas) fallas.push(`${size}: ${cat.rotas} imágenes de líneas sin cargar`);
  await shot(page, `fantasia/nuevos-${size}-catalogo`);
  await page.evaluate(() => { const s = document.querySelector('.screen--dibujos .dj-scroll'); s.scrollTop = s.scrollHeight; });
  await settle(page, 700);
  await shot(page, `fantasia/nuevos-${size}-catalogo-abajo`);

  // Colorear dos de los nuevos con el balde.
  for (const id of Object.keys(ZONAS)) {
    await page.goto(appUrl('colorear/' + id));
    await page.waitForSelector('.screen--colorear .cl-board canvas');
    await settle(page, 1500);
    const sw = await page.$$eval('.screen--colorear .cl-sw[data-color]', (bs) => bs.map((b) => {
      const r = b.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, c: b.dataset.color, ok: r.width > 0 };
    }).filter((s) => s.ok && s.c !== '#ffffff'));
    let pintadas = 0;
    for (let i = 0; i < ZONAS[id].length; i++) {
      const [u, v] = ZONAS[id][i];
      const s = sw[(i * 5) % sw.length];
      await tap(page, s.x, s.y, { pointer });
      await settle(page, 120);
      const r = await page.$eval('.screen--colorear .cl-board', (b) => { const q = b.getBoundingClientRect(); return { x: q.x, y: q.y, w: q.width, h: q.height }; });
      await tap(page, r.x + (r.w * u) / 1000, r.y + (r.h * v) / 1000, { pointer });
      await settle(page, 350);
      // ¿Quedó pintado ese punto en el lienzo de pintura?
      const a = await page.evaluate(([u, v]) => {
        const c = document.querySelector('.screen--colorear .cl-board canvas.cl-paint') ||
          document.querySelector('.screen--colorear .cl-board canvas');
        const d = c.getContext('2d').getImageData(Math.round((c.width * u) / 1000), Math.round((c.height * v) / 1000), 1, 1).data;
        return d[3];
      }, [u, v]);
      if (a > 0) pintadas++;
      else fallas.push(`${size}/${id}: el toque en (${u}, ${v}) no pintó`);
    }
    console.log(`${size} ${id}: ${pintadas}/${ZONAS[id].length} toques pintaron`);
    await settle(page, 400);
    await shot(page, `fantasia/nuevos-${size}-colorear-${id}`);
  }

  const propios = t.errors.filter((e) => !ajeno(e));
  const otros = t.errors.filter(ajeno);
  if (propios.length) fallas.push(`${size}: errores de consola:\n  ` + propios.join('\n  '));
  if (otros.length) console.log(`${size}: errores de OTROS archivos de dibujos (se ignoran):\n  ` + otros.join('\n  '));
  await t.close();
}
console.log(fallas.length ? 'FALLAS:\n' + fallas.join('\n') : 'OK: t.errors vacío y todo en orden');
