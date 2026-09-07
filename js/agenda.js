/* ============================================================
   TAT ARA — AGENDA
   Un "strip" vertical de bloques de color, uno por exposición, en orden
   cronológico. Cada bloque mide POR CONTENIDO (título + imagen + descripción +
   O.R. anidados), con una altura mínima de suelo (minEventVh) para que los
   eventos cortos no queden como una tira fina. Los bloques van pegados: el
   cambio de color es el que separa una exposición de la siguiente.

   Cada bloque lleva abajo a la derecha un marcador de estado en negrita
   (passat / ara / proximament) calculado por fecha. Ya no hay eje temporal a escala
   ni auto-scroll a "hoy": el estado se comunica con ese marcador.
   ============================================================ */

import { el, esc, t, ui } from './utils.js';
import { SITE } from './state.js';
import { openLightbox } from './modal.js';
import { parseDate, todayDate, sameDay, rangeSlash, dMes } from './dates.js';

// agenda.json guarda claves de paleta ("menta", "rosa"...); data.json -> palette
// es la fuente única de verdad. Si llega un valor que no está en la paleta se
// usa tal cual (admite hex literal de respaldo).
const resolveColor = (key) => (SITE && SITE.palette && SITE.palette[key]) || key || '#111';

// Elige tinta negra o blanca según la luminancia del fondo.
function textOn(hex) {
  const c = (hex || '#111').replace('#', '');
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? '#111' : '#fff';
}

// 'kind' (traducible) es el tipo de cada entrada: exposició, lectura, conversa,
// O.R.… Viene de la columna "tipus" de la tabla de la clienta. Si una entrada
// anidada no lo trae, cae a "O.R.", que es lo que era antes fijo.
const kindOf = (ev, fallback = '') => t(ev.kind) || fallback;
const OR = 'O.R.';

// Unidad de viewport para el hueco entre bloques y el suelo mínimo. svh (small
// viewport height) es estable frente a la barra de iOS (no "respira" al hacer
// scroll como dvh).
const VH = 'svh';

