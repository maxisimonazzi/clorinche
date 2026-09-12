// Prueba de herramientas de colorear con mouse (desktop). Capturas en shots/colorear/tools-*.png
import { launch, appUrl, shot, stroke } from '../lib.mjs';
const size = process.argv[2] || 'desktop';
const t = await launch({ size });
const { page } = t;
const out = {};
await page.goto(appUrl('colorear/vaca'));
await page.waitForFunction(() => document.querySelectorAll('.screen').length === 1 && document.querySelector('.screen--colorear.cl-ready'), null, { timeout: 10000 });
await page.waitForTimeout(300);
out.regionsMs = await page.evaluate(() => CL.coloring.stats.regionsMs);
const board = () => page.evaluate(() => document.querySelector('.cl-board').getBoundingClientRect().toJSON());
const P = async (fx, fy) => { const b = await board(); return [b.x + b.width * fx, b.y + b.height * fy]; };
const click = async (fx, fy) => { const [x, y] = await P(fx, fy); await page.mouse.click(x, y); await page.waitForTimeout(330); };
const btn = (label) => page.click(`[aria-label="${label}"]`);
const color = (name) => page.click(`.cl-sw[aria-label="${name}"]`);
const drag = async (pts, steps = 30) => { const b = await board(); await stroke(page, pts.map(([fx, fy]) => [b.x + b.width * fx, b.y + b.height * fy]), { steps }); await page.waitForTimeout(150); };

// 1) Balde en varias zonas
await color('Celeste'); await click(0.08, 0.08);
await color('Verde'); await click(0.65, 0.57);
await color('Amarillo'); await click(0.29, 0.28);
await color('Rosa'); await click(0.31, 0.46);
out.fillMs = await page.evaluate(() => CL.coloring.stats.lastFillMs);
await shot(page, `colorear/tools-${size}-1-balde`);
// 2) Repintar una zona ya pintada
await color('Naranja'); await click(0.65, 0.57);
await shot(page, `colorear/tools-${size}-2-repintar`);
// 3) Pincel "no salirse" (activado por defecto): trazo que cruza el borde del cuerpo
await btn('Pincel'); await btn('Pincel grueso'); await color('Violeta');
await btn('Pincel'); // setColor pasa a... se mantiene pincel
await drag([[0.45, 0.62], [0.97, 0.66]]);
await drag([[0.66, 0.46], [0.66, 0.97]]);
await shot(page, `colorear/tools-${size}-3-pincel-clip`);
// 4) Pincel libre
await btn('No salirse de las líneas');
await color('Azul oscuro'); await btn('Pincel');
await drag([[0.12, 0.2], [0.5, 0.38], [0.2, 0.5]]);
await shot(page, `colorear/tools-${size}-4-pincel-libre`);
await btn('No salirse de las líneas'); // volver a activarlo
// 5) Balde sobre una pincelada
await btn('Balde de pintura'); await color('Verde claro'); await click(0.8, 0.645);
await shot(page, `colorear/tools-${size}-5-balde-sobre-pincel`);
// 6) Goma (respeta no salirse)
await btn('Goma'); await btn('Pincel grueso'); await btn('Goma');
await drag([[0.2, 0.25], [0.5, 0.3]]);
await shot(page, `colorear/tools-${size}-6-goma`);
// 7) Deshacer / rehacer
await btn('Deshacer'); await page.waitForTimeout(150);
await btn('Deshacer'); await page.waitForTimeout(150);
await shot(page, `colorear/tools-${size}-7-deshacer2`);
await btn('Rehacer'); await page.waitForTimeout(150);
await shot(page, `colorear/tools-${size}-8-rehacer1`);
out.history = await page.evaluate(() => CL.coloring.screen.painter.historyLength);
// 8) Rellenos especiales con balde
await btn('Balde de pintura');
await color('Celeste'); await page.click('[data-kind="rainbow"]'); await click(0.08, 0.08);
await color('Rojo'); await page.click('[data-kind="dots"]'); await click(0.65, 0.57);
await color('Violeta'); await page.click('[data-kind="sparkle"]'); await click(0.29, 0.28);
await color('Rosa fuerte'); await page.click('[data-kind="gradient"]'); await click(0.31, 0.46);
await color('Celeste'); await page.click('[data-kind="gradient"]'); await click(0.55, 0.63);
await shot(page, `colorear/tools-${size}-9-especiales`);
// pincel con especial (arcoíris, no salirse)
await color('Rojo'); await page.click('[data-kind="rainbow"]'); await btn('Pincel');
await drag([[0.1, 0.9], [0.18, 0.915], [0.27, 0.9]]); await btn('No salirse de las líneas'); await drag([[0.45, 0.72], [0.62, 0.8], [0.85, 0.72]]); await btn('No salirse de las líneas');
await shot(page, `colorear/tools-${size}-10-pincel-arcoiris`);
// 9) Selector de color
await btn('Elegir cualquier color');
await page.waitForTimeout(300);
const mb = await page.locator('.cl-pk-mapbox').boundingBox();
await page.mouse.click(mb.x + mb.width * 0.47, mb.y + mb.height * 0.55);
await page.waitForTimeout(150);
await shot(page, `colorear/tools-${size}-11-selector`);
out.picked = await page.evaluate(() => CL.coloring.screen.st.color);
await btn('Listo'); await page.waitForTimeout(300);
await btn('Balde de pintura'); await click(0.5, 0.88);
await shot(page, `colorear/tools-${size}-12-color-elegido`);
// 10) Zoom con botones y rueda
await btn('Acercar'); await page.waitForTimeout(300); await btn('Acercar'); await page.waitForTimeout(350);
await shot(page, `colorear/tools-${size}-13-zoom-botones`);
await btn('Ver todo el dibujo'); await page.waitForTimeout(350);
// rueda sobre el borde cuerpo/fondo (borde superior del lomo)
const [wx, wy] = await P(0.8, 0.44);
await page.mouse.move(wx, wy);
for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, -120); await page.waitForTimeout(30); }
await page.waitForTimeout(400);
out.zoomK = await page.evaluate(() => CL.coloring.screen.view.k);
await shot(page, `colorear/tools-${size}-14-zoom-rueda-halo`);
out.errors = t.errors;
console.log(JSON.stringify(out, null, 1));
await t.close();
