# Desarrollo — para quien toque el código

Web estática (HTML, CSS y JS sin build) más un backend pequeño en PHP con
MariaDB, todo en el alojamiento compartido de [Pangea](https://pangea.org).
Para cambiar contenido no hace falta nada de esto: eso está en [GUIA.md](GUIA.md).

---

## Estructura

```
index.html            el esqueleto: barras fijas, #view, menú, modal
css/styles.css        todos los estilos
js/                   módulos ES, sin build. Entrada: main.js
  main.js               arranca: config, colores, listeners globales
  router.js             navegación por hash (#agenda, #exposicions?expo=…) y fundido
  menu.js               menú (columna fija en escritorio, capa en móvil) e idioma
  agenda.js             la agenda
  sections.js           textos (nosaltres, recerca), exposicions, contacte, newsletter
  botiga.js             botiga, ficha de producto y carret (pago con Stripe)
  cart.js               el carret en localStorage
  modal.js              modal de producto y lightbox
  utils.js              $, el, esc, t (i18n), ui (textos de interfaz), zoomImg, X_ICON…
  dates.js · data.js · state.js
data/*.json           TODO el contenido. Cada fichero se llama como su sección
assets/img/           fotos .webp: expos/ · recerca/ · edicions/ · nosaltres/
assets/pdf/           hojas de sala de las exposiciones
admin/                panel interno: stock y pedidos
api/                  el backend PHP (ver "La API")
  config.php            credenciales. NO está en git: vive solo en el servidor
tools/
  build-pangea.sh       prepara dist/ con lo que se sube
  check-data.mjs        revisa los JSON (npm run check)
  test-api-php.sh       las pruebas de la API (npm test)
  php-router.php        servidor local
  to-webp.sh            convierte fotos (npm run webp)
schema-tatara.mysql.sql   las tablas, para MariaDB
schema-tatara.sql         las mismas, para el SQLite de las pruebas
```

El material fuente (fotos originales, PDF, `.docx`) no está en el repo: pesa
demasiado. Vive en el disco de quien lleve el proyecto.

## En local

Hace falta PHP (`brew install php`). Ni MySQL ni Pangea:

```bash
npm run dev      # la web entera con su API en http://127.0.0.1:8788 (SQLite en .data/)
npm test         # 37 comprobaciones de la API, contra un SQLite temporal
npm run check    # revisa los JSON: comas, fotos que no existen, fechas…
```

Sin PHP también se puede mirar la web (sin botiga ni newsletter):
`python3 -m http.server` en la raíz del repo.

`npm test` comprueba todas las rutas, el webhook de Stripe **firmado de verdad**,
el descuento de stock y que un webhook repetido no lo descuente dos veces. Para
probar contra MariaDB de verdad:

```bash
TATARA_DB_DRIVER=mysql TATARA_DB_HOST=127.0.0.1 TATARA_DB_NAME=tatara_test \
TATARA_DB_USER=root TATARA_DB_PASS=xxx npm test
```

## Cómo funciona

**Secciones y router.** El índice vive en `data/menu.json`: `id`, `type`, `data`
y `label`. El menú y el router salen de ahí, y cada sección es `#id`. Añadir una
= una entrada en `menu.json` + su JSON + (solo si el `type` es nuevo) un
`render*()` y su `case` en el `switch` de `js/router.js`.

**Diseño.** Blanco y negro: el color solo llega con las fotos. En escritorio,
cuatro columnas iguales: el menú en la primera, el contenido en las dos del
centro (con TAT arriba y ARA abajo repartidas a su ancho) y carret/idiomas en la
cuarta; las barras son transparentes, el contenido pasa por debajo del logo y
este va en modo diferencia (invierte lo que tiene debajo).
En móvil, una columna, el menú como capa y también TAT arriba y ARA abajo.
Al abrir la web, TAT y ARA salen juntos del centro y se separan hasta sus
barras mientras carga la primera vista (`js/intro.js`). Un solo cuerpo de letra (`--fs`) y un
solo interlineado (`--lh`); en escritorio el cuerpo crece con la columna para
mantener unos 72 caracteres por línea. Sin negritas: los títulos van en
mayúscula y lo que se quiere resaltar, subrayado. Todo va alineado a la
izquierda salvo las secciones con poco contenido (contacte, newsletter, carret
vacío), que van centradas en las dos direcciones. Viene del feedback de Ariadna
Serrahima (octubre de 2026). El diseño anterior, con bloques de color, está en
la etiqueta `v0-disseny-color` y publicado en
[meowrhino.github.io/tatarav0](https://meowrhino.github.io/tatarav0/).

**Colores.** Salen de `data.json` → `theme`, que se publica como custom
properties (`--bg`, `--ink`…) desde `main.js`.

**Agenda.** Una entrada por exposición, en orden cronológico, separadas por un
hilo negro: título y fechas, artista, descripción, imagen (opcional, nunca el
cartel), los eventos anidados, y abajo la fecha de cierre y el tipo (`kind`). Al
abrir, la vista arranca en lo que pasa hoy (`scrollAgendaToToday`).

**Exposicions.** Lista de `ARTISTA, Expo`; cada ficha se abre en la propia
columna, con su dirección (`#exposicions?expo=anna-dot`, sacada del nombre).

**Caché.** Sin trucos (ni `?v=` ni `no-store`): el `.htaccess` de la raíz sirve
JSON, HTML, CSS y JS con `no-cache, must-revalidate`, y fotos y tipografías con
una semana de caché (cuando cambian, cambian de nombre). Subir un JSON basta para
verlo al momento. **Si algún día la web se sirve desde otro sitio, hay que volver
a poner esas cabeceras**, o el navegador enseñará versiones viejas.

---

## Publicar en Pangea

La web que se ve en `tatara.cat` es la que hay en el servidor de Pangea, y llega
ahí por SFTP. Hay dos maneras: **automática**, con cada `git push` a `main`
(si está activada, ver abajo), o **a mano**, con los pasos 0 a 4.

### Publicación automática (GitHub Actions)

[.github/workflows/publicar.yml](.github/workflows/publicar.yml) se ejecuta con
cada push a `main` que no sea solo documentación (`*.md`), y también a mano desde
la pestaña *Actions* → *Publicar en tatara.cat* → *Run workflow*. Hace esto:

1. `npm run check`. **Si un JSON está roto, para y no publica nada.**
2. `npm run build`, que además comprueba que en el servidor no haya cambios de
   `data/` que no estén en GitHub (alguien que subió un JSON por SFTP). Si los
   hay, para: hay que traerlos desde un ordenador con `npm run build`, hacer
   commit y push.
3. Sube `dist/` por SFTP con `lftp mirror`: solo lo que ha cambiado, sin borrar
   nada del servidor (así `api/config.php` no se toca). La clave del servidor va
   fijada en el script: si no es la de Pangea, no sube.
4. Comprueba `/api/health` y mueve la etiqueta `publicado`.

**Para activarla**: en GitHub, *Settings* → *Secrets and variables* → *Actions* →
*New repository secret*, nombre `SFTP_PASSWORD`, valor la contraseña de SFTP.
Sin ese secret el workflow revisa y prepara, pero no sube nada. **Cuando Pangea
cambie la contraseña, hay que cambiarla también aquí.**

Si la publicación falla, GitHub manda un correo a quien hizo el push y el
detalle está en la pestaña *Actions*. La web se queda como estaba.

Con la publicación automática activa, la clienta puede editar los JSON
directamente en GitHub (el lápiz de cada fichero → *Commit changes*) y se
publican solos, ya revisados. Si sigue subiéndolos por SFTP también funciona,
pero entonces el próximo push de código parará hasta que alguien traiga sus
cambios al repo (paso 0).

### Publicación a mano

### 0. El contenido de la clienta ⚠️

La clienta edita los JSON de `data/` y los sube **directamente al servidor**, así
que el `data/` del servidor puede ser más nuevo que el del repo. Si se sube
`dist/` sin más, **se pisan sus cambios**.

`npm run build` lo resuelve solo: antes de copiar nada, baja los JSON del
servidor (son públicos: ni SFTP ni contraseña), los compara con lo último que se
publicó —la etiqueta git **`publicado`**— y suma a `data/` solo lo que ha
cambiado ella, sin deshacer lo que hayamos cambiado nosotros. Puede decir:

- `la clienta no ha cambiado nada` → sigue.
- `traídos cambios de la clienta` → sigue, y quedan en `data/` para guardarlos
  con un commit (`git diff HEAD -- data/` para verlos).
- `Sus cambios chocan con los tuyos` → para. Hay que abrir el JSON, elegir entre
  `<<<<<<< ours` (lo nuestro) y `>>>>>>> theirs` (lo suyo), y repetir.
- `No se ha podido bajar…` → para sin tocar nada (sin red, o el servidor no
  contesta).

Por eso es importante el paso 4: si la etiqueta `publicado` no se mueve después
de subir, la próxima vez se compararía con una versión vieja.

### 1. Preparar lo que se sube

```bash
npm run build
```

Deja en `dist/` exactamente lo que va al servidor: la web, los JSON, `/admin` y
`api/`. Fuera quedan las herramientas, la documentación y las fotos de origen.
Si `dist/api/config.php` ya existía, se conserva.

### 2. Subir por SFTP

Con Cyberduck o con `sftp` (servidor `web-12.pangea.org`, puerto 22, usuario
`tatara-web`; se aterriza en `/tatara`, que es la carpeta pública). Se sube **el
contenido** de `dist/`, no la carpeta:

```
lcd dist
put -r *
put .htaccess
bye
```

El `.htaccess` de la raíz va aparte porque `*` no coge los ficheros que empiezan
por punto. El de `api/` sí viaja con `put -r`. Con Cyberduck: *Ver → Mostrar
archivos ocultos* antes de arrastrar.

Subir no borra lo que ya hay. Lo que se quita del repo (fotos viejas, por
ejemplo) se queda en el servidor hasta que alguien lo borre a mano; no molesta.

### 3. Comprobar

```bash
curl -s https://tatara.cat/api/health
# → {"ok":true,"runtime":"php 8.3…","db":"mysql(tablas tatara_*)","productos":11}

curl -s -o /dev/null -w "%{http_code}\n" https://tatara.cat/api/lib/db.php
curl -s -o /dev/null -w "%{http_code}\n" https://tatara.cat/schema-tatara.mysql.sql
# → 403 los dos: lo que no se tiene que ver, no se ve
```

Y abrir `https://tatara.cat` en una ventana privada.

### 4. Marcar lo publicado

```bash
git tag -f publicado && git push -f origin publicado
```

La etiqueta `publicado` dice qué commit hay en el servidor. Es lo que usa el
paso 0 la próxima vez.

**Si `/api/health` da 404**: falta el `api/.htaccess` o `mod_rewrite` no está
activo. **Si `/admin` da 401 con el token bueno**: Apache no pasa la cabecera
`Authorization`; descomentar `CGIPassAuth On` en [api/.htaccess](api/.htaccess).

### `api/config.php`

Es el único fichero del servidor con secretos (base de datos, token de admin y,
el día que haya cobro, Stripe). No está en git. Se crea una vez en el servidor a
partir de [api/config.example.php](api/config.example.php); al volver a subir
`dist/` no se toca. La copia local de `dist/api/config.php` existe solo para que
`npm run build` no la pierda: no compartirla.

### La base de datos

Cuatro tablas: `tatara_stock`, `tatara_pedidos`, `tatara_newsletter`,
`tatara_mensajes`. Si hubiera que crearlas de nuevo (otra base, otro
alojamiento), sin phpMyAdmin:

```bash
curl -H "Authorization: Bearer EL-TOKEN-DE-ADMIN" https://tatara.cat/api/admin/instalar
```

Son `CREATE TABLE IF NOT EXISTS`: llamarlo dos veces no borra nada.

---

## Stripe

El webhook (`checkout.session.completed` → `/api/stripe-webhook`) es lo que
descuenta el stock y guarda el pedido. Está escrito para que, si Stripe reenvía
el mismo evento (lo hace), **el stock no baje dos veces**: el pedido y el
descuento van en una transacción y `stripe_session_id` es única. Sin claves en
`config.php`, el checkout contesta 503 y la botiga enseña las piezas sin dejar
comprar. Los pasos para activarlo están en [TRASPASO.md](TRASPASO.md).

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
| `GET /api/admin/historial\|newsletter\|mensajes` | lecturas (Bearer token de admin) |
| `POST /api/admin/stock-bulk` | fija stock `{productos:[{id,cantidad}]}` o `{productos:[{id,stockByTalla}]}` |
| `POST /api/admin/pedido-estado` | `{id, estado}` → pendiente / enviado / entregado / cancelado |
| `GET /api/admin/instalar` | crea las tablas si no existen |

```
api/
  index.php            las rutas
  config.example.php   plantilla de config.php
  .htaccess            manda /api/... a index.php y cuida la cabecera Authorization
  lib/
    config.php         lee config.php o las variables de entorno (las pruebas)
    db.php             PDO: MySQL o SQLite, transacciones
    catalogo.php       lee data/botiga.json y data/envios.json
    stripe.php         API REST de Stripe por curl + firma del webhook (sin SDK)
    http.php           leer la petición y contestar JSON
```

---

## Lo que hubo antes

- **Backend en Cloudflare.** Durante el desarrollo, la API fue un Worker de
  Cloudflare con base D1. Se cambió a Pangea para no sacar el dominio de un
  alojamiento de proximidad. El código está entero en la rama
  `opcion-cloudflare`. El Worker sigue publicado y hay que borrarlo: ver
  [TRASPASO.md](TRASPASO.md), punto 1.
- **Diseño v0.** El primer diseño (bloques de color, menú desplegable) está en la
  etiqueta `v0-disseny-color` y en el repo
  [meowrhino/tatarav0](https://github.com/meowrhino/tatarav0), publicado en
  [meowrhino.github.io/tatarav0](https://meowrhino.github.io/tatarav0/).
