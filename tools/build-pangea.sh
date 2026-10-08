#!/usr/bin/env bash
# tools/build-pangea.sh — prepara dist/ con EXACTAMENTE lo que se sube a Pangea.
#
# No compila nada (la web no tiene build): copia la web y la API y deja fuera
# las herramientas, las fotos de origen y la documentación.
#
#   npm run build
#   → dist/  ·  arrastrar su CONTENIDO a la carpeta pública del SFTP
#
# Antes de copiar nada, trae a data/ lo que la clienta haya cambiado en el
# servidor desde la última publicación (la etiqueta git "publicado"). Así un
# cambio de código no le pisa el contenido.
set -euo pipefail
cd "$(dirname "$0")/.."

ORIGEN="${ORIGEN:-https://tatara.cat}"   # solo se cambia para probar el script

# ---- 0. Los cambios de la clienta ----------------------------------------
# data/ del servidor = lo publicado + lo que ella ha tocado. Restando lo
# publicado queda solo lo suyo, y eso se aplica (3-way) sobre el data/ actual,
# que puede llevar cambios nuestros.
git rev-parse -q --verify publicado >/dev/null || {
  echo "✗ Falta la etiqueta 'publicado' (el commit que hay en el servidor). Ver DESARROLLO.md."; exit 1; }
git diff --quiet HEAD -- data/ || {
  echo "✗ data/ tiene cambios sin guardar. Haz commit antes de publicar."; exit 1; }

for f in data/*.json; do
  if ! curl -fsS "$ORIGEN/$f" -o "$f" 2>/dev/null; then
    git checkout -q -- data/
    if git cat-file -e "publicado:$f" 2>/dev/null; then
      echo "✗ No se ha podido bajar $f de $ORIGEN (¿sin red?). No se ha tocado nada."; exit 1
    fi
    echo "✗ $f es nuevo y aún no está en el servidor: súbelo primero a mano, o quita este control."; exit 1
  fi
done
PARCHE=$(mktemp)
git diff publicado -- data/ > "$PARCHE"
git checkout -q -- data/
if [[ -s "$PARCHE" ]]; then
  # En GitHub Actions nadie puede revisar ni guardar esos cambios: se publicarían
  # sin estar en el repo y la siguiente subida los perdería. Mejor parar.
  if [[ "${CI:-}" == "true" ]]; then
    echo "✗ En el servidor hay cambios en data/ que no están en GitHub (alguien subió un JSON por SFTP):"
    git apply --stat "$PARCHE"
    echo "  Tráelos desde un ordenador con 'npm run build', haz commit y push, y se publicará solo."
    exit 1
  fi
  if git apply --3way "$PARCHE"; then
    echo "· traídos cambios de la clienta a data/ (verlos: git diff HEAD -- data/). Guárdalos con un commit."
  else
    echo "✗ Sus cambios chocan con los tuyos en el mismo sitio. Resuelve los conflictos de data/ y repite."
    exit 1
  fi
else
  echo "· la clienta no ha cambiado nada en el servidor"
fi
rm -f "$PARCHE"

DEST=dist
CFG="$DEST/api/config.php"

# config.php lleva las credenciales del servidor y no está en git: si ya existe
# en dist/, se guarda y se devuelve, para no tener que volver a escribirlo.
GUARDADA=""
if [[ -f "$CFG" ]]; then
  GUARDADA=$(mktemp)
  cp "$CFG" "$GUARDADA"
fi

rm -rf "$DEST"
mkdir -p "$DEST"

rsync -a \
  --exclude '.git' --exclude '.git*' --exclude '.claude' --exclude '.wrangler' \
  --exclude '.dev.vars*' --exclude '.DS_Store' --exclude 'node_modules' \
  --exclude '.data' \
  --exclude 'src' --exclude 'tools' --exclude 'migrations' --exclude 'dist' \
  --exclude 'referencias' --exclude 'FOTOS EDICIONS' --exclude 'FOTOS AGENDA' \
  --exclude 'FOTOS_MR' --exclude 'FULLS DE SALA' \
  --include 'schema-tatara.mysql.sql' \
  --exclude '*.md' --exclude '*.sql' --exclude '*.toml' --exclude '*.pages' \
  --exclude 'package.json' --exclude 'package-lock.json' --exclude 'Recurso 2.png' \
  --exclude 'api/config.php' \
  ./ "$DEST/"

# El .htaccess y el .assetsignore empiezan por punto: rsync los copia, pero el
# primero hay que asegurarlo y el segundo sobra.
rm -f "$DEST/.assetsignore"
[[ -f .htaccess ]] && cp .htaccess "$DEST/.htaccess"

if [[ -n "$GUARDADA" ]]; then
  cp "$GUARDADA" "$CFG"
  chmod 600 "$CFG"
  rm -f "$GUARDADA"
  echo "· api/config.php conservado del build anterior"
fi

# ---- Una página ya pintada por dirección (buscadores y vistas previas) ----
node tools/prerender.mjs "$DEST"

echo "✓ dist/ listo ($(du -sh "$DEST" | cut -f1))"
echo
echo "  1. Subir el CONTENIDO de dist/ a la carpeta pública del SFTP de Pangea."
echo "  2. Comprobar https://tatara.cat/api/health"
echo "  3. Marcar lo publicado:  git tag -f publicado && git push -f origin publicado"
echo
echo "  Ojo: api/config.php se queda en el servidor entre subidas. No lo borres."
