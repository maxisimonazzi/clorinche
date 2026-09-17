// exportPNG de una obra en pizarrón (lo que descarga la galería) comparado con la pantalla.
import { open, S, board, wave, stroke, saveUrl } from './h.mjs';
const t = await open('phone');
const { page } = t;
const b = await board(page);
await page.evaluate(() => { const c = CL.pizarra.current._test; c.setBg('pizarron-verde'); c.selectTool('crayon'); c.selectSize(3); c.selectColor('#ffffff'); });
await stroke(page, wave(b, 0.3, 0.1, 0.9, 0.1), { pointer: 'touch', steps: 30 });
await page.evaluate(() => { const c = CL.pizarra.current._test; c.selectTool('sellos'); c.selectColor('multi'); });
await stroke(page, wave(b, 0.7, 0.15, 0.85, 0.05), { pointer: 'touch', steps: 30 });
await page.waitForTimeout(600);
await page.evaluate(() => CL.pizarra.current.save());
const url = await page.evaluate(async () => {
  const blob = await CL.pizarra.exportPNG(CL.pizarra.current.work);
  return await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
});
saveUrl(url, 'export-phone-chalk');
await S(page, 'export-phone-screen');
console.log(JSON.stringify({ len: url.length, errors: t.errors }));
await t.close();
