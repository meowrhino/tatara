<?php
/**
 * lib/db.php — la base de datos.
 *
 * En el Worker esto era D1 (SQLite gestionada por Cloudflare). Aquí es PDO:
 * MySQL en Pangea, SQLite en local para las pruebas. Los nombres de tabla son
 * los mismos (tatara_*) para que el esquema, el panel /admin y los datos
 * exportados de D1 encajen sin traducir nada.
 *
 * Las tres sentencias que SQLite y MySQL escriben distinto (INSERT IGNORE y el
 * UPSERT de stock) están aisladas abajo en funciones; el resto del SQL es común.
 */

require_once __DIR__ . '/config.php';

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;

    $driver = cfg_get('db.driver', 'mysql');
    $opciones = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    if ($driver === 'sqlite') {
        $ruta = cfg_get('db.sqlite_path', __DIR__ . '/../../.data/tatara.sqlite');
        $dir = dirname($ruta);
        if (!is_dir($dir)) mkdir($dir, 0770, true);
        $pdo = new PDO('sqlite:' . $ruta, null, null, $opciones);
        $pdo->exec('PRAGMA foreign_keys = ON');
        // WAL: deja que una lectura y una escritura convivan sin bloquearse.
        $pdo->exec('PRAGMA journal_mode = WAL');
    } else {
        // Algunos alojamientos compartidos no escuchan en el 3306 de siempre, y
        // otros solo aceptan conexión por socket local. Se admiten las dos cosas.
        $socket = cfg_get('db.socket');
        $dsn = $socket
            ? sprintf('mysql:unix_socket=%s;dbname=%s;charset=utf8mb4', $socket, cfg_get('db.name', 'tatara'))
            : sprintf(
                'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
                cfg_get('db.host', 'localhost'),
                (int) cfg_get('db.port', 3306),
                cfg_get('db.name', 'tatara')
            );
        $pdo = new PDO($dsn, cfg_get('db.user', ''), cfg_get('db.pass', ''), $opciones);
    }

    return $pdo;
}

function db_driver(): string
{
    return db()->getAttribute(PDO::ATTR_DRIVER_NAME);
}

/** SELECT → array de filas. */
function db_all(string $sql, array $params = []): array
{
    $st = db()->prepare($sql);
    $st->execute($params);
    return $st->fetchAll();
}

/** SELECT → primera fila o null. */
function db_first(string $sql, array $params = []): ?array
{
    $st = db()->prepare($sql);
    $st->execute($params);
    $fila = $st->fetch();
    return $fila === false ? null : $fila;
}

/** INSERT/UPDATE/DELETE → nº de filas afectadas. */
function db_run(string $sql, array $params = []): int
{
    $st = db()->prepare($sql);
    $st->execute($params);
    return $st->rowCount();
}

/**
 * Varias sentencias como un todo: o entran todas o no entra ninguna.
 * Es lo que en el Worker hacía `env.DB.batch()`, y de eso depende la
 * idempotencia del webhook de Stripe (ver index.php).
 *
 * @param callable $fn recibe el PDO ya en transacción.
 */
function db_tx(callable $fn)
{
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $r = $fn($pdo);
        $pdo->commit();
        return $r;
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

/** ¿Es este error un choque con una clave única/duplicada? (MySQL 1062 · SQLite 19) */
function db_es_duplicado(Throwable $e): bool
{
    $msg = $e->getMessage();
    return (bool) preg_match('/UNIQUE constraint failed|Duplicate entry|Integrity constraint violation/i', $msg);
}

// ─── los tres dialectos ──────────────────────────────────
/** "Insértalo si no está ya" (newsletter, alta de stock a 0). */
function sql_insert_ignore(string $tabla, string $columnas, string $valores): string
{
    return db_driver() === 'sqlite'
        ? "INSERT OR IGNORE INTO $tabla ($columnas) VALUES ($valores)"
        : "INSERT IGNORE INTO $tabla ($columnas) VALUES ($valores)";
}

/** "Nunca por debajo de cero": MySQL lo llama GREATEST y SQLite, MAX. */
function sql_maximo(string $a, string $b): string
{
    $fn = db_driver() === 'sqlite' ? 'MAX' : 'GREATEST';
    return "$fn($a, $b)";
}

/** "Pon esta cantidad, exista la fila o no" (admin/stock-bulk). */
function sql_upsert_stock(): string
{
    return db_driver() === 'sqlite'
        ? "INSERT INTO tatara_stock (producto_id, talla, cantidad) VALUES (?, ?, ?)
           ON CONFLICT (producto_id, talla) DO UPDATE SET cantidad = excluded.cantidad"
        : "INSERT INTO tatara_stock (producto_id, talla, cantidad) VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE cantidad = VALUES(cantidad)";
}

