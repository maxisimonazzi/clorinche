import { launch, appUrl } from '../lib.mjs';
const t = await launch({ size: 'tablet' });
await t.page.goto(appUrl('inicio'));
console.log(await t.page.evaluate(() => { const o = {}; for (const m of [1, 2, 3, 4, 4.9, 6, 8, 9.9, 12]) { try { localStorage.setItem('x', 'a'.repeat(m * 1e6)); o[m] = 'ok'; } catch (e) { o[m] = e.name; } } localStorage.removeItem('x'); return o; }));
await t.close();
