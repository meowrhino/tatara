/* ============================================================
   TAT ARA — botiga y carret
   La lista de productos, la ficha de cada uno (modal) y el carret con el
   pago por Stripe. El stock vivo y el pago pasan por la API (/api/*).
   ============================================================ */

import { esc, t, ui, imagesOf, pageWrap } from './utils.js';
import { openModal, closeModal } from './modal.js';
import { loadJSON } from './data.js';
import { query } from './router.js';
import { pathOf } from './state.js';
import { getCart, addToCart, setQty, removeItem, clearCart } from './cart.js';

/* ---------- helpers de compra ----------
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

export async function renderCart(view) {
  // Vuelta de Stripe: /carret/?gracies=1&session_id=… → confirmar el pago con el
  // backend antes de vaciar nada (visitar la URL a pelo no borra el carrito).
  const params = query();
  if (params.get('gracies') && params.get('session_id')) {
    try {
      const res = await fetch(`/api/session-status?session_id=${encodeURIComponent(params.get('session_id'))}`);
      const d = await res.json();
      if (d.payment_status === 'paid' || d.status === 'complete') {
        clearCart();
        history.replaceState(null, '', pathOf('carret'));
        view.innerHTML = pageWrap(`<div class="cart cart--thanks">
          <h2 class="cart__thanks-title">${esc(ui('thanksTitle'))}</h2>
          <p>${esc(ui('thanksBody'))}</p>
          ${d.email ? `<p class="cart__receipt">${esc(ui('receiptTo'))} <strong>${esc(d.email)}</strong></p>` : ''}
          <p><a href="${pathOf('botiga')}">← ${esc(ui('keepShopping'))}</a></p>
        </div>`);
        return;
      }
    } catch { /* API caída: seguimos al carrito normal sin vaciar */ }
    history.replaceState(null, '', pathOf('carret'));
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
      <p class="cart__back"><a href="${pathOf('botiga')}">← ${esc(ui('keepShopping'))}</a></p></div>`);
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
    <p class="cart__back"><a href="${pathOf('botiga')}">← ${esc(ui('keepShopping'))}</a></p>
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
