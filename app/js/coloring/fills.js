/* Colorinche — rellenos para colorear: liso y especiales (arcoíris, degradé, brillitos, lunares).

   CL.fills.draw(ctx, kind, color, x, y, w, h, { ox, oy, unit, seed })
     Pinta el relleno cubriendo el rectángulo (x, y, w, h) de `ctx`. Todos los rellenos son opacos.
     (ox, oy) = posición de ese rectángulo en la imagen completa: lunares y brillitos se alinean a una grilla
     global, así dos pinceladas o dos zonas vecinas combinan. `unit` = escala (1 para una imagen de 2048 px).
   CL.fills.make(kind, color, w, h, opts) -> canvas w×h con el relleno.
   CL.fills.preview(kind, color, sizePx)  -> canvas cuadrado para la muestra de la paleta. */
'use strict';
(function (CL) {
  const U = CL.util;
  const KINDS = ['solid', 'rainbow', 'gradient', 'sparkle', 'dots'];
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

  /** Destellos: claros sobre colores oscuros, dorados/más fuertes sobre colores muy claros. */
  function sparkleColors(color) {
    const L = luma(color);
    if (L > 215) return { star: '#ffc21a', glow: 'rgba(255,200,40,', dot: '#ff9fd0' };
    return { star: '#ffffff', glow: 'rgba(255,255,255,', dot: U.mix(color, '#ffffff', 0.7) };
  }

  /* ---------- azar determinista (para que el patrón sea igual en cada pincelada) ---------- */
  function hash(x, y, s) {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
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
  const tiles = new Map();   // clave -> canvas (los últimos usados)
  function sparkleTile(color, unit, seed) {
    const sc = sparkleColors(color);
    const size = Math.max(8, Math.round(110 * unit * TILE_CELLS));
    const key = [sc.star, sc.glow, sc.dot, size, seed].join('|');
    let t = tiles.get(key);
    if (t) { tiles.delete(key); tiles.set(key, t); return t; }
    t = U.canvas(size, size);
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
    tiles.set(key, t);
    while (tiles.size > 4) {
      const k = tiles.keys().next().value;
      const old = tiles.get(k);
      old.width = old.height = 0;
      tiles.delete(k);
    }
    return t;
  }

  function draw(ctx, kind, color, x, y, w, h, { ox = x, oy = y, unit = 1, seed = 7 } = {}) {
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
      const [a, b] = gradientPair(color);
      const g = ctx.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, a);
      g.addColorStop(1, b);
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
    } else if (kind === 'dots') {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = dotColor(color);
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
      const tile = sparkleTile(color, unit, seed);
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

  /** Muestra circular para la paleta (tamaño en píxeles del canvas). */
  function preview(kind, color, size) {
    const c = U.canvas(size, size);
    const ctx = c.getContext('2d');
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    const unit = kind === 'sparkle' ? size / 250 : size / 150;
    draw(ctx, kind, color, 0, 0, size, size, { ox: size * 0.13, oy: size * 0.3, unit, seed: kind === 'sparkle' ? 11 : 3 });
    ctx.restore();
    return c;
  }

  CL.fills = { KINDS, RAINBOW, draw, make, preview, gradientPair, dotColor, luma, hexToHsl };
})(window.CL);
