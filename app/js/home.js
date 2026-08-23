/* Colorinche — pantalla de inicio (provisoria: la reemplaza el módulo de inicio definitivo). */
'use strict';
(function (CL) {
  const el = CL.util.el;
  CL.router.register('inicio', {
    mount(root) {
      const links = [['dibujos', 'photo'], ['pizarra', 'modePizarra'], ['subir', 'camera'], ['obras', 'gallery']];
      root.append(el('div.topbar', null, [el('h1', null, 'Colorinche'), el('div.spacer'), CL.ui.muteButton()]));
      root.append(el('div', { style: { display: 'flex', gap: '20px', padding: '20px' } },
        links.map(([to, icon]) => CL.ui.button({ icon, label: to, cls: 'btn-lg', onTap: () => CL.router.go(to) }))));
    },
    unmount() {},
  });
})(window.CL);
