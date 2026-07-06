/**
 * src/index.js — backend de TAT ARA en un Cloudflare Worker (Hono).
 *
 * Calcado del backend de quienNoCorre (la plantilla de ecommerce):
 *   - CATÁLOGO → data/edicions.json (source of truth; se edita y se hace push).
 *   - D1 solo guarda lo MUTABLE: stock vivo, pedidos, newsletter y mensajes.
 *   - El precio/nombre es SIEMPRE el del JSON desplegado; el cliente no puede manipularlo.
 *
 * Particularidades de tatara:
 *   - D1 COMPARTIDA `shop` con otros ecommerces: aquí todas las tablas llevan prefijo tatara_.
 *   - Productos con price null = pendientes de la clienta → no comprables.
 *   - El stock nace a 0 (galería física): se fija por el admin (/api/admin/stock-bulk).
 *   - Stripe queda LISTO pero guardado: sin STRIPE_SECRET_KEY el checkout responde 503.
 *
 * Bindings (wrangler.toml + .dev.vars): env.DB, env.STRIPE_SECRET_KEY,
 *   env.STRIPE_WEBHOOK_SECRET, env.ADMIN_TOKEN, env.FRONTEND_URL.
 */

import { Hono } from "hono";
import Stripe from "stripe";

import edicions from "../data/edicions.json";
import envios from "../data/envios.json";

const productos = edicions.products || [];

const app = new Hono().basePath("/api");

// ─── helpers ─────────────────────────────────────────────
const toCents = (eur) => Math.round(Number(eur) * 100);

const comprable = (p) => p && p.activo !== false && typeof p.price === "number" && p.price > 0;

function findProducto(id) {
  return productos.find((p) => String(p.id) === String(id));
}

/** Países que acepta Stripe para dirección de envío (ISO 3166-1, sin los no soportados).
 *  Fallback para zonas sin lista `paises` propia en envios.json. */
const PAISES_STRIPE = [
  "AD","AE","AF","AG","AI","AL","AM","AO","AR","AT","AU","AW","AX","AZ","BA","BB","BD","BE","BF",
  "BG","BH","BI","BJ","BL","BM","BN","BO","BQ","BR","BS","BT","BW","BY","BZ","CA","CD","CF","CG",
  "CH","CI","CK","CL","CM","CN","CO","CR","CV","CW","CY","CZ","DE","DJ","DK","DM","DO","DZ","EC",
  "EE","EG","ER","ES","ET","FI","FJ","FK","FO","FR","GA","GB","GD","GE","GF","GG","GH","GI","GL",
  "GM","GN","GP","GQ","GR","GT","GU","GW","GY","HK","HN","HR","HT","HU","ID","IE","IL","IM","IN",
  "IQ","IS","IT","JE","JM","JO","JP","KE","KG","KH","KI","KM","KN","KR","KW","KY","KZ","LA","LB",
  "LC","LI","LK","LR","LS","LT","LU","LV","LY","MA","MC","MD","ME","MF","MG","MK","ML","MM","MN",
  "MO","MQ","MR","MS","MT","MU","MV","MW","MX","MY","MZ","NA","NC","NE","NG","NI","NL","NO","NP",
  "NR","NU","NZ","OM","PA","PE","PF","PG","PH","PK","PL","PM","PR","PS","PT","PY","QA","RE","RO",
  "RS","RU","RW","SA","SB","SC","SE","SG","SH","SI","SJ","SK","SL","SM","SN","SO","SR","SS","ST",
  "SV","SX","SZ","TC","TD","TG","TH","TJ","TK","TL","TM","TN","TO","TR","TT","TV","TW","TZ","UA",
  "UG","US","UY","UZ","VA","VC","VE","VG","VN","VU","WF","WS","XK","YE","ZA","ZM","ZW",
];

const paisesDeZona = (zona) =>
  Array.isArray(zona.paises) && zona.paises.length ? zona.paises : PAISES_STRIPE;

const nombreDeZona = (zona) =>
  typeof zona.nombre === "string" ? zona.nombre : zona.nombre?.es || zona.zona;

/** Zona de recogida en mano (galería): "recogida": true → no pide dirección ni cobra. */
const esZonaRecogida = (zona) => zona.recogida === true || zona.zona === "recogida";

/** Precio de envío de una zona: tarifa plana ({precio}) o por peso ({tramos}, gramos). */
function precioEnvio(zona, gramos = 0) {
  if (!zona) return 0;
  if (Array.isArray(zona.tramos)) {
    const tramos = [...zona.tramos].sort((a, b) => a.hasta - b.hasta);
    for (const tr of tramos) if (gramos <= tr.hasta) return Number(tr.precio) || 0;
    return Number(tramos[tramos.length - 1]?.precio) || 0;
  }
  return Number(zona.precio) || 0;
}

