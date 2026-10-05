#!/usr/bin/env bash
# tools/test-api-php.sh — prueba la API de PHP entera, sin Pangea y sin Stripe.
#
# Levanta el servidor de PHP contra una base SQLite temporal, llama a todas las
# rutas y comprueba las respuestas. Incluye el camino que más miedo da: el
# webhook de Stripe firmado de verdad (la firma se calcula aquí con el mismo
# secreto), el descuento de stock y la idempotencia si el webhook llega dos veces.
#
#   bash tools/test-api-php.sh
set -uo pipefail
cd "$(dirname "$0")/.."

PUERTO=${PUERTO:-8787}
BASE="http://127.0.0.1:$PUERTO/api"
TMP=$(mktemp -d)
export ADMIN_TOKEN="token-de-pruebas-0123456789"
export STRIPE_WEBHOOK_SECRET="whsec_pruebas"
export STRIPE_SECRET_KEY=""     # sin clave: el checkout debe contestar 503

command -v php >/dev/null || { echo "✗ falta php (brew install php)"; exit 1; }

# Por defecto SQLite en un fichero temporal: no hace falta instalar nada.
# Para probar contra MySQL de verdad (lo que corre en Pangea), exportar antes:
#   TATARA_DB_DRIVER=mysql TATARA_DB_HOST=127.0.0.1 TATARA_DB_NAME=tatara_test \
#   TATARA_DB_USER=root TATARA_DB_PASS=...   bash tools/test-api-php.sh
export TATARA_DB_DRIVER=${TATARA_DB_DRIVER:-sqlite}

if [[ "$TATARA_DB_DRIVER" == "mysql" ]]; then
  echo "· base de pruebas: MySQL ${TATARA_DB_NAME:-?} en ${TATARA_DB_HOST:-?}"
  MY=(mysql --protocol=TCP -h "${TATARA_DB_HOST:-127.0.0.1}" -u "${TATARA_DB_USER:-root}")
  [[ -n "${TATARA_DB_PORT:-}" ]] && MY+=(-P "$TATARA_DB_PORT")
  [[ -n "${TATARA_DB_PASS:-}" ]] && MY+=(-p"$TATARA_DB_PASS")
  "${MY[@]}" -e "DROP DATABASE IF EXISTS \`$TATARA_DB_NAME\`; CREATE DATABASE \`$TATARA_DB_NAME\`" \
    || { echo "✗ no se pudo preparar la base MySQL de pruebas"; exit 1; }
  "${MY[@]}" "$TATARA_DB_NAME" < schema-tatara.mysql.sql \
    || { echo "✗ el esquema MySQL no se pudo cargar"; exit 1; }
else
  export TATARA_SQLITE_PATH="$TMP/tatara.sqlite"
  # El mismo fichero de esquema que se carga en D1, que también es SQLite.
  php -r '$db=new PDO("sqlite:".getenv("TATARA_SQLITE_PATH")); $db->exec(file_get_contents("schema-tatara.sql"));' \
    || { echo "✗ no se pudo crear la base de pruebas"; exit 1; }
fi

php -S "127.0.0.1:$PUERTO" -t . tools/php-router.php >"$TMP/server.log" 2>&1 &
SERVER=$!
# KEEP=1 deja la base y el log del servidor donde están, para poder mirarlos.
trap '{ kill $SERVER; wait $SERVER; } 2>/dev/null; if [[ -n "${KEEP:-}" ]]; then echo "· log del servidor: $TMP/server.log"; else rm -rf "$TMP"; fi' EXIT
for _ in $(seq 1 40); do curl -s "$BASE/health" >/dev/null 2>&1 && break; sleep 0.25; done

OK=0; KO=0
comprobar() { # comprobar "nombre" "esperado" "obtenido"
  if [[ "$3" == *"$2"* ]]; then OK=$((OK+1)); printf '  ✓ %s\n' "$1"
  else KO=$((KO+1)); printf '  ✗ %s\n     esperaba: %s\n     obtuvo:   %s\n' "$1" "$2" "$3"; fi
}
codigo() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

PRODUCTO=$(php -r 'require "api/lib/catalogo.php"; foreach(productos() as $p) if(comprable($p)){echo $p["id"];break;}')
echo "· producto de prueba: $PRODUCTO"

