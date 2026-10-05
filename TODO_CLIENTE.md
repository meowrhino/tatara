# TODO — Traspaso a la clienta

Lo que hay que hacer y revisar el día que TAT ARA pase a llevar su web.

**Dónde está todo hoy:** la web está publicada en el alojamiento de Pangea, bajo
la cuenta de socia de L'Afluent SCCL, con el dominio `tatara.cat` y su
certificado. El backend en PHP y la base de datos MariaDB están en ese mismo
sitio — ver [DEPLOY_PANGEA.md](DEPLOY_PANGEA.md).

Lo que queda del encargo, en [NEXT_STEPS.md](NEXT_STEPS.md). Cómo se publica el
contenido, en el [README](README.md).

---

## 1. Lo que queda vivo de la etapa anterior — cerrar antes de nada

Durante el desarrollo la web corrió en un Worker de Cloudflare, en la cuenta de
Manu, con una base de datos compartida con otro proyecto (quienNoCorre). Eso
sigue en pie y hay que cerrarlo, **en este orden**:

- [ ] **Sacar los datos antes de borrar nada.** Si alguien se apuntó a la
      newsletter o mandó un mensaje durante las pruebas, está ahí y solo ahí:

      npx wrangler d1 execute shop --remote \
        --command "SELECT COUNT(*) FROM tatara_newsletter"

      Lo mismo con `tatara_mensajes` y `tatara_pedidos`. Si algún recuento no es
      0, exportar y volver a meter esas altas en la web nueva (para la
      newsletter basta con un `POST /api/newsletter` por cada email).
- [ ] **Borrar el Worker `tatara`** de la cuenta de Cloudflare de Manu. Mientras
      exista, hay una segunda copia pública de la web, con datos de la
      asociación, dentro de una cuenta personal.
- [ ] **Borrar las tablas `tatara_*`** de la D1 compartida, una vez exportadas.
- [ ] El código de aquella versión no se pierde: vive en la rama
      `opcion-cloudflare` del repositorio.

## 2. Las tres claves

No hay cuentas que traspasar: el alojamiento es de L'Afluent y el dominio
también. Lo que sí hay que entregar son las contraseñas, **por gestor de
contraseñas, nunca por WhatsApp ni por correo**:

- [ ] **SFTP** (`web-12.pangea.org`, usuario `tatara-web`) — para subir
      contenido. La da Pangea.
- [ ] **Token de admin** — abre `/admin/`. Vive en `api/config.php`, en el
      servidor. Si se pierde o se ha compartido mal, se entra por SFTP y se
      cambia; se genera uno nuevo con `openssl rand -hex 32`.
- [ ] **phpMyAdmin** — mismo usuario, contraseña propia de Pangea. No hace falta
      para el día a día.
- [ ] ⚠️ **Cambiar la contraseña SFTP actual.** Se compartió por WhatsApp y está
      escrita en claro en `web tatara-TEXT-SETEMBRE.docx`, en el Drive.
      Cambiarla en Pangea y borrarla del documento.

## 3. Stripe — solo cuando se quiera cobrar de verdad

Hoy no hay claves puestas: la botiga enseña las piezas y el botón de comprar
contesta 503. Para abrirla:

- [ ] Cuenta de Stripe **a nombre de la asociación**, con su banco. Es donde
      llega el dinero: este punto no admite atajos.
- [ ] Poner `stripe_secret_key` y `stripe_webhook_secret` en `api/config.php`
      (por SFTP), no en ningún otro sitio.
- [ ] **Webhook** en el panel de Stripe hacia
      `https://tatara.cat/api/stripe-webhook`, evento
      `checkout.session.completed`. Sin webhook se cobra, pero **el stock no
      baja y el pedido no se registra**.
- [ ] Compra de prueba en modo test (`4242 4242 4242 4242`) → que el pedido
      aparezca en `/admin/tickets.html` → recién entonces, claves live.

## 4. Avisos por correo — pendiente, y con un detalle de Pangea

