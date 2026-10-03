#!/usr/bin/env bash
# tools/build-pangea.sh — prepara dist/ con EXACTAMENTE lo que se sube a Pangea.
#
# No compila nada (la web no tiene build): copia la web y la API y deja fuera el
# código del Worker, las fotos de origen y la documentación. Es la misma lista
# que .assetsignore usa en Cloudflare, para que las dos opciones suban lo mismo.
#
#   bash tools/build-pangea.sh
#   → dist/  ·  arrastrar su CONTENIDO a la carpeta pública del SFTP
set -euo pipefail
cd "$(dirname "$0")/.."

DEST=dist
rm -rf "$DEST"
mkdir -p "$DEST"

rsync -a \
  --exclude '.git' --exclude '.git*' --exclude '.claude' --exclude '.wrangler' \
  --exclude '.dev.vars*' --exclude '.DS_Store' --exclude 'node_modules' \
  --exclude '.data' \
  --exclude 'src' --exclude 'tools' --exclude 'migrations' --exclude 'dist' \
  --exclude 'referencias' --exclude 'FOTOS EDICIONS' --exclude 'FOTOS AGENDA' \
  --exclude 'FOTOS_MR' --exclude 'FULLS DE SALA' \
  --exclude '*.md' --exclude '*.sql' --exclude '*.toml' --exclude '*.pages' \
  --exclude 'package.json' --exclude 'package-lock.json' --exclude 'Recurso 2.png' \
  --exclude 'api/config.php' \
  ./ "$DEST/"

# El .htaccess y el .assetsignore empiezan por punto: rsync los copia, pero el
# primero hay que asegurarlo y el segundo sobra.
rm -f "$DEST/.assetsignore"
[[ -f .htaccess ]] && cp .htaccess "$DEST/.htaccess"

echo "✓ dist/ listo ($(du -sh "$DEST" | cut -f1))"
echo
echo "  1. Subir el CONTENIDO de dist/ a la carpeta pública del SFTP de Pangea."
echo "  2. Crear allí api/config.php a partir de api/config.example.php (NO se sube solo)."
echo "  3. Comprobar https://tatara.cat/api/health"
echo
echo "  Ojo: api/config.php se queda en el servidor entre subidas. No lo borres."
