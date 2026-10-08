<?php
/**
 * api/index.php — backend de TAT ARA en PHP, para alojamiento compartido (Pangea).
 *
 * Es el mismo backend que src/index.js (Cloudflare Worker + D1), ruta por ruta y
 * respuesta por respuesta: el frontend no cambia ni una línea, porque sigue
 * llamando a /api/... con rutas relativas.
 *
 *   Worker                        aquí
 *   ─────────────────────────     ─────────────────────────
 *   Hono                          este router de abajo
 *   D1 (SQLite de Cloudflare)     MySQL por PDO (lib/db.php)
 *   librería stripe de npm        API REST de Stripe por curl (lib/stripe.php)
 *   secrets de wrangler           api/config.php (fuera de git)
 *   env.DB.batch()                db_tx() — una transacción
 *
 * Lo que NO cambia (y no debe cambiar): el precio y el nombre que se cobran salen
 * de data/botiga.json, nunca del navegador; la base de datos solo guarda lo
 * mutable (stock, pedidos, newsletter, mensajes).
 *
 * Rutas: /health /stock /crear-sesion /session-status /stripe-webhook
 *        /newsletter /contacto  ·  /admin/{historial,pedido-estado,newsletter,mensajes,stock-bulk}
 */

require_once __DIR__ . '/lib/config.php';
require_once __DIR__ . '/lib/http.php';
require_once __DIR__ . '/lib/db.php';
require_once __DIR__ . '/lib/catalogo.php';
require_once __DIR__ . '/lib/stripe.php';

// Los errores se escriben en el log del hosting, nunca en la respuesta: un aviso
// de PHP colado dentro del JSON rompería el frontend.
ini_set('display_errors', '0');

// ─── stock ───────────────────────────────────────────────

/** Da de alta en la tabla el stock de los productos comprables. Idempotente. */
function ensure_stock(): void
{
    $comprables = array_values(array_filter(productos(), 'comprable'));
    if (!$comprables) return;
    $sql = sql_insert_ignore('tatara_stock', 'producto_id, talla, cantidad', "?, '_', ?");
    db_tx(function (PDO $pdo) use ($comprables, $sql) {
        $st = $pdo->prepare($sql);
        foreach ($comprables as $p) {
            $inicial = isset($p['stockInicial']) && is_numeric($p['stockInicial'])
                ? max(0, (int) $p['stockInicial']) : 0;
            $st->execute([(string) $p['id'], $inicial]);
        }
    });
}

/** {producto_id: {talla: cantidad}} — la forma que espera el frontend. */
function fetch_stock(): array
{
    $filas = db_all('SELECT producto_id, talla, cantidad FROM tatara_stock');
    $porProducto = [];
    foreach ($filas as $f) {
        $porProducto[$f['producto_id']][$f['talla']] = (int) $f['cantidad'];
    }
    return $porProducto;
}

// ─── router ──────────────────────────────────────────────

function despachar(string $ruta, string $metodo): void
{
    // El panel /admin va aparte: lleva token.
    if (str_starts_with($ruta, '/admin')) {
        exigir_admin();
        despachar_admin(substr($ruta, 6) ?: '/', $metodo);
        return;
    }

    switch ("$metodo $ruta") {
        case 'GET /health':
            json_out([
                'ok' => true,
                'runtime' => 'php ' . PHP_VERSION,
                'db' => db_driver() . '(tablas tatara_*)',
                'productos' => count(productos()),
            ]);

        case 'GET /stock':
            ensure_stock();
            json_out(fetch_stock());

        case 'POST /crear-sesion':
            crear_sesion();

        case 'GET /session-status':
            estado_sesion();

        case 'POST /stripe-webhook':
            stripe_webhook();

        case 'POST /newsletter':
            newsletter();

        case 'POST /contacto':
            contacto();
    }

    fail('no encontrado', 404);
}

// ─── checkout ────────────────────────────────────────────

