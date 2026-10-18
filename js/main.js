/* ============================================================
   TAT ARA — arranque (entry point)
   Carga la config, expone los colores como custom properties, construye el
   menú y cablea los listeners globales. Es el único <script> del HTML
   (type="module"); el resto de módulos se importan desde aquí.
   ============================================================ */

import { CONFIG_URL, SITE, setSite, setLang, storedLang, langOfPath, pathInLang } from './state.js';
import { $, esc, ui } from './utils.js';
import { loadJSON } from './data.js';
import { buildMenu, openMenu, closeMenu, isMenuOpen, openLangModal, closeLangModal, isLangModalOpen } from './menu.js';
import { closeModal, openLightbox } from './modal.js';
import { renderRoute, migrateHash } from './router.js';
import { runIntro } from './intro.js';

async function init() {
  runIntro();
  try {
    setSite(await loadJSON(CONFIG_URL));
    // El índice de secciones (menú + router): site.json → menu.
    SITE.sections = SITE.menu;
  } catch (err) {
    $('#view').innerHTML = `<p class="loading">${ui('configError')}<br><small>${esc(err.message)}</small></p>`;
    return;
  }
  // Idioma: el de la dirección (/es/…, /en/…). Una dirección sin prefijo es la
  // catalana, salvo que en una visita anterior se eligiera otro idioma: entonces
  // se pasa a la misma dirección en ese idioma, sin recargar.
  const langs = SITE.languages || ['ca'];
  const remembered = storedLang();
  const lang = langOfPath() || (langs.includes(remembered) ? remembered : (SITE.defaultLang || 'ca'));
  setLang(lang);
  document.documentElement.lang = lang;
  if (!langOfPath()) history.replaceState(null, '', pathInLang(lang) + location.search + location.hash);

  // Colores: TODOS viven en site.json → theme (fuente única), y se publican
  // como --<clau> (--bg, --ink…). Las claves con '_' (comentarios) se ignoran.
  const setVars = (obj, prefix) =>
    Object.entries(obj || {}).forEach(([key, hex]) => {
      if (key.startsWith('_') || typeof hex !== 'string') return;
      document.documentElement.style.setProperty(`--${prefix}${key}`, hex);
    });
  setVars(SITE.theme, '');

  buildMenu();

  $('#open-menu').addEventListener('click', openMenu);
  $('#bar-section').addEventListener('click', openMenu);   // la categoría del footer también abre el menú
  $('#close-menu').addEventListener('click', closeMenu);
  $('#lang-toggle').addEventListener('click', openLangModal);
  document.querySelectorAll('[data-close]').forEach((x) => x.addEventListener('click', closeModal));
  document.querySelectorAll('[data-lang-close]').forEach((x) => x.addEventListener('click', closeLangModal));
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!$('#modal').hidden) closeModal();
    else if (isLangModalOpen()) closeLangModal();
    else if (isMenuOpen()) closeMenu();
  });

  // Cualquier imagen ampliable (utils.zoomImg) abre el lightbox.
  document.addEventListener('click', (e) => {
    const z = e.target.closest('[data-zoom]');
    if (z) openLightbox(z.dataset.zoom, z.querySelector('img')?.alt);
  });

  // Enlaces internos sin recargar: se cambia la URL (pushState) y se pinta la
  // sección. Lo que no es una sección (la API, el panel, un PDF, otra web, o
  // un clic con Cmd/Ctrl para abrir en otra pestaña) navega como siempre.
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target || a.hasAttribute('download')) return;
    const url = new URL(a.href);
    if (url.origin !== location.origin || /^\/(api|admin|assets|data|fonts|css|js)\//.test(url.pathname)) return;
    e.preventDefault();
    if (url.href !== location.href) history.pushState(null, '', url.href);
    renderRoute();
  });
  window.addEventListener('popstate', renderRoute);

  migrateHash();
  renderRoute();
}

document.addEventListener('DOMContentLoaded', init);
