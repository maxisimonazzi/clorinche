// ¿El Worker del módulo anda de verdad (sin caer al hilo principal)? node subir/worker-app.mjs
import { launch, appUrl } from '../lib.mjs';
import { IMG, INPUT } from '../review-subir/common.mjs';
const t = await launch({ size: 'desktop' });
const { page } = t;
await page.goto(appUrl('subir'));
await page.waitForFunction(() => window.CL && CL.upload && CL.upload.debug());
await page.setInputFiles(INPUT, IMG('pagina-sombra.jpg'));
await page.waitForFunction(() => CL.upload.debug().view === 'edit' && !CL.upload.debug().busy, null, { timeout: 30000 });
await page.waitForTimeout(1500);
console.log(JSON.stringify(await page.evaluate(() => CL.upload._p.workerState())), JSON.stringify(t.errors));
await t.close();
