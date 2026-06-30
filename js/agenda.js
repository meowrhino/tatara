/* ============================================================
   TAT ARA — Agenda
   Tira vertical: 1 día = var(--day-vh). Desde HOY hasta HOY+HORIZON.
   Cada evento = bloque de color (label arriba, imágenes dentro,
   fecha fin abajo). Huecos = "TAT ARA" centrado.
   ============================================================ */

const CONFIG = {
  HORIZON_DAYS: 30,
  COMPACT_MAX_DAYS: 2,   // ≤N días: solo etiqueta
  MEDIA_MIN_DAYS: 6,     // ≥N días: muestra imágenes dentro del bloque
  END_MIN_DAYS: 4,       // ≥N días: muestra fecha fin abajo
  DATA_URL: 'data/events.json',
};

const MONTHS_CA = ['gener', 'febrer', 'març', 'abril', 'maig', 'juny',
                   'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre'];
const KIND_CA = { exposicio: 'Exposició', conversa: 'Conversa', esdeveniment: 'Esdeveniment', taller: 'Taller', lectura: 'Lectura', sessio: 'Sessió d’escolta' };

let LANG = 'ca';

/* ---------- fechas (local, sin desfase) ---------- */
const parseDate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (date, n) => { const d = new Date(date); d.setDate(d.getDate() + n); return d; };
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const startOfToday = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const dm = (d) => `${d.getDate()}/${d.getMonth() + 1}`;            // 2/7
const dMes = (d) => `${d.getDate()} ${MONTHS_CA[d.getMonth()]}`;    // 2 juliol

function getStartDate() {
  const o = new URLSearchParams(location.search).get('start');
  return (o && /^\d{4}-\d{2}-\d{2}$/.test(o)) ? parseDate(o) : startOfToday();
}

/* ---------- i18n (cae a 'ca') ---------- */
const t = (f) => f == null ? '' : (typeof f === 'string' ? f : (f[LANG] || f.ca || Object.values(f)[0] || ''));

/* ---------- etiquetas de fecha ---------- */
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
const imagesOf = (ev) => ev.images && ev.images.length ? ev.images : (ev.image ? [ev.image] : []);

/* ---------- contraste ---------- */
function textOn(hex) {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? '#111' : '#fff';
}

/* ---------- días → segmentos ---------- */
function buildSegments(events, start, horizon) {
  const byDay = new Map();
  for (const ev of events) {
    const s = parseDate(ev.start), e = ev.end ? parseDate(ev.end) : s;
    for (let d = new Date(s); d <= e; d = addDays(d, 1)) {
      const k = dayKey(d);
      if (!byDay.has(k)) byDay.set(k, ev);
    }
  }
  const segments = [];
  let cur = null;
  for (let i = 0; i < horizon; i++) {
    const ev = byDay.get(dayKey(addDays(start, i))) || null;
    const id = ev ? ev.id : null;
    if (cur && cur.id === id) cur.days++;
    else { cur = { id, ev, days: 1 }; segments.push(cur); }
  }
  return segments;
}

/* ---------- render ---------- */
function renderStrip(events) {
  const strip = document.getElementById('agenda-strip');
  const segments = buildSegments(events, getStartDate(), CONFIG.HORIZON_DAYS);
  strip.innerHTML = '';
  for (const seg of segments) {
    strip.appendChild(seg.ev ? eventBlock(seg.ev, seg.days) : gapBlock(seg.days));
  }
}

function gapBlock(days) {
  const gap = document.createElement('div');
  gap.className = 'seg seg--gap';
  gap.style.minHeight = `calc(${days} * var(--day-vh))`;
  const span = document.createElement('span');
  span.className = 'tatara';
  span.textContent = 'TAT ARA';
  gap.appendChild(span);
  return gap;
}

