/* ============================================================
   TAT ARA — utilidades genéricas
   Helpers de DOM, escapado, wordmark, i18n y extracción de imágenes.
   Sin estado propio salvo la lectura de LANG (binding vivo de state.js).
   ============================================================ */

import { LANG } from './state.js';

/* ---------- idioma ---------- */
export const MONTHS_CA = ['gener', 'febrer', 'març', 'abril', 'maig', 'juny',
                          'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre'];
export const KIND_CA = {
  exposicio: 'Exposició', conversa: 'Conversa', esdeveniment: 'Esdeveniment',
  taller: 'Taller', lectura: 'Lectura', sessio: 'Sessió d’escolta'
};

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
