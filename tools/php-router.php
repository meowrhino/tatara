<?php
/**
 * tools/php-router.php — SOLO para pruebas locales.
 *
 * El servidor de PHP (`php -S`) no lee .htaccess, así que aquí se imita la única
 * regla que hay: /api/... lo atiende api/index.php, y el resto son ficheros.
 *
 *   php -S 127.0.0.1:8787 -t . tools/php-router.php
 */
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
if (str_starts_with($path, '/api')) {
    require __DIR__ . '/../api/index.php';
    return true;
}
return false;
