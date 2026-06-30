/* ============================================================
   TAT ARA — app
   Router por hash + renderizado de secciones a partir de JSONs.
   Config general en data/data.json; cada sección tiene su data.
   ============================================================ */

const CONFIG_URL = 'data/data.json';

const MONTHS_CA = ['gener', 'febrer', 'març', 'abril', 'maig', 'juny',
                   'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre'];
const KIND_CA = {
  exposicio: 'Exposició', conversa: 'Conversa', esdeveniment: 'Esdeveniment',
  taller: 'Taller', lectura: 'Lectura', sessio: 'Sessió d’escolta'
};

let SITE = null;          // config (data.json)
let LANG = 'ca';
const CACHE = new Map();  // url -> parsed json

/* ---------- utilidades ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const wordmark = (s) => s.split('').map((c) => `<span>${c === ' ' ? '&nbsp;' : esc(c)}</span>`).join('');
const t = (f) => f == null ? '' : (typeof f === 'string' ? f : (f[LANG] || f.ca || Object.values(f)[0] || ''));

async function loadJSON(url) {
  if (CACHE.has(url)) return CACHE.get(url);
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  const data = await res.json();
  CACHE.set(url, data);
  return data;
}

/* ---------- fechas ---------- */
const parseDate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (date, n) => { const d = new Date(date); d.setDate(d.getDate() + n); return d; };
const todayDate = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const daysBetween = (a, b) => Math.round((b - a) / 86400000) + 1;   // inclusivo
const dm = (d) => `${d.getDate()}/${d.getMonth() + 1}`;             // 2/7
const dMes = (d) => `${d.getDate()} ${MONTHS_CA[d.getMonth()]}`;    // 2 juliol

function rangeSlash(ev) {
  const s = parseDate(ev.start), e = ev.end ? parseDate(ev.end) : s;
  if (sameDay(s, e)) return dm(s) + (ev.time ? ` · ${ev.time}` : '');
  return `${dm(s)} – ${dm(e)}`;
}
const imagesOf = (x) => x.images && x.images.length ? x.images : (x.image ? [x.image] : []);

// events.json guarda claves de paleta ("menta", "rosa"...); data.json -> palette es la fuente única de verdad.
// Si llega un valor que no está en la paleta, se usa tal cual (admite hex literal de respaldo).
const resolveColor = (key) => (SITE && SITE.palette && SITE.palette[key]) || key || '#111';

function textOn(hex) {
  const c = (hex || '#111').replace('#', '');
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? '#111' : '#fff';
}

/* ============================================================
   AGENDA
   ============================================================ */
function renderAgenda(view, data) {
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

  // Posiciona los O.R. (children) en su día exacto dentro del bloque: hace
  // falta medir el contenido ya renderizado (offsetHeight), por eso se hace
  // aquí y no en eventBlock (el bloque aún no está en el documento allí).
  strip.querySelectorAll('.seg--event').forEach((block) => relayoutChildren(block, dayVh));

  // Marca "avui": vive fuera de los bloques de color (hijo de #view, no del
  // bloque), pegada al borde real de la pantalla — así nunca compite con el
  // contenido centrado. Solo se muestra si hay hueco para ella (ver CSS).
  let todayMark = null;
  const todayHost = strip.querySelector('[data-today-days-in]');
  if (todayHost) {
    const daysIn = Number(todayHost.dataset.todayDaysIn);
    const baseH = blockContentBaseH(todayHost);
    todayMark = el('div', 'agenda__today-mark', 'avui');
    todayMark.style.top = `calc(${todayHost.offsetTop}px + ${baseH}px + ${daysIn * dayVh}dvh)`;
    view.appendChild(todayMark);
  }

  const isDesktop = window.matchMedia('(min-width: 720px)').matches;
  const target = (isDesktop && todayMark) || todayHost || currentBlock || upcomingBlock || lastBlock;
  if (target) target.dataset.todayTarget = '1';
}

