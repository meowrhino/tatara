/* ============================================================
   TAT ARA — secciones de contenido
   Renderizadores de las páginas no-agenda: nosaltres (text), artistes
   (people), diari (journal), botiga (shop), contacte y carret.
   Cada una recibe (view, data) y escribe view.innerHTML.
   ============================================================ */

import { esc, t, ui, imagesOf, richText } from './utils.js';
import { parseDate, dMes, sameDay } from './dates.js';
import { SITE } from './state.js';
import { openModal, closeModal, openLightbox } from './modal.js';
import { loadJSON } from './data.js';
import { hashQuery } from './router.js';
import { getCart, addToCart, setQty, removeItem, clearCart } from './cart.js';

/* ---------- botiga: helpers de compra ----------
   Un producto es comprable si tiene precio (los price:null van en "pròximament")
   y, si conocemos el stock vivo (GET /api/stock), le queda alguna unidad.
   Si la API no responde (preview estático), no bloqueamos: el backend revalida. */
const comprable = (p) => p && p.activo !== false && typeof p.price === 'number' && p.price > 0;

const stockDe = (stockMap, id) => {
  if (!stockMap || !stockMap[String(id)]) return null; // desconocido
  return Object.values(stockMap[String(id)]).reduce((a, b) => a + Number(b || 0), 0);
};

async function fetchStockMap() {
  try {
    const res = await fetch('/api/stock');
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch {
    return null; // sin backend (preview estático): stock desconocido
  }
}

// Envoltorio común de las páginas de contenido. La marca ya no se repite aquí:
// vive en el marco fijo TAT (header) · ARA (footer).
function pageWrap(inner) {
  return `<div class="page">${inner}</div>`;
}

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
          ? `<a class="link-inline" href="#${esc(b.link)}">${esc(title)}</a>`
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
      ? `<div class="prose__gallery">` + b.images.map((src) =>
          `<button class="prose__shot" type="button" data-src="${esc(src)}" aria-label="${esc(ui('enlargeImage'))}">` +
          `<img src="${esc(src)}" alt="${esc(t(b.alt) || '')}" loading="lazy"></button>`).join('') + `</div>`
      : '';
    return heading + para + gente + img + gal;
  }).join('');
  view.innerHTML = pageWrap(`<div class="prose">${body}</div>`);

  view.querySelectorAll('.prose__shot').forEach((b) =>
    b.addEventListener('click', () => openLightbox(b.dataset.src, b.querySelector('img').alt)));
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

// Identificador de la ficha en la URL (#exposicions?expo=anna-dot), sacado del
// nombre: así el JSON no necesita un campo más y el botón de atrás funciona.
const slugOf = (p) => p.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// "ANNA DOT, Pàteres de llet": el artista en mayúscula, la expo tal cual.
const expoLine = (p) => `<span class="person__name">${esc(p.name)}</span>` +
  (t(p.expo) ? `, ${esc(t(p.expo))}` : '') +
  (p.role ? ` <span class="person__role">${esc(p.role)}</span>` : '');

