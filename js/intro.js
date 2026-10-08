/* ============================================================
   TAT ARA — bienvenida
   Al abrir la web, TAT y ARA se colocan en su barra a medida que carga la
   primera vista: en escritorio nacen juntos en el centro y se separan; en
   móvil, TAT sale abajo, encima de ARA, y sube. Cuando llegan, aparece el
   resto. El recorrido lo pone el CSS (--intro: 1 = al empezar, 0 = en su
   sitio); aquí solo se anima ese número.
   La clase .intro la pone un script en línea del <head> (para que no se vea
   la marca en su sitio un instante antes de saltar al centro); sin ella, por
   ejemplo con «reducir movimiento», no hay bienvenida.
   ============================================================ */

const root = document.documentElement;
const MIN_MS = 1200;   // aunque todo esté en caché, la bienvenida dura al menos esto
const MAX_MS = 5000;   // y, aunque algo no cargue, nunca más que esto

let progress = () => 0;
let resolveDone;
export const introDone = new Promise((r) => { resolveDone = r; });

// Quien renderiza la primera vista dice cuánto le falta (0..1).
export const setIntroProgress = (fn) => { progress = fn; };

export function runIntro() {
  if (!root.classList.contains('intro')) { resolveDone(); return; }
  const t0 = performance.now();
  let shown = 0;
  const frame = (now) => {
    const ms = now - t0;
    const goal = ms > MAX_MS ? 1 : Math.min(ms / MIN_MS, progress());
    shown += (goal - shown) * 0.08;   // persigue la meta frenando: nunca da saltos
    if (goal === 1 && shown > 0.995) shown = 1;
    root.style.setProperty('--intro', String(1 - shown));
    if (shown < 1) { requestAnimationFrame(frame); return; }
    root.classList.remove('intro');
    root.style.removeProperty('--intro');
    resolveDone();
  };
  requestAnimationFrame(frame);
}