// Corrige el scroll tras cargar imágenes/fuentes: su carga asíncrona desplaza
// los bloques (alturas no fijas del todo) y descuadraría la marca de "avui".
function scrollAgendaToToday(view) {
  const scrollNow = () => {
    const t = view.querySelector('[data-today-target="1"]');
    if (t) t.scrollIntoView({ block: 'start' });
  };
  requestAnimationFrame(scrollNow);

  view.querySelectorAll('img').forEach((img) => {
    if (img.complete) return;
    const onDone = () => requestAnimationFrame(scrollNow);
    img.addEventListener('load', onDone, { once: true });
    img.addEventListener('error', onDone, { once: true });
  });

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(scrollNow);
}

function gapBlock(gapVh) {
  const gap = el('div', 'seg seg--gap');
  gap.style.minHeight = `${gapVh}dvh`;
  gap.appendChild(el('span', 'wordmark wordmark--gap', wordmark('TAT ARA')));
  return gap;
}

const ORKIND = new Set(['conversa', 'lectura', 'sessio', 'taller', 'esdeveniment']);
const orLabel = (ev) => (ORKIND.has(ev.kind) ? 'O.R. ' : '') + (KIND_CA[ev.kind] || '');

// Borde inferior del contenido "de cabecera" del bloque (título + imagen +
// descripción desplegada, si la hay): los O.R. se posicionan a partir de ahí.
function blockContentBaseH(block) {
  const head = block.querySelector(':scope > .seg__head');
  const media = block.querySelector(':scope > .seg__media');
  const desc = block.querySelector(':scope > .seg__desc');
  let baseH = head.offsetHeight;
  if (media) baseH = Math.max(baseH, media.offsetTop + media.offsetHeight);
  if (desc && !desc.hidden) baseH = Math.max(baseH, desc.offsetTop + desc.offsetHeight);
  return baseH;
}

