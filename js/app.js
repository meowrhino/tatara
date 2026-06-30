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
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const daysBetween = (a, b) => Math.round((b - a) / 86400000) + 1;   // inclusivo
const dm = (d) => `${d.getDate()}/${d.getMonth() + 1}`;             // 2/7
const dMes = (d) => `${d.getDate()} ${MONTHS_CA[d.getMonth()]}`;    // 2 juliol

function rangeSlash(ev) {
  const s = parseDate(ev.start), e = ev.end ? parseDate(ev.end) : s;
  if (sameDay(s, e)) return dm(s) + (ev.time ? ` · ${ev.time}` : '');
  return `${dm(s)} – ${dm(e)}`;
}
function rangeWords(ev) {
  const s = parseDate(ev.start), e = ev.end ? parseDate(ev.end) : s;
  let r = sameDay(s, e) ? dMes(s) : `${dMes(s)} – ${dMes(e)}`;
  if (ev.time) r += ` · ${ev.time}`;
  return r;
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

  events.forEach((ev, i) => {
    if (i > 0) strip.appendChild(gapBlock(gapVh));
    strip.appendChild(eventBlock(ev, { dayVh, minVh, compactMax, mediaMin, endMin }));
  });
  view.appendChild(strip);
}

function gapBlock(gapVh) {
  const gap = el('div', 'seg seg--gap');
  gap.style.minHeight = `${gapVh}dvh`;
  gap.appendChild(el('span', 'tatara', 'TAT ARA'));
  return gap;
}

const ORKIND = new Set(['conversa', 'lectura', 'sessio', 'taller', 'esdeveniment']);
const orLabel = (ev) => (ORKIND.has(ev.kind) ? 'O.R. ' : '') + (KIND_CA[ev.kind] || '');

function eventBlock(ev, o) {
  const s = parseDate(ev.start), e = ev.end ? parseDate(ev.end) : s;
  const days = Math.max(1, daysBetween(s, e));
  const children = ev.children || [];
  const compact = days <= o.compactMax && !children.length;

  const color = resolveColor(ev.color);
  const block = el('div', 'seg seg--event' + (compact ? ' seg--compact' : ''));
  block.style.minHeight = `max(${o.minVh}dvh, ${days * o.dayVh}dvh)`;
  block.style.background = color;
  block.style.color = textOn(color);
  block.dataset.id = ev.id;

  const head = el('button', 'seg__head');
  head.type = 'button';
  head.appendChild(el('div', 'seg__label',
    `<span class="seg__who">${esc(t(ev.title))}${ev.person ? ' – <b>' + esc(ev.person) + '</b>' : ''}</span>` +
    `<span class="seg__when">${esc(rangeSlash(ev))}</span>`));
  head.addEventListener('click', () => openEventModal(ev));
  block.appendChild(head);

  if (!compact) {
    const imgs = imagesOf(ev);
    if (days >= o.mediaMin && imgs.length) {
      const media = el('div', 'seg__media');
      const img = el('img');
      img.src = imgs[0]; img.alt = t(ev.title); img.loading = 'lazy';
      media.appendChild(img);
      block.appendChild(media);
    }
  }

  if (children.length) {
    const list = el('ul', 'seg__children');
    children.slice().sort((a, b) => parseDate(a.start) - parseDate(b.start)).forEach((c) => {
      const li = el('li');
      const btn = el('button', 'seg__child');
      btn.type = 'button';
      btn.innerHTML =
        `<span class="seg__child-name">${esc(orLabel(c))} · ${esc(t(c.title))}${c.person ? ' – <b>' + esc(c.person) + '</b>' : ''}</span>` +
        `<span class="seg__child-when">${esc(rangeSlash(c))}</span>`;
      btn.addEventListener('click', () => openEventModal(c));
      li.appendChild(btn);
      list.appendChild(li);
    });
    block.appendChild(list);
  }

  if (!compact && days >= o.endMin && ev.end && !sameDay(s, e)) {
    block.appendChild(el('span', 'seg__end', esc(dMes(e))));
  }

  return block;
}

function openEventModal(ev) {
  const imgs = imagesOf(ev);
  openModal(`
    ${imgs[0] ? `<img src="${esc(imgs[0])}" alt="${esc(t(ev.title))}">` : ''}
    <p class="m-when">${esc(rangeWords(ev))}${ev.kind ? ' · ' + esc(KIND_CA[ev.kind] || ev.kind) : ''}</p>
    <h2 class="m-title" id="modal-title">${esc(t(ev.title))}</h2>
    ${ev.person ? `<p class="m-person">${esc(ev.person)}</p>` : ''}
    ${ev.description ? `<p class="m-desc">${esc(t(ev.description))}</p>` : ''}
  `);
}

/* ============================================================
   SECCIONES DE CONTENIDO
   ============================================================ */
function pageWrap(inner) {
  return `<div class="page">
    <h1 class="page__wordmark wordmark">TAT ARA</h1>
    ${inner}
    <p class="page__wordmark page__wordmark--foot wordmark">TAT ARA</p>
  </div>`;
}

function renderText(view, data) {
  const blocks = (t(data.body) || []);
  const body = (Array.isArray(blocks) ? blocks : [blocks]).map((b) => {
    if (typeof b === 'string') return `<p>${esc(b)}</p>`;
    const heading = b.heading ? `<h2 class="prose__heading">${esc(t(b.heading))}</h2>` : '';
    return `${heading}<p>${esc(b.text)}</p>`;
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
