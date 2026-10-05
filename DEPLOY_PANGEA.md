# Opción Pangea — la web entera en un alojamiento compartido

> Cómo está publicada la web de TAT ARA: alojamiento compartido de
> [Pangea](https://pangea.org), backend en PHP y base de datos MariaDB.
>
> Hubo una versión del mismo backend como Worker de Cloudflare. Se descartó por
> preferir un alojamiento de proximidad, y se quitó de aquí para que el repo
> describa una sola realidad. Sigue entera en la rama **`opcion-cloudflare`**:
> `git checkout opcion-cloudflare`.

---

## Por qué existe esta opción

El dominio `tatara.cat` está comprado en Pangea, una asociación sin ánimo de lucro
que da servicios de internet a entidades sociales, con los servidores en el centro
de datos de la Fundació guifi.net en la Zona Franca. Para usar Cloudflare hay que
mover los *nameservers* del dominio a Cloudflare: el dominio sigue siendo de Pangea,
pero quien resuelve el DNS y ve pasar todo el tráfico es una empresa de California.

Con esta opción **no se mueve nada**: dominio, DNS, web y base de datos se quedan
en Pangea. El precio es que hay que subir los ficheros a mano (no hay despliegue
automático desde GitHub) y que no hay CDN mundial delante.

### De quién es la cuenta (septiembre de 2026)

En Pangea todo cuelga de una cuenta de socia, y `tatara.cat` vive bajo la de
**L'Afluent SCCL**, no bajo una propia de la asociación. Decisión suya, tomada el
30/09/2026. Lo que implica:

- La **factura** del dominio y del alojamiento va a nombre de L'Afluent.
- Los **accesos** (panel, SFTP, phpMyAdmin) son compartidos con ellos.
- Si algún día la asociación quiere cuenta propia, hay que **migrar** dominio,
  web y base de datos de una cuenta a otra: trabajo manual y con corte de
  servicio. Cuanto antes se haga, más barato sale.

## Qué cambia y qué no

| | Antes (Cloudflare) | Ahora (Pangea) |
|---|---|---|
| La web (HTML/CSS/JS/fotos) | idéntica | idéntica |
| El contenido en `data/*.json` | idéntico | idéntico |
| El backend | Worker de Cloudflare | PHP, `api/` |
| La base de datos | D1 (Cloudflare) | MySQL (Pangea) |
| Newsletter, carrito, stock, admin | funcionan | funcionan igual |
| Publicar un cambio | `git push` | subir por SFTP |
| Coste | gratis | la cuota de socia de Pangea |

**El frontend no cambia ni una línea**: sigue llamando a `/api/...` con rutas
relativas, y `api/index.php` contesta exactamente lo mismo que contestaba el Worker.

---

## 0. Antes de nada: preguntar a Pangea

Lo único que hay que confirmar con ellos:

1. **PHP** — versión 8.0 o superior.
2. **MySQL o MariaDB** — una base de datos, con su usuario y contraseña.
3. **`.htaccess` con `mod_rewrite`** activo (es lo que enruta `/api/...`).
4. **HTTPS** para `tatara.cat` (Let's Encrypt).

Si algo de eso no lo dan, esta opción no sale adelante tal cual y hay que volver a
las otras. El resto de la guía asume que sí.

---

## 1. Crear la base de datos

En el panel de Pangea, crear una base de datos MySQL y apuntar cuatro datos:
**host, nombre, usuario y contraseña**.

Cargar las tablas, de las dos maneras que hay:

**a) Desde phpMyAdmin** → pestaña **Importar** → fichero
[`schema-tatara.mysql.sql`](schema-tatara.mysql.sql).

**b) Desde la propia web**, si phpMyAdmin no va (en octubre de 2026 el de Pangea
daba un «Error» en blanco en cualquier navegador). Con la web ya subida:

```bash
curl -H "Authorization: Bearer EL-TOKEN-DE-ADMIN" https://tatara.cat/api/admin/instalar
```

Contesta qué tablas hay y cuáles faltan. Son `CREATE TABLE IF NOT EXISTS`:
llamarlo dos veces no borra nada ni rompe nada.

Son las mismas cuatro tablas que en D1: `tatara_stock`, `tatara_pedidos`,
`tatara_newsletter`, `tatara_mensajes`.

## 2. Preparar los ficheros que se suben

🖥️ En el ordenador, dentro del repo:

```bash
bash tools/build-pangea.sh
```

Deja una carpeta `dist/` con **exactamente** lo que va al servidor: la web, los
JSON de contenido, el panel `/admin` y la carpeta `api/`. Fuera quedan el código
del Worker, las fotos de origen y la documentación.

## 3. Subir por SFTP

Con FileZilla, Cyberduck o Transmit, subir **el contenido de `dist/`** (no la
carpeta `dist` en sí) a la carpeta pública del alojamiento — la que Pangea indique:
`www/`, `public_html/` o similar.

## 4. Crear `api/config.php` en el servidor

Este fichero **no se sube con el resto** (tiene contraseñas y está en `.gitignore`).
Se crea una vez, directamente en el servidor, copiando
[`api/config.example.php`](api/config.example.php) y rellenándolo:

```php
'db' => [
    'driver' => 'mysql',
    'host'   => 'lo-que-diga-pangea',
    'name'   => 'tatara',
    'user'   => 'tatara',
    'pass'   => 'la-contraseña',
],
'admin_token' => 'un-token-largo',   // generar con: openssl rand -hex 32
```

Stripe puede quedarse vacío de momento: sin claves, el checkout contesta 503 y la
tienda enseña las piezas sin dejar comprar — igual que hace hoy el Worker.

