/* ============================================================
   TAT ARA — utilidades genéricas
   Helpers de DOM, escapado, wordmark, i18n y extracción de imágenes.
   Sin estado propio salvo la lectura de LANG (binding vivo de state.js).
   ============================================================ */

import { LANG } from './state.js';

/* ---------- idioma ---------- */
const MONTHS = {
  ca: ['gener', 'febrer', 'març', 'abril', 'maig', 'juny',
       'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre'],
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
       'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June',
       'July', 'August', 'September', 'October', 'November', 'December'],
};
export const monthName = (i) => (MONTHS[LANG] || MONTHS.ca)[i];

const KINDS = {
  exposicio:    { ca: 'Exposició', es: 'Exposición', en: 'Exhibition' },
  conversa:     { ca: 'Conversa', es: 'Conversación', en: 'Conversation' },
  esdeveniment: { ca: 'Esdeveniment', es: 'Evento', en: 'Event' },
  taller:       { ca: 'Taller', es: 'Taller', en: 'Workshop' },
  lectura:      { ca: 'Lectura', es: 'Lectura', en: 'Reading' },
  sessio:       { ca: 'Sessió d’escolta', es: 'Sesión de escucha', en: 'Listening session' },
};
export const kindLabel = (k) => t(KINDS[k]);

// Cadenas de interfaz (todo lo que no viene de los JSON de contenido).
// Mismo formato {ca, es, en} que resuelve t() con el idioma activo.
const STR = {
  today:          { ca: 'avui', es: 'hoy', en: 'today' },
  noEvents:       { ca: 'sense esdeveniments', es: 'sin eventos', en: 'no events' },
  enlargeImage:   { ca: 'Ampliar imatge', es: 'Ampliar imagen', en: 'Enlarge image' },
  enlargedImage:  { ca: 'Imatge ampliada', es: 'Imagen ampliada', en: 'Enlarged image' },
  cartEmpty:      { ca: 'el teu carret és buit', es: 'tu carrito está vacío', en: 'your cart is empty' },
  priceTbc:       { ca: 'preu a confirmar', es: 'precio a confirmar', en: 'price to be confirmed' },
  comingSoon:     { ca: 'Pròximament', es: 'Próximamente', en: 'Coming soon' },
  addToCartSoon:  { ca: 'afegir al carret · pròximament', es: 'añadir al carrito · próximamente', en: 'add to cart · coming soon' },
  addToCart:      { ca: 'afegir al carret', es: 'añadir al carrito', en: 'add to cart' },
  addedToCart:    { ca: 'afegit al carret ✓', es: 'añadido al carrito ✓', en: 'added to cart ✓' },
  soldOut:        { ca: 'exhaurit', es: 'agotado', en: 'sold out' },
  quantity:       { ca: 'quantitat', es: 'cantidad', en: 'quantity' },
  removeItem:     { ca: 'treure del carret', es: 'quitar del carrito', en: 'remove from cart' },
  total:          { ca: 'total', es: 'total', en: 'total' },
  checkout:       { ca: 'tramitar la compra', es: 'tramitar la compra', en: 'checkout' },
  checkoutSoon:   { ca: 'la botiga online obrirà molt aviat', es: 'la tienda online abrirá muy pronto', en: 'the online shop opens very soon' },
  shippingZone:   { ca: "zona d'enviament", es: 'zona de envío', en: 'shipping zone' },
  shippingAtPay:  { ca: "l'enviament es calcula al pagament", es: 'el envío se calcula en el pago', en: 'shipping is calculated at payment' },
  keepShopping:   { ca: 'seguir comprant', es: 'seguir comprando', en: 'keep shopping' },
  thanksTitle:    { ca: 'gràcies!', es: '¡gracias!', en: 'thank you!' },
  thanksBody:     { ca: 'la teva comanda està confirmada. t’escriurem aviat.', es: 'tu pedido está confirmado. te escribiremos pronto.', en: 'your order is confirmed. we’ll be in touch soon.' },
  receiptTo:      { ca: 'rebut enviat a', es: 'recibo enviado a', en: 'receipt sent to' },
  genericError:   { ca: 'alguna cosa ha fallat', es: 'algo ha fallado', en: 'something went wrong' },
  loadError:      { ca: "no s'ha pogut carregar", es: 'no se ha podido cargar', en: 'could not load' },
  configError:    { ca: "no s'ha pogut carregar la configuració", es: 'no se ha podido cargar la configuración', en: 'could not load the configuration' },
  unknownSection: { ca: 'secció desconeguda', es: 'sección desconocida', en: 'unknown section' },
};
export const ui = (k) => t(STR[k]);

/* ---------- DOM ---------- */
export const $ = (sel, root = document) => root.querySelector(sel);
export const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };

// Guarda el elemento con foco y devuelve una función que lo restaura. Se usa al
// abrir overlays (menú, modal, lightbox) para devolver el foco a quien los abrió
// cuando se cierran — accesibilidad de teclado.
export const captureFocus = () => {
  const prev = document.activeElement;
  return () => { if (prev && typeof prev.focus === 'function') prev.focus(); };
};

/* ---------- texto ---------- */
export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const wordmark = (s) => s.split('').map((c) => `<span>${c === ' ' ? '&nbsp;' : esc(c)}</span>`).join('');

// Resuelve un campo traducible: string suelto, o objeto {ca, es, en}. Cae al
// idioma activo, luego a 'ca', luego al primer valor disponible.
export const t = (f) => f == null ? '' : (typeof f === 'string' ? f : (f[LANG] || f.ca || Object.values(f)[0] || ''));

// Normaliza el campo de imágenes: prioriza 'images' (array) y cae a 'image'.
export const imagesOf = (x) => x.images && x.images.length ? x.images : (x.image ? [x.image] : []);
