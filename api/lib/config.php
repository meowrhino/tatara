<?php
/**
 * Carga la configuración: api/config.php si existe (Pangea), variables de
 * entorno si no (pruebas locales con `php -S`, ver DESARROLLO.md).
 */

function cfg(): array
{
    static $cfg = null;
    if ($cfg !== null) return $cfg;

    $file = __DIR__ . '/../config.php';
    $cfg = is_file($file) ? require $file : [];

    // Las variables de entorno pisan al fichero: así el script de pruebas puede
    // levantar la API contra un SQLite temporal sin tocar config.php.
    $env = [
        'TATARA_DB_DRIVER'      => ['db', 'driver'],
        'TATARA_DB_HOST'        => ['db', 'host'],
        'TATARA_DB_PORT'        => ['db', 'port'],
        'TATARA_DB_SOCKET'      => ['db', 'socket'],
        'TATARA_DB_NAME'        => ['db', 'name'],
        'TATARA_DB_USER'        => ['db', 'user'],
        'TATARA_DB_PASS'        => ['db', 'pass'],
        'TATARA_SQLITE_PATH'    => ['db', 'sqlite_path'],
        'STRIPE_SECRET_KEY'     => ['stripe_secret_key'],
        'STRIPE_WEBHOOK_SECRET' => ['stripe_webhook_secret'],
        'ADMIN_TOKEN'           => ['admin_token'],
        'FRONTEND_URL'          => ['frontend_url'],
    ];
    foreach ($env as $var => $path) {
        $val = getenv($var);
        if ($val === false || $val === '') continue;
        if (count($path) === 2) $cfg[$path[0]][$path[1]] = $val;
        else $cfg[$path[0]] = $val;
    }

    return $cfg;
}

/** Un valor de configuración con punto: cfg_get('db.driver', 'mysql'). */
function cfg_get(string $clave, $porDefecto = null)
{
    $nodo = cfg();
    foreach (explode('.', $clave) as $parte) {
        if (!is_array($nodo) || !array_key_exists($parte, $nodo)) return $porDefecto;
        $nodo = $nodo[$parte];
    }
    return ($nodo === '' || $nodo === null) ? $porDefecto : $nodo;
}
