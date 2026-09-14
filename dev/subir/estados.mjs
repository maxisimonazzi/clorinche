// Corrección 1: capturas de estados — ocupado al girar (CPU frenada) y error al soltar un archivo malo en la edición.
//   node subir/estados.mjs [tamaño]
import { launch, appUrl, shot } from '../lib.mjs';
import { IMG, INPUT } from '../review-subir/common.mjs';
const size = process.argv[2] || 'tablet';
const t = await launch({ size });
const { page } = t;
await page.goto(appUrl('subir'));
await page.waitForFunction(() => window.CL && CL.upload && CL.upload.debug());
await page.setInputFiles(INPUT, IMG('enorme.jpg'));
await page.waitForFunction(() => CL.upload.debug().view === 'edit' && !CL.upload.debug().busy, null, { timeout: 30000 });
await page.waitForTimeout(1500);
const cdp = await page.context().newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
await page.evaluate(() => document.querySelector('.up-rotate').click());
await page.waitForTimeout(450);
const during = await page.evaluate(() => ({ busy: CL.upload.debug().busy, spinner: !!document.querySelector('.screen--subir > .spinner'), panelPE: getComputedStyle(document.querySelector('.up-panel')).pointerEvents }));
await shot(page, `subir/${size}-12-girando`);
await page.waitForFunction(() => !CL.upload.debug().busy, null, { timeout: 30000 });
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
await page.waitForTimeout(500);
const err = await page.evaluate(async () => {
  const dt = new DataTransfer();
  dt.items.add(new File(['hola'], 'nota.txt', { type: 'text/plain' }));
  document.querySelector('.screen--subir').dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
  await new Promise((r) => setTimeout(r, 700));
  const e = document.querySelector('.up-err').getBoundingClientRect();
  return { view: CL.upload.debug().view, src: CL.upload.debug().src, errVisible: e.width > 0 };
});
await shot(page, `subir/${size}-13-error-en-edicion`);
console.log(JSON.stringify({ during, err, errors: t.errors }));
await t.close();
