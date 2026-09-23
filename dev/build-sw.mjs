// Colorinche — genera la lista de archivos y la versión del service worker (app/sw.js).
//
// Escanea app/ (todo menos sw.js y archivos ocultos/basura), calcula una versión = hash SHA-256 del
// contenido de todos los archivos y reescribe en app/sw.js el bloque entre los marcadores
//   // <build-sw> ... // </build-sw>
// Correrlo SIEMPRE como último paso antes de publicar, cada vez que cambie algo en app/: si no, sw.js queda
// igual byte a byte y los dispositivos que ya la instalaron NUNCA reciben los cambios (la caché manda).
//
// Uso:
//   cd dev && node build-sw.mjs           → actualiza app/sw.js
//   cd dev && node build-sw.mjs --check   → no escribe; sale con código 1 si sw.js está desactualizado
//   --app <carpeta>                       → procesa otra copia de la app (pruebas de actualización)
// También se puede importar: `import { buildSw } from './build-sw.mjs'` (lo usa serve.mjs para avisar).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const DEV = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_APP = path.resolve(DEV, '..', 'app');
const START = '// <build-sw>';
const END = '// </build-sw>';
const IGNORE = new Set(['sw.js', 'Thumbs.db', 'desktop.ini', '.DS_Store']);

/** Lista recursiva de archivos de app/ con rutas relativas estilo URL ('css/core.css'). */
function scan(dir, base = '') {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith('.') || IGNORE.has(ent.name) || ent.name.endsWith('.map') || ent.name.endsWith('~')) continue;
    const rel = base ? base + '/' + ent.name : ent.name;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...scan(full, rel));
    else if (ent.isFile()) out.push(rel);
  }
  return out;
}

/**
 * Ruta relativa → forma en que aparece en `url.pathname` (lo que compara el SW).
 * Cada segmento se codifica entero (encodeURIComponent: '#', '?', '%' y espacios también, que con encodeURI
 * cortarían la URL: 'foto #1.png' pedía 'foto%20'), y se dejan tal cual los signos que el navegador no
 * codifica en una ruta (! $ & ' ( ) * + , ; = : @), para que coincida con lo que llega al SW.
 */
export function urlPath(rel) {
  return rel.split('/').map((seg) => encodeURIComponent(seg).replace(/%(21|24|26|27|28|29|2A|2B|2C|3B|3D|3A|40)/gi, (m) => decodeURIComponent(m))).join('/');
}

/**
 * Calcula el contenido que debería tener sw.js para la carpeta `app`.
 * Devuelve { version, files, bytes, current, next, upToDate, sw } o tira un Error si falta algo.
 */
export function buildSw(app = DEFAULT_APP) {
  const sw = path.join(app, 'sw.js');
  // index.html primero (es lo más importante), el resto ordenado.
  const files = scan(app).sort((a, b) => (a === 'index.html' ? -1 : b === 'index.html' ? 1 : a < b ? -1 : a > b ? 1 : 0));
  if (!files.includes('index.html')) throw new Error('No encuentro index.html en ' + app);

  const hash = crypto.createHash('sha256');
  let bytes = 0;
  for (const f of files) {
    const buf = fs.readFileSync(path.join(app, f));
    bytes += buf.length;
    hash.update(f + '\0' + buf.length + '\0');
    hash.update(buf);
  }
  // El código del propio sw.js (fuera del bloque generado) también entra en la versión: si cambia la lógica
  // del SW, cambia el nombre de la caché y la instalación nueva nunca pisa ni borra la caché de la anterior.
  const current = fs.readFileSync(sw, 'utf8');
  const i = current.indexOf(START), j = current.indexOf(END);
  if (i < 0 || j < i) throw new Error(sw + ' no tiene los marcadores ' + START + ' / ' + END);
  hash.update('sw.js' + String.fromCharCode(0) + current.slice(0, i) + current.slice(j + END.length));
  const version = hash.digest('hex').slice(0, 12);

  const block =
    `${START} (generado por dev/build-sw.mjs — no editar a mano)\n` +
    `const VERSION = '${version}';\n` +
    `const FILES = [\n` + files.map((f) => `  '${urlPath(f).replace(/'/g, "\\'")}',`).join('\n') + `\n];\n` +
    END;

  const next = current.slice(0, i) + block + current.slice(j + END.length);
  return { version, files, bytes, current, next, upToDate: next === current, sw };
}

// Ejecutado directamente (no importado).
const norm = (p) => (process.platform === 'win32' ? p.toLowerCase() : p);
if (process.argv[1] && norm(path.resolve(process.argv[1])) === norm(fileURLToPath(import.meta.url))) {
  const appArg = process.argv.indexOf('--app');
  const app = appArg >= 0 ? path.resolve(process.argv[appArg + 1]) : DEFAULT_APP;
  let r;
  try { r = buildSw(app); } catch (e) { console.error(e.message); process.exit(2); }
  if (process.argv.includes('--check')) {
    if (!r.upToDate) { console.error(`sw.js DESACTUALIZADO (versión nueva ${r.version}). Correr: node dev/build-sw.mjs`); process.exit(1); }
    console.log(`sw.js al día: versión ${r.version}, ${r.files.length} archivos.`);
  } else {
    if (!r.upToDate) fs.writeFileSync(r.sw, r.next);
    console.log(`sw.js ${r.upToDate ? 'sin cambios' : 'actualizado'}: versión ${r.version}, ${r.files.length} archivos, ${(r.bytes / 1024).toFixed(0)} KB.`);
  }
}
