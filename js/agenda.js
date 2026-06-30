/* ============================================================
   TAT ARA — AGENDA
   La sección central: un "strip" vertical donde cada exposición es un bloque
   de color cuya altura es un eje temporal real (cada día = --day = dayVh dvh).

   Modelo de layout (en FLUJO, sin position:absolute):
   - El bloque es una columna flex con min-height = max(minVh, días·dayVh).
   - Tras cabecera/imagen/descripción va la región temporal .seg__days. Dentro,
     cada O.R. ocupa como mínimo los días que lo separan del siguiente, en
     unidades de --day (min-height en dvh). Si su contenido excede ese mínimo,
     empuja al siguiente hacia abajo (estirar para caber).
   - Consecuencia: el solapamiento es imposible (nada se monta en flujo), el
     crecimiento es automático (el contenido empuja la altura) y el resize lo
     resuelve el CSS solo (todo en dvh). No hay relayout de O.R. en JS.

   Lo único que aún se mide es la marca "avui": vive fuera del color, pegada al
   borde de pantalla, y su Y depende de la altura real de la cabecera (que
   cambia al cargar imágenes), así que se reposiciona en cada carga/resize.
   ============================================================ */

import { el, esc, wordmark, t, KIND_CA, imagesOf } from './utils.js';
import { SITE } from './state.js';
import { parseDate, todayDate, sameDay, daysBetween, dMes, rangeSlash } from './dates.js';

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
const orLabel = (ev) => (ORKIND.has(ev.kind) ? 'O.R. ' : '') + (KIND_CA[ev.kind] || '');

// Offset (en días, base 0) del día d dentro de un evento que empieza en s.
const dayOffset = (s, d) => daysBetween(s, d) - 1;

export function renderAgenda(view, data) {
  const cfg = (SITE && SITE.agenda) || {};
  const dayVh = cfg.dayVh || 3, minVh = cfg.minEventVh || 10, gapVh = cfg.gapVh || 13;
  const compactMax = cfg.compactMaxDays || 2, mediaMin = cfg.mediaMinDays || 6, endMin = cfg.endMinDays || 4;

  // Unidad de día para el CSS: todo el espaciado temporal se expresa con var(--day).
  view.style.setProperty('--day', `${dayVh}dvh`);

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

  view.dataset.agendaDayVh = String(dayVh);

  const todayMark = placeTodayMark(view, dayVh);
  const todayHost = strip.querySelector('[data-today-days-in]');
  const isDesktop = window.matchMedia('(min-width: 720px)').matches;
  const target = (isDesktop && todayMark) || todayHost || currentBlock || upcomingBlock || lastBlock;
  if (target) target.dataset.todayTarget = '1';
}

// Marca "avui": vive fuera de los bloques de color (hija de #view, no del
// bloque), pegada al borde real de la pantalla — así nunca compite con el
// contenido centrado. Solo se muestra si hay hueco (ver CSS, desktop).
// Es lo único medido: su Y = top del origen temporal del bloque de hoy (la
// región .seg__days) + los días transcurridos. Se reutiliza el mismo nodo.
function placeTodayMark(view, dayVh) {
  const strip = view.querySelector('.agenda__strip');
  const host = strip && strip.querySelector('[data-today-days-in]');
  let mark = view.querySelector('.agenda__today-mark');
  if (!host) return mark || null;

  const days = host.querySelector(':scope > .seg__days');
  // origen del eje temporal del bloque, relativo a #view (offsetParent común)
  const originY = host.offsetTop + (days ? days.offsetTop : host.offsetHeight);
  const daysIn = Number(host.dataset.todayDaysIn);

  if (!mark) { mark = el('div', 'agenda__today-mark', 'avui'); view.appendChild(mark); }
  mark.style.top = `calc(${originY}px + ${daysIn * dayVh}dvh)`;
  return mark;
}

// Recoloca solo la marca "avui" (su Y mezcla px de offset con dvh, así que se
// descuadra al cambiar alturas/viewport). Todo lo demás es CSS puro.
export function relayoutAgenda(view) {
  placeTodayMark(view, Number(view.dataset.agendaDayVh) || 3);
}

