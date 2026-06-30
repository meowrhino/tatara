/* ============================================================
   TAT ARA — AGENDA
   La sección central: un "strip" vertical donde cada exposición es un bloque
   de color cuya altura es un eje temporal real (cada día = dayVh dvh). Dentro
   de cada bloque, los O.R. (Open Research) se ubican en su día exacto.

   Reto de layout: los O.R. van en position:absolute con el top calculado en
   JS a partir de las alturas reales del contenido. Esas alturas no se conocen
   hasta que cargan imágenes y fuentes, así que el posicionamiento se rehace
   (relayoutAgenda) tras cada carga y al redimensionar; si no, los O.R. se
   solaparían entre sí o se montarían sobre la imagen de la cabecera.
   ============================================================ */

import { el, esc, wordmark, t, KIND_CA, imagesOf } from './utils.js';
import { SITE } from './state.js';
import { parseDate, todayDate, sameDay, daysBetween, dMes, rangeSlash } from './dates.js';

// events.json (renombrado a agenda.json) guarda claves de paleta ("menta",
// "rosa"...); data.json -> palette es la fuente única de verdad. Si llega un
// valor que no está en la paleta se usa tal cual (admite hex literal de respaldo).
const resolveColor = (key) => (SITE && SITE.palette && SITE.palette[key]) || key || '#111';

// Elige tinta negra o blanca según la luminancia del fondo.
function textOn(hex) {
  const c = (hex || '#111').replace('#', '');
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? '#111' : '#fff';
}

const ORKIND = new Set(['conversa', 'lectura', 'sessio', 'taller', 'esdeveniment']);
const orLabel = (ev) => (ORKIND.has(ev.kind) ? 'O.R. ' : '') + (KIND_CA[ev.kind] || '');

export function renderAgenda(view, data) {
  const cfg = (SITE && SITE.agenda) || {};
  const dayVh = cfg.dayVh || 3, minVh = cfg.minEventVh || 10, gapVh = cfg.gapVh || 13;
  const compactMax = cfg.compactMaxDays || 2, mediaMin = cfg.mediaMinDays || 6, endMin = cfg.endMinDays || 4;

  const events = (data.events || []).slice()
    .sort((a, b) => parseDate(a.start) - parseDate(b.start));

  const strip = el('div', 'agenda__strip');
  if (!events.length) { strip.appendChild(el('p', 'loading', 'sense esdeveniments')); view.appendChild(strip); return; }

  const today = todayDate();
  let currentBlock = null, upcomingBlock = null, lastBlock = null;

  events.forEach((ev, i) => {
    if (i > 0) strip.appendChild(gapBlock(gapVh));
    const block = eventBlock(ev, { dayVh, minVh, compactMax, mediaMin, endMin }, today);
    strip.appendChild(block);

    const s = parseDate(ev.start), e = ev.end ? parseDate(ev.end) : s;
    if (!currentBlock && today >= s && today <= e) currentBlock = block;
    else if (!upcomingBlock && s > today) upcomingBlock = block;
    lastBlock = block;
  });
  view.appendChild(strip);

  // dayVh queda guardado para que relayoutAgenda (recolocación al cargar
  // imágenes/fuentes y al redimensionar) pueda recalcular sin reconstruir.
  view.dataset.agendaDayVh = String(dayVh);

  // Primer posicionamiento de los O.R. (children) en su día exacto dentro del
  // bloque. Ojo: aquí las imágenes aún no han cargado (miden ~0), así que esto
  // es solo una aproximación; relayoutAgenda lo rehace cuando cargan (ver
  // scrollAgendaToToday) — si no, los O.R. quedarían montados sobre la imagen.
  strip.querySelectorAll('.seg--event').forEach((block) => relayoutChildren(block, dayVh));

  const todayMark = placeTodayMark(view, dayVh);
  const todayHost = strip.querySelector('[data-today-days-in]');
  const isDesktop = window.matchMedia('(min-width: 720px)').matches;
  const target = (isDesktop && todayMark) || todayHost || currentBlock || upcomingBlock || lastBlock;
  if (target) target.dataset.todayTarget = '1';
}

