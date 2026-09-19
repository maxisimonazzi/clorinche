// Revisión neón: distribución en todos los tamaños + tamaños "reales" (compu con barra del navegador).
// Chequea botones fuera de pantalla, chicos, superpuestos o encima de la pizarra, y saca capturas
// vacío / durante un trazo (sin soltar) / después.
import { launch, appUrl, shot, multiStroke, stroke, touches, rect } from '../lib.mjs';

const EXTRA = {
  laptop: { width: 1366, height: 657, dpr: 1, touch: false },    // 1366x768 con la barra de Chrome/Edge
  laptop720: { width: 1280, height: 720, dpr: 1.5, touch: false },
  ipadSafari: { width: 1024, height: 690, dpr: 2, touch: true }, // iPad horizontal con barra de Safari
  phoneTall: { width: 412, height: 915, dpr: 2.6, touch: true },
};
const names = process.argv.slice(2).length ? process.argv.slice(2)
  : ['desktop', 'tablet', 'tabletV', 'phone', 'phoneH', 'phoneSmall', 'laptop', 'laptop720', 'ipadSafari'];

for (const name of names) {
  const t = await launch({ size: EXTRA[name] || name });
  const { page } = t;
  await page.goto(appUrl('neon'));
  await page.waitForFunction(() => CL.neon && CL.neon.debug && CL.neon.debug.ready);
  await page.waitForTimeout(450);
  const check = await page.evaluate(() => {
    const W = innerWidth, H = innerHeight;
    const btns = [...document.querySelectorAll('.screen--neon button')].map((b) => {
      const r = b.getBoundingClientRect();
      return { l: b.getAttribute('aria-label'), x: r.x, y: r.y, w: r.width, h: r.height };
    });
    const fuera = btns.filter((b) => b.x < -1 || b.y < -1 || b.x + b.w > W + 1 || b.y + b.h > H + 1).map((b) => b.l);
    const chicos = btns.filter((b) => b.w < 45.5 || b.h < 45.5).map((b) => b.l + ' ' + b.w.toFixed(0));
    const over = [];
    for (let i = 0; i < btns.length; i++) for (let j = i + 1; j < btns.length; j++) {
      const a = btns[i], b = btns[j];
      if (a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1) over.push(a.l + ' / ' + b.l);
    }
    const st = document.querySelector('.neon-stage').getBoundingClientRect();
    const sobre = btns.filter((b) => b.x < st.right - 1 && st.x < b.x + b.w - 1 && b.y < st.bottom - 1 && st.y < b.y + b.h - 1).map((b) => b.l);
    // separación mínima entre botones vecinos (dedos torpes)
    let minGap = 1e9;
    for (let i = 0; i < btns.length; i++) for (let j = i + 1; j < btns.length; j++) {
      const a = btns[i], b = btns[j];
      const dx = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w));
      const dy = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h));
      const g = Math.hypot(dx, dy);
      if (g < minGap) minGap = g;
    }
    const d = CL.neon.debug;
    return { vp: [W, H], stage: [Math.round(st.width), Math.round(st.height)], pctStage: +((st.width * st.height) / (W * H) * 100).toFixed(0),
      fuera, chicos, superpuestos: over, sobrePizarra: sobre, minGap: +minGap.toFixed(1), S: d.S, dpr: d.dpr,
      canvasPx: document.querySelector('.neon-paint').width };
  });
  await shot(page, `neon/rev/layout/${name}-1-vacio`);
  const r = await rect(page, '.neon-stage');
  await page.locator('.neon-mirror').nth(4).click();
  await page.locator('.neon-swatch').nth(8).click();
  await page.locator('.neon-size').nth(2).click();
  const p1 = [], p2 = [];
  for (let i = 0; i <= 40; i++) {
    const a = i / 40;
    p1.push([r.x + r.width * (0.52 + 0.33 * a), r.y + r.height * (0.35 + 0.18 * Math.sin(a * 7))]);
    p2.push([r.x + r.width * (0.5 + 0.12 * Math.cos(a * 5)), r.y + r.height * (0.08 + 0.3 * a)]);
  }
  if (t.size.touch) {
    await multiStroke(page, [p1, p2], { steps: 40, delay: 5, release: false });
    await shot(page, `neon/rev/layout/${name}-2-durante`);
    await touches(page, []);
  } else {
    await stroke(page, p1, { steps: 40 });
    await stroke(page, p2, { steps: 40, release: false });
    await shot(page, `neon/rev/layout/${name}-2-durante`);
    await page.mouse.up();
  }
  await page.waitForTimeout(200);
  await shot(page, `neon/rev/layout/${name}-3-despues`);
  console.log(name, JSON.stringify(check), 'errors', JSON.stringify(t.errors));
  await t.close();
}
