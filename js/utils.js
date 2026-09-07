/* ============================================================
   TAT ARA — utilidades genéricas
   Helpers de DOM, escapado, i18n y extracción de imágenes.
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

// Cadenas de interfaz (todo lo que no viene de los JSON de contenido).
// Mismo formato {ca, es, en} que resuelve t() con el idioma activo.
const STR = {
  today:          { ca: 'avui', es: 'hoy', en: 'today' },
  statusNow:      { ca: 'ara', es: 'ahora', en: 'now' },
  statusPast:     { ca: 'passat', es: 'pasado', en: 'past' },
  statusNext:     { ca: 'proximament', es: 'próximamente', en: 'upcoming' },
  roomSheet:      { ca: 'full de sala (PDF)', es: 'hoja de sala (PDF)', en: 'room sheet (PDF)' },
  websiteLink:    { ca: 'web', es: 'web', en: 'website' },
  noEvents:       { ca: 'sense esdeveniments', es: 'sin eventos', en: 'no events' },
  enlargeImage:   { ca: 'Ampliar imatge', es: 'Ampliar imagen', en: 'Enlarge image' },
  enlargedImage:  { ca: 'Imatge ampliada', es: 'Imagen ampliada', en: 'Enlarged image' },
  close:          { ca: 'Tancar', es: 'Cerrar', en: 'Close' },
  newsletterIntro:{ ca: 'Rep al teu correu les novetats, exposicions i esdeveniments de TAT ARA.', es: 'Recibe en tu correo las novedades, exposiciones y eventos de TAT ARA.', en: 'Get TAT ARA news, exhibitions and events in your inbox.' },
  newsletterPh:   { ca: 'el teu correu', es: 'tu correo', en: 'your email' },
  newsletterCta:  { ca: 'subscriu-te', es: 'suscríbete', en: 'subscribe' },
  newsletterOk:   { ca: 'gràcies, ja hi ets!', es: 'gracias, ¡ya estás!', en: "thanks, you're in!" },
  newsletterBad:  { ca: 'correu no vàlid', es: 'correo no válido', en: 'invalid email' },
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

// Resuelve un campo traducible: string suelto, o objeto {ca, es, en}. Cae al
// idioma activo, luego a 'ca', luego al primer valor disponible.
export const t = (f) => f == null ? '' : (typeof f === 'string' ? f : (f[LANG] || f.ca || Object.values(f)[0] || ''));

// Normaliza el campo de imágenes: prioriza 'images' (array) y cae a 'image'.
export const imagesOf = (x) => x.images && x.images.length ? x.images : (x.image ? [x.image] : []);

// Texto de contenido con enlaces internos en sintaxis markdown-lite:
//   "les trobareu a la [botiga](botiga)"  →  <a href="#botiga">botiga</a>
// El destino es el 'id' de una sección de data/menu.json (agenda, nosaltres,
// artistes, diari, botiga, contacte, newsletter). Así la clienta solo pone
// corchetes alrededor de la palabra y el paréntesis con el id: no hay que tocar
// código para añadir, quitar o mover enlaces.
// Si el id no existe (typo, sección eliminada), el enlace se degrada a texto
// plano en vez de romper la navegación. Todo va escapado antes de enlazar.
export const richText = (s, ids = null) => esc(s).replace(
  /\[([^\]\n]+)\]\(([a-z0-9_-]+)\)/gi,
  (_, label, id) => (!ids || ids.includes(id))
    ? `<a class="link-inline" href="#${id}">${label}</a>`
    : label
);
