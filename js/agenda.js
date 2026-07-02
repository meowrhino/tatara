/* ============================================================
   TAT ARA — AGENDA
   La sección central: un "strip" vertical donde cada exposición es un bloque
   de color cuya altura es un eje temporal real (cada día = --day = dayVh svh).

   Modelo de layout (en FLUJO, sin medir nada en JS):
   - El bloque es una columna flex con min-height = max(minVh, días·dayVh).
   - La cabecera (título + imagen + descripción) es la "fila 0" del eje
     (.seg__lead): su min-height reserva los días que van del inicio del
     evento al primer O.R., de modo que CONSUME tiempo real en vez de
     sumarse encima del eje.
   - Después va la región temporal .seg__days. Dentro, cada O.R. ocupa como
     mínimo los días que lo separan del siguiente, en unidades de --day
     (min-height en svh). Si su contenido excede ese mínimo, empuja al
     siguiente hacia abajo (estirar para caber).
   - Consecuencia: el día N de un evento cae a N·--day del borde superior del
     bloque (mientras nada desborde su mínimo), el solapamiento es imposible
     (nada se monta en flujo) y el resize lo resuelve el CSS solo (todo en
     svh, estable frente a la barra de iOS).

   La marca "avui" también es CSS puro: hija absoluta del bloque de hoy con
   top = díasTranscurridos·--day (el CSS la saca al borde de pantalla con un
   left negativo). No hay relayout en JS: solo se corrige el scroll inicial
   mientras cargan imágenes/fuentes.
   ============================================================ */

import { el, esc, wordmark, t, ui, kindLabel, imagesOf, captureFocus } from './utils.js';
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
const orLabel = (ev) => (ORKIND.has(ev.kind) ? 'O.R. ' : '') + (kindLabel(ev.kind) || '');

// Días de margen que reserva el último O.R. de un bloque bajo su fila.
const TRAILING_DAYS = 1;

// Unidad de viewport del eje temporal. Usamos svh (small viewport height, la
// altura con la barra del navegador desplegada) en vez de dvh: dvh recalcula
// cuando iOS muestra/oculta la barra de URL al hacer scroll, y eso hacía que
// toda la línea de tiempo "respirara". Con svh la geometría es estable.
const VH = 'svh';

// Offset (en días, base 0) del día d dentro de un evento que empieza en s.
const dayOffset = (s, d) => daysBetween(s, d) - 1;

export function renderAgenda(view, data) {
  const cfg = (SITE && SITE.agenda) || {};
  const dayVh = cfg.dayVh || 3, minVh = cfg.minEventVh || 10, gapVh = cfg.gapVh || 13;
  const compactMax = cfg.compactMaxDays || 2, mediaMin = cfg.mediaMinDays || 6, endMin = cfg.endMinDays || 4;

  // Unidad de día para el CSS: todo el espaciado temporal se expresa con var(--day).
  view.style.setProperty('--day', `${dayVh}${VH}`);

  const events = (data.events || []).slice()
    .sort((a, b) => parseDate(a.start) - parseDate(b.start));

  const strip = el('div', 'agenda__strip');
  if (!events.length) { strip.appendChild(el('p', 'loading', ui('noEvents'))); view.appendChild(strip); return; }

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

  // Si hoy cae dentro de un bloque, eventBlock ya ha colocado la marca "avui"
  // (posición CSS pura, sin medir nada). Si no (hoy en un hueco, o antes/después
  // de todo), marcamos el bloque más relevante para un scroll aproximado.
  if (!strip.querySelector('.agenda__today-mark')) {
    const fallback = currentBlock || upcomingBlock || lastBlock;
    if (fallback) fallback.dataset.todayTarget = '1';
  }
}

// Deja algo de contexto por encima de "avui" al hacer scroll (fracción del alto).
const TODAY_TOP_MARGIN = 0.18;

// Lleva el scroll a "avui". La marca vive dentro del bloque de hoy y el CSS ya
// ha resuelto su posición; solo leemos dónde ha quedado en el documento. Si no
// hay marca, caemos al bloque marcado como fallback.
function scrollToToday(view) {
  const mark = view.querySelector('.agenda__today-mark');
  if (mark) {
    const y = mark.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, Math.max(0, y - window.innerHeight * TODAY_TOP_MARGIN));
    return;
  }
  const tgt = view.querySelector('[data-today-target="1"]');
  if (tgt) tgt.scrollIntoView({ block: 'start' });
}

