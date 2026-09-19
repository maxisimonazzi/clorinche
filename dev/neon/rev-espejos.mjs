// Revisión neón: cada modo de espejo con dos dedos, captura en medio del gesto (sin soltar).
// Además verifica numéricamente la simetría: para cada píxel con tinta, su imagen por cada
// transformación del grupo también tiene tinta.
import { launch, appUrl, shot, multiStroke, touches, rect } from '../lib.mjs';

for (const size of process.argv.slice(2).length ? process.argv.slice(2) : ['tabletV', 'phoneH']) {
  const t = await launch({ size });
  const { page } = t;
  await page.goto(appUrl('neon'));
  await page.waitForFunction(() => CL.neon && CL.neon.debug && CL.neon.debug.ready);
  const r = await rect(page, '.neon-stage');
  const X = (f) => r.x + r.width * f, Y = (f) => r.y + r.height * f;
  const res = {};
  for (const [mi, n, col] of [[1, 2, 0], [2, 4, 1], [3, 6, 3], [4, 8, 8]]) {
    await page.locator('.neon-mirror').nth(mi).click();
    await page.locator('.neon-swatch').nth(col).click();
    const f1 = [[X(0.6), Y(0.15)], [X(0.75), Y(0.3)], [X(0.65), Y(0.42)]];
    const f2 = [[X(0.3), Y(0.62)], [X(0.4), Y(0.85)], [X(0.18), Y(0.8)]];
    await multiStroke(page, [f1, f2], { steps: 30, delay: 6, release: false });
    await shot(page, `neon/rev/espejos/${size}-${n}-durante`);
    await touches(page, []);
    await page.waitForTimeout(120);
    // Chequeo de simetría sobre la capa de trazos (muestras).
    res[n] = await page.evaluate((n) => {
      const c = document.querySelector('.neon-paint');
      const g = c.getContext('2d');
      const W = c.width, H = c.height, cx = W / 2, cy = H / 2;
      const d = g.getImageData(0, 0, W, H).data;
      const a = (x, y) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= W || y >= H) return -1; return d[(y * W + x) * 4 + 3]; };
      const m = n / 2, xf = [];
      for (let k = 0; k < m; k++) { const t = 2 * Math.PI * k / m, co = Math.cos(t), s = Math.sin(t); xf.push([co, -s, s, co], [-co, -s, -s, co]); }
      let checked = 0, bad = 0;
      for (let i = 0; i < 4000; i++) {
        const x = Math.random() * W, y = Math.random() * H;
        if (a(x, y) < 200) continue;
        const dx = x - cx, dy = y - cy;
        for (const q of xf) { const v = a(cx + q[0] * dx + q[1] * dy, cy + q[2] * dx + q[3] * dy); if (v === -1) continue; checked++; if (v < 120) bad++; }
      }
      return { checked, bad };
    }, n);
    // borrar para el siguiente
    const b = await rect(page, '.neon-clear');
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down(); await page.waitForTimeout(1350); await page.mouse.up();
    await page.waitForTimeout(1300);
  }
  console.log(size, JSON.stringify(res), 'errors', JSON.stringify(t.errors));
  await t.close();
}
