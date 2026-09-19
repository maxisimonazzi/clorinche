// Experimento: ¿qué tamaños de Blob / ArrayBuffer sobreviven a una escritura con commit() en pagehide?
import { launch, appUrl, SHOTS } from '../lib.mjs';
import path from 'node:path'; import fs from 'node:fs';
const prof = path.join(SHOTS, 'neon', '_perfil-exp3'); fs.rmSync(prof, { recursive: true, force: true });
const t = await launch({ size: 'tablet', persistent: prof });
const { page } = t;
await page.goto(appUrl('inicio'));
await page.waitForTimeout(500);
await page.evaluate(async () => {
  await CL.db.works.list();
  const mine = await new Promise((r) => { const q = indexedDB.open('colorinche'); q.onsuccess = () => r(q.result); });
  const rnd = (n) => { const a = new Uint8Array(n); for (let i = 0; i < n; i += 65536) crypto.getRandomValues(a.subarray(i, Math.min(n, i + 65536))); return a; };
  addEventListener('pagehide', () => {
    const put = (v) => { const tx = mine.transaction('works', 'readwrite'); tx.objectStore('works').put(v); tx.commit(); };
    for (const kb of [30, 60, 120, 250, 600, 1500]) {
      put({ id: 'b' + kb, kind: 'exp', source: 'exp', paint: new Blob([rnd(kb * 1024)]) });
      put({ id: 'a' + kb, kind: 'exp', source: 'exp', buf: rnd(kb * 1024).buffer });
    }
  });
});
await page.reload();
await page.waitForTimeout(800);
console.log(await page.evaluate(async () => (await CL.db.works.list()).map((w) => w.id)));
await t.close();
