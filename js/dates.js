/* ============================================================
   TAT ARA — fechas
   Parseo y formateo de fechas de la agenda (todo en hora local, sin TZ).
   ============================================================ */

import { monthName, ui } from './utils.js';

export const parseDate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const todayDate = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
export const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const dm = (d) => `${d.getDate()}/${d.getMonth() + 1}`;             // 2/7
export const dMes = (d) => `${d.getDate()} ${monthName(d.getMonth())}`;    // 2 juliol / 2 julio / 2 July

// Rango "d/m – d/m"; dos días seguidos, "d/m i d/m"; un solo día, "d/m".
export function rangeSlash(ev) {
  const s = parseDate(ev.start), e = ev.end ? parseDate(ev.end) : s;
  const hora = ev.time ? ` – ${ev.time}` : '';
  if (sameDay(s, e)) return dm(s) + hora;
  const dia2 = new Date(s); dia2.setDate(s.getDate() + 1);
  if (sameDay(dia2, e)) return `${dm(s)} ${ui('and')} ${dm(e)}${hora}`;
  return `${dm(s)} – ${dm(e)}${hora}`;
}
