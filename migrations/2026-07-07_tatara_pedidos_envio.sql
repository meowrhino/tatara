-- Migración: tatara_pedidos guarda zona de envío, dirección (de Stripe) y estado.
-- Solo hace falta en la shop remota creada ANTES del 2026-07-07 (schema-tatara.sql ya trae
-- las columnas). Aplica con:  npm run db:migrate   ·  local: añade --local en su lugar.

ALTER TABLE tatara_pedidos ADD COLUMN zona TEXT;
ALTER TABLE tatara_pedidos ADD COLUMN envio TEXT;
ALTER TABLE tatara_pedidos ADD COLUMN estado TEXT NOT NULL DEFAULT 'pendiente';
