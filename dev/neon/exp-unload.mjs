// Experimento: ¿un guardado sincrónico en pagehide sobrevive a una recarga?
import { launch, appUrl, SHOTS } from '../lib.mjs';
import path from 'node:path';
import fs from 'node:fs';
const prof = path.join(SHOTS, 'neon', '_perfil-exp');
fs.rmSync(prof, { recursive: true, force: true });
const t = await launch({ size: 'tablet', persistent: prof });
const { page } = t;
await page.goto(appUrl('inicio'));
await page.waitForTimeout(500);
await page.evaluate(async () => {
  await CL.db.works.list();
  const mine = await new Promise((r) => { const q = indexedDB.open('colorinche'); q.onsuccess = () => r(q.result); });
  const mk = () => {
    const c = CL.util.canvas(1640, 1640);
    const g = c.getContext('2d'); g.fillStyle = 'red'; g.fillRect(100, 100, 500, 500);
    const url = c.toDataURL('image/png');
    const bin = atob(url.split(',')[1]); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return new Blob([a], { type: 'image/png' });
  };
  addEventListener('pagehide', () => {
    CL.db.works.save({ id: 'expA', kind: 'exp', source: 'exp', paint: mk() });
    const tx = mine.transaction('works', 'readwrite');
    tx.objectStore('works').put({ id: 'expB', kind: 'exp', source: 'exp', paint: mk(), createdAt: 1, updatedAt: 1, status: 'progress', meta: {} });
    tx.commit && tx.commit();
    const tx2 = mine.transaction('works', 'readwrite');
    tx2.objectStore('works').put({ id: 'expC', kind: 'exp', source: 'exp', paint: mk(), createdAt: 1, updatedAt: 1, status: 'progress', meta: {} });
  });
});
await page.reload();
await page.waitForTimeout(800);
const r = await page.evaluate(async () => { const o = {}; for (const id of ['expA', 'expB', 'expC']) { const w = await CL.db.works.get(id); o[id] = w ? w.paint.size : null; } return o; });
console.log('sobrevivió:', r, t.errors);
await t.close();
