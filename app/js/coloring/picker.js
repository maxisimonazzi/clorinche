/* Colorinche — catálogo de dibujos para colorear (#dibujos y #dibujos/<categoria>).

   - Lista de categorías: tarjetas grandes con la portada coloreada al azar por el motor real.
   - Dentro de una categoría: grilla de dibujos (SVG de líneas como <img>); si un dibujo tiene
     progreso se ve SU miniatura coloreada con una insignia de lápiz.
   - "Mis dibujos" (mis): "+" para subir una imagen y las imágenes subidas, cada una con un botón
     de mantener apretado para quitarla. */
'use strict';
(function (CL) {
  const U = CL.util;
  const el = U.el;

  // Portadas coloreadas: se calculan una vez por sesión (canvas en memoria).
  const covers = new Map();
  let coverJob = null;

  function coverFor(cat) {
    if (cat.id === 'mis') return null;
    const list = CL.drawings.list(cat.id);
    if (!list.length) return null;
    return CL.drawings.get(cat.cover) ? cat.cover : list[0].id;
  }

  /** Dibuja (o calcula en segundo plano) las portadas coloreadas pendientes. */
  function renderCovers(targets, isAlive) {
    const run = async () => {
      for (const { id, canvas } of targets) {
        if (!isAlive()) return;
        if (!covers.has(id)) {
          try {
            // Fondo en un tono pastel de la categoría; el resto de las zonas, de colores al azar.
            const cat = CL.drawings.category(CL.drawings.get(id).cat);
            const bg = cat ? U.mix(cat.color, '#ffffff', 0.55) : null;
            covers.set(id, await CL.coloring.renderRandom(id, 360, { res: 720, bg }));
          } catch (e) { covers.set(id, null); }
          await U.nextFrame();
        }
        const c = covers.get(id);
        if (c && isAlive()) paintCanvas(canvas, c);
      }
    };
    coverJob = (coverJob || Promise.resolve()).then(run, run);
    return coverJob;
  }
  function paintCanvas(canvas, src) {
    canvas.width = src.width; canvas.height = src.height;
    canvas.getContext('2d').drawImage(src, 0, 0);
    canvas.classList.add('dj-ready');
  }

  /* ---------- volver sin apilar historial ----------
     CL.ui.backButton(path) siempre agrega una entrada (go). Si la pantalla anterior del historial ya es
     `path`, conviene volver con history.back(): si no, el "atrás" del sistema (Android) reabre la pantalla
     que se acaba de dejar. Se anota qué ruta se mostró en cada profundidad del historial del router. */
  const shownAt = [];
  const histDepth = () => (history.state && history.state.d) || 0;
  CL.router.events.on('change', ({ name, args }) => {
    shownAt[histDepth()] = [name, ...(args || [])].join('/');
  });
  function backTo(path) {
    const d = histDepth();
    if (d > 0 && shownAt[d - 1] === path) CL.router.back();
    else CL.router.go(path);
  }
  function backButton(path) {
    return CL.ui.button({ icon: 'back', label: 'Volver', cls: 'btn-back', onTap: () => backTo(path) });
  }
  CL.coloring = Object.assign(CL.coloring || {}, { backTo, backButton });

  let current = null;

  CL.router.register('dibujos', {
    async mount(root, args) {
      const cat = args[0] && CL.drawings.category(args[0]) ? args[0] : null;
      const scr = current = createScreen(root, cat);
      await scr.render();
    },
    unmount() {
      const scr = current;
      current = null;
      if (scr) scr.destroy();
    },
  });

  function createScreen(root, catId) {
    let alive = true;
    const urls = [];
    const url = (blob) => { const u = URL.createObjectURL(blob); urls.push(u); return u; };
    const svgUrl = (id) => url(new Blob([CL.drawings.svg(id)], { type: 'image/svg+xml;charset=utf-8' }));
    const cat = catId ? CL.drawings.category(catId) : null;

    /* ---------- barra superior ---------- */
    const bar = el('div.topbar.dj-bar');
    bar.append(backButton(cat ? 'dibujos' : 'inicio'));
    if (cat) {
      // Tira de categorías para saltar rápido.
      const strip = el('div.dj-strip.scroll-x', { role: 'tablist' });
      const chipTargets = [];
      for (const c of CL.drawings.categories) {
        const chip = el('button.dj-chip', {
          type: 'button', role: 'tab', 'aria-label': c.name, title: c.name, 'aria-selected': String(c.id === cat.id),
          style: { background: c.color },
        });
        if (c.id === cat.id) chip.classList.add('active');
        const cid = coverFor(c);
        if (c.id === 'mis') chip.append(CL.icon('photo'));
        else if (cid && covers.get(cid)) { const cv = el('canvas'); paintCanvas(cv, covers.get(cid)); chip.append(cv); }
        else if (cid) {
          const img = el('img', { src: svgUrl(cid), alt: '', draggable: 'false' });
          const cv = el('canvas');
          chipTargets.push({ id: cid, canvas: cv, img });
          chip.append(img);
        }
        else chip.append(CL.icon('star'));
        chip.addEventListener('click', () => {
          if (c.id === cat.id) return;
          CL.sound.play('select', { pitch: 0.9 + Math.random() * 0.3 });
          CL.router.replace('dibujos/' + c.id);
        });
        strip.append(chip);
      }
      bar.append(strip);
      // Las portadas que falten se colorean en segundo plano y reemplazan al dibujo de líneas.
      renderCovers(chipTargets, () => alive).then(() => {
        for (const c of chipTargets) if (alive && c.canvas.classList.contains('dj-ready')) c.img.replaceWith(c.canvas);
      });
      requestAnimationFrame(() => {
        const a = strip.querySelector('.active');
        if (a && alive) strip.scrollLeft = a.offsetLeft - strip.clientWidth / 2 + a.offsetWidth / 2;
      });
    } else {
      bar.append(el('div.spacer'));
    }
    bar.append(CL.ui.muteButton());

    const grid = el('div.dj-grid');
    const scroll = el('div.dj-scroll.scroll-y', null, grid);
    root.append(bar, scroll);
    if (cat) root.style.setProperty('--c', cat.color);

    /* ---------- lista de categorías ---------- */
    async function renderCategories() {
      const progress = await progressMap();
      const uploads = await CL.db.uploads.list().catch(() => []);
      if (!alive) return;
      const targets = [];
      CL.drawings.categories.forEach((c, i) => {
        const card = el('button.dj-cat', { type: 'button', 'aria-label': c.name });
        card.style.setProperty('--c', c.color);
        card.style.setProperty('--i', i);
        const box = el('div.dj-cover');
        if (c.id === 'mis') {
          if (uploads.length && uploads[0].thumb) box.append(el('img', { src: url(uploads[0].thumb), alt: '', draggable: 'false' }));
          else box.append(CL.icon('photo'));
        } else {
          const cid = coverFor(c);
          if (cid) {
            const cv = el('canvas');
            if (covers.get(cid)) paintCanvas(cv, covers.get(cid));
            else { box.append(el('img', { src: svgUrl(cid), alt: '', draggable: 'false', class: 'dj-ph' })); targets.push({ id: cid, canvas: cv }); }
            box.append(cv);
          } else box.append(CL.icon('star'));
        }
        const n = c.id === 'mis' ? uploads.length : CL.drawings.list(c.id).length;
        const inProgress = c.id === 'mis'
          ? uploads.some((u) => progress.has('u-' + u.id))
          : CL.drawings.list(c.id).some((d) => progress.has(d.id));
        card.append(box, el('div.dj-name', null, c.name));
        if (inProgress) card.append(el('span.dj-badge', { 'aria-hidden': 'true' }, CL.icon('pencilEdit')));
        else if (n) card.append(el('span.dj-count', { 'aria-hidden': 'true' }, String(n)));
        card.addEventListener('click', () => { CL.sound.play('open'); CL.router.go('dibujos/' + c.id); });
        grid.append(card);
      });
      // Cuando la portada coloreada está lista, reemplaza a la de líneas.
      renderCovers(targets, () => alive).then(() => {
        if (!alive) return;
        grid.querySelectorAll('.dj-cover canvas.dj-ready').forEach((cv) => {
          const ph = cv.parentNode.querySelector('.dj-ph');
          if (ph) ph.remove();
        });
      });
      // Si todavía no está lista, se ve el dibujo de líneas; el canvas va encima al terminar.
    }

    /** Mapa source -> obra en progreso más reciente (una sola consulta). */
    async function progressMap() {
      const m = new Map();
      // Si se acaba de salir de un dibujo, su guardado puede seguir en segundo plano: se espera para mostrar
      // la miniatura al día (con ruedita sólo si tarda, p. ej. en una tablet lenta).
      const wait = CL.coloring.whenSaved ? CL.coloring.whenSaved() : null;
      if (wait) {
        let stop = null;
        const tm = setTimeout(() => { if (alive) stop = CL.ui.spinner(scroll); }, 150);
        await wait;
        clearTimeout(tm);
        if (stop) stop();
      }
      try {
        // Lo que haya quedado anotado de emergencia pasa primero a la base (miniaturas al día).
        await CL.coloring.pending.recover();
        const list = await CL.db.works.list({ status: 'progress', kind: 'colorear' });
        for (const w of list) if (!m.has(w.source)) m.set(w.source, w);
      } catch (e) { /* sin base de datos */ }
      return m;
    }

    function itemCard(i, label, onOpen) {
      const b = el('button.dj-item', { type: 'button', 'aria-label': label, title: label });
      b.style.setProperty('--i', i);
      b.addEventListener('click', () => {
        CL.sound.play('open');
        onOpen();
      });
      return b;
    }

    /* ---------- dibujos de una categoría ---------- */
    async function renderCategory() {
      const progress = await progressMap();
      if (!alive) return;
      if (cat.id === 'mis') return renderMine(progress);
      const list = CL.drawings.list(cat.id);
      list.forEach((d, i) => {
        const card = itemCard(i, d.name, () => CL.router.go('colorear/' + d.id));
        const w = progress.get(d.id);
        if (w && w.thumb) {
          card.classList.add('dj-progress');
          card.append(el('img', { src: url(w.thumb), alt: '', draggable: 'false' }),
            el('span.dj-badge', { 'aria-hidden': 'true' }, CL.icon('pencilEdit')));
        } else {
          card.append(el('img', { src: svgUrl(d.id), alt: '', draggable: 'false', loading: 'lazy' }));
        }
        grid.append(card);
      });
      if (!list.length) grid.append(el('div.dj-empty', { 'aria-hidden': 'true' }, CL.icon('star')));
    }

    async function renderMine(progress) {
      const add = itemCard(0, 'Subir una foto o un dibujo', () => CL.router.go('subir'));
      add.classList.add('dj-add');
      add.append(el('span.dj-add-plus', null, CL.icon('plus')), el('span.dj-add-cam', null, CL.icon('camera')));
      grid.append(add);
      const ups = await CL.db.uploads.list().catch(() => []);
      if (!alive) return;
      if (!ups.length) {
        // Estado vacío: una manito que señala el "+".
        grid.append(el('div.dj-empty', { 'aria-hidden': 'true' }, [el('span.dj-hand', null, CL.icon('hand')), CL.icon('photo')]));
        return;
      }
      ups.forEach((u, i) => {
        const card = itemCard(i + 1, 'Mi dibujo', () => CL.router.go('colorear/u-' + u.id));
        const w = progress.get('u-' + u.id);
        const thumb = w && w.thumb ? w.thumb : u.thumb || u.blob;
        if (w && w.thumb) card.classList.add('dj-progress');
        card.append(el('img', { src: url(thumb), alt: '', draggable: 'false' }));
        if (w && w.thumb) card.append(el('span.dj-badge', { 'aria-hidden': 'true' }, CL.icon('pencilEdit')));
        const del = CL.ui.holdButton({
          label: 'Mantené apretado para quitar esta imagen',
          cls: 'btn-sm dj-del',
          onConfirm: async () => {
            cell.classList.add('dj-out');
            try {
              // Que no quede un guardado en curso de esta imagen (recrearía su progreso después de borrarlo).
              if (CL.coloring.whenSaved) await CL.coloring.whenSaved();
              await CL.db.uploads.remove(u.id);
            } catch (e) { console.warn('No se pudo quitar la imagen', e); }
            setTimeout(() => {
              cell.remove();
              if (alive && !grid.querySelector('.dj-cell')) {
                grid.append(el('div.dj-empty', { 'aria-hidden': 'true' }, [el('span.dj-hand', null, CL.icon('hand')), CL.icon('photo')]));
              }
            }, 320);
          },
        });
        // Tarjeta y botón de quitar van lado a lado (un botón no puede ir dentro de otro).
        const cell = el('div.dj-cell', null, [card, del]);
        cell.style.setProperty('--i', i + 1);
        grid.append(cell);
      });
    }

    return {
      async render() {
        if (cat) await renderCategory(); else await renderCategories();
      },
      destroy() {
        alive = false;
        // Libera las URLs de las miniaturas después de que la pantalla salió.
        setTimeout(() => urls.forEach((u) => URL.revokeObjectURL(u)), 400);
      },
    };
  }
})(window.CL);
