// Revisión 1: "mantener apretado para borrar" interrumpido (la vista se cierra mientras el dedo sigue apoyado).
// Se suelta SIEMPRE antes de los 1.2 s: no debería borrarse nada.
// Uso: cd dev && node galeria/r2-hold.mjs [tamaño=tablet]
import { launch, appUrl, shot, tap, touchStart, touches } from '../../lib.mjs';
import { ok, clean, state, dbWorks, instrument, seedSynthetic, center } from './lib.mjs';
const size = process.argv[2] || 'tablet';
const t = await launch({ size });
const { page } = t;
await page.addInitScript(instrument);
await page.goto(appUrl('inicio'));
await page.waitForTimeout(700);
await seedSynthetic(page, { done: 10, progress: 2 });
await page.evaluate(() => CL.router.go('obras'));
await page.waitForTimeout(1300);
const n = async () => (await dbWorks(page)).length;
const open = async (nth) => { const [x, y] = await center(page, `.gal-card >> nth=${nth}`); await tap(page, x, y); await page.waitForTimeout(800); };
const log = async () => page.evaluate(() => { const l = window.__hl || []; window.__hl = []; return l.join(' | '); });
await page.evaluate(() => {
  window.__hl = [];
  for (const ty of ['pointerup', 'lostpointercapture', 'click']) document.addEventListener(ty, (e) => window.__hl.push(ty + '@' + (e.target === document ? 'document' : String(e.target.className && (e.target.className.baseVal ?? e.target.className)).slice(0, 18))), true);
});

const cases = [
  ['atras-celular', async () => page.evaluate(() => history.back())],
  ['segundo-dedo-fondo', async (bx, by) => { await touchStart(page, [{ x: bx, y: by, id: 1 }, { x: 8, y: 8, id: 2 }]); await page.waitForTimeout(80); await touches(page, [{ x: bx, y: by, id: 1 }]); }],
  ['segundo-dedo-X', async (bx, by) => { const [cx, cy] = await center(page, '.gv-close'); await touchStart(page, [{ x: bx, y: by, id: 1 }, { x: cx, y: cy, id: 2 }]); await page.waitForTimeout(80); await touches(page, [{ x: bx, y: by, id: 1 }]); }],
  ['escape', async () => page.keyboard.press('Escape')],
];
let i = 0;
for (const [name, interrupt] of cases) {
  const before = await n();
  await open(i++ % 4);
  const [bx, by] = await center(page, '.gv-del');
  await touchStart(page, [{ x: bx, y: by, id: 1 }]);
  await page.waitForTimeout(250);
  await interrupt(bx, by);
  await page.waitForTimeout(450);          // la vista ya se fue (200 ms de fundido)
  const mid = await state(page);
  await touches(page, []);                 // suelta a ~0.75 s: antes de 1.2 s
  await page.waitForTimeout(1600);
  const after = await n();
  const s = await state(page);
  ok(after === before, `[${size}] ${name}: mantener 0.75 s y soltar con la vista ya cerrada → obras ${before}→${after} (vista durante: ${mid.modal}; después: ${s.modal}, ${s.hash}) eventos: ${await log()}`);
  if (s.modal) { await page.keyboard.press("Escape"); await page.waitForTimeout(500); }
  await shot(page, `galeria/r2/hold-${size}-${name}`);
  await page.waitForTimeout(4200); // por si quedó el bloqueo de 4 s de lockUntilRelease
}
// Mouse (compu): apretar borrar, Escape, soltar a los 0.75 s
{
  const before = await n();
  await page.mouse.click(5, 300); await page.waitForTimeout(200);
  const [x, y] = await center(page, '.gal-card >> nth=1');
  await page.mouse.click(x, y); await page.waitForTimeout(800);
  const [bx, by] = await center(page, '.gv-del');
  await page.mouse.move(bx, by); await page.mouse.down();
  await page.waitForTimeout(250);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await page.mouse.up();
  await page.waitForTimeout(1600);
  const after = await n();
  ok(after === before, `[${size}] mouse+Escape: soltar a 0.75 s → obras ${before}→${after} eventos: ${await log()}`);
}
ok(clean(t.errors).length === 0, 'sin errores ' + JSON.stringify(clean(t.errors)).slice(0, 300));
await t.close();
