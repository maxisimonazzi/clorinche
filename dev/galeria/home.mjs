// Inicio: capturas en todos los tamaños, sin scroll, sin superposiciones y navegación de las tarjetas.
// Uso: cd dev && node galeria/home.mjs [tamaño...]
import { launch, appUrl, shot, SIZES } from '../lib.mjs';

const sizes = process.argv.slice(2).length ? process.argv.slice(2) : ['desktop', 'tablet', 'tabletV', 'phone', 'phoneH', 'phoneSmall'];
const report = {};
for (const size of sizes) {
  const t = await launch({ size });
  const { page } = t;
  await page.goto(appUrl('inicio'));
  await page.waitForTimeout(1300);
  await shot(page, `galeria/home-${size}`);
  const info = await page.evaluate(() => {
    const vw = innerWidth, vh = innerHeight;
    const r = (e) => { const b = e.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), r: Math.round(b.right), b: Math.round(b.bottom) }; };
    const cards = [...document.querySelectorAll('.home-card')].map(r);
    const minis = [...document.querySelectorAll('.home-mini')].map(r);
    const title = r(document.querySelector('.home-title'));
    const mute = r(document.querySelector('.btn-mute'));
    const out = cards.some((c) => c.x < 0 || c.y < 0 || c.r > vw || c.b > vh);
    const overlapTitle = title.r > mute.x && title.b > mute.y && title.y < mute.b;
    const overlapHeader = cards.some((c) => c.y < title.b);
    const scroll = document.scrollingElement.scrollHeight > vh || document.querySelector('.screen').scrollHeight > document.querySelector('.screen').clientHeight;
    return { vw, vh, cards, minis, title, mute, out, overlapTitle, overlapHeader, scroll };
  });
  report[size] = info;
  if (size === sizes[0]) {
    // Navegación: cada tarjeta cambia el hash
    const nav = {};
    for (const [i, to] of ['dibujos', 'pizarra', 'subir', 'obras'].entries()) {
      await page.goto(appUrl('inicio'));
      await page.waitForTimeout(700);
      await page.locator('.home-card').nth(i).click();
      await page.waitForTimeout(300);
      nav[to] = await page.evaluate(() => location.hash);
    }
    await page.goto(appUrl('inicio'));
    await page.waitForTimeout(700);
    await page.locator('.home-mini').nth(0).click();
    await page.waitForTimeout(200);
    nav.neon = await page.evaluate(() => location.hash);
    await page.goto(appUrl('inicio'));
    await page.waitForTimeout(700);
    await page.locator('.home-mini').nth(1).click();
    await page.waitForTimeout(200);
    nav.fuegos = await page.evaluate(() => location.hash);
    // Botón de sonido
    await page.goto(appUrl('inicio'));
    await page.waitForTimeout(700);
    const m0 = await page.evaluate(() => CL.sound.isMuted());
    await page.locator('.btn-mute').click();
    const m1 = await page.evaluate(() => CL.sound.isMuted());
    await page.locator('.btn-mute').click();
    nav.mute = [m0, m1, await page.evaluate(() => CL.sound.isMuted())];
    // Ícono ausente: no debe quedar una imagen rota
    nav.iconShown = await page.evaluate(() => !!document.querySelector('.home-icon'));
    report.nav = nav;
  }
  report[size].errors = t.errors.filter((e) => !/icons\/.*(png|svg)|ERR_FILE_NOT_FOUND/.test(e));
  report[size].ignored = t.errors.length - report[size].errors.length;
  await t.close();
}
for (const [k, v] of Object.entries(report)) {
  if (k === 'nav') { console.log('nav', JSON.stringify(v)); continue; }
  console.log(k, JSON.stringify({ out: v.out, overlapTitle: v.overlapTitle, overlapHeader: v.overlapHeader, scroll: v.scroll, card0: v.cards[0], card3: v.cards[3], title: v.title, minis: v.minis[0], errors: v.errors, ignored: v.ignored }));
}
