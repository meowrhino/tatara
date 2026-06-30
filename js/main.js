/* ============================================================
   TAT ARA — arranque (entry point)
   Carga la config, expone la paleta como custom properties, construye el
   menú y cablea los listeners globales. Es el único <script> del HTML
   (type="module"); el resto de módulos se importan desde aquí.
   ============================================================ */

import { CONFIG_URL, SITE, setSite, setLang } from './state.js';
import { $, esc } from './utils.js';
import { loadJSON } from './data.js';
import { buildMenu, openMenu, closeMenu, isMenuOpen } from './menu.js';
import { closeModal } from './modal.js';
import { renderRoute } from './router.js';
import { relayoutAgenda } from './agenda.js';

async function init() {
  try {
    setSite(await loadJSON(CONFIG_URL));
  } catch (err) {
    $('#view').innerHTML = `<p class="loading">no s'ha pogut carregar la configuració<br><small>${esc(err.message)}</small></p>`;
    return;
  }
  setLang(SITE.defaultLang || 'ca');
  if (SITE.site && SITE.site.studio) $('#bar-studio').textContent = SITE.site.studio;

  // expone la paleta de data.json como custom properties --color-<clau>, por si el CSS necesita usarla
  Object.entries(SITE.palette || {}).forEach(([key, hex]) =>
    document.documentElement.style.setProperty(`--color-${key}`, hex));

  buildMenu();

  $('#open-menu').addEventListener('click', openMenu);
  $('#close-menu').addEventListener('click', closeMenu);
  document.querySelectorAll('[data-close]').forEach((x) => x.addEventListener('click', closeModal));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (!$('#modal').hidden) closeModal(); else if (isMenuOpen()) closeMenu(); }
  });

  // Al redimensionar, los top de los O.R. (calculados en px a partir de dvh)
  // se descuadran: recolocamos la agenda si es la sección visible.
  let resizeRAF = null;
  window.addEventListener('resize', () => {
    const view = $('#view');
    if (view.dataset.section !== 'agenda') return;
    if (resizeRAF) cancelAnimationFrame(resizeRAF);
    resizeRAF = requestAnimationFrame(() => relayoutAgenda(view));
  });

  window.addEventListener('hashchange', renderRoute);
  if (!location.hash) location.replace('#' + SITE.sections[0].id);
  renderRoute();
}

document.addEventListener('DOMContentLoaded', init);
