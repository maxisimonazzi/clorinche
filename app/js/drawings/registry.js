/* Colorines — registro de dibujos para colorear.

   Cada archivo de categoría llama:
     CL.drawings.add('granja', 'vaca', 'Vaca', `...formas SVG...`);
   El contenido va dentro de un <g> con el estilo estándar (contorno negro grueso, relleno blanco),
   en un lienzo de 1000 x 1000. Ver dev/ARQUITECTURA.md para las reglas de dibujo. */
'use strict';
(function (CL) {
  const SIZE = 1000;
  const STROKE = 16;

  const categories = [
    { id: 'granja', name: 'Granja', color: '#ffcf5c', cover: 'vaca' },
    { id: 'mascotas', name: 'Mascotas', color: '#ff9fb2', cover: 'perro' },
    { id: 'selva', name: 'Selva', color: '#7ed957', cover: 'leon' },
    { id: 'mar', name: 'Mar', color: '#5ccfff', cover: 'ballena' },
    { id: 'dinosaurios', name: 'Dinosaurios', color: '#9be15d', cover: 'trex' },
    { id: 'vehiculos', name: 'Vehículos', color: '#ff8a5c', cover: 'auto' },
    { id: 'naturaleza', name: 'Naturaleza', color: '#b8e986', cover: 'flor' },
    { id: 'comida', name: 'Comida', color: '#ffb3d9', cover: 'helado' },
    { id: 'fantasia', name: 'Fantasía', color: '#c9a6ff', cover: 'unicornio' },
    { id: 'paisajes', name: 'Paisajes', color: '#8ed8c8', cover: 'playa' },
    { id: 'mis', name: 'Mis dibujos', color: '#ffd9a0', cover: null },
  ];

  const byId = Object.create(null);
  const order = [];

  function wrap(inner, size) {
    const s = size ? ` width="${size}" height="${size}"` : ` width="${SIZE}" height="${SIZE}"`;
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}"${s}>` +
      `<rect width="${SIZE}" height="${SIZE}" fill="#fff"/>` +
      `<g fill="#fff" stroke="#000" stroke-width="${STROKE}" stroke-linecap="round" stroke-linejoin="round">` +
      inner +
      `</g></svg>`
    );
  }

  CL.drawings = {
    SIZE,
    STROKE,
    categories,
    category(id) { return categories.find((c) => c.id === id) || null; },

    add(cat, id, name, inner) {
      if (byId[id]) console.warn('Dibujo repetido:', id);
      byId[id] = { id, cat, name, inner };
      if (!order.includes(id)) order.push(id);
    },

    get(id) { return byId[id] || null; },
    list(cat) { return order.map((id) => byId[id]).filter((d) => !cat || d.cat === cat); },
    all() { return order.map((id) => byId[id]); },

    /** SVG completo (string). `size` fija width/height para rasterizar nítido a ese tamaño. */
    svg(id, size) {
      const d = byId[id];
      return d ? wrap(d.inner, size) : null;
    },
    wrap,
  };
})(window.CL);
