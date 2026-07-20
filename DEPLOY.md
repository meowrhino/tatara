# TAT ARA — deploy y ecommerce

La web (estática, vanilla) + un Worker de Cloudflare que atiende `/api/*`.
Backend calcado de quienNoCorre. **Estado: web y alta a la newsletter en marcha;
carrito y checkout de Stripe implementados en el frontend, pendientes de activar
las claves reales de Stripe.** Para publicar en dominio propio (`tatara.cat`),
ver [TODO_DOMINIO.md](TODO_DOMINIO.md).

## Arquitectura

- **Catálogo** → `data/edicions.json` (source of truth; editar + push).
  Productos con `price: null` = pendientes → no comprables.
- **D1 compartida `shop`** (una base para todos los ecommerces en desarrollo,
  id `6c1c1e51-76d4-4ab3-a912-7e7ad2749eca`). Cada tienda usa su prefijo:
  tatara → `tatara_stock`, `tatara_pedidos`, `tatara_newsletter`, `tatara_mensajes`
  (quienNoCorre usa las tablas sin prefijo). Esquema: `schema-tatara.sql`.
- **Stock** nace a 0 y se fija por el admin (ver más abajo).

## Desarrollo local

```sh
npm install
cp .dev.vars.example .dev.vars
npx wrangler d1 execute shop --local --persist-to ../.tatara-wrangler-state --file=schema-tatara.sql
npm run dev                                                      # :8787
```

`npm run dev` usa `--persist-to ../.tatara-wrangler-state` (fuera del repo) porque aquí los
assets son la raíz (`.`): si el estado local de wrangler (la D1 local escribe en cada request)
viviera dentro, el watcher entraría en bucle infinito de reloads. Por eso el `d1 execute` local
de arriba también lleva el flag.

## Desplegar

```sh
npx wrangler login          # una vez
npm run db:schema           # crea las tablas tatara_* en la shop remota (ya hecho 2026-07-03)
npm run db:migrate          # ⚠ una vez: añade zona/envio/estado a tatara_pedidos (2026-07-07)
npx wrangler secret put ADMIN_TOKEN   # token para el panel/API de admin
npm run deploy
```

Consejo: en el dashboard (Workers & Pages → tatara → Settings → Build) se puede
conectar este repo de GitHub (**Workers Builds**) y cada push despliega solo.
No hace falta mover la web a otro repo.

## Activar Stripe (cuando toque)

1. Cuenta de Stripe de TAT ARA (o la que decida la clienta) → copiar la clave secreta.
2. `npx wrangler secret put STRIPE_SECRET_KEY`
3. En Stripe → Developers → Webhooks → añadir endpoint
   `https://<dominio>/api/stripe-webhook` con el evento `checkout.session.completed`;
   copiar el signing secret → `npx wrangler secret put STRIPE_WEBHOOK_SECRET`
4. Ya funciona `POST /api/crear-sesion` (sin claves responde 503 a propósito).
   Cupones, Bizum/wallets y recibos se activan en el **dashboard de Stripe**, sin tocar código.
5. **Envíos**: decidir con la clienta. `data/envios.json` está vacío (`[]`) = no se pide
   dirección ni se cobra envío. Para activarlos, rellenar zonas como en la semilla
   (`{zona, nombre, precio|tramos, paises?, recogida?}`) — el Worker ya lo soporta.
6. Falta el **carrito en el frontend**: `js/sections.js` renderiza la botiga con el
   botón deshabilitado ("pròximament") y `renderCart` es un placeholder. Hay que
   cablearlo contra `/api/stock` y `/api/crear-sesion` (mismo patrón que quienNoCorre).
   Al volver de Stripe (`#shop?gracies=1&session_id=…`), confirmar con
   `GET /api/session-status` antes de vaciar el carrito.

## API

| ruta | qué hace |
|---|---|
| `GET /api/health` | ping + nº de productos |
| `GET /api/stock` | stock vivo por producto |
| `POST /api/crear-sesion` | checkout Stripe `{carrito:[{id,cantidad}], envio?:{zona}}` (503 sin claves; sesión caduca a 30 min; cupones activados) |
| `GET /api/session-status?session_id=…` | estado de una sesión (para confirmar el pago al volver de Stripe) |
| `POST /api/stripe-webhook` | descuenta stock + registra pedido (con zona, dirección y estado) |
| `POST /api/newsletter` | alta `{email}` |
| `POST /api/contacto` | mensaje `{texto, email?, nombre?}` |
| `GET /api/admin/historial\|newsletter\|mensajes` | lecturas (Bearer ADMIN_TOKEN) |
| `POST /api/admin/stock-bulk` | fija stock `{productos:[{id,cantidad}]}` o `{productos:[{id,stockByTalla}]}` |
| `POST /api/admin/pedido-estado` | `{id, estado}` → pendiente / enviado / entregado / cancelado |

### Panel de admin

`/admin/` (guardar el `ADMIN_TOKEN` una vez): **stock** (fijar unidades por producto;
el catálogo se sigue editando en `data/edicions.json` + push) y **pedidos** (email,
items, dirección de envío y selector de estado pendiente/enviado/entregado/cancelado).

También por curl, ejemplo de fijar stock:

```sh
curl -X POST https://<dominio>/api/admin/stock-bulk \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "content-type: application/json" \
  -d '{"productos":[{"id":"friccion","cantidad":10}]}'
```

## Traspaso a la clienta (cuando el proyecto se entregue)

1. **Cloudflare**: la clienta crea su cuenta → o bien la invitas a la tuya como
   miembro, o (traspaso completo) creas en SU cuenta el worker + una D1 propia
   (`wrangler d1 create tatara-db` allí), aplicas `schema-tatara.sql` (quitando el
   prefijo si ya no comparte base), pegas el nuevo `database_id` en `wrangler.toml`
   y despliegas desde su cuenta. El dominio de la clienta se añade como zona suya.
2. **Stripe**: las claves pasan a ser de la cuenta Stripe de la clienta
   (repetir "Activar Stripe" con sus claves). Los pagos llegan a su banco.
3. **Datos**: exportar lo acumulado con
   `npx wrangler d1 export shop --remote --output=backup.sql` y filtrar las tablas
   `tatara_*` para importarlas en su D1.
4. **GitHub**: transferir el repo `tatara-web` a su organización/usuario
   (Settings → Danger Zone → Transfer) y reconectar Workers Builds.
