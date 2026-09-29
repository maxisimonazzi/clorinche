/* Colorines — pinceles de la pizarra mágica (CL.brushes).

   Cada pincel dibuja en unidades de "documento" (px CSS del lienzo). Los contextos que recibe ya tienen
   la transformación a píxeles reales: ctx.setTransform(res, 0, 0, res, 0, 0).

   Uso:
     const st = CL.brushes.begin('fibra', env, { x, y, p, t });
     st.add(x, y, p, t);   // cada punto de entrada (con getCoalescedEvents)
     st.frame(now);        // una vez por cuadro (rAF): dibuja lo pendiente
     st.end();             // al levantar el dedo: dibuja el final del trazo
     st.bbox               // rectángulo tocado en unidades {x0, y0, x1, y1} (o null)

   env = {
     layer,  // ctx de la capa de trazos (dibujo directo: aerosol, brillitos, goma y sellos)
     live,   // ctx de un lienzo "en vivo", transparente y del mismo tamaño, para los pinceles con buffer
             //   (brush.buffered): el trazo se arma ahí sin "cuentas" en las uniones y al terminar se vuelca
             //   a la capa con globalAlpha = brush.alpha (mostrá el lienzo en vivo con esa opacidad).
     shape,  // (sólo pinceles con brush.texture) ctx oculto del mismo tamaño donde se arma la forma opaca
     res,    // píxeles reales por unidad
     color,  // '#rrggbb' o 'multi' (colores sorpresa)
     size,   // índice de grosor 0..3
     unit,   // multiplicador: px CSS de pantalla -> unidades de documento
     pen,    // true con lápiz óptico (usa la presión)
     dark,   // el fondo es oscuro (pizarrón)
     stamp,  // id del sello (CL.stamps)
     fx,     // { add({ dur, draw(ctx, k), done() }) } animaciones cortas sobre el lienzo
     sound,  // (nombre, opts) => void   (opcional)
   }

   Pinceles con buffer: la forma del trazo se dibuja OPACA (la unión de formas opacas con source-over es
   exacta: no quedan "cuentas" en las uniones) y la transparencia se aplica una sola vez, al mostrar y al
   volcar. Los que tienen textura (lápiz, crayón) arman la forma en `shape` y en cada cuadro recomponen
   sólo el rectángulo tocado del lienzo en vivo: forma ∩ textura del papel (source-in). Así el grano no se
   acumula dentro del mismo trazo, pero al repasar con otro trazo sí se acumula, como en papel. */