// Marca "avui": vive fuera de los bloques de color (hija de #view, no del
// bloque), pegada al borde real de la pantalla — así nunca compite con el
// contenido centrado. Solo se muestra si hay hueco para ella (ver CSS).
// Se reutiliza el mismo nodo en cada recálculo: solo se actualiza su top.
function placeTodayMark(view, dayVh) {
  const strip = view.querySelector('.agenda__strip');
  const todayHost = strip && strip.querySelector('[data-today-days-in]');
  let mark = view.querySelector('.agenda__today-mark');
  if (!todayHost) return mark || null;
  const daysIn = Number(todayHost.dataset.todayDaysIn);
  const baseH = blockContentBaseH(todayHost);
  if (!mark) { mark = el('div', 'agenda__today-mark', 'avui'); view.appendChild(mark); }
  mark.style.top = `calc(${todayHost.offsetTop}px + ${baseH}px + ${daysIn * dayVh}dvh)`;
  return mark;
}

// Re-mide y recoloca toda la agenda: los O.R. de cada bloque (que se solapan
// o se montan sobre la imagen mientras esta aún no ha cargado) y la marca
// "avui". Hay que llamarlo cada vez que cambian las alturas reales: al cargar
// imágenes/fuentes, al abrir/cerrar una descripción y al redimensionar.
export function relayoutAgenda(view) {
  const dayVh = Number(view.dataset.agendaDayVh) || 3;
  view.querySelectorAll('.seg--event').forEach((block) => relayoutChildren(block, dayVh));
  placeTodayMark(view, dayVh);
}

// Tras cargar imágenes/fuentes hay que recolocar (sus alturas reales mueven
// todo lo de abajo) y luego corregir el scroll hacia "avui".
export function scrollAgendaToToday(view) {
  const settle = () => {
    relayoutAgenda(view);
    const tgt = view.querySelector('[data-today-target="1"]');
    if (tgt) tgt.scrollIntoView({ block: 'start' });
  };
  requestAnimationFrame(settle);

  view.querySelectorAll('img').forEach((img) => {
    if (img.complete) return;
    const onDone = () => requestAnimationFrame(settle);
    img.addEventListener('load', onDone, { once: true });
    img.addEventListener('error', onDone, { once: true });
  });

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(settle);
}

function gapBlock(gapVh) {
  const gap = el('div', 'seg seg--gap');
  gap.style.minHeight = `${gapVh}dvh`;
  gap.appendChild(el('span', 'wordmark wordmark--gap', wordmark('TAT ARA')));
  return gap;
}

// Borde inferior del contenido "de cabecera" del bloque (título + imagen +
// descripción, si la hay): los O.R. se posicionan a partir de ahí.
function blockContentBaseH(block) {
  const head = block.querySelector(':scope > .seg__head');
  const media = block.querySelector(':scope > .seg__media');
  const desc = block.querySelector(':scope > .seg__desc');
  let baseH = head.offsetHeight;
  if (media) baseH = Math.max(baseH, media.offsetTop + media.offsetHeight);
  if (desc && !desc.hidden) baseH = Math.max(baseH, desc.offsetTop + desc.offsetHeight);
  return baseH;
}

// Recoloca los O.R. de un bloque en su día ideal, evitando que se solapen (si
// dos caen muy seguidos o una descripción los empuja) y haciendo crecer el
// bloque si no caben en su altura por días. Depende de alturas reales, así que
// se llama al renderizar y de nuevo cuando esas alturas cambian (ver cabecera).
function relayoutChildren(block, dayVh) {
  const vhPx = window.innerHeight / 100;
  const CHILD_GAP_PX = 12;

  block.style.minHeight = block.dataset.baseMinHeight; // altura "natural" por días, antes de medir
  const baseH = blockContentBaseH(block);

  const rows = Array.from(block.querySelectorAll(':scope > .seg__child[data-day-offset]'));
  let prevBottomPx = null;
  rows.forEach((row) => {
    const off = Number(row.dataset.dayOffset);
    const idealTopPx = baseH + off * dayVh * vhPx;
    const topPx = prevBottomPx == null ? Math.max(idealTopPx, baseH) : Math.max(idealTopPx, prevBottomPx + CHILD_GAP_PX);
    row.style.top = `${topPx}px`;
    prevBottomPx = topPx + row.offsetHeight;
  });

  if (!rows.length) return;
  const endEl = block.querySelector(':scope > .seg__end');
  const neededPx = prevBottomPx + 16 + (endEl ? endEl.offsetHeight : 0);
  if (neededPx > block.offsetHeight) {
    block.style.minHeight = `${neededPx / vhPx}dvh`;
  }
}

