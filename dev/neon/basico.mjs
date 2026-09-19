// Neón: primera prueba (carga, trazo, capturas por tamaño).
import { launch, appUrl, shot, stroke, multiStroke, rect } from '../lib.mjs';

const sizes = process.argv.slice(2).length ? process.argv.slice(2) : ['desktop'];
for (const size of sizes) {
  const t = await launch({ size });
  const { page } = t;
  await page.goto(appUrl('neon'));
  await page.waitForFunction(() => window.CL && CL.neon && CL.neon.debug && CL.neon.debug.ready);
  await page.waitForTimeout(400);
  await shot(page, `neon/${size}-vacio`);
  const r = await rect(page, '.neon-stage');
  const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
  const w = r.width, h = r.height;
  const path = [];
  for (let i = 0; i <= 40; i++) {
    const a = i / 40;
    path.push([r.x + w * (0.12 + 0.76 * a), cy + Math.sin(a * Math.PI * 3) * h * 0.25]);
  }
  if (t.size.touch) await multiStroke(page, [path], { steps: 60 });
  else await stroke(page, path, { steps: 60 });
  await page.waitForTimeout(300);
  await shot(page, `neon/${size}-trazo`);
  console.log(size, JSON.stringify(await page.evaluate(() => CL.neon.debug)));
  console.log('errors', t.errors);
  await t.close();
}
