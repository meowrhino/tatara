/* ============================================================
   TAT ARA — fechas
   Parseo y formateo de fechas de la agenda (todo en hora local, sin TZ).
   ============================================================ */

import { MONTHS_CA } from './utils.js';

export const parseDate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const todayDate = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
export const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
export const daysBetween = (a, b) => Math.round((b - a) / 86400000) + 1;   // inclusivo
export const dm = (d) => `${d.getDate()}/${d.getMonth() + 1}`;             // 2/7
export const dMes = (d) => `${d.getDate()} ${MONTHS_CA[d.getMonth()]}`;    // 2 juliol

// Rango "d/m – d/m" (o un solo día "d/m · hora" si start == end).
export function rangeSlash(ev) {
  const s = parseDate(ev.start), e = ev.end ? parseDate(ev.end) : s;
  if (sameDay(s, e)) return dm(s) + (ev.time ? ` · ${ev.time}` : '');
  return `${dm(s)} – ${dm(e)}`;
}
