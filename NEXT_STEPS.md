# NEXT STEPS — TAT ARA (parte ecommerce)

El código de la tienda está completo y desplegado (2026-07-07): botiga con carret real,
checkout Stripe (dormido hasta poner claves), admin en `/admin/`. Esto es lo que queda,
en orden. Casi todo son decisiones de la clienta.

## 1. Decisiones de la clienta
- [ ] **Precios** de las 5 ediciones que están a `price: null` en `data/botiga.json`
      (solo Fricción tiene precio). Con precio puesto, pasan solas de "pròximament" a comprables.
- [ ] **Envíos**: ¿solo recogida en galería o también envío? `data/envios.json` está vacío
      (`[]` = no se pide dirección ni se cobra). Para activarlos, rellenar zonas
      (`{zona, nombre, precio|tramos, paises?, recogida?}`) — el worker ya lo soporta,
      y el selector aparece solo en el carret. Ver ejemplos en semillaEcommerce.
- [ ] **Stock real**: contar ejemplares y fijarlos en `/admin/stock.html` (todo nace a 0;
      sin stock nada es comprable). Antes: `npx wrangler secret put ADMIN_TOKEN`.

## 2. Stripe (cuando lo anterior esté)
- [ ] Cuenta de Stripe (de la clienta) → `npx wrangler secret put STRIPE_SECRET_KEY`.
- [ ] Webhook: endpoint `https://<dominio>/api/stripe-webhook`, evento
      `checkout.session.completed` → `npx wrangler secret put STRIPE_WEBHOOK_SECRET`.
- [ ] Dashboard: Bizum + recibos por email + cupones si toca.
- [ ] Compra de prueba en modo test (`4242 4242 4242 4242`) → pedido visible en
      `/admin/tickets.html` → clave live.

## 2bis. Avisos por email (pendiente de portar — bloqueado por el dominio)
Tal como está, **nadie se entera de que ha entrado un pedido** ni de que alguien ha escrito:
hay que acordarse de mirar `/admin/tickets.html`. En quienNoCorre y en semillaEcommerce ya
está resuelto con un módulo `src/notify.js` (cuatro avisos: pedido nuevo y mensaje de contacto
a la tienda; confirmación y "pedido enviado" al cliente). **Aquí no se ha portado a propósito.**

**Por qué está bloqueado:** el Worker corre en `tatara.manuellatourf.workers.dev` y un
`.workers.dev` **no sirve como remitente**. Hasta que `tatara.cat` esté en Cloudflare
(ver `TODO_DOMINIO.md`) no se puede enviar desde el dominio propio.

Cuando se retome, en este orden:
- [ ] **Decidir a quién llegan los avisos**: `associaciotatara@gmail.com` (el contacto de la
      asociación, ya está en `data/data.json`), Manu, o los dos durante el rodaje.
- [ ] **Decidir el remitente**, según en qué punto esté el dominio:
      - `tatara.cat` ya en Cloudflare → `noreply@tatara.cat`. Es la buena.
      - Todavía no → usar un dominio de la cuenta de Manu como remitente provisional. Feo,
        pero el aviso solo lo leen ellas y se cambia con una var el día del traspaso.
- [ ] **Portar el módulo**: copiar `src/notify.js` de semillaEcommerce (es idéntico en los tres
      repos, no hay que adaptarlo — recibe objetos ya construidos) y enganchar los cuatro
      avisos en `src/index.js`. Ojo: aquí las tablas llevan prefijo `tatara_`.
- [ ] **Vars en `wrangler.toml`**: `EMAIL_FROM`, `EMAIL_TIENDA`, `EMAIL_RESPUESTA`,
      `TIENDA_NOMBRE` + descomentar `[[send_email]]`.
- [ ] ⚠️ **Al dar de alta el dominio en Email Sending** se añaden SPF y DKIM. Si `tatara.cat`
      ya tiene SPF, hay que **fusionarlos**. Y no confundir con Email **Routing**, que añade
      **MX** y rompería el correo entrante — es el mismo aviso del paso 5 de `TODO_DOMINIO.md`.
- [ ] Los avisos **a la tienda** son gratis en plan free (destino verificado). Los avisos **al
      cliente** requieren Workers Paid o Resend; se pueden dejar apagados sin afectar al resto.

## 3. Pendiente de la sesión de revisión de la web (no ecommerce)
- [ ] **Página legal** (LSSI/RGPD/desistimiento) — copiar la plantilla `legal.html` de
      semillaEcommerce y añadirla como sección/página de la SPA.
- [ ] Dominio propio.

## 4. Traspaso a la clienta (documentado en DEPLOY.md)
- [ ] Su cuenta de Cloudflare + D1 propia (ahora comparte la base `shop` con quienNoCorre:
      el backup semanal del repo de quienNoCorre cubre a ambas mientras tanto).
- [ ] Transferir el repo de GitHub y reconectar Workers Builds.
- [ ] Al separarse: añadir su propio workflow de backup
      (plantilla en semillaEcommerce, `.github/workflows/backup-d1.yml` + secret
      `CLOUDFLARE_API_TOKEN` de SU cuenta).
