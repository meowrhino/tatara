/* ============================================================
   TAT ARA — modal
   Diálogo de detalle (lo usa la botiga para el detalle de producto).
   El menú y el modal comparten el bloqueo de scroll del body, por eso
   closeModal consulta al menú antes de liberarlo.
   ============================================================ */

import { $, captureFocus } from './utils.js';
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
