// Pizarra — casos extra: la goma vacía una obra terminada, recargar después de "borrar todo",
// seguir dibujando sobre una terminada (la sigue editando) y salir en medio de la barrita.
// Uso: node pizarra/fix2/extra.mjs [desktop|tablet|phone]
import { open, board, wave, stroke, ready, click, inked } from '../fix1/h.mjs';
import { appUrl } from '../../lib.mjs';

const size = process.argv[2] || 'desktop';
const t = await open(size);
const { page } = t;
const pointer = t.size.touch ? 'touch' : 'mouse';
const out = { size, checks: {} };
const ok = (name, cond, extra) => { out.checks[name] = cond ? 'OK' : 'FALLA' + (extra !== undefined ? ' ' + JSON.stringify(extra) : ''); };
const dbInk = (id) => page.evaluate(async (id) => {
  const w = await CL.db.works.get(id);
  if (!w) return null;
  const img = await CL.util.blobToImage(w.paint);
  const c = CL.util.canvas(img.width, img.height); const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height).data;
  let n = 0; for (let i = 3; i < d.length; i += 16) if (d[i] > 8) n++;
  return { ink: n, status: w.status };
}, id);
const list = () => page.evaluate(async () => (await CL.db.works.list({ kind: 'pizarra' })).map((w) => w.id + ':' + w.status));
const cur = () => page.evaluate(() => { const c = CL.pizarra.current; return c && { id: c.work && c.work.id, status: c.work && c.work.status, has: c._test.hasContent }; });

async function makeDone(y) {
  const b = await board(page);
  await page.evaluate(() => { const T = CL.pizarra.current._test; T.selectTool('fibra'); T.selectSize(1); T.selectColor('#8b4dff'); });
  await stroke(page, wave(b, y, 0.4, 0.6, 0.02, 6), { pointer, steps: 8 });
  await page.waitForTimeout(600);
  await click(t, '.pz-done', 0);
  await page.waitForFunction(() => location.hash.startsWith('#obras/'), null, { timeout: 15000 });
  const id = decodeURIComponent(await page.evaluate(() => location.hash.split('/')[1]));
  await page.waitForTimeout(500);
  await page.evaluate(() => history.back());
  await page.waitForFunction(() => document.body.dataset.screen === 'pizarra', null, { timeout: 10000 });
  await ready(page);
  return id;
}

// 1) Seguir dibujando sobre la terminada (sin borrar): la sigue editando, sigue terminada.
const id1 = await makeDone(0.5);
const ink0 = (await dbInk(id1)).ink;
let b = await board(page);
await stroke(page, wave(b, 0.25, 0.2, 0.8), { pointer, steps: 10 });
await page.waitForTimeout(1500);
const e1 = await dbInk(id1);
ok('seguir dibujando edita la terminada (contrato)', e1.ink > ink0 && e1.status === 'done' && (await cur()).id === id1, { ink0, e1 });

// 2) La goma la deja vacía: la terminada conserva lo último con dibujo y lo que sigue es otra obra.
await page.evaluate(() => { const T = CL.pizarra.current._test; T.selectTool('goma'); T.selectSize(3); });
b = await board(page);
for (let y = 0.02; y <= 1; y += 0.03) await stroke(page, [[b.x + 2, b.y + b.height * y], [b.x + b.width - 2, b.y + b.height * y]], { pointer, steps: 6, delay: 0 });
await page.waitForTimeout(1500);
const e2 = { cur: await cur(), db: await dbInk(id1), ink: await inked(page), hash: await page.evaluate(() => location.hash) };
ok('goma hasta vaciar: la terminada no queda vacía (conserva lo último con dibujo)', e2.ink === 0 && e2.db.ink > 0 && e2.db.status === 'done', e2);
ok('goma hasta vaciar: se desprende', !e2.cur.id && e2.hash === '#pizarra', e2);

// 3) Recargar después de desprender: pizarra en blanco (no la terminada); la terminada sigue en la galería.
await page.evaluate(() => CL.pizarra.current._test.selectTool('fibra'));
b = await board(page);
await stroke(page, wave(b, 0.7, 0.3, 0.7), { pointer, steps: 8 });
await page.waitForTimeout(1500);
const newId = (await cur()).id;
await page.reload(); await ready(page);
const e3 = { cur: await cur(), hash: await page.evaluate(() => location.hash), list: await list() };
ok('recargar retoma la obra nueva', e3.cur.id === newId && newId !== id1 && e3.list.includes(id1 + ':done'), e3);

// 4) Salir en medio de la barrita de "borrar todo" sobre una terminada: la terminada queda intacta.
const id2 = await makeDone(0.3);
const d2 = await dbInk(id2);
await page.evaluate(() => { const T = CL.pizarra.current._test; T.wipeMs = 3000; T.wipe(); });
await page.waitForTimeout(500);
await page.evaluate(() => CL.router.go('inicio'));
await page.waitForTimeout(1200);
const e4 = { db: await dbInk(id2), list: await list() };
ok('salir a mitad de la barrita no vacía la terminada', e4.db && e4.db.ink === d2.ink && e4.db.status === 'done', { d2, e4 });
await page.evaluate(() => CL.router.go('pizarra')); await ready(page);
ok('al volver, pizarra en blanco', (await inked(page)) === 0 && !(await cur()).id, await cur());

out.errors = t.errors;
console.log(JSON.stringify(out, null, 1));
await t.close();
