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

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const IDIOMAS = ['ca', 'es', 'en'];
const PARRAFOS = ['description', 'text'];   // campos donde ca === es es sospechoso

let errores = 0, avisos = 0;
const err = (dónde, qué) => { errores++; console.log(`  ✗ ${dónde}: ${qué}`); };
const avi = (dónde, qué) => { avisos++; console.log(`  · ${dónde}: ${qué}`); };

const leer = (rel) => JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));

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
  const paleta = Object.keys(leer('data/data.json').palette || {});
  const eventos = leer('data/agenda.json').events || [];
  const slugs = new Set();

  const revisaEntrada = (ev, dónde, padre = null) => {
    if (!ev.slug) err(dónde, 'falta "slug"');
    else if (slugs.has(ev.slug)) err(dónde, `"slug" repetido: ${ev.slug} (tiene que ser único)`);
    else slugs.add(ev.slug);

    revisaTraducible('title', ev.title, dónde);
    revisaTraducible('description', ev.description, dónde, false);
    revisaTraducible('kind', ev.kind, dónde, false);
    revisaImagen(ev.image, dónde);

    const malStart = fechaMala(ev.start);
    if (malStart) { err(dónde, `"start" (${ev.start}) ${malStart}`); return; }
    if (ev.end) {
      const malEnd = fechaMala(ev.end);
      if (malEnd) { err(dónde, `"end" (${ev.end}) ${malEnd}`); return; }
      if (new Date(ev.end) < new Date(ev.start)) err(dónde, `"end" (${ev.end}) es anterior a "start" (${ev.start})`);
    }

    if (padre) {
      if (ev.color) avi(dónde, 'lleva "color", pero el color solo pinta en las entradas de primer nivel');
      const ini = new Date(padre.start), fin = new Date(padre.end || padre.start);
      const s = new Date(ev.start), e = new Date(ev.end || ev.start);
      if (s < ini || e > fin) {
        avi(dónde, `cae fuera de "${padre.slug}" (${padre.start} → ${padre.end || padre.start}): o va en otra exposición, o va suelto de primer nivel`);
      }
    } else if (ev.color && !paleta.includes(ev.color)) {
      avi(dónde, `"color": "${ev.color}" no está en la paleta de data.json (${paleta.join(', ')})`);
    }
  };

  eventos.forEach((ev) => {
    const dónde = ev.slug || '(sin slug)';
    revisaEntrada(ev, dónde);
    (ev.eventos || []).forEach((c) => revisaEntrada(c, `${dónde} › ${c.slug || '(sin slug)'}`, ev));
  });

  // Imágenes en assets/img/agenda que ya no usa nadie: no rompen nada, solo
  // ocupan sitio en el repo.
  const usadas = new Set();
  for (const rel of ['data/agenda.json', 'data/persones.json', 'data/recerca.json', 'data/diari.json', 'data/edicions.json']) {
    if (!existsSync(join(ROOT, rel))) continue;
    for (const m of readFileSync(join(ROOT, rel), 'utf8').matchAll(/assets\/img\/[^"]+/g)) usadas.add(m[0]);
  }
  const dir = 'assets/img/agenda';
  const huerfanas = readdirSync(join(ROOT, dir)).filter((f) => f.endsWith('.webp') && !usadas.has(`${dir}/${f}`));
  if (huerfanas.length) avi(dir, `${huerfanas.length} imágenes que ya no usa ningún JSON: ${huerfanas.join(', ')}`);
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

/* ---------- menú ---------- */

function revisaMenu(menu) {
  console.log('\ndata/menu.json');
  const vistos = new Set();
  menu.sections.forEach((s) => {
    const dónde = s.id || '(sin id)';
    if (vistos.has(s.id)) err(dónde, '"id" repetido');
    vistos.add(s.id);
    revisaTraducible('label', s.label, dónde);
    if (s.data && !existsSync(join(ROOT, s.data))) err(dónde, `el archivo "${s.data}" no existe`);
  });
}

/* ---------- ejecutar ---------- */

const menu = leer('data/menu.json');
revisaMenu(menu);
revisaAgenda(menu);
revisaTextos(menu);

console.log('');
if (!errores && !avisos) console.log('✓ todo correcto.');
else console.log(`${errores} error(es) — rompen algo · ${avisos} aviso(s) — mirar por si acaso`);
process.exit(errores ? 1 : 0);
