# NEXT STEPS — TAT ARA (parte ecommerce)

El código de la tienda está completo y desplegado (2026-07-07): botiga con carret real,
checkout Stripe (dormido hasta poner claves), admin en `/admin/`. Esto es lo que queda,
en orden. Casi todo son decisiones de la clienta.

## 1. Decisiones de la clienta
- [ ] **Precios** de las 5 ediciones que están a `price: null` en `data/edicions.json`
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