function eventBlock(ev, days) {
  const compact = days <= CONFIG.COMPACT_MAX_DAYS;
  const block = document.createElement('button');
  block.type = 'button';
  block.className = 'seg seg--event' + (compact ? ' seg--compact' : '');
  block.style.height = `calc(${days} * var(--day-vh))`;
  block.style.background = ev.color || '#111';
  block.style.color = textOn(ev.color || '#111');
  block.dataset.id = ev.id;

  const label = document.createElement('div');
  label.className = 'seg__label';
  label.innerHTML =
    `<span class="seg__who">${t(ev.title)}${ev.person ? ' – <b>' + ev.person + '</b>' : ''}</span>` +
    `<span class="seg__when">${rangeSlash(ev)}</span>`;
  block.appendChild(label);

  if (!compact) {
    const imgs = imagesOf(ev);
    if (days >= CONFIG.MEDIA_MIN_DAYS && imgs.length) {
      const media = document.createElement('div');
      media.className = 'seg__media';
      imgs.slice(0, 1).forEach((src) => {
        const img = document.createElement('img');
        img.src = src; img.alt = t(ev.title); img.loading = 'lazy';
        media.appendChild(img);
      });
      block.appendChild(media);
    }
    if (days >= CONFIG.END_MIN_DAYS && ev.end && !sameDay(parseDate(ev.start), parseDate(ev.end))) {
      const end = document.createElement('span');
      end.className = 'seg__end';
      end.textContent = dMes(parseDate(ev.end));
      block.appendChild(end);
    }
  }

  block.addEventListener('click', () => openModal(ev));
  return block;
}

/* ---------- modal ---------- */
function openModal(ev) {
  const imgs = imagesOf(ev);
  const body = document.getElementById('event-modal-body');
  body.innerHTML = `
    ${imgs[0] ? `<img src="${imgs[0]}" alt="${t(ev.title)}">` : ''}
    <p class="em-when">${rangeWords(ev)}${ev.kind ? ' · ' + KIND_CA[ev.kind] : ''}</p>
    <h2 class="em-title" id="event-modal-title">${t(ev.title)}</h2>
    ${ev.person ? `<p class="em-person">${ev.person}</p>` : ''}
    ${ev.description ? `<p class="em-desc">${t(ev.description)}</p>` : ''}
    ${ev.demo ? `<p class="em-demo">· esdeveniment de demostració ·</p>` : ''}
  `;
  document.getElementById('event-modal').hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  document.getElementById('event-modal').hidden = true;
  if (document.getElementById('menu').hidden) document.body.style.overflow = '';
}

/* ---------- menú ---------- */
function openMenu() {
  document.getElementById('menu').hidden = false;
  document.getElementById('open-menu').setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}
function closeMenu() {
  document.getElementById('menu').hidden = true;
  document.getElementById('open-menu').setAttribute('aria-expanded', 'false');
  if (document.getElementById('event-modal').hidden) document.body.style.overflow = '';
}

/* ---------- arranque ---------- */
async function init() {
  document.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', closeModal));
  document.getElementById('open-menu').addEventListener('click', openMenu);
  document.getElementById('close-menu').addEventListener('click', closeMenu);
  document.querySelector('#menu [data-nav]').addEventListener('click', closeMenu);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); closeMenu(); } });

  document.querySelectorAll('.menu__langs button').forEach((btn) => {
    btn.addEventListener('click', () => {
      LANG = btn.dataset.lang;
      document.documentElement.lang = LANG;
      document.querySelectorAll('.menu__langs button').forEach((b) => b.classList.toggle('is-active', b === btn));
    });
  });

  try {
    const res = await fetch(CONFIG.DATA_URL, { cache: 'no-store' });
    const data = await res.json();
    renderStrip(data.events || []);
  } catch (err) {
    document.getElementById('agenda-strip').innerHTML =
      `<p class="agenda__loading">no s'ha pogut carregar l'agenda<br><small>${err}</small></p>`;
    console.error(err);
  }
}
document.addEventListener('DOMContentLoaded', init);
