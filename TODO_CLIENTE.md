# TODO — Traspaso a la clienta

Lista de todo lo que hay que **hacer y revisar** el día que TAT ARA pase a ser
dueña de su web: su cuenta de Cloudflare, su base de datos, su Stripe, su repo.

Hoy nada de esto está hecho: el Worker corre en la cuenta de Manu, en
`tatara.manuellatourf.workers.dev`, y comparte base de datos con otro proyecto.
Eso está bien para desarrollar y es lo que hay que deshacer al entregar.

Los pasos del **dominio** viven en [TODO_DOMINIO.md](TODO_DOMINIO.md) y no se
repiten aquí. Lo que queda del encargo, en [NEXT_STEPS.md](NEXT_STEPS.md).

---

## Antes de empezar: decidir de quién es cada cosa

Cinco cuentas, y conviene saber de quién será cada una **antes** de tocar nada,
porque algunas decisiones son difíciles de deshacer:

| | ¿De quién? | Notas |
|---|---|---|
| Cloudflare | | Tiene que ser la misma cuenta que el dominio (regla de oro de TODO_DOMINIO.md) |
| GitHub | | Si se transfiere el repo, Manu pierde el acceso salvo que se le invite |
| Stripe | | Aquí es donde llega el dinero: **no puede quedarse a nombre de Manu** |
| Dominio (Pangea) | | Solo hay que cambiar los nameservers, el registro se queda donde está |
| Correo de avisos | | A dónde llegan los pedidos y los mensajes de contacto |

---

## 1. Cloudflare

- [ ] La asociación crea su cuenta (plan Free) y **hace la transferencia del
      Worker**, no una invitación: si Manu solo la invita a su cuenta, la web
      sigue siendo suya.
- [ ] Desplegar el Worker `tatara` desde el repo — ver TODO_DOMINIO.md, paso 2.
- [ ] Comprobar que **Workers Builds** queda conectado: cada push a `main` tiene
      que desplegar solo. Si no, cada cambio de contenido exige terminal.
- [ ] Apuntar `tatara.cat` — TODO_DOMINIO.md, pasos 5 a 7.
- [ ] Dar de baja o dejar apagado `tatara.manuellatourf.workers.dev` cuando el
      dominio propio funcione, para que no queden dos webs vivas indexándose.

## 2. Base de datos (D1) — lo más delicado

Ahora mismo `wrangler.toml` apunta a una D1 llamada `shop` que **es compartida
con otro proyecto** (quienNoCorre). TAT ARA usa las tablas con prefijo
`tatara_`; el otro proyecto usa las mismas sin prefijo.

- [ ] Crear una D1 propia en la cuenta de la clienta:
      `npx wrangler d1 create shop`
- [ ] **Pegar el `database_id` nuevo en `wrangler.toml`.** El que hay escrito
      ahora es de la cuenta de Manu: si se despliega sin cambiarlo, el Worker
      arranca pero la newsletter y el carrito fallan sin decir por qué.
- [ ] Cargar el esquema: `npx wrangler d1 execute shop --remote --file=schema-tatara.sql`
- [ ] **Exportar lo que ya se haya acumulado** (altas de newsletter, mensajes de
      contacto, pedidos) y meterlo en la base nueva:
      `npx wrangler d1 export shop --remote --output=backup.sql`, filtrar las
      tablas `tatara_*` e importarlas. Si se salta este paso, se pierden las
      suscripciones a la newsletter.
- [ ] Decidir si al separarse se quita el prefijo `tatara_` de las tablas. Si se
      quita, hay que tocar `src/index.js` y `schema-tatara.sql`; si se deja, no
      hay que tocar nada y el prefijo solo queda como una rareza histórica.
- [ ] **Backups.** Hoy la copia semanal la hace el repo de quienNoCorre, que
      cubre las dos bases por estar en la misma. Al separarse, TAT ARA se queda
      **sin backup**: hay que añadir su propio workflow (plantilla en
      semillaEcommerce, `.github/workflows/backup-d1.yml`, más un secret
      `CLOUDFLARE_API_TOKEN` de su cuenta).

## 3. Secretos

Los tres se ponen por terminal, nunca en `wrangler.toml`. Los actuales son de la
cuenta de Manu y **no viajan solos**: hay que volver a ponerlos en la cuenta
nueva.

- [ ] `npx wrangler secret put STRIPE_SECRET_KEY`
- [ ] `npx wrangler secret put STRIPE_WEBHOOK_SECRET`
- [ ] `npx wrangler secret put ADMIN_TOKEN` — y **dárselo a la clienta**, que es
      lo que abre `/admin/`. Sin él no puede ni contar stock ni ver pedidos.

