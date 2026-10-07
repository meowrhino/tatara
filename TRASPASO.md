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
| Una copia vieja de pruebas | `tatara.manuellatourf.workers.dev` | cuenta personal de Cloudflare: **hay que borrarla** (punto 1) |
| Los cobros | Stripe, sin activar | tendrá que ser de TAT ARA |

**Que la cuenta de Pangea sea de L'Afluent** fue decisión suya (30/09/2026). La
factura va a su nombre y los accesos son compartidos. Si algún día la asociación
quiere cuenta propia, hay que migrar dominio, web y base de una cuenta a otra:
trabajo manual y con corte de servicio. Cuanto antes, más barato.

## Cómo se publica

| Quiero… | Se hace… | ¿Cambia tatara.cat? |
|---|---|---|
| Cambiar un texto, una fecha, una foto, un precio | editar el JSON y subirlo por SFTP ([GUIA.md](GUIA.md)) | **sí**, al momento |
| Cambiar las unidades de stock | `/admin/stock.html` | sí, al momento |
| Cambiar el diseño o el código | commit y `git push` a `main` | **sí, solo**, en un minuto (GitHub Actions) |
| Publicar a mano | `npm run build` y subir `dist/` por SFTP ([DESARROLLO.md](DESARROLLO.md#publicar-en-pangea)) | sí |

La publicación automática es un script de GitHub Actions que revisa los JSON y
sube a Pangea por SFTP con cada push a `main`. **Activa desde el 7 de octubre de
2026**, con la contraseña de SFTP guardada como secret `SFTP_PASSWORD` del
repositorio ([DESARROLLO.md](DESARROLLO.md#publicación-automática-github-actions)).
Con ella, la clienta también podría editar el contenido directamente en GitHub en
vez de usar Cyberduck.

### Las dos copias del contenido ⚠️

Los JSON de `data/` existen dos veces: en el servidor (los que edita la clienta)
y en el repositorio (los que tiene quien programa). **La buena es la del
servidor.** Si se subieran los JSON del repo sin más, **se pisarían los cambios
de la clienta**. `npm run build` lo evita: antes de preparar nada, trae a `data/`
lo que ella haya cambiado desde la última publicación (la etiqueta git
`publicado`). Detalle en
[DESARROLLO.md](DESARROLLO.md#0-el-contenido-de-la-clienta-), y la guía de la
clienta también lo recuerda.

---

## ¿Quién se queda el repositorio?

Todavía no está decidido. Para el día a día de la clienta da igual: ella no
necesita GitHub (solo Cyberduck y el navegador). Lo que cambia es quién puede
tocar el código y dónde vive la copia de referencia.

### A. Lo seguimos llevando nosotros

Es como está hoy. Nada que hacer, salvo dejarlo escrito en el acuerdo: el repo
`meowrhino/tatara` es la fuente del código, la clienta lleva el contenido por
SFTP, y cada cambio de código pasa por la regla de las dos copias.

### B. Pasa a ser de TAT ARA

1. TAT ARA crea una cuenta de GitHub (mejor una organización a nombre de la
   asociación que una cuenta personal).
2. En [github.com/meowrhino/tatara](https://github.com/meowrhino/tatara) →
   *Settings* → *Transfer ownership* → la cuenta nueva. Viaja todo: historial,
   ramas y etiquetas, y GitHub redirige la dirección vieja.
3. Si queremos seguir trabajando en ella, nos añaden como colaboradores. Si no,
   nos quedamos un *fork* como copia y ya está.
4. Cambiar `meowrhino/tatara` por la dirección nueva en este fichero.

`tatarav0` se queda en nuestra cuenta: es un archivo de diseño, no forma parte
de la web.

En los dos casos, **nada de lo que hay en el servidor cambia**: la web, la base
de datos y `api/config.php` siguen donde están.

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
| Textos, fechas, fotos, precios | TAT ARA | editar el JSON y subirlo por SFTP |
| Unidades de stock | TAT ARA | `/admin/stock.html` |
| Ver pedidos, mensajes y altas | TAT ARA | `/admin/tickets.html` |
| Diseño, secciones nuevas, código | desarrollo | GitHub + publicar por SFTP |
| Restaurar una copia de seguridad | Pangea | `suport@pangea.org`, L–V de 9 a 14 |

---

## Lista del traspaso

### 1. Cerrar lo de la etapa anterior — antes de nada

Durante el desarrollo la web corrió en un Worker de Cloudflare, en la cuenta de
Manu, con una base D1 compartida con otro proyecto (quienNoCorre). **El 7 de
octubre de 2026 sigue publicado** (`tatara.manuellatourf.workers.dev` contesta),
con el diseño viejo y sus propios datos. En este orden:

- [ ] **Sacar los datos.** Si alguien se apuntó a la newsletter o escribió
      durante las pruebas, está ahí y solo ahí:

      npx wrangler d1 execute shop --remote \
        --command "SELECT COUNT(*) FROM tatara_newsletter"

      Lo mismo con `tatara_mensajes` y `tatara_pedidos`. Si algo no da 0,
      exportarlo y meter las altas en la base nueva (un `POST /api/newsletter`
      por email).
- [ ] **Borrar el Worker `tatara`** desde el panel de Cloudflare.
- [ ] **Borrar las tablas `tatara_*`** de la D1 compartida.

### 2. Claves

- [ ] Las tres claves de arriba, al gestor de contraseñas de la asociación.
- [ ] ⚠️ **Cambiar la contraseña SFTP.** Se compartió por WhatsApp y está escrita
      en claro en `web tatara-TEXT-SETEMBRE.docx`, en el Drive. Cambiarla en
      Pangea y borrarla del documento.
- [ ] Decidir quién se queda el repositorio (A o B, arriba).
- [x] Publicación automática: `SFTP_PASSWORD` guardada como secret del repo.
- [ ] **Al cambiar la contraseña de SFTP, cambiarla también en el secret**
      (`gh secret set SFTP_PASSWORD`). Si el repo pasa a TAT ARA (opción B),
      comprobar después que el secret sigue en *Settings → Secrets* y, si no,
      volver a crearlo.
- [ ] Decidir si la clienta pasa a editar en GitHub (sin Cyberduck) y
      actualizar [GUIA.md](GUIA.md) en consecuencia.

### 3. Contenido

- [ ] **Datos de contacto** en `data/data.json`: correo, dirección, redes.
- [ ] **Instagram** para el pie de contacte (`data.json` → `contact.links`).
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

- [ ] Instalar Cyberduck y guardar el marcador ([GUIA.md](GUIA.md), "Com es
      publica").
- [ ] Cambiar un texto de principio a fin, ella sola: copia, editar, subir,
      recargar.
- [ ] Qué pasa si se rompe un JSON y cómo volver atrás.
- [ ] Entrar en `/admin/`, contar stock y marcar un pedido como enviado.
- [ ] A quién llamar cuando algo se rompa.

---

## Qué se rompe si se olvida cada cosa

| Se olvida | Qué pasa |
|---|---|
| Mover la etiqueta `publicado` después de subir | La próxima publicación compara con una versión vieja y puede deshacer cambios |
| Sacar los datos antes de borrar el Worker | Se pierden las altas de newsletter de las pruebas |
| Borrar el Worker viejo | Sigue habiendo otra web pública, vieja, en una cuenta personal |
| Webhook de Stripe | Se cobra, pero el stock no baja y el pedido no se registra |
| Cambiar la contraseña SFTP | Sigue circulando por WhatsApp y por el Drive |
| Stock | Toda la botiga sale como *exhaurit* |
| Página legal | Vender sin ella no es legal |
| Límite en los formularios | Nada, hasta que alguien los encuentre; luego, spam en la base |
