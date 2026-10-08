<?php
/**
 * tools/php-router.php — SOLO para pruebas locales.
 *
 * El servidor de PHP (`php -S`) no lee .htaccess, así que aquí se imitan sus
 * dos reglas: /api/... lo atiende api/index.php, y una dirección sin fichero
 * (/nosaltres/, /exposicions/anna-dot/) recibe su index.html si existe (dist/
 * pre-renderizado) o, si no, el index.html de la raíz, y el JS pinta la sección.
 * También lo usa tools/prerender.mjs para pintar cada página.
 *
 *   php -S 127.0.0.1:8787 -t . tools/php-router.php
 */
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
if (str_starts_with($path, '/api')) {
    require __DIR__ . '/../api/index.php';
    return true;
}
$root = $_SERVER['DOCUMENT_ROOT'];
if (is_file($root . $path)) return false;
$page = is_file($root . rtrim($path, '/') . '/index.html') ? rtrim($path, '/') . '/index.html' : '/index.html';
header('Content-Type: text/html; charset=utf-8');
readfile($root . $page);
return true;
