/* ============================================================
   TAT ARA — secciones de contenido
   Renderizadores de las páginas no-agenda: nosaltres (text), artistes
   (people), diari (journal), botiga (shop), contacte y carret.
   Cada una recibe (view, data) y escribe view.innerHTML.
   ============================================================ */

import { esc, t, ui, wordmark, imagesOf } from './utils.js';
import { SITE } from './state.js';
import { openModal } from './modal.js';

// Envoltorio común: wordmark "TAT ARA" arriba y abajo con el contenido en medio.
function pageWrap(inner) {
  return `<div class="page">
    <h1 class="page__wordmark wordmark">${wordmark('TAT ARA')}</h1>
    ${inner}
    <p class="page__wordmark page__wordmark--foot wordmark">${wordmark('TAT ARA')}</p>
  </div>`;
}

export function renderText(view, data) {
  const blocks = data.body || [];
  const body = blocks.map((b) => {
    const heading = b.heading ? `<h2 class="prose__heading">${esc(t(b.heading))}</h2>` : '';
    const text = t(b.text);
    return text ? `${heading}<p>${esc(text)}</p>` : heading;
  }).join('');
  view.innerHTML = pageWrap(`<div class="prose">${body}</div>`);
}

export function renderPeople(view, data) {
  const items = (data.people || []).map((p) => `
    <li class="person">
      <h2 class="person__name">${esc(p.name)}</h2>
      ${p.bio ? `<p class="person__bio">${esc(t(p.bio))}</p>` : ''}
      ${p.link ? `<a class="person__link" href="${esc(p.link)}" target="_blank" rel="noopener">web ↗</a>` : ''}
    </li>`).join('');
  view.innerHTML = pageWrap(`<ul class="people">${items}</ul>`);
}

export function renderJournal(view, data) {
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

export function renderShop(view, data) {
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
  const price = (p.price != null) ? `${p.price}${cur}` : ui('priceTbc');
  openModal(`
    ${img ? `<img src="${esc(img)}" alt="${esc(p.title)}">` : ''}
    <h2 class="m-title" id="modal-title">${esc(p.title)}</h2>
    ${p.author ? `<p class="m-person">${esc(p.author)}</p>` : ''}
    ${p.editorial ? `<p class="m-when">${esc(p.editorial)}</p>` : ''}
    ${p.description ? `<p class="m-desc">${esc(t(p.description))}</p>` : ''}
    <p class="m-price">${esc(price)}</p>
    <button class="m-buy" type="button" disabled title="${esc(ui('comingSoon'))}">${esc(ui('addToCartSoon'))}</button>
  `);
}

export function renderContact(view) {
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

export function renderCart(view) {
  view.innerHTML = pageWrap(`<div class="cart"><p class="cart__empty">${esc(ui('cartEmpty'))}</p></div>`);
}
