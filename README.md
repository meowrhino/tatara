# TAT ARA — web

Web de **TAT ARA**, espai galeria d'art, disseny i ecologia (Barcelona).
HTML/CSS/JS a pèl, sense build. Mobile-first, trilingüe (CAT/CAST/ENG).
El backend (newsletter, carret, stock) està escrit en PHP i corre a
l'allotjament de **Pangea**, on també hi ha el domini — veure
[DEPLOY_PANGEA.md](DEPLOY_PANGEA.md).

---

# Com actualitzar la web

## La regla

**Tot el contingut viu a `data/`, en fitxers `.json`.** Per canviar un text, una
data, un preu o una foto no cal tocar codi: s'edita el JSON, es puja per SFTP al
servidor, i al recarregar la web ja hi és.

L'única excepció és l'**stock** de la botiga, que es porta des de `/admin/`
perquè ha de baixar tot sol amb cada venda.

## Quin fitxer toco

| Vull canviar… | Fitxer |
|---|---|
| L'agenda: exposicions, converses, tallers | `data/agenda.json` |
| El text de "nosaltres" | `data/nosaltres.json` |
| Les fitxes de les exposicions (text, fotos, bio, full de sala) | `data/exposicions.json` |
| El text i les fotos de recerca | `data/recerca.json` |
| Els productes de la botiga: títol, preu, foto | `data/botiga.json` |
| L'adreça, el correu, els enllaços del peu, els colors | `data/data.json` |
| Els noms del menú | `data/menu.json` |
| Les zones i preus d'enviament | `data/envios.json` |
| **Quantes unitats queden** de cada peça | `/admin/stock.html` |

Cada fitxer comença amb un `_comment` que explica què admet cada camp. És la
documentació més fiable, perquè viu al costat de les dades.

## Com es publica

La web viu en un allotjament de **Pangea**. Publicar vol dir **copiar el fitxer
al servidor**. No cal ni GitHub ni terminal: només un programa per copiar
fitxers a distància.

### Un sol cop: instal·lar Cyberduck

