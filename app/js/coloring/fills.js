/* Colorines — rellenos para colorear: liso y especiales (arcoíris, degradé, brillitos, lunares, estrellas,
   corazones, rompecabezas, ondas y escamas).

   CL.fills.draw(ctx, kind, color, x, y, w, h, { ox, oy, unit, seed, color2 })
     Pinta el relleno cubriendo el rectángulo (x, y, w, h) de `ctx`. Todos los rellenos son opacos.
     (ox, oy) = posición de ese rectángulo en la imagen completa: los dibujitos se alinean a una grilla
     global, así dos pinceladas o dos zonas vecinas combinan. `unit` = escala (1 para una imagen de 2048 px).
     `color2` = segundo color que eligió el chico (lunares, estrellas, la otra punta del degradé...). Si no
     eligió ninguno (o eligió el mismo), se usa uno que combine con `color` (ver second()).
   CL.fills.make(kind, color, w, h, opts) -> canvas w×h con el relleno.
   CL.fills.preview(kind, color, sizePx, color2)  -> canvas cuadrado para la muestra de la paleta. */
'use strict';
(function (CL) {
  const U = CL.util;
  const KINDS = ['solid', 'rainbow', 'gradient', 'sparkle', 'dots', 'stars', 'hearts', 'puzzle', 'waves', 'scales'];
  const RAINBOW = ['#ff4b4b', '#ff9a1f', '#ffd83a', '#5ad45a', '#3fbdf5', '#5a6cff', '#b45cff'];

  /* ---------- color ---------- */
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0, s = 0;
    if (max !== min) {
      const dd = max - min;
      s = l > 0.5 ? dd / (2 - max - min) : dd / (max + min);
      if (max === r) h = (g - b) / dd + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / dd + 2;
      else h = (r - g) / dd + 4;
      h *= 60;
    }
    return [h, s * 100, l * 100];
  }
  const hexToHsl = (hex) => rgbToHsl(...U.hexToRgb(hex));
  const luma = (hex) => { const [r, g, b] = U.hexToRgb(hex); return r * 0.299 + g * 0.587 + b * 0.114; };
  const same = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();

  /** Segundo color del degradé: más claro (o más oscuro si ya es muy claro) y con otro tono. */
  function gradientPair(color) {
    const [h, s, l] = hexToHsl(color);
    if (s < 8) {
      // Grises, blanco y negro: degradé hacia un celeste suave o un gris.
      return l > 85 ? ['#bfe6ff', color] : [U.mix(color, '#ffffff', 0.55), color];
    }
    const l2 = l > 78 ? l - 22 : Math.min(90, l + 30);
    return [U.hsl(h + 40, Math.min(100, s + 5), l2), color];
  }

  /** Color de los lunares: blancos sobre colores medios/oscuros; de contraste sobre colores claros. */
  function dotColor(color) {
    if (luma(color) < 185) return '#ffffff';
    const [h, s] = hexToHsl(color);
    return s < 8 ? '#ff6fae' : U.hsl(h + 180, 75, 52);
  }

  /** Corazones: blancos sobre colores medios/oscuros; rosas (o frambuesa sobre rosas y rojos claros). */
  function heartColor(color) {
    if (luma(color) < 185) return '#ffffff';
    const [h, s] = hexToHsl(color);
    return s > 25 && (h < 25 || h > 300) ? '#d81b60' : '#ff4d7e';
  }

  /** Estrellas: amarillas sobre colores oscuros (cielo de noche), si no igual que los lunares. */
  function starColor(color) {
    return luma(color) < 90 ? '#ffe45c' : dotColor(color);
  }

  /** Destellos: claros sobre colores oscuros, dorados/más fuertes sobre colores muy claros. */
  function sparkleColors(color, color2) {
    if (color2 && !same(color2, color)) {
      const [r, g, b] = U.hexToRgb(color2);
      return { star: color2, glow: `rgba(${r},${g},${b},`, dot: U.mix(color2, '#ffffff', 0.45) };
    }
    const L = luma(color);
    if (L > 215) return { star: '#ffc21a', glow: 'rgba(255,200,40,', dot: '#ff9fd0' };
    return { star: '#ffffff', glow: 'rgba(255,255,255,', dot: U.mix(color, '#ffffff', 0.7) };
  }

  /** El segundo color que usa cada relleno: el elegido o, si no hay (o es el mismo), uno que combine. */
  function second(kind, color, color2) {
    if (color2 && !same(color2, color)) return color2;
    if (kind === 'gradient' || kind === 'puzzle' || kind === 'waves' || kind === 'scales') return gradientPair(color)[0];
    if (kind === 'hearts') return heartColor(color);
    if (kind === 'stars') return starColor(color);
    if (kind === 'sparkle') return sparkleColors(color).star;
    return dotColor(color);
  }

  /* ---------- azar determinista (para que el patrón sea igual en cada pincelada) ---------- */
  function hash(x, y, s) {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  /* ---------- azulejos: se arman una vez por color y escala, y se repiten sin costuras ---------- */
  const tiles = new Map();   // clave -> canvas (los últimos usados)
  function cachedTile(key, build) {
    let t = tiles.get(key);
    if (t) { tiles.delete(key); tiles.set(key, t); return t; }
    t = build();
    tiles.set(key, t);
    while (tiles.size > 8) {
      const k = tiles.keys().next().value;
      const old = tiles.get(k);
      old.width = old.height = 0;
      tiles.delete(k);
    }
    return t;
  }

  function sparkleShape(ctx, x, y, r) {
    // Estrella de 4 puntas finita (destello).
    const k = r * 0.28;
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x + k, y - k, x + r, y);
    ctx.quadraticCurveTo(x + k, y + k, x, y + r);
    ctx.quadraticCurveTo(x - k, y + k, x - r, y);
    ctx.quadraticCurveTo(x - k, y - k, x, y - r);
    ctx.closePath();
    ctx.fill();
  }

  /* Azulejo de destellos: TILE_CELLS × TILE_CELLS celdas con un destello (halo + estrella) y un puntito
     cada una, al azar pero fijos. Es periódico: las celdas del borde se dibujan también del otro lado,
     así se repite sin costuras. */
  const TILE_CELLS = 8;
  function sparkleTile(color, color2, unit, seed) {
    const sc = sparkleColors(color, color2);
    const size = Math.max(8, Math.round(110 * unit * TILE_CELLS));
    return cachedTile(['sparkle', sc.star, sc.glow, sc.dot, size, seed].join('|'), () => {
      const t = U.canvas(size, size);
      const ctx = t.getContext('2d');
      const n = TILE_CELLS, step = size / n, u = step / 110;
      const wrap = (v) => ((v % n) + n) % n;
      for (let gy = -1; gy <= n; gy++) {
        for (let gx = -1; gx <= n; gx++) {
          const hx = wrap(gx), hy = wrap(gy);
          const r1 = hash(hx, hy, seed), r2 = hash(hx, hy, seed + 1), r3 = hash(hx, hy, seed + 2);
          const cx = (gx + 0.15 + r1 * 0.7) * step;
          const cy = (gy + 0.15 + r2 * 0.7) * step;
          const big = (14 + r3 * 26) * u;
          // halo
          const hg = ctx.createRadialGradient(cx, cy, 0, cx, cy, big * 1.25);
          hg.addColorStop(0, sc.glow + '0.75)');
          hg.addColorStop(1, sc.glow + '0)');
          ctx.fillStyle = hg;
          ctx.fillRect(cx - big * 1.3, cy - big * 1.3, big * 2.6, big * 2.6);
          ctx.fillStyle = sc.star;
          sparkleShape(ctx, cx, cy, big);
          // puntito acompañante
          const r4 = hash(hx, hy, seed + 3);
          ctx.fillStyle = sc.dot;
          ctx.beginPath();
          ctx.arc(cx + (r4 - 0.5) * step * 0.6, cy + (0.5 - r1) * step * 0.55, (4 + r4 * 5) * u, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      return t;
    });
  }

  /* ---------- dibujitos: estrellas, corazones, rompecabezas, ondas y escamas ----------
     Cada uno arma un azulejo opaco (fondo `base` + dibujitos en `other`) de lado entero, así no hay costuras. */
  function starPath(c, x, y, r, rot) {
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 ? r * 0.47 : r;
      const a = rot - Math.PI / 2 + (i * Math.PI) / 5;
      c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    c.closePath();
  }
  function heartPath(c, x, y, r, rot) {
    const s = r * 1.1;
    c.save();
    c.translate(x, y);
    c.rotate(rot);
    c.translate(0, -s * 0.16); // centrado a ojo (la punta de abajo es más larga que los lóbulos)
    c.moveTo(0, s * 0.9);
    c.bezierCurveTo(-s * 1.35, s * 0.05, -s * 0.85, -s * 1.05, 0, -s * 0.38);
    c.bezierCurveTo(s * 0.85, -s * 1.05, s * 1.35, s * 0.05, 0, s * 0.9);
    c.closePath();
    c.restore();
  }

  /** 2×2 celdas: dos dibujitos grandes en una diagonal y dos chicos en la otra, un poco girados. */
  function scatterTile(shape) {
    return (base, other, unit) => {
      const cell = Math.max(6, Math.round(112 * unit));
      const t = U.canvas(cell * 2, cell * 2);
      const c = t.getContext('2d');
      c.fillStyle = base;
      c.fillRect(0, 0, t.width, t.height);
      c.fillStyle = c.strokeStyle = other;
      c.lineJoin = 'round';
      c.lineWidth = cell * 0.06;   // puntas redondeadas, más "de dibujito"
      for (const [cx, cy, r, rot] of [[0.5, 0.5, 0.33, -0.2], [1.5, 1.5, 0.33, 0.24], [1.5, 0.5, 0.22, 0.36], [0.5, 1.5, 0.22, -0.32]]) {
        c.beginPath();
        shape(c, cx * cell, cy * cell, r * cell, rot);
        c.fill();
        c.stroke();
      }
      return t;
    };
  }

  /** Piezas en damero con encastres: las del segundo color salen por los costados y reciben por arriba y abajo. */
  function puzzleTile(base, other, unit) {
    const P = Math.max(8, Math.round(128 * unit));
    const t = U.canvas(P * 2, P * 2);
    const c = t.getContext('2d');
    c.fillStyle = base;
    c.fillRect(0, 0, t.width, t.height);
    const d = P * 0.13, R = P * 0.18;
    const knob = (x, y) => { c.moveTo(x + R, y); c.arc(x, y, R, 0, Math.PI * 2); };
    const pieces = [];
    // También las piezas de alrededor: sus encastres asoman adentro del azulejo.
    for (let j = -1; j <= 2; j++) for (let i = -1; i <= 2; i++) if ((i + j) & 1) pieces.push([i * P, j * P]);
    c.fillStyle = other;
    c.beginPath();
    for (const [x0, y0] of pieces) {
      c.rect(x0, y0, P, P);
      knob(x0 - d, y0 + P / 2);
      knob(x0 + P + d, y0 + P / 2);
    }
    c.fill();
    c.fillStyle = base;
    c.beginPath();
    for (const [x0, y0] of pieces) {
      knob(x0 + P / 2, y0 + d);
      knob(x0 + P / 2, y0 + P - d);
    }
    c.fill();
    return t;
  }

  /** Franjas onduladas de los dos colores. */
  function wavesTile(base, other, unit) {
    const L = Math.max(8, Math.round(220 * unit)), H = Math.max(4, Math.round(58 * unit));
    const t = U.canvas(L, H * 2);
    const c = t.getContext('2d');
    c.fillStyle = base;
    c.fillRect(0, 0, L, H * 2);
    const a = H * 0.4, n = 48;
    const wave = (x, y0) => y0 + a * Math.sin((x / L) * Math.PI * 2);
    c.fillStyle = other;
    c.beginPath();
    for (let k = 0; k <= n; k++) { const x = (k / n) * L; c.lineTo(x, wave(x, H * 0.5)); }
    for (let k = n; k >= 0; k--) { const x = (k / n) * L; c.lineTo(x, wave(x, H * 1.5)); }
    c.closePath();
    c.fill();
    return t;
  }

  /** Escamas (como la cola de una sirena): filas de círculos con borde; cada fila tapa la mitad de arriba
      de la de abajo, así de cada escama se ve la "U". */
  function scalesTile(base, other, unit) {
    const r = Math.max(4, Math.round(46 * unit));
    const t = U.canvas(r * 2, r * 2);
    const c = t.getContext('2d');
    c.fillStyle = base;
    c.fillRect(0, 0, t.width, t.height);
    c.strokeStyle = other;
    c.lineWidth = Math.max(1, r * 0.22);
    for (let j = 4; j >= -2; j--) {
      const y = j * r, off = j & 1 ? r : 0;
      for (let i = -1; i <= 2; i++) {
        c.beginPath();
        c.arc(i * 2 * r + off, y, r - c.lineWidth / 2, 0, Math.PI * 2);
        c.fill();
        c.stroke();
      }
    }
    return t;
  }

  const MOTIFS = {
    stars: scatterTile(starPath),
    hearts: scatterTile(heartPath),
    puzzle: puzzleTile,
    waves: wavesTile,
    scales: scalesTile,
  };
  function motifTile(kind, base, other, unit) {
    return cachedTile([kind, base, other, Math.round(unit * 1000)].join('|'), () => MOTIFS[kind](base, other, unit));
  }

  function draw(ctx, kind, color, x, y, w, h, { ox = x, oy = y, unit = 1, seed = 7, color2 = null } = {}) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    if (kind === 'rainbow') {
      // Bandas del arcoíris de arriba a abajo, con bordes apenas suaves.
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      const n = RAINBOW.length;
      RAINBOW.forEach((c, i) => {
        g.addColorStop(Math.min(1, i / n + 0.012), c);
        g.addColorStop(Math.max(0, (i + 1) / n - 0.012), c);
      });
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
    } else if (kind === 'gradient') {
      const g = ctx.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, second(kind, color, color2));
      g.addColorStop(1, color);
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
    } else if (kind === 'dots') {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = second(kind, color, color2);
      const step = 84 * unit, r = 21 * unit;
      const gx0 = Math.floor((ox - step) / step), gy0 = Math.floor((oy - step) / step);
      const gx1 = Math.ceil((ox + w + step) / step), gy1 = Math.ceil((oy + h + step) / step);
      ctx.beginPath();
      for (let gy = gy0; gy <= gy1; gy++) {
        const shift = (gy & 1) ? step / 2 : 0;
        for (let gx = gx0; gx <= gx1; gx++) {
          const cx = gx * step + shift - ox + x, cy = gy * step - oy + y;
          ctx.moveTo(cx + r, cy);
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
        }
      }
      ctx.fill();
    } else if (kind === 'sparkle') {
      // Base con un brillo suave diagonal + destellos y puntitos claros en una grilla global.
      const g = ctx.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, U.mix(color, '#ffffff', 0.18));
      g.addColorStop(0.5, color);
      g.addColorStop(1, U.mix(color, '#ffffff', 0.12));
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
      // Destellos: un azulejo que se repite, alineado a la grilla global de la imagen (así pincel y balde
      // combinan). Se arma una sola vez por color y escala: pintar una zona enorme no se traba.
      const tile = sparkleTile(color, color2, unit, seed);
      ctx.translate(x - ox, y - oy);
      ctx.fillStyle = ctx.createPattern(tile, 'repeat');
      ctx.fillRect(ox, oy, w, h);
    } else if (MOTIFS[kind]) {
      // Azulejo opaco alineado a la grilla global (igual que los destellos).
      const tile = motifTile(kind, color, second(kind, color, color2), unit);
      ctx.translate(x - ox, y - oy);
      ctx.fillStyle = ctx.createPattern(tile, 'repeat');
      ctx.fillRect(ox, oy, w, h);
    } else {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
    }
    ctx.restore();
  }

  function make(kind, color, w, h, opts = {}) {
    const c = U.canvas(w, h);
    const ctx = c.getContext('2d');
    draw(ctx, kind, color, 0, 0, c.width, c.height, Object.assign({ ox: 0, oy: 0 }, opts));
    return c;
  }

  // Escala de cada relleno en la muestra de la paleta (más grande = dibujitos más chicos, entran más).
  const PREVIEW_SCALE = { sparkle: 250, stars: 250, hearts: 250, puzzle: 290, waves: 270, scales: 230 };

  /** Muestra circular para la paleta (tamaño en píxeles del canvas). */
  function preview(kind, color, size, color2 = null) {
    const c = U.canvas(size, size);
    const ctx = c.getContext('2d');
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    const unit = size / (PREVIEW_SCALE[kind] || 150);
    draw(ctx, kind, color, 0, 0, size, size, { ox: size * 0.13, oy: size * 0.3, unit, seed: kind === 'sparkle' ? 11 : 3, color2 });
    ctx.restore();
    return c;
  }

  CL.fills = { KINDS, RAINBOW, draw, make, preview, second, gradientPair, dotColor, luma, hexToHsl };
})(window.CL);
