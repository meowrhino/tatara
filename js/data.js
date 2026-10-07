/* ============================================================
   TAT ARA — carga de datos
   Fetch de JSONs con caché en memoria: una sola petición por URL mientras dura
   la visita, aunque se navegue entre secciones ida y vuelta.

   No hay caché a mano (ni '?v=', ni 'no-store'): el .htaccess de la raíz sirve
   JSON, HTML, CSS y JS con 'Cache-Control: no-cache, must-revalidate', y Apache
   añade un ETag. El navegador revalida en cada carga y se trae el archivo nuevo
   en cuanto cambia. Subir un JSON por SFTP es suficiente: no hay ninguna versión
   que acordarse de cambiar.
   ============================================================ */

const CACHE = new Map();   // url -> json ya parseado

export async function loadJSON(url) {
  if (CACHE.has(url)) return CACHE.get(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  const data = await res.json();
  CACHE.set(url, data);
  return data;
}
