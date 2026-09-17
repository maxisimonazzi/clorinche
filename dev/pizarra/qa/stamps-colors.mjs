// Todos los sellos en cada color de la paleta (¿se ven las caritas con negro, blanco, gris, marrón?).
import { open, saveUrl } from './h.mjs';

const t = await open('desktop');
const url = await t.page.evaluate(() => {
  const cols = CL.pizarra.COLORS.map((c) => c.c);
  const list = CL.stamps.list;
  const cell = 70;
  const c = document.createElement('canvas');
  c.width = cell * list.length + 20; c.height = cell * cols.length * 2 + 20;
  const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height / 2);
  x.fillStyle = '#26262d'; x.fillRect(0, c.height / 2, c.width, c.height / 2);
  cols.forEach((col, j) => list.forEach((s, i) => {
    CL.stamps.draw(x, s.id, 10 + cell * i + cell / 2, 10 + cell * j + cell / 2, cell * 0.9, 0, col);
    CL.stamps.draw(x, s.id, 10 + cell * i + cell / 2, c.height / 2 + cell * j + cell / 2, cell * 0.9, 0, col);
  }));
  return c.toDataURL();
});
saveUrl(url, 'stamps-colors');
console.log(JSON.stringify({ errors: t.errors }));
await t.close();
