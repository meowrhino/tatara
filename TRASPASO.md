# Traspaso — quién tiene qué, y qué queda por hacer

> Aquí no hay ninguna contraseña escrita, y no tiene que haberla nunca: este
> fichero vive en GitHub. Las contraseñas van al gestor de contraseñas.

---

## Dónde vive cada cosa (octubre de 2026)

| | Dónde | De quién |
|---|---|---|
| **La web de verdad** | `https://tatara.cat`, alojamiento de Pangea (`web-12`) | cuenta de socia de **L'Afluent SCCL** |
| El dominio y el certificado HTTPS | Pangea (el certificado lo renuevan ellos) | la misma cuenta |
| La base de datos (stock, pedidos, newsletter, mensajes) | MariaDB en Pangea | la misma cuenta |
| El código | [github.com/meowrhino/tatara](https://github.com/meowrhino/tatara) | cuenta de desarrollo (ver más abajo) |
| El primer diseño, archivado | [meowrhino.github.io/tatarav0](https://meowrhino.github.io/tatarav0/) | cuenta de desarrollo; no cambia nunca |
| El diseño anterior, en marcha | `tatara.manuellatourf.workers.dev` (Worker + D1) | cuenta personal de Cloudflare; **se queda**, como `tatarav0`, de archivo nuestro (punto 1) |
| Los cobros | Stripe, sin activar | tendrá que ser de TAT ARA |

**Que la cuenta de Pangea sea de L'Afluent** fue decisión suya (30/09/2026). La
factura va a su nombre y los accesos son compartidos. Si algún día la asociación
quiere cuenta propia, hay que migrar dominio, web y base de una cuenta a otra:
trabajo manual y con corte de servicio. Cuanto antes, más barato.

## Cómo se publica

| Quiero… | Se hace… | ¿Cambia tatara.cat? |
|---|---|---|
| Cambiar un texto, una fecha, una foto, un precio | editar el JSON con VS Code y *Sync* ([GUIA.md](GUIA.md)) | **sí, solo**, en 2-3 minutos, ya revisado |
| Cambiar las unidades de stock | `/admin/stock.html` | sí, al momento |
| Cambiar el diseño o el código | commit y `git push` a `main` | **sí, solo**, en un minuto (GitHub Actions) |
| Publicar a mano | `npm run build` y subir `dist/` por SFTP ([DESARROLLO.md](DESARROLLO.md#publicar-en-pangea)) | sí |

La publicación automática es un script de GitHub Actions que revisa los JSON y
sube a Pangea por SFTP con cada push a `main`. **Activa desde el 7 de octubre de
2026**, con la contraseña de SFTP guardada como secret `SFTP_PASSWORD` del
repositorio ([DESARROLLO.md](DESARROLLO.md#publicación-automática-github-actions)).
**La clienta edita en GitHub** (decidido el 14 de octubre de 2026), con
**VS Code** en su ordenador: nunca toca el SFTP.

### Las dos copias del contenido

Mientras la clienta editaba por SFTP, los JSON vivían dos veces (servidor y
repo) y `npm run build` traía los del servidor antes de publicar
([DESARROLLO.md](DESARROLLO.md#0-el-contenido-de-la-clienta-)). Con la clienta en
GitHub hay una sola copia, la del repo; esa protección se queda por si alguien
sube algo por SFTP a mano: la publicación automática para y avisa.

---

## El repositorio pasa a TAT ARA (una copia)

Decidido: como en todas las webs del estudio, **le pasamos una copia del repo a
su cuenta** y la clienta edita ahí. `meowrhino/tatara` se queda como nuestra
copia de referencia.

1. TAT ARA crea una cuenta de GitHub (mejor una organización a nombre de la
   asociación que una cuenta personal) y nos pasa el nombre.
2. Creamos la copia **sin historial** (decidido el 20 de octubre de 2026): solo
   los ficheros del repo (nada de lo ignorado: fotos originales, `.dev.vars`,
   `api/config.php`), un primer commit y la etiqueta `publicado` sobre él, que
   la publicación necesita. Su repo tiene que estar **vacío** (sin README):

   ```bash
   mkdir /tmp/tatara-entrega && git -C ~/Documents/GitHub/tatara archive HEAD | tar -x -C /tmp/tatara-entrega
   cd /tmp/tatara-entrega && git init -b main && git add -A && git commit -m "La web de TAT ARA"
   git tag publicado && git remote add origin https://github.com/SU-CUENTA/tatara.git
   git push -u origin main --tags
   ```

3. En la copia: *Settings → Secrets and variables → Actions* → secret
   `SFTP_PASSWORD`, y *Settings → Collaborators* → nosotros, para poder seguir
   arreglando cosas.
4. **En `meowrhino/tatara`, borrar el secret `SFTP_PASSWORD`**
   (`gh secret delete SFTP_PASSWORD -R meowrhino/tatara`). Si los dos repos
   pudieran publicar, un push nuestro subiría JSON viejos encima de los suyos.
5. Hacer un cambio pequeño en la copia y comprobar que sale el círculo verde en
   *Actions* y que se ve en tatara.cat.
6. Cambiar `meowrhino/tatara` por la dirección nueva en este fichero y en el
   README.

A partir de ahí, los cambios de código se hacen **en su copia** (como
colaboradores), no en la nuestra.

`tatarav0` se queda en nuestra cuenta: es un archivo de diseño, no forma parte
de la web.

**Nada de lo que hay en el servidor cambia** y **no hay que avisar a Pangea**:
Pangea no sabe nada de GitHub. Lo único que une los dos es el secret
`SFTP_PASSWORD`. La web, la base de datos y `api/config.php` siguen donde están.

---

## Las tres claves

Se entregan por gestor de contraseñas, nunca por WhatsApp ni por correo.

1. **SFTP** — servidor `web-12.pangea.org`, puerto 22, usuario `tatara-web`. Para
   subir contenido. La da Pangea.
2. **Token de admin** — abre `/admin/stock.html` y `/admin/tickets.html`.
3. **phpMyAdmin** — mismo usuario, contraseña propia de Pangea. No hace falta
   para el día a día (y en octubre de 2026 el de Pangea no funcionaba).

**El token de admin no está en el repositorio.** Vive solo en el servidor, en
`api/config.php` (que está en `.gitignore`). Si se pierde o se ha compartido mal:
entrar por SFTP, abrir `api/config.php`, cambiar `admin_token` y guardar. No hay
nada que migrar. Para generar uno nuevo:

```bash
openssl rand -hex 32
```

## El día a día: quién hace qué

| Tarea | Quién | Cómo |
|---|---|---|
| Textos, fechas, fotos, precios | TAT ARA | editar el JSON con VS Code |
| Unidades de stock | TAT ARA | `/admin/stock.html` |
| Ver pedidos, mensajes y altas | TAT ARA | `/admin/tickets.html` |
| Diseño, secciones nuevas, código | desarrollo | push a su copia en GitHub (publica sola) |
| Restaurar una copia de seguridad | Pangea | `suport@pangea.org`, L–V de 9 a 14 |

---

## Lista del traspaso

### 1. La etapa anterior: el Worker de Cloudflare

Durante el desarrollo la web corrió en un Worker de Cloudflare, en la cuenta de
Manu, con una base D1 compartida con otro proyecto (quienNoCorre). Sigue
publicado en `tatara.manuellatourf.workers.dev`, con el diseño anterior y sus
propios datos. **Decidido el 19 de octubre de 2026: se queda**, como archivo
nuestro del primer diseño (igual que `tatarav0`), fuera del traspaso: no es de
la clienta ni se le menciona. Cómo nos quedamos una copia de la web actual se
decide después del traspaso.

- [ ] **Sacar los datos.** Sus formularios siguen vivos: a 19 de octubre de 2026
      la D1 tiene **2 altas** en `tatara_newsletter` (0 mensajes, 0 pedidos).
      Pasarlas a la base nueva (un `POST /api/newsletter` por email) y, de vez
      en cuando, volver a mirar:

      npx wrangler d1 execute shop --remote \
        --command "SELECT COUNT(*) FROM tatara_newsletter"

### 2. Claves

- [ ] Las tres claves de arriba, al gestor de contraseñas de la asociación.
- [ ] **Cambiar la contraseña SFTP**, cuando el traspaso esté cerrado: pedirla
      a Pangea, actualizar el secret `SFTP_PASSWORD` y borrar la vieja del
      `.docx` del Drive.
- [x] Decidir quién se queda el repositorio: una copia en su cuenta (arriba).
- [ ] Hacer la copia y borrar el secret de `meowrhino/tatara` (arriba, pasos 1-6).
- [x] Publicación automática: `SFTP_PASSWORD` guardada como secret del repo.
- [ ] **Al cambiar la contraseña de SFTP, cambiarla también en el secret**
      **de su copia** (*Settings → Secrets*).
- [x] La clienta edita en GitHub, sin Cyberduck: [GUIA.md](GUIA.md) reescrita.

### 3. Contenido

- [ ] **Datos de contacto** en `data/site.json`: correo, dirección, redes.
- [ ] **Instagram** para el pie de contacte (`site.json` → `contact.links`).
- [ ] **Enlaces** a la web de cada artista: faltan trece.
- [ ] Confirmar si HOLON, Alicia Monreal y el colectivo de Alba Yruela siguen
      vigentes.
- [ ] Fotos para la agenda: opcionales, una por entrada, de la obra (nunca el
      cartel). Hoy no hay ninguna.
- [ ] `npm run check` en verde.

### 4. Botiga y Stripe — cuando se quiera cobrar de verdad

- [ ] **Stock.** Nace a 0, y sin unidades nada se puede comprar: contar
      ejemplares en `/admin/stock.html`.
- [ ] **Envíos.** `data/envios.json` está vacío (`[]`) = solo recogida en la
      galería. Si van a enviar, rellenar las zonas
      (`{zona, nombre, precio|tramos, paises?, recogida?}`).
- [ ] **Cuenta de Stripe a nombre de la asociación**, con su banco. Es donde
      llega el dinero: no admite atajos.
- [ ] `stripe_secret_key` y `stripe_webhook_secret` en `api/config.php`, por
      SFTP. En ningún otro sitio.
- [ ] **Webhook** en Stripe hacia `https://tatara.cat/api/stripe-webhook`, evento
      `checkout.session.completed`. Sin él se cobra, pero **el stock no baja y
      el pedido no se registra**.
- [ ] En el panel de Stripe: Bizum, recibos por correo y cupones si se quieren.
- [ ] Compra de prueba en modo test (`4242 4242 4242 4242`) → que el pedido salga
      en `/admin/tickets.html` → solo entonces, claves *live*.
- [ ] **Página legal** (aviso legal, privacidad, desistimiento). No existe, y con
      cobro real es obligatoria.

### 5. Avisos por correo

Hoy nadie se entera de que ha entrado un pedido o un mensaje si no mira
`/admin/`.

- [ ] Decidir a quién llegan: `associaciotatara@gmail.com`, desarrollo, o los dos
      durante el rodaje.
- [ ] ⚠️ En Pangea **`mail()` de PHP está deshabilitado**: hay que enviar por
      SMTP autenticado, con una cuenta de correo del dominio que da Pangea.
- [ ] Con remitente `@tatara.cat`, revisar SPF y DKIM con ellos.

### 6. Formularios públicos sin límite

`/api/newsletter` y `/api/contacto` aceptan peticiones de cualquiera. Hoy da
igual; el día que la web circule, un bot puede llenar la base de altas y
mensajes falsos.

- [ ] Cuando empiece a moverse: un límite por IP y minuto en el propio PHP (unas
      veinte líneas) o [Turnstile](https://www.cloudflare.com/products/turnstile/),
      que funciona en cualquier web sin alojar nada en Cloudflare.

### 7. Copias de seguridad

Pangea hace copia **cada noche**, guarda 7 días seguidos y luego la del domingo
durante 6 meses. La pérdida máxima es de un día.

- [ ] Que la asociación sepa que esa es la red de seguridad, y cómo pedir una
      restauración.
- [ ] Antes de cualquier cambio gordo, exportar la base.
- [ ] Los pedidos pagados están **también en Stripe**: aunque se perdiera la
      base, el cobro y los datos del comprador no se pierden.

### 8. Enseñarle a la clienta

Sin esto el traspaso no está terminado:

- [ ] Su cuenta de GitHub, la copia del repo y VS Code con la copia clonada
      ([GUIA.md](GUIA.md), punto 0).
- [ ] Cambiar un texto de principio a fin, ella sola: *Sync*, cambiar, *Commit*,
      *Sync Changes*, círculo verde en *Actions*, recargar.
- [ ] Subir una foto pasada por imgToWeb y ponerla en el JSON.
- [ ] Romper un JSON a propósito (una coma), ver el círculo rojo y el mensaje,
      y arreglarlo.
- [ ] Entrar en `/admin/`, contar stock y marcar un pedido como enviado.
- [ ] A quién llamar cuando algo se rompa.

---

## Qué se rompe si se olvida cada cosa

| Se olvida | Qué pasa |
|---|---|
| Mover la etiqueta `publicado` después de subir | La próxima publicación compara con una versión vieja y puede deshacer cambios |
| Mirar la D1 del Worker viejo | Alguien se apunta a la newsletter en la web vieja y nadie se entera |
| Webhook de Stripe | Se cobra, pero el stock no baja y el pedido no se registra |
| Cambiar la contraseña SFTP | Sigue circulando por WhatsApp y por el Drive |
| Stock | Toda la botiga sale como *exhaurit* |
| Página legal | Vender sin ella no es legal |
| Límite en los formularios | Nada, hasta que alguien los encuentre; luego, spam en la base |
