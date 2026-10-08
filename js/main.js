/* ============================================================
   TAT ARA — arranque (entry point)
   Carga la config, expone los colores como custom properties, construye el
   menú y cablea los listeners globales. Es el único <script> del HTML
   (type="module"); el resto de módulos se importan desde aquí.
   ============================================================ */

import { CONFIG_URL, SITE, setSite, setLang, storedLang } from './state.js';
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
    // El índice de secciones (menú + router) vive en su propio JSON (JAMSTACK).
    SITE.sections = (await loadJSON('data/menu.json')).sections;
  } catch (err) {
    $('#view').innerHTML = `<p class="loading">${ui('configError')}<br><small>${esc(err.message)}</small></p>`;
    return;
  }
  // Idioma: el recordado de una visita anterior si sigue siendo válido, si no el
  // por defecto de la config.
  const langs = SITE.languages || ['ca'];
  const remembered = storedLang();
  const lang = langs.includes(remembered) ? remembered : (SITE.defaultLang || 'ca');
  setLang(lang);
  document.documentElement.lang = lang;

  // Colores: TODOS viven en data.json → theme (fuente única), y se publican
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
