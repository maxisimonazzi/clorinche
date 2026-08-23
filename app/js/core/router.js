/* Colorinche — navegación por hash (#inicio, #dibujos/granja, #colorear/vaca, ...).
   Funciona con el botón "atrás" de Android y al recargar la página.

   Registrar una pantalla:
     CL.router.register('nombre', {
       mount(root, args) { ... },   // root = <section class="screen screen--nombre">; args = partes del hash
       unmount() { ... },           // limpiar listeners/animaciones; puede devolver una promesa (guardar)
       flush() { ... },             // opcional: guardar YA (la app se va a segundo plano)
     });
   Navegar: CL.router.go('colorear/vaca'), CL.router.replace('inicio'), CL.router.back() */
'use strict';
(function (CL) {
  const screens = Object.create(null);
  let current = null; // { name, args, screen, root }
  let busy = Promise.resolve();
  let depth = 0; // navegaciones internas, para saber si "atrás" sale de la app
  const events = CL.util.emitter();
  const DEFAULT = 'inicio';

  function parse(hash) {
    const h = decodeURIComponent((hash || '').replace(/^#\/?/, ''));
    const parts = h.split('/').filter(Boolean);
    const name = parts[0] && screens[parts[0]] ? parts[0] : DEFAULT;
    return { name, args: parts[0] && screens[parts[0]] ? parts.slice(1) : [] };
  }

  async function show(route) {
    const app = document.getElementById('app');
    if (current) {
      const prev = current;
      current = null;
      try { await (prev.screen.unmount && prev.screen.unmount()); } catch (e) { console.error(e); }
      prev.root.remove();
    }
    const screen = screens[route.name];
    if (!screen) { console.error('Pantalla no registrada:', route.name); return; }
    const root = CL.util.el('section.screen.screen--' + route.name);
    app.append(root);
    current = { name: route.name, args: route.args, screen, root };
    document.body.dataset.screen = route.name;
    try {
      await screen.mount(root, route.args);
    } catch (e) {
      console.error('Error al abrir', route.name, e);
    }
    events.emit('change', { name: route.name, args: route.args });
  }

  let shownKey = null;
  function onHash() {
    const route = parse(location.hash);
    const key = route.name + '/' + route.args.join('/');
    if (key === shownKey) return;
    shownKey = key;
    busy = busy.then(() => show(route));
  }

  const router = {
    events,
    register(name, screen) { screens[name] = screen; },
    get current() { return current ? { name: current.name, args: current.args } : null; },

    start() {
      depth = (history.state && history.state.d) || 0;
      window.addEventListener('popstate', () => {
        depth = (history.state && history.state.d) || 0;
        onHash();
      });
      window.addEventListener('hashchange', onHash);
      onHash();
    },

    go(path) {
      if (location.hash === '#' + path) return;
      depth++;
      try { history.pushState({ d: depth }, '', '#' + path); } catch (e) { location.hash = path; return; }
      onHash();
    },

    replace(path) {
      try { history.replaceState({ d: depth }, '', '#' + path); } catch (e) { location.replace('#' + path); return; }
      onHash();
    },

    back() {
      if (depth > 0) history.back(); else router.replace(DEFAULT);
    },

    /** Guarda lo pendiente de la pantalla actual (al pasar a segundo plano). */
    flush() {
      if (current && current.screen.flush) {
        try { return current.screen.flush(); } catch (e) { console.error(e); }
      }
      return null;
    },
  };

  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') router.flush(); });
  window.addEventListener('pagehide', () => router.flush());

  CL.router = router;
})(window.CL);
