// Revisión neón: costo del guardado (PNG del lienzo cuadrado completo + JPEG de la miniatura).
import { launch, appUrl, multiStroke, rect } from '../lib.mjs';

for (const size of process.argv.slice(2).length ? process.argv.slice(2) : ['tablet', 'phone', 'phoneH', 'desktop']) {
  const t = await launch({ size });
  const { page } = t;
  await page.goto(appUrl('neon'));
  await page.waitForFunction(() => CL.neon && CL.neon.debug && CL.neon.debug.ready);
  const r = await rect(page, '.neon-stage');
  const pts = [];
  for (let i = 0; i <= 40; i++) pts.push([r.x + r.width * (0.1 + 0.8 * i / 40), r.y + r.height * (0.5 + 0.3 * Math.sin(i / 3))]);
  await multiStroke(page, [pts], { steps: 40, delay: 4 });
  await page.waitForTimeout(3000);
  const res = await page.evaluate(async () => {
    const c = document.querySelector('.neon-paint');
    const times = [];
    let size = 0;
    for (let i = 0; i < 3; i++) {
      const t0 = performance.now();
      const b = await CL.util.canvasToBlob(c, 'image/png');
      times.push(Math.round(performance.now() - t0));
      size = b.size;
    }
    // Bloqueo del hilo principal durante un toBlob (frames largos)
    let long = 0, last = performance.now(), run = true;
    const loop = (now) => { if (now - last > 50) long++; last = now; if (run) requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    await CL.util.canvasToBlob(c, 'image/png');
    run = false;
    const w = (await CL.db.works.list({ kind: 'neon' }))[0];
    return { canvas: c.width + 'x' + c.height, pngMs: times, pngKB: Math.round(size / 1024), framesLargos: long, paintKBguardado: w && Math.round(w.paint.size / 1024), thumbKB: w && Math.round(w.thumb.size / 1024) };
  });
  console.log(size, JSON.stringify(res), 'errors', JSON.stringify(t.errors));
  await t.close();
}
