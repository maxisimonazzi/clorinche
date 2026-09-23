// Mecha a mitad de camino: trazo rápido y capturas mientras la chispa avanza (dedo apoyado).
import { launch, appUrl, shot, multiStroke, touches } from '../lib.mjs';

const size = process.argv[2] || 'tablet';
const t = await launch({ size });
const { page } = t;
const W = t.size.width, H = t.size.height;
await page.goto(appUrl('fuegos'));
await page.waitForTimeout(800);
const path = [];
for (let i = 0; i <= 12; i++) { const a = i / 12; path.push([W * (0.12 + 0.76 * a), H * (0.75 - 0.4 * Math.sin(a * Math.PI))]); }
// Dos dedos: una mecha larga y otra corta, ambas apoyadas.
await multiStroke(page, [path, [[W * 0.2, H * 0.3], [W * 0.45, H * 0.28]]], { steps: 10, delay: 0, release: false });
const st0 = await page.evaluate(() => JSON.stringify(CL.fuegos._debug.state()).slice(0, 400));
await page.waitForTimeout(500);
await shot(page, `integracion/fuegos-${size}-mecha-a`);
await page.waitForTimeout(900);
await shot(page, `integracion/fuegos-${size}-mecha-b`);
await touches(page, []);
await page.waitForTimeout(1500);
await shot(page, `integracion/fuegos-${size}-mecha-c`);
console.log('estado:', st0);
console.log('errores:', t.errors.length ? t.errors : 'ninguno');
await t.close();
