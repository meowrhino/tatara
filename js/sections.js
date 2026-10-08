/* ============================================================
   TAT ARA — secciones de contenido
   Renderizadores de las páginas de texto (nosaltres, recerca), exposicions,
   contacte y newsletter. Cada una recibe (view, data) y escribe
   view.innerHTML. La botiga y el carret viven en botiga.js.
   ============================================================ */

import { esc, t, ui, imagesOf, richText, zoomImg, pageWrap, X_ICON } from './utils.js';
import { parseDate, dMes, sameDay } from './dates.js';
import { SITE, pathOf } from './state.js';
import { subPath } from './router.js';

/* ---------- nosaltres (y cualquier página de texto) ----------
   Cada bloque de 'body' admite:
     heading  título traducible {ca,es,en}
     link     id de sección → el título se convierte en enlace interno
     text     párrafo traducible; acepta enlaces [etiqueta](id-de-seccion)
     image    ruta de imagen (p. ej. el logo de la Generalitat) + 'alt'
   Los ids válidos son los de data/menu.json, así que la clienta puede
   añadir o mover enlaces editando solo el JSON. */
export function renderText(view, data) {
  const ids = (SITE.sections || []).map((s) => s.id);
  const body = (data.body || []).map((b) => {
    const title = t(b.heading);
    const heading = title
      ? `<h2 class="prose__heading">${b.link && ids.includes(b.link)
          ? `<a class="link-inline" href="${pathOf(b.link)}">${esc(title)}</a>`
          : esc(title)}</h2>`
      : '';
    const text = t(b.text);
    const para = text ? `<p>${richText(text, ids)}</p>` : '';
    const img = b.image
      ? `<p class="prose__img"><img src="${esc(b.image)}" alt="${esc(t(b.alt) || '')}" loading="lazy"></p>`
      : '';
    // 'people': una lista de nombres en línea, enlazados cuando tienen 'link'.
    // La usa recerca para el "Amb: …" del final del texto.
    const gente = (b.people || []).length
      ? `<p class="prose__people">` + b.people.map((p) => p.link
          ? `<a class="link-inline" href="${esc(p.link)}" target="_blank" rel="noopener">${esc(p.name)}</a>`
          : esc(p.name)).join(', ') + `.</p>`
      : '';
    // 'images' (varias) se apilan como galería y se amplían al hacer clic.
    const gal = (b.images || []).length
      ? `<div class="prose__gallery">${b.images.map((src) => zoomImg(src, t(b.alt))).join('')}</div>`
      : '';
    return heading + para + gente + img + gal;
  }).join('');
  view.innerHTML = pageWrap(`<div class="prose">${body}</div>`);
}

// Un artista es "ampliable" (tiene ficha) si tiene algo que enseñar: bio, fotos,
// hoja de sala (PDF) o web. Si no, se lista como nombre a secas.
const personHasDetail = (p) => !!(t(p.bio) || t(p.expo) || t(p.text) || imagesOf(p).length || p.pdf || p.link);

// "17 octubre – 30 novembre" a partir de date {start, end}. Si no hay fechas, cadena vacía.
function rangoExpo(d) {
  if (!d || !d.start) return '';
  const s = parseDate(d.start), e = d.end ? parseDate(d.end) : s;
  return sameDay(s, e) ? dMes(s) : `${dMes(s)} – ${dMes(e)}`;
}

// Identificador de la ficha en la URL (/exposicions/anna-dot/), sacado del
// nombre: así el JSON no necesita un campo más y el botón de atrás funciona.
const slugOf = (p) => p.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// "ANNA DOT, Pàteres de llet": el artista en mayúscula, la expo tal cual.
const expoLine = (p) => `<span class="person__name">${esc(p.name)}</span>` +
  (t(p.expo) ? `, ${esc(t(p.expo))}` : '') +
  (p.role ? ` <span class="person__role">${esc(p.role)}</span>` : '');

export function renderPeople(view, data) {
  const people = data.people || [];
  const id = view.dataset.section;
  const slug = subPath();
  const open = slug && people.find((p) => p && !p.spacer && slugOf(p) === slug);
  if (open) {
    view.innerHTML = pageWrap(expoDetail(open, pathOf(id)));
    document.title = `${[open.name, t(open.expo)].filter(Boolean).join(', ')} — ${SITE.site.name}`;
    return;
  }

  const items = people.map((p) => {
    // Separación entre grupos: un item { "spacer": true } en el JSON deja aire.
    if (p && p.spacer) return `<li class="person-spacer" aria-hidden="true"></li>`;
    return personHasDetail(p)
      ? `<li class="person"><a href="${pathOf(id, slugOf(p))}">${expoLine(p)}</a></li>`
      : `<li class="person">${expoLine(p)}</li>`;
  }).join('');
  view.innerHTML = pageWrap(`<ul class="people">${items}</ul>`);
}

