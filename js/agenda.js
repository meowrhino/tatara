/* ============================================================
   TAT ARA — AGENDA
   Una lista vertical de entradas, una por exposición, en orden cronológico,
   separadas por un hilo negro. Cada entrada:

     TÍTOL                                  13/12 – 28/1
     ARTISTA
     descripció
     [imatge, a l'esquerra]
     O.R. anidados (converses, tallers…)
     28 GENER                                  EXPOSICIÓ
     ───────────────────────────────────────────────────

   Al abrir, el scroll arranca en lo que pasa hoy (o lo próximo).
   ============================================================ */

import { el, esc, t, ui, zoomImg } from './utils.js';
import { parseDate, todayDate, sameDay, rangeSlash, dMes } from './dates.js';
import { introDone, setIntroProgress } from './intro.js';

// 'kind' (traducible) es el tipo de cada entrada: exposició, lectura, conversa,
// O.R.… Viene de la columna "tipus" de la tabla de la clienta. Si una entrada
// anidada no lo trae, cae a "O.R.", que es lo que era antes fijo.
const kindOf = (ev, fallback = '') => t(ev.kind) || fallback;
const OR = 'O.R.';

export function renderAgenda(view, data) {
  const events = (data.events || []).slice()
    .sort((a, b) => parseDate(a.start) - parseDate(b.start));

  const strip = el('div', 'agenda__strip');
  if (!events.length) { strip.appendChild(el('p', 'loading', ui('noEvents'))); view.appendChild(strip); return; }

  const today = todayDate();
  let currentBlock = null, upcomingBlock = null, lastBlock = null;
  events.forEach((ev) => {
    const block = eventBlock(ev);
    strip.appendChild(block);
    const s = parseDate(ev.start), e = ev.end ? parseDate(ev.end) : s;
    if (!currentBlock && today >= s && today <= e) currentBlock = block;
    else if (!upcomingBlock && s > today) upcomingBlock = block;
    lastBlock = block;
  });
  view.appendChild(strip);

  // Al abrir la agenda, arrancamos junto a lo que pasa hoy (o lo próximo; si todo
  // es pasado, el último). El scroll fino lo resuelve scrollAgendaToToday.
  const target = currentBlock || upcomingBlock || lastBlock;
  if (target) target.dataset.todayTarget = '1';
}

// El bloque de "hoy" queda justo debajo de TAT, donde empieza toda sección
// (el padding-top de #view es la altura de la barra).
function scrollToToday(view, behavior) {
  const tgt = view.querySelector('[data-today-target="1"]');
  if (!tgt) return;
  const y = tgt.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({ top: Math.max(0, y - parseFloat(getComputedStyle(view).paddingTop)), behavior });
}

// La agenda se abre arriba y, tras un respiro, baja con scroll suave hasta hoy:
// así se ve que hay cosas antes. Las fotos de antes de hoy cambian las alturas
// al cargar, así que se piden ya (se verían igual al pasar por encima) y el
// scroll espera a saber sus medidas (máx. 2 s). Si alguna llega tarde, se
// recoloca, hasta que el usuario hace scroll o pasan 5 s. Al abrir la web, esa
// espera es la bienvenida (intro.js), que avanza a medida que llegan las medidas.
export function scrollAgendaToToday(view) {
  let autoScroll = true;
  const opts = { passive: true };
  const stop = () => {
    autoScroll = false;
    window.removeEventListener('wheel', stop, opts);
    window.removeEventListener('touchmove', stop, opts);
    window.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ', 'Spacebar'].includes(e.key)) stop();
  };
  window.addEventListener('wheel', stop, opts);
  window.addEventListener('touchmove', stop, opts);
  window.addEventListener('keydown', onKey);

  const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  let started = false;
  const settle = () => { if (autoScroll && started) scrollToToday(view, behavior); };

  const tgt = view.querySelector('[data-today-target="1"]');
  const before = tgt ? [...view.querySelectorAll('img')].filter((img) =>
    tgt.contains(img) || (tgt.compareDocumentPosition(img) & Node.DOCUMENT_POSITION_PRECEDING)) : [];
  before.forEach((img) => { img.loading = 'eager'; });
  const isSized = (img) => img.complete || img.naturalWidth > 0;
  const sized = () => before.every(isSized);
  setIntroProgress(() => (before.length ? before.filter(isSized).length / before.length : 1));

  let t0;
  const go = () => {
    const ms = performance.now() - t0;
    if (!autoScroll) return;
    if (ms < 500 || (ms < 2000 && !sized())) { requestAnimationFrame(go); return; }
    started = true;
    setTimeout(stop, 5000);
    settle();
  };
  Promise.all([introDone, document.fonts ? document.fonts.ready : null])
    .then(() => { t0 = performance.now(); go(); });

  view.querySelectorAll('img').forEach((img) => {
    if (img.complete) return;
    const onDone = () => requestAnimationFrame(settle);
    img.addEventListener('load', onDone, { once: true });
    img.addEventListener('error', onDone, { once: true });
  });
}

