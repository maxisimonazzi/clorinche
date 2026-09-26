// Aplica reemplazos exactos en app/js/drawings/mascotas.js a partir de un JSON [[viejo, nuevo], ...].
// Uso: cd dev && node mascotas/reemplazar.cjs cambios.json
const fs = require('fs');
const path = require('path');
const f = path.join(__dirname, '..', '..', 'app', 'js', 'drawings', 'mascotas.js');
const rep = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
let s = fs.readFileSync(f, 'utf8');
let ok = 0;
for (const [a, b] of rep) {
  if (!s.includes(a)) { console.log('NO ENCONTRADO:', a.slice(0, 70)); continue; }
  s = s.replace(a, b); ok++;
}
fs.writeFileSync(f, s);
console.log(`${ok}/${rep.length} reemplazos`);
