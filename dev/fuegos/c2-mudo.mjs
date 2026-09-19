// Corrección 2 — con el sonido apagado no se pre-sintetizan explosiones; al activarlo sí. Y salir limpia todo.
import { launch, appUrl } from '../lib.mjs';
const t = await launch({ size: 'tablet' });
await t.context.addInitScript(() => localStorage.setItem('colorinche.muted', 'true'));
await t.page.goto(appUrl('fuegos'));
await t.page.waitForTimeout(1500);
const muted = await t.page.evaluate(() => CL.fuegos._debug.state().booms.length);
await t.page.evaluate(() => CL.sound.setMuted(false));
await t.page.waitForTimeout(2500);
const on = await t.page.evaluate(() => CL.fuegos._debug.state().booms.length);
await t.page.evaluate(() => { CL.fuegos._debug.explode(500, 300, 'crisantemo'); CL.router.go('neon'); });
await t.page.waitForTimeout(800);
const left = await t.page.evaluate(() => ({ st: CL.fuegos._debug.state(), screen: CL.router.current.name }));
console.log(JSON.stringify({ muted, on, left }), JSON.stringify(t.errors));
await t.close();
