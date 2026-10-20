#!/usr/bin/env node
/* ============================================================
   TAT ARA — revisión de los JSON de contenido
   Uso:  npm run check
   Salida: una lista de avisos con archivo, entrada y qué falla. Sin avisos =
   la web va a cargar bien.

   No arregla nada ni toca ficheros: solo mira. Está pensado para pasarlo
   DESPUÉS de editar un JSON a mano y ANTES de subirlo, porque casi todos los
   errores de contenido son de tres tipos: una fecha que no existe, una imagen
   con el nombre mal escrito, o una traducción que falta.
   ============================================================ */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validar } from './validar.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const IDIOMAS = ['ca', 'es', 'en'];
const PARRAFOS = ['description', 'text'];   // campos donde ca === es es sospechoso

let errores = 0, avisos = 0;
const err = (dónde, qué) => { errores++; console.log(`  ✗ ${dónde}: ${qué}`); };
const avi = (dónde, qué) => { avisos++; console.log(`  · ${dónde}: ${qué}`); };

// Un JSON mal escrito (una coma de más, una que falta) deja la web en blanco:
// es el error más fácil de cometer editando a mano y el más difícil de leer en
// el mensaje que da Node. Aquí lo traducimos a "archivo, línea, y esta es".
function leer(rel) {
  const bruto = readFileSync(join(ROOT, rel), 'utf8');
  try {
    return JSON.parse(bruto);
  } catch (e) {
    const pos = /position (\d+)/.exec(e.message);
    let dónde = '';
    if (pos) {
      const hasta = bruto.slice(0, +pos[1]);
      const línea = hasta.split('\n').length;
      const texto = bruto.split('\n')[línea - 1] || '';
      dónde = `\n     línea ${línea}:  ${texto.trim()}`;
    }
    console.log(`\n✗ ${rel} no es un JSON válido y la web no lo va a poder abrir.`);
    console.log(`     ${e.message}${dónde}`);
    console.log('\n  Casi siempre es una coma: sobra una antes de un } o un ], o falta');
    console.log('  una entre dos líneas. Cada entrada va separada por coma menos la última.\n');
    process.exit(1);
  }
}

/* ---------- comprobaciones sueltas ---------- */

// "2026-02-29" pasa el formato pero no es un día real: Date lo convierte
// silenciosamente en el 1 de marzo, y la web muestra una fecha que nadie puso.
function fechaMala(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return 'no tiene formato AAAA-MM-DD';
  const [y, m, d] = s.split('-').map(Number);
  const f = new Date(y, m - 1, d);
  if (f.getFullYear() !== y || f.getMonth() !== m - 1 || f.getDate() !== d) return 'es un día que no existe en el calendario';
  return null;
}

function revisaTraducible(campo, valor, dónde, obligatorio = true) {
  if (valor == null) { if (obligatorio) err(dónde, `falta "${campo}"`); return; }
  if (typeof valor === 'string') { avi(dónde, `"${campo}" es un texto suelto, sin {ca, es, en}`); return; }
  const faltan = IDIOMAS.filter((l) => !valor[l]);
  if (faltan.length) avi(dónde, `"${campo}" sin traducir a: ${faltan.join(', ')}`);
  // Solo lo avisamos en los párrafos largos: en títulos, etiquetas y tipos, que
  // el catalán y el castellano coincidan suele ser lo correcto ("No Limits",
  // "Retrospectiva", nombres propios…).
  if (PARRAFOS.includes(campo) && valor.ca && valor.es && valor.ca === valor.es) {
    avi(dónde, `"${campo}" está igual en catalán y castellano — ¿falta traducir?`);
  }
}

function revisaImagen(ruta, dónde) {
  if (!ruta) return;
  if (!existsSync(join(ROOT, ruta))) err(dónde, `la imagen no existe: ${ruta}`);
}

/* ---------- agenda ---------- */