[Cyberduck](https://cyberduck.io) és gratuït i és el que farem servir. Funciona
com el Finder: a l'esquerra el teu ordinador, a la dreta el servidor, i
s'arrosseguen fitxers d'un costat a l'altre.

1. Descarregar-lo de [cyberduck.io](https://cyberduck.io) i arrossegar-lo a
   *Aplicacions*. (A la seva web demana una donació; el programa funciona igual
   sense pagar.)
2. Obrir-lo → **Nova connexió**.
3. A dalt de tot, al desplegable, triar **SFTP (SSH File Transfer Protocol)**.
   Això és important: si es queda en *FTP* no connecta.
4. Omplir:

   ```
   Servidor:    web-12.pangea.org
   Port:        22
   Usuari:      tatara-web
   Contrasenya: (la del gestor de contrasenyes)
   ```

5. Marcar **Afegeix al clauer** i **Connecta**.
6. Un cop dins: menú **Marcadors → Nou marcador**. A partir d'ara s'entra amb
   dos clics i sense escriure res.

### Cada cop que es vol canviar alguna cosa

Al connectar s'obre directament la carpeta de la web. A dins hi ha `data/`
(el contingut), `assets/` (les fotos), `admin/` i algun fitxer més.

**Per canviar un text, una data o un preu:**

1. **Baixa't el JSON que vols tocar**: arrossega'l del servidor a l'escriptori.
   Aquesta còpia és la xarxa de seguretat — no la esborris fins que tot vagi bé.
2. **Fes-ne una segona còpia** i guarda-la en una altra carpeta, per si de cas.
3. Obre la primera amb un editor de text i canvia el que calgui. A macOS, amb
   clic dret → *Obre amb* → **TextEdit**. (Millor encara:
   [Visual Studio Code](https://code.visualstudio.com), gratuït, que avisa dels
   errors de format mentre escrius.)
4. Guarda, i arrossega el fitxer de l'escriptori a la carpeta `data/` del
   servidor. Pregunta si vols substituir: sí.
5. Recarrega `https://tatara.cat` i mira que es vegi bé.

**Per canviar o afegir una foto:**

1. Posa-li un nom sense accents, sense espais i sense majúscules:
   `exposicio-nova-1.webp`.
2. Puja-la a la carpeta d'`assets/img/` que toqui (`agenda/`, `expos/`,
   `recerca/`, `edicions/`).
3. Escriu aquest nom al JSON de la secció, com al pas de dalt.

> ### Si alguna cosa surt en blanc
>
> Vol dir que el JSON té un error de format: quasi sempre una coma de més, una
> de menys, o unes cometes sense tancar. **No passa res i no s'ha trencat res
> de manera permanent**: torna a pujar la còpia del pas 1 i la web torna a
> estar com estava. Després ja es mira amb calma què havia passat.

## Abans de pujar, si tens el projecte al Mac

```bash
npm run check
```

Llegeix tots els JSON i diu què està trencat: una coma que falta, una foto amb el
nom mal escrit, una data que no existeix, un esdeveniment que cau fora del seu
rang. Si diu `✓ todo correcto`, es pot pujar tranquil·lament.

**Els errors (`✗`) trenquen alguna cosa. Els avisos (`·`) són per mirar.**

## Els tres idiomes

Qualsevol text es pot escriure de dues maneres:

```json
"title": "No Limits"
"title": { "ca": "Bossa Nº1", "es": "Bolso Nº1", "en": "Bag Nº1" }
```

La primera és per al que no es tradueix (noms propis, títols d'obra). La segona,
per a tota la resta. Si falta un idioma, la web ensenya el català.

## Afegir una exposició a l'agenda

Es copia un bloc existent de `data/agenda.json` i es canvien els camps. **L'ordre
dins del fitxer és igual**: la web ordena per `start`.

```json
{
  "slug": "nom-curt-sense-accents",
  "kind": { "ca": "Exposició", "es": "Exposición", "en": "Exhibition" },
  "title": { "ca": "Títol", "es": "Título", "en": "Title" },
  "artist": "Nom de l'artista",
  "start": "2027-03-01",
  "end": "2027-04-15",
  "description": { "ca": "…", "es": "…", "en": "…" }
}
```

- `slug` — un nom curt i únic, sense accents ni espais. No es veu enlloc.
- `kind` — el tipus (exposició, conversa, taller…). Surt a baix a la dreta.
- `image` — opcional, una sola. Una foto de l'obra, **mai el cartell**: el cartell
  repeteix el que ja diu el text. Va a `assets/img/agenda/`.
- `start` / `end` — sempre `AAAA-MM-DD`. Sense `end`, és d'un sol dia.
- `time` — opcional, `"18:30"`.

## Afegir un esdeveniment dins d'una exposició

Una conversa, una lectura o un taller que passa **durant** una exposició va dins
del seu `eventos[]`, amb els mateixos camps:

```json
"eventos": [
  {
    "slug": "conversa-amb-algu",
    "kind": { "ca": "Conversa", "es": "Conversación", "en": "Conversation" },
    "title": { "ca": "…", "es": "…", "en": "…" },
    "artist": "Qui hi participa",
    "start": "2027-03-12",
    "time": "18:30",
    "description": { "ca": "…", "es": "…", "en": "…" }
  }
]
```

Si passa fora de qualsevol exposició, va com a entrada de primer nivell.
`npm run check` avisa si un esdeveniment queda fora del rang del seu bloc.

## Afegir una exposició a la secció Exposicions

A `data/exposicions.json`. Cada fitxa s'obre en clicar el nom:

```json
{
  "name": "Nom de l'artista",
  "expo": { "ca": "Títol de la mostra", "es": "…", "en": "…" },
  "date": { "start": "2027-03-01", "end": "2027-04-15" },
  "text": { "ca": "Text de l'exposició", "es": "…", "en": "…" },
  "images": ["assets/img/expos/nom-1.webp", "assets/img/expos/nom-2.webp"],
  "bio": { "ca": "Bio de l'artista", "es": "…", "en": "…" },
  "link": "https://laseva.web",
  "pdf": "assets/pdf/nom-full-de-sala.pdf"
}
```

`link` i `pdf` són opcionals (`"link": null` si no en té). Per deixar aire entre
grups, s'hi pot intercalar `{ "spacer": true }`.

## Afegir un producte a la botiga

A `data/botiga.json`:

```json
{
  "id": "nom-curt",
  "title": { "ca": "…", "es": "…", "en": "…" },
  "author": "Autora",
  "editorial": "Editorial",
  "price": 18,
  "images": ["assets/img/edicions/nom.webp"],
  "description": { "ca": "…", "es": "…", "en": "…" }
}
```

La fitxa es pinta sempre en aquest ordre: **títol — preu**, a sota l'**autor**
i a sota l'**editorial** (o qualsevol altra dada de context), en gris petit.

Dues coses importants:

- **`price: null` vol dir "pròximament"**: es veu però no es pot comprar. En
  posar-hi un número passa a ser comprable tot sol.
- **L'`id` no s'ha de canviar mai** un cop el producte ha existit: és la clau amb
  què la base de dades guarda l'stock i les comandes.

Després d'afegir-lo, cal anar a `/admin/stock.html` i posar-hi les unitats. Sense
unitats surt com a **exhaurit**.

## Fotos

Van totes a `assets/img/` i han de ser `.webp`. Per convertir una carpeta
sencera:

```bash
npm run webp "carpeta amb les fotos" assets/img/expos
```

Redimensiona el costat gran a 1600 px, gira les fotos de mòbil que venen
tombades, posa **fons blanc** a les que porten transparència (TIF, PNG i PDF
exportats sovint en porten) i també accepta PDF (els cartells exportats
d'InDesign). Escriu el nom en minúscules i amb guions.

Si una foto es veu **de costat**, és que venia sense l'etiqueta d'orientació: cal
girar-la a l'ordinador abans de convertir-la.

## Enllaços dins d'un text

A `nosaltres.json` i `recerca.json`, qualsevol paraula pot enllaçar a una altra
secció posant-la entre claudàtors:

```
"les trobareu a la [botiga](botiga)"
```

Entre parèntesis hi va l'`id` de la secció: `agenda`, `nosaltres`, `exposicions`,
`recerca`, `botiga`, `contacte`, `newsletter`. Si l'`id` no existeix, `npm run
check` ho diu i la paraula es queda com a text normal.

## Els errors més fàcils de cometre

| Passa això | És això |
|---|---|
| La web surt **en blanc** | Una coma de més o de menys. `npm run check` diu la línia |
| Hi ha un **buit gris** on hauria d'anar una foto | El nom del fitxer no coincideix. Compte amb accents i majúscules |
| Una data surt **canviada** | Un dia que no existeix (`2027-02-30`): es converteix sol, sense avisar |
| Un producte surt però diu **exhaurit** | Falta posar-hi unitats a `/admin/stock.html` |
| Un producte surt però diu **pròximament** | Li falta el `price` |

Cada entrada d'un JSON va separada per una coma **menys l'última**. És l'error
número u, i és el que deixa la web en blanc.

---

# Traspàs: comptes, contrasenyes i accessos

> Aquí no hi ha cap contrasenya escrita, i no n'hi ha d'haver mai. Aquest
> fitxer viu a GitHub. Les contrasenyes van al gestor de contrasenyes.

## On viu cada cosa

| | On | De qui és |
|---|---|---|
| El domini `tatara.cat` | Pangea | compte de sòcia de **L'Afluent SCCL** |
| L'allotjament i la base de dades | Pangea, servidor `web-12` | el mateix compte |
| El certificat HTTPS | el renova Pangea sol | — |
| El codi | [github.com/meowrhino/tatara](https://github.com/meowrhino/tatara) | compte de desenvolupament |
| Els cobraments | Stripe (pendent d'activar) | compte de TAT ARA |

## Les tres claus que fan falta

1. **SFTP** — per pujar la web i el contingut. Servidor `web-12.pangea.org`,
   usuari `tatara-web`. La contrasenya la dona Pangea.
2. **Token d'administració** — per entrar a `/admin/stock.html` i portar l'stock.
   És una cadena llarga generada a l'atzar.
3. **phpMyAdmin** — per mirar la base de dades. El mateix usuari que l'SFTP, amb
   una contrasenya pròpia que dona Pangea. *No cal per al dia a dia.*

Les tres s'entreguen pel gestor de contrasenyes, no per xat ni per correu.

## On viu el token d'administració (i com se'n fa un de nou)

**No és al repositori.** `api/config.php` està al `.gitignore` i no ha viatjat mai
a GitHub: existeix només **al servidor**, a `api/config.php` dins la carpeta de la
web. Clonar el repositori no el dona.

Si es perd, no hi ha res a migrar: s'entra per SFTP, s'obre `api/config.php`, es
canvia el valor de `admin_token` i ja està. Per generar-ne un:

```bash
openssl rand -hex 32
```

El mateix fitxer guarda la contrasenya de la base de dades i, el dia que hi hagi
cobraments, les claus de Stripe. **És l'únic fitxer del servidor amb secrets:**
si algun dia es canvia d'allotjament, és l'únic que s'ha de tornar a escriure.

## El dia a dia, qui fa què

| Tasca | Qui | Com |
|---|---|---|
| Canviar textos, dates, fotos, preus | TAT ARA | editar el JSON i pujar-lo per SFTP |
| Posar quantes unitats queden | TAT ARA | `/admin/stock.html` amb el token |
| Veure comandes, missatges i altes | TAT ARA | `/admin/tickets.html` amb el token |
| Tocar codi, afegir seccions | desenvolupament | GitHub |

TAT ARA **no necessita ni GitHub ni terminal** per res del dia a dia: només
Cyberduck i el navegador.

## Comprovacions que es poden fer en qualsevol moment

```bash
# La web i l'API responen?
curl -s https://tatara.cat/api/health

# Els fitxers que no s'han de veure, no es veuen? (han de dir 403)
curl -s -o /dev/null -w "%{http_code}\n" https://tatara.cat/schema-tatara.mysql.sql
curl -s -o /dev/null -w "%{http_code}\n" https://tatara.cat/api/lib/db.php
```

## Si algun dia es canvia d'allotjament

Tot el que fa falta és en aquest repositori: la web i el backend en PHP
([DEPLOY_PANGEA.md](DEPLOY_PANGEA.md)). El frontend crida `/api/...` en relatiu,
així que no depèn del domini ni de qui allotgi.

Hi va haver una versió del backend com a **Worker de Cloudflare**, descartada per
preferir un allotjament de proximitat. Es va treure del projecte perquè el repo
descrigui una sola realitat, però segueix sencera a la branca `opcion-cloudflare`.

---

# Per a qui toqui el codi

## Estructura

```
index.html            Shell (barres fixes + #view + menú + modal)
css/styles.css        Estils. Els colors surten de data.json, no d'aquí
js/                   Mòduls ES, sense build. Entrada: main.js
  main.js               Arrenca: carrega config, publica colors, cabla listeners
  state.js              Estat compartit (SITE, LANG)
  utils.js              $, el, esc, t (i18n), ui (textos d'interfície), richText
  data.js               loadJSON amb caché en memòria
  dates.js              Parseig i format de dates
  router.js             Navegació per hash + fundit entre vistes
  menu.js               Menú (columna fixa a escriptori, capa a mòbil) + idioma
  modal.js              Diàleg de detall (botiga) + lightbox
  agenda.js             Secció agenda
  sections.js           Render de text / exposicions / contact / newsletter
  botiga.js             Botiga, fitxa de producte i carret (pagament amb Stripe)
  cart.js               Carret a localStorage
api/                  Backend EN ÚS: /api/* en PHP (newsletter, stock, Stripe)
  index.php             Les rutes
  config.php            Credencials. NO és al repo: viu només al servidor
  lib/                  db (PDO) · catàleg · Stripe per REST · HTTP
admin/                Panell intern: stock i comandes
data/*.json           TOT el contingut. Cada fitxer es diu com la seva secció
assets/img/           Imatges .webp: expos/ · recerca/ · edicions/ · mr/ (i agenda/, si mai cal)
assets/pdf/           Fulls de sala de les exposicions
tools/                check-data.mjs · to-webp.sh · serve.py
```

> El material **font** (fotos originals, PDF, `.docx`) no és al repo: massa
> pesat. Viu al disc i convé tenir-ne una còpia a part.

## Desenvolupament

```bash
npm install
npm run check                          # revisa els JSON

# La versió que està publicada (PHP). Cal php: brew install php
php -S 127.0.0.1:8788 -t . tools/php-router.php
bash tools/test-api-php.sh             # 37 comprovacions de l'API

npm run dev                            # l'alternativa amb Worker de Cloudflare
```

Per mirar només la web, sense API, val qualsevol servidor estàtic
(`python3 tools/serve.py`).

## Com funciona

**Seccions i router.** L'índex viu a `data/menu.json`: `id`, `type`, `data` i
`label`. El menú i el router es construeixen des d'aquí, i cada secció és `#id`.
Afegir-ne una = una entrada a `menu.json` + el seu JSON + (només si el `type` és
nou) un `render*()` a `js/sections.js` i el seu `case` al switch de
`js/router.js`.

**Disseny.** Blanc i negre: el color només arriba amb les fotos. A escriptori,
quatre columnes iguals: el menú a la primera, el contingut a les dues del mig
(amb TAT a dalt i ARA a baix repartides al seu ample) i carret/idiomes a la
quarta. Un sol cos de lletra (`--fs`) i un sol interlineat (`--lh`) per a tota
la web; a escriptori el cos creix amb la columna per mantenir uns 72 caràcters
per línia. Sense negretes: els títols van en majúscula i el que es vol
destacar, subratllat. El disseny anterior (blocs de color) és a l'etiqueta
`v0-disseny-color` i a [meowrhino/tatarav0](https://github.com/meowrhino/tatarav0).

**Colors.** Surten de `data.json` → `theme`, que es publica com a custom
properties (`--bg`, `--ink`…); ho fa `setVars()` a `main.js`.

**Agenda.** Una llista vertical d'entrades, una per exposició, en ordre
cronològic i separades per un fil negre. Cada entrada: títol i dates, artista,
descripció, imatge (a l'esquerra), els esdeveniments anidats, i a baix la data
de tancament i el tipus (`kind`). En obrir l'agenda la vista arrenca al que
passa avui (`scrollAgendaToToday`).

**Caché.** No hi ha cap truc: ni `?v=`, ni `no-store`. Ho resol el `.htaccess`
de l'arrel: el contingut que canvia sovint (`.json`, `.html`, `.css`, `.js`) va
amb `no-cache, must-revalidate`, i les fotos i tipografies, que quan canvien
canvien de nom, amb una setmana de caché. Així, pujar un JSON per SFTP n'hi ha
prou perquè es vegi de seguida. **Si algun dia la web se serveix des d'un altre
lloc, aquestes capçaleres s'han de tornar a posar**, o el navegador ensenyarà
versions velles.

## Documentació

| | |
|---|---|
| [NEXT_STEPS.md](NEXT_STEPS.md)     | El que queda de l'encàrrec, en ordre |
| [TODO_CLIENTE.md](TODO_CLIENTE.md) | Tot el que cal fer i revisar el dia del traspàs |
| [DEPLOY_PANGEA.md](DEPLOY_PANGEA.md) | **Com està publicada avui**: Pangea, PHP i MariaDB |
| [TODO_CLIENTE.md](TODO_CLIENTE.md) | El dia del traspàs, pas a pas |
| [FUTURO.md](FUTURO.md)             | Idees plantejades i **no pressupostades** |

## Pendent

- **Enllaços** a la web de cada artista: n'hi ha nou de posats, en falten tretze.
- **Stock** de la botiga: neix a 0 i sense unitats res és comprable.
- Decisió i compte de **Stripe**, i **enviaments** (`data/envios.json` és buit).
- **Instagram** per al peu de contacte (`data.json` → `contact.links`).
- **Pàgina legal** (avís legal, privacitat, desistiment): obligatòria amb
  cobrament real.
- Confirmar si HOLON, Alicia Monreal i el col·lectiu d'Alba Yruela (del pòster
  antic `Recurso 2.png`) segueixen vigents.
- Doodles a mà definitius (de moment són SVG aproximats).