// Y absoluta de la línea "avui" (mismo cálculo que la marca, pero resuelto a px
// para poder hacer scrollTo). Devuelve null si hoy no cae dentro de un bloque no
// compacto (entonces se cae al bloque marcado como data-today-target).
function todayScrollY(view) {
  const strip = view.querySelector('.agenda__strip');
  const host = strip && strip.querySelector('[data-today-days-in]');
  if (!host) return null;
  const dayVh = Number(view.dataset.agendaDayVh) || 3;
  const days = host.querySelector(':scope > .seg__days');
  const originY = host.offsetTop + (days ? days.offsetTop : host.offsetHeight);
  const daysIn = Number(host.dataset.todayDaysIn) || 0;
  const dayPx = (dayVh / 100) * window.innerHeight; // var(--day) en px, según el viewport actual
  const topMargin = window.innerHeight * 0.18;      // deja algo de contexto encima de "avui"
  return Math.max(0, originY + daysIn * dayPx - topMargin);
}

function scrollToToday(view) {
  const y = todayScrollY(view);
  if (y != null) { window.scrollTo(0, y); return; }
  const tgt = view.querySelector('[data-today-target="1"]');
  if (tgt) tgt.scrollIntoView({ block: 'start' });
}

// Tras cargar imágenes/fuentes hay que reubicar la marca (sus offsets px
// cambian) y corregir el scroll hacia "avui". Pero en cuanto el usuario hace
// scroll dejamos de recolocar: si no, cada imagen lazy que carga al bajar
// dispararía scrollIntoView y le robaría el scroll (en iOS se sentía como que la
// página se quedaba "pillada"). La ventana de auto-scroll también se cierra sola
// a los 2,5 s para no pelearse con cargas muy tardías.
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

  const settle = () => {
    relayoutAgenda(view);          // la marca se recoloca siempre
    if (autoScroll) scrollToToday(view);
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

function eventBlock(ev, o, today) {
  const s = parseDate(ev.start), e = ev.end ? parseDate(ev.end) : s;
  const days = Math.max(1, daysBetween(s, e));
  const children = (ev.children || []).slice().sort((a, b) => parseDate(a.start) - parseDate(b.start));
  const compact = days <= o.compactMax && !children.length;
  const isToday = !!today && today >= s && today <= e;

  const color = resolveColor(ev.color);
  const block = el('div', 'seg seg--event' + (compact ? ' seg--compact' : ''));
  block.style.minHeight = `max(${o.minVh}dvh, ${days * o.dayVh}dvh)`;
  block.style.background = color;
  block.style.color = textOn(color);
  block.dataset.id = ev.id;

  const head = el('div', 'seg__head');
  head.appendChild(el('div', 'seg__label',
    `<span class="seg__who">${esc(t(ev.title))}${ev.person ? ' – <b>' + esc(ev.person) + '</b>' : ''}</span>` +
    `<span class="seg__when">${esc(rangeSlash(ev))}</span>`));
  block.appendChild(head);

  if (isToday && !compact) {
    block.dataset.todayDaysIn = String(dayOffset(s, today));
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

  // Región temporal: su borde superior es el "día 0" desde el que se miden los
  // O.R. (y la marca "avui"). Existe siempre en bloques no compactos —aunque
  // esté vacía— para servir de origen del eje.
  const daysRegion = el('div', 'seg__days');
  block.appendChild(daysRegion);

  children.forEach((c, idx) => {
    const cs = parseDate(c.start);
    const childIsToday = !!today && sameDay(today, cs);
    const offset = dayOffset(s, cs);

    const row = el('div', 'seg__child' + (childIsToday ? ' seg__child--today' : ''));
    // Cada O.R. reserva como mínimo los días que lo separan del siguiente; el
    // último reserva el margen final. El espacio sobrante de cada fila ES el
    // hueco temporal hasta el O.R. siguiente.
    if (idx === 0 && offset > 0) row.style.marginTop = `calc(${offset} * var(--day))`;
    const gapDays = idx < children.length - 1
      ? dayOffset(s, parseDate(children[idx + 1].start)) - offset
      : TRAILING_DAYS;
    row.style.minHeight = `calc(${Math.max(0, gapDays)} * var(--day))`;

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

    daysRegion.appendChild(row);
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
