#!/usr/bin/env node
/* tools/prerender.mjs — una página ya pintada por dirección.
 *
 * La web la pinta el JS, y para Google o para la vista previa de WhatsApp eso
 * es una página vacía con el título de la portada. Esto abre cada dirección en
 * un Chrome sin ventana, con la web de verdad (el mismo JS: no hay una segunda
 * plantilla que mantener), y guarda lo que ha pintado en dist/<dirección>/index.html
 * con su título, descripción, canonical y og:image. Al cargar, el JS vuelve a
 * pintar encima lo mismo. Escribe también dist/sitemap.xml y, para cada página
 * con foto, su imagen para compartir (dist/og/<dirección>.jpg, 1200×630: TAT
 * arriba, ARA abajo, el título y la foto), porque las redes no siempre
 * enseñan un .webp.
 *
 * Las direcciones salen de seguir los enlaces desde la portada, así que una
 * exposición nueva en el JSON tiene su página sin tocar nada aquí.
 *
 *   node tools/prerender.mjs dist     (lo llama tools/build-pangea.sh)
 *
 * Necesita Node 22+ (WebSocket), php (el servidor local) y Chrome, Chromium o
 * Brave (o CHROME=ruta). El navegador se maneja por el protocolo de DevTools y
 * no con --dump-dom, que en Brave se cuelga. Sin navegador, en local avisa y
 * sigue (la web funciona igual: .htaccess sirve el index.html de la raíz); en
 * GitHub Actions, para.
 */
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const DIST = process.argv[2] || 'dist';
const SITE_URL = 'https://tatara.cat';
const PORT = 8790;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const CDP = 'http://127.0.0.1:9339';   // el navegador, por el protocolo de DevTools
const CI = process.env.CI === 'true';
const NO_ES_SECCION = /^\/(api|admin|assets|data|fonts|css|js)\//;

