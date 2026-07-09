/* ============================================================
   TAT ARA — arranque (entry point)
   Carga la config, expone la paleta como custom properties, construye el
   menú y cablea los listeners globales. Es el único <script> del HTML
   (type="module"); el resto de módulos se importan desde aquí.
   ============================================================ */

import { CONFIG_URL, SITE, setSite, setLang, storedLang } from './state.js';
import { $, esc, ui } from './utils.js';
import { loadJSON } from './data.js';
import { buildMenu, openMenu, closeMenu, isMenuOpen } from './menu.js';
import { closeModal } from './modal.js';
import { renderRoute } from './router.js';

async function init() {
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

  // La marca "TAT" del header lleva a la primera sección (home).
  $('#brand-home').setAttribute('href', '#' + SITE.sections[0].id);

  // expone la paleta de data.json como custom properties --color-<clau>, por si el CSS necesita usarla
  Object.entries(SITE.palette || {}).forEach(([key, hex]) =>
    document.documentElement.style.setProperty(`--color-${key}`, hex));

  buildMenu();

  $('#open-menu').addEventListener('click', openMenu);
  $('#bar-section').addEventListener('click', openMenu);   // la categoría del footer también abre el menú
  $('#close-menu').addEventListener('click', closeMenu);
  document.querySelectorAll('[data-close]').forEach((x) => x.addEventListener('click', closeModal));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (!$('#modal').hidden) closeModal(); else if (isMenuOpen()) closeMenu(); }
  });

  window.addEventListener('hashchange', renderRoute);
  if (!location.hash) location.replace('#' + SITE.sections[0].id);
  renderRoute();
}

document.addEventListener('DOMContentLoaded', init);