function revisaAgenda(menu) {
  console.log('\ndata/agenda.json');
  const eventos = leer('data/agenda.json').events || [];
  const slugs = new Set();

  const revisaEntrada = (ev, dónde, padre = null) => {
    if (!ev.slug) err(dónde, 'falta "slug"');
    else if (slugs.has(ev.slug)) err(dónde, `"slug" repetido: ${ev.slug} (tiene que ser único)`);
    else slugs.add(ev.slug);

    revisaTraducible('title', ev.title, dónde);
    revisaTraducible('description', ev.description, dónde, false);
    revisaTraducible('kind', ev.kind, dónde, false);
    [].concat(ev.image || []).forEach((src) => revisaImagen(src, dónde));

    const malStart = fechaMala(ev.start);
    if (malStart) { err(dónde, `"start" (${ev.start}) ${malStart}`); return; }
    if (ev.end) {
      const malEnd = fechaMala(ev.end);
      if (malEnd) { err(dónde, `"end" (${ev.end}) ${malEnd}`); return; }
      if (new Date(ev.end) < new Date(ev.start)) err(dónde, `"end" (${ev.end}) es anterior a "start" (${ev.start})`);
    }

    if (padre) {
      const ini = new Date(padre.start), fin = new Date(padre.end || padre.start);
      const s = new Date(ev.start), e = new Date(ev.end || ev.start);
      if (s < ini || e > fin) {
        avi(dónde, `cae fuera de "${padre.slug}" (${padre.start} → ${padre.end || padre.start}): o va en otra exposición, o va suelto de primer nivel`);
      }
    }
  };

  eventos.forEach((ev) => {
    const dónde = ev.slug || '(sin slug)';
    revisaEntrada(ev, dónde);
    if (ev.eventos) err(dónde, '"eventos" ahora se llama "events" (sin él, la web no los enseña)');
    (ev.events || []).forEach((c) => revisaEntrada(c, `${dónde} › ${c.slug || '(sin slug)'}`, ev));
  });

}

/* ---------- imágenes y PDF que ya no usa nadie ---------- */

