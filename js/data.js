/* ============================================================
   TAT ARA — carga de datos
   Fetch de JSONs con caché en memoria (una sola petición por URL).
   ============================================================ */

const CACHE = new Map();   // url -> json ya parseado

export async function loadJSON(url) {
  if (CACHE.has(url)) return CACHE.get(url);
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  const data = await res.json();
  CACHE.set(url, data);
  return data;
}
