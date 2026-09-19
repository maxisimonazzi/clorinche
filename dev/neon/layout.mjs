// Neón: distribución en todos los tamaños (sin cortes ni superposiciones) + un dibujo de muestra.
import { launch, appUrl, shot, multiStroke, stroke, touches, rect } from '../lib.mjs';

const sizes = process.argv.slice(2).length ? process.argv.slice(2) : ['desktop', 'tablet', 'tabletV', 'phone', 'phoneH', 'phoneSmall', 'desktopHD'];
for (const size of sizes) {
  const t = await launch({ size });
  const { page } = t;
  await page.goto(appUrl('neon'));
  await page.waitForFunction(() => CL.neon && CL.neon.debug && CL.neon.debug.ready);
  await page.waitForTimeout(400);
  const check = await page.evaluate(() => {
    const W = innerWidth, H = innerHeight;
    const btns = [...document.querySelectorAll('.screen--neon button')].map((b) => { const r = b.getBoundingClientRect(); return { l: b.getAttribute('aria-label'), x: r.x, y: r.y, w: r.width, h: r.height }; });
    const out = btns.filter((b) => b.x < -1 || b.y < -1 || b.x + b.w > W + 1 || b.y + b.h > H + 1).map((b) => b.l);
    const small = btns.filter((b) => b.w < 45.5 || b.h < 45.5).map((b) => b.l + ' ' + b.w.toFixed(0));
    const over = [];
    for (let i = 0; i < btns.length; i++) for (let j = i + 1; j < btns.length; j++) {
      const a = btns[i], b = btns[j];
      if (a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1) over.push(a.l + ' / ' + b.l);
    }
    const st = document.querySelector('.neon-stage').getBoundingClientRect();
    const overStage = btns.filter((b) => b.x < st.right - 1 && st.x < b.x + b.w - 1 && b.y < st.bottom - 1 && st.y < b.y + b.h - 1).map((b) => b.l);
    return { stage: [Math.round(st.width), Math.round(st.height)], fuera: out, chicos: small, superpuestos: over.filter((s) => !s.includes('Pizarra mágica /') || true).slice(0, 6), sobrePizarra: overStage };
  });
  await shot(page, `neon/layout/${size}-vacio`);
  const r = await rect(page, '.neon-stage');
  await page.locator('.neon-mirror').nth(3).click();
  await page.locator('.neon-swatch').nth(1).click();
  const p1 = [], p2 = [];
  for (let i = 0; i <= 30; i++) { const a = i / 30; p1.push([r.x + r.width * (0.55 + 0.3 * a), r.y + r.height * (0.3 + 0.15 * Math.sin(a * 6))]); p2.push([r.x + r.width * (0.5 + 0.1 * Math.cos(a * 5)), r.y + r.height * (0.15 + 0.2 * a)]); }
  if (t.size.touch) {
    await multiStroke(page, [p1, p2], { steps: 30, delay: 5, release: false });
    await shot(page, `neon/layout/${size}-durante`);
    await touches(page, []);
  } else {
    await stroke(page, p1, { steps: 30 });
    await stroke(page, p2, { steps: 30, release: false });
    await shot(page, `neon/layout/${size}-durante`);
    await page.mouse.up();
  }
  await page.waitForTimeout(150);
  await shot(page, `neon/layout/${size}-dibujo`);
  console.log(size, JSON.stringify(check), 'errors', t.errors);
  await t.close();
}
