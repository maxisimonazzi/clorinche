/* Colorines — hoja para imprimir (PDF), sin dependencias.
   CL.print.pdf(imagen, { title }) -> Promise<Blob PDF>: una hoja A4 parada con el logo, el nombre "Colorines"
   con letras de colores y www.colorines.com.ar arriba, el título (si hay) y la obra centrada.
   La hoja se arma en un canvas (así usa la fuente Fredoka de la app) y va al PDF como una imagen JPEG que la
   cubre entera: el PDF es mínimo (catálogo, página, imagen) y lo abre cualquier visor. */
'use strict';
(function (CL) {
  const U = CL.util;
  const INK = '#2b2240';
  const SITE = 'www.colorines.com.ar';
  const LETTERS = ['#ff5a5f', '#ff9f1c', '#f5b800', '#2bc48a', '#4cc3ff', '#7b61ff', '#ff6fb5', '#ff5a5f', '#2bc48a'];

  // A4 a 200 ppp: se imprime nítido y el archivo queda liviano.
  const A4_PT = [595.28, 841.89];
  const PX_W = 1654, PX_H = 2339;
  const MM = PX_W / 210;

  // Copia de icons/icon.svg. Dibujar el archivo en un canvas lo "ensucia" al abrir la app con doble clic
  // (file://) y ya no se puede exportar; desde el texto no pasa.
  const LOGO = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><defs>' +
    '<linearGradient id="fondo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe066"/><stop offset="1" stop-color="#ff9f1c"/></linearGradient>' +
    '<linearGradient id="gota" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8fd0"/><stop offset="1" stop-color="#ff3d8b"/></linearGradient></defs>' +
    '<rect width="512" height="512" rx="112" fill="url(#fondo)"/>' +
    '<g transform="translate(256 258) scale(.9) translate(-256 -258)" stroke="#2b2240" stroke-width="18" stroke-linecap="round" stroke-linejoin="round">' +
    '<g fill="none" stroke-linecap="butt"><path d="M98 430V320a158 158 0 0 1 316 0v110" stroke="#2b2240" stroke-width="146"/>' +
    '<path d="M50 430V320a206 206 0 0 1 412 0v110" stroke="#ff5a5f" stroke-width="33"/><path d="M82 430V320a174 174 0 0 1 348 0v110" stroke="#ffd23f" stroke-width="33"/>' +
    '<path d="M114 430V320a142 142 0 0 1 284 0v110" stroke="#2bc48a" stroke-width="33"/><path d="M146 430V320a110 110 0 0 1 220 0v110" stroke="#4cc3ff" stroke-width="33"/></g>' +
    '<g stroke-width="36"><circle cx="70" cy="410" r="38"/><circle cx="118" cy="390" r="46"/><circle cx="166" cy="418" r="30"/><rect x="44" y="404" width="150" height="46" rx="23"/>' +
    '<circle cx="442" cy="410" r="38"/><circle cx="394" cy="390" r="46"/><circle cx="346" cy="418" r="30"/><rect x="318" y="404" width="150" height="46" rx="23"/></g>' +
    '<g fill="#fff" stroke="none"><circle cx="70" cy="410" r="38"/><circle cx="118" cy="390" r="46"/><circle cx="166" cy="418" r="30"/><rect x="44" y="404" width="150" height="46" rx="23"/>' +
    '<circle cx="442" cy="410" r="38"/><circle cx="394" cy="390" r="46"/><circle cx="346" cy="418" r="30"/><rect x="318" y="404" width="150" height="46" rx="23"/></g>' +
    '<path d="M256 108C298 172 362 244 362 332a106 106 0 0 1-212 0C150 244 214 172 256 108z" fill="url(#gota)"/>' +
    '<path d="M200 284c5-24 16-44 30-62" fill="none" stroke="#fff" stroke-width="15" opacity=".9"/>' +
    '<ellipse cx="220" cy="334" rx="16" ry="22" fill="#2b2240" stroke="none"/><ellipse cx="292" cy="334" rx="16" ry="22" fill="#2b2240" stroke="none"/>' +
    '<circle cx="226" cy="326" r="6.5" fill="#fff" stroke="none"/><circle cx="298" cy="326" r="6.5" fill="#fff" stroke="none"/>' +
    '<ellipse cx="192" cy="372" rx="17" ry="11" fill="#ffd0e6" stroke="none"/><ellipse cx="320" cy="372" rx="17" ry="11" fill="#ffd0e6" stroke="none"/>' +
    '<path d="M229 370q27 32 54 0z" fill="#2b2240" stroke-width="12"/>' +
    '<path d="M78 66l10 26 26 10-26 10-10 26-10-26-26-10 26-10z" fill="#fff" stroke-width="10"/>' +
    '<path d="M436 70l8 20 20 8-20 8-8 20-8-20-20-8 20-8z" fill="#fff" stroke-width="10"/></g></svg>';

  const FONT = "Fredoka, 'Arial Rounded MT Bold', 'Segoe UI', sans-serif";
  async function fontReady(spec) {
    try { if (document.fonts && document.fonts.load) await document.fonts.load(spec); } catch (e) { /* se usa la de respaldo */ }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /** Hoja A4 (canvas) con encabezado y la obra (canvas o imagen) lo más grande posible. */
  async function page(art, { title = '' } = {}) {
    const logoH = Math.round(24 * MM);
    const wordPx = Math.round(logoH * 0.8);
    const sitePx = Math.round(6 * MM);
    const titlePx = Math.round(10 * MM);
    await Promise.all([fontReady(`700 ${wordPx}px Fredoka`), fontReady(`500 ${sitePx}px Fredoka`)]);
    const logo = await U.svgToImage(LOGO).catch(() => null);

    const c = U.canvas(PX_W, PX_H);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, PX_W, PX_H);
    const m = Math.round(12 * MM);
    let y = m;

    // Logo + "Colorines" con cada letra de un color (como en el inicio), centrados.
    ctx.font = `700 ${wordPx}px ${FONT}`;
    const word = 'Colorines';
    const widths = [...word].map((ch) => ctx.measureText(ch).width);
    const wordW = widths.reduce((a, b) => a + b, 0);
    const gap = logo ? Math.round(5 * MM) : 0;
    let x = (PX_W - ((logo ? logoH : 0) + gap + wordW)) / 2;
    if (logo) { ctx.drawImage(logo, x, y, logoH, logoH); x += logoH + gap; }
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = wordPx * 0.09;
    ctx.strokeStyle = INK;
    [...word].forEach((ch, i) => {
      ctx.save();
      ctx.translate(x + widths[i] / 2, y + logoH * 0.52);
      ctx.rotate(((i % 2 ? 4 : -4) * Math.PI) / 180);
      ctx.strokeText(ch, -widths[i] / 2, 0);
      ctx.fillStyle = LETTERS[i % LETTERS.length];
      ctx.fillText(ch, -widths[i] / 2, 0);
      ctx.restore();
      x += widths[i];
    });
    y += logoH + Math.round(3 * MM);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = `500 ${sitePx}px ${FONT}`;
    ctx.fillStyle = '#6a5f80';
    ctx.fillText(SITE, PX_W / 2, y);
    y += sitePx + Math.round(5 * MM);

    if (title) {
      ctx.font = `600 ${titlePx}px ${FONT}`;
      ctx.fillStyle = INK;
      ctx.fillText(title, PX_W / 2, y, PX_W - 2 * m);
      y += titlePx + Math.round(5 * MM);
    }

    // La obra: lo más grande que entre, centrada en lo que queda de la hoja, con un borde suave.
    const boxW = PX_W - 2 * m, boxH = PX_H - m - y;
    const aw0 = art.naturalWidth || art.width, ah0 = art.naturalHeight || art.height;
    const s = Math.min(boxW / aw0, boxH / ah0);
    const aw = Math.round(aw0 * s), ah = Math.round(ah0 * s);
    const ax = Math.round((PX_W - aw) / 2), ay = Math.round(y + (boxH - ah) / 2);
    ctx.save();
    roundRect(ctx, ax, ay, aw, ah, Math.round(4 * MM));
    ctx.clip();
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(art, ax, ay, aw, ah);
    ctx.restore();
    roundRect(ctx, ax, ay, aw, ah, Math.round(4 * MM));
    ctx.lineWidth = Math.max(3, Math.round(0.6 * MM));
    ctx.strokeStyle = '#d6d0e2';
    ctx.stroke();
    return c;
  }

  /* ---------- PDF mínimo ---------- */
  const bytes = (str) => { const a = new Uint8Array(str.length); for (let i = 0; i < str.length; i++) a[i] = str.charCodeAt(i) & 255; return a; };
  // Texto con tildes para los metadatos: UTF-16BE en hexadecimal.
  const pdfText = (str) => '<FEFF' + [...str].map((ch) => {
    const u = ch.codePointAt(0);
    if (u < 0x10000) return u.toString(16).padStart(4, '0');
    const v = u - 0x10000;
    return ((0xd800 + (v >> 10)).toString(16) + (0xdc00 + (v & 1023)).toString(16));
  }).join('').toUpperCase() + '>';

  /** PDF de una página A4 con la imagen JPEG cubriéndola entera. */
  function jpegPdf(jpeg, w, h, title) {
    const parts = [], offsets = [];
    let len = 0;
    const add = (x) => { const b = typeof x === 'string' ? bytes(x) : x; parts.push(b); len += b.length; };
    const obj = (n, ...body) => { offsets[n] = len; add(n + ' 0 obj\n'); body.forEach(add); add('\nendobj\n'); };
    const [PW, PH] = A4_PT;
    const d = new Date();
    const p = (v) => String(v).padStart(2, '0');
    const date = `D:${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
    const draw = `q ${PW} 0 0 ${PH} 0 0 cm /Im0 Do Q`;

    add('%PDF-1.4\n%âãÏÓ\n');
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /XObject << /Im0 4 0 R >> /ProcSet [/PDF /ImageC] >> /Contents 5 0 R >>`);
    obj(4, `<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`, jpeg, '\nendstream');
    obj(5, `<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`);
    obj(6, `<< /Title ${pdfText(title || 'Colorines')} /Creator (Colorines - ${SITE}) /Producer (Colorines) /CreationDate (${date}) >>`);
    const xref = len;
    add('xref\n0 7\n0000000000 65535 f \n');
    for (let n = 1; n <= 6; n++) add(String(offsets[n]).padStart(10, '0') + ' 00000 n \n');
    add(`trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    return new Blob(parts, { type: 'application/pdf' });
  }

  /** Obra (canvas o imagen) -> Blob PDF listo para imprimir. */
  async function pdf(art, { title = '' } = {}) {
    const c = await page(art, { title });
    try {
      const jpeg = new Uint8Array(await (await U.canvasToBlob(c, 'image/jpeg', 0.92)).arrayBuffer());
      return jpegPdf(jpeg, c.width, c.height, title ? 'Colorines - ' + title : 'Colorines');
    } finally {
      c.width = c.height = 0;
    }
  }

  CL.print = { pdf, page };
})(window.CL);
