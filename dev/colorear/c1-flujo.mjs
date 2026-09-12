// Revisión QA 2 — flujos: "¡Terminé!" (doble toque, volver atrás del sistema), recarga inmediata tras un balde,
// abrir desde la galería, y fugas de listeners al entrar/salir muchas veces.
import { launch, appUrl, shot } from '../lib.mjs';
import { ready, P, hit, hitSel, paintAt, samplePaint, filterErrors, tap } from '../review-colorear/common.mjs';

const size = process.argv[2] || 'tablet';
const t = await launch({ size });
const { page } = t;
const out = {};
const log = (k, v) => { out[k] = v; console.log(k, JSON.stringify(v)); };

// Cantidad de listeners en window/document (CDP).
const cdp = await page.context().newCDPSession(page);
async function listeners() {
  const res = {};
  for (const expr of ['window', 'document']) {
    const { result } = await cdp.send('Runtime.evaluate', { expression: expr });
    const { listeners } = await cdp.send('DOMDebugger.getEventListeners', { objectId: result.objectId });
    const m = {};
    for (const l of listeners) m[l.type] = (m[l.type] || 0) + 1;
    res[expr] = m;
  }
  return res;
}

await page.goto(appUrl('inicio'));
await page.waitForTimeout(600);
const L0 = await listeners();

// 1) Pintar y "¡Terminé!" con doble toque rapidísimo.
await page.evaluate(() => CL.router.go('dibujos/granja'));
await page.waitForSelector('.dj-item');
await page.evaluate(() => CL.router.go('colorear/vaca'));
await ready(page);
await paintAt(t, 0.5, 0.5);
await paintAt(t, 0.05, 0.05);
const db = await page.locator('.cl-done').boundingBox();
await hit(t, db.x + db.width / 2, db.y + db.height / 2);
await page.waitForTimeout(60);
await hit(t, db.x + db.width / 2, db.y + db.height / 2);
await page.waitForTimeout(700);
await shot(page, `colorear/c1-flujo-${size}-1-festejo`);
await page.waitForTimeout(2600);
log('hashTrasTermine', await page.evaluate(() => location.hash));
log('obrasTrasTermine', await page.evaluate(async () => (await CL.db.works.list({ kind: 'colorear' })).map((w) => w.source + ':' + w.status)));
await shot(page, `colorear/c1-flujo-${size}-2-galeria`);

// 2) El chico toca "atrás" del sistema (Android) desde la galería.
await page.evaluate(() => history.back());
await page.waitForTimeout(1500);
log('hashTrasAtras', await page.evaluate(() => location.hash));
const st = await page.evaluate(() => {
  const s = CL.coloring.screen;
  if (!s || !s.painter) return null;
  const c = s.painter.canvas, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0; for (let i = 3; i < d.length; i += 64) if (d[i]) n++;
  return { pintados: n, workId: s.work && s.work.id };
});
log('pantallaTrasAtras', st);
await shot(page, `colorear/c1-flujo-${size}-3-atras-desde-galeria`);
// y otra vez atrás
await page.evaluate(() => history.back());
await page.waitForTimeout(1200);
log('hashTrasAtras2', await page.evaluate(() => location.hash));

// 3) Recarga inmediata después de un balde (antes del guardado).
await page.evaluate(() => CL.router.go('colorear/cerdo'));
await page.evaluate(() => CL.router.go('colorear/chancho'));
await ready(page);
await hitSel(t, '.cl-sw[data-color="#27ae4f"]');
const [x, y] = await P(page, 0.5, 0.5);
await hit(t, x, y);
await page.waitForTimeout(30);           // en medio de la animación del balde
await page.reload();
await ready(page);
await page.waitForTimeout(500);
log('trasRecargaInmediata', await samplePaint(page, [[0.5, 0.5]]));
await shot(page, `colorear/c1-flujo-${size}-4-recarga-inmediata`);

// 4) Entrar y salir 8 veces de colorear: listeners y memoria.
await page.evaluate(() => CL.router.go('inicio'));
await page.waitForTimeout(600);
await cdp.send('HeapProfiler.collectGarbage');
const mem0 = await page.evaluate(() => performance.memory && performance.memory.usedJSHeapSize);
const L1 = await listeners();
for (let i = 0; i < 8; i++) {
  await page.evaluate(() => CL.router.go('colorear/leon'));
  await ready(page);
  await paintAt(t, 0.5, 0.35, 350);
  await page.evaluate(() => CL.router.go('inicio'));
  await page.waitForTimeout(500);
}
await page.waitForTimeout(800);
await cdp.send('HeapProfiler.collectGarbage');
const mem1 = await page.evaluate(() => performance.memory && performance.memory.usedJSHeapSize);
const L2 = await listeners();
log('listenersInicio', L0);
log('listenersAntes', L1);
log('listenersDespues8', L2);
log('heapMB', [mem0 / 1e6, mem1 / 1e6].map((v) => Math.round(v * 10) / 10));
log('errores', filterErrors(t.errors));
await t.close();
