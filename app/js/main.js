/* Colorinche — arranque: protecciones contra zoom/scroll accidental, datos persistentes y navegación. */
'use strict';
(function (CL) {
  // Nada de zoom accidental de la página (pellizco, doble toque, Ctrl+rueda, Ctrl +/-).
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('gesturechange', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('touchmove', (e) => { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
  window.addEventListener('wheel', (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '0'].includes(e.key)) e.preventDefault();
  });
  // Sin menú de "guardar imagen" al mantener apretado sobre dibujos y botones.
  document.addEventListener('contextmenu', (e) => {
    if (e.target.closest && e.target.closest('canvas, img, svg, button, .no-gestures')) e.preventDefault();
  });

  // Alto real del viewport (barras del navegador en celulares).
  const setVh = () => document.documentElement.style.setProperty('--vh', window.innerHeight * 0.01 + 'px');
  setVh();
  window.addEventListener('resize', setVh);

  // Que el navegador no borre las obras si falta espacio.
  CL.db.persist();

  CL.router.start();

  // App instalable y sin internet (sólo cuando se sirve por http/https).
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch((e) => console.warn('Service worker:', e));
    });
  }
})(window.CL);
