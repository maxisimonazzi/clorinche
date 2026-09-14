// Integración: una imagen guardada aparece en "Mis dibujos" (catálogo del módulo colorear).
import path from 'node:path';
import { launch, appUrl, shot, DEV } from '../lib.mjs';
const t = await launch({ size: 'tablet' });
const { page } = t;
await page.goto(appUrl('subir'));
await page.waitForFunction(() => window.CL && CL.upload && CL.upload.debug());
await page.setInputFiles('.screen--subir .up-input:not([capture])', path.join(DEV, 'subir', 'img', 'foto-pagina-vaca.jpg'));
await page.waitForFunction(() => CL.upload.debug().view === 'edit' && CL.upload.debug().renders > 0);
await page.click('.up-save');
await page.waitForFunction(() => /^#colorear\/u-/.test(location.hash), null, { timeout: 20000 });
const id = await page.evaluate(() => location.hash.slice('#colorear/u-'.length));
await page.reload();
await page.evaluate(() => CL.router.go('dibujos/mis'));
await page.waitForTimeout(1500);
await shot(page, 'subir/tablet-11-mis-dibujos');
console.log(JSON.stringify({ id, enLista: await page.evaluate(async (id) => (await CL.db.uploads.list()).some((u) => u.id === id), id), errors: t.errors }));
await t.close();
