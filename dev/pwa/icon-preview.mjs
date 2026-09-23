// Colorinche — vista previa del ícono a varios tamaños y fondos (para iterar el diseño).
// Uso: cd dev && node pwa/icon-preview.mjs [archivo.svg]
//   Genera dev/shots/pwa/icon-preview.png (tamaños 32..512 sobre fondo claro, oscuro y de "pantalla de inicio").
import fs from 'node:fs';
import path from 'node:path';
import { launch, shot, APP } from '../lib.mjs';
import { variants } from './icon-variants.mjs';

const file = process.argv[2] || path.join(APP, 'icons', 'icon.svg');
const svg = fs.readFileSync(file, 'utf8');
const v = variants(svg);
const uri = (s) => 'data:image/svg+xml;base64,' + Buffer.from(s).toString('base64');

const sizes = [32, 48, 64, 96, 192];
const row = (bg, s) => `<div class="row" style="background:${bg}">` +
  sizes.map((n) => `<img src="${uri(s)}" width="${n}" height="${n}">`).join('') + '</div>';

const html = `<!doctype html><html><body style="margin:0;font:14px sans-serif">
<style>.row{display:flex;align-items:center;gap:24px;padding:16px}.big{display:flex;gap:24px;padding:16px;background:#eee;align-items:center}
.mask{position:relative;width:256px;height:256px}.mask img{position:absolute;inset:0}
.mask .c{position:absolute;inset:0;border-radius:50%;clip-path:circle(40% at 50% 50%)}
.home{display:grid;grid-template-columns:repeat(4,72px);gap:22px;padding:24px;background:linear-gradient(#35507a,#7a4f86)}
.home img{width:72px;height:72px}.home .sq{border-radius:16px}.home .ci{border-radius:50%}</style>
${row('#ffffff', v.any)}${row('#2b2240', v.any)}${row('#9ad0ff', v.any)}
<div class="big">
  <img src="${uri(v.any)}" width="384" height="384">
  <div class="mask"><img src="${uri(v.maskable)}" width="256" height="256" style="opacity:.35"><img class="c" src="${uri(v.maskable)}" width="256" height="256"></div>
  <img src="${uri(v.apple)}" width="180" height="180" style="border-radius:40px">
</div>
<div class="home">
  <img class="sq" src="${uri(v.maskable)}"><img class="ci" src="${uri(v.maskable)}"><img src="${uri(v.any)}"><img class="sq" src="${uri(v.apple)}">
</div>
</body></html>`;

const t = await launch({ size: { width: 1100, height: 1100, dpr: 1 } });
await t.page.setContent(html);
await t.page.waitForTimeout(300);
const out = await shot(t.page, 'pwa/icon-preview', { fullPage: true });
console.log(out, t.errors);
await t.close();
