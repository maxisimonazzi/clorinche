// Colorines — compara el ícono completo (icon.svg) con la versión para tamaños chicos (icon-small.svg)
// a 16, 24, 32 y 48 px reales, ampliados sin suavizado, más a tamaño real sobre fondo claro y oscuro
// (pestaña del navegador / barra de tareas). → dev/shots/pwa/icon-chicos.png
// Uso: cd dev && node pwa/icon-chicos.mjs
import fs from 'node:fs';
import path from 'node:path';
import { launch, shot, APP } from '../lib.mjs';

const uri = (f) => 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(APP, 'icons', f)).toString('base64');
const t = await launch({ size: { width: 1180, height: 560, dpr: 1 } });
await t.page.setContent(`<body style="margin:0;background:#dee1e6;font:14px sans-serif;padding:14px">
  <style>.row{display:flex;gap:18px;align-items:flex-end;margin-bottom:14px}.lbl{width:90px}
  canvas.big{width:192px;height:192px;image-rendering:pixelated}.real{display:flex;gap:10px;align-items:center;padding:8px;border-radius:8px}</style>
  <div class="row" id="full"><div class="lbl">completo</div></div>
  <div class="row" id="small"><div class="lbl">chico</div></div>
  <div class="row"><div class="lbl">tamaño real</div><div class="real" id="light" style="background:#fff"></div><div class="real" id="dark" style="background:#202124"></div></div>
</body>`);
await t.page.evaluate(async ({ full, small }) => {
  const load = async (s) => { const i = new Image(); i.src = s; await i.decode(); return i; };
  const imgs = { full: await load(full), small: await load(small) };
  for (const k of ['full', 'small']) {
    for (const s of [16, 24, 32, 48]) {
      const c = document.createElement('canvas'); c.width = c.height = s;
      c.getContext('2d').drawImage(imgs[k], 0, 0, s, s);
      c.className = 'big';
      document.getElementById(k).append(c);
    }
  }
  for (const bg of ['light', 'dark']) {
    for (const k of ['full', 'small']) {
      for (const s of [16, 24, 32]) {
        const c = document.createElement('canvas'); c.width = c.height = s;
        c.getContext('2d').drawImage(imgs[k], 0, 0, s, s);
        document.getElementById(bg).append(c);
      }
    }
  }
}, { full: uri('icon.svg'), small: uri('icon-small.svg') });
console.log(await shot(t.page, 'pwa/icon-chicos'), t.errors);
await t.close();
