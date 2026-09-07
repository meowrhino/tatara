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
  # iconv falla con acentos descompuestos (la "ó" de "projecció" tal como la
  # escribe macOS son dos code points); si no puede, seguimos sin transliterar y
  # el sed de abajo se come lo que no sea a-z0-9.
  echo "$base" \
    | tr '[:upper:]' '[:lower:]' \
    | { iconv -f utf-8 -t ascii//TRANSLIT 2>/dev/null || cat; } \
    | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g'
}

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Lee la etiqueta Orientation del EXIF de un JPEG. `sips -g orientation` no la ve
# en fotos de móvil, así que la sacamos a mano de la cabecera.
exif_orient() {
  python3 - "$1" <<'PYEOF'
import struct, sys
d = open(sys.argv[1], 'rb').read(200000)
i = d.find(b'Exif\x00\x00')
print(1) if i < 0 else None
if i >= 0:
    t = d[i+6:]
    be = t[:2] == b'MM'
    u16 = lambda o: struct.unpack('>H' if be else '<H', t[o:o+2])[0]
    u32 = lambda o: struct.unpack('>I' if be else '<I', t[o:o+4])[0]
    try:
        off = u32(4)
        found = 1
        for k in range(u16(off)):
            e = off + 2 + k * 12
            if u16(e) == 0x0112:
                found = u16(e + 8); break
        print(found)
    except Exception:
        print(1)
PYEOF
}

# Normaliza la entrada antes de pasarla a cwebp. Resuelve dos cosas:
#   - PDF (carteles exportados de InDesign) y webp de entrada, que cwebp no lee.
#   - Fotos de móvil con orientación EXIF: cwebp ignora ese tag y las escribe
#     tumbadas, así que aquí las giramos de verdad.
# Si algo falla, seguimos con el original en vez de abortar.
n=0
prepara() {
  local f="$1" ext out deg
  ext="$(echo "${f##*.}" | tr '[:upper:]' '[:lower:]')"
  n=$((n+1))

  case "$ext" in
    jpg|jpeg)
      deg=0
      case "$(exif_orient "$f" 2>/dev/null | tail -1)" in
        3) deg=180;; 6) deg=90;; 8) deg=270;;
      esac
      if [ "$deg" != 0 ]; then
        out="$TMP/in-$n.jpg"
        if cp "$f" "$out" && sips -r "$deg" "$out" >/dev/null 2>&1; then
          echo "  ↻ girada ${deg}° (venía con orientación EXIF)" >&2
          echo "$out"; return
        fi
      fi
      ;;
    pdf|webp|tif|tiff)
      out="$TMP/in-$n.png"
      if sips -s format png "$f" --out "$out" >/dev/null 2>&1 && [ -s "$out" ]; then
        echo "$out"; return
      fi
      ;;
  esac
  echo "$f"
}

shopt -s nullglob nocaseglob
count=0
for f in "$SRC"/*.{jpg,jpeg,png,tif,tiff,pdf,webp}; do
  [ -e "$f" ] || continue
  name="$(slug "$f")"
  out="$DST/$name.webp"
  f="$(prepara "$f")"
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