Tal como está, nadie se entera de que ha entrado un pedido o un mensaje salvo
que alguien mire `/admin/`.

- [ ] Decidir el destinatario: `associaciotatara@gmail.com`, Manu, o los dos
      durante el rodaje.
- [ ] ⚠️ En el servidor de Pangea **la función `mail()` de PHP está
      deshabilitada**: hay que enviar por SMTP autenticado. Pangea da
      instrucciones y una cuenta de correo del dominio.
- [ ] Si se usa un remitente `@tatara.cat`, revisar SPF y DKIM con ellos.

## 5. Contenido y datos que hay que revisar

- [ ] **Datos de contacto** en `data/data.json`: email, dirección, redes. Que
      sean los de la asociación y no los de pruebas.
- [ ] **Stock.** Nace a 0, y sin unidades nada es comprable: contar ejemplares
      en `/admin/stock.html`.
- [ ] **Envíos.** `data/envios.json` está vacío (`[]`), que significa "solo
      recogida en galería": no se pide dirección ni se cobra envío. Si van a
      enviar, hay que rellenar las zonas.
- [ ] **Página legal** (aviso legal, privacidad, desistimiento). No existe, y con
      una tienda con cobro real es obligatoria.
- [ ] **Enlaces** a la web de cada artista: faltan trece.
- [ ] `npm run check` en verde antes de entregar.
- [ ] `assets/img/mr/` son 27 fotos de piezas de Maria Roy que ya no usa ningún
      JSON. Decidir si vuelven al catálogo o se borran.

## 6. Formularios públicos sin límite de peticiones

`/api/newsletter` y `/api/contacto` están abiertos a cualquiera. Hoy no importa
porque nadie conoce la web; el día que circule, un bot puede meter miles de altas
y miles de mensajes en la base de datos.

- [ ] Cuando empiece a verse: poner un límite. En este alojamiento no hay WAF, o
      sea que se resuelve en el propio PHP (un contador por IP y minuto en la
      base de datos, unas veinte líneas) o con
      [Turnstile](https://www.cloudflare.com/products/turnstile/), el captcha
      invisible de Cloudflare, que funciona en cualquier web sin alojar nada
      allí.

## 7. Copias de seguridad

Pangea hace copia **cada noche**, guarda 7 días seguidos y luego la del domingo
durante 6 meses. Para restaurar, correo a `suport@pangea.org` de lunes a viernes
de 9 a 14.

- [ ] Que la asociación sepa que esa es la red de seguridad, y que la pérdida
      máxima es de un día.
- [ ] Antes de cualquier cambio gordo, exportar la base desde phpMyAdmin.
- [ ] Los pedidos con dinero de verdad están **también en Stripe**: aunque se
      perdiera la base, el cobro y los datos del comprador no se pierden.

## 8. Qué hay que enseñarle a la clienta

Sin esto el traspaso no está terminado:

- [ ] Instalar Cyberduck y guardar el marcador de conexión (README, "Com es
      publica").
- [ ] Cambiar un texto de prueba de principio a fin, ella sola: copia de
      seguridad, editar, subir, recargar.
- [ ] Qué pasa si edita mal un JSON y cómo volver atrás.
- [ ] Entrar en `/admin/`, contar stock y marcar un pedido como enviado.
- [ ] A quién llamar cuando algo se rompa.

---

## Qué se rompe si se olvida cada cosa

| Se olvida | Qué pasa |
|---|---|
| Exportar los datos antes de borrar el Worker | Se pierden las altas de newsletter de las pruebas |
| Borrar el Worker viejo | Queda una segunda web pública, con datos, en una cuenta personal |
| Webhook de Stripe | Se cobra, pero el stock no baja y el pedido no se registra |
| Contraseña SFTP | Sigue circulando por WhatsApp y por el Drive |
| Stock | La botiga entera sale como *exhaurit* |
| Página legal | Vender sin ella no es legal |
| Límite en los formularios | Nada hasta que alguien los encuentre; después, spam en la base |
