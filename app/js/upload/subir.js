/* Colorines — Subir imágenes (ruta 'subir').

   Pasos:
   1. Elegir: dos botones enormes (archivo / cámara). También se puede soltar un archivo o pegarlo.
      Cámara: en pantallas táctiles abre la cámara nativa (input capture); en compu, un visor en vivo
      con getUserMedia (si no hay cámara o no dan permiso, se abre el selector de archivos).
   2. Ajustar: vista previa grande en blanco y negro PURO, con modo "página para colorear" (umbral
      adaptativo contra el brillo del papel estimado en cada zona, midiendo la tinta en cualquier canal
      de color) o modo "foto" (la foto se parte en zonas de color y se dibuja el límite entre zonas:
      contornos siempre cerrados, para que el balde no se escape). Deslizador de
      sensibilidad, − / +, engrosar líneas, rotar 90° y "ver original" (mantener apretado el ojo).
   3. Guardar: PNG blanco/negro opaco en CL.db.uploads y a pintarla (colorear/u-<id>).

   Coherencia vista previa / guardado: el "mapa de tinta" (score) se calcula UNA vez a la resolución de
   trabajo y la vista previa se saca de ese mismo mapa reducido con máximo por bloque, así una línea
   finita no se pierde al achicar. El deslizador sólo vuelve a umbralizar (rápido, con buffers reusados).

   CL.upload expone el procesamiento (process, preview, decode) para reutilizarlo y para las pruebas. */