// Al cargar imágenes/fuentes puede variar la altura de los bloques ANTERIORES
// al de hoy (si su contenido desborda el mínimo en días), así que corregimos el
// scroll hacia "avui" en cada carga. Pero en cuanto el usuario hace scroll
// dejamos de corregir: si no, cada imagen lazy que carga al bajar dispararía
// scrollIntoView y le robaría el scroll (en iOS se sentía como que la página se
// quedaba "pillada"). La ventana de auto-scroll también se cierra sola a los
// 2,5 s para no pelearse con cargas muy tardías.
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

function gapBlock(gapVh) {
  const gap = el('div', 'seg seg--gap');
  gap.style.minHeight = `${gapVh}${VH}`;
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
  block.style.minHeight = `max(${o.minVh}${VH}, ${days * o.dayVh}${VH})`;
  block.style.background = color;
  block.style.color = textOn(color);
  block.dataset.id = ev.id;

  const head = el('div', 'seg__head');
  head.appendChild(el('div', 'seg__label',
    `<span class="seg__who">${esc(t(ev.title))}${ev.person ? ' – <b>' + esc(ev.person) + '</b>' : ''}</span>` +
    `<span class="seg__when">${esc(rangeSlash(ev))}</span>`));

  if (compact) { block.appendChild(head); return block; } // la cabecera ya llena el bloque

  // "Fila 0" del eje: cabecera + imagen + descripción reservan (min-height)
  // los días que van del inicio del evento al primer O.R., de modo que
  // consumen tiempo real. Si su contenido es más alto, empuja al primer O.R.
  // hacia abajo — se mantiene la garantía de separación mínima.
  const lead = el('div', 'seg__lead');
  lead.appendChild(head);

  // Contador de imágenes del bloque (expo + O.R.), para alternar izq/dcha.
  // Se reinicia en cada bloque, así la primera imagen del bloque va a la izq.
  let imgCount = 0;

  const imgs = imagesOf(ev);
  if (days >= o.mediaMin && imgs.length) {
    lead.appendChild(mediaEl(imgs[0], t(ev.title), imgCount++));
  }

  if (ev.description) {
    lead.appendChild(el('div', 'seg__desc', esc(t(ev.description))));
  }

  const firstOffset = children.length ? Math.max(0, dayOffset(s, parseDate(children[0].start))) : 0;
  if (firstOffset > 0) lead.style.minHeight = `calc(${firstOffset} * var(--day))`;
  block.appendChild(lead);

  // Marca "avui": hija absoluta del bloque; su Y son los días transcurridos en
  // unidades --day (el CSS la saca al borde de pantalla, ver styles).
  if (isToday) {
    const mark = el('div', 'agenda__today-mark', ui('today'));
    mark.style.top = `calc(${dayOffset(s, today)} * var(--day))`;
    block.appendChild(mark);
  }

  // Región temporal con los O.R. en flujo. Los días previos al primer O.R. ya
  // los ha reservado la fila 0 (.seg__lead).
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
    const gapDays = idx < children.length - 1
      ? dayOffset(s, parseDate(children[idx + 1].start)) - offset
      : TRAILING_DAYS;
    row.style.minHeight = `calc(${Math.max(0, gapDays)} * var(--day))`;

    const info = el('div', 'seg__child-info');
    info.innerHTML =
      `<span class="seg__child-when">${esc(rangeSlash(c))}</span>` +
      `<span class="seg__child-name">${esc(orLabel(c))} · ${esc(t(c.title))}${c.person ? ' – <b>' + esc(c.person) + '</b>' : ''}</span>` +
      (childIsToday ? `<span class="seg__today-badge">${esc(ui('today'))}</span>` : '');
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
  const img = el('img');
  img.src = src; img.alt = alt || '';
  overlay.appendChild(img);
  document.body.appendChild(overlay);
  document.body.classList.add('no-scroll');
  overlay.focus();

  const close = () => {
    overlay.remove();
    document.body.classList.remove('no-scroll');
    document.removeEventListener('keydown', onKey);
    restoreFocus();
  };
  const onKey = (ev) => { if (ev.key === 'Escape') close(); };
  overlay.addEventListener('click', close);
  document.addEventListener('keydown', onKey);
}
