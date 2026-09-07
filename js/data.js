/* ============================================================
   TAT ARA — carga de datos
   Fetch de JSONs con caché en memoria: una sola petición por URL mientras dura
   la visita, aunque se navegue entre secciones ida y vuelta.

   No hay caché a mano (ni '?v=', ni 'no-store'): Cloudflare sirve TODOS los
   assets —JSON, JS, CSS e imágenes— con 'Cache-Control: public, max-age=0,
   must-revalidate' y un ETag del contenido. El navegador revalida en cada carga
   y se trae el archivo nuevo en cuanto cambia. Editar un JSON y hacer push es
   suficiente: no hay ninguna versión que acordarse de subir.
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
