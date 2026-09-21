// Siembra obras de prueba desde la página (thumbs en canvas). Formas y proporciones variadas.
export async function seed(page, { done = 9, progress = 3, missingThumb = false } = {}) {
  return page.evaluate(async ({ done, progress, missingThumb }) => {
    const U = CL.util;
    const pal = ['#ff5a5f', '#ff9f1c', '#ffd23f', '#2bc48a', '#4cc3ff', '#7b61ff', '#ff8fc7'];
    const kinds = ['colorear', 'pizarra', 'neon'];
    const ids = [];
    const n = done + progress;
    for (let i = 0; i < n; i++) {
      const kind = kinds[i % 3];
      // proporciones: colorear cuadrado, pizarra apaisada 16:10 o vertical, neón apaisado/vertical
      let w = 480, h = 480;
      if (kind === 'pizarra') { if (i % 2) { w = 480; h = 300; } else { w = 300; h = 480; } }
      if (kind === 'neon') { if (i % 2) { w = 480; h = 270; } else { w = 270; h = 480; } }
      const c = U.canvas(w, h);
      const x = c.getContext('2d');
      x.fillStyle = kind === 'neon' ? '#0d0620' : '#fff';
      x.fillRect(0, 0, w, h);
      x.lineWidth = 14; x.lineCap = 'round';
      for (let k = 0; k < 5; k++) {
        x.strokeStyle = pal[(i + k) % pal.length];
        x.beginPath();
        x.arc(w / 2, h / 2, 20 + k * 22, k, k + 4.5);
        x.stroke();
      }
      x.fillStyle = kind === 'neon' ? '#fff' : '#000';
      x.font = 'bold 64px sans-serif';
      x.fillText(String(i), 12, 64);
      const thumb = await U.canvasToBlob(c, i % 2 ? 'image/jpeg' : 'image/png', 0.9);
      const wk = await CL.db.works.save({
        kind,
        source: kind === 'colorear' ? (i % 2 ? 'vaca' : 'gato') : kind,
        status: i < done ? 'done' : 'progress',
        w: w * 2, h: h * 2,
        paint: await U.canvasToBlob(U.canvas(w * 2, h * 2), 'image/png'),
        thumb: missingThumb && i === 0 ? null : thumb,
        meta: kind === 'pizarra' ? { bg: 'blanco' } : {},
      });
      ids.push({ id: wk.id, kind, status: wk.status, i });
      await new Promise((r) => setTimeout(r, 3));
    }
    return ids;
  }, { done, progress, missingThumb });
}

// Cuenta URLs de blob vivas y listeners de document (para fugas).
export const instrument = () => {
  const live = new Set();
  const c = URL.createObjectURL.bind(URL), r = URL.revokeObjectURL.bind(URL);
  URL.createObjectURL = (o) => { const u = c(o); live.add(u); return u; };
  URL.revokeObjectURL = (u) => { live.delete(u); return r(u); };
  window.__liveUrls = () => live.size;
  const counts = {};
  const add = EventTarget.prototype.addEventListener, rem = EventTarget.prototype.removeEventListener;
  EventTarget.prototype.addEventListener = function (type, fn, o) {
    if (this === document || this === window) counts[type] = (counts[type] || 0) + 1;
    return add.call(this, type, fn, o);
  };
  EventTarget.prototype.removeEventListener = function (type, fn, o) {
    if (this === document || this === window) counts[type] = (counts[type] || 0) - 1;
    return rem.call(this, type, fn, o);
  };
  window.__listeners = () => Object.assign({}, counts);
};
