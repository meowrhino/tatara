<?php
/**
 * lib/stripe.php — Stripe sin SDK ni composer.
 *
 * El Worker usaba la librería `stripe` de npm. En un alojamiento compartido no
 * damos por hecho que haya composer, así que aquí se habla con la API REST de
 * Stripe a pelo (curl + formulario). Son tres llamadas en total:
 *
 *   POST /v1/checkout/sessions       crear el pago
 *   GET  /v1/checkout/sessions/{id}  consultar cómo fue
 *   (webhook: no es una llamada, es una firma que hay que verificar)
 *
 * La firma del webhook se comprueba igual que la hace el SDK: HMAC-SHA256 de
 * "timestamp.cuerpo" con el secreto, comparado en tiempo constante.
 */

class StripeError extends RuntimeException {}

/** Versión de la API de Stripe. La misma que trae `stripe` de npm ^16 (la del Worker). */
const STRIPE_API_VERSION = '2024-06-20';

/**
 * Stripe recibe formularios, no JSON, y anida con corchetes:
 *   line_items[0][price_data][currency]=eur
 * http_build_query ya escribe justo eso. Lo único que hay que arreglar antes
 * son los booleanos (Stripe quiere "true"/"false", no 1/0) y los nulos (fuera).
 */
function stripe_form(array $params): string
{
    $limpiar = function ($valor) use (&$limpiar) {
        if (is_bool($valor)) return $valor ? 'true' : 'false';
        if (is_array($valor)) {
            $out = [];
            foreach ($valor as $k => $v) {
                if ($v === null) continue;
                $out[$k] = $limpiar($v);
            }
            return $out;
        }
        return $valor;
    };
    return http_build_query($limpiar($params), '', '&', PHP_QUERY_RFC3986);
}

/** Una llamada a la API de Stripe. Devuelve el JSON decodificado o lanza StripeError. */
function stripe_request(string $metodo, string $path, array $params = [], ?string $clave = null): array
{
    $clave = $clave ?? cfg_get('stripe_secret_key', '');
    if ($clave === '') throw new StripeError('falta STRIPE_SECRET_KEY');

    $url = 'https://api.stripe.com' . $path;
    $cuerpo = $params ? stripe_form($params) : '';
    if ($metodo === 'GET' && $cuerpo !== '') {
        $url .= '?' . $cuerpo;
        $cuerpo = '';
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST  => $metodo,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_HTTPHEADER     => [
            'Authorization: Bearer ' . $clave,
            'Content-Type: application/x-www-form-urlencoded',
            // Sin esto Stripe usa la versión de API por defecto de la cuenta,
            // que es justo lo que hacía el Worker. Se deja así a propósito.
            'Stripe-Version: ' . STRIPE_API_VERSION,
        ],
    ]);
    if ($cuerpo !== '') curl_setopt($ch, CURLOPT_POSTFIELDS, $cuerpo);

    $respuesta = curl_exec($ch);
    $estado = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $errCurl = curl_error($ch);
    curl_close($ch);

    if ($respuesta === false) throw new StripeError('no se pudo contactar con Stripe: ' . $errCurl);

    $datos = json_decode($respuesta, true);
    if (!is_array($datos)) throw new StripeError('respuesta ilegible de Stripe');
    if ($estado >= 400) {
        throw new StripeError($datos['error']['message'] ?? ('error de Stripe (' . $estado . ')'));
    }
    return $datos;
}

/**
 * Verifica la firma del webhook y devuelve el evento.
 *
 * @param string $cuerpo   el cuerpo CRUDO de la petición (sin decodificar: la firma es sobre los bytes)
 * @param string $firma    cabecera Stripe-Signature
 * @param int    $margen   segundos de tolerancia de reloj (Stripe usa 300)
 * @throws StripeError si la firma no cuadra
 */
function stripe_verificar_webhook(string $cuerpo, ?string $firma, string $secreto, int $margen = 300): array
{
    if (!$firma) throw new StripeError('falta la cabecera Stripe-Signature');

    $t = null;
    $v1 = [];
    foreach (explode(',', $firma) as $parte) {
        $kv = explode('=', trim($parte), 2);
        if (count($kv) !== 2) continue;
        if ($kv[0] === 't') $t = $kv[1];
        if ($kv[0] === 'v1') $v1[] = $kv[1];
    }
    if ($t === null || !$v1) throw new StripeError('cabecera Stripe-Signature mal formada');

    if ($margen > 0 && abs(time() - (int) $t) > $margen) {
        throw new StripeError('el webhook llega con demasiado desfase de reloj');
    }

    $esperada = hash_hmac('sha256', $t . '.' . $cuerpo, $secreto);
    $ok = false;
    // hash_equals: compara sin cortar en la primera diferencia (ver igualdad_segura en index.php).
    foreach ($v1 as $recibida) if (hash_equals($esperada, $recibida)) $ok = true;
    if (!$ok) throw new StripeError('firma del webhook incorrecta');

    $evento = json_decode($cuerpo, true);
    if (!is_array($evento)) throw new StripeError('cuerpo del webhook ilegible');
    return $evento;
}
