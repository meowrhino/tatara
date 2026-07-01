/* ============================================================
   TAT ARA — carga de datos
   Fetch de JSONs con caché en memoria (una sola petición por URL) y caché de
   navegador normal: la frescura se controla con VERSION (?v=), no con no-store.
   ============================================================ */

import { VERSION } from './state.js';

const CACHE = new Map();   // url -> json ya parseado

export async function loadJSON(url) {
  if (CACHE.has(url)) return CACHE.get(url);
  const res = await fetch(VERSION ? `${url}?v=${VERSION}` : url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  const data = await res.json();
  CACHE.set(url, data);
  return data;
}