export function renderAgenda(view, data) {
  const cfg = (SITE && SITE.agenda) || {};
  const minVh = cfg.minEventVh || 10;

  const events = (data.events || []).slice()
    .sort((a, b) => parseDate(a.start) - parseDate(b.start));

  const strip = el('div', 'agenda__strip');
  if (!events.length) { strip.appendChild(el('p', 'loading', ui('noEvents'))); view.appendChild(strip); return; }

  const today = todayDate();
  let currentBlock = null, upcomingBlock = null, lastBlock = null;
  events.forEach((ev) => {
    const block = eventBlock(ev, { minVh }, today);
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

// Deja algo de contexto por encima del bloque de "hoy" al hacer scroll.
const TODAY_TOP_MARGIN = 0.12;

function scrollToToday(view) {
  const tgt = view.querySelector('[data-today-target="1"]');
  if (!tgt) return;
  const y = tgt.getBoundingClientRect().top + window.scrollY;
  window.scrollTo(0, Math.max(0, y - window.innerHeight * TODAY_TOP_MARGIN));
}

// Al cargar imágenes/fuentes cambian las alturas y "hoy" se desplaza; recolocamos
// el scroll en cada carga hasta que el usuario hace scroll o pasan 2,5 s (así una
// imagen lazy tardía no le roba el scroll a media navegación).
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
  setTimeout(stop, 2500);

  const settle = () => { if (autoScroll) scrollToToday(view); };
  requestAnimationFrame(settle);

  view.querySelectorAll('img').forEach((img) => {
    if (img.complete) return;
    const onDone = () => requestAnimationFrame(settle);
    img.addEventListener('load', onDone, { once: true });
    img.addEventListener('error', onDone, { once: true });
  });

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(settle);
}

function eventBlock(ev, o, today) {
  const s = parseDate(ev.start), e = ev.end ? parseDate(ev.end) : s;
  const children = (ev.eventos || []).slice().sort((a, b) => parseDate(a.start) - parseDate(b.start));
  // "Compacto": sin O.R., ni descripción, ni imagen → solo la cabecera, centrada.
  const compact = !children.length && !ev.description && !ev.image;

  const color = resolveColor(ev.color);
  const block = el('div', 'seg seg--event' + (compact ? ' seg--compact' : ''));
  block.style.minHeight = `${o.minVh}${VH}`;   // solo suelo; el contenido manda
  block.style.background = color;
  block.style.color = textOn(color);
  block.dataset.slug = ev.slug;

  // Fila inferior (misma línea): fecha de cierre (izq) + estado (der), como la
  // cabecera con título (izq) + fechas (der). El estado va en negrita.
  const stKey = today > e ? 'statusPast' : (today < s ? 'statusNext' : 'statusNow');
  const stClass = today > e ? 'past' : (today < s ? 'next' : 'now');
  const foot = el('div', 'seg__foot');
  if (ev.end && !sameDay(s, e)) foot.appendChild(el('span', 'seg__end', esc(dMes(e))));
  foot.appendChild(el('span', 'seg__status seg__status--' + stClass, esc(ui(stKey))));

  const kind = kindOf(ev);
  const head = el('div', 'seg__head');
  if (kind) head.appendChild(el('div', 'seg__kind', esc(kind)));
  head.appendChild(el('div', 'seg__label',
    `<span class="seg__who">${esc(t(ev.title))}${ev.artist ? ' – <b>' + esc(ev.artist) + '</b>' : ''}</span>` +
    `<span class="seg__when">${esc(rangeSlash(ev))}</span>`));

  if (compact) { block.appendChild(head); block.appendChild(foot); return block; }

  // Cabecera + imagen + descripción en flujo natural.
  const lead = el('div', 'seg__lead');
  lead.appendChild(head);

  // Contador de imágenes del bloque (expo + O.R.), para alternar izq/dcha.
  let imgCount = 0;
  if (ev.image) lead.appendChild(mediaEl(ev.image, t(ev.title), imgCount++));
  if (ev.description) lead.appendChild(el('div', 'seg__desc', esc(t(ev.description))));
  block.appendChild(lead);

  // O.R. anidados (converses, lectures…): simplemente en flujo, uno tras otro.
  if (children.length) {
    const daysRegion = el('div', 'seg__days');
    block.appendChild(daysRegion);
    children.forEach((c) => {
      const row = el('div', 'seg__child');
      const info = el('div', 'seg__child-info');
      info.innerHTML =
        `<span class="seg__child-when">${esc(rangeSlash(c))}</span>` +
        `<span class="seg__child-name">${esc(kindOf(c, OR))} · ${esc(t(c.title))}${c.artist ? ' – <b>' + esc(c.artist) + '</b>' : ''}</span>`;
      row.appendChild(info);
      if (c.image) row.appendChild(mediaEl(c.image, t(c.title), imgCount++));
      if (c.description) row.appendChild(el('div', 'seg__child-desc', esc(t(c.description))));
      daysRegion.appendChild(row);
    });
  }

  block.appendChild(foot);

  return block;
}

// La imagen es un <button> (no un <img> suelto) para que se pueda ampliar también
// con teclado; alterna izquierda/derecha según su posición en el bloque.
function mediaEl(src, alt, idx) {
  const btn = el('button', 'seg__media ' + (idx % 2 === 0 ? 'seg__media--left' : 'seg__media--right'));
  btn.type = 'button';
  btn.setAttribute('aria-label', alt ? `${ui('enlargeImage')}: ${alt}` : ui('enlargeImage'));
  const img = el('img');
  img.src = src; img.alt = alt; img.loading = 'lazy';
  btn.appendChild(img);
  btn.addEventListener('click', (ev) => { ev.stopPropagation(); openLightbox(src, alt); });
  return btn;
}