/** Inicializa stock en D1 (a 0) para los productos comprables. Idempotente, memoizado por isolate. */
let stockInitPromise = null;
function ensureStock(env) {
  if (stockInitPromise) return stockInitPromise;
  stockInitPromise = (async () => {
    const stmts = productos.filter(comprable).map((p) =>
      env.DB.prepare(
        `INSERT OR IGNORE INTO tatara_stock (producto_id, talla, cantidad) VALUES (?, '_', ?)`
      ).bind(String(p.id), Number.isFinite(p.stockInicial) ? Math.max(0, p.stockInicial) : 0)
    );
    if (stmts.length) await env.DB.batch(stmts);
  })().catch((err) => {
    // Si D1 falla no dejamos cacheada la promesa rota: el siguiente request reintenta.
    stockInitPromise = null;
    throw err;
  });
  return stockInitPromise;
}

async function fetchStock(env, productoId = null) {
  const stmt = productoId
    ? env.DB.prepare(`SELECT producto_id, talla, cantidad FROM tatara_stock WHERE producto_id = ?`).bind(productoId)
    : env.DB.prepare(`SELECT producto_id, talla, cantidad FROM tatara_stock`);
  const { results } = await stmt.all();
  const byProducto = {};
  for (const row of results) (byProducto[row.producto_id] ||= {})[row.talla] = row.cantidad;
  return byProducto;
}

// ─── catálogo ────────────────────────────────────────────
app.get("/health", (c) =>
  c.json({ ok: true, runtime: "workers", db: "d1(shop, prefijo tatara_)", productos: productos.length })
);

app.get("/stock", async (c) => {
  await ensureStock(c.env);
  return c.json(await fetchStock(c.env));
});

// ─── Stripe checkout (listo; guardado hasta poner claves) ─
app.post("/crear-sesion", async (c) => {
  if (!c.env.STRIPE_SECRET_KEY)
    return c.json({ error: "checkout no configurado todavía" }, 503);

  const body = await c.req.json().catch(() => ({}));
  const carrito = Array.isArray(body.carrito) ? body.carrito : [];
  const envioReq = body.envio || null;
  if (!carrito.length) return c.json({ error: "carrito vacío" }, 400);

  await ensureStock(c.env);

  // Resolver cada ítem contra el JSON (precio) y contra D1 (stock).
  const resolved = [];
  let pesoTotal = 0; // gramos (si algún día las ediciones llevan `peso`)
  for (let i = 0; i < carrito.length; i++) {
    const it = carrito[i];
    const p = findProducto(it.id);
    if (!p) return c.json({ error: `producto ${it.id} no existe` }, 400);
    if (!comprable(p)) return c.json({ error: `producto ${it.id} no disponible` }, 400);

    const cantidad = Number(it.cantidad);
    if (!Number.isInteger(cantidad) || cantidad <= 0)
      return c.json({ error: `cantidad inválida en ítem ${i}` }, 400);

    const row = await c.env.DB.prepare(
      `SELECT cantidad FROM tatara_stock WHERE producto_id = ? AND talla = '_'`
    ).bind(p.id).first();
    const disponible = row ? Number(row.cantidad) : 0;
    if (disponible < cantidad)
      return c.json({ error: `sin stock para ${p.title}`, disponible }, 409);

    pesoTotal += (Number(p.peso) || 0) * cantidad;
    resolved.push({ p, cantidad });
  }

  // Envío: si hay zonas en envios.json, es obligatorio elegir una (precio recalculado aquí).
  // Con envios.json vacío ([], estado actual: envíos sin decidir) no se pide ni cobra nada.
  let zonaEnvio = null;
  let envioResolved = null;
  if (envios.length) {
    if (!envioReq?.zona) return c.json({ error: "falta la zona de envío" }, 400);
    zonaEnvio = envios.find((e) => e.zona === envioReq.zona);
    if (!zonaEnvio) return c.json({ error: "zona de envío desconocida" }, 400);
    envioResolved = { zona: zonaEnvio.zona, precio: precioEnvio(zonaEnvio, pesoTotal) };
  }
  const conEnvio = envioResolved && !esZonaRecogida(zonaEnvio);

  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY);

  const line_items = resolved.map(({ p, cantidad }) => ({
    quantity: cantidad,
    price_data: {
      currency: "eur",
      product_data: { name: p.title, metadata: { id: String(p.id) } },
      unit_amount: toCents(p.price),
    },
  }));

  const frontend = c.env.FRONTEND_URL || new URL(c.req.url).origin;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      // Sin payment_method_types: Stripe usa los métodos activados en el dashboard
      // (tarjeta + wallets de serie; Bizum/PayPal/etc. se activan allí, sin tocar código).
      line_items,
      // El envío va como shipping_option (envío de verdad en checkout y recibo).
      shipping_address_collection: conEnvio
        ? { allowed_countries: paisesDeZona(zonaEnvio) }
        : undefined,
      shipping_options: conEnvio
        ? [
            {
              shipping_rate_data: {
                type: "fixed_amount",
                display_name: nombreDeZona(zonaEnvio),
                fixed_amount: { amount: toCents(envioResolved.precio), currency: "eur" },
              },
            },
          ]
        : undefined,
      // Campo "¿tienes un código?"; los códigos se crean en el dashboard de Stripe.
      allow_promotion_codes: true,
      // La sesión caduca en 30 min (mínimo de Stripe): acorta la ventana de sobreventa
      // (el stock se descuenta en el webhook, al pagar).
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      success_url: `${frontend}/#shop?gracies=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontend}/#cart`,
      // Metadata mínima (límite Stripe: 500 chars/valor): solo id+cantidad.
      // El webhook re-enriquece título/precio desde edicions.json.
      metadata: {
        carrito: JSON.stringify(resolved.map(({ p, cantidad }) => ({ id: p.id, cantidad }))),
        zona: envioResolved?.zona || "",
      },
    });
    return c.json({ url: session.url, id: session.id });
  } catch (err) {
    console.error("Stripe session error:", err?.message || err);
    return c.json({ error: "no se pudo crear la sesión" }, 500);
  }
});