export function renderPeople(view, data) {
  const people = data.people || [];
  const slug = hashQuery().get('expo');
  const open = slug && people.find((p) => p && !p.spacer && slugOf(p) === slug);
  if (open) { view.innerHTML = pageWrap(expoDetail(open, '#' + view.dataset.section)); return; }

  const items = people.map((p) => {
    // Separación entre grupos: un item { "spacer": true } en el JSON deja aire.
    if (p && p.spacer) return `<li class="person-spacer" aria-hidden="true"></li>`;
    return personHasDetail(p)
      ? `<li class="person"><a href="#${esc(view.dataset.section)}?expo=${slugOf(p)}">${expoLine(p)}</a></li>`
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
  const gallery = imagesOf(p).map((src) => `<img src="${esc(src)}" alt="${esc(t(p.expo) || p.name)}" loading="lazy">`).join('');
  const texto = t(p.text), bio = t(p.bio), fecha = rangoExpo(p.date);
  return `<article class="expo">
    <a class="expo__close" href="${esc(back)}" aria-label="${esc(ui('close'))}">
      <svg viewBox="0 0 40 40" aria-hidden="true"><path d="M6 6 L34 34 M34 6 L6 34" fill="none" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke"/></svg>
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

export function renderShop(view, data) {
  const cur = data.currency || '€';
  const cards = (data.products || []).map((p, i) => {
    const img = imagesOf(p)[0];
    const price = (p.price != null) ? `${p.price}${cur}` : '—';
    // Dos bloques de texto: a la izquierda título/autor/editorial, a la derecha
    // solo el precio. Así nunca cae texto debajo del precio.
    return `<button class="product" type="button" data-i="${i}">
      ${img ? `<img class="product__img" src="${esc(img)}" alt="${esc(t(p.title))}" loading="lazy">` : ''}
      <span class="product__info">
        <span class="product__text">
          <span class="product__title">${esc(t(p.title))}</span>
          ${p.author ? `<span>${esc(p.author)}</span>` : ''}
          ${p.editorial ? `<span>${esc(p.editorial)}</span>` : ''}
        </span>
        <span class="product__price">${esc(price)}</span>
      </span>
    </button>`;
  }).join('');
  view.innerHTML = pageWrap(`<div class="shop">${cards}</div>`);

  // El stock vivo llega en paralelo; el modal lo consulta al abrirse.
  const stockPromise = fetchStockMap();
  view.querySelectorAll('.product').forEach((b) =>
    b.addEventListener('click', async () =>
      openProductModal(data.products[+b.dataset.i], cur, await stockPromise)));
}

function openProductModal(p, cur, stockMap) {
  const img = imagesOf(p)[0];
  const price = (p.price != null) ? `${p.price}${cur}` : ui('priceTbc');

  let buy;
  if (!comprable(p)) {
    buy = `<button class="m-buy" type="button" disabled title="${esc(ui('comingSoon'))}">${esc(ui('addToCartSoon'))}</button>`;
  } else if (stockDe(stockMap, p.id) === 0) {
    buy = `<button class="m-buy" type="button" disabled>${esc(ui('soldOut'))}</button>`;
  } else {
    buy = `<button class="m-buy" type="button" data-add="${esc(p.id)}">${esc(ui('addToCart'))}</button>`;
  }

  openModal(`
    ${img ? `<img src="${esc(img)}" alt="${esc(t(p.title))}">` : ''}
    <h2 class="m-title" id="modal-title">${esc(t(p.title))}</h2>
    ${p.author ? `<p class="m-person">${esc(p.author)}</p>` : ''}
    ${p.editorial ? `<p class="m-when">${esc(p.editorial)}</p>` : ''}
    ${p.description ? `<p class="m-desc">${esc(t(p.description))}</p>` : ''}
    <p class="m-price">${esc(price)}</p>
    ${buy}
  `);

  const btn = document.querySelector('#modal-body [data-add]');
  btn?.addEventListener('click', () => {
    addToCart(p.id, 1);
    btn.textContent = ui('addedToCart');
    setTimeout(closeModal, 650);
  });
}

export function renderContact(view) {
  const c = (SITE && SITE.contact) || {};
  const addr = (c.address || []).map(esc).join('<br>');
  // La línea de enlaces del pie sale de data.json → contact.links, para que
  // añadir uno (o poner por fin la URL del Instagram) no obligue a tocar código.
  // Un enlace interno ("#newsletter") se queda en la pestaña; uno externo la abre
  // aparte; y sin url se pinta igual pero inerte.
  const link = ({ label, url }) => {
    const interno = typeof url === 'string' && url.startsWith('#');
    return `<a href="${esc(url || '#')}"${url && !interno ? ' target="_blank" rel="noopener"' : ''}>${esc(t(label))}</a>`;
  };
  view.innerHTML = pageWrap(`
    <div class="contact">
      ${c.intro ? `<p class="contact__intro">${esc(t(c.intro))}</p>` : ''}
      <img class="contact__axo" src="assets/img/axo_tatara.svg" alt="" aria-hidden="true">
      <div class="contact__info">
        ${addr ? `<p class="contact__addr">${addr}</p>` : ''}
        ${c.email ? `<p class="contact__email"><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></p>` : ''}
        <p class="contact__links">${(c.links || []).map(link).join(' ')}</p>
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

export async function renderCart(view) {
  // Vuelta de Stripe: #carret?gracies=1&session_id=… → confirmar el pago con el
  // backend antes de vaciar nada (visitar la URL a pelo no borra el carrito).
  const params = hashQuery();
  if (params.get('gracies') && params.get('session_id')) {
    try {
      const res = await fetch(`/api/session-status?session_id=${encodeURIComponent(params.get('session_id'))}`);
      const d = await res.json();
      if (d.payment_status === 'paid' || d.status === 'complete') {
        clearCart();
        history.replaceState(null, '', '#carret');
        view.innerHTML = pageWrap(`<div class="cart cart--thanks">
          <h2 class="cart__thanks-title">${esc(ui('thanksTitle'))}</h2>
          <p>${esc(ui('thanksBody'))}</p>
          ${d.email ? `<p class="cart__receipt">${esc(ui('receiptTo'))} <strong>${esc(d.email)}</strong></p>` : ''}
          <p><a href="#botiga">← ${esc(ui('keepShopping'))}</a></p>
        </div>`);
        return;
      }
    } catch { /* API caída: seguimos al carrito normal sin vaciar */ }
    history.replaceState(null, '', '#carret');
  }

  const [data, envios] = await Promise.all([
    loadJSON('data/botiga.json'),
    loadJSON('data/envios.json').catch(() => []),
  ]);
  const cur = data.currency || '€';
  const productos = data.products || [];
  // Solo ítems que sigan existiendo y siendo comprables en el catálogo actual.
  const items = getCart()
    .map((it) => ({ ...it, p: productos.find((p) => String(p.id) === String(it.id)) }))
    .filter((it) => comprable(it.p));

  if (!items.length) {
    view.innerHTML = pageWrap(`<div class="cart"><p class="cart__empty">${esc(ui('cartEmpty'))}</p>
      <p class="cart__back"><a href="#botiga">← ${esc(ui('keepShopping'))}</a></p></div>`);
    return;
  }

  const total = items.reduce((s, it) => s + it.p.price * it.cantidad, 0);
  const rows = items.map((it) => {
    const img = imagesOf(it.p)[0];
    return `<div class="cart-item" data-id="${esc(it.id)}">
      ${img ? `<img class="cart-item__img" src="${esc(img)}" alt="">` : '<span></span>'}
      <span class="cart-item__title">${esc(t(it.p.title))}</span>
      <input class="cart-item__qty" type="number" min="0" step="1" value="${it.cantidad}"
        aria-label="${esc(ui('quantity'))}" data-qty>
      <span class="cart-item__price">${esc(String(it.p.price * it.cantidad))}${esc(cur)}
        <button class="cart-item__remove" type="button" data-remove aria-label="${esc(ui('removeItem'))}">×</button>
      </span>
    </div>`;
  }).join('');

  // Selector de zona solo si hay envíos configurados (data/envios.json no vacío).
  const zonas = Array.isArray(envios) ? envios : [];
  const envioHTML = zonas.length ? `
    <label class="cart__zone">${esc(ui('shippingZone'))}
      <select data-zona>${zonas.map((z) =>
        `<option value="${esc(z.zona)}">${esc(t(z.nombre) || z.zona)}</option>`).join('')}</select>
    </label>
    <p class="cart__zone-note">${esc(ui('shippingAtPay'))}</p>` : '';

  view.innerHTML = pageWrap(`<div class="cart cart--full">
    <div class="cart-items">${rows}</div>
    <div class="cart__total"><span>${esc(ui('total'))}</span><span>${esc(String(total))}${esc(cur)}</span></div>
    ${envioHTML}
    <button class="m-buy cart__pay" type="button" data-pay>${esc(ui('checkout'))}</button>
    <p class="cart__feedback" data-feedback></p>
    <p class="cart__back"><a href="#botiga">← ${esc(ui('keepShopping'))}</a></p>
  </div>`);

  view.querySelectorAll('.cart-item').forEach((row) => {
    const id = row.dataset.id;
    row.querySelector('[data-qty]').addEventListener('change', (e) => { setQty(id, e.target.value); renderCart(view); });
    row.querySelector('[data-remove]').addEventListener('click', () => { removeItem(id); renderCart(view); });
  });

  view.querySelector('[data-pay]').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const feedback = view.querySelector('[data-feedback]');
    btn.disabled = true;
    feedback.textContent = '';
    try {
      const body = { carrito: items.map((it) => ({ id: it.id, cantidad: it.cantidad })) };
      const zonaSel = view.querySelector('[data-zona]');
      if (zonaSel) body.envio = { zona: zonaSel.value };
      const res = await fetch('/api/crear-sesion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (res.status === 503) { feedback.textContent = ui('checkoutSoon'); return; }
      if (!res.ok) { feedback.textContent = d.error || ui('genericError'); return; }
      window.location.href = d.url;
    } catch {
      feedback.textContent = ui('genericError');
    } finally {
      btn.disabled = false;
    }
  });
}