function crear_sesion(): void
{
    $claveStripe = cfg_get('stripe_secret_key', '');
    if ($claveStripe === '') fail('checkout no configurado todavía', 503);

    $body = cuerpo_json();
    $carrito = is_array($body['carrito'] ?? null) ? $body['carrito'] : [];
    $envioReq = $body['envio'] ?? null;
    if (!$carrito) fail('carrito vacío', 400);

    ensure_stock();

    // Cada ítem se resuelve contra el JSON (precio) y contra la base (stock).
    $resueltos = [];
    $pesoTotal = 0.0;
    foreach ($carrito as $i => $it) {
        $p = find_producto($it['id'] ?? null);
        if (!$p) fail('producto ' . ($it['id'] ?? '?') . ' no existe', 400);
        if (!comprable($p)) fail('producto ' . $p['id'] . ' no disponible', 400);

        $cantidad = $it['cantidad'] ?? null;
        if (!is_int($cantidad) && !(is_string($cantidad) && ctype_digit($cantidad))) {
            fail("cantidad inválida en ítem $i", 400);
        }
        $cantidad = (int) $cantidad;
        if ($cantidad <= 0) fail("cantidad inválida en ítem $i", 400);

        $fila = db_first(
            "SELECT cantidad FROM tatara_stock WHERE producto_id = ? AND talla = '_'",
            [(string) $p['id']]
        );
        $disponible = $fila ? (int) $fila['cantidad'] : 0;
        if ($disponible < $cantidad) {
            json_out(['error' => 'sin stock para ' . titulo_de($p), 'disponible' => $disponible], 409);
        }

        $pesoTotal += ((float) ($p['peso'] ?? 0)) * $cantidad;
        $resueltos[] = ['p' => $p, 'cantidad' => $cantidad];
    }

    // Envío: si hay zonas en envios.json, elegir una es obligatorio y el precio
    // se recalcula aquí (nunca se acepta el que venga del navegador).
    $zonas = zonas_envio();
    $zonaEnvio = null;
    $precioEnvio = null;
    if ($zonas) {
        $zonaPedida = $envioReq['zona'] ?? null;
        if (!$zonaPedida) fail('falta la zona de envío', 400);
        foreach ($zonas as $z) if (($z['zona'] ?? null) === $zonaPedida) $zonaEnvio = $z;
        if (!$zonaEnvio) fail('zona de envío desconocida', 400);
        $precioEnvio = precio_envio($zonaEnvio, $pesoTotal);
    }
    $conEnvio = $zonaEnvio !== null && !es_zona_recogida($zonaEnvio);

    $lineItems = [];
    foreach ($resueltos as $r) {
        $lineItems[] = [
            'quantity' => $r['cantidad'],
            'price_data' => [
                'currency' => 'eur',
                'product_data' => [
                    'name' => titulo_de($r['p']),
                    'metadata' => ['id' => (string) $r['p']['id']],
                ],
                'unit_amount' => a_centimos($r['p']['price']),
            ],
        ];
    }

    $frontend = cfg_get('frontend_url') ?: origen_peticion();

    $params = [
        'mode' => 'payment',
        // Sin payment_method_types: Stripe usa los métodos activados en el panel
        // (tarjeta + wallets de serie; Bizum/PayPal se activan allí, sin tocar código).
        'line_items' => $lineItems,
        'allow_promotion_codes' => true,
        // La sesión caduca en 30 min (mínimo de Stripe): acorta la ventana de
        // sobreventa, porque el stock se descuenta en el webhook, al pagar.
        'expires_at' => time() + 30 * 60,
        // La vuelta aterriza en /carret/, que lee los ?params de la URL.
        'success_url' => $frontend . '/carret/?gracies=1&session_id={CHECKOUT_SESSION_ID}',
        'cancel_url' => $frontend . '/carret/',
        // Metadata mínima (Stripe limita a 500 chars por valor): solo id+cantidad.
        // El webhook re-enriquece título y precio desde botiga.json.
        'metadata' => [
            'carrito' => json_encode(array_map(
                fn($r) => ['id' => $r['p']['id'], 'cantidad' => $r['cantidad']],
                $resueltos
            )),
            'zona' => $zonaEnvio['zona'] ?? '',
        ],
    ];

    if ($conEnvio) {
        $params['shipping_address_collection'] = ['allowed_countries' => paises_de_zona($zonaEnvio)];
        $params['shipping_options'] = [[
            'shipping_rate_data' => [
                'type' => 'fixed_amount',
                'display_name' => nombre_de_zona($zonaEnvio),
                'fixed_amount' => ['amount' => a_centimos($precioEnvio), 'currency' => 'eur'],
            ],
        ]];
    }

    try {
        $sesion = stripe_request('POST', '/v1/checkout/sessions', $params, $claveStripe);
    } catch (StripeError $e) {
        error_log('[tatara] Stripe session error: ' . $e->getMessage());
        fail('no se pudo crear la sesión', 500);
    }

    json_out(['url' => $sesion['url'], 'id' => $sesion['id']]);
}

