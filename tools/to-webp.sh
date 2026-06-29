#!/usr/bin/env bash
# Convierte un directorio de imágenes a webp, redimensionando el lado mayor a MAX px (sin upscale).
# Uso: tools/to-webp.sh "FOTOS AGENDA" assets/img/agenda [MAX] [QUALITY]
set -euo pipefail

SRC="${1:?carpeta origen}"
DST="${2:?carpeta destino}"
MAX="${3:-1600}"
Q="${4:-80}"

mkdir -p "$DST"

slug() {
  # nombre -> minúsculas, sin extensión, espacios/símbolos -> guion
  local base="${1##*/}"; base="${base%.*}"
  echo "$base" \
    | tr '[:upper:]' '[:lower:]' \
    | iconv -f utf-8 -t ascii//TRANSLIT 2>/dev/null \
    | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g'
}

shopt -s nullglob nocaseglob
count=0
for f in "$SRC"/*.{jpg,jpeg,png,tif,tiff}; do
  [ -e "$f" ] || continue
  name="$(slug "$f")"
  out="$DST/$name.webp"
  # dimensiones
  read -r W H < <(sips -g pixelWidth -g pixelHeight "$f" 2>/dev/null \
    | awk '/pixelWidth/{w=$2} /pixelHeight/{h=$2} END{print w, h}')
  if [ -z "${W:-}" ] || [ -z "${H:-}" ]; then echo "skip (no dims): $f"; continue; fi
  if [ "$W" -ge "$H" ]; then
    rw=$(( W < MAX ? W : MAX )); resize="-resize $rw 0"
  else
    rh=$(( H < MAX ? H : MAX )); resize="-resize 0 $rh"
  fi
  cwebp -quiet -q "$Q" $resize "$f" -o "$out"
  count=$((count+1))
  echo "✓ $name.webp  ($W x $H)"
done
echo "---- $count imágenes -> $DST"