'use strict';
(function (CL) {
  const U = CL.util;
  const el = U.el;
  const INK = CL.icons.INK;
  const S = CL.icons.STROKE;

  const MAX_SIDE = 2048;       // lado mayor de la imagen guardada
  const MIN_SIDE = 1400;       // las imágenes chicas se agrandan (suave) hasta este lado mayor
  const PREVIEW_MIN = 480;     // lado mayor de la vista previa: tamaño en pantalla × dpr, entre estos topes
  const PREVIEW_MAX = 1280;
  const DRAG_SIDE = 540;       // mientras se arrastra el deslizador (si la compu/tablet es lenta)
  const PHOTO_WORK_SIDE = 800;  // las zonas de una foto se calculan a este tamaño y los contornos se agrandan suave
  const THUMB_SIDE = 320;      // miniatura para el catálogo
  const DEFAULT_LEVEL = 60;    // cada imagen nueva arranca acá (no se hereda de la anterior)

  /* ------------------------------------------------------------------ */
  /* Íconos propios                                                       */
  /* ------------------------------------------------------------------ */
  CL.icons.add({
    upFile: `<path d="M4.5 14.5a3 3 0 0 1 3-3H18l4 4h18.5a3 3 0 0 1 3 3v19a3 3 0 0 1-3 3h-33a3 3 0 0 1-3-3z" fill="#ffb13b" ${S}/>
      <g transform="rotate(-9 26 17)"><rect x="15" y="6.5" width="22" height="18" rx="2" fill="#fff" ${S}/>
      <circle cx="21" cy="12.5" r="2.4" fill="#ff5a5f"/>
      <path d="M17.5 22.5l5.5-5.5 4 4 3-3 4.5 4.5" fill="none" stroke="#2bc48a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></g>
      <path d="M4.5 21.5h39l-2 16.4a3 3 0 0 1-3 2.6H9.5a3 3 0 0 1-3-2.6z" fill="#ffd23f" ${S}/>`,
    upPage: `<path d="M10.5 5.5h19l8 8v29h-27z" fill="#fff" ${S}/>
      <path d="M29.5 5.5v8h8" fill="#ece7f6" ${S}/>
      <path d="M24 33v6.5M24 37c2-2.5 4.5-3 6-2.5-.8 2.2-3 3.2-6 2.5" fill="#2bc48a" stroke="${INK}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <g stroke="${INK}" stroke-width="2.2"><circle cx="24" cy="17.8" r="3.4" fill="#ff8fc7"/><circle cx="29.9" cy="22.1" r="3.4" fill="#fff"/>
      <circle cx="27.6" cy="29" r="3.4" fill="#ffd23f"/><circle cx="20.4" cy="29" r="3.4" fill="#fff"/><circle cx="18.1" cy="22.1" r="3.4" fill="#fff"/>
      <circle cx="24" cy="24" r="3.4" fill="#fff"/></g>`,
    upPortrait: `<rect x="6.5" y="8.5" width="35" height="31" rx="4" fill="#bfe9ff" ${S}/>
      <path d="M12.5 39.5c.8-6.5 5-9.5 11.5-9.5s10.7 3 11.5 9.5z" fill="#ff5a5f" ${S}/>
      <circle cx="24" cy="21" r="7.5" fill="#ffd9b8" ${S}/>
      <path d="M16.7 19.6c1-4.8 4-7.1 7.3-7.1s6.3 2.3 7.3 7.1c-2.6-1-5.3-2.1-7.3-4.3-2 2.2-4.7 3.3-7.3 4.3z" fill="#8a5a3c" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="21.3" cy="22" r="1.3" fill="${INK}"/><circle cx="26.7" cy="22" r="1.3" fill="${INK}"/>
      <path d="M21.6 25.2c1.4 1.2 3.4 1.2 4.8 0" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>`,
    upRotate: `<rect x="16" y="21" width="16" height="16" rx="2.5" fill="#4cc3ff" ${S}/>
      <path d="M9 26A15 15 0 0 1 35.5 16.4" fill="none" stroke="#ff9f1c" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M39 13.3l.6 8.3-8-2.2z" fill="#ff9f1c" stroke="#ff9f1c" stroke-width="2.5" stroke-linejoin="round"/>`,
    // Líneas más gruesas: una línea finita arriba que pasa a ser una bien gruesa abajo (flechita al costado).
    upThick: `<path d="M16 13h25" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M17 33.5h22" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>
      <path d="M8 10v17" fill="none" stroke="#2bc48a" stroke-width="4" stroke-linecap="round"/>
      <path d="M3.5 22.5 8 28l4.5-5.5" fill="none" stroke="#2bc48a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`,
    upEye: `<path d="M4 24s7-12.5 20-12.5S44 24 44 24s-7 12.5-20 12.5S4 24 4 24z" fill="#fff" ${S}/>
      <circle cx="24" cy="24" r="8" fill="#4cc3ff" ${S}/><circle cx="24" cy="24" r="3.4" fill="${INK}"/><circle cx="26.3" cy="21.4" r="1.6" fill="#fff"/>`,
    upBroken: `<path d="M6.5 13.5a4 4 0 0 1 4-4H21l3 7-4 6 4 6.5-2.5 9.5H10.5a4 4 0 0 1-4-4z" fill="#e3f5ff" ${S}/>
      <path d="M26 9.5h11.5a4 4 0 0 1 4 4v21a4 4 0 0 1-4 4H25l2.5-9.5-4-6.5 4-6z" fill="#e3f5ff" ${S}/>
      <circle cx="15" cy="21" r="1.8" fill="${INK}"/><circle cx="33" cy="21" r="1.8" fill="${INK}"/>
      <path d="M13 31c1.5-2.5 4-3 6-2M29 29c2-1 4.5-.5 6 2" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="38.5" cy="37.5" r="7.5" fill="#ff5a5f" ${S}/><path d="M35.5 34.5l6 6M41.5 34.5l-6 6" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`,
    upNoCam: `<path d="M16 14.5l3-5h10l3 5" fill="#d7d2e3" ${S}/>
      <rect x="5.5" y="14.5" width="37" height="25" rx="5" fill="#bfe9ff" ${S}/>
      <circle cx="24" cy="27" r="7.5" fill="#fff" ${S}/>
      <path d="M9 7l30 36" stroke="#fff" stroke-width="9" stroke-linecap="round"/><path d="M9 7l30 36" stroke="#ff5a5f" stroke-width="5" stroke-linecap="round"/>`,
    upFlip: `<path d="M9 21a15 15 0 0 1 27.5-6" fill="none" stroke="#7b61ff" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M39.5 7.5l-1.5 9.5-9-3z" fill="#7b61ff" stroke="#7b61ff" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M39 27a15 15 0 0 1-27.5 6" fill="none" stroke="#2bb3ff" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M8.5 40.5l1.5-9.5 9 3z" fill="#2bb3ff" stroke="#2bb3ff" stroke-width="2.5" stroke-linejoin="round"/>`,
    // Hoja vacía: papel en blanco con un signo de exclamación naranja.
    upEmpty: `<path d="M9.5 5.5h20l8 8v29h-28z" fill="#fff" ${S}/>
      <path d="M29.5 5.5v8h8" fill="#ece7f6" ${S}/>
      <circle cx="33" cy="33" r="10" fill="#ff9f1c" ${S}/>
      <path d="M33 27.5v6" stroke="#fff" stroke-width="3.6" stroke-linecap="round"/><circle cx="33" cy="38.3" r="2" fill="#fff"/>`,
    upSave: `<path d="m10 25 9.5 9.5L38 15" fill="none" stroke="${INK}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="m10 25 9.5 9.5L38 15" fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>`,
  });

  /* ------------------------------------------------------------------ */
  /* Procesamiento de imagen                                              */
  /* Todos los tamaños (desenfoques, manchitas, grosor) son proporcionales */
  /* al lado mayor, así la vista previa se parece a la final.             */
  /* ------------------------------------------------------------------ */

  /** Anchos de 3 cajas que aproximan una gaussiana de desvío `sigma`. */
  function boxesForGauss(sigma, n) {
    const wIdeal = Math.sqrt((12 * sigma * sigma) / n + 1);
    let wl = Math.floor(wIdeal);
    if (wl % 2 === 0) wl--;
    const wu = wl + 2;
    const m = Math.round((12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4));
    const out = [];
    for (let i = 0; i < n; i++) out.push(i < m ? wl : wu);
    return out;
  }

  function boxH(src, dst, w, h, r) {
    const k = 1 / (r + r + 1);
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let acc = src[row] * (r + 1);
      for (let x = 0; x < r; x++) acc += src[row + Math.min(x, w - 1)];
      for (let x = 0; x < w; x++) {
        acc += src[row + Math.min(x + r, w - 1)] - src[row + Math.max(x - r - 1, 0)];
        dst[row + x] = acc * k;
      }
    }
  }

  /** Caja vertical recorriendo por filas (un acumulador por columna): mucho más amable con la caché. */
  function boxV(src, dst, w, h, r) {
    const k = 1 / (r + r + 1);
    const acc = new Float32Array(w);
    for (let x = 0; x < w; x++) acc[x] = src[x] * (r + 1);
    for (let y = 0; y < r; y++) {
      const row = Math.min(y, h - 1) * w;
      for (let x = 0; x < w; x++) acc[x] += src[row + x];
    }
    for (let y = 0; y < h; y++) {
      const add = Math.min(y + r, h - 1) * w, sub = Math.max(y - r - 1, 0) * w, o = y * w;
      for (let x = 0; x < w; x++) {
        acc[x] += src[add + x] - src[sub + x];
        dst[o + x] = acc[x] * k;
      }
    }
  }

  /** Desenfoque gaussiano aproximado (3 pasadas de caja), O(n). Escribe en `out` (o en un arreglo nuevo;
      puede ser el mismo `src` para hacerlo en el lugar) y usa `tmp` de auxiliar si se lo pasan. */
  function gauss(src, w, h, sigma, out, tmp) {
    const a = out || new Float32Array(src.length);
    if (a !== src) a.set(src);
    if (!(sigma >= 0.6)) return a;
    const b = tmp || new Float32Array(a.length);
    for (const size of boxesForGauss(sigma, 3)) {
      const r = (size - 1) >> 1;
      if (r < 1) continue;
      boxH(a, b, w, h, r);
      boxV(b, a, w, h, r);
    }
    return a;
  }

  /** Color del papel: promedio del 10 % de píxeles más claros (para el balance de blancos). */
  function paperColor(rgba, n, step = 1) {
    const hist = new Uint32Array(256);
    let total = 0;
    for (let i = 0; i < n; i += step) {
      const j = i * 4;
      hist[(rgba[j] * 77 + rgba[j + 1] * 150 + rgba[j + 2] * 29) >> 8]++;
      total++;
    }
    let cut = 255;
    for (let acc = 0; cut > 0; cut--) { acc += hist[cut]; if (acc >= total * 0.1) break; }
    let r = 0, g = 0, b = 0, c = 0;
    for (let i = 0; i < n; i += step) {
      const j = i * 4;
      if (((rgba[j] * 77 + rgba[j + 1] * 150 + rgba[j + 2] * 29) >> 8) < cut) continue;
      r += rgba[j]; g += rgba[j + 1]; b += rgba[j + 2]; c++;
    }
    c = c || 1;
    // Ganancias acotadas: una hoja muy oscura o muy teñida no se estira sin límite.
    const k = (v) => 255 / Math.min(255, Math.max(64, v / c)); // (sin CL.util: también corre en el Worker)
    return [k(r), k(g), k(b)];
  }

  /** "Tinta" 0–255 (0 = negro): el canal MÁS oscuro después del balance de blancos.
      Así una línea amarilla, rosa o celeste sobre papel blanco cuenta como línea (con la luminancia
      el amarillo casi no se distingue del papel). */
  function inkOf(rgba, n) {
    const [kr, kg, kb] = paperColor(rgba, n, n > 400000 ? 7 : 1);
    const g = new Float32Array(n);
    for (let i = 0, j = 0; i < n; i++, j += 4) {
      const r = rgba[j] * kr, gg = rgba[j + 1] * kg, b = rgba[j + 2] * kb;
      const m = r < gg ? (r < b ? r : b) : (gg < b ? gg : b);
      g[i] = m > 255 ? 255 : m;
    }
    return g;
  }

  /** Filtro de máximo separable (radio r) sobre una grilla chica. */
  function maxFilter(src, w, h, r) {
    const tmp = new Float32Array(src.length), out = new Float32Array(src.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let m = 0;
        for (let k = Math.max(0, x - r), e = Math.min(w - 1, x + r); k <= e; k++) if (src[y * w + k] > m) m = src[y * w + k];
        tmp[y * w + x] = m;
      }
    }
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        let m = 0;
        for (let k = Math.max(0, y - r), e = Math.min(h - 1, y + r); k <= e; k++) if (tmp[k * w + x] > m) m = tmp[k * w + x];
        out[y * w + x] = m;
      }
    }
    return out;
  }

  /** Página para colorear: "oscuridad relativa al papel" (0 = papel, 1 = negro).
      El brillo del papel se estima en una grilla gruesa (máximo local + suavizado), así una sombra
      o un degradé de luz no se vuelven manchas negras. */
  function preparePage(ink, w, h) {
    const L = Math.max(w, h);
    const g = gauss(ink, w, h, L * 0.0008, ink); // en el lugar: la tinta ya no hace falta
    const c = Math.max(2, Math.round(L / 200));
    const gw = Math.ceil(w / c), gh = Math.ceil(h / c);
    let grid = new Float32Array(gw * gh);
    for (let y = 0; y < h; y++) {
      const gy = ((y / c) | 0) * gw;
      for (let x = 0; x < w; x++) {
        const v = g[y * w + x], gi = gy + ((x / c) | 0);
        if (v > grid[gi]) grid[gi] = v;
      }
    }
    // Radio chico: tapa las líneas y rellenos chicos pero sigue de cerca los bordes de las sombras.
    grid = maxFilter(grid, gw, gh, 2);
    grid = gauss(grid, gw, gh, 1);
    // Brillo típico del papel iluminado: lo MUY oscuro contra esto es negro sí o sí (pupilas, rellenos).
    const sorted = Float32Array.from(grid).sort();
    const paper = sorted[Math.floor(sorted.length * 0.9)];
    const darkAbs = paper * 0.2;
    // En las sombras el ruido pesa más: el contraste se mide contra un piso de la mitad del papel.
    const floor = Math.max(24, paper * 0.5);
    const score = g; // se reusa el arreglo del desenfoque (cada píxel se lee antes de escribirlo)
    // Brillo del papel interpolado (bilineal): columnas precalculadas y una fila de la grilla por vez.
    const xa = new Int32Array(w), xb = new Int32Array(w), xt = new Float32Array(w);
    for (let x = 0; x < w; x++) {
      let fx = x / c - 0.5;
      fx = fx < 0 ? 0 : fx > gw - 1 ? gw - 1 : fx;
      xa[x] = fx | 0; xb[x] = Math.min(gw - 1, xa[x] + 1); xt[x] = fx - xa[x];
    }
    const rowBg = new Float32Array(gw);
    for (let y = 0; y < h; y++) {
      let fy = y / c - 0.5;
      fy = fy < 0 ? 0 : fy > gh - 1 ? gh - 1 : fy;
      const y0 = (fy | 0) * gw, y1 = Math.min(gh - 1, (fy | 0) + 1) * gw, ty = fy - (fy | 0);
      for (let gx = 0; gx < gw; gx++) rowBg[gx] = grid[y0 + gx] + (grid[y1 + gx] - grid[y0 + gx]) * ty;
      const o = y * w;
      for (let x = 0; x < w; x++) {
        const a = rowBg[xa[x]], bg = a + (rowBg[xb[x]] - a) * xt[x];
        const v = g[o + x];
        score[o + x] = v < darkAbs ? 1 : v >= bg ? 0 : (bg - v) / (bg > floor ? bg : floor);
      }
    }
    return score;
  }

  /* ---------- Foto: zonas de color ----------
     Una foto no tiene líneas: hay que inventarlas. Buscar bordes deja huecos donde el contraste es bajo
     (y el balde se escapa). En cambio se parte la foto en ZONAS de color parecido y la línea es el límite
     entre dos zonas: el límite de una partición siempre es cerrado.
     1. Color en Lab (distancias parecidas a las que ve el ojo), apenas suavizado.
     2. Muchas zonitas que respetan los bordes (Felzenszwalb–Huttenlocher, con tamaño mínimo).
     3. Se van uniendo de a pares las dos zonas vecinas más parecidas (color medio + fuerza del borde que
        comparten; las chiquitas se unen antes) hasta que queda una sola.
     4. Cada tramo de límite guarda cuántas zonas había cuando desapareció. Umbralizar ese mapa en K da
        exactamente la partición en K zonas: el deslizador elige K y los contornos siguen cerrados. */

  /** Color de cada píxel en CIE Lab (D65). */
  function photoLab(rgba, n) {
    const lin = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const c = i / 255; lin[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
    const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 0.137931);
    const L = new Float32Array(n), A = new Float32Array(n), B = new Float32Array(n);
    for (let i = 0, j = 0; i < n; i++, j += 4) {
      const r = lin[rgba[j]], g = lin[rgba[j + 1]], b = lin[rgba[j + 2]];
      const fx = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047);
      const fy = f(0.2126 * r + 0.7152 * g + 0.0722 * b);
      const fz = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
      L[i] = 116 * fy - 16; A[i] = 500 * (fx - fy); B[i] = 200 * (fy - fz);
    }
    return [L, A, B];
  }

  /** Zonitas iniciales (Felzenszwalb–Huttenlocher, 4 vecinos): une píxeles vecinos parecidos mientras la
      diferencia no supere la variación interna de cada zona + k/tamaño; después absorbe las menores a
      `minSize`. Devuelve { seg: zona de cada píxel, count }. */
  function photoSegments(L, A, B, w, h, k, minSize) {
    const n = w * h, Q = 16, QMAX = 4095, NONE = 65535;
    const ew = new Uint16Array(2 * n), cnt = new Uint32Array(QMAX + 1);
    for (let y = 0; y < h; y++) {
      for (let x = 0, p = y * w; x < w; x++, p++) {
        if (x < w - 1) {
          const dl = L[p] - L[p + 1], da = A[p] - A[p + 1], db = B[p] - B[p + 1];
          const v = Math.min(QMAX, Math.round(Math.sqrt(dl * dl + da * da + db * db) * Q));
          ew[2 * p] = v; cnt[v]++;
        } else ew[2 * p] = NONE;
        if (y < h - 1) {
          const q = p + w, dl = L[p] - L[q], da = A[p] - A[q], db = B[p] - B[q];
          const v = Math.min(QMAX, Math.round(Math.sqrt(dl * dl + da * da + db * db) * Q));
          ew[2 * p + 1] = v; cnt[v]++;
        } else ew[2 * p + 1] = NONE;
      }
    }
    // Aristas ordenadas por diferencia (conteo: sin comparar).
    let total = 0;
    for (let v = 0; v <= QMAX; v++) { const c = cnt[v]; cnt[v] = total; total += c; }
    const order = new Int32Array(total);
    for (let e = 0; e < 2 * n; e++) { const v = ew[e]; if (v !== NONE) order[cnt[v]++] = e; }
    const parent = new Int32Array(n), size = new Int32Array(n), thr = new Float32Array(n);
    for (let i = 0; i < n; i++) { parent[i] = i; size[i] = 1; thr[i] = k; }
    const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
    for (let pass = 0; pass < 2; pass++) {
      for (let t = 0; t < total; t++) {
        const e = order[t], p = e >> 1, q = e & 1 ? p + w : p + 1;
        let a = find(p), b = find(q);
        if (a === b) continue;
        const v = ew[e] / Q;
        if (pass === 0 ? v <= thr[a] && v <= thr[b] : size[a] < minSize || size[b] < minSize) {
          if (size[a] < size[b]) { const s = a; a = b; b = s; }
          parent[b] = a;
          size[a] += size[b];
          thr[a] = v + k / size[a];
        }
      }
    }
    const seg = new Int32Array(n), id = new Int32Array(n).fill(-1);
    let count = 0;
    for (let i = 0; i < n; i++) { const r = find(i); if (id[r] < 0) id[r] = count++; seg[i] = id[r]; }
    return { seg, count };
  }

  /** Suaviza los límites de las zonitas (filtro de mayoría 3×3, sólo en los bordes): menos escalones y
      pelitos en las líneas. Devuelve { seg, count } renumerado (alguna zonita puede desaparecer). */
  function photoSmooth(seg, count, w, h, passes) {
    let a = seg, b = new Int32Array(seg.length);
    const lab = new Int32Array(9), cnt = new Int32Array(9);
    for (let it = 0; it < passes; it++) {
      b.set(a);
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1, p = y * w + 1; x < w - 1; x++, p++) {
          const v = a[p];
          if (a[p - 1] === v && a[p + 1] === v && a[p - w] === v && a[p + w] === v) continue;
          let m = 0;
          for (let dy = -w; dy <= w; dy += w) {
            for (let dx = -1; dx <= 1; dx++) {
              const l = a[p + dy + dx];
              let j = 0;
              while (j < m && lab[j] !== l) j++;
              if (j === m) { lab[m] = l; cnt[m++] = 0; }
              cnt[j]++;
            }
          }
          let best = v, bc = 0;
          for (let j = 0; j < m; j++) if (cnt[j] > bc) { bc = cnt[j]; best = lab[j]; }
          if (bc >= 5) b[p] = best;
        }
      }
      const t = a; a = b; b = t;
    }
    const id = new Int32Array(count).fill(-1);
    let n = 0;
    for (let i = 0; i < a.length; i++) { const l = a[i]; if (id[l] < 0) id[l] = n++; a[i] = id[l]; }
    return { seg: a, count: n };
  }

  /** Une las zonitas de a pares (las más parecidas primero) y devuelve el mapa de contornos:
      en cada píxel de límite, 1 / (cantidad de zonas que había cuando ese límite desapareció). */
  function photoContours(seg, S, L, A, B, w, h) {
    const n = w * h;
    const cnt = new Float64Array(S), sl = new Float64Array(S), sa = new Float64Array(S), sb = new Float64Array(S);
    for (let i = 0; i < n; i++) { const s = seg[i]; cnt[s]++; sl[s] += L[i]; sa[s] += A[i]; sb[s] += B[i]; }
    // Tramos de límite entre cada par de zonitas vecinas: largo y contraste acumulado a través del borde.
    // El contraste se mide entre píxeles a 2–3 px de cada lado: un borde de verdad (aunque esté un poco
    // borroso) da la diferencia entera; un degradé suave o el granito de la foto, casi nada.
    const wide = (p, q) => { const dl = L[p] - L[q], da = A[p] - A[q], db = B[p] - B[q]; return Math.sqrt(dl * dl + da * da + db * db); };
    const pairOf = new Map(), pa = [], pb = [], plen = [], pg = [];
    const touch = (s, t, v) => {
      const a = s < t ? s : t, b = s < t ? t : s, key = a * S + b;
      let id = pairOf.get(key);
      if (id === undefined) { id = pa.length; pairOf.set(key, id); pa.push(a); pb.push(b); plen.push(0); pg.push(0); }
      plen[id]++; pg[id] += v;
    };
    for (let y = 0; y < h; y++) {
      for (let x = 0, p = y * w; x < w; x++, p++) {
        if (x < w - 1 && seg[p] !== seg[p + 1]) touch(seg[p], seg[p + 1], wide(p - Math.min(2, x), p + Math.min(3, w - 1 - x)));
        if (y < h - 1 && seg[p] !== seg[p + w]) touch(seg[p], seg[p + w], wide(p - Math.min(2, y) * w, p + Math.min(3, h - 1 - y) * w));
      }
    }
    const P = pa.length;
    const adj = [];
    for (let s = 0; s < S; s++) adj.push(new Map());
    // Costo de unir dos zonas: diferencia de color medio + fuerza media del borde entre ellas.
    // Las chicas (frente a ~0,08 % de la foto) cuestan menos: se van primero y no quedan manchitas.
    const s0 = n * 0.0008;
    const cost = (o) => {
      const a = o.a, b = o.b, ca = cnt[a], cb = cnt[b];
      const dl = sl[a] / ca - sl[b] / cb, da = sa[a] / ca - sa[b] / cb, db = sb[a] / ca - sb[b] / cb;
      const small = Math.min(ca, cb);
      return (0.05 * Math.sqrt(dl * dl + da * da + db * db) + o.g / o.len) * (small / (small + s0));
    };
    // Montículo (mínimo) de uniones candidatas; las viejas se descartan por versión.
    const hc = [], ho = [], hv = [];
    const push = (c, o) => {
      let i = hc.length;
      hc.push(c); ho.push(o); hv.push(o.v);
      while (i > 0) {
        const pi = (i - 1) >> 1;
        if (hc[pi] <= c) break;
        hc[i] = hc[pi]; ho[i] = ho[pi]; hv[i] = hv[pi];
        i = pi;
      }
      hc[i] = c; ho[i] = o; hv[i] = o.v;
    };
    let popCost = 0;
    const pop = () => {
      const o = ho[0], v = hv[0];
      popCost = hc[0];
      const lc = hc.pop(), lo = ho.pop(), lv = hv.pop();
      const m = hc.length;
      if (m) {
        let i = 0;
        for (;;) {
          let c = 2 * i + 1;
          if (c >= m) break;
          if (c + 1 < m && hc[c + 1] < hc[c]) c++;
          if (hc[c] >= lc) break;
          hc[i] = hc[c]; ho[i] = ho[c]; hv[i] = hv[c];
          i = c;
        }
        hc[i] = lc; ho[i] = lo; hv[i] = lv;
      }
      return v === o.v ? o : null;
    };
    for (let id = 0; id < P; id++) {
      const o = { a: pa[id], b: pb[id], len: plen[id], g: pg[id], pairs: [id], v: 0, dead: false };
      adj[o.a].set(o.b, o);
      adj[o.b].set(o.a, o);
      push(cost(o), o);
    }
    // Por cada tramo, en qué unión (paso 1, 2, …) desapareció; y el costo de cada paso.
    const step = new Int32Array(P), stepCost = new Float32Array(S + 1);
    let steps = 0;
    while (hc.length && steps < S - 1) {
      const o = pop();
      if (!o || o.dead) continue;
      let a = o.a, b = o.b;
      if (cnt[a] < cnt[b]) { const s = a; a = b; b = s; }
      stepCost[++steps] = popCost;
      for (const id of o.pairs) step[id] = steps;
      o.dead = true;
      adj[a].delete(b);
      cnt[a] += cnt[b]; sl[a] += sl[b]; sa[a] += sa[b]; sb[a] += sb[b];
      for (const [c, ob] of adj[b]) {
        if (c === a) continue;
        adj[c].delete(b);
        const oa = adj[a].get(c);
        if (oa) {
          oa.len += ob.len; oa.g += ob.g;
          for (const id of ob.pairs) oa.pairs.push(id);
          ob.dead = true;
        } else {
          if (ob.a === b) ob.a = a; else ob.b = a;
          adj[a].set(c, ob);
          adj[c].set(a, ob);
        }
      }
      adj[b].clear();
      for (const o2 of adj[a].values()) { o2.v++; push(cost(o2), o2); }
    }
    // Qué muestra cada nivel del deslizador (0–100): se une hasta que queden K zonas (de 3 a 120, en escala
    // geométrica) y se sigue uniendo mientras la unión que viene sea "barata" (costo < c, de 12 a 1,5): así
    // los degradés suaves (cielo, sombras) no quedan cortados en franjas aunque sobre lugar. Cada nivel es
    // un momento de la MISMA secuencia de uniones (una partición: contornos cerrados) y cuanto más alto el
    // nivel, más temprano. Cada tramo guarda 1 − (primer nivel en que se ve)/100.
    const K0 = 3, K1 = 120, C0 = 20, C1 = 2.5;
    const done = new Int32Array(101); // uniones hechas en cada nivel
    for (let lv = 0; lv <= 100; lv++) {
      const t = lv / 100, K = Math.round(K0 * Math.pow(K1 / K0, t)), c = C0 * Math.pow(C1 / C0, t);
      let j = Math.max(0, S - K);
      if (j > steps) j = steps;
      while (j < steps && stepCost[j + 1] < c) j++;
      done[lv] = lv ? Math.min(j, done[lv - 1]) : j;
    }
    const firm = new Float32Array(steps + 2); // por paso: 1 − primer nivel en que la unión todavía no se hizo
    for (let m = steps, lv = 0; m >= 1; m--) {
      while (lv <= 100 && done[lv] >= m) lv++;
      firm[m] = lv <= 100 ? 1 - lv / 100 : 0;
    }
    const score = new Float32Array(n);
    const at = (s, t) => { const m = step[pairOf.get(s < t ? s * S + t : t * S + s)]; return m ? firm[m] : 1; };
    for (let y = 0; y < h; y++) {
      for (let x = 0, p = y * w; x < w; x++, p++) {
        let m = 0;
        if (x < w - 1 && seg[p] !== seg[p + 1]) m = at(seg[p], seg[p + 1]);
        if (y < h - 1 && seg[p] !== seg[p + w]) { const v = at(seg[p], seg[p + w]); if (v > m) m = v; }
        score[p] = m;
      }
    }
    // Línea de 3 px con el mismo valor en el centro: al agrandar (bilineal) sigue entera.
    return maxFilter(score, w, h, 1);
  }

  /** Foto: mapa de contornos de zonas de color (ver arriba). Nivel s del deslizador → umbral 1 − s. */
  function preparePhoto(rgba, w, h) {
    const n = w * h, side = Math.max(w, h);
    const [L, A, B] = photoLab(rgba, n);
    const tmp = new Float32Array(n), sigma = Math.max(0.6, side * 0.0018);
    gauss(L, w, h, sigma, L, tmp); gauss(A, w, h, sigma, A, tmp); gauss(B, w, h, sigma, B, tmp);
    const fh = photoSegments(L, A, B, w, h, 60, Math.max(16, Math.round(n * 0.0004)));
    const { seg, count } = photoSmooth(fh.seg, fh.count, w, h, 2);
    return photoContours(seg, count, L, A, B, w, h);
  }

  function readPixels(canvas) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  }

  /** Libera la memoria de un canvas (Safari en iOS tiene un tope global de memoria de canvas). */
  function release(c) {
    if (c && c.getContext && c.width) { c.width = 0; c.height = 0; }
  }

  /** Mapa de tinta de un modo, a su resolución de trabajo: { w, h, data: Float32Array }.
      Página: al tamaño de la imagen. Foto: a ≤ PHOTO_WORK_SIDE (los contornos no necesitan más). */
  function scoreFor(src, mode) {
    const w = src.width, h = src.height;
    if (mode === 'photo') {
      const small = Math.max(w, h) > PHOTO_WORK_SIDE ? fitCanvas(src, w, h, PHOTO_WORK_SIDE) : src;
      const r = { w: small.width, h: small.height, data: preparePhoto(readPixels(small), small.width, small.height) };
      if (small !== src) release(small);
      return r;
    }
    return { w, h, data: preparePage(inkOf(readPixels(src), w * h), w, h) };
  }

  /* ---------- Cálculo en segundo plano (Worker) ----------
     El mapa de tinta es lo más pesado (0,2–1 s en una tablet). Se calcula en un Worker armado con estas
     mismas funciones (Blob URL: anda también abriendo index.html con doble clic). Si el navegador no
     puede, se calcula en el hilo principal como siempre. */
  const WORKER_FNS = [boxesForGauss, boxH, boxV, gauss, paperColor, inkOf, maxFilter, preparePage, photoLab, photoSegments, photoSmooth, photoContours, preparePhoto, rotateField];
  let worker = null, workerUrl = null, workerBroken = false, jobSeq = 0;
  const jobs = new Map();

  /** Código del Worker: las funciones de cálculo tal cual + el que atiende los pedidos. */
  function workerCode() {
    return "'use strict';\n" + WORKER_FNS.map(String).join('\n') + `
onmessage = function (e) {
  const d = e.data;
  try {
    if (d.rot) { // girar un mapa ya calculado
      const r = rotateField({ w: d.w, h: d.h, data: new Float32Array(d.buf) });
      postMessage({ id: d.id, buf: r.data.buffer }, [r.data.buffer]);
      return;
    }
    const rgba = new Uint8ClampedArray(d.buf);
    const out = d.mode === 'photo' ? preparePhoto(rgba, d.w, d.h) : preparePage(inkOf(rgba, d.w * d.h), d.w, d.h);
    postMessage({ id: d.id, buf: out.buffer }, [out.buffer]);
  } catch (err) { postMessage({ id: d.id, error: String(err) }); }
};`;
  }

  function getWorker() {
    if (worker || workerBroken || !window.Worker || !window.Blob || !window.URL) return worker;
    try {
      // Una sola URL por sesión (revocarla enseguida puede cortar la carga del Worker en equipos lentos).
      if (!workerUrl) workerUrl = URL.createObjectURL(new Blob([workerCode()], { type: 'text/javascript' }));
      worker = new Worker(workerUrl);
      worker.onmessage = (e) => {
        const j = jobs.get(e.data.id);
        if (!j) return;
        jobs.delete(e.data.id);
        if (e.data.error) j.reject(new Error(e.data.error)); else j.resolve(new Float32Array(e.data.buf));
      };
      worker.onerror = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        workerBroken = true;
        stopWorker();
      };
    } catch (e) {
      workerBroken = true;
      worker = null;
    }
    return worker;
  }

  /** Corta el Worker (y lo que estuviera calculando); el próximo pedido crea uno nuevo. */
  function stopWorker() {
    if (worker) { try { worker.terminate(); } catch (e) { /* nada */ } }
    worker = null;
    for (const j of jobs.values()) j.reject(new Error('cancelado'));
    jobs.clear();
  }

  /** Píxeles con los que se calcula cada modo (se leen YA, así el canvas puede cambiar después). */
  function pixelsFor(src, mode) {
    const w = src.width, h = src.height;
    if (mode === 'photo' && Math.max(w, h) > PHOTO_WORK_SIDE) {
      const small = fitCanvas(src, w, h, PHOTO_WORK_SIDE);
      const r = { w: small.width, h: small.height, rgba: readPixels(small) };
      release(small);
      return r;
    }
    return { w, h, rgba: readPixels(src) };
  }

  /** Mapa de tinta en el Worker. Resuelve null si no se pudo (y entonces conviene hacerlo acá). */
  async function scoreForAsync(src, mode) {
    const wk = getWorker();
    if (!wk) return null;
    const { w, h, rgba } = pixelsFor(src, mode);
    try {
      const data = await new Promise((resolve, reject) => {
        const id = ++jobSeq;
        jobs.set(id, { resolve, reject });
        wk.postMessage({ id, mode, w, h, buf: rgba.buffer }, [rgba.buffer]);
      });
      return { w, h, data };
    } catch (e) {
      return null;
    }
  }

  /** Gira un mapa 90° en el Worker (el hilo principal sigue libre). El mapa se transfiere: después de
      llamarla, `sc.data` ya no sirve. Resuelve null si no se pudo (hay que volver a calcularlo). */
  async function rotateFieldAsync(sc) {
    const wk = getWorker();
    if (!wk) return rotateField(sc);
    try {
      const data = await new Promise((resolve, reject) => {
        const id = ++jobSeq;
        jobs.set(id, { resolve, reject });
        wk.postMessage({ id, rot: true, w: sc.w, h: sc.h, buf: sc.data.buffer }, [sc.data.buffer]);
      });
      return { w: sc.h, h: sc.w, data };
    } catch (e) {
      return null;
    }
  }

  /** Agranda un campo de valores con interpolación bilineal. */
  function upsample(src, sw, sh, w, h) {
    const out = new Float32Array(w * h);
    const fx = sw / w, fy = sh / h;
    for (let y = 0; y < h; y++) {
      let sy = (y + 0.5) * fy - 0.5;
      sy = sy < 0 ? 0 : sy > sh - 1 ? sh - 1 : sy;
      const y0 = sy | 0, y1 = Math.min(sh - 1, y0 + 1), ty = sy - y0;
      for (let x = 0; x < w; x++) {
        let sx = (x + 0.5) * fx - 0.5;
        sx = sx < 0 ? 0 : sx > sw - 1 ? sw - 1 : sx;
        const x0 = sx | 0, x1 = Math.min(sw - 1, x0 + 1), tx = sx - x0;
        const a = src[y0 * sw + x0] + (src[y0 * sw + x1] - src[y0 * sw + x0]) * tx;
        const b = src[y1 * sw + x0] + (src[y1 * sw + x1] - src[y1 * sw + x0]) * tx;
        out[y * w + x] = a + (b - a) * ty;
      }
    }
    return out;
  }

  /** Rangos de píxeles de origen para cada píxel de destino (al achicar). */
  function spans(sn, dn) {
    const a = new Int32Array(dn + 1);
    for (let i = 0; i <= dn; i++) a[i] = Math.min(sn, Math.floor((i * sn) / dn));
    for (let i = 1; i <= dn; i++) if (a[i] <= a[i - 1]) a[i] = Math.min(sn, a[i - 1] + 1);
    return a;
  }

  /** Achica un campo quedándose con el MÁXIMO de cada bloque (la tinta más fuerte): una línea finita
      sigue siendo una línea en la vista previa, igual que en la imagen grande que se guarda. */
  function poolMax(src, sw, sh, dw, dh) {
    const xs = spans(sw, dw), ys = spans(sh, dh);
    const tmp = new Float32Array(dw * sh);
    for (let y = 0; y < sh; y++) {
      const row = y * sw, o = y * dw;
      for (let dx = 0; dx < dw; dx++) {
        let m = 0;
        for (let x = xs[dx], e = xs[dx + 1]; x < e; x++) if (src[row + x] > m) m = src[row + x];
        tmp[o + dx] = m;
      }
    }
    const out = new Float32Array(dw * dh);
    for (let dy = 0; dy < dh; dy++) {
      const o = dy * dw;
      for (let y = ys[dy], e = ys[dy + 1]; y < e; y++) {
        const r = y * dw;
        for (let dx = 0; dx < dw; dx++) if (tmp[r + dx] > out[o + dx]) out[o + dx] = tmp[r + dx];
      }
    }
    return out;
  }

  /** Lleva un mapa de tinta a w × h (máximo por bloque al achicar, bilineal al agrandar). */
  function fieldAt(sc, w, h) {
    if (sc.w === w && sc.h === h) return sc.data;
    if (w * h < sc.w * sc.h) return poolMax(sc.data, sc.w, sc.h, w, h);
    return upsample(sc.data, sc.w, sc.h, w, h);
  }

  /** Gira un mapa 90° en sentido horario (igual que rotate90 con el canvas). */
  function rotateField(sc) {
    const { w, h, data } = sc;
    const out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      const nx = h - 1 - y, row = y * w;
      for (let x = 0; x < w; x++) out[x * h + nx] = data[row + x];
    }
    return { w: h, h: w, data: out };
  }

  /** Buffers de trabajo reutilizables (así mover el deslizador no genera basura en cada paso). */
  function makeBufs(n) {
    return { n, mask: new Uint8Array(n), state: new Uint8Array(n), stack: new Int32Array(n), list: new Int32Array(n), hd: null, img: null };
  }

  /** Quita componentes de valor `val` chicas (área < minArea o lado mayor < minLen) pasándolas al otro valor.
      Recorrido acotado: apenas una componente resulta grande (o toca una ya grande) se deja de explorar,
      así el fondo blanco enorme no se recorre entero con la pila. */
  function removeSmall(mask, w, h, val, minArea, minLen, conn8, B) {
    const st = B.state, stack = B.stack, list = B.list;
    st.fill(0); // 0 = sin ver, 1 = en la pila, 2 = grande, 3 = ya resuelta (chica)
    const flip = 1 - val;
    for (let y0s = 0, s = 0; y0s < h; y0s++) {
      for (let x0s = 0; x0s < w; x0s++, s++) {
        if (st[s] || mask[s] !== val) continue;
        // Atajo: si el vecino de la izquierda o de arriba ya es "grande", esta también.
        if ((x0s > 0 && st[s - 1] === 2 && mask[s - 1] === val) || (y0s > 0 && st[s - w] === 2 && mask[s - w] === val)) { st[s] = 2; continue; }
        let sp = 0, cnt = 0, big = false;
        let x0 = x0s, x1 = x0s, y0 = y0s, y1 = y0s;
        stack[sp++] = s;
        st[s] = 1;
        fill: while (sp) {
          const p = stack[--sp];
          list[cnt++] = p;
          const y = (p / w) | 0, x = p - y * w;
          if (x < x0) x0 = x; else if (x > x1) x1 = x;
          if (y < y0) y0 = y; else if (y > y1) y1 = y;
          if (cnt >= minArea && Math.max(x1 - x0, y1 - y0) + 1 >= minLen) { big = true; break; }
          for (let dy = -1; dy <= 1; dy++) {
            const yy = y + dy;
            if (yy < 0 || yy >= h) continue;
            for (let dx = -1; dx <= 1; dx++) {
              if (!dx && !dy) continue;
              if (!conn8 && dx && dy) continue;
              const xx = x + dx;
              if (xx < 0 || xx >= w) continue;
              const q = yy * w + xx;
              if (mask[q] !== val) continue;
              const sq = st[q];
              if (sq === 2) { big = true; break fill; }
              if (!sq) { st[q] = 1; stack[sp++] = q; }
            }
          }
        }
        if (big) {
          for (let i = 0; i < cnt; i++) st[list[i]] = 2;
          for (let i = 0; i < sp; i++) st[stack[i]] = 2;
        } else {
          for (let i = 0; i < cnt; i++) { mask[list[i]] = flip; st[list[i]] = 3; }
        }
      }
    }
  }

  /** Engrosa las líneas: negro todo lo que está a distancia (euclídea) ≤ r de una línea, redondito.
      Primero la distancia horizontal a la línea más cercana de cada fila; después, para cada fila, se miran
      las 2R+1 filas vecinas (r es chico: 1–5 px). Todo recorriendo por filas, rápido y sin decimales. */
  function dilate(mask, w, h, r, B) {
    if (r < 0.6) return;
    const n = w * h, R = Math.floor(r), CAP = 255;
    if (!B.hd || B.hd.length !== n) B.hd = new Uint8Array(n);
    const hd = B.hd;
    for (let y = 0; y < h; y++) {
      const o = y * w;
      let d = CAP;
      for (let x = 0; x < w; x++) { if (mask[o + x]) d = 0; else if (d < CAP) d++; hd[o + x] = d; }
      d = CAP;
      for (let x = w - 1; x >= 0; x--) { if (mask[o + x]) d = 0; else if (d < CAP) d++; if (d < hd[o + x]) hd[o + x] = d; }
    }
    const lim = [];
    for (let dy = -R; dy <= R; dy++) lim.push(Math.floor(Math.sqrt(r * r - dy * dy)));
    for (let y = 0; y < h; y++) {
      const o = y * w;
      mask.fill(0, o, o + w);
      for (let dy = -R; dy <= R; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        const L = lim[dy + R], o2 = yy * w;
        for (let x = 0; x < w; x++) if (hd[o2 + x] <= L) mask[o + x] = 1;
      }
    }
  }

  /** Umbral según el nivel del deslizador (0 = pocas líneas, 100 = muchas). */
  function thresholdFor(mode, level) {
    if (mode === 'photo') return 1 - U.clamp(level, 0, 100) / 100 - 0.004; // ver photoContours
    return U.lerp(0.6, 0.14, U.clamp(level, 0, 100) / 100);
  }

  /** Máscara final (1 = negro) con limpieza: sin manchitas sueltas ni agujeritos blancos.
      `score` ya está a w × h. Usa (y reusa) los buffers de B. */
  function binarize(score, w, h, mode, level, thick, B) {
    const n = w * h, L = Math.max(w, h);
    const thr = thresholdFor(mode, level);
    const mask = B.mask;
    for (let i = 0; i < n; i++) mask[i] = score[i] > thr ? 1 : 0;
    if (mode === 'photo') {
      // Los contornos ya son cerrados: sólo se quitan anillitos de zonas diminutas.
      removeSmall(mask, w, h, 1, (L * 0.006) ** 2, 0, true, B);
    } else {
      removeSmall(mask, w, h, 1, (L * 0.0045) ** 2, 0, true, B);
    }
    if (thick) dilate(mask, w, h, L * 0.0022, B);
    removeSmall(mask, w, h, 0, (L * 0.009) ** 2, 0, false, B);
    return mask;
  }

  /** Pinta la máscara en un canvas: sólo #000 y #fff, opaco. */
  function maskToCanvas(mask, w, h, target, B) {
    const c = target || U.canvas(w, h);
    if (c.width !== w) c.width = w;
    if (c.height !== h) c.height = h;
    const ctx = c.getContext('2d');
    let img = B && B.img;
    if (!img || img.width !== w || img.height !== h) {
      img = ctx.createImageData(w, h);
      if (B) B.img = img;
    }
    const px = new Uint32Array(img.data.buffer);
    for (let i = 0; i < w * h; i++) px[i] = mask[i] ? 0xff000000 : 0xffffffff;
    ctx.putImageData(img, 0, 0);
    return c;
  }

  /** Blanco y negro a w × h desde un mapa de tinta (lo usan la vista previa y el guardado). */
  function renderScore(sc, w, h, mode, level, thick, B, target) {
    const bufs = B && B.n === w * h ? B : makeBufs(w * h);
    const mask = binarize(fieldAt(sc, w, h), w, h, mode, level, thick, bufs);
    return maskToCanvas(mask, w, h, target, bufs === B ? B : null);
  }

  /** Procesa un canvas a color y devuelve un canvas blanco y negro puro del mismo tamaño (lo que se guarda). */
  function process(canvas, { mode = 'page', level = DEFAULT_LEVEL, thick = true } = {}) {
    return renderScore(scoreFor(canvas, mode), canvas.width, canvas.height, mode, level, thick);
  }

  /** Dimensiones de la vista previa con lado mayor `side`, con la proporción de w × h. */
  function sizeFor(w, h, side) {
    const s = Math.min(1, side / Math.max(w, h));
    return [Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s))];
  }

  /** Vista previa como la de la pantalla: mismo mapa de tinta que el guardado, reducido a `side`. */
  function preview(canvas, { mode = 'page', level = DEFAULT_LEVEL, thick = true } = {}, side = 760) {
    const [w, h] = sizeFor(canvas.width, canvas.height, side);
    return renderScore(scoreFor(canvas, mode), w, h, mode, level, thick);
  }

  /** ¿Parece una página para colorear (mucho papel, poco color) o una foto? */
  function guessMode(src, sc) {
    const small = fitCanvas(src, src.width, src.height, 220);
    const w = small.width, h = small.height, n = w * h;
    const rgba = readPixels(small);
    release(small);
    const [kr, kg, kb] = paperColor(rgba, n);
    let paper = 0, sat = 0;
    for (let y = 0; y < h; y++) {
      const sy = Math.min(sc.h - 1, (((y + 0.5) * sc.h) / h) | 0) * sc.w;
      for (let x = 0; x < w; x++) {
        const j = (y * w + x) * 4;
        const r = rgba[j] * kr, g = rgba[j + 1] * kg, b = rgba[j + 2] * kb;
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        sat += mx ? (mx - mn) / mx : 0;
        if (sc.data[sy + Math.min(sc.w - 1, (((x + 0.5) * sc.w) / w) | 0)] < 0.12) paper++;
      }
    }
    return paper / n > 0.6 && sat / n < 0.25 ? 'page' : 'photo';
  }

  /** Canvas con fondo blanco (las transparencias quedan blancas). */
  function whiteCanvas(w, h) {
    const c = U.canvas(w, h);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    return c;
  }

  /** Copia `source` a un lado mayor de `side` sobre fondo blanco (achica, o agranda si `grow`). */
  function fitCanvas(source, sw, sh, side, grow = false) {
    const s = grow ? side / Math.max(sw, sh) : Math.min(1, side / Math.max(sw, sh));
    const c = whiteCanvas(Math.max(1, Math.round(sw * s)), Math.max(1, Math.round(sh * s)));
    c.getContext('2d').drawImage(source, 0, 0, c.width, c.height);
    return c;
  }

  /** Blob -> canvas (respeta la orientación EXIF). Lado mayor entre MIN_SIDE y MAX_SIDE: las grandes se
      achican y las chicas se agrandan suave (así las líneas no quedan escalonadas al colorear).
      Los SVG son vectoriales: se dibujan directo a MAX_SIDE. Rechaza si no se puede leer. */
  async function decode(blob) {
    const svg = /svg/i.test(blob.type || '') || /\.svg$/i.test(blob.name || '');
    let src = null;
    if (!svg && window.createImageBitmap) {
      try { src = await createImageBitmap(blob, { imageOrientation: 'from-image' }); } catch (e) { src = null; }
    }
    if (!src) src = await U.blobToImage(blob); // <img> también respeta EXIF
    let sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height;
    if (svg && (!sw || !sh)) { sw = 300; sh = 150; }
    if (!sw || !sh) throw new Error('Imagen vacía');
    if (!svg && (sw < 16 || sh < 16)) { if (src.close) src.close(); throw new Error('Imagen muy chica'); }
    const long = Math.max(sw, sh);
    let c;
    if (svg) c = fitCanvas(src, sw, sh, MAX_SIDE, true);
    else if (long < MIN_SIDE) c = fitCanvas(src, sw, sh, MIN_SIDE, true);
    else c = fitCanvas(src, sw, sh, MAX_SIDE);
    if (src.close) src.close();
    return c;
  }

  /** Gira un canvas 90° en sentido horario. */
  function rotate90(src) {
    const c = whiteCanvas(src.height, src.width);
    const ctx = c.getContext('2d');
    ctx.translate(c.width, 0);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(src, 0, 0);
    return c;
  }

  let debugState = null; // para las pruebas: estado de la pantalla actual
  // Tope de la vista previa nítida: baja solo si en este equipo la nítida tarda (tablet o celular lento).
  let previewCap = PREVIEW_MAX;

  CL.upload = {
    MAX_SIDE, MIN_SIDE, PREVIEW_MIN, PREVIEW_MAX, DRAG_SIDE, THUMB_SIDE, DEFAULT_LEVEL,
    decode, process, preview, rotate90,
    debug: () => (debugState ? debugState() : null),
    // Piezas internas, sólo para las pruebas de rendimiento (dev/subir/prof2.mjs).
    _p: { workerCode, workerState: () => ({ worker: !!worker, workerBroken, jobs: jobs.size }), readPixels, inkOf, preparePage, preparePhoto, fitCanvas, scoreFor, rotateField, fieldAt, makeBufs, binarize, removeSmall, dilate, maskToCanvas },
  };

  /* ------------------------------------------------------------------ */
  /* Pantalla                                                              */
  /* ------------------------------------------------------------------ */
  CL.router.register('subir', (function () {
    let cleanup = null;

    function mount(root) {
      const st = {
        view: 'pick',
        src: null,          // canvas a color (lado mayor 1400–2048 px)
        token: 0,           // cambia con cada imagen nueva o giro (para descartar trabajos viejos)
        imgId: 0,           // cambia sólo con cada imagen nueva
        rot: 0,             // giros hechos a la imagen actual (los cálculos en curso se giran al llegar)
        score: {},          // mapas de tinta por modo, a resolución de trabajo
        jobs: {},           // cálculos de mapas en curso (promesas) por modo
        autoPhoto: false,   // ya se eligió el nivel inicial del modo foto para esta imagen
        pools: new Map(),   // mapas reducidos para la vista previa: 'modo@lado' -> Float32Array
        bufs: null,         // buffers de la vista previa (se reusan entre cuadros)
        side: 0,            // lado mayor de la vista previa nítida (tamaño en pantalla × dpr)
        shownSide: 0,       // lado con el que se procesó lo que se ve ahora
        mode: 'page',
        level: { page: DEFAULT_LEVEL, photo: DEFAULT_LEVEL },
        thick: true,
        busy: false, saving: false, saved: null,
        black: 0, warned: null, // fracción negra de la vista previa; aviso de "página vacía" ya mostrado
        raf: 0, want: 'full', lastMs: 0, fullMs: 0, renders: 0,
        stream: null, facing: 'environment', dead: false, shootTimer: 0,
      };
      const offs = [];
      const on = (target, type, fn, opts) => { target.addEventListener(type, fn, opts); offs.push(() => target.removeEventListener(type, fn, opts)); };
      const locked = () => st.busy || st.saving || st.dead;

      /* ---------- Entradas de archivo (ocultas) ---------- */
      const fileInput = el('input.up-input', { type: 'file', accept: 'image/*', tabindex: '-1', 'aria-hidden': 'true' });
      const camInput = el('input.up-input', { type: 'file', accept: 'image/*', capture: 'environment', tabindex: '-1', 'aria-hidden': 'true' });
      const onPicked = (ev) => {
        const f = ev.target.files && ev.target.files[0];
        ev.target.value = '';
        if (f) loadBlob(f);
      };
      fileInput.addEventListener('change', onPicked);
      camInput.addEventListener('change', onPicked);

      /* ---------- 1. Elegir ---------- */
      const cardFile = el('button.up-card.up-card--file', { type: 'button', 'aria-label': 'Elegir una foto o dibujo guardado', title: 'Elegir archivo' }, CL.icon('upFile'));
      const cardCam = el('button.up-card.up-card--cam', { type: 'button', 'aria-label': 'Sacar una foto con la cámara', title: 'Cámara' }, CL.icon('camera'));
      cardFile.addEventListener('click', () => { if (locked()) return; CL.sound.play('open'); fileInput.click(); });
      cardCam.addEventListener('click', () => { if (locked()) return; CL.sound.play('open'); openCamera(); });
      const pick = el('div.up-view.up-pick', null, [
        el('div.topbar', null, [CL.ui.backButton(), CL.ui.homeButton(), el('div.spacer'), CL.ui.muteButton()]),
        el('div.up-choices', null, [cardFile, cardCam]),
        fileInput, camInput,
      ]);
      // El aviso de error va fuera de las vistas: se ve tanto al elegir como en la edición.
      const errBubble = el('div.up-err', { role: 'alert', 'aria-label': 'No se pudo usar esa imagen', hidden: true }, CL.icon('upBroken'));

      /* ---------- 2. Ajustar ---------- */
      const out = el('canvas.up-out', { 'aria-label': 'Vista previa en blanco y negro', role: 'img' });
      const orig = el('canvas.up-orig', { 'aria-hidden': 'true' });
      const paper = el('div.up-paper', null, [out, orig]);
      const stage = el('div.up-stage', null, paper);
      CL.ui.noGestures(stage);

      const btnPage = CL.ui.button({ icon: 'upPage', label: 'Página para colorear', cls: 'up-mode', sound: 'select', onTap: () => setMode('page') });
      const btnPhoto = CL.ui.button({ icon: 'upPortrait', label: 'Foto: sacar los contornos', cls: 'up-mode', sound: 'select', onTap: () => setMode('photo') });
      const btnRotate = CL.ui.button({ icon: 'upRotate', label: 'Girar', cls: 'up-rotate', sound: 'pop', onTap: rotate });
      const btnThick = CL.ui.button({ icon: 'upThick', label: 'Líneas más gruesas', cls: 'up-thick', sound: 'select', onTap: toggleThick });
      const btnEye = CL.ui.button({ icon: 'upEye', label: 'Mantené apretado para ver la original', cls: 'up-eye', sound: null });
      const showOrig = (v) => { paper.classList.toggle('show-orig', v); btnEye.classList.toggle('pressed', v); };
      btnEye.addEventListener('pointerdown', (ev) => { ev.preventDefault(); try { btnEye.setPointerCapture(ev.pointerId); } catch (e) { /* nada */ } showOrig(true); });
      for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) btnEye.addEventListener(t, () => showOrig(false));
      btnEye.addEventListener('keydown', (ev) => { if (ev.key === ' ' || ev.key === 'Enter') { ev.preventDefault(); showOrig(true); } });
      btnEye.addEventListener('keyup', () => showOrig(false));

      const range = el('input.up-range', { type: 'range', min: '0', max: '100', step: '1', 'aria-label': 'Cantidad de líneas' });
      const btnLess = CL.ui.button({ icon: 'minus', label: 'Menos líneas', cls: 'btn-sm up-less', sound: null, onTap: () => nudge(-8) });
      const btnMore = CL.ui.button({ icon: 'plus', label: 'Más líneas', cls: 'btn-sm up-more', sound: null, onTap: () => nudge(8) });
      let lastTick = -1;
      // Mientras se arrastra: vista previa rápida; al soltar (o al quedarse quieto) se refina nítida.
      const refine = U.debounce(() => requestRender('full'), 170);
      range.addEventListener('input', () => {
        if (locked() || !st.src) { range.value = String(st.level[st.mode]); return; }
        setLevel(+range.value, 'fast');
        refine();
        const step = Math.round(+range.value / 10);
        if (step !== lastTick) { lastTick = step; CL.sound.play('tick', { step: step - 5 }); }
      });
      range.addEventListener('change', () => { refine.cancel(); requestRender('full'); });

      const btnSave = CL.ui.button({ icon: 'upSave', label: 'Guardar y pintar', cls: 'btn-pill btn-go up-save', sound: null, onTap: save });
      const btnBack = CL.ui.button({ icon: 'back', label: 'Volver sin guardar', cls: 'btn-back', onTap: () => { if (!locked()) backToPick(); } });

      const panel = el('div.up-panel', null, [
        el('div.up-group.up-modes', { role: 'group', 'aria-label': 'Tipo de imagen' }, [btnPage, btnPhoto]),
        el('div.up-group.up-tools', null, [btnRotate, btnThick, btnEye]),
        el('div.up-slider', null, [btnLess, range, btnMore]),
        el('div.up-actions', null, btnSave),
      ]);
      const edit = el('div.up-view.up-edit', { hidden: true }, [
        el('div.topbar.up-bar', null, [btnBack, CL.ui.homeButton(), el('div.spacer'), CL.ui.muteButton()]),
        stage, panel,
      ]);

      /* ---------- Visor de cámara (compu) ---------- */
      const video = el('video.up-video', { playsinline: true, muted: true, autoplay: true, 'aria-label': 'Cámara' });
      video.muted = true;
      const flash = el('div.up-flash');
      const btnShoot = el('button.up-shutter', { type: 'button', 'aria-label': 'Sacar la foto', title: 'Sacar la foto' }, el('span.up-shutter-dot'));
      btnShoot.addEventListener('click', shoot);
      const btnCamClose = CL.ui.button({
        icon: 'close', label: 'Cancelar', cls: 'up-cam-close',
        onTap: () => {
          // Si la foto recién sacada se está procesando, se descarta (useImage ve que la imagen cambió).
          if (st.busy && !st.saving) { dropImage(); setBusy(false); }
          closeCamera();
          showView('pick');
        },
      });
      const btnFlip = CL.ui.button({ icon: 'upFlip', label: 'Cambiar de cámara', cls: 'up-cam-flip', sound: 'select', onTap: flipCamera });
      btnFlip.hidden = true;
      const cam = el('div.up-view.up-cam', { hidden: true }, [video, flash, btnCamClose, btnFlip, el('div.up-cam-mute', null, CL.ui.muteButton()), btnShoot]);
      CL.ui.noGestures(cam);

      root.append(pick, edit, cam, errBubble);

      /* ---------- Estado de la interfaz ---------- */
      function showView(v) {
        st.view = v;
        pick.hidden = v !== 'pick';
        edit.hidden = v !== 'edit';
        cam.hidden = v !== 'camera';
      }

      let stopSpin = null;
      /** Ocupado: se bloquean los controles al instante; el atenuado y los puntitos aparecen sólo si
          tarda más de ~150 ms (CSS), así las cosas rápidas no parpadean. */
      function setBusy(b) {
        st.busy = b;
        root.classList.toggle('up-busy', b);
        if (b && !stopSpin) stopSpin = CL.ui.spinner(root);
        if (!b && stopSpin) { stopSpin(); stopSpin = null; }
      }
      /** Deja pasar dos cuadros (para que se pinte el estado ocupado antes de un cálculo pesado). */
      const frames = async () => { await U.nextFrame(); await U.nextFrame(); };

      let errTimer = 0;
      function showError(icon = 'upBroken') {
        CL.sound.play('nope');
        errBubble.replaceChildren(CL.icon(icon));
        errBubble.hidden = false;
        errBubble.classList.remove('in');
        void errBubble.offsetWidth;
        errBubble.classList.add('in');
        root.classList.add('has-err');
        clearTimeout(errTimer);
        errTimer = setTimeout(hideError, 3200);
      }
      function hideError() {
        clearTimeout(errTimer);
        errBubble.hidden = true;
        root.classList.remove('has-err');
      }

      function syncControls() {
        btnPage.classList.toggle('active', st.mode === 'page');
        btnPhoto.classList.toggle('active', st.mode === 'photo');
        btnPage.setAttribute('aria-pressed', String(st.mode === 'page'));
        btnPhoto.setAttribute('aria-pressed', String(st.mode === 'photo'));
        btnThick.classList.toggle('active', !!st.thick);
        btnThick.setAttribute('aria-pressed', String(!!st.thick));
        range.value = String(st.level[st.mode]);
        range.style.setProperty('--val', st.level[st.mode] + '%');
      }

      /* ---------- Imagen actual ---------- */
      function dropImage() {
        cancelAnimationFrame(st.raf);
        st.raf = 0;
        refine.cancel();
        release(st.src);
        st.src = null;
        st.score = {};
        // Lo que se estaba calculando para la imagen anterior ya no sirve: se corta.
        if (Object.values(st.jobs).some(Boolean)) stopWorker();
        st.jobs = {};
        st.pools.clear();
        st.bufs = null;
        st.saved = null;
        st.autoPhoto = false;
        st.rot = 0;
        st.token++;
        st.imgId++;
        orig.width = 0; // "ver original" se vuelve a dibujar con la imagen nueva
        st.warned = null;
      }

      /** Mapa de tinta de un modo para la imagen actual (en el Worker si se puede). Resuelve null si la
          imagen cambió mientras tanto. */
      function ensureScore(mode) {
        if (st.score[mode]) return Promise.resolve(st.score[mode]);
        if (st.jobs[mode]) return st.jobs[mode];
        const img = st.imgId, rot = st.rot;
        const job = scoreForAsync(st.src, mode).then((sc) => {
          if (st.dead || img !== st.imgId) return null;
          st.jobs[mode] = null;
          if (!sc) sc = scoreFor(st.src, mode); // sin Worker: acá mismo, con la imagen como está ahora
          else for (let k = (st.rot - rot) % 4; k > 0; k--) sc = rotateField(sc); // si la giraron mientras
          st.score[mode] = sc;
          return sc;
        }).catch((e) => { if (img === st.imgId) st.jobs[mode] = null; throw e; }); // se puede reintentar
        st.jobs[mode] = job;
        return job;
      }

      function backToPick() {
        dropImage();
        showView('pick');
        leaveEditHistory();
      }

      /* ---------- Atrás del sistema en la edición ----------
         Al entrar a la edición se agrega una entrada al historial (con el mismo hash, el router no se entera):
         el "atrás" de Android vuelve a elegir en vez de salir de la pantalla y perder la imagen. */
      let histPushed = false;
      function enterEdit() {
        if (histPushed) return;
        try {
          history.pushState(Object.assign({}, history.state, { upEdit: 1 }), '', location.href);
          histPushed = true;
        } catch (e) { /* sin historial: el atrás sale de la pantalla, como antes */ }
      }
      /** Saca la entrada propia del historial (al volver con el botón de la app o al ir a pintar). */
      function leaveEditHistory() {
        if (!histPushed) return Promise.resolve();
        histPushed = false;
        return new Promise((resolve) => {
          const done = () => { clearTimeout(t); window.removeEventListener('popstate', done); resolve(); };
          const t = setTimeout(done, 400);
          window.addEventListener('popstate', done);
          history.back();
        });
      }
      on(window, 'popstate', () => {
        if (!histPushed || (history.state && history.state.upEdit)) return;
        histPushed = false;
        if (st.view !== 'edit') return;
        if (locked()) { enterEdit(); return; } // ocupado (girando, guardando): el atrás no hace nada
        CL.sound.play('tap');
        backToPick();
      });

      /* ---------- Cargar ---------- */
      async function loadBlob(blob) {
        if (locked()) return;
        hideError();
        if (blob.type && !/^image\//i.test(blob.type)) { showError(); return; }
        setBusy(true);
        await frames();
        let c = null;
        try { c = await decode(blob); } catch (e) { c = null; }
        if (st.dead) { release(c); return; }
        if (!c) {
          // Si ya había una imagen en la edición, se queda como estaba: sólo se avisa.
          await U.nextFrame();
          setBusy(false);
          showError();
          return;
        }
        await useImage(c);
      }

      /** Toma una imagen nueva (ya decodificada): calcula su mapa de tinta y pasa a la edición.
          Se llama con la pantalla ocupada; la libera al terminar. */
      async function useImage(c) {
        dropImage();
        st.src = c;
        const img = st.imgId;
        const gone = () => st.dead || img !== st.imgId;
        // Cada imagen arranca con los valores por defecto (no se hereda lo que tocó el chico anterior).
        st.level = { page: DEFAULT_LEVEL, photo: DEFAULT_LEVEL };
        st.thick = true;
        try {
          const page = await ensureScore('page');
          if (gone()) return;
          if (!page) throw new Error('sin mapa');
          st.mode = guessMode(c, page);
          if (st.mode === 'photo') {
            if (!(await ensureScore('photo'))) { if (gone()) return; throw new Error('sin mapa'); }
            if (gone()) return;
            st.level.photo = autoPhotoLevel();
            st.autoPhoto = true;
          }
          hideError();
          syncControls();
          showView('edit');
          fit(true);
          renderNow('full');
        } catch (e) {
          // Sin memoria (Safari en iOS tiene un tope de canvas), etc.: se avisa y se puede probar con otra.
          if (gone()) return;
          console.warn('No se pudo procesar la imagen', e);
          dropImage();
          showView('pick');
          setBusy(false);
          showError();
          return;
        }
        enterEdit();
        CL.sound.play('pop');
        await U.nextFrame(); // los toques que quedaron en cola mientras calculaba se ignoran
        if (gone()) return;
        setBusy(false);
        // El otro modo se va preparando en segundo plano: así cambiar de modo después es instantáneo.
        ensureScore(st.mode === 'page' ? 'photo' : 'page').catch(() => { /* se reintenta al elegirlo */ });
        // Y la versión chica para arrastrar el deslizador, cuando no haya nada que hacer.
        const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 250));
        idle(() => {
          try { if (!gone() && st.score[st.mode] && st.side > DRAG_SIDE * 1.15) poolFor(st.mode, DRAG_SIDE); } catch (e) { /* no hace falta */ }
        });
      }

      /* ---------- Vista previa ---------- */
      /** Mapa reducido de un modo al lado `side` (en caché: el deslizador sólo vuelve a umbralizar). */
      function poolFor(mode, side) {
        const [w, h] = sizeFor(st.src.width, st.src.height, side);
        const key = mode + '@' + w + 'x' + h;
        let p = st.pools.get(key);
        if (!p) {
          p = { w, h, data: fieldAt(st.score[mode], w, h) };
          // Se guardan pocos: el rápido y el nítido de cada modo.
          if (st.pools.size >= 4) st.pools.delete(st.pools.keys().next().value);
          st.pools.set(key, p);
        }
        return p;
      }

      /** Nivel inicial del modo foto: el más alto (hasta el de siempre) que no llene la hoja de rayas.
          Una foto de un paisaje con nubes y agua da muchísimos bordes; un retrato o una mascota, pocos. */
      function autoPhotoLevel() {
        const p = poolFor('photo', DRAG_SIDE);
        const B = makeBufs(p.w * p.h), n = p.w * p.h, MAX_BLACK = 0.12;
        const black = (lv) => {
          const m = binarize(p.data, p.w, p.h, 'photo', lv, true, B);
          let k = 0;
          for (let i = 0; i < n; i++) k += m[i];
          return k / n;
        };
        if (black(DEFAULT_LEVEL) <= MAX_BLACK) return DEFAULT_LEVEL;
        let lo = 10, hi = DEFAULT_LEVEL;
        for (let i = 0; i < 5; i++) {
          const mid = (lo + hi) >> 1;
          if (black(mid) <= MAX_BLACK) lo = mid; else hi = mid;
        }
        return lo;
      }

      function renderNow(kind) {
        if (!st.src || st.dead) return;
        const sc = st.score[st.mode];
        if (!sc) return;
        // Rápido sólo si el nítido tarda (compus rápidas siempre lo ven nítido).
        const fast = kind === 'fast' && st.fullMs > 30 && st.side > DRAG_SIDE * 1.15;
        if (!st.side) st.side = Math.min(760, Math.max(st.src.width, st.src.height)); // sin medidas todavía
        const side = fast ? DRAG_SIDE : Math.min(st.side, Math.max(previewCap, DRAG_SIDE));
        const t0 = performance.now();
        const p = poolFor(st.mode, side);
        if (!st.bufs || st.bufs.n !== p.w * p.h) st.bufs = makeBufs(p.w * p.h);
        const mask = binarize(p.data, p.w, p.h, st.mode, st.level[st.mode], st.thick, st.bufs);
        maskToCanvas(mask, p.w, p.h, out, st.bufs);
        let k = 0;
        for (let i = 0, n = p.w * p.h; i < n; i++) k += mask[i];
        st.black = k / (p.w * p.h);
        const ms = performance.now() - t0;
        st.lastMs = ms;
        if (!fast) {
          st.fullMs = ms;
          // Muy lenta: las próximas se hacen más chicas (se nota poco: las líneas son gruesas).
          if (ms > 120 && side > 760) previewCap = Math.max(760, Math.round(side * 0.75));
          if (orig.width !== p.w || orig.height !== p.h || origToken !== st.token) drawOrig(p.w, p.h);
        }
        st.shownSide = side;
        st.renders++;
      }

      /** Pide una actualización (a lo sumo una por cuadro; la nítida le gana a la rápida). */
      function requestRender(kind) {
        if (kind === 'full' || !st.raf) st.want = kind;
        if (!st.raf) st.raf = requestAnimationFrame(() => { st.raf = 0; renderNow(st.want); });
      }

      let origToken = -1;
      function drawOrig(w, h) {
        origToken = st.token;
        orig.width = w;
        orig.height = h;
        const ctx = orig.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(st.src, 0, 0, w, h);
      }

      /** Ajusta el papel al espacio disponible y elige la resolución de la vista previa (pantalla × dpr). */
      function fit(force) {
        if (!st.src || edit.hidden) return;
        const r = stage.getBoundingClientRect();
        const cs = getComputedStyle(stage);
        const aw = r.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        const ah = r.height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
        if (aw <= 0 || ah <= 0) return;
        const W = st.src.width, H = st.src.height, L = Math.max(W, H);
        const s = Math.min(aw / W, ah / H);
        paper.style.width = Math.floor(W * s) + 'px';
        paper.style.height = Math.floor(H * s) + 'px';
        const side = Math.round(U.clamp(L * s * U.dpr(), Math.min(PREVIEW_MIN, L), Math.min(PREVIEW_MAX, L)));
        if (force || !st.side) st.side = side;
        else if (Math.abs(side - st.side) / st.side > 0.1) { st.side = side; resized(); }
      }
      const resized = U.debounce(() => requestRender('full'), 200);
      const ro = new ResizeObserver(() => fit(false));
      ro.observe(stage);

      /* ---------- Controles ---------- */
      async function setMode(m) {
        if (st.mode === m || locked() || !st.src) return;
        const img = st.imgId, prev = st.mode;
        st.mode = m;
        syncControls();
        try {
          if (!st.score[m]) {
            // Normalmente ya está listo (se prepara en segundo plano al cargar). Si no, se espera ocupado.
            setBusy(true);
            await frames();
            const sc = await ensureScore(m);
            if (st.dead || img !== st.imgId) return;
            if (!sc) throw new Error('sin mapa');
            await U.nextFrame();
            setBusy(false);
          }
          if (m === 'photo' && !st.autoPhoto) { st.level.photo = autoPhotoLevel(); st.autoPhoto = true; syncControls(); }
          renderNow('full');
        } catch (e) {
          if (st.dead || img !== st.imgId) return;
          console.warn('No se pudo cambiar de modo', e);
          st.mode = prev; // queda como estaba
          syncControls();
          setBusy(false);
          showError();
          return;
        }
        paper.classList.remove('flip-in');
        void paper.offsetWidth;
        paper.classList.add('flip-in');
      }

      function setLevel(v, kind) {
        st.level[st.mode] = U.clamp(Math.round(v), 0, 100);
        range.style.setProperty('--val', st.level[st.mode] + '%');
        requestRender(kind);
      }

      function nudge(d) {
        if (locked() || !st.src) return;
        const v = U.clamp(st.level[st.mode] + d, 0, 100);
        CL.sound.play('tick', { step: Math.round(v / 10) - 5 });
        range.value = String(v);
        setLevel(v, 'full');
      }

      function toggleThick() {
        if (locked() || !st.src) return;
        st.thick = !st.thick;
        syncControls();
        requestRender('full');
      }

      async function rotate() {
        if (locked() || !st.src) return;
        setBusy(true);
        await frames();
        if (st.dead || !st.src) return;
        const img = st.imgId;
        try {
          const old = st.src;
          st.src = rotate90(old); // si no alcanza la memoria, falla acá y la imagen queda como estaba
          release(old);
          // Imagen y cuenta de giros cambian juntas: un cálculo en curso gira su resultado al llegar.
          st.rot++;
          st.pools.clear();
          st.saved = null;
          st.token++;
          // Los mapas ya calculados se giran en el Worker (el giro de 3 Mpx traba una tablet lenta).
          const done = st.score;
          st.score = {};
          for (const m of Object.keys(done)) {
            const sc = await rotateFieldAsync(done[m]);
            if (st.dead || img !== st.imgId) return;
            if (sc && !st.score[m]) st.score[m] = sc;
          }
          if (!(await ensureScore(st.mode))) throw new Error('sin mapa'); // si hubo que recalcularlo
          if (st.dead || img !== st.imgId) return;
          fit(true);
          renderNow('full');
        } catch (e) {
          if (st.dead || img !== st.imgId) return;
          console.warn('No se pudo girar la imagen', e);
          if (!st.score[st.mode]) { backToPick(); setBusy(false); showError(); return; }
          setBusy(false);
          showError();
          return;
        }
        paper.classList.remove('spin-in');
        void paper.offsetWidth;
        paper.classList.add('spin-in');
        await U.nextFrame();
        setBusy(false);
      }

      /* ---------- Guardar ---------- */
      const CANCEL = {};
      async function save() {
        if (!st.src || locked()) return;
        if (st.saved && st.saved.token === st.token) return; // esta imagen ya se guardó
        // Página vacía o casi toda negra (tapa de la lente, cuarto oscuro, foto toda blanca): no hay nada
        // para pintar. Se avisa (papel que tiembla + ícono); si igual la quieren, el segundo toque guarda.
        const key = [st.token, st.mode, st.level[st.mode], st.thick].join(':');
        if ((st.black < 0.003 || st.black > 0.6) && st.warned !== key) {
          st.warned = key;
          showError('upEmpty');
          paper.classList.remove('up-shake');
          void paper.offsetWidth;
          paper.classList.add('up-shake');
          return;
        }
        st.saving = true;
        root.classList.add('up-saving');
        CL.sound.play('pop');
        setBusy(true);
        await frames();
        const token = st.token, mode = st.mode;
        const alive = () => !st.dead && st.view === 'edit' && token === st.token;
        let bw = null, up = null;
        try {
          if (!alive()) throw CANCEL;
          const sc = await ensureScore(mode);
          if (!sc || !alive()) throw CANCEL;
          bw = renderScore(sc, st.src.width, st.src.height, mode, st.level[mode], st.thick);
          const blob = await U.canvasToBlob(bw, 'image/png');
          const tc = U.thumbnail(bw, THUMB_SIDE);
          const thumb = await U.canvasToBlob(tc, 'image/png');
          const w = bw.width, h = bw.height;
          release(tc);
          release(bw);
          bw = null;
          if (!alive()) throw CANCEL;
          up = await CL.db.uploads.save({ blob, w, h, thumb });
        } catch (e) {
          release(bw);
          st.saving = false;
          root.classList.remove('up-saving');
          setBusy(false);
          if (e !== CANCEL && !st.dead) {
            console.warn('No se pudo guardar la imagen', e);
            CL.ui.toast('upBroken', 1400);
            CL.sound.play('nope');
          }
          return;
        }
        st.saved = { id: up.id, token };
        if (st.dead) return;
        // Festejo: todo queda bloqueado (st.saving sigue en true) hasta pasar a colorear.
        setBusy(false);
        root.classList.remove('up-saving');
        root.classList.add('up-saved');
        CL.sound.play('tada');
        CL.ui.toast('check', 1000);
        await U.sleep(1000);
        if (st.dead) return;
        await leaveEditHistory(); // así "atrás" desde colorear no vuelve a esta pantalla vacía
        if (!st.dead) CL.router.replace('colorear/u-' + up.id);
      }

      /* ---------- Cámara ---------- */
      function stopStream() {
        if (st.stream) { for (const tr of st.stream.getTracks()) tr.stop(); st.stream = null; }
        video.srcObject = null;
      }

      function closeCamera() {
        clearTimeout(st.shootTimer);
        st.shootTimer = 0;
        btnShoot.disabled = false;
        stopStream();
      }

      function openCamera() {
        const md = navigator.mediaDevices;
        // Tablet/celular: la cámara nativa del sistema (mejor calidad y enfoque).
        if (U.isCoarse() || !md || !md.getUserMedia) { camInput.click(); return; }
        startStream();
      }

      async function startStream() {
        showView('camera');
        btnShoot.disabled = true;
        const asked = performance.now();
        const stopSp = CL.ui.spinner(cam);
        let stream = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: st.facing, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false,
          });
        } catch (e) { stream = null; }
        stopSp();
        if (st.dead || st.view !== 'camera') { if (stream) stream.getTracks().forEach((tr) => tr.stop()); return; }
        if (!stream) {
          // Sin cámara o sin permiso: se avisa con un ícono y se ofrece elegir un archivo. El selector sólo
          // se puede abrir poco después de un toque (el navegador lo bloquea si el permiso tardó en negarse):
          // si pasó mucho, la tarjeta de archivos late para que la toquen.
          showView('pick');
          showError('upNoCam');
          if (performance.now() - asked < 3500) fileInput.click();
          else hintFile();
          return;
        }
        stopStream();
        st.stream = stream;
        // Cámara de frente (o desconocida, típico de las notebooks): se ve como un espejo, para que
        // moverse a la izquierda también se vea a la izquierda. La foto se saca sin espejar.
        let facing = '';
        try { const tr = stream.getVideoTracks()[0]; facing = (tr && tr.getSettings && tr.getSettings().facingMode) || ''; } catch (e) { facing = ''; }
        video.classList.toggle('up-mirror', facing !== 'environment');
        video.srcObject = stream;
        try { await video.play(); } catch (e) { /* autoplay silencioso: igual se ve */ }
        btnShoot.disabled = false;
        try {
          const devs = await navigator.mediaDevices.enumerateDevices();
          btnFlip.hidden = devs.filter((d) => d.kind === 'videoinput').length < 2;
        } catch (e) { btnFlip.hidden = true; }
      }

      let hintTimer = 0;
      function hintFile() {
        cardFile.classList.remove('up-hint');
        void cardFile.offsetWidth;
        cardFile.classList.add('up-hint');
        clearTimeout(hintTimer);
        hintTimer = setTimeout(() => cardFile.classList.remove('up-hint'), 9000); // sigue latiendo después del aviso
      }

      function flipCamera() {
        st.facing = st.facing === 'environment' ? 'user' : 'environment';
        stopStream();
        startStream();
      }

      function shoot() {
        const vw = video.videoWidth, vh = video.videoHeight;
        if (!st.stream || !vw || !vh || st.shootTimer || locked()) return;
        const c = fitCanvas(video, vw, vh, MAX_SIDE);
        CL.sound.play('shutter');
        flash.classList.remove('go');
        void flash.offsetWidth;
        flash.classList.add('go');
        btnShoot.disabled = true;
        st.shootTimer = setTimeout(async () => {
          st.shootTimer = 0;
          // Si mientras tanto tocaron la X (o se fue de la pantalla), la foto se descarta.
          if (st.dead || st.view !== 'camera') { release(c); return; }
          stopStream();
          btnShoot.disabled = false;
          setBusy(true);
          await frames();
          if (st.dead) { release(c); return; }
          await useImage(c);
        }, 260);
      }

      /* ---------- Soltar o pegar una imagen ---------- */
      const imageFrom = (list) => {
        for (const f of list || []) if (f && (!f.type || /^image\//i.test(f.type))) return f;
        return list && list[0];
      };
      on(root, 'dragover', (ev) => { ev.preventDefault(); if (st.view === 'pick') pick.classList.add('dragging'); });
      on(root, 'dragleave', (ev) => { if (ev.target === root || !root.contains(ev.relatedTarget)) pick.classList.remove('dragging'); });
      on(root, 'drop', (ev) => {
        ev.preventDefault();
        pick.classList.remove('dragging');
        const f = imageFrom(ev.dataTransfer && ev.dataTransfer.files);
        if (f && st.view !== 'camera') loadBlob(f);
      });
      on(document, 'paste', (ev) => {
        if (st.view === 'camera') return;
        const items = (ev.clipboardData && ev.clipboardData.items) || [];
        for (const it of items) {
          if (it.kind === 'file' && /^image\//i.test(it.type)) { const f = it.getAsFile(); if (f) { loadBlob(f); break; } }
        }
      });

      syncControls();
      showView('pick');

      debugState = () => ({
        view: st.view, mode: st.mode, level: st.level[st.mode], thick: st.thick, busy: st.busy, saving: st.saving,
        src: st.src ? [st.src.width, st.src.height] : null,
        prev: st.src ? [out.width, out.height] : null,
        side: st.side, shownSide: st.shownSide,
        lastMs: st.lastMs, fullMs: st.fullMs, renders: st.renders,
        saved: st.saved ? st.saved.id : null, camera: !!st.stream, black: +st.black.toFixed(4), hist: histPushed,
        mirror: video.classList.contains('up-mirror'),
      });

      cleanup = () => {
        st.dead = true;
        cancelAnimationFrame(st.raf);
        clearTimeout(errTimer);
        clearTimeout(st.shootTimer);
        clearTimeout(hintTimer);
        refine.cancel();
        resized.cancel();
        stopStream();
        // El Worker retiene varios MB justo cuando colorear necesita memoria: se corta (el próximo ingreso
        // crea uno nuevo con la misma Blob URL).
        stopWorker();
        ro.disconnect();
        release(st.src);
        release(out);
        release(orig);
        st.src = null;
        st.score = {};
        st.pools.clear();
        st.bufs = null;
        for (const off of offs) off();
        debugState = null;
      };
    }

    return {
      mount,
      unmount() { if (cleanup) { cleanup(); cleanup = null; } },
    };
  })());
})(window.CL);
