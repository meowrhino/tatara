/* ============================================================
   TAT ARA — fechas
   Parseo y formateo de fechas de la agenda (todo en hora local, sin TZ).
   ============================================================ */

import { monthName } from './utils.js';

export const parseDate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const todayDate = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
export const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const dm = (d) => `${d.getDate()}/${d.getMonth() + 1}`;             // 2/7
export const dMes = (d) => `${d.getDate()} ${monthName(d.getMonth())}`;    // 2 juliol / 2 julio / 2 July

// Rango "d/m – d/m" (o un solo día "d/m · hora" si start == end).
export function rangeSlash(ev) {
  const s = parseDate(ev.start), e = ev.end ? parseDate(ev.end) : s;
  const hora = ev.time ? ` · ${ev.time}` : '';
  if (sameDay(s, e)) return dm(s) + hora;
  return `${dm(s)} – ${dm(e)}${hora}`;
}
