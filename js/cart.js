/* ============================================================
   TAT ARA — carret
   Carrito en localStorage ('tatara:cart'). Guarda solo [{id, cantidad}]:
   título y precio se resuelven SIEMPRE contra data/edicions.json al pintar
   (y el backend los revalida contra su copia — el cliente nunca manda precios).
   Emite 'tatara:cart' en cada cambio; el menú actualiza su contador.
   ============================================================ */

const CART_KEY = 'tatara:cart';

export function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
  catch { return []; }
}

function setCart(items) {
  try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch { /* sin storage */ }
  document.dispatchEvent(new CustomEvent('tatara:cart'));
}

export const cartCount = () =>
  getCart().reduce((n, it) => n + (Number(it.cantidad) || 0), 0);

export function addToCart(id, cantidad = 1) {
  const cart = getCart();
  const item = cart.find((it) => it.id === id);
  if (item) item.cantidad = (Number(item.cantidad) || 0) + cantidad;
  else cart.push({ id, cantidad });
  setCart(cart);
}

/** Fija la cantidad de un ítem; 0 o menos lo elimina. */
export function setQty(id, n) {
  const cantidad = Math.max(0, Math.floor(Number(n) || 0));
  setCart(getCart().map((it) => (it.id === id ? { ...it, cantidad } : it)).filter((it) => it.cantidad > 0));
}

export const removeItem = (id) => setCart(getCart().filter((it) => it.id !== id));
export const clearCart = () => setCart([]);

/** Contador del carrito. El principal es el número junto al icono del header;
 *  si además existe la entrada "carret" en el menú, le añade el "(n)". Se llama
 *  al construir el menú y en cada cambio de carrito. */
export function updateCartBadge() {
  const n = cartCount();

  const countEl = document.querySelector('#cart-count');
  if (countEl) countEl.textContent = n > 0 ? String(n) : '';

  const link = document.querySelector('#menu-list a[data-id="carret"]');
  if (link) {
    const base = link.textContent.replace(/\s*\(\d+\)$/, '');
    link.textContent = n > 0 ? `${base} (${n})` : base;
  }
}

document.addEventListener('tatara:cart', updateCartBadge);
