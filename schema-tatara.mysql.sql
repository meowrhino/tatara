-- Esquema de TAT ARA para MySQL/MariaDB (opción Pangea).
-- Equivalente 1:1 al de D1 (schema-tatara.sql): mismas tablas, mismas columnas,
-- mismos nombres. Lo único que cambia son los tipos, porque MySQL necesita
-- longitud en las columnas que van indexadas.
--
-- Aplicar desde phpMyAdmin (pestaña Importar) o por consola:
--   mysql -u USUARIO -p BASE < schema-tatara.mysql.sql

CREATE TABLE IF NOT EXISTS tatara_stock (
  producto_id VARCHAR(100)  NOT NULL,
  talla       VARCHAR(32)   NOT NULL DEFAULT '_',
  cantidad    INT           NOT NULL DEFAULT 0,
  PRIMARY KEY (producto_id, talla),
  CHECK (cantidad >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tatara_pedidos (
  id                VARCHAR(64)  NOT NULL,
  stripe_session_id VARCHAR(191) DEFAULT NULL,
  email             VARCHAR(191) DEFAULT NULL,
  amount_total      INT          DEFAULT NULL,   -- céntimos
  currency          VARCHAR(10)  DEFAULT NULL,
  items             MEDIUMTEXT   NOT NULL,       -- JSON: [{id, nombre, precio, cantidad}]
  zona              VARCHAR(100) DEFAULT NULL,   -- zona de envío elegida (envios.json)
  envio             MEDIUMTEXT   DEFAULT NULL,   -- JSON: {zona, nombre, direccion, telefono}
  estado            VARCHAR(20)  NOT NULL DEFAULT 'pendiente',
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  -- UNIQUE no es un detalle: es lo que hace que un webhook repetido de Stripe
  -- no descuente el stock dos veces (ver api/index.php, registrar_pedido).
  UNIQUE KEY uniq_stripe_session (stripe_session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tatara_newsletter (
  email      VARCHAR(191) NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tatara_mensajes (
  id         VARCHAR(64)  NOT NULL,
  nombre     VARCHAR(200) DEFAULT NULL,
  email      VARCHAR(200) DEFAULT NULL,
  texto      TEXT         NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
