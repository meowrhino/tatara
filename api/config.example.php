<?php
/**
 * api/config.example.php — copiar a api/config.php y rellenar.
 *
 * config.php NO va a git (está en .gitignore): contiene la contraseña de la base
 * de datos y las claves de Stripe. En Pangea se sube UNA vez por SFTP y se queda.
 *
 * Es el equivalente a los `secrets` del Worker de Cloudflare (wrangler secret put).
 */
return [
    'db' => [
        // 'mysql' en Pangea · 'sqlite' para probar en local sin instalar nada.
        'driver'      => 'mysql',
        'host'        => 'localhost',
        // Solo si el hosting no usa el puerto de siempre (3306).
        'port'        => 3306,
        // Si Pangea da un socket en vez de host/puerto, ponerlo aquí y se usa ese.
        'socket'      => '',
        'name'        => 'tatara',
        'user'        => 'tatara',
        'pass'        => '',
        // Solo para driver 'sqlite'. Debe quedar FUERA de la carpeta pública.
        'sqlite_path' => __DIR__ . '/../.data/tatara.sqlite',
    ],

    // Vacío = el checkout responde 503, igual que en el Worker sin la clave.
    'stripe_secret_key'     => '',
    'stripe_webhook_secret' => '',

    // Token del panel /admin. Generar uno largo:  openssl rand -hex 32
    'admin_token' => '',

    // Vacío = se usa el origen de la petición (https://tatara.cat).
    'frontend_url' => '',
];
