/* ============================================================
   TAT ARA — estado global
   Estado compartido entre módulos. Los bindings exportados son "vivos":
   cualquier módulo que importe SITE/LANG ve el valor actualizado en cuanto
   se llama al setter correspondiente (no hace falta re-importar).
   ============================================================ */

export const CONFIG_URL = 'data/site.json';

const LANG_KEY = 'tatara:lang';   // clave de localStorage donde se recuerda el idioma

export let SITE = null;   // configuración general (data/site.json)
export let LANG = 'ca';   // idioma activo

export function setSite(value) { SITE = value; }

// Idioma por defecto (el catalán): sus direcciones van sin prefijo; las de los
// otros idiomas, con él delante (/es/nosaltres/, /en/exposicions/anna-dot/).
export const defaultLang = () => SITE.defaultLang || 'ca';
export const langPrefix = (lang = LANG) => (lang === defaultLang() ? '' : `/${lang}`);

// Dirección de una sección (y de una ficha dentro de ella): la primera sección
// (la agenda) es la portada "/", el resto "/nosaltres/", "/exposicions/anna-dot/"…
// en el idioma activo.
export const pathOf = (id, sub) => langPrefix() +
  (id === SITE.sections[0].id && !sub ? '/' : `/${id}/${sub ? `${sub}/` : ''}`);

// El idioma que lleva la dirección delante ('es' en /es/nosaltres/), o null.
export function langOfPath(pathname = location.pathname) {
  const first = pathname.split('/')[1];
  return first !== defaultLang() && (SITE.languages || []).includes(first) ? first : null;
}

// La misma dirección en otro idioma: /es/nosaltres/ → /en/nosaltres/ o /nosaltres/.
export function pathInLang(lang, pathname = location.pathname) {
  const rest = langOfPath(pathname) ? pathname.slice(langOfPath(pathname).length + 1) : pathname;
  return langPrefix(lang) + rest;
}

// Fija el idioma activo y, si lo ha elegido quien visita (no si viene en la
// dirección), lo recuerda para próximas visitas.
export function setLang(value, remember = false) {
  LANG = value;
  if (remember) try { localStorage.setItem(LANG_KEY, value); } catch { /* modo privado / sin storage */ }
}

// Idioma recordado en una visita anterior (o null si no hay / no hay storage).
export function storedLang() {
  try { return localStorage.getItem(LANG_KEY); } catch { return null; }
}