> **Cuidado al actualizar la web**: si se vuelve a subir `dist/` entero, hay que
> **no tocar** `api/config.php`. Los programas de SFTP no lo borran si no está en
> el origen, pero conviene tenerlo presente.

## 5. Comprobar que funciona

En el navegador:

- `https://tatara.cat/api/health` → debe contestar
  `{"ok":true,"runtime":"php 8...","db":"mysql(tablas tatara_*)","productos":11}`
- `https://tatara.cat/api/stock` → las once piezas, todas a 0 la primera vez.
- `https://tatara.cat/` → la web.
- `https://tatara.cat/admin/stock.html` → pide el token; con el de `config.php`, entra.

**Si `/api/health` da 404**, `mod_rewrite` no está activo o `.htaccess` no se lee:
es lo primero que hay que preguntarle a Pangea.
**Si el panel `/admin` da 401 con el token correcto**, el Apache no está pasando la
cabecera `Authorization`: descomentar `CGIPassAuth On` en [`api/.htaccess`](api/.htaccess).

## 6. Stripe (cuando haya cobro de verdad)

1. En el panel de Stripe, crear un **webhook** hacia
   `https://tatara.cat/api/stripe-webhook`, evento `checkout.session.completed`.
2. Copiar la clave secreta y la del webhook a `api/config.php`
   (`stripe_secret_key`, `stripe_webhook_secret`).

El webhook es lo que descuenta el stock y guarda el pedido. Está escrito para que,
si Stripe reenvía el mismo evento (lo hace), **el stock no baje dos veces**: el
pedido y el descuento van en una transacción y `stripe_session_id` es única.

## 7. El día a día de la clienta

Igual que ahora, con un paso más al final:

1. Editar el JSON que toque en `data/` (ver [README.md](README.md)).
2. `npm run check` — comprueba que no haya nada roto.
3. Subir **solo ese fichero** por SFTP a `data/`.

El stock se sigue llevando desde `/admin/stock.html`, que escribe en la base de
datos: eso no pasa por SFTP.

## 8. Copias de seguridad

En Cloudflare, D1 la respaldaba Cloudflare. Aquí hay que pedirle a Pangea cada
cuánto respaldan, y además exportar la base de vez en cuando desde phpMyAdmin
(pestaña **Exportar**) — sobre todo antes de tocar nada. Lo que se perdería son
los pedidos, las altas de newsletter y los mensajes; la web y el contenido están
en GitHub.

---

## La API, ruta por ruta

| ruta | qué hace |
|---|---|
| `GET /api/health` | ping + nº de productos |
| `GET /api/stock` | stock vivo por producto |
| `POST /api/crear-sesion` | checkout Stripe `{carrito:[{id,cantidad}], envio?:{zona}}` (503 sin claves; la sesión caduca a 30 min; cupones activados) |
| `GET /api/session-status?session_id=…` | estado de una sesión, para confirmar el pago al volver de Stripe |
| `POST /api/stripe-webhook` | descuenta stock + registra el pedido (zona, dirección y estado) |
| `POST /api/newsletter` | alta `{email}` |
| `POST /api/contacto` | mensaje `{texto, email?, nombre?}` |
| `GET /api/admin/historial\|newsletter\|mensajes` | lecturas (Bearer ADMIN_TOKEN) |
| `POST /api/admin/stock-bulk` | fija stock `{productos:[{id,cantidad}]}` o `{productos:[{id,stockByTalla}]}` |
| `POST /api/admin/pedido-estado` | `{id, estado}` → pendiente / enviado / entregado / cancelado |
| `GET /api/admin/instalar` | crea las tablas si no existen |

Fijar stock desde la terminal, sin pasar por el panel:

```sh
curl -X POST https://tatara.cat/api/admin/stock-bulk \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "content-type: application/json" \
  -d '{"productos":[{"id":"friccion","cantidad":10}]}'
```

---

## Probarlo en local antes de subir nada

🖥️ Hace falta PHP (`brew install php`). No hace falta ni MySQL ni Pangea:

```bash
bash tools/test-api-php.sh
```

Levanta la API contra una base SQLite temporal y comprueba las 32 respuestas, el
webhook de Stripe **firmado de verdad**, el descuento de stock y la idempotencia.

Para ver la web entera funcionando con este backend:

```bash
php -S 127.0.0.1:8787 -t . tools/php-router.php
```

y abrir `http://127.0.0.1:8787`.

Y si se quiere probar contra MySQL de verdad (lo que correrá en Pangea), con un
MySQL o MariaDB a mano:

```bash
TATARA_DB_DRIVER=mysql TATARA_DB_HOST=127.0.0.1 TATARA_DB_NAME=tatara_test \
TATARA_DB_USER=root TATARA_DB_PASS=xxx bash tools/test-api-php.sh
```

---

## Dónde está cada cosa

```
api/
  index.php            las rutas, una por una
  config.example.php   plantilla de config.php (el de verdad no va a git)
  .htaccess            manda /api/... a index.php y cuida la cabecera Authorization
  lib/
    config.php         lee config.php o las variables de entorno
    db.php             PDO: MySQL o SQLite, transacciones, y los 3 SQL que difieren
    catalogo.php       lee data/botiga.json y data/envios.json
    stripe.php         API REST de Stripe por curl + firma del webhook (sin SDK)
    http.php           leer la petición y contestar JSON
schema-tatara.mysql.sql   las tablas, para phpMyAdmin
tools/build-pangea.sh     prepara dist/
tools/test-api-php.sh     las pruebas
tools/php-router.php      solo para probar en local
```
