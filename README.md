# TAT ARA — web

Web de **TAT ARA**, espai galeria d'art, disseny i ecologia (Barcelona).
HTML/CSS/JS a pèl, sense build. Mobile-first, trilingüe (CAT/CAST/ENG).
El backend (newsletter, carret, stock) és un Worker de Cloudflare — veure
[DEPLOY.md](DEPLOY.md).

---

# Com actualitzar la web

## La regla

**Tot el contingut viu a `data/`, en fitxers `.json`.** Per canviar un text, una
data, un preu o una foto no cal tocar codi: s'edita el JSON, es puja, i la web es
publica sola.

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

## Abans de pujar, sempre

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
  "color": "menta",
  "kind": { "ca": "Exposició", "es": "Exposición", "en": "Exhibition" },
  "title": { "ca": "Títol", "es": "Título", "en": "Title" },
  "artist": "Nom de l'artista",
  "image": "assets/img/agenda/24-cartell.webp",
  "start": "2027-03-01",
  "end": "2027-04-15",
  "description": { "ca": "…", "es": "…", "en": "…" }
}
```

- `slug` — un nom curt i únic, sense accents ni espais. No es veu enlloc.
- `color` — `blau`, `menta`, `rosa` o `mostassa` (surten de `data.json` →
  `palette`). Convé que no coincideixi amb el bloc de sobre ni el de sota.
- `start` / `end` — sempre `AAAA-MM-DD`. Sense `end`, és d'un sol dia.
- `time` — opcional, `"18:30"`.

## Afegir un esdeveniment dins d'una exposició

Una conversa, una lectura o un taller que passa **durant** una exposició va dins
del seu `eventos[]`, amb els mateixos camps però **sense `color`**:

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

Si passa fora de qualsevol exposició, va com a bloc de primer nivell, amb color.
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
npm run webp "carpeta amb les fotos" assets/img/agenda
```

Redimensiona el costat gran a 1600 px, gira les fotos de mòbil que venen
tombades i també accepta PDF (els cartells exportats d'InDesign). Escriu el nom
en minúscules i amb guions.

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

# Per a qui toqui el codi

## Estructura

```
index.html            Shell (barres fixes + #view + menú overlay + modal)
css/styles.css        Estils. Els colors surten de data.json, no d'aquí
js/                   Mòduls ES, sense build. Entrada: main.js
  main.js               Arrenca: carrega config, publica colors, cabla listeners
  state.js              Estat compartit (SITE, LANG)
  utils.js              $, el, esc, t (i18n), ui (textos d'interfície), richText
  data.js               loadJSON amb caché en memòria
  dates.js              Parseig i format de dates
  router.js             Navegació per hash + fundit entre vistes
  menu.js               Menú overlay + canvi d'idioma
  modal.js              Diàleg de detall + lightbox
  agenda.js             Secció agenda
  sections.js           Render de text / people / shop / contact / newsletter / cart
  cart.js               Carret a localStorage
src/index.js          Worker de Cloudflare: /api/* (newsletter, stock, Stripe)
admin/                Panell intern: stock i comandes
data/*.json           TOT el contingut. Cada fitxer es diu com la seva secció
assets/img/           Imatges .webp: agenda/ · expos/ · recerca/ · edicions/ · mr/
assets/pdf/           Fulls de sala de les exposicions
tools/                check-data.mjs · to-webp.sh · serve.py
```

> El material **font** (fotos originals, PDF, `.docx`) no és al repo: massa
> pesat. Viu al disc i convé tenir-ne una còpia a part.

## Desenvolupament

```bash
npm install
npm run dev        # Worker + web (l'API funciona)
npm run check      # revisa els JSON
```

Per mirar només la web, sense API, val qualsevol servidor estàtic
(`python3 tools/serve.py`).

## Com funciona

**Seccions i router.** L'índex viu a `data/menu.json`: `id`, `type`, `data` i
`label`. El menú i el router es construeixen des d'aquí, i cada secció és `#id`.
Afegir-ne una = una entrada a `menu.json` + el seu JSON + (només si el `type` és
nou) un `render*()` a `js/sections.js` i el seu `case` al switch de
`js/router.js`.

**Colors.** Tots surten de `data.json`. `theme` es publica com a custom
properties (`--ink`, `--grey-soft`…) i `palette` com `--color-blau` i companyia;
ho fa `setVars()` a `main.js`. El CSS no té cap color escrit a mà.

**Agenda.** Una tira vertical de blocs de color, un per exposició, en ordre
cronològic. Cada bloc **mesura pel seu contingut** (títol + imatge + descripció +
esdeveniments anidats), amb un terra mínim (`minEventVh`, a `data.json`) perquè
un esdeveniment curt no quedi com una tira fina. Els blocs van enganxats: el
canvi de color és el que separa una exposició de la següent.

Cada bloc porta a baix a la dreta un marcador d'estat (`passat` / `ara` /
`proximament`) calculat per data, i en obrir l'agenda la vista arrenca al costat
del que passa avui (`scrollAgendaToToday`).

**Caché.** No hi ha cap truc: ni `?v=`, ni `no-store`. Cloudflare serveix tot amb
`max-age=0, must-revalidate` i un ETag del contingut, així que el navegador
revalida a cada visita i es porta el fitxer nou quan canvia. Editar un JSON i fer
push n'hi ha prou. Això ho garanteix Cloudflare: si algun dia la web se serveix
des d'un altre lloc, caldrà tornar a posar el versionat a mà.

## Documentació

| | |
|---|---|
| [NEXT_STEPS.md](NEXT_STEPS.md)     | El que queda de l'encàrrec, en ordre |
| [TODO_CLIENTE.md](TODO_CLIENTE.md) | Tot el que cal fer i revisar el dia del traspàs |
| [TODO_DOMINIO.md](TODO_DOMINIO.md) | Apuntar `tatara.cat` a Cloudflare |
| [DEPLOY.md](DEPLOY.md)             | Arquitectura, API i panell d'admin |
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
