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

/* Una sección de fichas (exposicions): su JSON es el índice —"projects", en
   orden, con { "spacer": true } para dejar aire— y cada ficha vive en su
   carpeta, al lado: data/exposicions/<slug>/project.json, con sus fotos en
   img/ (1.webp, 2.webp…) y su PDF. Aquí se juntan en la lista "people" que
   pinta renderPeople, con las rutas ya enteras. */
export async function loadFichas(url) {
  const indice = await loadJSON(url);
  const dir = url.replace(/\.json$/, '/');
  const people = await Promise.all((indice.projects || []).map(async (slug) => {
    if (typeof slug !== 'string') return slug;   // { "spacer": true }
    const en = (f) => (/^(https?:)?\//.test(f) ? f : `${dir}${slug}/${f}`);
    const p = await loadJSON(`${dir}${slug}/project.json`);
    // pdf admite un string, un objeto {url, label} o un array de cualquiera de los dos
    const pdf = (x) => (typeof x === 'string' ? en(x) : { ...x, url: en(x.url) });
    return {
      ...p, slug,
      images: (p.photos || []).map((n) => en(`img/${n}.webp`)),
      pdf: Array.isArray(p.pdf) ? p.pdf.map(pdf) : (p.pdf ? pdf(p.pdf) : null),
    };
  }));
  return { ...indice, people };
}
