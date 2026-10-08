/* ============================================================
   TAT ARA — router
   Cada sección tiene su dirección (/, /nosaltres/, /exposicions/anna-dot/…).
   Resuelve la sección activa a partir de la URL y SITE.sections, carga su
   JSON y delega en el renderizador que toca, con un fundido entre vistas.
   Los enlaces internos no recargan la página (main.js usa pushState). Cada
   dirección existe además como HTML ya pintado, que genera tools/prerender.mjs
   al publicar, para los buscadores y las vistas previas al compartir.
   ============================================================ */

import { $, esc, t, ui } from './utils.js';
import { SITE, pathOf } from './state.js';
import { loadJSON } from './data.js';
import { closeModal } from './modal.js';
import { renderAgenda, scrollAgendaToToday } from './agenda.js';
import { renderText, renderPeople, renderContact, renderNewsletter } from './sections.js';
import { renderShop, renderCart } from './botiga.js';
import { setIntroProgress } from './intro.js';

// "/exposicions/anna-dot/" → ['exposicions', 'anna-dot']
const segments = () => location.pathname.split('/').filter(Boolean);

// Id de la sección actual; cae a la primera sección si no es válido.
function currentId() {
  const id = segments()[0];
  return SITE.sections.some((s) => s.id === id) ? id : SITE.sections[0].id;
}

// Lo que va tras la sección: la ficha abierta (/exposicions/anna-dot/ → 'anna-dot').
export const subPath = () => segments()[1] || null;

// Parámetros de la URL, p. ej. la vuelta de Stripe (/carret/?gracies=1&session_id=…).
export const query = () => new URLSearchParams(location.search);

// Las direcciones de antes (#agenda, #exposicions?expo=anna-dot, #carret?gracies=…)
// siguen funcionando: se reescriben a la de ahora sin recargar.
export function migrateHash() {
  const m = location.hash.match(/^#([\w-]+)(?:\?(.*))?$/);
  if (!m || !SITE.sections.some((s) => s.id === m[1])) return;
  const params = new URLSearchParams(m[2] || '');
  const expo = params.get('expo');
  params.delete('expo');
  const qs = params.toString();
  history.replaceState(null, '', pathOf(m[1], expo) + (qs ? `?${qs}` : ''));
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
  if (!$('#modal').hidden) closeModal();   // una ficha abierta no sobrevive al cambio de sección (p. ej. con «atrás»)

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

  // La bienvenida espera a la primera vista: la agenda dice cuánto le falta;
  // las demás ya están.
  if (section.type === 'agenda') scrollAgendaToToday(view);
  else setIntroProgress(() => 1);

  if (animate) {
    void view.offsetWidth; // fuerza reflow para que el navegador registre opacity:0 antes de quitar la clase
    view.classList.remove('view--fade');
  }
}