/**
 * Estado de una sesión de checkout: el frontend lo consulta al volver de Stripe
 * (lee ?session_id del hash) antes de vaciar el carrito.
 */
function estado_sesion(): void
{
    $id = $_GET['session_id'] ?? '';
    if ($id === '') fail('session_id requerido', 400);
    if (cfg_get('stripe_secret_key', '') === '') fail('pagos no configurados', 503);

    try {
        $s = stripe_request('GET', '/v1/checkout/sessions/' . rawurlencode($id));
    } catch (StripeError $e) {
        fail('sesión no encontrada', 404);
    }

    json_out([
        'status' => $s['status'] ?? null,
        'payment_status' => $s['payment_status'] ?? null,
        'email' => $s['customer_details']['email'] ?? null,
    ]);
}

function stripe_webhook(): void
{
    $secreto = cfg_get('stripe_webhook_secret', '');
    if ($secreto === '') {
        error_log('[tatara] STRIPE_WEBHOOK_SECRET vacío — ignorando webhook');
        texto_out('ignored', 200);
    }

    try {
        $evento = stripe_verificar_webhook(cuerpo_crudo(), cabecera('stripe-signature'), $secreto);
    } catch (StripeError $e) {
        error_log('[tatara] Webhook signature failed: ' . $e->getMessage());
        texto_out('Webhook Error: ' . $e->getMessage(), 400);
    }

    if (($evento['type'] ?? '') === 'checkout.session.completed') {
        $sesion = $evento['data']['object'] ?? [];
        try {
            registrar_pedido($sesion);
        } catch (Throwable $e) {
            // Aquí se cruzan dos fallos que se parecen y piden lo contrario:
            //
            //   - Duplicado: Stripe ha reenviado un evento ya procesado. Todo está
            //     bien; hay que contestar 200 o lo reintentará para siempre.
            //   - Cualquier otro (base caída, timeout): el cobro se ha hecho y el
            //     pedido NO se ha guardado. Hay que contestar 5xx para que Stripe
            //     lo reintente — reintenta durante tres días. Si contestáramos 200,
            //     daría el evento por entregado y el pedido se perdería sin que
            //     nadie se entere.
            if (db_es_duplicado($e)) {
                error_log('[tatara] webhook: sesión ' . ($sesion['id'] ?? '?') . ' ya registrada, se ignora');
            } else {
                error_log('[tatara] Error procesando checkout.session.completed: ' . $e->getMessage());
                texto_out('error guardando el pedido', 500);
            }
        }
    }

    json_out(['received' => true]);
}

/**
 * Descuenta el stock y guarda el pedido, todo dentro de una transacción.
 * Es lo que en el Worker hacía env.DB.batch(): como stripe_session_id es UNIQUE,
 * si Stripe reenvía el evento el INSERT falla y el descuento de stock se
 * deshace con él. De ahí sale la idempotencia. No "arreglar" separándolo.
 */