/** Estado de una sesión de checkout (para que el front confirme el pago al volver de Stripe
 *  — lee ?session_id del hash #shop?gracies=1 — antes de vaciar el carrito). */
app.get("/session-status", async (c) => {
  const id = c.req.query("session_id");
  if (!id) return c.json({ error: "session_id requerido" }, 400);
  if (!c.env.STRIPE_SECRET_KEY) return c.json({ error: "pagos no configurados" }, 503);
  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY);
  try {
    const s = await stripe.checkout.sessions.retrieve(id);
    return c.json({
      status: s.status,
      payment_status: s.payment_status,
      email: s.customer_details?.email || null,
    });
  } catch {
    return c.json({ error: "sesión no encontrada" }, 404);
  }
});

app.post("/stripe-webhook", async (c) => {
  if (!c.env.STRIPE_WEBHOOK_SECRET) {
    console.warn("STRIPE_WEBHOOK_SECRET vacío — ignorando webhook");
    return c.text("ignored", 200);
  }
  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY);
  const sig = c.req.header("stripe-signature");
  const body = await c.req.text();

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, c.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature failed:", err.message);
    return c.text(`Webhook Error: ${err.message}`, 400);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    try {
      // Metadata trae solo [{id, cantidad}]; título y precio se resuelven aquí del JSON.
      const carrito = JSON.parse(session.metadata?.carrito || "[]");
      const items = carrito.map((it) => {
        const p = findProducto(it.id);
        return {
          id: it.id,
          nombre: p ? p.title : String(it.id),
          precio: p ? p.price : null,
          cantidad: Number(it.cantidad),
        };
      });

      // Dirección de envío: según versión de API viene en collected_information o en shipping_details.
      const ship = session.collected_information?.shipping_details || session.shipping_details || null;
      const envioInfo = {
        zona: session.metadata?.zona || null,
        nombre: ship?.name || session.customer_details?.name || null,
        direccion: ship?.address || null,
        telefono: session.customer_details?.phone || null,
      };

      const stmts = [];
      for (const it of carrito) {
        stmts.push(
          c.env.DB.prepare(
            `UPDATE tatara_stock SET cantidad = MAX(0, cantidad - ?) WHERE producto_id = ? AND talla = '_'`
          ).bind(Number(it.cantidad), String(it.id))
        );
      }
      const pedidoId = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      stmts.push(
        c.env.DB.prepare(
          `INSERT INTO tatara_pedidos (id, stripe_session_id, email, amount_total, currency, items, zona, envio, estado)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')`
        ).bind(
          pedidoId,
          session.id,
          session.customer_details?.email || null,
          session.amount_total,
          session.currency,
          JSON.stringify(items),
          envioInfo.zona,
          JSON.stringify(envioInfo)
        )
      );
      // El batch es atómico y stripe_session_id es UNIQUE: si Stripe reenvía el evento,
      // el INSERT falla y el descuento de stock se revierte con él (idempotencia). No "arreglar".
      await c.env.DB.batch(stmts);
      console.log(`[webhook] pedido ${pedidoId} registrado`);
    } catch (err) {
      console.error("Error procesando checkout.session.completed:", err);
    }
  }

  return c.json({ received: true });
});

