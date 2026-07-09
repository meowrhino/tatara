/* ============================================================
   TAT ARA — menú y selector de idioma
   Overlay que se despliega desde abajo. Construye su lista a partir de
   SITE.sections y los botones de idioma a partir de SITE.languages.
   ============================================================ */

import { $, esc, t, captureFocus } from './utils.js';
import { SITE, LANG, setLang } from './state.js';
import { renderRoute } from './router.js';
import { updateCartBadge } from './cart.js';

export const isMenuOpen = () => $('#menu').classList.contains('is-open');

let restoreMenuFocus = null;   // devuelve el foco a quien abrió el menú al cerrarlo

export function openMenu() {
  restoreMenuFocus = captureFocus();
  $('#menu').classList.add('is-open');
  $('#menu').setAttribute('aria-hidden', 'false');
  $('#open-menu').setAttribute('aria-expanded', 'true');
  document.body.classList.add('no-scroll');
  $('#close-menu').focus();
}

export function closeMenu() {
  $('#menu').classList.remove('is-open');
  $('#menu').setAttribute('aria-hidden', 'true');
  $('#open-menu').setAttribute('aria-expanded', 'false');
  if ($('#modal').hidden) document.body.classList.remove('no-scroll');
  if (restoreMenuFocus) { restoreMenuFocus(); restoreMenuFocus = null; }
}

export function buildMenu() {
  const list = $('#menu-list');
  list.innerHTML = SITE.sections.filter((s) => !s.hidden).map((s) =>
    `<li><a href="#${s.id}" data-id="${s.id}">${esc(t(s.label))}</a></li>`).join('');
  list.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => closeMenu()));
  updateCartBadge();

  const langs = $('#menu-langs');
  langs.innerHTML = (SITE.languages || ['ca']).map((l) => {
    const lbl = l === 'ca' ? 'cat' : l;
    return `<button type="button" data-lang="${l}"${l === LANG ? ' class="is-active"' : ''}>${lbl}</button>`;
  }).join('');
  langs.querySelectorAll('button').forEach((b) =>
    b.addEventListener('click', () => changeLang(b.dataset.lang)));
}

// Cambia el idioma activo y re-renderiza: menú (etiquetas + estado activo) y la
// sección actual. renderRoute ya llama a syncActive al terminar.
function changeLang(lang) {
  setLang(lang);
  document.documentElement.lang = lang;
  buildMenu();
  renderRoute();
}