const chrome = [
  process.env.CHROME,
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
].find((p) => p && existsSync(p));
if (!chrome) {
  console.log('✗ pre-render: no encuentro Chrome, Chromium ni Brave (o CHROME=ruta).');
  if (CI) process.exit(1);
  console.log('  Sigo sin él: la web funciona igual, pero sin una página por dirección.');
  process.exit(0);
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const unesc = (s) => s.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

// Las primeras ~155 letras del texto de la página, cortadas en una palabra.
function resumen(html) {
  const txt = unesc(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').replace(/ ([,.;:])/g, '$1').trim();
  if (txt.length <= 155) return txt;
  return txt.slice(0, 155).replace(/\s+\S*$/, '') + '…';
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const perfil = mkdtempSync(join(tmpdir(), 'tatara-prerender-'));

// Una sola pestaña, que va de dirección en dirección. Con «reducir movimiento»
// no hay bienvenida: la página está lista en cuanto el router la ha pintado
// (ya no queda el "carregant…" del HTML).
let cmd;
async function abrirPestana() {
  const tab = (await (await fetch(`${CDP}/json/list`)).json()).find((t) => t.type === 'page');
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r, e) => { ws.onopen = r; ws.onerror = e; });
  let id = 0;
  const pend = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
  cmd = (method, params = {}) => new Promise((r) => { pend.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
  await cmd('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  return ws;
}
const evaluar = async (expression) => (await cmd('Runtime.evaluate', { expression, returnByValue: true })).result?.result?.value;

async function pintar(path) {
  await cmd('Page.navigate', { url: ORIGIN + path });
  for (let t = 0; ; t += 100) {
    await sleep(100);
    const listo = await evaluar(`document.readyState === 'complete' && location.pathname === ${JSON.stringify(path)}
      && !!document.querySelector('#view')?.dataset.section && !document.querySelector('#view > p.loading')`);
    if (listo) break;
    if (t > 15000) throw new Error(`${path}: no ha pintado nada en 15 s`);
  }
  const html = await evaluar('document.documentElement.outerHTML');
  const title = (html.match(/<title>([\s\S]*?)<\/title>/) || [])[1];
  const view = (html.match(/<main id="view"[^>]*>([\s\S]*?)<\/main>/) || [])[1];
  const menu = (html.match(/<ul class="menu__list" id="menu-list">([\s\S]*?)<\/ul>/) || [])[1] || '';
  const links = [...html.matchAll(/href="(\/[^"#?]*)/g)].map((m) => m[1]);
  return { title: unesc(title), view, menu, links };
}

// La imagen para compartir de una página: se escribe un documento de 1200×630
// en la misma pestaña (con las fuentes de la web) y se fotografía en JPEG.
async function tarjeta(titulo, foto, destino) {
  const doc = `<!doctype html><meta charset="utf-8"><style>
    @font-face { font-family: S; src: url("/fonts/SuperstudioTrialTT-Bold.ttf"); }
    @font-face { font-family: M; src: url("/fonts/JetBrainsMono-latin-400.woff2"); }
    html, body { margin: 0; width: 1200px; height: 630px; background: #fff; color: #111; overflow: hidden; }
    body { display: grid; grid-template-columns: 1fr 1fr; }
    .l { display: flex; flex-direction: column; justify-content: space-between; padding: 48px; }
    .b { font: 700 104px/1 S; display: flex; justify-content: space-between; }
    .t { font: 26px/1.4 M; text-transform: uppercase; }
    img { width: 600px; height: 630px; object-fit: cover; display: block; }
  </style><div class="l"><div class="b"><span>T</span><span>A</span><span>T</span></div>
  <div class="t">${esc(titulo)}</div><div class="b"><span>A</span><span>R</span><span>A</span></div></div>
  <img src="/${esc(foto)}">`;
  await evaluar(`document.open(); document.write(${JSON.stringify(doc)}); document.close()`);
  await cmd('Runtime.evaluate', { expression: `Promise.all([document.fonts.ready, document.images[0].decode()])`, awaitPromise: true });
  const shot = await cmd('Page.captureScreenshot', { format: 'jpeg', quality: 82, clip: { x: 0, y: 0, width: 1200, height: 630, scale: 1 } });
  writeFileSync(destino, Buffer.from(shot.result.data, 'base64'));
}

// ---- servidor local con la web de dist/ ------------------------------------
const server = spawn('php', ['-S', `127.0.0.1:${PORT}`, '-t', DIST, 'tools/php-router.php'], { stdio: 'ignore' });
const browser = spawn(chrome, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
  ...(CI ? ['--no-sandbox'] : []),
  `--user-data-dir=${perfil}`, '--remote-debugging-port=9339', '--window-size=1440,900', 'about:blank',
], { stdio: 'ignore' });
const salir = (code) => {
  server.kill(); browser.kill();
  setTimeout(() => { rmSync(perfil, { recursive: true, force: true }); process.exit(code); }, 300);
};
for (let i = 0; ; i++) {
  try { if ((await fetch(ORIGIN + '/')).ok && (await fetch(`${CDP}/json/version`)).ok) break; } catch { /* aún arrancando */ }
  if (i > 60) { console.log('✗ pre-render: no arrancan php o el navegador'); salir(1); }
  await sleep(200);
}

try {
  const template = readFileSync(join(DIST, 'index.html'), 'utf8');
  const ocultas = new Set(JSON.parse(readFileSync(join(DIST, 'data/menu.json'), 'utf8'))
    .sections.filter((s) => s.hidden).map((s) => s.id));
  const esPagina = (p) => !NO_ES_SECCION.test(p) && !/\.\w+$/.test(p) && !ocultas.has(p.split('/')[1]);

  // ---- seguir los enlaces desde la portada -------------------------------
  const ws = await abrirPestana();
  const paginas = new Map();
  const cola = ['/'];
  const vistas = new Set(cola);
  while (cola.length) {
    const path = cola.shift();
    const pintada = await pintar(path);
    paginas.set(path, pintada);
    for (const l of pintada.links) {
      const p = l.endsWith('/') ? l : l + '/';
      if (esPagina(p) && !vistas.has(p)) { vistas.add(p); cola.push(p); }
    }
  }

  // ---- imágenes para compartir ---------------------------------------------
  // Solo fotos de obra o de producto (las ampliables y las de la botiga), nunca
  // un logo. La portada se queda con og-tatara.jpg, hecha a mano.
  await cmd('Emulation.setDeviceMetricsOverride', { width: 1200, height: 630, deviceScaleFactor: 1, mobile: false });
  await cmd('Page.navigate', { url: ORIGIN + '/' });
  await sleep(300);
  mkdirSync(join(DIST, 'og'), { recursive: true });
  for (const [path, pagina] of paginas) {
    const foto = (pagina.view.match(/data-zoom="(assets\/[^"]+)"/) || pagina.view.match(/class="product__img" src="(assets\/[^"]+)"/) || [])[1];
    if (path === '/' || !foto) continue;
    pagina.og = `og/${path.split('/').filter(Boolean).join('-')}.jpg`;
    await tarjeta(pagina.title.replace(/^TAT ARA — | — TAT ARA$/g, ''), foto, join(DIST, pagina.og));
  }
  ws.close();

  // ---- escribir cada página -----------------------------------------------
  for (const [path, { title, view, menu, og }] of paginas) {
    let html = template
      .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
      .replace(/(<link rel="canonical" href=")[^"]*/, `$1${SITE_URL}${path}`)
      .replace(/(<meta property="og:url" content=")[^"]*/, `$1${SITE_URL}${path}`)
      .replace(/(<main id="view"[^>]*>)[\s\S]*?(<\/main>)/, (_, a, b) => `${a}${view}${b}`)
      // el menú también, para que los enlaces a las secciones estén sin JS
      .replace(/(<ul class="menu__list" id="menu-list">)[\s\S]*?(<\/ul>)/, (_, a, b) => `${a}${menu}${b}`);
    if (path !== '/') {
      // La portada conserva la descripción y la imagen escritas a mano.
      const desc = esc(resumen(view));
      html = html
        .replace(/(<meta name="description" content=")[^"]*/, `$1${desc}`)
        .replace(/(<meta property="og:title" content=")[^"]*/, `$1${esc(title)}`)
        .replace(/(<meta property="og:description" content=")[^"]*/, `$1${desc}`);
      if (og) {
        html = html
          .replace(/(<meta property="og:image" content=")[^"]*/, `$1${SITE_URL}/${og}`)
          .replace(/(<meta property="og:image:alt" content=")[^"]*/, `$1${esc(title)}`);
      }
    }
    const dir = join(DIST, path);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.html'), html);
  }

  const urls = [...paginas.keys()].map((p) => `  <url><loc>${SITE_URL}${p}</loc></url>`).join('\n');
  writeFileSync(join(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Lo genera tools/prerender.mjs al publicar. -->\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);

  console.log(`✓ pre-render: ${paginas.size} páginas`);
  for (const [path, { title }] of paginas) console.log(`  ${path}  ${title}`);
  salir(0);
} catch (err) {
  console.log(`✗ pre-render: ${err.message}`);
  salir(1);
}