// ─── newsletter + contacto ───────────────────────────────
const reEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

app.post("/newsletter", async (c) => {
  const { email } = await c.req.json().catch(() => ({}));
  if (!email || !reEmail.test(String(email))) return c.json({ error: "email inválido" }, 400);
  await c.env.DB.prepare(`INSERT OR IGNORE INTO tatara_newsletter (email) VALUES (?)`)
    .bind(String(email).trim().toLowerCase())
    .run();
  return c.json({ ok: true });
});

app.post("/contacto", async (c) => {
  const { texto, email, nombre } = await c.req.json().catch(() => ({}));
  const msg = String(texto || "").trim();
  if (!msg) return c.json({ error: "mensaje vacío" }, 400);
  const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await c.env.DB.prepare(`INSERT INTO tatara_mensajes (id, nombre, email, texto) VALUES (?, ?, ?, ?)`)
    .bind(id, nombre ? String(nombre).slice(0, 200) : null, email ? String(email).slice(0, 200) : null, msg.slice(0, 5000))
    .run();
  return c.json({ ok: true });
});

// ─── admin ───────────────────────────────────────────────
const admin = new Hono();

admin.use("*", async (c, next) => {
  const auth = c.req.header("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!c.env.ADMIN_TOKEN || token !== c.env.ADMIN_TOKEN) return c.json({ error: "unauthorized" }, 401);
  await next();
});

admin.get("/historial", async (c) => {
  const limitRaw = Number(c.req.query("limit"));
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 500) : 100;
  const { results } = await c.env.DB.prepare(
    `SELECT id, stripe_session_id, email, amount_total, currency, items, zona, envio, estado,
            created_at AS createdAt
       FROM tatara_pedidos ORDER BY created_at DESC LIMIT ?`
  ).bind(limit).all();
  return c.json(
    results.map((p) => ({
      ...p,
      items: JSON.parse(p.items || "[]"),
      envio: p.envio ? JSON.parse(p.envio) : null,
    }))
  );
});

const ESTADOS_PEDIDO = ["pendiente", "enviado", "entregado", "cancelado"];

admin.post("/pedido-estado", async (c) => {
  const { id, estado } = await c.req.json().catch(() => ({}));
  if (!id || !ESTADOS_PEDIDO.includes(estado))
    return c.json({ error: `estado debe ser: ${ESTADOS_PEDIDO.join(", ")}` }, 400);
  const r = await c.env.DB.prepare(`UPDATE tatara_pedidos SET estado = ? WHERE id = ?`)
    .bind(estado, String(id))
    .run();
  if (!r.meta.changes) return c.json({ error: "pedido no encontrado" }, 404);
  return c.json({ ok: true });
});

admin.get("/newsletter", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT email, created_at AS createdAt FROM tatara_newsletter ORDER BY created_at DESC LIMIT 1000`
  ).all();
  return c.json(results);
});

admin.get("/mensajes", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT id, nombre, email, texto, created_at AS createdAt FROM tatara_mensajes ORDER BY created_at DESC LIMIT 500`
  ).all();
  return c.json(results);
});

admin.post("/stock-bulk", async (c) => {
  const { productos: updates = [] } = await c.req.json().catch(() => ({}));
  if (!Array.isArray(updates)) return c.json({ error: "productos debe ser array" }, 400);
  // Acepta {id, cantidad} (formato tatara) y {id, stockByTalla} (formato semilla/quienNoCorre),
  // para que las herramientas admin sean intercambiables entre tiendas.
  const stmts = [];
  for (const u of updates) {
    if (!u?.id) continue;
    const porTalla =
      u.stockByTalla && typeof u.stockByTalla === "object"
        ? Object.entries(u.stockByTalla)
        : typeof u.cantidad === "number"
          ? [["_", u.cantidad]]
          : [];
    for (const [talla, cantidad] of porTalla) {
      stmts.push(
        c.env.DB.prepare(
          `INSERT INTO tatara_stock (producto_id, talla, cantidad) VALUES (?, ?, ?)
           ON CONFLICT (producto_id, talla) DO UPDATE SET cantidad = excluded.cantidad`
        ).bind(String(u.id), String(talla), Math.max(0, Number(cantidad) || 0))
      );
    }
  }
  if (stmts.length) await c.env.DB.batch(stmts);
  return c.json({ updated: stmts.length });
});

app.route("/admin", admin);

// El Worker: Hono atiende /api/*; los assets (la web) los sirve Cloudflare automáticamente.
export default app;
