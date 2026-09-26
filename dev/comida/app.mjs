// Prueba de los dibujos de la categoría comida dentro de la app (catálogo y pantalla de colorear).
//   cd dev && node comida/app.mjs
// Capturas en dev/shots/comida/.
import { launch, appUrl, shot, tap, settle } from '../lib.mjs';

const IDS = ['helado', 'torta', 'frutilla', 'pizza', 'manzana', 'sandia'];
const errores = [];

for (const size of ['desktop', 'tablet', 'phone', 'phoneH']) {
  const t = await launch({ size });
  const { page } = t;

  // Datos del registro: 6 dibujos, SVG válido y tamaño razonable.
  await page.goto(appUrl('dibujos/comida'));
  await page.waitForFunction(() => window.CL && CL.drawings && CL.drawings.list('comida').length > 0);
  if (size === 'desktop') {
    const info = await page.evaluate(() => CL.drawings.list('comida').map((d) => {
      const svg = CL.drawings.svg(d.id);
      const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
      return { id: d.id, nombre: d.name, bytes: d.inner.replace(/\s+/g, ' ').length, ok: !doc.querySelector('parsererror') };
    }));
    console.log('registro:', JSON.stringify(info));
    const ids = info.map((d) => d.id).join(',');
    if (ids !== IDS.join(',')) errores.push('ids inesperados: ' + ids);
    for (const d of info) if (!d.ok) errores.push('SVG inválido: ' + d.id);
  }
  await settle(page, 900);
  await shot(page, `comida/${size}-catalogo`);

  // Colorear: todos en desktop; torta y pizza en los demás tamaños.
  const lista = size === 'desktop' ? IDS : ['torta', 'pizza'];
  for (const id of lista) {
    await page.goto(appUrl('colorear/' + id));
    await settle(page, 1500);
    // Tocar el centro del lienzo más grande (el balde es la herramienta inicial).
    const r = await page.evaluate(() => {
      const cs = [...document.querySelectorAll('.screen--colorear canvas')]
        .map((c) => c.getBoundingClientRect()).filter((b) => b.width > 0);
      cs.sort((a, b) => b.width * b.height - a.width * a.height);
      return cs[0] ? { x: cs[0].x, y: cs[0].y, w: cs[0].width, h: cs[0].height } : null;
    });
    if (r) {
      const pointer = t.size.touch ? 'touch' : 'mouse';
      await tap(page, r.x + r.w * 0.55, r.y + r.h * 0.6, { pointer });
      await tap(page, r.x + r.w * 0.3, r.y + r.h * 0.3, { pointer });
      await settle(page, 700);
    } else errores.push(`${size}/${id}: no encontré el lienzo`);
    await shot(page, `comida/${size}-colorear-${id}`);
  }
  if (t.errors.length) console.log(size, 'errores de consola:\n  ' + t.errors.join('\n  '));
  await t.close();
}
console.log(errores.length ? 'FALLAS:\n' + errores.join('\n') : 'OK');
