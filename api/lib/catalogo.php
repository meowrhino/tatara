<?php
/**
 * lib/catalogo.php — el catálogo, leído de los mismos JSON que la web.
 *
 * Regla heredada del Worker y que NO cambia: el precio y el nombre que se cobran
 * salen SIEMPRE de data/botiga.json, nunca de lo que manda el navegador. La base
 * de datos solo guarda lo que se mueve (stock, pedidos, newsletter, mensajes).
 */

/** data/botiga.json → lista de productos. */
function productos(): array
{
    static $productos = null;
    if ($productos !== null) return $productos;
    $json = json_decode(file_get_contents(__DIR__ . '/../../data/botiga.json'), true);
    $productos = $json['products'] ?? [];
    return $productos;
}

/** data/envios.json → lista de zonas de envío (vacía = envíos sin decidir). */
function zonas_envio(): array
{
    static $zonas = null;
    if ($zonas !== null) return $zonas;
    $json = json_decode(file_get_contents(__DIR__ . '/../../data/envios.json'), true);
    $zonas = is_array($json) ? $json : [];
    return $zonas;
}

function find_producto($id): ?array
{
    foreach (productos() as $p) {
        if ((string) ($p['id'] ?? '') === (string) $id) return $p;
    }
    return null;
}

/** Comprable = activo y con precio de verdad. Las piezas con price null no se venden. */
function comprable(?array $p): bool
{
    return $p
        && ($p['activo'] ?? true) !== false
        && is_numeric($p['price'] ?? null)
        && (float) $p['price'] > 0;
}

/**
 * El título puede ser un texto suelto o {ca, es, en}. Fuera del navegador no hay
 * idioma activo: para Stripe y para el registro del pedido se usa el catalán,
 * que es el idioma por defecto de la web.
 */
function titulo_de(?array $p): string
{
    if (!$p) return '';
    $t = $p['title'] ?? '';
    if (is_string($t)) return $t;
    if (is_array($t)) return (string) ($t['ca'] ?? reset($t) ?: '');
    return '';
}

function a_centimos($eur): int
{
    return (int) round((float) $eur * 100);
}

/** Zona de recogida en mano (galería): ni pide dirección ni cobra. */
function es_zona_recogida(array $zona): bool
{
    return ($zona['recogida'] ?? false) === true || ($zona['zona'] ?? '') === 'recogida';
}

/** Precio de envío de una zona: tarifa plana ({precio}) o por peso ({tramos}, gramos). */
function precio_envio(?array $zona, float $gramos = 0): float
{
    if (!$zona) return 0;
    if (isset($zona['tramos']) && is_array($zona['tramos'])) {
        $tramos = $zona['tramos'];
        usort($tramos, fn($a, $b) => $a['hasta'] <=> $b['hasta']);
        foreach ($tramos as $tr) {
            if ($gramos <= $tr['hasta']) return (float) ($tr['precio'] ?? 0);
        }
        return (float) ($tramos[count($tramos) - 1]['precio'] ?? 0);
    }
    return (float) ($zona['precio'] ?? 0);
}

function nombre_de_zona(array $zona): string
{
    $n = $zona['nombre'] ?? null;
    if (is_string($n)) return $n;
    if (is_array($n)) return (string) ($n['es'] ?? reset($n));
    return (string) ($zona['zona'] ?? '');
}

function paises_de_zona(array $zona): array
{
    $p = $zona['paises'] ?? null;
    return (is_array($p) && count($p)) ? $p : PAISES_STRIPE;
}

/** Países que acepta Stripe para dirección de envío (ISO 3166-1, sin los no soportados).
 *  Fallback para zonas sin lista `paises` propia en envios.json. */
const PAISES_STRIPE = [
    'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AR', 'AT', 'AU', 'AW', 'AX', 'AZ', 'BA', 'BB', 'BD', 'BE', 'BF',
    'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BW', 'BY', 'BZ', 'CA', 'CD', 'CF', 'CG',
    'CH', 'CI', 'CK', 'CL', 'CM', 'CN', 'CO', 'CR', 'CV', 'CW', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ', 'EC',
    'EE', 'EG', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL',
    'GM', 'GN', 'GP', 'GQ', 'GR', 'GT', 'GU', 'GW', 'GY', 'HK', 'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN',
    'IQ', 'IS', 'IT', 'JE', 'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB',
    'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MK', 'ML', 'MM', 'MN',
    'MO', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NA', 'NC', 'NE', 'NG', 'NI', 'NL', 'NO', 'NP',
    'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM', 'PR', 'PS', 'PT', 'PY', 'QA', 'RE', 'RO',
    'RS', 'RU', 'RW', 'SA', 'SB', 'SC', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS', 'ST',
    'SV', 'SX', 'SZ', 'TC', 'TD', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW', 'TZ', 'UA',
    'UG', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VN', 'VU', 'WF', 'WS', 'XK', 'YE', 'ZA', 'ZM', 'ZW',
];