function eventBlock(ev) {
  const s = parseDate(ev.start), e = ev.end ? parseDate(ev.end) : s;
  const children = (ev.eventos || []).slice().sort((a, b) => parseDate(a.start) - parseDate(b.start));

  const block = el('div', 'seg');
  block.dataset.slug = ev.slug;

  // Cabecera: título (izq) + fechas (der); el artista, en la línea de debajo.
  const head = el('div', 'seg__head');
  head.appendChild(el('div', 'seg__label',
    `<span class="seg__title">${esc(t(ev.title))}</span>` +
    `<span class="seg__when">${esc(rangeSlash(ev))}</span>`));
  if (ev.artist) head.appendChild(el('div', 'seg__artist', esc(ev.artist)));
  block.appendChild(head);

  // Descripción e imagen en flujo natural.
  if (ev.description) block.appendChild(el('div', 'seg__desc', esc(t(ev.description))));
  [].concat(ev.image || []).forEach((src) => block.insertAdjacentHTML('beforeend', zoomImg(src, t(ev.title))));

  // O.R. anidados (converses, lectures…): simplemente en flujo, uno tras otro.
  if (children.length) {
    const daysRegion = el('div', 'seg__days');
    block.appendChild(daysRegion);
    children.forEach((c) => {
      const row = el('div', 'seg__child');
      const info = el('div', 'seg__child-info');
      // El espacio entre los dos <span> es literal, no solo el margen del CSS:
      // sin él, copiar la línea o leerla con un lector de pantalla da
      // "13:00O.R." todo junto.
      info.innerHTML =
        `<span class="seg__child-when">${esc(rangeSlash(c))}</span> ` +
        `<span class="seg__child-name">${esc(kindOf(c, OR))} – ${esc(t(c.title))}${c.artist ? ' – ' + esc(c.artist) : ''}</span>`;
      row.appendChild(info);
      if (c.description) row.appendChild(el('div', 'seg__child-desc', esc(t(c.description))));
      [].concat(c.image || []).forEach((src) => row.insertAdjacentHTML('beforeend', zoomImg(src, t(c.title))));
      daysRegion.appendChild(row);
    });
  }

  // Pie: fecha de cierre (izq) + tipo de entrada (der).
  const foot = el('div', 'seg__foot');
  if (ev.end && !sameDay(s, e)) foot.appendChild(el('span', 'seg__end', esc(dMes(e))));
  const kind = kindOf(ev);
  if (kind) foot.appendChild(el('span', 'seg__kind', esc(kind)));
  if (foot.children.length) block.appendChild(foot);

  // Dentro de un mismo bloque, la 1.ª foto a la izquierda, la 2.ª a la derecha…
  block.querySelectorAll('.zoom').forEach((z, i) => { if (i % 2) z.classList.add('zoom--right'); });

  return block;
}