// La ficha se abre dentro de la columna, no en una ventana: cruz grande arriba a
// la derecha (vuelve a la lista), título subrayado, fecha, texto, fotos apiladas
// (scroll simple hacia abajo), bio y web/PDF.
function expoDetail(p, back) {
  // pdf admite un string, un objeto {url, label} o un array de cualquiera de ambos.
  const pdfs = Array.isArray(p.pdf) ? p.pdf : (p.pdf ? [p.pdf] : []);
  const pdfLinks = pdfs.map((pdf) => {
    const url = typeof pdf === 'string' ? pdf : pdf.url;
    const label = (pdf && pdf.label) ? t(pdf.label) : ui('roomSheet');
    return url ? `<p><a href="${esc(url)}" target="_blank" rel="noopener" download>${esc(label)} ↓</a></p>` : '';
  }).join('');
  const gallery = imagesOf(p).map((src) => zoomImg(src, t(p.expo) || p.name)).join('');
  const texto = t(p.text), bio = t(p.bio), fecha = rangoExpo(p.date);
  return `<article class="expo">
    <a class="expo__close" href="${esc(back)}" aria-label="${esc(ui('close'))}">
      ${X_ICON}
    </a>
    <h1 class="expo__title">${expoLine(p)}</h1>
    ${fecha ? `<p>${esc(fecha)}</p>` : ''}
    ${texto ? `<p>${esc(texto)}</p>` : ''}
    ${gallery}
    ${bio ? `<p>${esc(bio)}</p>` : ''}
    ${p.link ? `<p><a href="${esc(p.link)}" target="_blank" rel="noopener">${esc(ui('websiteLink'))} ↗</a></p>` : ''}
    ${pdfLinks}
  </article>`;
}

export function renderContact(view) {
  const c = (SITE && SITE.contact) || {};
  const addr = (c.address || []).map(esc).join('<br>');
  // La línea de enlaces del pie sale de data.json → contact.links, para que
  // añadir uno (o poner por fin la URL del Instagram) no obligue a tocar código.
  // Un enlace interno ("#newsletter": el id de una sección) se queda en la
  // pestaña; uno externo la abre aparte; y sin url se pinta igual pero inerte.
  const link = ({ label, url }) => {
    if (!url) return `<a>${esc(t(label))}</a>`;
    if (url.startsWith('#')) return `<a href="${pathOf(url.slice(1))}">${esc(t(label))}</a>`;
    return `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(t(label))}</a>`;
  };
  view.innerHTML = pageWrap(`
    <div class="contact">
      ${c.intro ? `<p class="contact__intro">${esc(t(c.intro))}</p>` : ''}
      <img class="contact__axo" src="assets/img/axo_tatara.svg" alt="" aria-hidden="true">
      <div class="contact__info">
        ${addr ? `<p class="contact__addr">${addr}</p>` : ''}
        ${c.email ? `<p class="contact__email"><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></p>` : ''}
        <p class="contact__links">${(c.links || []).map(link).join(' ')}</p>
        <p class="contact__credit">web: <a href="https://meowrhino.studio" target="_blank" rel="noopener">meowrhino.studio</a></p>
      </div>
    </div>`);
}

// Newsletter: secció pròpia amb el formulari d'alta (POST /api/newsletter).
export function renderNewsletter(view) {
  view.innerHTML = pageWrap(`
    <div class="newsletter">
      <p class="newsletter__intro">${esc(ui('newsletterIntro'))}</p>
      <form class="newsletter__form" novalidate>
        <input class="newsletter__input" id="nl-email" type="email" inputmode="email" autocomplete="email"
               placeholder="${esc(ui('newsletterPh'))}" aria-label="${esc(ui('newsletterPh'))}" required>
        <button class="newsletter__btn" type="submit">${esc(ui('newsletterCta'))}</button>
      </form>
      <p class="newsletter__feedback" data-nl-feedback aria-live="polite"></p>
    </div>`);

  const form = view.querySelector('.newsletter__form');
  const feedback = view.querySelector('[data-nl-feedback]');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = view.querySelector('#nl-email');
    const btn = form.querySelector('.newsletter__btn');
    feedback.textContent = '';
    btn.disabled = true;
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: input.value.trim() }),
      });
      if (res.ok) { feedback.textContent = ui('newsletterOk'); form.reset(); }
      else { feedback.textContent = ui('newsletterBad'); }
    } catch {
      feedback.textContent = ui('genericError');
    } finally {
      btn.disabled = false;
    }
  });
}