function registrar_pedido(array $sesion): void
{
    $carrito = json_decode($sesion['metadata']['carrito'] ?? '[]', true);
    if (!is_array($carrito)) $carrito = [];

    // Metadata trae solo [{id, cantidad}]: título y precio se resuelven del JSON.
    $items = array_map(function ($it) {
        $p = find_producto($it['id'] ?? null);
        return [
            'id' => $it['id'] ?? null,
            'nombre' => $p ? titulo_de($p) : (string) ($it['id'] ?? ''),
            'precio' => $p ? $p['price'] : null,
            'cantidad' => (int) ($it['cantidad'] ?? 0),
        ];
    }, $carrito);

    // Según la versión de API, la dirección viene en collected_information o en shipping_details.
    $ship = $sesion['collected_information']['shipping_details'] ?? $sesion['shipping_details'] ?? null;
    $envioInfo = [
        'zona' => $sesion['metadata']['zona'] ?? null,
        'nombre' => $ship['name'] ?? $sesion['customer_details']['name'] ?? null,
        'direccion' => $ship['address'] ?? null,
        'telefono' => $sesion['customer_details']['phone'] ?? null,
    ];

    $pedidoId = 'ord_' . time() . '_' . bin2hex(random_bytes(3));

    db_tx(function (PDO $pdo) use ($carrito, $items, $envioInfo, $sesion, $pedidoId) {
        $baja = $pdo->prepare(
            'UPDATE tatara_stock SET cantidad = ' . sql_maximo('0', 'cantidad - ?') .
            " WHERE producto_id = ? AND talla = '_'"
        );
        foreach ($carrito as $it) {
            $baja->execute([(int) ($it['cantidad'] ?? 0), (string) ($it['id'] ?? '')]);
        }

        $pdo->prepare(
            "INSERT INTO tatara_pedidos
               (id, stripe_session_id, email, amount_total, currency, items, zona, envio, estado)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')"
        )->execute([
            $pedidoId,
            $sesion['id'] ?? null,
            $sesion['customer_details']['email'] ?? null,
            $sesion['amount_total'] ?? null,
            $sesion['currency'] ?? null,
            json_encode($items, JSON_UNESCAPED_UNICODE),
            $envioInfo['zona'],
            json_encode($envioInfo, JSON_UNESCAPED_UNICODE),
        ]);
    });

    error_log("[tatara] webhook: pedido $pedidoId registrado");
}

// ─── newsletter + contacto ───────────────────────────────

const RE_EMAIL = '/^[^@\s]+@[^@\s]+\.[^@\s]+$/';

function newsletter(): void
{
    $email = cuerpo_json()['email'] ?? '';
    if (!is_string($email) || !preg_match(RE_EMAIL, $email)) fail('email inválido', 400);
    db_run(
        sql_insert_ignore('tatara_newsletter', 'email', '?'),
        [mb_strtolower(trim($email))]
    );
    json_out(['ok' => true]);
}

function contacto(): void
{
    $body = cuerpo_json();
    $texto = trim((string) ($body['texto'] ?? ''));
    if ($texto === '') fail('mensaje vacío', 400);

    db_run(
        'INSERT INTO tatara_mensajes (id, nombre, email, texto) VALUES (?, ?, ?, ?)',
        [
            'msg_' . time() . '_' . bin2hex(random_bytes(3)),
            isset($body['nombre']) ? mb_substr((string) $body['nombre'], 0, 200) : null,
            isset($body['email']) ? mb_substr((string) $body['email'], 0, 200) : null,
            mb_substr($texto, 0, 5000),
        ]
    );
    json_out(['ok' => true]);
}

// ─── admin ───────────────────────────────────────────────

/**
 * hash_equals compara sin cortar en la primera diferencia. Un `==` normal tarda
 * más cuanto más largo es el prefijo acertado, y esa diferencia de tiempo deja
 * adivinar el token carácter a carácter.
 */
function exigir_admin(): void
{
    $esperado = cfg_get('admin_token', '');
    $auth = cabecera('authorization') ?? '';
    $token = str_starts_with($auth, 'Bearer ') ? substr($auth, 7) : '';
    if ($esperado === '' || !hash_equals($esperado, $token)) fail('unauthorized', 401);
}

const ESTADOS_PEDIDO = ['pendiente', 'enviado', 'entregado', 'cancelado'];

function despachar_admin(string $ruta, string $metodo): void
{
    switch ("$metodo $ruta") {
        case 'GET /historial':
            $limiteRaw = (int) ($_GET['limit'] ?? 0);
            $limite = $limiteRaw > 0 ? min($limiteRaw, 500) : 100;
            // LIMIT no admite parámetro en MySQL con prepares reales: se castea a int.
            $filas = db_all(
                'SELECT id, stripe_session_id, email, amount_total, currency, items, zona, envio, estado,
                        created_at AS createdAt
                   FROM tatara_pedidos ORDER BY created_at DESC LIMIT ' . $limite
            );
            json_out(array_map(function ($p) {
                $p['items'] = json_decode($p['items'] ?: '[]', true);
                $p['envio'] = $p['envio'] ? json_decode($p['envio'], true) : null;
                return $p;
            }, $filas));

        case 'POST /pedido-estado':
            $body = cuerpo_json();
            $id = $body['id'] ?? null;
            $estado = $body['estado'] ?? null;
            if (!$id || !in_array($estado, ESTADOS_PEDIDO, true)) {
                fail('estado debe ser: ' . implode(', ', ESTADOS_PEDIDO), 400);
            }
            $cambios = db_run('UPDATE tatara_pedidos SET estado = ? WHERE id = ?', [$estado, (string) $id]);
            if (!$cambios) fail('pedido no encontrado', 404);
            json_out(['ok' => true]);

        case 'GET /newsletter':
            json_out(db_all(
                'SELECT email, created_at AS createdAt FROM tatara_newsletter
                  ORDER BY created_at DESC LIMIT 1000'
            ));

        case 'GET /mensajes':
            json_out(db_all(
                'SELECT id, nombre, email, texto, created_at AS createdAt FROM tatara_mensajes
                  ORDER BY created_at DESC LIMIT 500'
            ));

        case 'POST /stock-bulk':
            stock_bulk();

        case 'GET /instalar':
            instalar_tablas();
    }

    fail('no encontrado', 404);
}

