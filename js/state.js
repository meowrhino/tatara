/* ============================================================
   TAT ARA — estado global
   Estado compartido entre módulos. Los bindings exportados son "vivos":
   cualquier módulo que importe SITE/LANG ve el valor actualizado en cuanto
   se llama al setter correspondiente (no hace falta re-importar).
   ============================================================ */

export const CONFIG_URL = 'data/data.json';

export let SITE = null;   // configuración general (data/data.json)
export let LANG = 'ca';   // idioma activo

export function setSite(value) { SITE = value; }
export function setLang(value) { LANG = value; }
