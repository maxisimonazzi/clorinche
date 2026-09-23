// Colorinche — variantes del ícono a partir de app/icons/icon.svg.
// El SVG base tiene <rect id="bg" ... rx="..."> (fondo) y <g id="motif" ...> (dibujo).
//  - any:      tal cual (cuadrado redondeado con esquinas transparentes).
//  - maskable: fondo a sangre (sin esquinas) y motivo achicado para entrar en la zona segura
//              (círculo de radio 40 % del lado, centrado).
//  - apple:    fondo a sangre sin transparencia (iOS redondea las esquinas solo), motivo un poco achicado.

export const MASKABLE_SCALE = 0.74;
export const APPLE_SCALE = 0.9;

function bleed(svg) {
  const out = svg.replace(/(<rect id="bg"[^>]*?)\s+rx="[^"]*"/, '$1');
  if (out === svg) throw new Error('icon.svg: no encuentro <rect id="bg" rx="...">');
  return out;
}

function scaleMotif(svg, s) {
  const out = svg.replace(/<g id="motif"/, `<g id="motif" transform="translate(256 256) scale(${s}) translate(-256 -256)"`);
  if (out === svg) throw new Error('icon.svg: no encuentro <g id="motif">');
  return out;
}

export function variants(svg) {
  return {
    any: svg,
    maskable: scaleMotif(bleed(svg), MASKABLE_SCALE),
    apple: scaleMotif(bleed(svg), APPLE_SCALE),
  };
}
