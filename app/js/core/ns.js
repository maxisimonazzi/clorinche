/* Colorines — espacio de nombres global y utilidades compartidas.
   Todos los módulos son scripts clásicos (no módulos ES) para que la app
   funcione también abriendo index.html con doble clic (file://). */
'use strict';
window.CL = window.CL || {};

(function (CL) {
  CL.VERSION = '1.0.0';

  const U = {};

  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
  U.rand = (a, b) => a + Math.random() * (b - a);
  U.randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  U.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  U.shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  U.uid = () =>
    Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);

  U.debounce = (fn, ms) => {
    let t = null;
    const d = (...args) => {
      clearTimeout(t);
      t = setTimeout(() => { t = null; fn(...args); }, ms);
    };
    d.flush = (...args) => {
      if (t !== null) { clearTimeout(t); t = null; return fn(...args); }
    };
    d.cancel = () => { clearTimeout(t); t = null; };
    d.pending = () => t !== null;
    return d;
  };

  U.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  U.nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

  /** devicePixelRatio acotado (más de 3 no se nota y gasta memoria). */
  U.dpr = () => Math.min(Math.max(window.devicePixelRatio || 1, 1), 3);

  /** Crea un elemento: el('button.btn.big', {onclick, 'aria-label': 'x'}, [hijos]) */
  U.el = (spec, attrs, children) => {
    const [tag, ...classes] = spec.split('.');
    const node = document.createElement(tag || 'div');
    if (classes.length) node.className = classes.join(' ');
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
        else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
        else if (k === 'dataset') Object.assign(node.dataset, v);
        else if (k === 'html') node.innerHTML = v;
        else if (k === 'text') node.textContent = v;
        else node.setAttribute(k, v === true ? '' : v);
      }
    }
    if (children != null) {
      for (const c of [].concat(children)) {
        if (c == null || c === false) continue;
        node.append(c instanceof Node ? c : document.createTextNode(String(c)));
      }
    }
    return node;
  };

  /** Canvas con tamaño de backing store ajustado. */
  U.canvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  };

  U.loadImage = (src) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
      img.src = src;
    });

  /** Blob -> HTMLImageElement (revoca la URL al terminar de cargar). */
  U.blobToImage = async (blob) => {
    const url = URL.createObjectURL(blob);
    try {
      return await U.loadImage(url);
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  };

  /** Texto SVG -> HTMLImageElement listo para drawImage. */
  U.svgToImage = (svgText) =>
    U.blobToImage(new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' }));

  U.canvasToBlob = (canvas, type = 'image/png', quality) =>
    new Promise((resolve, reject) => {
      if (canvas.toBlob) {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob falló'))), type, quality);
      } else {
        try {
          const data = canvas.toDataURL(type, quality);
          fetch(data).then((r) => r.blob()).then(resolve, reject);
        } catch (e) { reject(e); }
      }
    });

  /** Miniatura: dibuja `source` (canvas/imagen) cubriendo un cuadro maxSide. */
  U.thumbnail = (source, maxSide = 480, background = '#ffffff') => {
    const sw = source.width, sh = source.height;
    const s = Math.min(1, maxSide / Math.max(sw, sh));
    const c = U.canvas(sw * s, sh * s);
    const ctx = c.getContext('2d');
    if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, c.width, c.height); }
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, c.width, c.height);
    return c;
  };

  U.downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = U.el('a', { href: url, download: filename });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  /** Nombre de archivo lindo: colorines-vaca-2026-09-27.png */
  U.fileName = (base) => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    const slug = String(base || 'dibujo').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `colorines-${slug}-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.png`;
  };

  U.hsl = (h, s, l, a = 1) => `hsla(${((h % 360) + 360) % 360},${s}%,${l}%,${a})`;

  /** '#rrggbb' -> [r,g,b] */
  U.hexToRgb = (hex) => {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  U.rgbToHex = (r, g, b) =>
    '#' + [r, g, b].map((v) => U.clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');

  /** Mezcla dos colores hex (t=0 -> a, t=1 -> b). */
  U.mix = (a, b, t) => {
    const A = U.hexToRgb(a), B = U.hexToRgb(b);
    return U.rgbToHex(U.lerp(A[0], B[0], t), U.lerp(A[1], B[1], t), U.lerp(A[2], B[2], t));
  };

  /** Posición de un evento de puntero relativa a un elemento, en píxeles CSS. */
  U.localPoint = (ev, elem) => {
    const r = elem.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  };

  /** Presión normalizada (mouse = 0.5, lápiz = presión real, dedo = 0.5). */
  U.pressure = (ev) =>
    ev.pointerType === 'pen' && ev.pressure > 0 ? ev.pressure : 0.5;

  /** true si el dispositivo tiene pantalla táctil como puntero principal. */
  U.isCoarse = () => window.matchMedia && matchMedia('(pointer: coarse)').matches;

  // La app antes se llamaba "Colorinche": sus preferencias y guardados de emergencia pasan al nombre nuevo.
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('colorinche.')) keys.push(k);
    }
    for (const k of keys) {
      const nk = 'colorines.' + k.slice('colorinche.'.length);
      const v = localStorage.getItem(k);
      localStorage.removeItem(k); // primero se libera el lugar (un dibujo pendiente ocupa bastante)
      if (v != null && localStorage.getItem(nk) == null) localStorage.setItem(nk, v);
    }
  } catch (e) { /* sin almacenamiento */ }

  /** Almacenamiento local seguro (preferencias chiquitas por dispositivo). */
  U.pref = {
    get(key, def) {
      try {
        const v = localStorage.getItem('colorines.' + key);
        return v == null ? def : JSON.parse(v);
      } catch (e) { return def; }
    },
    set(key, value) {
      try { localStorage.setItem('colorines.' + key, JSON.stringify(value)); } catch (e) { /* sin almacenamiento */ }
    },
  };

  /** Emisor de eventos mínimo. */
  U.emitter = () => {
    const map = new Map();
    return {
      on(type, fn) {
        if (!map.has(type)) map.set(type, new Set());
        map.get(type).add(fn);
        return () => map.get(type).delete(fn);
      },
      emit(type, data) {
        const s = map.get(type);
        if (s) for (const fn of [...s]) { try { fn(data); } catch (e) { console.error(e); } }
      },
    };
  };

  CL.util = U;
  CL.bus = U.emitter();
})(window.CL);