// Recoloca los O.R. de un bloque en su día ideal, evitando que se solapen
// (si dos caen muy seguidos o una descripción desplegada los empuja) y
// haciendo crecer el bloque si no caben en su altura por días. Se llama al
// renderizar y de nuevo cada vez que se abre/cierra una descripción, porque
// eso cambia las alturas de las que depende todo lo de abajo.
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

  const head = el('button', 'seg__head');
  head.type = 'button';
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
    const desc = el('div', 'seg__desc', esc(t(ev.description)));
    desc.hidden = true;
    block.appendChild(desc);
    head.classList.add('seg__head--has-desc');
    head.addEventListener('click', () => {
      desc.hidden = !desc.hidden;
      relayoutChildren(block, o.dayVh);
    });
  }

  children.forEach((c) => {
    const cs = parseDate(c.start);
    const childIsToday = !!today && sameDay(today, cs);
    const row = el('div', 'seg__child' + (childIsToday ? ' seg__child--today' : ''));
    row.dataset.dayOffset = String(daysBetween(s, cs) - 1);

    const btn = el('button', 'seg__child-info');
    btn.type = 'button';
    btn.innerHTML =
      `<span class="seg__child-when">${esc(rangeSlash(c))}</span>` +
      `<span class="seg__child-name">${esc(orLabel(c))} · ${esc(t(c.title))}${c.person ? ' – <b>' + esc(c.person) + '</b>' : ''}</span>` +
      (childIsToday ? '<span class="seg__today-badge">avui</span>' : '');
    row.appendChild(btn);

    const cImgs = imagesOf(c);
    if (cImgs.length) row.appendChild(mediaEl(cImgs[0], t(c.title), imgCount++));

    if (c.description) {
      const cDesc = el('div', 'seg__child-desc', esc(t(c.description)));
      cDesc.hidden = true;
      row.appendChild(cDesc);
      btn.classList.add('seg__child-info--has-desc');
      btn.addEventListener('click', () => {
        cDesc.hidden = !cDesc.hidden;
        relayoutChildren(block, o.dayVh);
      });
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

/* ============================================================
   SECCIONES DE CONTENIDO
   ============================================================ */
function pageWrap(inner) {
  return `<div class="page">
    <h1 class="page__wordmark wordmark">${wordmark('TAT ARA')}</h1>
    ${inner}
    <p class="page__wordmark page__wordmark--foot wordmark">${wordmark('TAT ARA')}</p>
  </div>`;
}

function renderText(view, data) {
  const blocks = data.body || [];
  const body = blocks.map((b) => {
    const heading = b.heading ? `<h2 class="prose__heading">${esc(t(b.heading))}</h2>` : '';
    const text = t(b.text);
    return text ? `${heading}<p>${esc(text)}</p>` : heading;
  }).join('');
  view.innerHTML = pageWrap(`<div class="prose">${body}</div>`);
}

function renderPeople(view, data) {
  const items = (data.people || []).map((p) => `
    <li class="person">
      <h2 class="person__name">${esc(p.name)}</h2>
      ${p.bio ? `<p class="person__bio">${esc(t(p.bio))}</p>` : ''}
      ${p.link ? `<a class="person__link" href="${esc(p.link)}" target="_blank" rel="noopener">web ↗</a>` : ''}
    </li>`).join('');
  view.innerHTML = pageWrap(`<ul class="people">${items}</ul>`);
}

function renderJournal(view, data) {
  const arts = (data.articles || []).map((a) => {
    const paras = (t(a.body) || []);
    const body = (Array.isArray(paras) ? paras : [paras]).map((p) => `<p>${esc(p)}</p>`).join('');
    return `<article class="article">
      <p class="article__meta">${esc(a.author || '')}</p>
      <h2 class="article__title">${esc(t(a.title))}</h2>
      ${a.date ? `<p class="article__date">${esc(a.date)}</p>` : ''}
      <div class="prose">${body}</div>
    </article>`;
  }).join('');
  view.innerHTML = pageWrap(`<div class="journal">${arts}</div>`);
}

function renderShop(view, data) {
  const cur = data.currency || '€';
  const cards = (data.products || []).map((p, i) => {
    const img = imagesOf(p)[0];
    const price = (p.price != null) ? `${p.price}${cur}` : '—';
    return `<button class="product" type="button" data-i="${i}">
      <div class="product__media">${img ? `<img src="${esc(img)}" alt="${esc(p.title)}" loading="lazy">` : ''}</div>
      <div class="product__row">
        <div class="product__info">
          ${p.editorial ? `<span class="product__editorial">${esc(p.editorial)}</span>` : ''}
          <span class="product__title">${esc(p.title)}</span>
          ${p.author ? `<span class="product__author">${esc(p.author)}</span>` : ''}
        </div>
        <span class="product__price">${esc(price)}</span>
      </div>
    </button>`;
  }).join('');
  view.innerHTML = pageWrap(`<div class="shop">${cards}</div>`);
  view.querySelectorAll('.product').forEach((b) =>
    b.addEventListener('click', () => openProductModal(data.products[+b.dataset.i], cur)));
}

function openProductModal(p, cur) {
  const img = imagesOf(p)[0];
  const price = (p.price != null) ? `${p.price}${cur}` : 'preu a confirmar';
  openModal(`
    ${img ? `<img src="${esc(img)}" alt="${esc(p.title)}">` : ''}
    <h2 class="m-title" id="modal-title">${esc(p.title)}</h2>
    ${p.author ? `<p class="m-person">${esc(p.author)}</p>` : ''}
    ${p.editorial ? `<p class="m-when">${esc(p.editorial)}</p>` : ''}
    ${p.description ? `<p class="m-desc">${esc(t(p.description))}</p>` : ''}
    <p class="m-price">${esc(price)}</p>
    <button class="m-buy" type="button" disabled title="Pròximament">afegir al carret · pròximament</button>
  `);
}

function renderContact(view) {
  const c = (SITE && SITE.contact) || {};
  const addr = (c.address || []).map(esc).join('<br>');
  view.innerHTML = pageWrap(`
    <div class="contact">
      <svg class="contact__doodle" viewBox="0 0 390 600" preserveAspectRatio="none" aria-hidden="true">
        <path d="M -10 250 Q 18 233 48 244 Q 74 253 96 213 Q 138 152 200 140 Q 268 154 400 212"/>
        <path d="M -10 470 Q 92 497 192 489 Q 292 481 400 448"/>
      </svg>
      <div class="contact__info">
        ${addr ? `<p class="contact__addr">${addr}</p>` : ''}
        ${c.email ? `<p class="contact__email"><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></p>` : ''}
        ${c.instagram ? `<p class="contact__ig"><a href="${esc(c.instagram)}" target="_blank" rel="noopener">Instagram ↗</a></p>` : ''}
      </div>
    </div>`);
}

function renderCart(view) {
  view.innerHTML = pageWrap(`<div class="cart"><p class="cart__empty">el teu carret és buit</p></div>`);
}

/* ============================================================
   MODAL
   ============================================================ */
function openModal(html) {
  $('#modal-body').innerHTML = html;
  $('#modal').hidden = false;
  document.body.classList.add('no-scroll');
}
function closeModal() {
  $('#modal').hidden = true;
  if (!isMenuOpen()) document.body.classList.remove('no-scroll');
}

/* ============================================================
   MENÚ
   ============================================================ */
const isMenuOpen = () => $('#menu').classList.contains('is-open');
function openMenu() {
  $('#menu').classList.add('is-open');
  $('#menu').setAttribute('aria-hidden', 'false');
  $('#open-menu').setAttribute('aria-expanded', 'true');
  document.body.classList.add('no-scroll');
}
function closeMenu() {
  $('#menu').classList.remove('is-open');
  $('#menu').setAttribute('aria-hidden', 'true');
  $('#open-menu').setAttribute('aria-expanded', 'false');
  if ($('#modal').hidden) document.body.classList.remove('no-scroll');
}

function buildMenu() {
  const list = $('#menu-list');
  list.innerHTML = SITE.sections.map((s) =>
    `<li><a href="#${s.id}" data-id="${s.id}">${esc(t(s.label))}</a></li>`).join('');
  list.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => closeMenu()));

  const langs = $('#menu-langs');
  langs.innerHTML = (SITE.languages || ['ca']).map((l) => {
    const lbl = l === 'ca' ? 'cat' : l;
    return `<button type="button" data-lang="${l}"${l === LANG ? ' class="is-active"' : ''}>${lbl}</button>`;
  }).join('');
  langs.querySelectorAll('button').forEach((b) =>
    b.addEventListener('click', () => setLang(b.dataset.lang)));
}

function setLang(lang) {
  LANG = lang;
  document.documentElement.lang = lang;
  buildMenu();               // re-etiqueta menú + estado activo de idioma
  renderRoute();             // re-renderiza la sección actual
  syncActive();
}

/* ============================================================
   ROUTER
   ============================================================ */
function currentId() {
  const id = location.hash.replace(/^#/, '');
  return SITE.sections.some((s) => s.id === id) ? id : SITE.sections[0].id;
}

function syncActive() {
  const id = currentId();
  $('#menu-list').querySelectorAll('a').forEach((a) =>
    a.classList.toggle('is-active', a.dataset.id === id));
}

const FADE_MS = 180;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function renderRoute() {
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

/* ============================================================
   ARRANQUE
   ============================================================ */
async function init() {
  try {
    SITE = await loadJSON(CONFIG_URL);
  } catch (err) {
    $('#view').innerHTML = `<p class="loading">no s'ha pogut carregar la configuració<br><small>${esc(err.message)}</small></p>`;
    return;
  }
  LANG = SITE.defaultLang || 'ca';
  if (SITE.site && SITE.site.studio) $('#bar-studio').textContent = SITE.site.studio;

  // expone la paleta de data.json como custom properties --color-<clau>, por si el CSS necesita usarla
  Object.entries(SITE.palette || {}).forEach(([key, hex]) =>
    document.documentElement.style.setProperty(`--color-${key}`, hex));

  buildMenu();

  $('#open-menu').addEventListener('click', openMenu);
  $('#close-menu').addEventListener('click', closeMenu);
  document.querySelectorAll('[data-close]').forEach((x) => x.addEventListener('click', closeModal));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (!$('#modal').hidden) closeModal(); else if (isMenuOpen()) closeMenu(); }
  });

  window.addEventListener('hashchange', renderRoute);
  if (!location.hash) location.replace('#' + SITE.sections[0].id);
  renderRoute();
}
document.addEventListener('DOMContentLoaded', init);
