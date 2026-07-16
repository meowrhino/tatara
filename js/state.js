/* ============================================================
   TAT ARA — estado global
   Estado compartido entre módulos. Los bindings exportados son "vivos":
   cualquier módulo que importe SITE/LANG ve el valor actualizado en cuanto
   se llama al setter correspondiente (no hace falta re-importar).
   ============================================================ */

export const CONFIG_URL = 'data/data.json';

// Versión de assets: se añade como ?v= a los JSON (ver data.js) para forzar
// frescura al publicar sin desactivar la caché del navegador. Súbela al publicar.
export const VERSION = '2026-07-17';

const LANG_KEY = 'tatara:lang';   // clave de localStorage donde se recuerda el idioma

export let SITE = null;   // configuración general (data/data.json)
export let LANG = 'ca';   // idioma activo

export function setSite(value) { SITE = value; }

// Fija el idioma activo y lo recuerda para próximas visitas.
export function setLang(value) {
  LANG = value;
  try { localStorage.setItem(LANG_KEY, value); } catch { /* modo privado / sin storage */ }
}

// Idioma recordado en una visita anterior (o null si no hay / no hay storage).
export function storedLang() {
  try { return localStorage.getItem(LANG_KEY); } catch { return null; }
}
