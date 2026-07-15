/* ============================================================
   TAT ARA — router
   Navegación por hash (#agenda, #botiga…). Resuelve la sección activa a
   partir de SITE.sections, carga su JSON y delega en el renderizador que
   toca, con un fundido entre vistas.
   ============================================================ */

import { $, esc, t, ui } from './utils.js';
import { SITE } from './state.js';
import { loadJSON } from './data.js';
import { renderAgenda, scrollAgendaToToday } from './agenda.js';
import { renderText, renderPeople, renderShop, renderContact, renderCart, renderNewsletter } from './sections.js';

// Id de sección del hash actual; cae a la primera sección si no es válido.
// El hash admite parámetros (#carret?gracies=1&session_id=…, la vuelta de Stripe):
// para resolver la sección solo cuenta lo anterior al '?'.
export function currentId() {
  const id = location.hash.replace(/^#/, '').split('?')[0];
  return SITE.sections.some((s) => s.id === id) ? id : SITE.sections[0].id;
}

// Parámetros del hash (la parte tras '?'), p. ej. la vuelta de Stripe.
export function hashQuery() {
  const q = location.hash.split('?')[1] || '';
  return new URLSearchParams(q);
}

// Marca el enlace activo en el menú.
export function syncActive() {
  const id = currentId();
  $('#menu-list').querySelectorAll('a').forEach((a) =>
    a.classList.toggle('is-active', a.dataset.id === id));
}

// Duración del fundido entre vistas. Fuente única: la custom property --fade del
// CSS (así JS y la transición CSS nunca se desincronizan).
const fadeMs = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fade')) || 180;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export async function renderRoute() {
  const id = currentId();
  const section = SITE.sections.find((s) => s.id === id);
  const view = $('#view');
  const animate = !!view.dataset.section && !reducedMotion();

  if (animate) {
    view.classList.add('view--fade');
    await wait(fadeMs());
  }

  view.dataset.section = id;
  const label = t(section.label);
  document.title = `${SITE.site.name} — ${label.charAt(0).toUpperCase()}${label.slice(1)}`;
  const sectionEl = $('#bar-section');
  if (sectionEl) sectionEl.textContent = label;   // "on ets" del footer

  try {
    const data = section.data ? await loadJSON(section.data) : null;
    view.innerHTML = '';
    switch (section.type) {
      case 'agenda':  renderAgenda(view, data); break;
      case 'text':    renderText(view, data); break;
      case 'people':  renderPeople(view, data); break;
      case 'shop':    renderShop(view, data); break;
      case 'contact': renderContact(view); break;
      case 'newsletter': renderNewsletter(view); break;
      case 'cart':    renderCart(view); break;
      default:        view.innerHTML = `<p class="loading">${ui('unknownSection')}</p>`;
    }
  } catch (err) {
    view.innerHTML = `<p class="loading">${ui('loadError')}<br><small>${esc(err.message)}</small></p>`;
    console.error(err);
  }

  window.scrollTo(0, 0);   // el scroll vive en el window; #view no tiene overflow
  syncActive();

  if (section.type === 'agenda') scrollAgendaToToday(view);

  if (animate) {
    void view.offsetWidth; // fuerza reflow para que el navegador registre opacity:0 antes de quitar la clase
    view.classList.remove('view--fade');
  }
}
