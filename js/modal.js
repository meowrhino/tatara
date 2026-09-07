/* ============================================================
   TAT ARA — modal y lightbox
   Diálogo de detalle (lo usa la botiga para el detalle de producto) y la
   ampliación de una imagen a pantalla completa (agenda, recerca).
   El menú y el modal comparten el bloqueo de scroll del body, por eso
   closeModal consulta al menú antes de liberarlo.
   ============================================================ */

import { $, el, esc, ui, captureFocus } from './utils.js';
import { isMenuOpen } from './menu.js';

let restoreModalFocus = null;   // devuelve el foco al elemento que abrió el modal

export function openModal(html) {
  restoreModalFocus = captureFocus();
  $('#modal-body').innerHTML = html;
  $('#modal').hidden = false;
  document.body.classList.add('no-scroll');
  $('#modal .modal__close').focus();
}

export function closeModal() {
  $('#modal').hidden = true;
  if (!isMenuOpen()) document.body.classList.remove('no-scroll');
  if (restoreModalFocus) { restoreModalFocus(); restoreModalFocus = null; }
}

// Amplía una imagen a pantalla completa. La usan la agenda y las galerías de
// las páginas de texto; por eso vive aquí y no en ninguna de las dos.
export function openLightbox(src, alt) {
  const restoreFocus = captureFocus();
  const overlay = el('div', 'lightbox');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', alt || ui('enlargedImage'));
  overlay.tabIndex = -1;

  const close = () => {
    overlay.remove();
    document.body.classList.remove('no-scroll');
    document.removeEventListener('keydown', onKey);
    restoreFocus();
  };
  const onKey = (ev) => { if (ev.key === 'Escape') close(); };

  const btn = el('button', 'lightbox__close');
  btn.type = 'button';
  btn.setAttribute('aria-label', ui('close'));
  btn.innerHTML = '<svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true"><path d="M7 9 Q19 19 33 31 M33 8 Q20 20 8 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  btn.addEventListener('click', close);

  const img = el('img', 'lightbox__img');
  img.src = src; img.alt = alt || '';
  // Clic en la imagen NO cierra (para poder mirarla); clic fuera sí.
  img.addEventListener('click', (ev) => ev.stopPropagation());

  overlay.appendChild(btn);
  overlay.appendChild(img);
  overlay.addEventListener('click', close);
  document.body.appendChild(overlay);
  document.body.classList.add('no-scroll');
  document.addEventListener('keydown', onKey);
  btn.focus();
}