## 4. Stripe

- [ ] Cuenta de Stripe **a nombre de la asociación**, con su banco. Es donde
      llega el dinero de las ventas: este punto no admite atajos.
- [ ] Claves nuevas en los secretos de arriba.
- [ ] **Rehacer el webhook** apuntando al dominio nuevo:
      `https://tatara.cat/api/stripe-webhook`, evento
      `checkout.session.completed`. El webhook viejo apunta al `.workers.dev` y
      dejará de servir. Sin webhook los pagos se cobran pero **el stock no baja
      y el pedido no se registra**.
- [ ] Compra de prueba en modo test (`4242 4242 4242 4242`) → comprobar que el
      pedido aparece en `/admin/tickets.html` → recién entonces, claves live.

## 5. GitHub

- [ ] Decidir entre transferir el repo (`Settings → Danger Zone → Transfer`) o
      hacer un fork a la cuenta de la asociación. Ver el aviso de
      TODO_DOMINIO.md, paso 2.
- [ ] Si se transfiere: **reconectar Workers Builds**, que se rompe con la
      transferencia.
- [ ] Decidir si Manu conserva acceso. Si la clienta va a seguir pidiendo
      cambios, hace falta.

## 6. Correo

- [ ] Los avisos por email **todavía no están puestos** (ver NEXT_STEPS.md,
      punto 2bis): tal como está, nadie se entera de que ha entrado un pedido o
      un mensaje de contacto salvo que alguien mire `/admin/`. Portarlos
      necesita el dominio propio, así que es trabajo del traspaso.
- [ ] Decidir el destinatario: `associaciotatara@gmail.com`, Manu, o los dos
      durante el rodaje.
- [ ] Remitente `noreply@tatara.cat`, dando de alta el dominio en Email Sending.
- [ ] ⚠️ Al darlo de alta se añaden **SPF y DKIM**. Si `tatara.cat` ya tiene SPF,
      hay que **fusionarlos**, no sustituirlos. Y no confundir Email **Sending**
      con Email **Routing**: Routing añade registros **MX** y rompería el correo
      entrante de la asociación.

## 7. Contenido y datos que hay que revisar

- [ ] **Datos de contacto** en `data/data.json`: email, dirección, redes. Que
      sean los de la asociación y no los de pruebas.
- [ ] **Precios y stock.** Los precios ya están puestos desde el documento de
      septiembre, pero **el stock nace a 0 y sin stock nada es comprable**: hay
      que contar ejemplares en `/admin/stock.html`.
- [ ] **Envíos.** `data/envios.json` está vacío (`[]`), que significa "solo
      recogida en galería": no se pide dirección ni se cobra envío. Si van a
      enviar, hay que rellenar las zonas.
- [ ] **Página legal** (aviso legal, privacidad, desistimiento). No existe, y con
      una tienda con cobro real es obligatoria. Plantilla en semillaEcommerce.
- [ ] `npm run check` en verde antes de entregar.

## 8. Seguridad — hacer esto sí o sí

- [ ] **Cambiar la contraseña SFTP de Pangea.** Se compartió por WhatsApp y
      además está escrita en claro dentro de `web tatara-TEXT-SETEMBRE.docx`, en
      el Drive. Cambiarla y borrarla del documento.
- [ ] Revisar que en el repo no queda ningún secreto. Hoy no lo hay: todos van
      por `wrangler secret` y `.dev.vars` está en `.gitignore`.
- [ ] Rotar el `ADMIN_TOKEN` si se ha compartido por chat en algún momento.

## 9. Qué le hay que enseñar a la clienta

No es una tarea técnica, pero sin esto el traspaso no está terminado:

- [ ] Cómo actualizar el contenido (la guía irá en el README).
- [ ] Cómo entrar en `/admin/`, contar stock y marcar pedidos como enviados.
- [ ] Qué pasa si edita mal un JSON, y que `npm run check` se lo dice antes de
      subirlo.
- [ ] A quién llamar cuando algo se rompa.

---

## Qué se rompe si se olvida cada cosa

Un resumen para priorizar, porque no todo pesa igual:

| Se olvida | Qué pasa |
|---|---|
| `database_id` en `wrangler.toml` | La web carga, pero newsletter y carrito fallan en silencio |
| Exportar la D1 | Se pierden las suscripciones a la newsletter y el historial |
| Webhook de Stripe | Se cobra, pero el stock no baja y el pedido no se registra |
| Backup de la D1 | Nadie lo nota hasta que hace falta |
| Reconectar Workers Builds | Cada cambio de contenido pasa a exigir terminal |
| Contraseña SFTP | Sigue circulando por WhatsApp y por el Drive |
