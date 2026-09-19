// Neón: dibujar y recargar enseguida (100 / 150 / 300 / 600 ms): el trazo tiene que seguir ahí.
import { launch, appUrl, shot, multiStroke, rect, SHOTS } from '../lib.mjs';
import path from 'node:path';
import fs from 'node:fs';
const size = process.argv[2] || 'tablet';
const prof = path.join(SHOTS, 'neon', '_perfil-recarga-' + size);
fs.rmSync(prof, { recursive: true, force: true });
const t = await launch({ size, persistent: prof });
const { page } = t;
page.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'log') console.log('  [consola]', m.text()); });
const ready = () => page.waitForFunction(() => CL.neon && CL.neon.debug && CL.neon.debug.ready);
const info = () => page.evaluate(async () => (await CL.db.works.list({ kind: 'neon' })).map((w) => ({ id: w.id, up: w.updatedAt, kb: Math.round(w.paint.size / 1024), wh: [w.w, w.h] })));
await page.goto(appUrl('neon'));
await ready();
const r = await rect(page, '.neon-stage');
const X = (f) => r.x + r.width * f, Y = (f) => r.y + r.height * f;
const out = [];
let n = 0;
for (const wait of [100, 150, 300, 600, 0]) {
  n++;
  const before = (await info())[0];
  await multiStroke(page, [[[X(0.1), Y(0.08 * n)], [X(0.9), Y(0.08 * n + 0.05)]]], { steps: 10 });
  if (wait) await page.waitForTimeout(wait);
  const dbg = await page.evaluate(() => CL.neon.debug.pending);
  await page.reload();
  await ready();
  await page.waitForTimeout(200);
  const after = (await info())[0];
  out.push({ wait, pendienteAlRecargar: dbg, guardado: !!after && (!before || after.up !== before.up), obras: (await info()).length, kb: after && after.kb, wh: after && after.wh });
}
await shot(page, `neon/recarga/${size}-final`);
console.log(size, JSON.stringify(out), 'errors', JSON.stringify(t.errors));
await t.close();
