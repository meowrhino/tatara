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

const productos = edicions.products || [];

const app = new Hono().basePath("/api");

// ─── helpers ─────────────────────────────────────────────
const toCents = (eur) => Math.round(Number(eur) * 100);

const comprable = (p) => p && p.activo !== false && typeof p.price === "number" && p.price > 0;

function findProducto(id) {
  return productos.find((p) => String(p.id) === String(id));
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
  })();
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
  if (!carrito.length) return c.json({ error: "carrito vacío" }, 400);

  await ensureStock(c.env);

  // Resolver cada ítem contra el JSON (precio) y contra D1 (stock).
  const resolved = [];
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

    resolved.push({ p, cantidad });
  }

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
      payment_method_types: ["card"],
      line_items,
      success_url: `${frontend}/#shop?gracies=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontend}/#cart`,
      metadata: {
        carrito: JSON.stringify(
          resolved.map(({ p, cantidad }) => ({ id: p.id, nombre: p.title, precio: p.price, cantidad }))
        ),
      },
    });
    return c.json({ url: session.url, id: session.id });
  } catch (err) {
    console.error("Stripe session error:", err?.message || err);
    return c.json({ error: "no se pudo crear la sesión" }, 500);
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
      const carrito = JSON.parse(session.metadata?.carrito || "[]");
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
          `INSERT INTO tatara_pedidos (id, stripe_session_id, email, amount_total, currency, items)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(
          pedidoId,
          session.id,
          session.customer_details?.email || null,
          session.amount_total,
          session.currency,
          JSON.stringify(carrito)
        )
      );
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
    `SELECT id, stripe_session_id, email, amount_total, currency, items, created_at AS createdAt
       FROM tatara_pedidos ORDER BY created_at DESC LIMIT ?`
  ).bind(limit).all();
  return c.json(results.map((p) => ({ ...p, items: JSON.parse(p.items || "[]") })));
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
  const stmts = [];
  for (const u of updates) {
    if (!u?.id || typeof u.cantidad !== "number") continue;
    stmts.push(
      c.env.DB.prepare(
        `INSERT INTO tatara_stock (producto_id, talla, cantidad) VALUES (?, '_', ?)
         ON CONFLICT (producto_id, talla) DO UPDATE SET cantidad = excluded.cantidad`
      ).bind(String(u.id), Math.max(0, Number(u.cantidad) || 0))
    );
  }
  if (stmts.length) await c.env.DB.batch(stmts);
  return c.json({ updated: stmts.length });
});

app.route("/admin", admin);

// El Worker: Hono atiende /api/*; los assets (la web) los sirve Cloudflare automáticamente.
export default app;
