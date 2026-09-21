// Siembra obras de prueba (los 3 tipos, terminadas y sin terminar) desde la página.
// Devuelve la lista de ids en orden de guardado (el último es el más nuevo).
export async function seed(page, { done = 9, progress = 3 } = {}) {
  return page.evaluate(async ({ done, progress }) => {
    const U = CL.util;
    const pal = ['#ff5a5f', '#ff9f1c', '#ffd23f', '#2bc48a', '#4cc3ff', '#7b61ff', '#ff8fc7'];
    function thumbFor(kind, i) {
      let w = 480, h = 480;
      if (kind === 'pizarra') { w = 480; h = 300; }
      if (kind === 'neon') { w = 300; h = 480; }
      const c = U.canvas(w, h);
      const x = c.getContext('2d');
      if (kind === 'colorear') {
        x.fillStyle = '#fff'; x.fillRect(0, 0, w, h);
        // "dibujo" pintado: panza, cabeza, orejas, con contorno negro
        const col = (k) => pal[(i + k) % pal.length];
        x.lineWidth = 10; x.strokeStyle = '#000';
        x.fillStyle = col(0); x.beginPath(); x.ellipse(240, 320, 150, 110, 0, 0, 7); x.fill(); x.stroke();
        x.fillStyle = col(2); x.beginPath(); x.arc(240, 170, 95, 0, 7); x.fill(); x.stroke();
        x.fillStyle = col(4); x.beginPath(); x.arc(160, 90, 38, 0, 7); x.fill(); x.stroke();
        x.beginPath(); x.arc(320, 90, 38, 0, 7); x.fill(); x.stroke();
        x.fillStyle = '#000'; x.beginPath(); x.arc(205, 160, 11, 0, 7); x.arc(275, 160, 11, 0, 7); x.fill();
        x.beginPath(); x.lineWidth = 7; x.arc(240, 190, 35, 0.2, Math.PI - 0.2); x.stroke();
        x.font = 'bold 60px sans-serif'; x.fillStyle = '#000'; x.fillText(String(i), 20, 460);
      } else if (kind === 'pizarra') {
        x.fillStyle = ['#ffffff', '#fff3c4', '#dff4ff', '#27433a'][i % 4]; x.fillRect(0, 0, w, h);
        x.lineCap = 'round'; x.lineJoin = 'round';
        for (let k = 0; k < 6; k++) {
          x.strokeStyle = pal[(i + k) % pal.length]; x.lineWidth = 8 + k * 2;
          x.beginPath();
          for (let s = 0; s <= 20; s++) {
            const px = 30 + s * 21, py = 60 + k * 36 + Math.sin(s * 0.7 + k + i) * 24;
            s ? x.lineTo(px, py) : x.moveTo(px, py);
          }
          x.stroke();
        }
        x.font = 'bold 50px sans-serif'; x.fillStyle = '#000'; x.fillText(String(i), 16, 285);
      } else {
        x.fillStyle = '#0d0620'; x.fillRect(0, 0, w, h);
        x.lineCap = 'round';
        for (let k = 0; k < 4; k++) {
          const c1 = ['#ff4fd8', '#4dfcff', '#b6ff4d', '#ffe24d'][(i + k) % 4];
          x.shadowColor = c1; x.shadowBlur = 24; x.strokeStyle = c1; x.lineWidth = 12;
          x.beginPath(); x.arc(150, 240, 40 + k * 28, k, k + 4); x.stroke();
          x.shadowBlur = 0; x.strokeStyle = '#fff'; x.lineWidth = 3; x.stroke();
        }
        x.font = 'bold 50px sans-serif'; x.fillStyle = '#fff'; x.fillText(String(i), 16, 460);
      }
      return c;
    }
    const kinds = ['colorear', 'pizarra', 'neon'];
    const ids = [];
    const n = done + progress;
    for (let i = 0; i < n; i++) {
      const kind = kinds[i % 3];
      const c = thumbFor(kind, i);
      // alternamos PNG y JPEG para probar la conversión al descargar
      const thumb = await U.canvasToBlob(c, i % 2 ? 'image/jpeg' : 'image/png', 0.9);
      const w = await CL.db.works.save({
        kind,
        source: kind === 'colorear' ? (i % 2 ? 'vaca' : 'u-prueba') : kind,
        status: i < done ? 'done' : 'progress',
        w: c.width * 2, h: c.height * 2,
        paint: new Blob([], { type: 'image/png' }),
        thumb,
        meta: kind === 'pizarra' ? { bg: 'blanco' } : {},
      });
      ids.push({ id: w.id, kind, status: w.status });
      await new Promise((r) => setTimeout(r, 4));
    }
    return ids;
  }, { done, progress });
}
