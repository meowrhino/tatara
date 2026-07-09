/* ============================================================
   TAT ARA — AGENDA
   Un "strip" vertical de bloques de color, uno por exposición, en orden
   cronológico. Cada bloque mide POR CONTENIDO (título + imagen + descripción +
   O.R. anidados), con una altura mínima de suelo (minEventVh) para que los
   eventos cortos no queden como una tira fina. Entre bloques, un hueco modesto.

   Cada bloque lleva abajo a la derecha un marcador de estado en negrita
   (passat / ara / vinent) calculado por fecha. Ya no hay eje temporal a escala
   ni auto-scroll a "hoy": el estado se comunica con ese marcador.
   ============================================================ */

import { el, esc, t, ui, kindLabel, imagesOf, captureFocus } from './utils.js';
import { SITE } from './state.js';
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

const ORKIND = new Set(['conversa', 'lectura', 'sessio', 'taller', 'esdeveniment']);
const orLabel = (ev) => (ORKIND.has(ev.kind) ? 'O.R. ' : '') + (kindLabel(ev.kind) || '');

// Unidad de viewport para el hueco entre bloques y el suelo mínimo. svh (small
// viewport height) es estable frente a la barra de iOS (no "respira" al hacer
// scroll como dvh).
const VH = 'svh';

export function renderAgenda(view, data) {
  const cfg = (SITE && SITE.agenda) || {};
  const minVh = cfg.minEventVh || 10, gapVh = cfg.gapVh || 6;

  const events = (data.events || []).slice()
    .sort((a, b) => parseDate(a.start) - parseDate(b.start));

  const strip = el('div', 'agenda__strip');
  if (!events.length) { strip.appendChild(el('p', 'loading', ui('noEvents'))); view.appendChild(strip); return; }

  const today = todayDate();
  let currentBlock = null, upcomingBlock = null, lastBlock = null;
  events.forEach((ev, i) => {
    if (i > 0) strip.appendChild(gapBlock(gapVh));
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

// Hueco modesto entre bloques (aire limpio; la marca vive en el marco TAT·ARA).
function gapBlock(gapVh) {
  const gap = el('div', 'seg seg--gap');
  gap.style.minHeight = `${gapVh}${VH}`;
  return gap;
}

function eventBlock(ev, o, today) {
  const s = parseDate(ev.start), e = ev.end ? parseDate(ev.end) : s;
  const children = (ev.children || []).slice().sort((a, b) => parseDate(a.start) - parseDate(b.start));
  const imgs = imagesOf(ev);
  // "Compacto": sin O.R., ni descripción, ni imagen → solo la cabecera, centrada.
  const compact = !children.length && !ev.description && !imgs.length;

  const color = resolveColor(ev.color);
  const block = el('div', 'seg seg--event' + (compact ? ' seg--compact' : ''));
  block.style.minHeight = `${o.minVh}${VH}`;   // solo suelo; el contenido manda
  block.style.background = color;
  block.style.color = textOn(color);
  block.dataset.id = ev.id;

  // Fila inferior (misma línea): fecha de cierre (izq) + estado (der), como la
  // cabecera con título (izq) + fechas (der). El estado va en negrita.
  const stKey = today > e ? 'statusPast' : (today < s ? 'statusNext' : 'statusNow');
  const stClass = today > e ? 'past' : (today < s ? 'next' : 'now');
  const foot = el('div', 'seg__foot');
  if (ev.end && !sameDay(s, e)) foot.appendChild(el('span', 'seg__end', esc(dMes(e))));
  foot.appendChild(el('span', 'seg__status seg__status--' + stClass, esc(ui(stKey))));

  const head = el('div', 'seg__head');
  head.appendChild(el('div', 'seg__label',
    `<span class="seg__who">${esc(t(ev.title))}${ev.person ? ' – <b>' + esc(ev.person) + '</b>' : ''}</span>` +
    `<span class="seg__when">${esc(rangeSlash(ev))}</span>`));

  if (compact) { block.appendChild(head); block.appendChild(foot); return block; }

  // Cabecera + imagen + descripción en flujo natural.
  const lead = el('div', 'seg__lead');
  lead.appendChild(head);

  // Contador de imágenes del bloque (expo + O.R.), para alternar izq/dcha.
  let imgCount = 0;
  if (imgs.length) lead.appendChild(mediaEl(imgs[0], t(ev.title), imgCount++));
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
        `<span class="seg__child-name">${esc(orLabel(c))} · ${esc(t(c.title))}${c.person ? ' – <b>' + esc(c.person) + '</b>' : ''}</span>`;
      row.appendChild(info);
      const cImgs = imagesOf(c);
      if (cImgs.length) row.appendChild(mediaEl(cImgs[0], t(c.title), imgCount++));
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

function openLightbox(src, alt) {
  const restoreFocus = captureFocus();
  const overlay = el('div', 'lightbox');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', alt || ui('enlargedImage'));
  overlay.tabIndex = -1;

  const close = () => {
    overlay.remove();
    document.body.classList.remove('no-scroll');
    document.removeEventListener('keydown', onKey);
    restoreFocus();
  };
  const onKey = (ev) => { if (ev.key === 'Escape') close(); };

  const btn = el('button', 'lightbox__close');
  btn.type = 'button';
  btn.setAttribute('aria-label', ui('close'));
  btn.innerHTML = '<svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true"><path d="M7 9 Q19 19 33 31 M33 8 Q20 20 8 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  btn.addEventListener('click', close);

  const img = el('img', 'lightbox__img');
  img.src = src; img.alt = alt || '';
  // Clic en la imagen NO cierra (para poder mirarla); clic fuera sí.
  img.addEventListener('click', (ev) => ev.stopPropagation());

  overlay.appendChild(btn);
  overlay.appendChild(img);
  overlay.addEventListener('click', close);
  document.body.appendChild(overlay);
  document.body.classList.add('no-scroll');
  document.addEventListener('keydown', onKey);
  btn.focus();
}
