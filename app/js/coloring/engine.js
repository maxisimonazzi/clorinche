/* Colorines — motor de colorear (sin interfaz).

   CL.coloring.RES()                           -> lado mayor de la imagen interna (2048, o 1536 con poca memoria)
   CL.coloring.loadSource(source, res)         -> { kind, id, name, cat, w, h, image, lineUrl, revoke() }
                                                  source = id de dibujo ('vaca') o 'u-<idUpload>'
   CL.coloring.rasterLines(image, w, h)        -> canvas opaco (líneas negras sobre blanco)
   CL.coloring.createPainter({ w, h, regions, lines }) -> painter (capa de pintura, balde, pincel, goma, borrar
                                                  todo, historial)
   CL.coloring.renderRandom(source, size, opts)-> Promise<canvas> zonas pintadas al azar + líneas
   CL.coloring.exportPNG(work)                 -> Promise<Blob> PNG a resolución completa
   CL.coloring.composite(paint, lines, w, h)   -> canvas: papel blanco + pintura + líneas (multiply)

   Capas: papel blanco, pintura (canvas con transparencia) y líneas encima en modo "multiply":
   el blanco de las líneas no cambia nada y el negro queda negro, así las líneas nunca se tapan. */
'use strict';
(function (CL) {
  const U = CL.util;

  const RES = () => (navigator.deviceMemory && navigator.deviceMemory <= 2 ? 1536 : 2048);
  const stats = { regionsMs: 0, lastFillMs: 0, loads: 0 };

  /* ---------- fuentes: dibujo del registro o imagen subida ---------- */
  async function loadSource(source, res = RES()) {
    if (typeof source === 'string' && source.startsWith('u-')) {
      const id = source.slice(2);
      const up = await CL.db.uploads.get(id);
      if (!up || !up.blob) throw new Error('No encontré la imagen subida ' + id);
      const image = await U.blobToImage(up.blob);
      const iw = image.naturalWidth || up.w, ih = image.naturalHeight || up.h;
      const s = res / Math.max(iw, ih);
      const lineUrl = URL.createObjectURL(up.blob);
      return {
        kind: 'upload', id, name: 'Mi dibujo', cat: 'mis',
        w: Math.max(1, Math.round(iw * s)), h: Math.max(1, Math.round(ih * s)),
        image, lineUrl, revoke: () => URL.revokeObjectURL(lineUrl),
      };
    }
    const d = CL.drawings.get(source);
    if (!d) throw new Error('No existe el dibujo ' + source);
    const image = await U.svgToImage(CL.drawings.svg(source, res));
    // Para mostrar se usa el SVG vectorial: se ve nítido con cualquier zoom.
    const lineUrl = URL.createObjectURL(new Blob([CL.drawings.svg(source)], { type: 'image/svg+xml;charset=utf-8' }));
    return {
      kind: 'drawing', id: source, name: d.name, cat: d.cat, w: res, h: res,
      image, lineUrl, revoke: () => URL.revokeObjectURL(lineUrl),
    };
  }

  function rasterLines(image, w, h) {
    const c = U.canvas(w, h);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, 0, 0, w, h);
    return c;
  }

  /** Papel blanco + pintura + líneas (multiply) en un canvas de w×h. */
  function composite(paint, lines, w, h) {
    const c = U.canvas(w, h);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.imageSmoothingQuality = 'high';
    if (paint) ctx.drawImage(paint, 0, 0, c.width, c.height);
    if (lines) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(lines, 0, 0, c.width, c.height);
      ctx.globalCompositeOperation = 'source-over';
    }
    return c;
  }

  /* ---------- copias de rectángulos (para deshacer) ---------- */
  function crop(src, x, y, w, h) {
    const c = U.canvas(w, h);
    const ctx = c.getContext('2d');
    ctx.drawImage(src, x, y, w, h, 0, 0, w, h);
    return c;
  }

  /* =====================================================================
     Pintor: la capa de pintura con sus herramientas e historial.
     ===================================================================== */
  function createPainter({ w, h, regions, lines }) {
    const W = w, H = h;
    const unit = Math.max(W, H) / 2048;
    const canvas = U.canvas(W, H);
    const ctx = canvas.getContext('2d');
    const events = U.emitter();
    let backup = null;       // copia de la pintura al empezar un trazo (para cancelarlo o deshacerlo)
    let tmp = null;          // canvas auxiliar para segmentos recortados
    let anim = null;         // animación de balde en curso
    let maskCache = [];     // [{ id, c }] más reciente primero
    let patCache = { key: '', c: null };
    let busy = false;
    let thumbLines = null;

    /* ----- historial con memoria acotada ----- */
    const MAX_STEPS = 50;
    const mem = navigator.deviceMemory || 4;
    const RAW_BUDGET = (mem <= 2 ? 40 : mem <= 4 ? 90 : 160) * 1024 * 1024;
    const steps = [];
    let idx = 0;
    let rawBytes = 0;

    const stepBytes = (s) => (s.before instanceof HTMLCanvasElement ? s.w * s.h * 8 : 0);

    function push(step) {
      for (const s of steps.splice(idx)) { rawBytes -= stepBytes(s); free(s); }
      steps.push(step);
      rawBytes += stepBytes(step);
      idx = steps.length;
      while (steps.length > MAX_STEPS) { const s = steps.shift(); rawBytes -= stepBytes(s); free(s); idx--; }
      compressOld();
      events.emit('history', { canUndo: idx > 0, canRedo: idx < steps.length });
    }
    function free(s) {
      for (const k of ['before', 'after']) if (s[k] instanceof HTMLCanvasElement) { s[k].width = s[k].height = 0; }
      s.dead = true;
    }
    // Si el historial ocupa mucho, los pasos viejos se guardan comprimidos en PNG (en segundo plano).
    let compressing = false;
    async function compressOld() {
      if (compressing) return;
      compressing = true;
      try {
        for (let i = 0; i < steps.length - 2 && rawBytes > RAW_BUDGET; i++) {
          const s = steps[i];
          if (!(s.before instanceof HTMLCanvasElement) || s.dead) continue;
          const [b, a] = await Promise.all([U.canvasToBlob(s.before), U.canvasToBlob(s.after)]);
          if (s.dead) continue;
          rawBytes -= stepBytes(s);
          free(s);
          s.dead = false;
          s.before = b; s.after = a;
        }
      } catch (e) { console.warn('historial', e); }
      compressing = false;
    }

    async function restore(img, s) {
      let src = img;
      if (img instanceof Blob) src = await createImageBitmap(img);
      ctx.clearRect(s.x, s.y, s.w, s.h);
      ctx.drawImage(src, s.x, s.y);
      if (src.close) src.close();
    }

    async function undo() {
      finishAnim();
      if (busy || idx <= 0) return false;
      busy = true;
      try { idx--; await restore(steps[idx].before, steps[idx]); } finally { busy = false; }
      events.emit('history', { canUndo: idx > 0, canRedo: idx < steps.length });
      events.emit('change', { type: 'undo' });
      return true;
    }
    async function redo() {
      finishAnim();
      if (busy || idx >= steps.length) return false;
      busy = true;
      try { await restore(steps[idx].after, steps[idx]); idx++; } finally { busy = false; }
      events.emit('history', { canUndo: idx > 0, canRedo: idx < steps.length });
      events.emit('change', { type: 'redo' });
      return true;
    }

    /* ----- relleno de una zona ----- */
    function zoneFill(id, fill) {
      const b = regions.bbox[id];
      const bw = b.x1 - b.x0 + 1, bh = b.y1 - b.y0 + 1;
      const c = !fill.kind || fill.kind === 'solid'
        ? solidRect(fill.color, bw, bh)
        : CL.fills.make(fill.kind, fill.color, bw, bh, { ox: b.x0, oy: b.y0, unit, color2: fill.color2 });
      const cx = c.getContext('2d');
      cx.globalCompositeOperation = 'destination-in';
      cx.drawImage(zoneMask(id), 0, 0);
      return c;
    }
    function solidRect(color, w, h) {
      const c = U.canvas(w, h);
      const cx = c.getContext('2d');
      cx.fillStyle = color;
      cx.fillRect(0, 0, w, h);
      return c;
    }
    // Máscaras de zona: las últimas usadas quedan en memoria (repintar la misma zona es instantáneo).
    function zoneMask(id) {
      const i = maskCache.findIndex((m) => m.id === id);
      if (i >= 0) { const m = maskCache.splice(i, 1)[0]; maskCache.unshift(m); return m.c; }
      const c = CL.regions.mask(regions, id);
      maskCache.unshift({ id, c });
      // Acotado por píxeles (las zonas grandes ocupan mucho).
      let px = 0;
      for (let k = 0; k < maskCache.length; k++) {
        px += maskCache[k].c.width * maskCache[k].c.height;
        if (k > 0 && (k >= 8 || px > W * H * 1.5)) { maskCache.splice(k); break; } // un trazo en curso puede seguir usándola
      }
      return c;
    }

    function finishAnim() { if (anim) anim.finish(); }

    /* Prepara en ratos libres la máscara del fondo (la zona más grande: armarla de golpe traba el primer
       balde ahí unos cientos de ms en una tablet). Se arma por tramos de filas con requestIdleCallback. */
    let warmHandle = 0, destroyed = false;
    const idle = window.requestIdleCallback
      ? (fn) => requestIdleCallback(fn, { timeout: 1500 })
      : (fn) => setTimeout(() => fn({ timeRemaining: () => 8, didTimeout: false }), 60);
    const cancelIdle = window.cancelIdleCallback || clearTimeout;
    function warm() {
      const id = regions.bg;
      if (id < 0 || warmHandle || maskCache.some((m) => m.id === id)) return;
      const it = CL.regions.maskJob(regions, id);
      const step = () => {
        warmHandle = 0;
        if (destroyed) return;
        if (maskCache.some((m) => m.id === id)) return;   // ya se armó (un balde no esperó)
        const t0 = performance.now();
        let r;
        // Tramos de ~8 ms: si justo tocan la pantalla, el toque no espera.
        do { r = it.next(); } while (!r.done && performance.now() - t0 < 8);
        if (!r.done) { warmHandle = idle(step); return; }
        // Queda al final del caché (no desplaza a las máscaras que se están usando).
        maskCache.push({ id, c: r.value });
      };
      warmHandle = idle(step);
    }

    /** Balde: pinta la zona `id` (o la de (x,y)) con una animación que se expande desde el punto. */
    function fillAt(x, y, fill, { animate = true, duration = 250 } = {}) {
      finishAnim();
      if (busy) return null;
      // Un toque en el margen, afuera del papel, pinta la zona del borde más cercano (normalmente el fondo).
      const id = regions.nearest(U.clamp(x, 0, W - 1), U.clamp(y, 0, H - 1));
      if (id < 0) return null;
      const t0 = performance.now();
      const b = regions.bbox[id];
      const bw = b.x1 - b.x0 + 1, bh = b.y1 - b.y0 + 1;
      const fc = zoneFill(id, fill);
      const before = crop(canvas, b.x0, b.y0, bw, bh);
      stats.lastFillMs = performance.now() - t0;
      const step = { x: b.x0, y: b.y0, w: bw, h: bh, before, after: null };
      const commit = () => {
        ctx.drawImage(fc, b.x0, b.y0);
        step.after = crop(canvas, b.x0, b.y0, bw, bh);
        push(step);
        events.emit('change', { type: 'fill', id });
      };
      if (!animate) { commit(); return Promise.resolve(id); }
      const maxR = Math.max(
        Math.hypot(x - b.x0, y - b.y0), Math.hypot(x - b.x1, y - b.y0),
        Math.hypot(x - b.x0, y - b.y1), Math.hypot(x - b.x1, y - b.y1)) + 2;
      return new Promise((resolve) => {
        let raf = 0;
        const start = performance.now();
        const a = {
          finish() {
            if (anim !== a) return;
            anim = null;
            cancelAnimationFrame(raf);
            commit();
            resolve(id);
          },
        };
        anim = a;
        const frame = (now) => {
          if (anim !== a) return;
          const t = Math.min(1, (now - start) / duration);
          if (t >= 1) { a.finish(); return; }
          const e = 1 - Math.pow(1 - t, 3);
          ctx.save();
          ctx.beginPath();
          ctx.arc(x, y, Math.max(4, maxR * e), 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(fc, b.x0, b.y0);
          ctx.restore();
          raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
      });
    }

    /* ----- pincel y goma ----- */
    function ensureBackup() {
      if (!backup) backup = U.canvas(W, H);
      const bc = backup.getContext('2d');
      bc.clearRect(0, 0, W, H);
      bc.drawImage(canvas, 0, 0);
    }
    function ensureTmp(w, h) {
      if (!tmp) tmp = U.canvas(w, h);
      if (tmp.width < w || tmp.height < h) { tmp.width = Math.max(tmp.width, w); tmp.height = Math.max(tmp.height, h); }
      return tmp;
    }
    function pattern(fill, rect) {
      const key = [fill.kind, fill.color, fill.color2, rect.x0, rect.y0, rect.x1, rect.y1].join('|');
      if (patCache.key !== key) {
        patCache = { key, c: CL.fills.make(fill.kind, fill.color, rect.x1 - rect.x0 + 1, rect.y1 - rect.y0 + 1, { ox: rect.x0, oy: rect.y0, unit, color2: fill.color2 }) };
      }
      return patCache.c;
    }

    /** Borra toda la pintura (queda en el historial: se puede deshacer). */
    function clear() {
      finishAnim();
      if (busy) return false;
      // "Después" es un canvas vacío de 1×1: al restaurar se limpia todo el rectángulo y no se dibuja nada.
      push({ x: 0, y: 0, w: W, h: H, before: crop(canvas, 0, 0, W, H), after: U.canvas(1, 1) });
      ctx.clearRect(0, 0, W, H);
      events.emit('change', { type: 'clear' });
      return true;
    }

    /**
     * Empieza un trazo en (x, y). opts: { erase, fill: {kind, color, color2}, width (px de imagen), clip }
     * Devuelve { move(x, y, pressure), end(), cancel() }.
     */
    function beginStroke(x, y, { erase = false, fill = { kind: 'solid', color: '#000' }, width = 40, clip = true, pressure = 0.5 } = {}) {
      finishAnim();
      if (busy) return null;
      ensureBackup();
      let zone = -1;
      // La zona se toma del punto de inicio llevado adentro de la imagen: un trazo que arranca en el margen
      // (afuera del papel) queda recortado a la zona del borde, en vez de quedar libre.
      if (clip) zone = regions.nearest(U.clamp(x, 0, W - 1), U.clamp(y, 0, H - 1));
      if (clip && zone < 0) return null;   // sin zona donde recortar (casi imposible): no pinta
      const clipRect = zone >= 0 ? regions.bbox[zone] : null;
      const mask = zone >= 0 ? zoneMask(zone) : null;
      // Arcoíris con pincel (con o sin recorte): el color va cambiando a lo largo del trazo, como un
      // marcador arcoíris. (Con las bandas fijas de la zona, un trazo horizontal saldría de un solo color.)
      const rainbowStroke = !erase && fill.kind === 'rainbow';
      const special = !erase && fill.kind && fill.kind !== 'solid' && !rainbowStroke;
      let travel = 0;
      const RB = CL.fills.RAINBOW, RB_STEP = 140 * unit;
      const rainbowAt = (d) => {
        const f = (d / RB_STEP) % RB.length, i = Math.floor(f);
        return U.mix(RB[i], RB[(i + 1) % RB.length], f - i);
      };
      const pat = special ? pattern(fill, clipRect || { x0: 0, y0: 0, x1: W - 1, y1: H - 1 }) : null;
      const patRect = special ? (clipRect || { x0: 0, y0: 0 }) : null;
      const bb = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
      let lx = x, ly = y, lw = width * pw(pressure);
      let done = false;

      function pw(p) { return 0.45 + p * 1.1; }

      function seg(x0, y0, x1, y1, w0, w1) {
        const r = Math.max(w0, w1) / 2 + 2;
        let sx = Math.floor(Math.min(x0, x1) - r), sy = Math.floor(Math.min(y0, y1) - r);
        let ex = Math.ceil(Math.max(x0, x1) + r), ey = Math.ceil(Math.max(y0, y1) + r);
        if (clipRect) {
          sx = Math.max(sx, clipRect.x0); sy = Math.max(sy, clipRect.y0);
          ex = Math.min(ex, clipRect.x1 + 1); ey = Math.min(ey, clipRect.y1 + 1);
        }
        sx = Math.max(0, sx); sy = Math.max(0, sy); ex = Math.min(W, ex); ey = Math.min(H, ey);
        if (ex <= sx || ey <= sy) return;
        bb.x0 = Math.min(bb.x0, sx); bb.y0 = Math.min(bb.y0, sy);
        bb.x1 = Math.max(bb.x1, ex); bb.y1 = Math.max(bb.y1, ey);
        const lineW = (w0 + w1) / 2;
        // Color del segmento: en el arcoíris, un degradé entre el color del inicio y el del final del
        // segmento, así los tramos empalman sin "escamas" aunque el dedo vaya rápido.
        const paintStyle = (c, ox, oy) => {
          if (erase || special) return '#000';
          if (!rainbowStroke) return fill.color;
          const len = Math.hypot(x1 - x0, y1 - y0);
          if (len < 1) return rainbowAt(travel);
          const g = c.createLinearGradient(x0 - ox, y0 - oy, x1 - ox, y1 - oy);
          g.addColorStop(0, rainbowAt(travel));
          g.addColorStop(1, rainbowAt(travel + len));
          return g;
        };
        if (!mask && !special) {
          // Caso simple: sin recorte ni patrón, directo sobre la pintura.
          ctx.save();
          ctx.globalCompositeOperation = erase ? 'destination-out' : 'source-over';
          ctx.strokeStyle = paintStyle(ctx, 0, 0);
          ctx.lineWidth = lineW;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1 + (x0 === x1 && y0 === y1 ? 0.01 : 0), y1);
          ctx.stroke();
          ctx.restore();
          return;
        }
        // Con recorte o patrón: se arma el segmento en un canvas auxiliar y se compone.
        const sw = ex - sx, sh = ey - sy;
        const t = ensureTmp(sw, sh);
        const tc = t.getContext('2d');
        tc.save();
        tc.clearRect(0, 0, sw, sh);
        tc.beginPath();
        tc.rect(0, 0, sw, sh);
        tc.clip();
        tc.strokeStyle = paintStyle(tc, sx, sy);
        tc.lineWidth = lineW;
        tc.lineCap = 'round';
        tc.beginPath();
        tc.moveTo(x0 - sx, y0 - sy);
        tc.lineTo(x1 - sx + (x0 === x1 && y0 === y1 ? 0.01 : 0), y1 - sy);
        tc.stroke();
        if (special) {
          tc.globalCompositeOperation = 'source-in';
          tc.drawImage(pat, patRect.x0 - sx, patRect.y0 - sy);
        }
        if (mask) {
          tc.globalCompositeOperation = 'destination-in';
          tc.drawImage(mask, clipRect.x0 - sx, clipRect.y0 - sy);
        }
        tc.restore();
        ctx.save();
        ctx.globalCompositeOperation = erase ? 'destination-out' : 'source-over';
        ctx.drawImage(t, 0, 0, sw, sh, sx, sy, sw, sh);
        ctx.restore();
      }

      seg(x, y, x, y, lw, lw);

      return {
        zone,
        move(nx, ny, p = pressure) {
          if (done) return;
          const nw = width * pw(p);
          const len = Math.hypot(nx - lx, ny - ly);
          if (len < 0.5) return;
          // Arcoíris: tramos cortos. Cada tramo con tapa redonda pisa un poco al anterior; con tramos
          // cortos el salto de color en ese borde es imperceptible (si no, se ven "escamas").
          const n = rainbowStroke ? Math.max(1, Math.ceil(len / Math.max(3, Math.min(lw / 4, 12 * unit)))) : 1;
          let px = lx, py = ly, pw0 = lw;
          for (let i = 1; i <= n; i++) {
            const f = i / n;
            const qx = lx + (nx - lx) * f, qy = ly + (ny - ly) * f, qw = lw + (nw - lw) * f;
            seg(px, py, qx, qy, pw0, qw);
            travel += Math.hypot(qx - px, qy - py);
            px = qx; py = qy; pw0 = qw;
          }
          lx = nx; ly = ny; lw = nw;
        },
        end() {
          if (done) return;
          done = true;
          if (bb.x1 <= bb.x0) return;
          const bw = bb.x1 - bb.x0, bh = bb.y1 - bb.y0;
          push({ x: bb.x0, y: bb.y0, w: bw, h: bh, before: crop(backup, bb.x0, bb.y0, bw, bh), after: crop(canvas, bb.x0, bb.y0, bw, bh) });
          events.emit('change', { type: erase ? 'erase' : 'stroke' });
        },
        cancel() {
          if (done) return;
          done = true;
          if (bb.x1 <= bb.x0) return;
          const bw = bb.x1 - bb.x0, bh = bb.y1 - bb.y0;
          ctx.clearRect(bb.x0, bb.y0, bw, bh);
          ctx.drawImage(backup, bb.x0, bb.y0, bw, bh, bb.x0, bb.y0, bw, bh);
        },
      };
    }

    /* ----- carga / guardado ----- */
    async function loadPaint(blob) {
      const img = await U.blobToImage(blob);
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(img, 0, 0, W, H);
    }

    function thumb(maxSide = 480) {
      const s = Math.min(1, maxSide / Math.max(W, H));
      const tw = Math.max(1, Math.round(W * s)), th = Math.max(1, Math.round(H * s));
      if (!thumbLines || thumbLines.width !== tw) {
        thumbLines = U.canvas(tw, th);
        const tc = thumbLines.getContext('2d');
        tc.imageSmoothingQuality = 'high';
        tc.drawImage(lines, 0, 0, tw, th);
      }
      return composite(canvas, thumbLines, tw, th);
    }

    function destroy() {
      destroyed = true;
      if (warmHandle) { cancelIdle(warmHandle); warmHandle = 0; }
      finishAnim();
      for (const s of steps) free(s);
      steps.length = 0;
      for (const c of [canvas, backup, tmp, patCache.c, ...maskCache.map((m) => m.c)]) if (c) { c.width = c.height = 0; }
      maskCache = [];
      backup = tmp = null;
    }

    return {
      canvas, ctx, w: W, h: H, regions, unit, events,
      fillAt, beginStroke, finishAnim, undo, redo, warm, clear,
      get canUndo() { return idx > 0; },
      get canRedo() { return idx < steps.length; },
      get busy() { return busy || !!anim; },
      get historyLength() { return steps.length; },
      loadPaint,
      toBlob: () => U.canvasToBlob(canvas, 'image/png'),
      /** PNG de la pintura como dataURL, SÍNCRONO (guardado de emergencia al cerrar la página). */
      toDataURL(maxSide = 0) {
        if (!maxSide || maxSide >= Math.max(W, H)) return canvas.toDataURL('image/png');
        const s = maxSide / Math.max(W, H);
        const c = U.canvas(W * s, H * s);
        const cx = c.getContext('2d');
        cx.imageSmoothingQuality = 'high';
        cx.drawImage(canvas, 0, 0, c.width, c.height);
        const url = c.toDataURL('image/png');
        c.width = c.height = 0;
        return url;
      },
      thumb,
      thumbBlob: (m = 480) => U.canvasToBlob(thumb(m), 'image/png'),
      exportCanvas: () => composite(canvas, lines, W, H),
      destroy,
    };
  }

  /* =====================================================================
     Coloreado al azar (hoja de control y portadas del catálogo)
     ===================================================================== */
  function randomColor(rnd) {
    const h = Math.floor(rnd() * 360);
    return hslToRgb(h, 62 + rnd() * 30, 52 + rnd() * 18);
  }
  function hslToRgb(h, s, l) {
    s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))];
  }
  function seeded(seed) {
    let s = (seed >>> 0) || 1;
    return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  }

  /**
   * Pinta cada zona de un color al azar (motor real: CL.regions) y pone las líneas encima.
   * opts: { res: resolución de cálculo (def. RES()), bg: color de la zona de fondo ('#rrggbb', null = blanco,
   *         'random'), seed, withStats } -> canvas de `size` de lado mayor (o { canvas, stats } si withStats).
   */
  async function renderRandom(source, size = 512, opts = {}) {
    const res = opts.res || RES();
    const src = await loadSource(source, res);
    try {
      const lines = rasterLines(src.image, src.w, src.h);
      const t0 = performance.now();
      const map = await CL.regions.computeAsync(lines);
      const ms = performance.now() - t0;
      const rnd = seeded(opts.seed != null ? opts.seed : Math.floor(Math.random() * 1e9));
      const colors = new Uint32Array(map.count);
      const pack = ([r, g, b]) => ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
      const WHITE = pack([255, 255, 255]);
      const bgColor = opts.bg === 'random' ? null : opts.bg ? pack(U.hexToRgb(opts.bg)) : WHITE;
      let fillable = 0, tiny = 0;
      for (let i = 0; i < map.count; i++) {
        if (map.locked[i]) { colors[i] = WHITE; if (i !== map.bg) tiny++; continue; }
        if (i === map.bg && bgColor != null) { colors[i] = bgColor; continue; }
        colors[i] = pack(randomColor(rnd));
        if (i !== map.bg) fillable++;
      }
      const full = U.canvas(src.w, src.h);
      const fctx = full.getContext('2d');
      const im = fctx.createImageData(src.w, src.h);
      const u32 = new Uint32Array(im.data.buffer);
      const lab = map.label;
      for (let p = 0; p < u32.length; p++) { const l = lab[p]; u32[p] = l >= 0 ? colors[l] : WHITE; }
      fctx.putImageData(im, 0, 0);
      fctx.globalCompositeOperation = 'multiply';
      fctx.drawImage(lines, 0, 0);
      const s = Math.min(1, size / Math.max(src.w, src.h));
      const out = U.canvas(src.w * s, src.h * s);
      const octx = out.getContext('2d');
      octx.imageSmoothingQuality = 'high';
      octx.drawImage(full, 0, 0, out.width, out.height);
      full.width = full.height = 0;
      if (!opts.withStats) return out;
      const bgFrac = map.bg >= 0 ? map.area[map.bg] / (map.w * map.h) : 0;
      return { canvas: out, stats: { id: source, zones: map.count, fillable, tiny, bgFrac, ms: Math.round(ms) } };
    } finally {
      src.revoke();
    }
  }

  /** PNG final de una obra de colorear a resolución completa (papel + pintura + líneas). */
  async function exportPNG(work) {
    const res = Math.max(work.w || 0, work.h || 0) || RES();
    const src = await loadSource(work.source, res);
    try {
      const W = work.w || src.w, H = work.h || src.h;
      const paint = work.paint ? await U.blobToImage(work.paint) : null;
      const c = composite(paint, src.image, W, H);
      const blob = await U.canvasToBlob(c, 'image/png');
      c.width = c.height = 0;
      return blob;
    } finally {
      src.revoke();
    }
  }

  /* =====================================================================
     Guardado de emergencia.
     El autoguardado es asíncrono (toBlob + IndexedDB) y no llega a terminar si la página se recarga o se
     cierra enseguida. Por eso al descargarse la página se anota la pintura en localStorage (toDataURL es
     síncrono) y la próxima vez se pasa a IndexedDB. Una entrada por dibujo:
       colorines.colorear.pendiente.<source> = { source, workId, status, name, w, h, mountTs, ts, png }
     `ts` es el momento de la foto; las obras guardan en meta.snap el momento de la foto que guardaron:
     gana la más nueva.
     ===================================================================== */
  const PENDING = 'colorines.colorear.pendiente.';
  const PENDING_MAX_CHARS = 1600000;   // ~3 MB en UTF-16: deja lugar a otras preferencias y a otro dibujo

  /** Anota la pintura del pintor (SÍNCRONO). Si no entra, prueba con versiones más chicas. */
  function pendingWrite(info, painter) {
    for (const side of [0, 1024, 640]) {
      let png;
      try { png = painter.toDataURL(side); } catch (e) { return false; }
      if (png.length > PENDING_MAX_CHARS && side !== 640) continue;
      try {
        localStorage.setItem(PENDING + info.source, JSON.stringify(Object.assign({}, info, { ts: Date.now(), png })));
        return true;
      } catch (e) { /* no entra en el cupo: probar más chico */ }
    }
    return false;
  }
  function pendingClear(source) {
    try { localStorage.removeItem(PENDING + source); } catch (e) { /* sin almacenamiento */ }
  }
  function dataUrlToBlob(url) {
    const [head, b64] = url.split(',');
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: (head.match(/data:([^;]+)/) || [])[1] || 'image/png' });
  }

  async function recoverOne(key) {
    let p = null;
    try { p = JSON.parse(localStorage.getItem(key)); } catch (e) { p = null; }
    const drop = () => { try { localStorage.removeItem(key); } catch (e) { /* nada */ } };
    if (!p || !p.source || !p.png) { drop(); return false; }
    let work = null;
    if (p.workId) {
      work = await CL.db.works.get(p.workId);
      if (!work) { drop(); return false; }      // la obra se borró mientras tanto
    } else {
      // La obra pudo crearse después de anotar esto (un guardado que terminó a último momento).
      const list = await CL.db.works.list({ kind: 'colorear', source: p.source });
      work = list.find((w) => (w.createdAt || 0) >= (p.mountTs || 0)) || null;
    }
    const snap = work ? (work.meta && work.meta.snap) || work.updatedAt || 0 : 0;
    // Lo guardado es más nuevo. (A igual milisegundo gana lo anotado: se escribe siempre al final.)
    if (work && snap > p.ts) { drop(); return false; }
    const paint = dataUrlToBlob(p.png);
    let src;
    try { src = await loadSource(p.source, 480); } catch (e) { drop(); return false; }  // ya no existe el dibujo
    let thumb;
    try {
      const img = await U.blobToImage(paint);
      thumb = await U.canvasToBlob(composite(img, src.image, src.w, src.h), 'image/png');
    } finally { src.revoke(); }
    const rec = {
      kind: 'colorear', source: p.source, w: p.w, h: p.h, paint, thumb,
      status: p.status || (work && work.status) || 'progress',
      meta: Object.assign({}, work && work.meta, { name: p.name, snap: p.ts }),
    };
    if (work) { rec.id = work.id; rec.createdAt = work.createdAt; }
    await CL.db.works.save(rec);
    drop();
    return true;
  }

  let recovering = Promise.resolve();
  /** Pasa a IndexedDB lo anotado de emergencia (de un dibujo o de todos). Resuelve al terminar. */
  function recoverPending(source) {
    const run = async () => {
      if (!CL.db) return;
      let keys = [];
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(PENDING)) keys.push(k);
        }
      } catch (e) { return; }
      if (source) keys = keys.filter((k) => k === PENDING + source);
      for (const k of keys) {
        try { await recoverOne(k); } catch (e) { console.warn('No se pudo recuperar el dibujo pendiente', k, e); }
      }
    };
    recovering = recovering.then(run, run);
    return recovering;
  }

  CL.coloring = Object.assign(CL.coloring || {}, {
    RES, stats, loadSource, rasterLines, composite, createPainter, renderRandom, exportPNG,
    pending: { write: pendingWrite, clear: pendingClear, recover: recoverPending },
  });

  // Al arrancar la app, lo que haya quedado pendiente de la vez anterior pasa a la base
  // (así la galería y el catálogo ya muestran la última versión).
  setTimeout(() => { recoverPending(); }, 0);
})(window.CL);
