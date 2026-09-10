/* Colorinche — zonas pintables a partir de la capa de líneas.

   CL.regions.lineLayer(source, w, h)  -> canvas negro con alfa (alfa = oscuridad de la línea)
   CL.regions.compute(lineCanvas)      -> RegionMap (síncrono)
   CL.regions.computeAsync(lineCanvas) -> Promise<RegionMap> (cede el hilo entre etapas: la UI no se congela)
   CL.regions.mask(map, id, color?)    -> canvas del tamaño del bbox de la zona (opaco donde está la zona)

   RegionMap: { w, h, label: Int32Array, count, area: Uint32Array, bbox: [{x0,y0,x1,y1}],
                locked: Uint8Array, bg, at(x, y), nearest(x, y) }
   - Pared = luminancia < 150 (sobre blanco). Zonas = componentes conexas 4-conectadas del resto.
   - Zonas diminutas (< 0,04 % del área) quedan bloqueadas: son brillitos de ojos y no se pintan.
   - Cada píxel de línea se asigna a la zona más cercana (transformada de distancia en dos pasadas, que
     equivale a un BFS multi-fuente): así la pintura llega hasta el centro de la línea y el antialias del
     borde nunca muestra blanco. Alrededor de un brillito bloqueado la línea queda del brillito (neutra).
   - Rendimiento: ~150-300 ms para 2048×2048 (tramos + unión-búsqueda; ver map.timings). computeAsync lo
     reparte en tramos de filas de ~12 ms, así en una tablet lenta la pantalla sigue respondiendo. */
