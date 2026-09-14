<?php
/**
 * lib/http.php — leer la petición y contestar JSON.
 * El equivalente de lo que Hono daba hecho en el Worker (c.json, c.req.json…).
 */

function json_out($datos, int $estado = 200): void
{
    http_response_code($estado);
    header('Content-Type: application/json; charset=utf-8');
    // JSON_PRESERVE_ZERO_FRACTION: que 10.0 no se convierta en 10 y descuadre precios.
    echo json_encode($datos, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION);
    exit;
}

function fail(string $mensaje, int $estado = 400): void
{
    json_out(['error' => $mensaje], $estado);
}

function texto_out(string $texto, int $estado = 200): void
{
    http_response_code($estado);
    header('Content-Type: text/plain; charset=utf-8');
    echo $texto;
    exit;
}

/** El cuerpo crudo de la petición (el webhook de Stripe firma estos bytes). */
function cuerpo_crudo(): string
{
    static $cuerpo = null;
    if ($cuerpo === null) $cuerpo = file_get_contents('php://input') ?: '';
    return $cuerpo;
}

/** El cuerpo como array. Si no es JSON válido, array vacío (como el .catch del Worker). */
function cuerpo_json(): array
{
    $d = json_decode(cuerpo_crudo(), true);
    return is_array($d) ? $d : [];
}

/**
 * Una cabecera de la petición.
 * Ojo con Authorization: algunos Apache en CGI/FastCGI no la pasan a PHP, por eso
 * se miran también las variantes REDIRECT_ y apache_request_headers().
 * El .htaccess de al lado la fuerza; esto es el cinturón además de los tirantes.
 */
function cabecera(string $nombre): ?string
{
    $clave = 'HTTP_' . strtoupper(str_replace('-', '_', $nombre));
    foreach ([$clave, 'REDIRECT_' . $clave] as $k) {
        if (!empty($_SERVER[$k])) return $_SERVER[$k];
    }
    if (function_exists('apache_request_headers')) {
        foreach (apache_request_headers() as $k => $v) {
            if (strcasecmp($k, $nombre) === 0 && $v !== '') return $v;
        }
    }
    return null;
}

/** La ruta pedida dentro de la API: /api/admin/historial → /admin/historial */
function ruta_api(): string
{
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $pos = strpos($path, '/api');
    $ruta = $pos === false ? $path : substr($path, $pos + 4);
    $ruta = '/' . trim($ruta, '/');
    return $ruta === '/' ? '/' : rtrim($ruta, '/');
}

function metodo(): string
{
    return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
}
