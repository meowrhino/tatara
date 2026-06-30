/* ============================================================
   TAT ARA — modal
   Diálogo de detalle (lo usa la botiga para el detalle de producto).
   El menú y el modal comparten el bloqueo de scroll del body, por eso
   closeModal consulta al menú antes de liberarlo.
   ============================================================ */

import { $ } from './utils.js';
import { isMenuOpen } from './menu.js';

export function openModal(html) {
  $('#modal-body').innerHTML = html;
  $('#modal').hidden = false;
  document.body.classList.add('no-scroll');
}

export function closeModal() {
  $('#modal').hidden = true;
  if (!isMenuOpen()) document.body.classList.remove('no-scroll');
}