echo "salud y catálogo"
comprobar "GET /health responde ok"           '"ok":true'   "$(curl -s "$BASE/health")"
comprobar "GET /health cuenta los productos"  '"productos":11' "$(curl -s "$BASE/health")"
comprobar "GET /stock da de alta el catálogo a 0" "\"$PRODUCTO\":{\"_\":0}" "$(curl -s "$BASE/stock")"
comprobar "ruta inexistente → 404"            '404' "$(codigo "$BASE/no-existe")"

echo "newsletter y contacto"
# Los cuerpos JSON van en variables a propósito: escritos a mano dentro de
# "$(curl ... -d "{\"a\":1}")" bash se come las comillas y expande las llaves.
P_ALTA='{"email":"hola@tatara.cat"}'
P_MAL='{"email":"esto-no"}'
P_MSG='{"nombre":"Ada","email":"a@b.cat","texto":"bon dia"}'
P_VACIO='{"texto":"   "}'
comprobar "alta válida"            '"ok":true'  "$(curl -s -X POST "$BASE/newsletter" -d "$P_ALTA")"
comprobar "alta repetida no falla" '"ok":true'  "$(curl -s -X POST "$BASE/newsletter" -d "$P_ALTA")"
comprobar "email inválido → 400"   '400'        "$(codigo -X POST "$BASE/newsletter" -d "$P_MAL")"
comprobar "mensaje de contacto"    '"ok":true'  "$(curl -s -X POST "$BASE/contacto" -d "$P_MSG")"
comprobar "mensaje vacío → 400"    '400'        "$(codigo -X POST "$BASE/contacto" -d "$P_VACIO")"

echo "admin (token)"
AUTH=(-H "Authorization: Bearer $ADMIN_TOKEN")
comprobar "sin token → 401"        '401' "$(codigo "$BASE/admin/historial")"
comprobar "token erróneo → 401"    '401' "$(codigo -H 'Authorization: Bearer nope' "$BASE/admin/historial")"
comprobar "con token → 200"        '200' "$(codigo "${AUTH[@]}" "$BASE/admin/historial")"
comprobar "lista de newsletter"    'hola@tatara.cat' "$(curl -s "${AUTH[@]}" "$BASE/admin/newsletter")"
comprobar "lista de mensajes"      'bon dia'         "$(curl -s "${AUTH[@]}" "$BASE/admin/mensajes")"
P_STOCK=$(printf '{"productos":[{"id":"%s","cantidad":5}]}' "$PRODUCTO")
comprobar "stock-bulk actualiza"   '"updated":1' "$(curl -s -X POST "${AUTH[@]}" "$BASE/admin/stock-bulk" -d "$P_STOCK")"
comprobar "el stock quedó en 5"    "\"$PRODUCTO\":{\"_\":5}" "$(curl -s "$BASE/stock")"

echo "instalar tablas desde cero"
# La base de pruebas ya tiene las tablas, así que se tiran y se piden otra vez.
if [[ "$TATARA_DB_DRIVER" == "mysql" ]]; then
  "${MY[@]}" "$TATARA_DB_NAME" -e "DROP TABLE tatara_stock, tatara_pedidos, tatara_newsletter, tatara_mensajes"
else
  php -r '$db=new PDO("sqlite:".getenv("TATARA_SQLITE_PATH"));
          foreach(["tatara_stock","tatara_pedidos","tatara_newsletter","tatara_mensajes"] as $t) $db->exec("DROP TABLE $t");'
fi
comprobar "sin tablas, /stock falla"   '500' "$(codigo "$BASE/stock")"
comprobar "/admin/instalar sin token → 401" '401' "$(codigo "$BASE/admin/instalar")"
comprobar "/admin/instalar las crea"   '"faltan":[]' "$(curl -s "${AUTH[@]}" "$BASE/admin/instalar")"
comprobar "llamarlo dos veces no rompe" '"faltan":[]' "$(curl -s "${AUTH[@]}" "$BASE/admin/instalar")"
comprobar "y el stock vuelve"          "\"$PRODUCTO\":{\"_\":0}" "$(curl -s "$BASE/stock")"
# Se deja el stock otra vez a 5 para lo que viene después.
curl -s -X POST "${AUTH[@]}" "$BASE/admin/stock-bulk" -d "$P_STOCK" >/dev/null

echo "checkout sin claves de Stripe"
P_CARRITO=$(printf '{"carrito":[{"id":"%s","cantidad":1}]}' "$PRODUCTO")
comprobar "crear-sesión → 503"     '503' "$(codigo -X POST "$BASE/crear-sesion" -d "$P_CARRITO")"
comprobar "session-status → 503"   '503' "$(codigo "$BASE/session-status?session_id=cs_test")"
comprobar "session-status sin id → 400" '400' "$(codigo "$BASE/session-status")"