function eventBlock(ev, o, today) {
  const s = parseDate(ev.start), e = ev.end ? parseDate(ev.end) : s;
  const days = Math.max(1, daysBetween(s, e));
  const children = (ev.children || []).slice().sort((a, b) => parseDate(a.start) - parseDate(b.start));
  const compact = days <= o.compactMax && !children.length;
  const isToday = !!today && today >= s && today <= e;

  const color = resolveColor(ev.color);
  const block = el('div', 'seg seg--event' + (compact ? ' seg--compact' : ''));
  block.dataset.baseMinHeight = `max(${o.minVh}dvh, ${days * o.dayVh}dvh)`;
  block.style.minHeight = block.dataset.baseMinHeight;
  block.style.background = color;
  block.style.color = textOn(color);
  block.dataset.id = ev.id;

  const head = el('div', 'seg__head');
  head.appendChild(el('div', 'seg__label',
    `<span class="seg__who">${esc(t(ev.title))}${ev.person ? ' – <b>' + esc(ev.person) + '</b>' : ''}</span>` +
    `<span class="seg__when">${esc(rangeSlash(ev))}</span>`));
  block.appendChild(head);

  if (isToday && !compact) {
    block.dataset.todayDaysIn = String(daysBetween(s, today) - 1);
  }

  if (compact) return block; // sin imagen ni O.R.: la cabecera ya llena el bloque

  // Contador de imágenes del bloque (expo + O.R.), para alternar izq/dcha.
  // Se reinicia en cada bloque, así la primera imagen del bloque va a la izq.
  let imgCount = 0;

  const imgs = imagesOf(ev);
  if (days >= o.mediaMin && imgs.length) {
    block.appendChild(mediaEl(imgs[0], t(ev.title), imgCount++));
  }

  if (ev.description) {
    block.appendChild(el('div', 'seg__desc', esc(t(ev.description))));
  }

  children.forEach((c) => {
    const cs = parseDate(c.start);
    const childIsToday = !!today && sameDay(today, cs);
    const row = el('div', 'seg__child' + (childIsToday ? ' seg__child--today' : ''));
    row.dataset.dayOffset = String(daysBetween(s, cs) - 1);

    const info = el('div', 'seg__child-info');
    info.innerHTML =
      `<span class="seg__child-when">${esc(rangeSlash(c))}</span>` +
      `<span class="seg__child-name">${esc(orLabel(c))} · ${esc(t(c.title))}${c.person ? ' – <b>' + esc(c.person) + '</b>' : ''}</span>` +
      (childIsToday ? '<span class="seg__today-badge">avui</span>' : '');
    row.appendChild(info);

    const cImgs = imagesOf(c);
    if (cImgs.length) row.appendChild(mediaEl(cImgs[0], t(c.title), imgCount++));

    if (c.description) {
      row.appendChild(el('div', 'seg__child-desc', esc(t(c.description))));
    }

    block.appendChild(row);
  });

  if (days >= o.endMin && ev.end && !sameDay(s, e)) {
    block.appendChild(el('span', 'seg__end', esc(dMes(e))));
  }

  return block;
}

function mediaEl(src, alt, idx) {
  const media = el('div', 'seg__media ' + (idx % 2 === 0 ? 'seg__media--left' : 'seg__media--right'));
  const img = el('img');
  img.src = src; img.alt = alt; img.loading = 'lazy';
  img.addEventListener('click', (ev) => { ev.stopPropagation(); openLightbox(src, alt); });
  media.appendChild(img);
  return media;
}

function openLightbox(src, alt) {
  const overlay = el('div', 'lightbox');
  const img = el('img');
  img.src = src; img.alt = alt || '';
  overlay.appendChild(img);
  document.body.appendChild(overlay);
  document.body.classList.add('no-scroll');

  const close = () => {
    overlay.remove();
    document.body.classList.remove('no-scroll');
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (ev) => { if (ev.key === 'Escape') close(); };
  overlay.addEventListener('click', close);
  document.addEventListener('keydown', onKey);
}