function stock_bulk(): void
{
    $updates = cuerpo_json()['productos'] ?? [];
    if (!is_array($updates)) fail('productos debe ser array', 400);

    // Acepta {id, cantidad} (formato tatara) y {id, stockByTalla} (formato semilla /
    // quienNoCorre), para que las herramientas admin sean intercambiables entre tiendas.
    $escrituras = [];
    foreach ($updates as $u) {
        if (empty($u['id'])) continue;
        $porTalla = [];
        if (isset($u['stockByTalla']) && is_array($u['stockByTalla'])) {
            $porTalla = $u['stockByTalla'];
        } elseif (isset($u['cantidad']) && is_numeric($u['cantidad'])) {
            $porTalla = ['_' => $u['cantidad']];
        }
        foreach ($porTalla as $talla => $cantidad) {
            $escrituras[] = [(string) $u['id'], (string) $talla, max(0, (int) $cantidad)];
        }
    }

    if ($escrituras) {
        $sql = sql_upsert_stock();
        db_tx(function (PDO $pdo) use ($escrituras, $sql) {
            $st = $pdo->prepare($sql);
            foreach ($escrituras as $e) $st->execute($e);
        });
    }
    json_out(['updated' => count($escrituras)]);
}

/**
 * Crea las cuatro tablas, por si no hay forma de entrar a phpMyAdmin.
 *
 * Es el mismo fichero de esquema que se importaría a mano, y todas las
 * sentencias son CREATE TABLE IF NOT EXISTS: llamarlo dos veces no rompe nada
 * ni borra datos. Pide el token de admin, como el resto de /admin.
 */
function instalar_tablas(): void
{
    $fichero = __DIR__ . '/../' . (db_driver() === 'sqlite' ? 'schema-tatara.sql' : 'schema-tatara.mysql.sql');
    if (!is_file($fichero)) fail('no encuentro el fichero de esquema', 500);

    $sql = file_get_contents($fichero);
    // Fuera los comentarios de línea, y una sentencia por cada ';' final.
    $sql = preg_replace('/^\s*--.*$/m', '', $sql);
    $sentencias = array_filter(array_map('trim', explode(';', $sql)));

    foreach ($sentencias as $sentencia) db()->exec($sentencia);

    $tablas = ['tatara_stock', 'tatara_pedidos', 'tatara_newsletter', 'tatara_mensajes'];
    $creadas = [];
    foreach ($tablas as $t) {
        try { db_first("SELECT 1 FROM $t LIMIT 1"); $creadas[] = $t; } catch (Throwable $e) {}
    }
    json_out(['tablas' => $creadas, 'faltan' => array_values(array_diff($tablas, $creadas))]);
}

/** https://tatara.cat — de dónde vino la petición, para las URLs de vuelta de Stripe. */
function origen_peticion(): string
{
    $https = ($_SERVER['HTTPS'] ?? '') !== '' && $_SERVER['HTTPS'] !== 'off';
    $proto = $https || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https' ? 'https' : 'http';
    return $proto . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
}

// ─── el arranque ─────────────────────────────────────────
// Va al final a propósito: en PHP las `const` de arriba se declaran al pasar por
// ellas, así que atender la petición antes de llegar aquí las dejaría sin definir.

try {
    despachar(ruta_api(), metodo());
} catch (PDOException $e) {
    error_log('[tatara] base de datos: ' . $e->getMessage());
    fail('error de base de datos', 500);
} catch (Throwable $e) {
    error_log('[tatara] ' . $e->getMessage());
    fail('error interno', 500);
}