echo "webhook de Stripe (firmado de verdad)"
# La firma es sobre los bytes exactos del cuerpo, así que el evento vive en un
# fichero: se firma ese fichero y se envía ese fichero (--data-binary), sin que
# el shell le añada ni le quite un salto de línea.
EVENTO="$TMP/evento.json"
printf '%s' '{"id":"evt_1","type":"checkout.session.completed","data":{"object":{
  "id":"cs_test_123","amount_total":12300,"currency":"eur",
  "customer_details":{"email":"compra@tatara.cat","name":"Ada L","phone":"600"},
  "collected_information":{"shipping_details":{"name":"Ada L","address":{"city":"Barcelona","country":"ES"}}},
  "metadata":{"carrito":"[{\"id\":\"__PRODUCTO__\",\"cantidad\":2}]","zona":"recogida"}}}}' \
  | sed "s/__PRODUCTO__/$PRODUCTO/" > "$EVENTO"

firmar() { php -r '$c=file_get_contents($argv[1]);$t=time();echo "t=$t,v1=".hash_hmac("sha256","$t.$c",getenv("STRIPE_WEBHOOK_SECRET"));' "$1"; }

comprobar "firma inválida → 400" '400' "$(codigo -X POST "$BASE/stripe-webhook" -H 'Stripe-Signature: t=1,v1=falsa' --data-binary "@$EVENTO")"
comprobar "firma válida → recibido" '"received":true' "$(curl -s -X POST "$BASE/stripe-webhook" -H "Stripe-Signature: $(firmar "$EVENTO")" --data-binary "@$EVENTO")"
comprobar "el stock bajó de 5 a 3" "\"$PRODUCTO\":{\"_\":3}" "$(curl -s "$BASE/stock")"
comprobar "el pedido se guardó"    'compra@tatara.cat' "$(curl -s "${AUTH[@]}" "$BASE/admin/historial")"
comprobar "guardó la dirección"    'Barcelona'         "$(curl -s "${AUTH[@]}" "$BASE/admin/historial")"
comprobar "guardó el título del JSON, no el del navegador" '"nombre":' "$(curl -s "${AUTH[@]}" "$BASE/admin/historial")"

echo "idempotencia (Stripe reenvía el mismo evento)"
comprobar "segundo envío → 200"    '"received":true' "$(curl -s -X POST "$BASE/stripe-webhook" -H "Stripe-Signature: $(firmar "$EVENTO")" --data-binary "@$EVENTO")"
comprobar "el stock NO vuelve a bajar" "\"$PRODUCTO\":{\"_\":3}" "$(curl -s "$BASE/stock")"
comprobar "sigue habiendo un solo pedido" '1' "$(curl -s "${AUTH[@]}" "$BASE/admin/historial" | php -r '$d=json_decode(stream_get_contents(STDIN),true); echo is_array($d)&&array_is_list($d)?count($d):"no es una lista";')"

echo "estado del pedido"
PEDIDO=$(curl -s "${AUTH[@]}" "$BASE/admin/historial" | php -r '$d=json_decode(stream_get_contents(STDIN),true); echo $d[0]["id"] ?? "";')
P_ENV=$(printf '{"id":"%s","estado":"enviado"}' "$PEDIDO")
P_RARO=$(printf '{"id":"%s","estado":"volando"}' "$PEDIDO")
comprobar "marcar como enviado"    '"ok":true' "$(curl -s -X POST "${AUTH[@]}" "$BASE/admin/pedido-estado" -d "$P_ENV")"
comprobar "el historial lo refleja" '"estado":"enviado"' "$(curl -s "${AUTH[@]}" "$BASE/admin/historial")"
comprobar "estado inventado → 400" '400' "$(codigo -X POST "${AUTH[@]}" "$BASE/admin/pedido-estado" -d "$P_RARO")"
comprobar "pedido inexistente → 404" '404' "$(codigo -X POST "${AUTH[@]}" "$BASE/admin/pedido-estado" -d '{"id":"ord_nada","estado":"enviado"}')"

echo
if [[ $KO -eq 0 ]]; then echo "✓ $OK comprobaciones, 0 fallos"; else echo "✗ $KO fallo(s) de $((OK+KO))"; fi
exit $(( KO > 0 ))