'use strict';
(function (CL) {
  const U = CL.util;
  const TAU = Math.PI * 2;
  const clamp = U.clamp;

  /* ---------- Colores ---------- */
  const VIVID = ['#ff3b30', '#ff8a1f', '#ffd60a', '#9be23c', '#1fb35a', '#19c8b9', '#3cc3ff', '#2f5bea', '#8b4dff', '#ff78c4'];
  const SPARKLE = ['#ff4fa3', '#ffd21f', '#3cc3ff', '#8b4dff', '#2bd98a', '#ff8a1f', '#ff5a5f'];

  /* ---------- Texturas de papel (fijas al papel: el grano no se mueve con el trazo) ---------- */
  const texCache = new Map();

  /** Ruido de valores en una grilla n×n que se repite sin costuras, ampliado a `size` px. */
  function noiseLayer(n, size, sharp) {
    const small = U.canvas(n + 2, n + 2);
    const sc = small.getContext('2d');
    const img = sc.createImageData(n + 2, n + 2);
    const vals = new Float32Array(n * n);
    for (let i = 0; i < vals.length; i++) vals[i] = Math.random();
    for (let y = 0; y < n + 2; y++) {
      for (let x = 0; x < n + 2; x++) {
        const v = vals[((y + n - 1) % n) * n + ((x + n - 1) % n)];
        const o = (y * (n + 2) + x) * 4;
        img.data[o] = img.data[o + 1] = img.data[o + 2] = 255;
        img.data[o + 3] = Math.round(v * 255);
      }
    }
    sc.putImageData(img, 0, 0);
    const big = U.canvas(size, size);
    const bc = big.getContext('2d');
    bc.imageSmoothingEnabled = !sharp;
    const cell = size / n;
    bc.drawImage(small, -cell, -cell, size + 2 * cell, size + 2 * cell);
    return big;
  }

  /** Máscara de textura (alfa) para un tipo: 'grano' (lápiz) o 'cera' (crayón). */
  function textureMask(kind, res) {
    const key = kind + '@' + res.toFixed(3);
    if (texCache.has(key)) return texCache.get(key);
    const T = kind === 'grano' ? 128 : 192; // tamaño del mosaico en unidades
    const size = Math.max(16, Math.round(T * res));
    const out = U.canvas(size, size);
    const oc = out.getContext('2d');
    if (kind === 'grano') {
      // Grafito: granitos de ~1 unidad y alguno más grande; pocos huecos.
      const a = noiseLayer(T, size, res < 1.5).getContext('2d').getImageData(0, 0, size, size).data;
      const b = noiseLayer(T / 4, size, false).getContext('2d').getImageData(0, 0, size, size).data;
      const img = oc.createImageData(size, size);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = (a[i + 3] / 255) * 0.72 + (b[i + 3] / 255) * 0.28;
        const al = clamp((v - 0.2) / 0.55, 0, 1);
        d[i] = d[i + 1] = d[i + 2] = 255;
        d[i + 3] = Math.round(Math.pow(al, 0.85) * 255);
      }
      oc.putImageData(img, 0, 0);
    } else {
      // Cera: el papel tiene "dientes": muchos huequitos chicos y alguna zona un poco más gastada.
      const a = noiseLayer(24, size, false).getContext('2d').getImageData(0, 0, size, size).data;
      const b = noiseLayer(72, size, false).getContext('2d').getImageData(0, 0, size, size).data;
      const c = noiseLayer(Math.round(T / 1.1), size, res < 1.5).getContext('2d').getImageData(0, 0, size, size).data;
      const img = oc.createImageData(size, size);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = (a[i + 3] / 255) * 0.22 + (b[i + 3] / 255) * 0.43 + (c[i + 3] / 255) * 0.35;
        const t = clamp((v - 0.31) / 0.1, 0, 1);
        const al = t * t * (3 - 2 * t) * (0.8 + 0.2 * (b[i + 3] / 255));
        d[i] = d[i + 1] = d[i + 2] = 255;
        d[i + 3] = Math.round(al * 255);
      }
      oc.putImageData(img, 0, 0);
    }
    texCache.set(key, out);
    return out;
  }

  /** Mosaico de textura teñido de un color (cacheado). */
  function tintedTile(kind, color, res) {
    const key = kind + '|' + color + '|' + res.toFixed(3);
    if (texCache.has(key)) return texCache.get(key);
    const mask = textureMask(kind, res);
    const c = U.canvas(mask.width, mask.height);
    const x = c.getContext('2d');
    x.drawImage(mask, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = color;
    x.fillRect(0, 0, c.width, c.height);
    if (texCache.size > 80) texCache.clear();
    texCache.set(key, c);
    return c;
  }

  /** Patrón de textura anclado al papel, con un píxel del mosaico = un píxel real. */
  function texturePattern(ctx, kind, color, res) {
    const p = ctx.createPattern(tintedTile(kind, color, res), 'repeat');
    if (p && p.setTransform && typeof DOMMatrix !== 'undefined') p.setTransform(new DOMMatrix([1 / res, 0, 0, 1 / res, 0, 0]));
    return p || color;
  }

  /* ---------- Muestreo suave del recorrido ---------- */
  /* Suaviza con curvas cuadráticas por puntos medios y emite muestras cada `step` unidades.
     Cada muestra: { x, y, p (presión), t (ms), v (velocidad unidades/ms), d (distancia acumulada) }. */
  function Sampler(step, emit) {
    this.step = Math.max(0.25, step);
    this.emit = emit;
    this.prev = null;
    this.m = null;
    this.tail = null;
    this.carry = 0;
    this.d = 0;
    this.v = 0;
    this.moved = false;
  }
  const midPt = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, p: (a.p + b.p) / 2, t: (a.t + b.t) / 2, v: (a.v + b.v) / 2 });
  Sampler.prototype.start = function (pt) {
    pt.v = 0;
    this.prev = pt;
    this.m = pt;
    this.emit({ x: pt.x, y: pt.y, p: pt.p, t: pt.t, v: 0, d: 0 });
  };
  Sampler.prototype.push = function (pt) {
    const pr = this.prev;
    const dd = Math.hypot(pt.x - pr.x, pt.y - pr.y);
    if (dd < Math.min(1, this.step * 0.8)) { this.tail = pt; return; }
    this.tail = null;
    const dt = Math.max(1, pt.t - pr.t);
    const vr = Math.min(8, dd / dt);
    this.v = this.moved ? this.v * 0.65 + vr * 0.35 : vr;
    this.moved = true;
    pt.v = this.v;
    const nm = midPt(pr, pt);
    this.curve(this.m, pr, nm);
    this.m = nm;
    this.prev = pt;
  };
  Sampler.prototype.finish = function () {
    const end = this.tail || this.prev;
    if (end.v == null) end.v = this.v;
    this.curve(this.m, midPt(this.m, end), end);
    if (this.carry > this.step * 0.3) {
      this.emit({ x: end.x, y: end.y, p: end.p, t: end.t, v: end.v, d: this.d });
      this.carry = 0;
    }
  };
  Sampler.prototype.curve = function (a, c, b) {
    const len = Math.hypot(c.x - a.x, c.y - a.y) + Math.hypot(b.x - c.x, b.y - c.y);
    if (len < 1e-6) return;
    const n = Math.max(1, Math.ceil(len / (this.step * 0.5)));
    let px = a.x, py = a.y;
    const step = this.step;
    for (let i = 1; i <= n; i++) {
      const u = i / n, iu = 1 - u;
      const x = iu * iu * a.x + 2 * u * iu * c.x + u * u * b.x;
      const y = iu * iu * a.y + 2 * u * iu * c.y + u * u * b.y;
      let seg = Math.hypot(x - px, y - py);
      let sx = px, sy = py, u0 = (i - 1) / n;
      while (this.carry + seg >= step && seg > 1e-9) {
        const need = step - this.carry;
        const f = need / seg;
        sx += (x - sx) * f;
        sy += (y - sy) * f;
        u0 += (u - u0) * f;
        seg -= need;
        this.carry = 0;
        this.d += need;
        this.emit({ x: sx, y: sy, p: U.lerp(a.p, b.p, u0), t: U.lerp(a.t, b.t, u0), v: U.lerp(a.v || 0, b.v || 0, u0), d: this.d });
      }
      this.carry += seg;
      this.d += seg;
      px = x; py = y;
    }
  };

  /* ---------- Ayudas de dibujo ---------- */
  /** Agrega una forma opaca al lienzo en vivo. */
  function solidFill(ctx, path, style) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = style;
    ctx.fill(path);
  }

  /** Pinceles con textura: suma la forma en `shape` y recompone el lienzo en vivo en ese rectángulo. */
  function texturedFill(st, path, bb) {
    const sh = st.env.shape, live = st.live;
    if (!sh || !bb) { solidFill(live, path, st.style); return; }
    solidFill(sh, path, '#000');
    recompose(st, bb);
  }

  /** Recompone el lienzo en vivo en un rectángulo: forma (lienzo oculto) ∩ textura. */
  function recompose(st, bb) {
    const sh = st.env.shape, live = st.live;
    const r = st.res;
    const W = live.canvas.width, H = live.canvas.height;
    const x0 = clamp(Math.floor(bb.x0 * r) - 2, 0, W), y0 = clamp(Math.floor(bb.y0 * r) - 2, 0, H);
    const x1 = clamp(Math.ceil(bb.x1 * r) + 2, 0, W), y1 = clamp(Math.ceil(bb.y1 * r) + 2, 0, H);
    if (x1 <= x0 || y1 <= y0) return;
    live.save();
    live.setTransform(1, 0, 0, 1, 0, 0);
    // source-in afecta a todo el lienzo: se recorta al rectángulo para no borrar el resto.
    live.beginPath();
    live.rect(x0, y0, x1 - x0, y1 - y0);
    live.clip();
    live.globalCompositeOperation = 'source-over';
    live.clearRect(x0, y0, x1 - x0, y1 - y0);
    live.drawImage(sh.canvas, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
    live.globalCompositeOperation = 'source-in';
    live.setTransform(r, 0, 0, r, 0, 0);
    live.fillStyle = st.style;
    live.fillRect(x0 / r, y0 / r, (x1 - x0) / r, (y1 - y0) / r);
    live.restore();
  }

  /** Path2D con un círculo por muestra (la unión da un trazo de bordes limpios y grosor variable). */
  function circles(st, list, rFn) {
    const path = new Path2D();
    let any = false;
    const fb = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    st.fb = fb;
    for (const s of list) {
      const r = rFn(s);
      if (!(r > 0.05)) continue;
      const x = s.ox != null ? s.ox : s.x, y = s.oy != null ? s.oy : s.y;
      path.moveTo(x + r, y);
      path.arc(x, y, r, 0, TAU);
      st.mark(x, y, r);
      if (x - r < fb.x0) fb.x0 = x - r;
      if (y - r < fb.y0) fb.y0 = y - r;
      if (x + r > fb.x1) fb.x1 = x + r;
      if (y + r > fb.y1) fb.y1 = y + r;
      any = true;
    }
    return any ? path : null;
  }

  /** Ruido 1D suave (para bordes irregulares del crayón). */
  function noise1D(period) {
    const vals = [];
    for (let i = 0; i < 64; i++) vals.push(Math.random() * 2 - 1);
    return (x) => {
      const f = x / period;
      const i = Math.floor(f);
      const t = f - i;
      const a = vals[((i % 64) + 64) % 64], b = vals[(((i + 1) % 64) + 64) % 64];
      return a + (b - a) * t * t * (3 - 2 * t);
    };
  }

  function starPath(ctx, x, y, R, rot, points = 5, inner = 0.48) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const rr = i % 2 ? R * inner : R;
      const a = rot + (i * Math.PI) / points - Math.PI / 2;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
  }

  /** Destello de 4 puntas con bordes curvos. */
  function sparklePath(ctx, x, y, R, rot) {
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = rot + (i * Math.PI) / 2;
      const a2 = a + Math.PI / 2;
      const px = x + Math.cos(a) * R, py = y + Math.sin(a) * R;
      const qx = x + Math.cos(a2) * R, qy = y + Math.sin(a2) * R;
      if (i === 0) ctx.moveTo(px, py);
      const cx = x + Math.cos(a + Math.PI / 4) * R * 0.16, cy = y + Math.sin(a + Math.PI / 4) * R * 0.16;
      ctx.quadraticCurveTo(cx, cy, qx, qy);
    }
    ctx.closePath();
  }

  /* ---------- Definición de pinceles ---------- */
  const defs = Object.create(null);
  const order = [];
  function def(b) { defs[b.id] = b; order.push(b.id); }

  // Lápiz: grafito de color granulado, levemente transparente.
  def({
    id: 'lapiz', name: 'Lápiz', icon: 'pzLapiz', buffered: true, texture: 'grano', alpha: 0.9, usesColor: true,
    sizes: [2.5, 4.5, 8, 13], loop: { freq: 3200, q: 0.7, vol: 0.05 },
    setup(st) {
      st.r = st.w / 2;
      st.step = clamp(st.r * 0.3, 0.3, 1.6);
      st.style = texturePattern(st.live, 'grano', st.color, st.res);
    },
    draw(st, list) {
      const path = circles(st, list, (s) => st.r * st.pf(s.p));
      if (path) texturedFill(st, path, st.fb);
    },
  });

  // Fibra: pareja, saturada y opaca.
  def({
    id: 'fibra', name: 'Fibra', icon: 'pzFibra', buffered: true, alpha: 1, usesColor: true,
    sizes: [4, 8, 15, 26], loop: { freq: 1500, q: 0.8, vol: 0.05 },
    setup(st) {
      st.r = st.w / 2;
      st.step = clamp(st.r * 0.3, 0.3, 2.4);
    },
    draw(st, list) {
      const path = circles(st, list, (s) => st.r * st.pf(s.p));
      if (path) solidFill(st.live, path, st.color);
    },
  });

  // Pincel: grosor según la velocidad (lento = grueso, rápido = fino) y puntas afinadas.
  def({
    id: 'pincel', name: 'Pincel', icon: 'pzPincel', buffered: true, alpha: 0.94, usesColor: true,
    sizes: [7, 12, 20, 30], loop: { freq: 900, q: 0.6, vol: 0.045 },
    setup(st) {
      st.base = st.w;
      st.cur = st.w * 0.55;
      st.step = clamp(st.w * 0.06, 0.3, 2);
      st.hist = [];
      st.lastR = 0;
    },
    radius(st, s) {
      const f = clamp(1.08 - 0.5 * (s.v || 0), 0.26, 1.08);
      const target = st.base * f * st.pf(s.p);
      const k = 1 - Math.exp(-st.step / (st.base * 0.9));
      st.cur += (target - st.cur) * k;
      const taper = Math.min(1, 0.22 + 0.78 * Math.sqrt(s.d / (st.base * 1.6)));
      return (st.cur / 2) * taper;
    },
    draw(st, list) {
      const b = this;
      const path = circles(st, list, (s) => {
        const r = b.radius(st, s);
        s.r = r;
        st.lastR = r;
        st.hist.push(s);
        if (st.hist.length > 12) st.hist.shift();
        return r;
      });
      if (!path) return;
      solidFill(st.live, path, st.color);
      b.bristles(st, path, list);
    },
    /** Pelitos del pincel: rayitas finas un poco más claras y más oscuras que siguen el trazo
        (recortadas a la forma recién pintada, así nunca se salen del borde). */
    bristles(st, path, list) {
      const ctx = st.live;
      // Se repasan también los últimos tramos: los círculos nuevos tapan las rayitas de atrás.
      const pts = (st.tailS || []).concat(list);
      const lastD = list[list.length - 1].d || 0;
      st.tailS = pts.filter((s) => lastD - (s.d || 0) <= st.base * 1.9);
      if (pts.length < 2) return;
      if (!st.hairs) {
        // Pelitos repartidos al azar (no parejos, para que no parezca un caño con rayas).
        const dark = U.mix(st.color, '#2b2240', 0.4), light = U.mix(st.color, '#ffffff', 0.5);
        st.hairs = [];
        for (let i = 0; i < 9; i++) {
          const isLight = Math.random() < 0.45;
          st.hairs.push({
            o: U.rand(-0.82, 0.82),
            c: hexA(isLight ? light : dark, U.rand(0.08, 0.18)),
            w: Math.max(0.4, st.base * U.rand(0.02, 0.05)),
          });
        }
      }
      ctx.save();
      ctx.clip(path);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const h of st.hairs) {
        ctx.lineWidth = h.w;
        ctx.beginPath();
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1], c = pts[i];
          let nx = -(c.y - a.y), ny = c.x - a.x;
          const L = Math.hypot(nx, ny);
          if (L < 1e-6) continue;
          nx /= L; ny /= L;
          const ra = a.r || c.r || 0, rc = c.r || ra;
          ctx.moveTo(a.x + nx * h.o * ra, a.y + ny * h.o * ra);
          ctx.lineTo(c.x + nx * h.o * rc, c.y + ny * h.o * rc);
        }
        ctx.strokeStyle = h.c;
        ctx.stroke();
      }
      ctx.restore();
    },
    finish(st) {
      const h = st.hist;
      const last = h[h.length - 1];
      if (!last) return;
      if (last.d < 1.5) {
        // Toque: una gota redonda.
        const p = new Path2D();
        const r = st.base * 0.42;
        p.arc(last.x, last.y, r, 0, TAU);
        st.mark(last.x, last.y, r);
        solidFill(st.live, p, st.color);
        return;
      }
      // Cola afinada que sigue la dirección del movimiento (como levantar el pincel).
      const first = h[0];
      let dx = last.x - first.x, dy = last.y - first.y;
      const L0 = Math.hypot(dx, dy) || 1;
      dx /= L0; dy /= L0;
      const len = clamp((last.v || 0) * st.base * 0.8 + st.base * 0.3, st.lastR * 1.2, st.base * 1.8);
      const n = Math.max(2, Math.ceil(len / st.step));
      const tail = [];
      for (let i = 1; i <= n; i++) {
        const u = i / n;
        tail.push({ x: last.x + dx * len * u, y: last.y + dy * len * u, d: last.d + len * u, r: st.lastR * Math.sqrt(1 - u * u) * (1 - 0.35 * u) });
      }
      const path = circles(st, tail, (s) => s.r);
      if (!path) return;
      solidFill(st.live, path, st.color);
      this.bristles(st, path, tail);
    },
  });

  // Crayón: ceroso, bordes irregulares y huecos del papel.
  def({
    id: 'crayon', name: 'Crayón', icon: 'pzCrayon', buffered: true, texture: 'cera', alpha: 0.95, usesColor: true,
    sizes: [7, 12, 19, 30], loop: { freq: 700, q: 0.5, vol: 0.06 },
    setup(st) {
      st.r = st.w / 2;
      st.step = clamp(st.r * 0.22, 0.3, 1.8);
      st.nr = noise1D(Math.max(4, st.r * 2.5));
      st.nx = noise1D(Math.max(4, st.r * 3));
      st.ny = noise1D(Math.max(4, st.r * 3));
      st.biteD = 0;
      st.queue = [];
      st.style = texturePattern(st.live, 'cera', st.color, st.res);
    },
    draw(st, list) {
      const path = circles(st, list, (s) => {
        s.ox = s.x + st.nx(s.d) * st.r * 0.06;
        s.oy = s.y + st.ny(s.d) * st.r * 0.06;
        return st.r * st.pf(s.p) * (0.9 + 0.05 * st.nr(s.d));
      });
      if (!path) return;
      if (!st.env.shape) { solidFill(st.live, path, st.style); return; }
      solidFill(st.env.shape, path, '#000');
      const fb = st.fb;
      st.queue.push(...list);
      this.bite(st, list[list.length - 1].d - st.r * 0.7, fb);
      recompose(st, fb);
    },
    /** Borde áspero: mordiditas en el contorno (un poco detrás de la punta, para que no las tape el trazo). */
    bite(st, upTo, fb) {
      const q = st.queue;
      const path = new Path2D();
      let any = false;
      const cap = (s, dir, from, to) => {
        // Mordiditas en la punta redonda (hacia afuera del trazo).
        const R = st.r * st.pf(s.p);
        for (let k = 0; k < 7; k++) addBite(s, R, dir + U.rand(from, to));
      };
      const addBite = (s, R, a) => {
        const rr = R * U.rand(0.9, 1.06);
        const cr = R * U.rand(0.05, 0.15);
        const x = s.ox + Math.cos(a) * rr, y = s.oy + Math.sin(a) * rr;
        path.moveTo(x + cr, y);
        path.arc(x, y, cr, 0, TAU);
        if (x - cr < fb.x0) fb.x0 = x - cr;
        if (y - cr < fb.y0) fb.y0 = y - cr;
        if (x + cr > fb.x1) fb.x1 = x + cr;
        if (y + cr > fb.y1) fb.y1 = y + cr;
        any = true;
      };
      while (q.length && q[0].d <= upTo) {
        const s = q.shift();
        const prev = st.lastQ;
        st.lastQ = s;
        if (!prev) { st.firstQ = s; continue; }
        const dir = Math.atan2(s.oy - prev.oy, s.ox - prev.ox);
        if (!st.capped) { st.capped = true; cap(st.firstQ, dir + Math.PI, -1.2, 1.2); }
        st.lastDir = dir;
        if (s.d < st.biteD) continue;
        st.biteD = s.d + Math.max(0.5, st.r * 0.09);
        const R = st.r * st.pf(s.p);
        for (let k = 0; k < 2; k++) {
          const a = dir + (k ? 1 : -1) * Math.PI / 2 + U.rand(-0.3, 0.3);
          addBite(s, R, a);
        }
      }
      if (upTo === Infinity && st.lastQ && st.lastDir != null) cap(st.lastQ, st.lastDir, -1.2, 1.2);
      if (!any) return;
      const sh = st.env.shape;
      sh.globalCompositeOperation = 'destination-out';
      sh.fillStyle = '#000';
      sh.fill(path);
      sh.globalCompositeOperation = 'source-over';
    },
    finish(st) {
      if (!st.queue.length || !st.env.shape) return;
      const fb = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
      this.bite(st, Infinity, fb);
      if (fb.x1 > fb.x0) recompose(st, fb);
    },
  });

  // Aerosol: nube de gotitas que se sigue acumulando con el dedo quieto.
  def({
    id: 'aerosol', name: 'Aerosol', icon: 'pzAerosol', buffered: false, alpha: 1, usesColor: true,
    sizes: [26, 42, 64, 96], loop: { freq: 5200, q: 0.4, vol: 0.06, steady: 1.6 },
    setup(st) {
      st.R = st.w / 2;
      st.rate = 0.9 * Math.pow(st.R / 20, 2); // gotitas por ms
      st.dotR = Math.max(0.45, Math.pow(st.R / 20, 0.4) * 0.62);
      st.step = clamp(st.R * 0.15, 1, 6);
      st.pts = [];
      st.pos = null;
      st.acc = 0;
      st.lastNow = 0;
    },
    draw(st, list) {
      for (const s of list) st.pts.push(s);
      if (!st.pos) { st.pos = list[0]; st.acc += 6; } // primer toque: una nubecita al instante
    },
    tick(st, now) {
      const dt = st.lastNow ? clamp(now - st.lastNow, 0, 50) : 16;
      st.lastNow = now;
      const src = st.pts.length ? st.pts : [st.pos];
      if (!src[0]) return;
      st.acc += st.rate * dt;
      const n = Math.floor(st.acc);
      st.acc -= n;
      if (n <= 0) { if (st.pts.length) { st.pos = st.pts[st.pts.length - 1]; st.pts = []; } return; }
      const ctx = st.layer;
      const path = new Path2D();
      const R = st.R;
      for (let i = 0; i < n; i++) {
        const c = src[(Math.random() * src.length) | 0];
        // Distribución gaussiana: densa en el centro y cada vez más rala hacia afuera.
        const a = Math.random() * TAU;
        const rr = Math.min(R * 1.25, R * 0.45 * Math.sqrt(-2 * Math.log(1 - Math.random() * 0.9999)));
        const x = c.x + Math.cos(a) * rr, y = c.y + Math.sin(a) * rr;
        const r = st.dotR * (0.55 + Math.random() * 0.8);
        path.moveTo(x + r, y);
        path.arc(x, y, r, 0, TAU);
      }
      // Alcance real: las gotitas caen hasta R·1,25 del centro, más su propio radio (hasta dotR·1,35).
      const reach = R * 1.25 + st.dotR * 1.4 + 1;
      for (const c of src) st.mark(c.x, c.y, reach);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = st.color;
      ctx.fill(path);
      ctx.globalAlpha = 1;
      st.pos = src[src.length - 1];
      st.pts = [];
    },
  });

  // Marcador arcoíris: el tono cambia a lo largo del trazo.
  def({
    id: 'arcoiris', name: 'Marcador arcoíris', icon: 'pzArcoiris', buffered: true, alpha: 1, usesColor: false,
    sizes: [6, 11, 18, 28], loop: { freq: 1600, q: 0.8, vol: 0.05 },
    setup(st) {
      st.r = st.w / 2;
      st.step = clamp(st.r * 0.3, 0.3, 2.4);
      st.h0 = Math.random() * 360;
      st.hueStep = 360 / Math.max(260, st.r * 30); // una vuelta completa cada ~260+ unidades
    },
    draw(st, list) {
      // Se agrupan las muestras de a 2° de tono para no hacer un relleno por círculo.
      let group = [], hk = null;
      const flush = () => {
        if (!group.length) return;
        const path = circles(st, group, (s) => st.r * st.pf(s.p));
        if (path) solidFill(st.live, path, U.hsl(hk * 2, 95, 56));
        group = [];
      };
      for (const s of list) {
        const k = Math.round((st.h0 + s.d * st.hueStep) / 2);
        if (k !== hk) { flush(); hk = k; }
        group.push(s);
      }
      flush();
    },
  });

  // Brillitos: estrellitas y puntitos brillantes de colores, con destellos.
  def({
    id: 'brillitos', name: 'Brillitos', icon: 'pzBrillitos', buffered: false, alpha: 1, usesColor: true, keepMulti: true,
    sizes: [9, 14, 21, 30], loop: { freq: 6000, q: 1.2, vol: 0.03 },
    setup(st) {
      st.S = st.w;
      st.step = clamp(st.S * 0.2, 1, 5);
      st.nextD = 0;
      st.lastSound = 0;
      const base = st.color;
      st.pickColor = base === 'multi'
        ? () => U.pick(SPARKLE.concat(st.env.dark ? ['#ffffff', '#fff3a8'] : []))
        : () => {
          const r = Math.random();
          if (r < 0.55) return base;
          if (r < 0.75) return U.mix(base, '#ffffff', 0.45);
          if (r < 0.9) return '#ffd21f';
          return st.env.dark ? '#ffffff' : U.mix(base, '#2b2240', 0.2);
        };
    },
    draw(st, list) {
      for (const s of list) {
        if (s.d < st.nextD) continue;
        st.nextD = s.d + st.S * U.rand(0.55, 1.0);
        this.place(st, s);
      }
    },
    place(st, s) {
      const ctx = st.layer;
      const S = st.S;
      const n = Math.random() < 0.5 ? 1 : 2;
      for (let i = 0; i < n; i++) {
        const R = S * U.rand(0.45, 0.9) * (i ? 0.7 : 1);
        const x = s.x + U.rand(-0.7, 0.7) * S, y = s.y + U.rand(-0.7, 0.7) * S;
        const col = st.pickColor();
        const rot = U.rand(-0.5, 0.5);
        const kind = Math.random();
        // halo suave
        const g = ctx.createRadialGradient(x, y, 0, x, y, R * 1.7);
        g.addColorStop(0, U.hsl(0, 0, 100, st.env.dark ? 0.55 : 0.0));
        g.addColorStop(0.25, hexA(col, 0.45));
        g.addColorStop(1, hexA(col, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, R * 1.7, 0, TAU);
        ctx.fill();
        // cuerpo brillante (centro más claro)
        const g2 = ctx.createRadialGradient(x - R * 0.2, y - R * 0.25, 0, x, y, R);
        g2.addColorStop(0, U.mix(col, '#ffffff', 0.75));
        g2.addColorStop(0.55, col);
        g2.addColorStop(1, U.mix(col, '#2b2240', 0.12));
        ctx.fillStyle = g2;
        if (kind < 0.62) starPath(ctx, x, y, R, rot, 5, 0.5);
        else sparklePath(ctx, x, y, R * 1.15, rot);
        ctx.fill();
        // chispita blanca
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.arc(x - R * 0.18, y - R * 0.22, Math.max(0.5, R * 0.13), 0, TAU);
        ctx.fill();
        st.mark(x, y, R * 1.8);
        if (st.env.fx && Math.random() < 0.4) this.flare(st, x + U.rand(-0.3, 0.3) * R, y + U.rand(-0.3, 0.3) * R, R * 1.3);
      }
      // puntitos
      const dots = 2 + ((Math.random() * 3) | 0);
      for (let i = 0; i < dots; i++) {
        const r = S * U.rand(0.07, 0.16);
        const x = s.x + U.rand(-1.1, 1.1) * S, y = s.y + U.rand(-1.1, 1.1) * S;
        const col = st.pickColor();
        ctx.fillStyle = hexA(col, 0.35);
        ctx.beginPath(); ctx.arc(x, y, r * 2.1, 0, TAU); ctx.fill();
        ctx.fillStyle = U.mix(col, '#ffffff', 0.35);
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        st.mark(x, y, r * 2.2);
      }
      const now = performance.now();
      if (st.env.sound && now - st.lastSound > 170) { st.lastSound = now; st.env.sound('sparkle', { count: 2 }); }
    },
    flare(st, x, y, R) {
      st.env.fx.add({
        dur: 420,
        draw(ctx, k) {
          const a = Math.sin(k * Math.PI);
          const r = R * (0.5 + k * 0.9);
          ctx.globalAlpha = a;
          const g = ctx.createRadialGradient(x, y, 0, x, y, r);
          g.addColorStop(0, 'rgba(255,255,255,0.9)');
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
          ctx.fillStyle = '#ffffff';
          sparklePath(ctx, x, y, r * 1.1, k * 0.8);
          ctx.fill();
        },
      });
    },
  });

  // Sellos: un toque pone un sello con "pop"; arrastrando va dejando sellos espaciados.
  def({
    id: 'sellos', name: 'Sellos', icon: 'pzSellos', buffered: false, alpha: 1, usesColor: true, keepMulti: true,
    sizes: [38, 58, 84, 120], loop: null,
    setup(st) {
      st.step = clamp(st.w * 0.1, 1, 6);
      st.nextD = 0;
      st.lastSound = 0;
      st.count = 0;
    },
    draw(st, list) {
      for (const s of list) {
        if (s.d < st.nextD) continue;
        st.nextD = s.d + st.w * 1.08;
        this.place(st, s.x, s.y);
      }
    },
    place(st, x, y) {
      const id = st.env.stamp;
      const color = st.color;
      const rot = U.rand(-0.26, 0.26);
      const size = st.w * U.rand(0.94, 1.06);
      const layer = st.layer;
      st.mark(x, y, size * 0.72);
      st.count++;
      // Sobre el pizarrón, el sello lleva un borde claro (si no, el contorno oscuro se pierde).
      const opts = st.env.dark ? { halo: true } : null;
      const draw = (ctx, sc) => CL.stamps && CL.stamps.draw(ctx, id, x, y, size * sc, rot, color, opts);
      const now = performance.now();
      if (st.env.sound && now - st.lastSound > 60) {
        st.lastSound = now;
        st.env.sound('stamp', { pitch: 0.9 + ((st.count * 0.07) % 0.35) });
      }
      if (!st.env.fx) { draw(layer, 1); return; }
      st.env.fx.add({
        dur: 280,
        draw(ctx, k) {
          // "pop": crece con un rebote y se asienta
          const c1 = 2.4, e = k - 1;
          const sc = Math.max(0.05, 1 + (c1 + 1) * e * e * e + c1 * e * e);
          draw(ctx, sc);
        },
        done() { draw(layer, 1); },
      });
    },
  });

  // Goma: borra sólo los trazos (deja ver el fondo).
  def({
    id: 'goma', name: 'Goma', icon: 'pzGoma', buffered: false, alpha: 1, usesColor: false,
    sizes: [14, 26, 44, 70], loop: { freq: 500, q: 0.5, vol: 0.05 },
    setup(st) {
      st.r = st.w / 2;
      st.step = clamp(st.r * 0.25, 0.4, 3);
    },
    draw(st, list) {
      const path = circles(st, list, (s) => st.r);
      if (!path) return;
      const ctx = st.layer;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = '#000';
      ctx.fill(path);
      ctx.globalCompositeOperation = 'source-over';
    },
  });

  function hexA(hex, a) {
    const [r, g, b] = U.hexToRgb(hex);
    return `rgba(${r},${g},${b},${a})`;
  }

  /* ---------- Trazo ---------- */
  function begin(id, env, pt) {
    const b = defs[id] || defs.fibra;
    let color = env.color || '#2b2240';
    if (color === 'multi' && !b.keepMulti) color = U.pick(VIVID);
    const st = {
      brush: b,
      env,
      res: env.res || 1,
      live: env.live || null,
      layer: env.layer,
      color,
      w: b.sizes[clamp(env.size | 0, 0, b.sizes.length - 1)] * (env.unit || 1),
      pen: !!env.pen,
      bbox: null,
      samples: [],
      ended: false,
      mark(x, y, r) {
        const bb = this.bbox;
        if (!bb) { this.bbox = { x0: x - r, y0: y - r, x1: x + r, y1: y + r }; return; }
        if (x - r < bb.x0) bb.x0 = x - r;
        if (y - r < bb.y0) bb.y0 = y - r;
        if (x + r > bb.x1) bb.x1 = x + r;
        if (y + r > bb.y1) bb.y1 = y + r;
      },
      pf(p) { return this.pen ? 0.3 + 1.4 * clamp(p, 0, 1) : 1; },
    };
    if (b.setup) b.setup(st);
    const sampler = new Sampler(st.step || 1, (s) => st.samples.push(s));
    const flush = () => {
      if (!st.samples.length) return;
      const list = st.samples;
      st.samples = [];
      b.draw(st, list);
    };
    sampler.start({ x: pt.x, y: pt.y, p: pt.p == null ? 0.5 : pt.p, t: pt.t || performance.now() });
    st.lastP = pt.p == null ? 0.5 : pt.p;
    return {
      get bbox() { return st.bbox; },
      get brush() { return b; },
      get color() { return st.color; },
      /** Velocidad actual (unidades/ms), para el sonido. */
      get speed() { return sampler.v; },
      add(x, y, p, t) {
        if (st.ended) return;
        // Presión suavizada: el lápiz óptico da saltos chicos que se verían como escalones.
        p = p == null ? 0.5 : p;
        st.lastP = st.lastP == null ? p : st.lastP * 0.6 + p * 0.4;
        sampler.push({ x, y, p: st.lastP, t: t || performance.now() });
      },
      frame(now) {
        if (st.ended) return;
        flush();
        if (b.tick) b.tick(st, now || performance.now());
      },
      end() {
        if (st.ended) return;
        sampler.finish();
        flush();
        if (b.tick) b.tick(st, performance.now());
        if (b.finish) b.finish(st);
        st.ended = true;
      },
    };
  }

  CL.brushes = {
    /** Pinceles en orden, con { id, name, icon, sizes, buffered, alpha, usesColor, loop }. */
    get list() { return order.map((id) => defs[id]); },
    get(id) { return defs[id] || null; },
    begin,
    texturePattern,
    textureMask,
    starPath,
    sparklePath,
    Sampler,
    VIVID,
  };
})(window.CL);
