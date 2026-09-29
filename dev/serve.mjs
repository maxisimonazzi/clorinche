// Colorines — servidor estático mínimo para probar la app por http (service worker + instalación).
// Sin dependencias. Sirve la carpeta app/.
//
// Uso:
//   cd dev && node serve.mjs            → http://localhost:8765/
//   cd dev && node serve.mjs 9000       → otro puerto
//   cd dev && node serve.mjs 8765 --lan → escucha también en la red local (para abrirla desde una tablet;
//                                         ojo: por http a una IP de la red el navegador NO habilita el
//                                         service worker ni la instalación, eso requiere https o localhost)
//   --root <carpeta>                     → sirve otra carpeta (lo usan las pruebas de actualización)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { buildSw } from './build-sw.mjs';

const DEV = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const rootArg = args.indexOf('--root');
const ROOT = rootArg >= 0 ? path.resolve(args[rootArg + 1]) : path.resolve(DEV, '..', 'app');
const PORT = Number(args.find((a) => /^\d+$/.test(a))) || 8765;
const HOST = args.includes('--lan') ? '0.0.0.0' : '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

// Ningún pedido raro puede tirar abajo el servidor.
const server = http.createServer((req, res) => {
  try { handle(req, res); } catch (e) {
    console.error(e);
    if (!res.headersSent) res.writeHead(500).end(); else res.destroy();
  }
});

function handle(req, res) {
  const log = (code) => console.log(`${code} ${req.method} ${req.url}`);
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return log(405);
  }
  let rel, pathname;
  try {
    pathname = new URL(req.url, 'http://x').pathname;
    rel = decodeURIComponent(pathname);
  } catch (e) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Pedido inválido');
    return log(400);
  }
  // Caracteres que el sistema de archivos no acepta (fs tira una excepción con \0).
  if (/[\0<>|"?*]/.test(rel)) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Pedido inválido');
    return log(400);
  }
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.normalize(path.join(ROOT, rel));
  // Nada fuera de app/.
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) {
    res.writeHead(403).end();
    return log(403);
  }
  fs.stat(file, (err, st) => {
    // Carpeta sin barra final (/icons) → /icons/ para que las rutas relativas se resuelvan bien.
    if (!err && st.isDirectory()) {
      const q = req.url.indexOf('?');
      res.writeHead(301, { Location: pathname + '/' + (q >= 0 ? req.url.slice(q) : '') }).end();
      return log(301);
    }
    if (err || !st.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('No encontrado');
      return log(404);
    }
    const etag = `"${st.size.toString(36)}-${Math.round(st.mtimeMs).toString(36)}-${st.ino ? st.ino.toString(36) : ''}"`;
    const headers = {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': st.size,
      // Sin caché HTTP agresiva: el navegador puede guardar pero pregunta siempre si cambió.
      'Cache-Control': 'no-cache',
      'Last-Modified': st.mtime.toUTCString(),
      // ETag exacto (tamaño + fecha con milisegundos + n.º de archivo): si en el mismo puerto se sirve otra carpeta, un archivo
      // distinto nunca se confunde con el guardado (comparar sólo "modificado desde" sí lo confundía).
      ETag: etag,
      'X-Content-Type-Options': 'nosniff',
    };
    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304, { 'Cache-Control': 'no-cache', ETag: etag, 'Last-Modified': headers['Last-Modified'] }).end();
      return log(304);
    }
    res.writeHead(200, headers);
    if (req.method === 'HEAD') { res.end(); return log(200); }
    fs.createReadStream(file).on('error', () => res.destroy()).pipe(res);
    log(200);
  });
}

server.on('error', (e) => {
  console.error(e.code === 'EADDRINUSE' ? `El puerto ${PORT} está ocupado: probá con otro (node serve.mjs 9000).` : e);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`Colorines en http://localhost:${PORT}/  (carpeta ${ROOT})`);
  if (HOST === '0.0.0.0') {
    for (const list of Object.values(os.networkInterfaces())) {
      for (const a of list || []) if (a.family === 'IPv4' && !a.internal) console.log(`  en la red local: http://${a.address}:${PORT}/`);
    }
  }
  console.log('Ctrl+C para cortar.');
  // Aviso si sw.js no está al día con los archivos (los dispositivos instalados no verían los cambios).
  try {
    const r = buildSw(ROOT);
    if (!r.upToDate) console.log(`AVISO: sw.js está desactualizado (versión nueva ${r.version}). Antes de publicar corré: node build-sw.mjs`);
  } catch (e) { /* carpeta sin sw.js o sin marcadores: nada que avisar */ }
});
