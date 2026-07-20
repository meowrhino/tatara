# TODO — Apuntar `tatara.cat` a Cloudflare

> Guía para dejar la web publicada en el dominio propio `tatara.cat`.
> Todos los pasos son en paneles web (Cloudflare y Pangea). Marcados con 🖥️ los
> que necesitan la terminal (`wrangler`).

---

## 0. Contexto (importante)

La web de TAT ARA **no es solo archivos estáticos**. Corre como un **Cloudflare
Worker** (llamado `tatara`) que sirve:

- la **web** (HTML/CSS/JS/JSON), y
- una **API** (`/api/*`): alta a la newsletter, carrito, stock y checkout de Stripe,
  con una **base de datos D1**.

Por eso **el hosting SFTP de Pangea no sirve para el conjunto**: subiendo los
archivos por SFTP se vería la web, pero **la newsletter y el carrito no
funcionarían**. La solución es apuntar el dominio a Cloudflare.

## Regla de oro

Para que `tatara.cat` sirva el Worker, **el dominio y el Worker deben estar en
la MISMA cuenta de Cloudflare**. Hay que decidir de quién es esa cuenta:

- **Opción A — cuenta de la clienta (propiedad total).** La asociación es dueña
  de todo. Requiere desplegar también el Worker en su cuenta (pasos 1–4). ← recomendada
- **Opción B — el Worker se queda en la cuenta actual (de Manu).** Más simple,
  pero entonces el dominio se añade a ESA cuenta, no a la de la asociación. Si se
  elige B, saltar directamente a la sección **“Apuntar el dominio”**.

---

## Opción A — Poner el Worker en la cuenta de la clienta

### 1. Crear cuenta de Cloudflare
Registrarse en https://dash.cloudflare.com (plan **Free**).

### 2. Desplegar el Worker desde GitHub
- Dashboard → **Workers & Pages** → **Create** → pestaña **Workers** → **Connect to Git**.
- Autorizar GitHub y elegir el repo **`meowrhino/tatara`**, rama `main`.
- A partir de ahí, **cada push a `main` despliega solo**.

### 3. Base de datos D1 (necesaria para newsletter y carrito)
🖥️ En una terminal, dentro del repo:
```bash
npx wrangler d1 create shop
```
Copiar el `database_id` que devuelve y **pegarlo en `wrangler.toml`** (campo
`database_id`, línea del bloque `[[d1_databases]]`).

Cargar las tablas:
```bash
npx wrangler d1 execute shop --remote --file=schema-tatara.sql
```

### 4. Secretos (solo si se usa el checkout de Stripe / el admin)
🖥️
```bash
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler secret put ADMIN_TOKEN
```
> La **newsletter NO necesita** estos secretos. Si todavía no hay tienda con
> cobro real, este paso puede esperar.

---

## Apuntar el dominio (en la cuenta elegida)

### 5. Añadir `tatara.cat` a Cloudflare
- Dashboard → **Add a site / Añadir sitio** → escribir `tatara.cat` → plan **Free**.
- Cloudflare **escanea el DNS actual de Pangea** e importa los registros.
  ⚠️ **Revisar que estén todos**, sobre todo si `tatara.cat` tiene **correo**
  (registros `MX`) o subdominios, para no romperlos.
- Al terminar, Cloudflare da **2 nameservers** (tipo `xxx.ns.cloudflare.com`).
  **Apuntarlos.**

### 6. Cambiar los nameservers en Pangea
- Entrar al panel de **Pangea** donde se gestiona el dominio `tatara.cat`.
- Buscar **nameservers / servidores DNS** y **sustituir los de Pangea por los 2
  de Cloudflare**.
- Guardar. Propaga en **minutos–24h**. Cloudflare avisa por email cuando el
  dominio pasa a **“Active”**.

### 7. Enganchar `tatara.cat` al Worker
- Cloudflare → **Workers & Pages** → Worker **`tatara`** → **Settings** →
  **Domains & Routes** (o *Triggers*) → **Add Custom Domain** → `tatara.cat`
  (y `www.tatara.cat` si se quiere).
- Cloudflare crea el registro DNS y el **certificado SSL (HTTPS)** solo.
- En unos minutos, `tatara.cat` sirve la web completa (con newsletter y carrito).

---

## Datos del dominio

- **Dominio:** `tatara.cat`
- **Registrado en:** Pangea
- Los **nameservers** se cambian en el panel de Pangea (paso 6).
- El **SFTP de Pangea NO se usa** para esto.

## Notas finales

- No se pierde `tatara.manuellatourf.workers.dev`: el dominio propio se **añade**.
- ⚠️ **Seguridad:** la contraseña SFTP que se compartió por WhatsApp conviene
  **cambiarla** en Pangea (aunque con este plan el SFTP no se usa).
- Si la asociación usa email `@tatara.cat`, **verificar los registros `MX`**
  antes de cambiar los nameservers (paso 5).
