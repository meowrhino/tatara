/* ============================================================
   TAT ARA — menú y selector de idioma
   En escritorio el menú es la primera columna, siempre a la vista; en móvil,
   una capa que se abre con el botón "menú" (solo el CSS cambia). Construye
   su lista a partir de SITE.sections y los botones de idioma a partir de
   SITE.languages.
   ============================================================ */

import { $, esc, t, captureFocus } from './utils.js';
import { SITE, LANG, setLang, pathOf } from './state.js';
import { renderRoute } from './router.js';
import { updateCartBadge } from './cart.js';

export const isMenuOpen = () => $('#menu').classList.contains('is-open');

let restoreMenuFocus = null;   // devuelve el foco a quien abrió el menú al cerrarlo

// En escritorio el menú es una columna fija, no una capa: no hay nada que abrir
// (y bloquear el scroll del body dejaría la página congelada).
const menuIsColumn = () => window.matchMedia('(min-width: 720px)').matches;

export function openMenu() {
  if (menuIsColumn()) return;
  restoreMenuFocus = captureFocus();
  $('#menu').classList.add('is-open');
  $('#open-menu').setAttribute('aria-expanded', 'true');
  document.body.classList.add('no-scroll');
  $('#close-menu').focus();
}

export function closeMenu() {
  $('#menu').classList.remove('is-open');
  $('#open-menu').setAttribute('aria-expanded', 'false');
  if ($('#modal').hidden) document.body.classList.remove('no-scroll');
  if (restoreMenuFocus) { restoreMenuFocus(); restoreMenuFocus = null; }
}

const langLabel = (l) => ({ ca: 'cat', es: 'cast', en: 'eng' }[l] || l);

export function buildMenu() {
  const list = $('#menu-list');
  list.innerHTML = SITE.sections.filter((s) => !s.hidden).map((s) =>
    `<li><a href="${pathOf(s.id)}" data-id="${s.id}">${esc(t(s.label))}</a></li>`).join('');
  list.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => closeMenu()));
  updateCartBadge();
  buildLangs();
}

// Idioma en tres sitios: el botón del footer (solo el activo → abre modal), el
// modal (todas las opciones) y el selector dentro del menú (todas, abajo-izq).
function buildLangs() {
  const langs = SITE.languages || ['ca'];
  const toggle = $('#lang-toggle');
  if (toggle) toggle.textContent = langLabel(LANG);

  // Modal del footer (móvil): elegir cierra el modal.
  fillLangGroup($('#lang-list'), langs, (l) => { changeLang(l); closeLangModal(); });
  // Selector completo del footer (escritorio) y del menú: solo cambian idioma.
  fillLangGroup($('#footer-langs'), langs, (l) => changeLang(l));
  fillLangGroup($('#menu-langs'), langs, (l) => changeLang(l));
}

function fillLangGroup(el, langs, onPick) {
  if (!el) return;
  el.innerHTML = langs.map((l) =>
    `<button type="button" data-lang="${l}"${l === LANG ? ' class="is-active"' : ''}>${langLabel(l)}</button>`).join('');
  el.querySelectorAll('button').forEach((b) =>
    b.addEventListener('click', () => onPick(b.dataset.lang)));
}

export const isLangModalOpen = () => $('#lang-modal').classList.contains('is-open');

export function openLangModal() {
  $('#lang-modal').classList.add('is-open');
  $('#lang-modal').setAttribute('aria-hidden', 'false');
  $('#lang-toggle').setAttribute('aria-expanded', 'true');
  document.body.classList.add('no-scroll');
}

export function closeLangModal() {
  $('#lang-modal').classList.remove('is-open');
  $('#lang-modal').setAttribute('aria-hidden', 'true');
  $('#lang-toggle').setAttribute('aria-expanded', 'false');
  if ($('#modal').hidden && !isMenuOpen()) document.body.classList.remove('no-scroll');
}

// Cambia el idioma activo y re-renderiza: menú (etiquetas + estado activo) y la
// sección actual. renderRoute ya llama a syncActive al terminar.
function changeLang(lang) {
  setLang(lang);
  document.documentElement.lang = lang;
  buildMenu();
  renderRoute();
}
