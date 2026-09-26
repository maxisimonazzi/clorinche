/* Colorinche — js/drawings/mar.js
   Dibujos para colorear de la categoría "Mar": ballena, pulpo, tiburón, cangrejo, estrella de mar
   y caballito de mar. Lienzo 1000 × 1000, contorno 16, detalles internos 10–12
   (ver dev/ARQUITECTURA.md, sección 5). El orden importa: lo que va adelante se dibuja después
   y su relleno blanco tapa las líneas de atrás. */
'use strict';
(function (CL) {
  const add = (id, nombre, svg) => CL.drawings.add('mar', id, nombre, svg);
  const R = Math.round;
  const RAD = Math.PI / 180;

  /* ---------- Geometría ---------- */

  const P = (p) => `${R(p[0])} ${R(p[1])}`;

  // Punto de una curva cúbica (a, b, c, d) en t.
  function bz(a, b, c, d, t) {
    const u = 1 - t;
    const k = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
    return [0, 1].map((i) => k[0] * a[i] + k[1] * b[i] + k[2] * c[i] + k[3] * d[i]);
  }

  // Contorno hecho de curvas cúbicas: { d, en(i, t) } donde en() da un punto exacto sobre el tramo i.
  // tramos = [[c1, c2, fin], ...] a partir de `ini`.
  function contorno(ini, tramos) {
    let d = `M${P(ini)}`;
    const pts = [ini];
    for (const [c1, c2, f] of tramos) {
      d += `C${P(c1)} ${P(c2)} ${P(f)}`;
      pts.push(f);
    }
    return {
      d: d + 'Z',
      en: (i, t) => bz(pts[i], tramos[i][0], tramos[i][1], tramos[i][2], t),
    };
  }

  // Curva suave (Catmull-Rom → cúbicas) que pasa por todos los puntos.
  function suave(pts, cerrada = false) {
    const n = pts.length;
    const g = (i) => (cerrada ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
    let d = `M${P(pts[0])}`;
    const segs = cerrada ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += `C${P(c1)} ${P(c2)} ${P(p2)}`;
    }
    return d + (cerrada ? 'Z' : '');
  }

  // Como suave(), pero con tangentes proporcionales al largo de cada tramo: no hace rulitos ni
  // bultos cuando los puntos quedan a distancias muy distintas (p. ej. después de simplificar()).
  function suaveL(pts, cerrada = false) {
    const n = pts.length;
    const g = (i) => (cerrada ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
    const d = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    let s = `M${P(pts[0])}`;
    const segs = cerrada ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
      const l = d(p1, p2), k1 = l / (d(p0, p1) + l) / 3, k2 = l / (l + d(p2, p3)) / 3;
      const c1 = [p1[0] + (p2[0] - p0[0]) * k1, p1[1] + (p2[1] - p0[1]) * k1];
      const c2 = [p2[0] - (p3[0] - p1[0]) * k2, p2[1] - (p3[1] - p1[1]) * k2];
      s += `C${P(c1)} ${P(c2)} ${P(p2)}`;
    }
    return s + (cerrada ? 'Z' : '');
  }

  // Recorrido muestreado (Catmull-Rom) por los puntos de control: `k` muestras por tramo.
  function muestrear(ctrl, k = 6) {
    const n = ctrl.length;
    const g = (i) => ctrl[Math.max(0, Math.min(n - 1, i))];
    const out = [];
    for (let i = 0; i < n - 1; i++) {
      const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
      for (let j = 0; j < k; j++) {
        const t = j / k, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t +
          (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
      }
    }
    out.push(ctrl[n - 1]);
    return out;
  }

  // Reparte puntos a distancias iguales (`paso`) a lo largo de una polilínea: así suave() no hace
  // rulitos ni escalones donde los puntos de entrada quedan muy juntos o muy separados.
  function parejo(pts, paso) {
    const out = [pts[0]];
    let resto = paso;
    for (let i = 1; i < pts.length; i++) {
      let [ax, ay] = pts[i - 1];
      const [bx, by] = pts[i];
      let l = Math.hypot(bx - ax, by - ay);
      while (l >= resto) {
        const f = resto / l;
        ax += (bx - ax) * f; ay += (by - ay) * f;
        out.push([ax, ay]);
        l -= resto; resto = paso;
      }
      resto -= l;
    }
    const u = pts[pts.length - 1], v = out[out.length - 1];
    if (Math.hypot(u[0] - v[0], u[1] - v[1]) > paso * 0.4) out.push(u); else out[out.length - 1] = u;
    return out;
  }

  // Simplifica una polilínea densa (Ramer–Douglas–Peucker): deja sólo los puntos necesarios para
  // no apartarse más de `tol` unidades. Muchos puntos en las curvas cerradas, pocos en las rectas:
  // el SVG queda liviano sin perder la forma.
  function simplificar(pts, tol) {
    const keep = new Uint8Array(pts.length);
    keep[0] = keep[pts.length - 1] = 1;
    const pila = [[0, pts.length - 1]];
    while (pila.length) {
      const [a, b] = pila.pop();
      const [ax, ay] = pts[a], [bx, by] = pts[b], l = Math.hypot(bx - ax, by - ay) || 1;
      let max = 0, k = -1;
      for (let i = a + 1; i < b; i++) {
        const d = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / l;
        if (d > max) { max = d; k = i; }
      }
      if (max > tol) { keep[k] = 1; pila.push([a, k], [k, b]); }
    }
    return pts.filter((p, i) => keep[i]);
  }

  // Brazo que se afina (tentáculos, colas): contorno cerrado alrededor de un recorrido,
  // ancho w0 en la raíz y w1 en la punta (redondeada). Devuelve { d, eje, ancho(i), en(f, lado) }.
  function brazo(pts, w0, w1) {
    const n = pts.length;
    const ancho = (i) => w0 + (w1 - w0) * (i / (n - 1));
    const nor = (i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      return [-(b[1] - a[1]) / l, (b[0] - a[0]) / l];
    };
    const izq = [], der = [];
    for (let i = 0; i < n; i++) {
      const m = nor(i), h = ancho(i) / 2;
      izq.push([pts[i][0] + m[0] * h, pts[i][1] + m[1] * h]);
      der.push([pts[i][0] - m[0] * h, pts[i][1] - m[1] * h]);
    }
    const h = R(w1 / 2);
    const vuelta = suave(der.reverse()).replace(/^M[^C]*/, '');
    return {
      d: `${suave(izq)}A${h} ${h} 0 0 0 ${P(der[0])}${vuelta}Z`,
      eje: pts,
      ancho,
      // Punto del eje a una fracción f del recorrido, corrido hacia un costado (lado en -1..1).
      en(f, lado = 0) {
        const i = Math.round(f * (n - 1)), m = nor(i), k = (lado * ancho(i)) / 2;
        return [R(pts[i][0] + m[0] * k), R(pts[i][1] + m[1] * k)];
      },
    };
  }

  // Tira de ancho variable alrededor de un recorrido (colas que se afinan de a poco): anchos[i] es
  // el ancho en el punto de control i. Devuelve los bordes muestreados (izq, der) y la punta
  // redondeada (medio círculo de izq a der), para armar contornos con suave(..., true).
  function tira(ctrl, anchos, k = 3) {
    const eje = muestrear(ctrl, k), n = eje.length;
    const w = (j) => {
      const i = Math.min(ctrl.length - 2, Math.floor(j / k)), t = j / k - i;
      return anchos[i] + (anchos[i + 1] - anchos[i]) * t;
    };
    const izq = [], der = [];
    let m = [0, 0];
    for (let j = 0; j < n; j++) {
      const a = eje[Math.max(0, j - 1)], b = eje[Math.min(n - 1, j + 1)];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, h = w(j) / 2;
      m = [-(b[1] - a[1]) / l, (b[0] - a[0]) / l];
      izq.push([eje[j][0] + m[0] * h, eje[j][1] + m[1] * h]);
      der.push([eje[j][0] - m[0] * h, eje[j][1] - m[1] * h]);
    }
    const e = eje[n - 1], h = w(n - 1) / 2, am = Math.atan2(m[1], m[0]);
    const punta = [1, 2, 3].map((q) => [e[0] + h * Math.cos(am - q * Math.PI / 4), e[1] + h * Math.sin(am - q * Math.PI / 4)]);
    return { eje, izq, der, punta, w };
  }

  // Punto (u, v) de un sistema local con origen o y dirección `ang` (grados): u adelante, v al costado.
  const local = (o, ang, u, v) => {
    const c = Math.cos(ang * RAD), s = Math.sin(ang * RAD);
    return [o[0] + u * c - v * s, o[1] + u * s + v * c];
  };

  /* ---------- Piezas compartidas (mismo estilo en toda la categoría) ---------- */

  // Ojo tierno: pupila negra con un brillito grande y uno chiquito.
  const ojo = (x, y, rx = 28, ry = 35) =>
    `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#000"/>` +
    `<circle cx="${x - R(rx * 0.3)}" cy="${y - R(ry * 0.35)}" r="${Math.min(10, R(rx * 0.38))}" fill="#fff" stroke="none"/>` +
    `<circle cx="${x + R(rx * 0.35)}" cy="${y + R(ry * 0.4)}" r="${R(rx * 0.17)}" fill="#fff" stroke="none"/>`;

  // Cachete para pintar de rosado (ry >= 30: queda una zona de un dedo de ancho).
  const cachete = (x, y, rx = 40, ry = 30) =>
    `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" stroke-width="12"/>`;

  // Línea de detalle abierta (sonrisas, rayas).
  const linea = (d, w = 12) => `<path d="${d}" fill="none" stroke-width="${w}"/>`;

  // Burbuja con reflejo (el reflejo flota adentro: no corta la zona).
  const burbuja = (x, y, r) =>
    `<circle cx="${x}" cy="${y}" r="${r}" stroke-width="12"/>` +
    linea(`M${x - R(r * 0.55)} ${y - R(r * 0.05)}A${R(r * 0.55)} ${R(r * 0.55)} 0 0 1 ${x - R(r * 0.05)} ${y - R(r * 0.55)}`, 10);

  const circulo = (x, y, r, w = 12) => `<circle cx="${x}" cy="${y}" r="${r}" stroke-width="${w}"/>`;

  /* ---------- Ballena ---------- */
  {
    const c = contorno([100, 600], [
      [[92, 430], [228, 318], [400, 318]], // 0 cabeza
      [[560, 318], [650, 395], [705, 448]], // 1 lomo
      [[748, 486], [795, 470], [798, 420]], // 2 hueco antes de la cola
      [[800, 380], [750, 340], [712, 316]], // 3 aleta izquierda, borde de abajo
      [[676, 294], [690, 250], [730, 254]], // 4 punta izquierda
      [[790, 260], [825, 290], [838, 330]], // 5 aleta izquierda, borde de arriba
      [[852, 285], [888, 246], [924, 242]], // 6 aleta derecha, borde de arriba
      [[956, 238], [960, 276], [938, 294]], // 7 punta derecha
      [[905, 322], [880, 370], [876, 440]], // 8 aleta derecha, borde de abajo
      [[864, 560], [772, 698], [640, 764]], // 9 pedúnculo de abajo
      [[480, 846], [232, 828], [150, 736]], // 10 panza
      [[120, 700], [102, 650], [100, 600]], // 11 hocico
    ]);
    // Rayas de la panza: cada una va de un punto exacto del contorno a otro.
    const r1 = [c.en(11, 0.92), c.en(9, 0.52)];
    const r2 = [c.en(11, 0.4)];
    add('ballena', 'Ballena', `<g transform="translate(-10 40)">
      <path d="M374 334C374 290 374 246 364 218C334 196 298 200 276 226C262 242 254 260 248 282C222 264 214 224 236 196C256 170 300 160 330 176C330 140 360 116 392 116C424 116 454 140 454 176C484 160 528 170 548 196C570 224 562 264 536 282C530 260 522 242 508 226C486 200 450 196 420 218C410 246 410 290 410 334Z"/>
      <path d="M608 212C592 236 574 256 574 282A34 34 0 0 0 642 282C642 256 624 236 608 212Z"/>
      <path d="${c.d}"/>
      <path d="M174 250C158 274 140 294 140 318A34 34 0 0 0 208 318C208 294 190 274 174 250Z"/>
      ${linea(`M${P(r1[0])}C260 690 520 720 ${P(r1[1])}`, 14)}
      ${linea(`M${P(r2[0])}C240 750 440 770 560 764`, 12)}
      <ellipse cx="590" cy="770" rx="100" ry="56" transform="rotate(55 590 770)"/>
      ${ojo(222, 486)}
      ${ojo(342, 486)}
      ${cachete(182, 576)}
      ${cachete(384, 576)}
      ${linea('M250 578Q282 614 314 578')}
      ${burbuja(110, 180, 42)}
      ${burbuja(170, 92, 38)}
      ${burbuja(660, 150, 38)}
    </g>`);
  }

  /* ---------- Pulpo ---------- */
  {
    const esp = (pts) => pts.map(([x, y]) => [1000 - x, y]);
    // Tentáculo: contorno suave (sin facetas) alrededor de un recorrido con ancho que baja de a poco y
    // punta redonda (medio círculo de 8 pasos). La raíz queda escondida debajo de la cabeza.
    const tentaculo = (ctrl, anchos) => {
      const t = tira(ctrl, anchos, 8), n = t.eje.length, e = t.eje[n - 1], i = t.izq[n - 1];
      const a0 = Math.atan2(i[1] - e[1], i[0] - e[0]), h = t.w(n - 1) / 2;
      const punta = [];
      for (let q = 1; q < 8; q++) punta.push([e[0] + h * Math.cos(a0 - (q * Math.PI) / 8), e[1] + h * Math.sin(a0 - (q * Math.PI) / 8)]);
      return { t, punta };
    };
    const contornoTentaculo = ({ t, punta }) =>
      suaveL(simplificar(parejo([...t.izq, ...punta, ...t.der.slice().reverse(), t.izq[0]], 6).slice(0, -1), 1), true);
    // Rulo de la punta: puntos de un arco de radio r que sigue a `p` con rumbo `rumbo` (grados),
    // girando `giro` grados (positivo = sentido horario en pantalla), en pasos de 45°.
    const rulo = (p, rumbo, r, giro) => {
      const s = Math.sign(giro), c = local(p, rumbo, 0, s * r), out = [];
      for (let g = 45; g <= Math.abs(giro); g += 45) {
        const a = (rumbo - s * 90 + s * g) * RAD;
        out.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]);
      }
      return out;
    };
    // Ventosa a una fracción f del recorrido (radio ~1/4 del ancho local).
    const ventosa = (t, f, s = 1) => {
      const j = Math.round(f * (t.eje.length - 1)), [x, y] = t.eje[j], r = Math.max(30, R(t.w(j) * 0.24));
      return circulo(s < 0 ? 1000 - R(x) : R(x), R(y), r, 10);
    };
    // Tentáculos de cada costado, de atrás hacia adelante: [puntos, anchos, ventosas]. Salen en
    // abanico (arriba, al costado y en diagonal) con ángulos bien distintos, así los contornos
    // vecinos se separan enseguida y no quedan cuñas finitas entre ellos. Todas las puntas se enroscan
    // siguiendo un arco de radio 46–50 (más cerrado, el borde de adentro del rulo se quiebra).
    const lados = [
      [[[330, 340], [240, 386], [160, 402], [102, 360], [94, 296], [128, 252], [184, 242]],
        [112, 106, 94, 80, 66, 54, 48], [0.3]],
      [[[340, 460], [260, 526], [192, 568], [140, 592], ...rulo([140, 592], 155, 46, 180)],
        [124, 118, 100, 80, 60, 50, 44, 40], [0.3]],
      [[[362, 490], [298, 596], [244, 690], [192, 770], [166, 820], ...rulo([166, 820], 117, 50, 180)],
        [120, 114, 102, 88, 70, 56, 48, 44, 40], [0.27]],
    ];
    let tent = '';
    for (const [pts, anchos, vs] of lados) {
      for (const q of [pts, esp(pts)]) {
        const tt = tentaculo(q, anchos);
        tent += `<path d="${contornoTentaculo(tt)}"/>`;
        for (const f of vs) tent += ventosa(tt.t, f);
      }
    }
    // Par del medio: una sola forma simétrica (los dos tentáculos unidos arriba) que se abre en V
    // hacia abajo, con las puntas enroscadas hacia afuera; una raya al medio los separa.
    const med = [[470, 480], [464, 600], [442, 700], [414, 780], [396, 840], ...rulo([396, 840], 107, 46, 180)];
    const mt = tentaculo(med, [106, 100, 92, 80, 66, 54, 46, 42, 40]), m = mt.t;
    // Borde de adentro (der) desde la punta hacia arriba, hasta cruzar el eje x = 500.
    const adentro = [];
    for (const p of m.der.slice().reverse()) {
      if (p[0] >= 500) {
        const a = adentro[adentro.length - 1];
        adentro.push([500, a[1] + ((p[1] - a[1]) * (500 - a[0])) / (p[0] - a[0])]);
        break;
      }
      adentro.push(p);
    }
    const cruce = adentro[adentro.length - 1];
    const mitad = simplificar(parejo([...m.izq, ...mt.punta, ...adentro], 6), 1);
    const medio = suaveL(mitad) + suaveL(esp(mitad).reverse()).replace(/^M[^C]*/, '') + 'Z';
    const mv = (() => {
      return ventosa(m, 0.24) + ventosa(m, 0.24, -1);
    })();
    add('pulpo', 'Pulpo', `
      ${tent}
      <path d="${medio}"/>
      ${linea(`M500 ${R(cruce[1]) + 8}L500 520`)}
      ${mv}
      <path d="M262 470C200 300 290 80 500 80C710 80 800 300 738 470C720 600 280 600 262 470Z"/>
      <ellipse cx="392" cy="190" rx="46" ry="38" stroke-width="12"/>
      <ellipse cx="616" cy="166" rx="36" ry="30" stroke-width="12"/>
      ${ojo(420, 352, 32, 40)}
      ${ojo(580, 352, 32, 40)}
      ${cachete(356, 432, 40, 30)}
      ${cachete(644, 432, 40, 30)}
      ${linea('M456 430Q500 476 544 430')}
      ${burbuja(872, 146, 38)}
      ${burbuja(786, 92, 38)}
      ${burbuja(124, 130, 38)}
    `);
  }

  /* ---------- Tiburón ---------- */
  {
    const c = contorno([66, 470], [
      [[72, 356], [250, 282], [440, 282]], // 0 cabeza
      [[620, 282], [760, 360], [842, 436]], // 1 lomo
      [[858, 452], [864, 482], [850, 502]], // 2 fin redondeado del cuerpo (tapa la raíz de la cola)
      [[770, 588], [620, 668], [440, 676]], // 3 panza
      [[260, 686], [58, 660], [66, 470]], // 4 mentón y hocico
    ]);
    // Boca sonriente con dientitos (tan chiquitos que quedan blancos). La línea de la panza
    // va del hocico a la boca y de la boca a la cola.
    const b0 = [156, 528], bc = [244, 562], b1 = [332, 528];
    const eb = (t) => [0, 1].map((i) => (1 - t) * (1 - t) * b0[i] + 2 * t * (1 - t) * bc[i] + t * t * b1[i]);
    const diente = (t) => {
      const a = eb(t - 0.1), b = eb(t + 0.1), m = eb(t);
      return `<path d="M${P(a)}L${R(m[0])} ${R(m[1]) + 32}L${P(b)}Z" stroke-width="10"/>`;
    };
    // Cola en medialuna, dibujada ANTES que el cuerpo: la raíz queda escondida adentro del pedúnculo
    // y el extremo redondeado del cuerpo la tapa (sin cortes rectos). Lóbulos anchos con punta redonda.
    const cola = 'M760 420C804 380 850 300 890 218C906 184 950 186 954 222C958 320 940 410 906 476' +
      'C940 540 960 604 960 662C958 702 918 712 900 684C868 628 820 580 760 548Z';
    add('tiburon', 'Tiburón', `<g transform="translate(-12 66)">
      <path d="${cola}"/>
      <path d="M396 318C446 250 478 182 516 124C534 104 562 110 564 136C570 210 602 282 664 330Z"/>
      <path d="M380 600C400 690 450 750 530 770C540 700 520 640 490 600Z"/>
      <path d="M556 612C576 680 618 718 672 726C676 676 662 632 640 600Z"/>
      <path d="${c.d}"/>
      ${linea(`M${P(c.en(4, 0.86))}Q110 540 ${P(b0)}`, 14)}
      ${linea(`M${P(b1)}C460 592 620 580 ${P(c.en(3, 0.4))}`, 14)}
      <path d="M${P(b0)}Q${P(bc)} ${P(b1)}C326 600 290 630 240 630C190 630 160 600 ${P(b0)}Z"/>
      ${diente(0.28)}${diente(0.5)}${diente(0.72)}
      ${linea('M496 396Q520 452 496 508')}
      ${linea('M542 396Q566 452 542 508')}
      ${linea('M588 396Q612 452 588 508')}
      ${ojo(196, 402)}
      ${ojo(316, 394)}
      ${cachete(160, 472, 40, 30)}
      ${cachete(372, 462, 40, 30)}
      ${burbuja(120, 170, 40)}
      ${burbuja(208, 92, 38)}
      ${burbuja(760, 186, 38)}
    </g>`);
  }

  /* ---------- Cangrejo ---------- */
  {
    const tubo = (d, w) =>
      `<path d="${d}" fill="none" stroke-width="${w + 32}"/>` +
      `<path d="${d}" fill="none" stroke="#fff" stroke-width="${w}"/>`;
    const patas = (s) => {
      const f = (x) => (s < 0 ? 1000 - x : x);
      const pata = (pts) => `<path d="${brazo(muestrear(pts.map(([x, y]) => [f(x), y]), 3), 72, 50).d}"/>`;
      return pata([[320, 560], [200, 536], [118, 572], [84, 646]]) +
        pata([[320, 650], [204, 668], [144, 728], [128, 800]]) +
        pata([[370, 730], [290, 790], [256, 850], [258, 906]]);
    };
    const pinza = (s) => {
      const f = (x) => (s < 0 ? 1000 - x : x);
      // Las puntas del dedo y del pulgar se redondean con una curva corta (radio ~15).
      return `<path d="${brazo(muestrear([[f(330), 570], [f(230), 500], [f(200), 440], [f(185), 360]], 3), 76, 64).d}"/>` +
        `<path d="M${f(185)} 380C${f(120)} 388 ${f(60)} 290 ${f(88)} 210C${f(110)} 145 ${f(170)} 110 ${f(224)} 114` +
        `C${f(244)} 116 ${f(246)} 138 ${f(232)} 150C${f(204)} 172 ${f(184)} 206 ${f(192)} 236` +
        `C${f(222)} 202 ${f(256)} 180 ${f(280)} 182C${f(300)} 184 ${f(306)} 196 ${f(306)} 214` +
        `C${f(304)} 290 ${f(250)} 372 ${f(185)} 380Z"/>`;
    };
    // Pedúnculo del ojo: tubo de 46 u de ancho (una zona de un dedo).
    const ojoPalito = (x) =>
      tubo(`M${x} 460L${x - (x < 500 ? 10 : -10)} 300`, 46);
    add('cangrejo', 'Cangrejo', `
      ${patas(1)}${patas(-1)}
      ${pinza(1)}${pinza(-1)}
      ${ojoPalito(416)}${ojoPalito(584)}
      <ellipse cx="500" cy="600" rx="290" ry="190"/>
      ${circulo(402, 244, 76)}
      ${circulo(598, 244, 76)}
      ${ojo(402, 250, 26, 32)}
      ${ojo(598, 250, 26, 32)}
      ${cachete(386, 606)}
      ${cachete(614, 606)}
      ${linea('M440 616Q500 676 560 616')}
      ${circulo(330, 700, 32)}
      ${circulo(478, 748, 30)}
      ${circulo(652, 712, 36)}
    `);
  }

  /* ---------- Estrella de mar ---------- */
  {
    // Cinco brazos con punta redonda (arco de círculo) unidos por curvas cóncavas que pasan
    // cerca de los valles; las curvas salen tangentes a los arcos, así el contorno queda suave.
    const cx = 500, cy = 530, Re = 446, rt = 76, Rv = 196, a0 = -96;
    const pt = (r, a) => [cx + r * Math.cos(a * RAD), cy + r * Math.sin(a * RAD)];
    // Ángulo (radianes) del punto de tangencia desde V al círculo (C, r): de los dos, el más
    // cercano a la punta del brazo (ángulo `eje`) yendo en sentido horario (s = 1) o antihorario (s = -1).
    const TAU = Math.PI * 2;
    const mod = (x) => ((x % TAU) + TAU) % TAU;
    function tangente(C, r, V, eje, s) {
      const dx = V[0] - C[0], dy = V[1] - C[1];
      const th = Math.acos(r / Math.hypot(dx, dy)), b = Math.atan2(dy, dx);
      const e = eje * RAD;
      return [b + th, b - th].sort((g, h) => mod(s * (g - e)) - mod(s * (h - e)))[0];
    }
    const enC = (C, g) => [C[0] + rt * Math.cos(g), C[1] + rt * Math.sin(g)];
    const brazos = [0, 1, 2, 3, 4].map((i) => a0 + i * 72);
    const C = brazos.map((a) => pt(Re - rt, a));
    let desde = tangente(C[0], rt, pt(Rv, a0 - 36), a0, -1);
    let d = `M${P(enC(C[0], desde))}`;
    for (let i = 0; i < 5; i++) {
      const a = brazos[i], j = (i + 1) % 5, b = brazos[j];
      const V = pt(Rv, a + 36);
      const sale = tangente(C[i], rt, V, a, 1);
      const entra = tangente(C[j], rt, V, b, -1);
      const grande = mod(sale - desde) > Math.PI ? 1 : 0;
      d += `A${rt} ${rt} 0 ${grande} 1 ${P(enC(C[i], sale))}Q${P(V)} ${P(enC(C[j], entra))}`;
      desde = entra;
    }
    d += 'Z';
    // Manchas: la de adentro corrida del eje del brazo (alternando el lado) y con tamaños que
    // varían un poco, para que no parezcan agujeros troquelados.
    let puntos = '';
    brazos.forEach((a, i) => {
      const p1 = pt(250, a + (i % 2 ? -8 : 8)), p2 = pt(364, a);
      puntos += circulo(R(p1[0]), R(p1[1]), 30 + (i % 3) * 3) + circulo(R(p2[0]), R(p2[1]), 38 - (i % 2) * 4);
    });
    add('estrella-de-mar', 'Estrella de mar', `
      <path d="${d}"/>
      ${puntos}
      ${ojo(430, 480, 40, 50)}
      ${ojo(570, 480, 40, 50)}
      ${cachete(368, 566, 46, 31)}
      ${cachete(632, 566, 46, 31)}
      ${linea('M446 560Q500 618 554 560')}
      ${burbuja(836, 150, 40)}
      ${burbuja(906, 86, 38)}
    `);
  }

  /* ---------- Caballito de mar ---------- */
  {
    // Silueta en S de un solo contorno (mira a la izquierda): cabeza inclinada hacia adelante con
    // hocico de trompeta, nuca que baja en curva hasta el lomo, panza abultada adelante y cuerpo que
    // se afina sin cortes hasta la cola, que se enrolla hacia adelante, debajo de la panza.
    // Cola: eje con ancho que baja de a poco y termina en espiral (izq = borde de adentro).
    const C = [540, 844], FIN = 225;
    const eje = [], anchos = [];
    for (let a = 0; a <= FIN; a += 22.5) {
      const r = 88 - a * 0.12;
      eje.push([C[0] + r * Math.cos(a * RAD), C[1] + r * Math.sin(a * RAD)]);
      anchos.push(72 - a * 0.13);
    }
    const t = tira(eje, anchos, 3);
    // Borde de adelante: garganta, cuello, pecho y panza, que se afina hasta la raíz de la cola.
    const frente = [[476, 336], [466, 384], [438, 436], [408, 492], [394, 552], [400, 610], [426, 660],
      [466, 696], [515, 722], [552, 748], [576, 784], [588, 816]];
    // Espalda (de la cola para arriba) en una curva convexa pareja, nuca, coronilla, frente y
    // hocico de trompeta que termina en una puntita ovalada, apenas más ancha que el tubo.
    const cabeza = [[676, 784], [712, 704], [742, 620], [756, 540], [754, 460], [744, 390], [746, 320], [756, 252],
      [742, 176], [692, 122], [615, 100], [540, 116], [490, 160], [468, 210],
      [400, 240], [344, 260], [300, 254], [266, 280], [264, 326], [290, 350],
      [334, 338], [405, 316], [462, 294]];
    // El borde de adentro de la cola tiene muestras muy juntas (radio chico) y, pegadas a los puntos
    // espaciados de la panza, hacían un escalón en la unión: se usa una de cada tres (más la última),
    // así todos los puntos quedan a distancias parecidas y la curva entra en la cola sin quiebres.
    const orilla = [...frente, ...t.izq.filter((p, j) => j === 1 || (j >= 4 && (j - 1) % 3 === 0) || j === t.izq.length - 1)];
    const silueta = suave([...orilla, ...t.punta, ...t.der.slice().reverse(), ...cabeza], true);
    // Borde de adelante muestreado sobre la misma curva que dibuja suave() (10 muestras por tramo):
    // borde(i) da el punto en el índice fraccionario i de `frente` y normal(i) la dirección hacia
    // adentro, en perpendicular al borde.
    const K = 10, fino = muestrear(frente, K);
    const borde = (i) => fino[Math.round(i * K)];
    const normal = (i) => {
      const j = Math.round(i * K), a = fino[j - 4], b = fino[j + 4], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      return [(b[1] - a[1]) / l, -(b[0] - a[0]) / l];
    };
    // Panza en placas: una banda pegada al borde de adelante. El borde de adentro es el mismo borde de
    // adelante corrido DX a la derecha (una paralela exacta se cerraría en abanico, porque la panza es
    // muy curva), así las rayas son horizontales y las placas quedan parejas. Arriba la banda termina
    // con un corte en ángulo recto contra el contorno; abajo, con una raya horizontal más.
    const I0 = 1.9, I1 = 6.2, DX = 96;
    const dentro = (i) => { const p = borde(i); return [p[0] + DX, p[1]]; };
    // Índice del borde de adentro donde lo cruza la perpendicular que sale de borde(i).
    const cruzaEn = (i) => {
      const p = borde(i), n = normal(i);
      const lado = (u) => { const c = dentro(u); return (c[0] - p[0]) * n[1] - (c[1] - p[1]) * n[0]; };
      let a = Math.max(0, i - 2.5), b = Math.min(frente.length - 1, i + 2.5);
      for (let k = 0; k < 30; k++) { const m = (a + b) / 2; if (Math.sign(lado(m)) === Math.sign(lado(a))) a = m; else b = m; }
      return (a + b) / 2;
    };
    const S0 = cruzaEn(I0), S1 = I1;
    const interior = [];
    for (let k = 0; k <= 8; k++) interior.push(dentro(S0 + ((S1 - S0) * k) / 8));
    const banda = linea(`M${P(borde(I0))}L${suave(interior).slice(1)}L${P(borde(I1))}`);
    // Rayas horizontales repartidas parejo en altura (índices de `frente` entre S0 y S1).
    const rayas = [3.55, 4.85].map((i) => linea(`M${P(borde(i))}L${P(dentro(i))}`)).join('');
    // Aleta del lomo en abanico (atrás del cuerpo): borde de afuera con 3 festones y 2 varillas que
    // salen del mismo punto de la base (escondido detrás del cuerpo) y terminan en los valles.
    const O = [724, 570], RA = 140;
    const enA = (a, r = RA) => [O[0] + r * Math.cos(a * RAD), O[1] + r * Math.sin(a * RAD)];
    const cortes = [-56, -18.7, 18.7, 56];
    let aleta = `M${P(O)}L${P(enA(cortes[0]))}`;
    for (let k = 0; k < 3; k++) aleta += `Q${P(enA((cortes[k] + cortes[k + 1]) / 2, RA + 40))} ${P(enA(cortes[k + 1]))}`;
    aleta += 'Z';
    const varillas = linea(`M${P(O)}L${P(enA(cortes[1]))}`) + linea(`M${P(O)}L${P(enA(cortes[2]))}`);
    // Cresta: tres púas tipo aletita (base ancha, punta redonda) en la coronilla y la nuca,
    // inclinadas hacia atrás como una crin.
    const pua = (o, ang, L) => {
      const q = (u, v) => P(local(o, ang, u, v));
      return `<path d="M${q(-14, -42)}C${q(36, -42)} ${q(L - 36, -32)} ${q(L - 12, -18)}C${q(L + 2, -8)} ${q(L + 2, 8)} ` +
        `${q(L - 12, 18)}C${q(L - 36, 32)} ${q(36, 42)} ${q(-14, 42)}Z"/>`;
    };
    add('caballito-de-mar', 'Caballito de mar', `<g>
      <path d="${aleta}"/>
      ${varillas}
      ${pua([662, 112], -48, 84)}${pua([726, 168], -22, 92)}${pua([752, 240], 4, 86)}
      <path d="${silueta}"/>
      ${banda}
      ${rayas}
      ${ojo(560, 232, 34, 42)}
      ${cachete(600, 326, 40, 30)}
      ${linea('M282 304Q294 316 310 312')}
      ${burbuja(180, 170, 44)}
      ${burbuja(280, 92, 38)}
      ${burbuja(200, 560, 38)}
    </g>`);
  }

  /* ---------- Delfín ---------- */
  {
    // Gota de agua (punta arriba, panza redonda de radio r), girada `ang` grados alrededor de su centro.
    const gota = (x, y, r, ang = 0) => {
      const q = (u, v) => P(local([x, y], ang - 90, u, v));
      return `<path d="M${q(r * 2.1, 0)}C${q(r * 1.3, r * 0.5)} ${q(r * 0.9, r)} ${q(0, r)}` +
        `A${r} ${r} 0 0 1 ${q(0, -r)}C${q(r * 0.9, -r)} ${q(r * 1.3, -r * 0.5)} ${q(r * 2.1, 0)}Z" stroke-width="12"/>`;
    };
    // Lomo curvo: sale de la punta del hocico con rumbo r0 (grados, hacia la cola) y gira `giro(u)` grados
    // por unidad. doblar()([u, v]) = punto a distancia u sobre el lomo, corrido v hacia el lado del lomo.
    const doblar = (r0, giro, L = 1000, paso = 4) => {
      const pts = [[0, 0]], rum = [r0 * RAD];
      for (let u = 0; u < L; u += paso) {
        const a0 = rum[rum.length - 1], a1 = a0 + giro(u + paso / 2) * RAD * paso, am = (a0 + a1) / 2;
        const p = pts[pts.length - 1];
        pts.push([p[0] + paso * Math.cos(am), p[1] + paso * Math.sin(am)]);
        rum.push(a1);
      }
      return ([u, v]) => {
        const i = Math.max(0, Math.min(pts.length - 2, Math.floor(u / paso))), f = u / paso - i;
        const a = rum[i] + (rum[i + 1] - rum[i]) * f;
        const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f;
        return [x + v * Math.sin(a), y - v * Math.cos(a)];
      };
    };
    const delfin = ({ S = 0.92, r0 = -10, T = 60, T2 = 0, U1 = 520, UC = 740, top = 64, cx0 = 500 } = {}) => {
      // Arco parejo (T grados) hasta U1 y otro (T2) hasta el pedúnculo UC; de ahí en adelante, derecho.
      const giro = (u) => (u < U1 * S ? T / (U1 * S) : u < UC * S ? T2 / ((UC - U1) * S) : 0);
      const base = doblar(r0, giro);
      let D = [0, 0];
      const curva = ([u, v]) => { const p = base([u * S, v * S]); return [p[0] + D[0], p[1] + D[1]]; };
      const cur = (pts) => pts.map(curva);
      const lomo = [[52, 52], [96, 56], [124, 64], [142, 90], [168, 140], [212, 180], [272, 200], [340, 200],
        [430, 184], [520, 152], [605, 110], [680, 72], [735, 50], [780, 42]];
      const panza = [[780, -42], [735, -50], [680, -76], [600, -118], [515, -152], [425, -172], [340, -174],
        [266, -162], [206, -134], [160, -98], [134, -66], [96, -54], [52, -52]];
      const punta = [[15, -37], [0, 0], [15, 37]];
      const sil = [...lomo, [800, 0], ...panza, ...punta];
      const lobulo = [[752, 36], [790, 58], [830, 86], [866, 114], [894, 136], [916, 144], [930, 128], [924, 104],
        [902, 74], [882, 42]];
      const colaP = [...lobulo, [868, 0], ...lobulo.slice().reverse().map(([u, v]) => [u, -v]), [690, 0]];
      // Aletas rígidas: se dibujan en un sistema local pegado al lomo en el punto (u, v), con `a` a lo largo
      // del cuerpo (hacia la cola) y `b` hacia el lado del lomo; así la curva del cuerpo no las deforma.
      const rigido = (u, v, pts) => {
        const o = curva([u, v]), f = curva([u + 10, v]), l = Math.hypot(f[0] - o[0], f[1] - o[1]);
        const t = [(f[0] - o[0]) / l, (f[1] - o[1]) / l], n = [t[1], -t[0]];
        return pts.map(([a, b]) => [o[0] + (a * t[0] + b * n[0]) * S, o[1] + (a * t[1] + b * n[1]) * S]);
      };
      const dorsalL = [[-90, -40], [-70, 40], [-30, 108], [24, 156], [74, 178], [100, 170], [104, 146], [86, 108],
        [74, 64], [70, 20], [72, -40]];
      // Aleta del costado (atrás del cuerpo): asoma debajo de la panza con la punta hacia atrás.
      const pectL = [[-40, 20], [-34, -40], [-12, -92], [26, -134], [72, -162], [106, -172], [124, -160], [120, -128],
        [102, -86], [80, -40], [70, 20]];
      let dorsalP = [], pectP = [];
      const aletas = () => { dorsalP = rigido(470, 150, dorsalL); pectP = rigido(300, -120, pectL); };
      aletas();
      const todos = [...cur([...sil, ...colaP]), ...dorsalP, ...pectP];
      const xs = todos.map((p) => p[0]), ys = todos.map((p) => p[1]);
      D = [cx0 - (Math.min(...xs) + Math.max(...xs)) / 2, top - Math.min(...ys)];
      aletas();
      const cuerpo = suave(cur(sil), true);
      const rayaPanza = suave(cur([[160, -98], [210, -80], [300, -76], [400, -82], [500, -80], [590, -64], [680, -76]]));
      const dorsal = suave(dorsalP, true);
      const cola = suave(cur(colaP), true);
      const pectoral = suave(pectP, true);
      const [ex, ey] = curva([262, 82]);
      const [kx, ky] = curva([318, 0]);
      const boca = suave(cur([[58, -6], [120, -8], [180, -14], [226, -8], [248, 14]]));
      // Mar: franja de agua con el borde de arriba ondulado (empieza y termina en una cresta) y puntas
      // redondas; una raya ondulada adentro la divide en agua clara (arriba) y agua honda (abajo).
      const onda = (x0, x1, y, amp, n, fase = 0) => {
        const pts = [];
        for (let k = 0; k <= n * 8; k++) pts.push([x0 + ((x1 - x0) * k) / (n * 8), y - amp * Math.cos((k * Math.PI) / 4 + fase)]);
        return pts;
      };
      const yA = 794, yM = 872;
      const mar = suave(onda(110, 890, yA, 24, 4)) + `C926 ${yA - 24} 952 ${yM - 50} 952 ${yM}` +
        `C952 ${yM + 44} 920 944 860 944H140C80 944 48 ${yM + 44} 48 ${yM}C48 ${yM - 50} 74 ${yA - 24} 110 ${yA - 24}Z`;
      const hondo = linea(`M48 ${yM}` + suave(onda(100, 900, yM, 16, 4, Math.PI)).replace(/^M[^C]*/, `L100 ${yM + 16}`) + `L952 ${yM}`, 14);
      return `
        <path d="${mar}"/>${hondo}
        <path d="${cola}"/>
        <path d="${dorsal}"/>
        <path d="${pectoral}"/>
        <path d="${cuerpo}"/>
        ${linea(rayaPanza)}
        ${linea(boca)}
        ${ojo(R(ex), R(ey), 34, 42)}
        ${cachete(R(kx), R(ky), 40, 30)}
        ${gota(652, 708, 28, -32)}${gota(728, 684, 30, 0)}${gota(804, 708, 28, 32)}${gota(118, 560, 28, -10)}${gota(196, 668, 26, 12)}`;
    };
    add('delfin', 'Delfín', delfin({ r0: -10, T: 56, T2: -40, U1: 480, S: 0.96, top: 60 }));
  }

  /* ---------- Piezas para los dibujos nuevos ---------- */

  // Cinta cerrada con punta redonda (tentáculos, brazos de anémona): contorno suave alrededor de un
  // recorrido `ctrl` con ancho `anchos[i]` en cada punto de control (como los tentáculos del pulpo).
  const cinta = (ctrl, anchos) => {
    const t = tira(ctrl, anchos, 8), n = t.eje.length, e = t.eje[n - 1], i = t.izq[n - 1];
    const a0 = Math.atan2(i[1] - e[1], i[0] - e[0]), h = t.w(n - 1) / 2, punta = [];
    for (let q = 1; q < 8; q++) punta.push([e[0] + h * Math.cos(a0 - (q * Math.PI) / 8), e[1] + h * Math.sin(a0 - (q * Math.PI) / 8)]);
    return suaveL(simplificar(parejo([...t.izq, ...punta, ...t.der.slice().reverse(), t.izq[0]], 6).slice(0, -1), 1), true);
  };

  /* ---------- Medusa ---------- */
  {
    // Tentáculos ondulados (atrás del sombrero): cinta que baja ondulando, se abre hacia afuera y se
    // afina de a poco. Todos ondulan igual (como mecidos por la misma corriente), así no se tocan.
    const tentaculo = (x0, largo, abre) => {
      const ctrl = [], anchos = [], n = 8;
      for (let k = 0; k <= n; k++) {
        const f = k / n;
        ctrl.push([x0 + abre * f * f + 34 * Math.sin((f * largo) / 75 - 0.5), 390 + largo * f]);
        anchos.push(74 - 18 * f);
      }
      return `<path d="${cinta(ctrl, anchos)}"/>`;
    };
    // Sombrero: cúpula con el borde de abajo en festones; una raya separa la pollerita de festones.
    const L = 188, Rr = 812, yb = 456, nf = 6, paso = (Rr - L) / nf;
    const lado = [[L, yb], [L - 12, 250], [320, 82], [500, 82]];
    let borde = '';
    for (let k = 0; k < nf; k++) {
      const x1 = Rr - k * paso, x0 = x1 - paso;
      borde += `C${R(x1 - 4)} ${yb + 54} ${R(x0 + 4)} ${yb + 54} ${R(x0)} ${yb}`;
    }
    const sombrero = `M${L} ${yb}C${L - 12} 250 320 82 500 82C680 82 ${Rr + 12} 250 ${Rr} ${yb}${borde}Z`;
    // Punto del costado izquierdo de la cúpula a la altura y (el derecho es su espejo).
    const enY = (y) => {
      let a = 0, b = 0.5;
      for (let k = 0; k < 30; k++) { const m = (a + b) / 2; if (bz(...lado, m)[1] > y) a = m; else b = m; }
      return bz(...lado, a);
    };
    const [bx, by] = enY(384);
    const faja = linea(`M${P([bx, by])}C${R(bx + 110)} ${R(by + 36)} ${R(1000 - bx - 110)} ${R(by + 36)} ${P([1000 - bx, by])}`, 12);
    add('medusa', 'Medusa', `
      ${tentaculo(292, 400, -70)}${tentaculo(396, 480, -30)}${tentaculo(500, 530, 0)}${tentaculo(604, 480, 30)}${tentaculo(708, 400, 70)}
      <path d="${sombrero}"/>
      ${faja}
      ${circulo(366, 186, 34)}${circulo(500, 150, 32)}${circulo(634, 186, 34)}
      ${ojo(418, 284, 32, 40)}
      ${ojo(582, 284, 32, 40)}
      ${cachete(350, 346, 40, 30)}
      ${cachete(650, 346, 40, 30)}
      ${linea('M460 340Q500 382 540 340')}
      ${burbuja(110, 160, 42)}${burbuja(190, 76, 32)}${burbuja(880, 250, 38)}
    `);
  }

  /* ---------- Foca ---------- */
  {
    // De perfil mirando a la derecha: acostada sobre un témpano, con el pecho levantado y la cabeza
    // inclinada hacia arriba, haciendo equilibrio con una pelota a franjas en la nariz.
    const estrella = (cx, cy, r, rot = 0) => {
      let d = '';
      for (let k = 0; k < 10; k++) {
        const a = (-90 + rot + k * 36) * RAD, q = k % 2 ? r * 0.5 : r;
        d += (k ? 'L' : 'M') + P([cx + q * Math.cos(a), cy + q * Math.sin(a)]);
      }
      return `<path d="${d}Z" stroke-width="14"/>`;
    };
    const foca = ({ H = [490, 486], am = -52, K = 1.12, mej = [30, -24], tipo = 0 } = {}) => {
      // Cabeza: `cara(u, v)` con u hacia la punta del hocico y v hacia la frente (escala K).
      const cara = (u, v) => local(H, am, u * K, -v * K);
      const nuca = [[-112, 98], [-68, 128], [-18, 142], [34, 138], [80, 118], [118, 92],
        [152, 72], [184, 52], [204, 22], [204, -14], [192, -48], [168, -80], [134, -104], [96, -124], [56, -146],
        [20, -166]].map(([u, v]) => cara(u, v));
      const cuerpo = suave([...nuca, [684, 640], [702, 704], [680, 758], [600, 784], [440, 788], [280, 786],
        [180, 776], [132, 752], [148, 722], [210, 696], [262, 662], [298, 612], [314, 560]], true);
      const cola = suave([[200, 716], [162, 680], [116, 644], [84, 614], [76, 586], [98, 576], [140, 600],
        [180, 630], [176, 580], [184, 538], [206, 528], [226, 552], [240, 618], [258, 694], [262, 740]], true);
      const aleta = suave([[600, 698], [660, 712], [716, 734], [762, 758], [772, 784], [742, 796], [666, 792],
        [600, 776], [570, 746]], true);
      const nariz = cara(194, 6);
      const B = [nariz[0] - 4, nariz[1] - 102], rb = 96;
      const gajo = (k) => linea(`M${R(B[0])} ${R(B[1] - rb + 24)}C${R(B[0] + k)} ${R(B[1] - rb + 50)} ${R(B[0] + k)} ${R(B[1] + rb - 40)} ${R(B[0])} ${R(B[1] + rb)}`, 12);
      const bigote = (u, v, a, l) => { const p0 = cara(u, v), d = local(p0, a, l, 0); return linea(`M${P(p0)}L${P(d)}`, 10); };
      const [ox, oy] = cara(64, 60), [kx, ky] = cara(...mej);
      const boca = [cara(184, -34), cara(150, -46), cara(118, -40), cara(104, -26)];
      let rostro;
      const sonrisa = linea(`M${P(cara(178, -34))}C${P(cara(160, -48))} ${P(cara(128, -48))} ${P(cara(116, -24))}`);
      if (tipo === 0) rostro = `${ojo(R(ox), R(oy), 34, 42)}${sonrisa}`;
      else if (tipo === 1) {
        const [k1, k2] = cara(90, -58);
        rostro = `${ojo(R(ox), R(oy), 34, 42)}${cachete(R(k1), R(k2), 36, 27)}${sonrisa}`;
      } else if (tipo === 2) {
        const [k1, k2] = cara(8, -2);
        rostro = `${ojo(R(ox), R(oy), 34, 42)}<ellipse cx="${R(k1)}" cy="${R(k2)}" rx="38" ry="28" transform="rotate(${am} ${R(k1)} ${R(k2)})" stroke-width="12"/>${sonrisa}`;
      } else {
        const [k1, k2] = cara(-6, 12);
        rostro = `${ojo(R(ox), R(oy), 34, 42)}${cachete(R(k1), R(k2), 36, 27)}${sonrisa}`;
      }
      // Témpano flotando: cara de arriba (clara), frente partido en bloques y agua con olitas adelante.
      const hielo = 'M104 796C92 760 140 738 206 736H794C860 738 908 760 896 796L878 896H122Z';
      const tapa = linea('M106 804C230 832 770 832 894 804', 12);
      const grietas = linea('M330 826L316 900') + linea('M660 826L676 900');
      const onda = (x0, x1, y, amp, n) => {
        const pts = [];
        for (let k = 0; k <= n * 8; k++) pts.push([x0 + ((x1 - x0) * k) / (n * 8), y - amp * Math.cos((k * Math.PI) / 4)]);
        return pts;
      };
      const agua = suave(onda(110, 890, 884, 14, 5)) + 'C930 870 952 896 952 916C952 942 924 954 880 954H120C76 954 48 942 48 916C48 896 70 870 110 870Z';
      return `
        <path d="${hielo}"/>
        ${tapa}${grietas}
        <path d="${agua}"/>
        <path d="${cola}"/>
        <circle cx="${R(B[0])}" cy="${R(B[1])}" r="${rb}"/>
        ${gajo(-44)}${gajo(44)}
        ${circulo(R(B[0]), R(B[1] - rb + 14), 28)}
        <path d="${cuerpo}"/>
        <path d="${aleta}"/>
        <ellipse cx="${R(nariz[0])}" cy="${R(nariz[1])}" rx="28" ry="20" transform="rotate(${am} ${R(nariz[0])} ${R(nariz[1])})" fill="#000"/>
        ${bigote(184, -52, -24, 100)}${bigote(173, -66, 6, 104)}${bigote(159, -82, 36, 94)}
        ${rostro}
        ${estrella(160, 200, 64, -10)}${estrella(336, 112, 60, 12)}${estrella(872, 236, 62, 8)}`;
    };
    add('foca', 'Foca', foca());
    add('foca-b', 'Foca B', foca({ tipo: 1 }));
    add('foca-c', 'Foca C', foca({ tipo: 2 }));
    add('foca-d', 'Foca D', foca({ tipo: 3 }));
    add('foca-e', 'Foca E', foca({ tipo: 2 }));
  }

  /* ---------- Pez payaso ---------- */
  {
    // Pez payaso mirando a la izquierda, delante de una anémona. Cuerpo ovalado con tres franjas anchas:
    // detrás del ojo, en el medio y en el pedúnculo (que asoma detrás del óvalo, antes de la cola).
    const C = [450, 370], rx = 262, ry = 190;
    const enY = (x, s) => C[1] + s * ry * Math.sqrt(Math.max(0, 1 - ((x - C[0]) / rx) ** 2));
    // Raya de franja: curva de arriba a abajo del cuerpo, panzona hacia la cabeza (termina justo en el contorno).
    const raya = (x, panza) => {
      const y0 = enY(x, -1), y1 = enY(x, 1);
      return linea(`M${R(x)} ${R(y0)}C${R(x - panza)} ${R(y0 + (y1 - y0) * 0.3)} ${R(x - panza)} ${R(y0 + (y1 - y0) * 0.7)} ${R(x)} ${R(y1)}`, 14);
    };
    // Anémona: tentáculos gordos y ondulados que salen en abanico desde el centro del pie.
    const O = [500, 930];
    const tentaculo = (ang, largo, onda) => {
      const ctrl = [], anchos = [], n = 7;
      for (let k = 0; k <= n; k++) {
        const f = k / n, a = (ang + onda * Math.sin(f * Math.PI * 1.6)) * RAD, r = 120 + largo * f;
        ctrl.push([O[0] + r * Math.sin(a), O[1] - r * Math.cos(a)]);
        anchos.push(78 - 20 * f);
      }
      return `<path d="${cinta(ctrl, anchos)}"/>`;
    };
    const anemona = [[-72, 300, 8], [72, 300, -8], [-48, 400, 7], [48, 400, -7], [-24, 470, 6], [24, 470, -6], [0, 500, 6]]
      .map(([a, l, o]) => tentaculo(a, l, o)).join('');
    const pie = 'M290 944C270 870 330 800 420 790C470 784 530 784 580 790C670 800 730 870 710 944Z';
    const cola = 'M700 370C760 290 860 236 906 270C944 306 944 434 906 470C860 504 760 450 700 370Z';
    const pedunculo = 'M640 300C680 296 716 300 736 316C754 340 754 400 736 424C716 440 680 444 640 440Z';
    const dorsal1 = 'M300 214C300 136 380 100 440 124C476 140 490 168 488 190Z';
    const dorsal2 = 'M470 186C500 120 590 116 640 160C668 186 670 220 660 240Z';
    const ventral = 'M300 520C300 590 350 624 396 606C412 590 410 560 400 540Z';
    const anal = 'M540 540C546 604 610 626 646 596C660 578 652 546 630 520Z';
    const pectoral = 'M420 450C450 420 510 424 530 456C546 486 526 516 490 516C456 514 426 490 420 450Z';
    add('pez-payaso', 'Pez payaso', `
      ${anemona}
      <path d="${pie}"/>
      <path d="${cola}"/>
      <path d="${pedunculo}"/>
      <path d="${dorsal1}"/><path d="${dorsal2}"/>
      <path d="${ventral}"/><path d="${anal}"/>
      <ellipse cx="${C[0]}" cy="${C[1]}" rx="${rx}" ry="${ry}"/>
      ${raya(346, 34)}${raya(410, 34)}${raya(546, 30)}${raya(610, 28)}
      <path d="${pectoral}"/>
      ${ojo(262, 318, 38, 46)}
      ${cachete(262, 420, 40, 30)}
      ${linea('M196 404Q210 430 236 424')}
      ${burbuja(110, 190, 40)}${burbuja(170, 96, 34)}${burbuja(880, 130, 38)}
    `);
  }
})(window.CL);
