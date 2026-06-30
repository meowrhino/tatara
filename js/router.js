/* ============================================================
   TAT ARA — router
   Navegación por hash (#agenda, #botiga…). Resuelve la sección activa a
   partir de SITE.sections, carga su JSON y delega en el renderizador que
   toca, con un fundido entre vistas.
   ============================================================ */

import { $, esc, t } from './utils.js';
import { SITE } from './state.js';
import { loadJSON } from './data.js';
import { renderAgenda, scrollAgendaToToday } from './agenda.js';
import { renderText, renderPeople, renderJournal, renderShop, renderContact, renderCart } from './sections.js';

// Id de sección del hash actual; cae a la primera sección si no es válido.
export function currentId() {
  const id = location.hash.replace(/^#/, '');
  return SITE.sections.some((s) => s.id === id) ? id : SITE.sections[0].id;
}

// Marca el enlace activo en el menú.
export function syncActive() {
  const id = currentId();
  $('#menu-list').querySelectorAll('a').forEach((a) =>
    a.classList.toggle('is-active', a.dataset.id === id));
}

const FADE_MS = 180;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export async function renderRoute() {
  const id = currentId();
  const section = SITE.sections.find((s) => s.id === id);
  const view = $('#view');
  const animate = !!view.dataset.section && !reducedMotion();

  if (animate) {
    view.classList.add('view--fade');
    await wait(FADE_MS);
  }

  view.dataset.section = id;
  view.classList.toggle('view--journal', section.type === 'journal');
  const label = t(section.label);
  document.title = `${SITE.site.name} — ${label.charAt(0).toUpperCase()}${label.slice(1)}`;

  try {
    const data = section.data ? await loadJSON(section.data) : null;
    view.innerHTML = '';
    switch (section.type) {
      case 'agenda':  renderAgenda(view, data); break;
      case 'text':    renderText(view, data); break;
      case 'people':  renderPeople(view, data); break;
      case 'journal': renderJournal(view, data); break;
      case 'shop':    renderShop(view, data); break;
      case 'contact': renderContact(view); break;
      case 'cart':    renderCart(view); break;
      default:        view.innerHTML = `<p class="loading">secció desconeguda</p>`;
    }
  } catch (err) {
    view.innerHTML = `<p class="loading">no s'ha pogut carregar<br><small>${esc(err.message)}</small></p>`;
    console.error(err);
  }

  view.scrollTop = 0;
  window.scrollTo(0, 0);
  syncActive();

  if (section.type === 'agenda') scrollAgendaToToday(view);

  if (animate) {
    void view.offsetWidth; // fuerza reflow para que el navegador registre opacity:0 antes de quitar la clase
    view.classList.remove('view--fade');
  }
}
