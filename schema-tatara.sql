-- Tablas de TAT ARA en la D1 compartida `shop` (convención: prefijo por tienda).
-- quienNoCorre usa las tablas sin prefijo; tatara usa tatara_*.
-- Aplicar:  npx wrangler d1 execute shop --remote --file=schema-tatara.sql

CREATE TABLE IF NOT EXISTS tatara_stock (
  producto_id TEXT NOT NULL,
  talla       TEXT NOT NULL DEFAULT '_',
  cantidad    INTEGER NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
  PRIMARY KEY (producto_id, talla)
);

CREATE TABLE IF NOT EXISTS tatara_pedidos (
  id                 TEXT PRIMARY KEY,
  stripe_session_id  TEXT UNIQUE,
  email              TEXT,
  amount_total       INTEGER,       -- céntimos
  currency           TEXT,
  items              TEXT NOT NULL, -- JSON: [{id, nombre, precio, cantidad}]
  created_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tatara_newsletter (
  email       TEXT PRIMARY KEY,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tatara_mensajes (
  id          TEXT PRIMARY KEY,
  nombre      TEXT,
  email       TEXT,
  texto       TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