'use strict';
(function (CL) {
  const WALL_LUM = 150;
  const MIN_AREA_FRAC = 0.0004;

  /** Capa de líneas: negro con alfa = oscuridad, desde un SVG rasterizado o una imagen blanco/negro. */
  function lineLayer(source, w, h) {
    const c = CL.util.canvas(w, h);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, c.width, c.height);
    const im = ctx.getImageData(0, 0, c.width, c.height);
    const d = im.data;
    for (let i = 0; i < d.length; i += 4) {
      const lum = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
      d[i] = d[i + 1] = d[i + 2] = 0;
      d[i + 3] = 255 - lum;
    }
    ctx.putImageData(im, 0, 0);
    return c;
  }

  /** Lee los píxeles de un canvas / ImageData. */
  function pixels(src) {
    if (src && src.data && src.width) return src;
    const ctx = src.getContext('2d', { willReadFrequently: true });
    return ctx.getImageData(0, 0, src.width, src.height);
  }

  /* El cálculo está escrito como generador: `yield` marca los puntos donde se puede ceder el hilo (entre
     etapas y cada ROWS filas). compute() lo corre de un tirón; computeAsync() cede cuando pasó su presupuesto. */
  const ROWS = 64;
  function* job(src) {
    const im = pixels(src);
    const W = im.width, H = im.height, N = W * H;
    const px = new Uint32Array(im.data.buffer, im.data.byteOffset, N);
    const T = [performance.now()];

    // 1) Paredes: luminancia (×1000) del píxel compuesto sobre blanco < 150.
    const wall = new Uint8Array(N);
    const LIM = WALL_LUM * 1000 * 255;
    for (let y0 = 0; y0 < H; y0 += ROWS) {
      const end = Math.min(H, y0 + ROWS) * W;
      for (let p = y0 * W; p < end; p++) {
        const v = px[p];
        if (v === 0xffffffff) continue; // blanco opaco (lo más común)
        const a = v >>> 24;
        const lum = (v & 255) * 299 + ((v >>> 8) & 255) * 587 + ((v >>> 16) & 255) * 114;
        if (lum * a + 255000 * (255 - a) < LIM) wall[p] = 1;
      }
      yield;
    }
    T.push(performance.now());
    yield;

    // 2) Componentes conexas (4-conectado) por tramos horizontales + unión-búsqueda.
    let cap = 1 << 16;
    let rx0 = new Int32Array(cap), rx1 = new Int32Array(cap), ry = new Int32Array(cap), parent = new Int32Array(cap);
    const grow = () => {
      cap *= 2;
      const g = (a) => { const b = new Int32Array(cap); b.set(a); return b; };
      rx0 = g(rx0); rx1 = g(rx1); ry = g(ry); parent = g(parent);
    };
    const find = (i) => {
      let r = i;
      while (parent[r] !== r) r = parent[r];
      while (parent[i] !== r) { const nx = parent[i]; parent[i] = r; i = nx; }
      return r;
    };
    let nRuns = 0, prevStart = 0, prevEnd = 0;
    for (let y = 0; y < H; y++) {
      const base = y * W;
      const rowStart = nRuns;
      let j = prevStart;
      let x = 0;
      while (x < W) {
        while (x < W && wall[base + x]) x++;
        if (x >= W) break;
        const xs = x;
        while (x < W && !wall[base + x]) x++;
        const xe = x - 1;
        if (nRuns >= cap) grow();
        const id = nRuns++;
        rx0[id] = xs; rx1[id] = xe; ry[id] = y; parent[id] = id;
        while (j < prevEnd && rx1[j] < xs) j++;
        for (let k = j; k < prevEnd && rx0[k] <= xe; k++) {
          const a = find(id), b = find(k);
          if (a !== b) { if (a < b) parent[b] = a; else parent[a] = b; }
        }
      }
      prevStart = rowStart;
      prevEnd = nRuns;
      if ((y & (ROWS - 1)) === ROWS - 1) yield;
    }
    T.push(performance.now());
    yield;

    // 3) Numerar componentes (en orden de aparición), áreas, rectángulos y etiquetas por píxel.
    const label = new Int32Array(N).fill(-1);
    const comp = new Int32Array(nRuns).fill(-1);
    const areas = [], ax0 = [], ay0 = [], ax1 = [], ay1 = [];
    let n = 0;
    for (let i = 0; i < nRuns; i++) {
      const r = find(i);
      let c = comp[r];
      if (c < 0) { c = comp[r] = n++; areas.push(0); ax0.push(W); ay0.push(H); ax1.push(-1); ay1.push(-1); }
      const y = ry[i], x0 = rx0[i], x1 = rx1[i];
      areas[c] += x1 - x0 + 1;
      if (x0 < ax0[c]) ax0[c] = x0;
      if (x1 > ax1[c]) ax1[c] = x1;
      if (y < ay0[c]) ay0[c] = y;
      if (y > ay1[c]) ay1[c] = y;
      label.fill(c, y * W + x0, y * W + x1 + 1);
      if ((i & 16383) === 16383) yield;
    }
    const bx0 = Int32Array.from(ax0), by0 = Int32Array.from(ay0), bx1 = Int32Array.from(ax1), by1 = Int32Array.from(ay1);
    T.push(performance.now());
    yield;

    // 4) Zonas diminutas bloqueadas y zona de fondo (la más grande que toca el borde).
    const area = Uint32Array.from(areas);
    const locked = new Uint8Array(n);
    const minArea = MIN_AREA_FRAC * N;
    for (let i = 0; i < n; i++) if (area[i] < minArea) locked[i] = 1;
    let bg = -1;
    const touch = (p) => {
      const l = label[p];
      if (l >= 0 && !locked[l] && (bg < 0 || area[l] > area[bg])) bg = l;
    };
    for (let x = 0; x < W; x++) { touch(x); touch(N - W + x); }
    for (let y = 0; y < H; y++) { touch(y * W); touch(y * W + W - 1); }

    // 5) Píxeles de línea -> zona más cercana. Transformada de distancia en dos pasadas
    //    (ida: izquierda/arriba; vuelta: derecha/abajo) que arrastra la etiqueta de la zona más cercana.
    //    Recorre la memoria en orden, mucho más rápido que un BFS con cola.
    const INF = 65535;
    const dist = new Uint16Array(N); // 0 = píxel de zona pintable
    for (let y = 0; y < H; y++) {
      for (let x = 0, p = y * W; x < W; x++, p++) {
        // Los brillitos (zonas bloqueadas) también reclaman su media línea: así el antialias
        // alrededor de un brillito queda neutro en vez de teñirse con el color de la cara.
        if (!wall[p]) continue;
        let d = INF, l = -1;
        if (x > 0 && dist[p - 1] + 1 < d) { d = dist[p - 1] + 1; l = label[p - 1]; }
        if (y > 0 && dist[p - W] + 1 < d) { d = dist[p - W] + 1; l = label[p - W]; }
        dist[p] = d; label[p] = l;
      }
      if ((y & (ROWS - 1)) === ROWS - 1) yield;
    }
    T.push(performance.now());
    yield;
    for (let y = H - 1; y >= 0; y--) {
      for (let x = W - 1, p = y * W + W - 1; x >= 0; x--, p--) {
        if (!wall[p]) continue;
        let d = dist[p], l = label[p];
        if (x < W - 1 && dist[p + 1] + 1 < d) { d = dist[p + 1] + 1; l = label[p + 1]; }
        if (y < H - 1 && dist[p + W] + 1 < d) { d = dist[p + W] + 1; l = label[p + W]; }
        dist[p] = d; label[p] = l;
        if (l >= 0) {
          if (x < bx0[l]) bx0[l] = x;
          if (x > bx1[l]) bx1[l] = x;
          if (y < by0[l]) by0[l] = y;
          if (y > by1[l]) by1[l] = y;
        }
      }
      if ((y & (ROWS - 1)) === 0) yield;
    }

    T.push(performance.now());
    const bbox = new Array(n);
    for (let i = 0; i < n; i++) bbox[i] = { x0: bx0[i], y0: by0[i], x1: bx1[i], y1: by1[i] };

    const map = {
      w: W, h: H, label, count: n, area, bbox, locked, bg,
      timings: T.slice(1).map((t, i) => Math.round(t - T[i])),
      /** id de zona en (x, y) de la imagen (o -1). */
      at(x, y) {
        x = Math.floor(x); y = Math.floor(y);
        if (x < 0 || y < 0 || x >= W || y >= H) return -1;
        return label[y * W + x];
      },
      /** Zona pintable más cercana a (x, y): la del punto o, si es línea suelta o brillito, la de al lado. */
      nearest(x, y, maxR = 80) {
        const l0 = map.at(x, y);
        if (l0 >= 0 && !locked[l0]) return l0;
        for (let r = 3; r <= maxR; r = Math.ceil(r * 1.5)) {
          for (let k = 0; k < 16; k++) {
            const a = (k / 16) * Math.PI * 2;
            const l = map.at(x + Math.cos(a) * r, y + Math.sin(a) * r);
            if (l >= 0 && !locked[l]) return l;
          }
        }
        return -1;
      },
    };
    return map;
  }

  /** Corre un generador de un tirón. */
  function run(it) {
    let r = it.next();
    while (!r.done) r = it.next();
    return r.value;
  }
  const compute = (lineCanvas) => run(job(lineCanvas));

  // Cede el hilo con MessageChannel (más rápido que setTimeout y no espera al próximo cuadro).
  const yieldNow = () => new Promise((res) => {
    const ch = new MessageChannel();
    ch.port1.onmessage = () => res();
    ch.port2.postMessage(0);
  });

  /** Corre un generador cediendo el hilo cada `budget` ms. */
  async function runAsync(it, budget = 12) {
    let last = performance.now();
    let r = it.next();
    while (!r.done) {
      if (performance.now() - last > budget) { await yieldNow(); last = performance.now(); }
      r = it.next();
    }
    return r.value;
  }
  const computeAsync = (lineCanvas) => runAsync(job(lineCanvas));

  /** Máscara de una zona: canvas del tamaño de su bbox, `color` opaco donde está la zona y transparente fuera. */
  const mask = (map, id, color) => run(maskJob(map, id, color));
  /** Igual, en tramos de filas (para prepararla en ratos libres: ver engine.js). */
  function* maskJob(map, id, color = '#000000') {
    const b = map.bbox[id];
    const w = b.x1 - b.x0 + 1, h = b.y1 - b.y0 + 1;
    const c = CL.util.canvas(w, h);
    const ctx = c.getContext('2d');
    const im = ctx.createImageData(w, h);
    const u32 = new Uint32Array(im.data.buffer);
    const [r, g, bl] = CL.util.hexToRgb(color);
    // Little-endian: bytes RGBA -> entero ABGR.
    const v = ((255 << 24) | (bl << 16) | (g << 8) | r) >>> 0;
    const W = map.w, label = map.label;
    for (let y = 0; y < h; y++) {
      const row = (y + b.y0) * W + b.x0;
      const o = y * w;
      for (let x = 0; x < w; x++) if (label[row + x] === id) u32[o + x] = v;
      if ((y & (ROWS - 1)) === ROWS - 1) yield;
    }
    ctx.putImageData(im, 0, 0);
    return c;
  }

  CL.regions = { WALL_LUM, MIN_AREA_FRAC, lineLayer, compute, computeAsync, mask, maskJob };
})(window.CL);
