// Texturas en tablet dpr 2: cada pincel en grueso, lento y rápido, con zoom; lápiz repasado; aerosol quieto.
import { open, S, board, at, stroke, zoom, info } from './h.mjs';

const t = await open('tablet');
const { page } = t;
const api = {
  tool: (id) => page.evaluate((id) => CL.pizarra.current._test.selectTool(id), id),
  color: (c) => page.evaluate((c) => CL.pizarra.current._test.selectColor(c), c),
  size: (i) => page.evaluate((i) => CL.pizarra.current._test.selectSize(i), i),
  bg: (id) => page.evaluate((id) => CL.pizarra.current._test.setBg(id), id),
};
const b = await board(page);
const rows = [
  ['lapiz', '#2f5bea'], ['fibra', '#ff3b30'], ['pincel', '#1fb35a'], ['crayon', '#8b4dff'],
  ['aerosol', '#ff8a1f'], ['arcoiris', null], ['brillitos', '#ff78c4'],
];
for (const bgId of ['blanco', 'pizarron-verde']) {
  await page.evaluate(() => CL.pizarra.current._test.wipe());
  await page.waitForTimeout(1200);
  await api.bg(bgId);
  for (let i = 0; i < rows.length; i++) {
    const [id, col] = rows[i];
    await api.tool(id);
    if (col) await api.color(col);
    await api.size(2);
    const y = 0.08 + i * 0.13;
    // lento a la izquierda (muchos pasos con demora), rápido a la derecha (pocos pasos)
    await stroke(page, [at(b, 0.05, y), at(b, 0.25, y + 0.03), at(b, 0.45, y)], { pointer: 'touch', steps: 60, delay: 22 });
    await stroke(page, [at(b, 0.55, y), at(b, 0.75, y + 0.03), at(b, 0.95, y)], { pointer: 'touch', steps: 6, delay: 5 });
  }
  // lápiz repasado (se acumula) y aerosol con el dedo quieto 1,5 s
  await api.tool('lapiz'); await api.color('#23202b'); await api.size(3);
  for (let k = 0; k < 3; k++) await stroke(page, [at(b, 0.05 + k * 0.1, 0.96), at(b, 0.35, 0.96)], { pointer: 'touch', steps: 20, delay: 8 });
  await api.tool('aerosol'); await api.color('#2f5bea'); await api.size(1);
  await stroke(page, [at(b, 0.7, 0.95), at(b, 0.7, 0.95)], { pointer: 'touch', steps: 60, delay: 25 });
  await page.waitForTimeout(400);
  await S(page, `textures-${bgId}`);
  await zoom(page, `tex-${bgId}-lapiz`, 0.02, 0.03, 0.46, 0.1, 2);
  await zoom(page, `tex-${bgId}-pincel`, 0.02, 0.29, 0.96, 0.1, 1);
  await zoom(page, `tex-${bgId}-crayon`, 0.02, 0.42, 0.46, 0.1, 2);
  await zoom(page, `tex-${bgId}-bottom`, 0.02, 0.88, 0.8, 0.12, 1);
}
console.log(JSON.stringify({ info: await info(page), errors: t.errors }));
await t.close();