// No rompen nada, solo ocupan sitio en el repo. Se miran TODOS los JSON de data/
// contra TODAS las carpetas de assets/img y assets/pdf, en vez de una lista a
// mano: así la comprobación no se queda vieja cuando se añade una sección o se
// renombra un archivo de datos.
function revisaHuerfanas() {
  const usadas = new Set();
  for (const f of readdirSync(join(ROOT, 'data')).filter((x) => x.endsWith('.json'))) {
    for (const m of readFileSync(join(ROOT, 'data', f), 'utf8').matchAll(/assets\/[^"]+/g)) usadas.add(m[0]);
  }
  const dirs = [
    ...readdirSync(join(ROOT, 'assets/img'), { withFileTypes: true })
      .filter((d) => d.isDirectory()).map((d) => `assets/img/${d.name}`),
    ...(existsSync(join(ROOT, 'assets/pdf')) ? ['assets/pdf'] : []),
  ];
  for (const dir of dirs) {
    const sobran = readdirSync(join(ROOT, dir))
      .filter((f) => /\.(webp|jpg|jpeg|png|svg|pdf)$/i.test(f) && !usadas.has(`${dir}/${f}`));
    if (sobran.length) avi(dir, `${sobran.length} archivo(s) que ya no usa ningún JSON: ${sobran.join(', ')}`);
  }
}

/* ---------- nosaltres y demás páginas de texto ---------- */

function revisaTextos(menu) {
  const ids = menu.sections.map((s) => s.id);
  for (const sec of menu.sections.filter((s) => s.type === 'text' && s.data)) {
    console.log(`\n${sec.data}`);
    const data = leer(sec.data);
    (data.body || []).forEach((b, i) => {
      const dónde = `bloque ${i + 1}`;
      revisaTraducible('heading', b.heading, dónde, false);
      revisaTraducible('text', b.text, dónde, false);
      revisaImagen(b.image, dónde);
      if (b.link && !ids.includes(b.link)) err(dónde, `"link": "${b.link}" no es ninguna sección (${ids.join(', ')})`);
      // enlaces [etiqueta](id) dentro del texto
      for (const l of IDIOMAS) {
        const txt = (b.text || {})[l];
        if (typeof txt !== 'string') continue;
        for (const m of txt.matchAll(/\[([^\]\n]+)\]\(([a-z0-9_-]+)\)/gi)) {
          if (!ids.includes(m[2])) err(`${dónde} (${l})`, `el enlace [${m[1]}](${m[2]}) apunta a una sección que no existe`);
        }
      }
    });
  }
}

/* ---------- exposicions y demás secciones de fichas ---------- */

function revisaFichas(menu) {
  for (const sec of menu.sections.filter((s) => s.type === 'people' && s.data)) {
    console.log(`\n${sec.data}`);
    const data = leer(sec.data);
    // Como la agenda: una entrada por exposición, con sus fotos y su PDF por ruta.
    if (!Array.isArray(data.people)) { err(sec.data, '"people" tiene que ser una lista de exposiciones'); continue; }
    const vistas = new Set();
    data.people.forEach((p, i) => {
      if (p && p.spacer) return;
      const dónde = p.slug || `entrada ${i + 1}`;
      if (!p.slug) err(dónde, 'falta "slug" (la dirección de la ficha: "anna-dot")');
      else if (vistas.has(p.slug)) err(dónde, '"slug" repetido: tiene que ser único');
      else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug)) err(dónde, 'el "slug" solo puede llevar minúsculas, números y guiones (sin acentos ni espacios): es la dirección de la ficha');
      vistas.add(p.slug);
      if (!p.name) err(dónde, 'falta "name"');
      revisaTraducible('expo', p.expo, dónde, false);
      revisaTraducible('text', p.text, dónde, false);
      revisaTraducible('bio', p.bio, dónde, false);
      [].concat(p.image || []).forEach((src) => revisaImagen(src, dónde));
      // pdf admite string, {url,label} o un array de cualquiera de los dos
      const pdfs = Array.isArray(p.pdf) ? p.pdf : (p.pdf ? [p.pdf] : []);
      pdfs.forEach((pdf) => {
        const url = typeof pdf === 'string' ? pdf : pdf && pdf.url;
        if (url && !/^https?:/.test(url) && !existsSync(join(ROOT, url))) err(dónde, `el PDF no existe: ${url}`);
      });
      if (p.date) {
        for (const k of ['start', 'end']) {
          const mal = p.date[k] && fechaMala(p.date[k]);
          if (mal) err(dónde, `"date.${k}" (${p.date[k]}) ${mal}`);
        }
      }
      if (p.url && !/^https?:\/\//.test(p.url)) avi(dónde, `"url" no empieza por http: ${p.url}`);
    });
  }
}

/* ---------- menú ---------- */

function revisaMenu(menu) {
  console.log('\ndata/site.json → menu');
  const vistos = new Set();
  menu.sections.forEach((s) => {
    const dónde = s.id || '(sin id)';
    if (vistos.has(s.id)) err(dónde, '"id" repetido');
    vistos.add(s.id);
    revisaTraducible('label', s.label, dónde);
    if (s.data && !existsSync(join(ROOT, s.data))) err(dónde, `el archivo "${s.data}" no existe`);
  });
}

/* ---------- cada JSON con su esquema (schema/) ---------- */

// Lo mismo que VS Code subraya en rojo: un campo mal escrito o de otro tipo.
// Los mensajes, en catalán, como la GUIA: los lee la clienta.
function revisaEsquemas(menu) {
  console.log('\nschema/ (lo que VS Code subraya en rojo)');
  const esquema = (t) => JSON.parse(readFileSync(join(ROOT, 'schema', `${t}.json`), 'utf8'));
  const mira = (rel, t) => validar(leer(rel), esquema(t), rel).forEach((m) => { errores++; console.log(`  ✗ ${m}`); });
  const TIPO = { agenda: 'agenda', text: 'text', people: 'exposicions', shop: 'botiga' };
  mira('data/site.json', 'site');
  mira('data/envios.json', 'envios');
  for (const sec of menu.sections.filter((s) => s.data && TIPO[s.type])) mira(sec.data, TIPO[sec.type]);
}

/* ---------- ejecutar ---------- */

const menu = { sections: leer('data/site.json').menu || [] };
revisaMenu(menu);
revisaEsquemas(menu);
revisaAgenda(menu);
revisaFichas(menu);
revisaTextos(menu);
revisaHuerfanas();

console.log('');
if (!errores && !avisos) console.log('✓ todo correcto.');
else console.log(`${errores} error(es) — rompen algo · ${avisos} aviso(s) — mirar por si acaso`);
process.exit(errores ? 1 : 0);
