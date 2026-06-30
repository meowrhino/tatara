# TAT ARA — web

Web de **TAT ARA**, espai galeria d'art, disseny i ecologia (Barcelona).
Vanilla HTML/CSS/JS, sense dependències de build. Mobile-first, trilingüe (CAT/CAST/ENG).

## Estructura

```
index.html          Shell de la pàgina (#view + barra inferior + menú overlay + modal)
css/styles.css       Estils (minimal, monospace, color només a l'agenda)
js/                   Mòduls ES (sense build). Entrada: main.js
  main.js              Arranc: carrega config, cabla listeners globals
  state.js             Estat compartit (SITE, LANG) + CONFIG_URL
  utils.js             Helpers: DOM ($, el), escapat, wordmark, i18n (t)
  data.js              loadJSON amb caché
  dates.js             Parseig i format de dates de l'agenda
  agenda.js            Secció agenda (timeline, O.R., recol·locació, lightbox)
  sections.js          Render de text/people/journal/shop/contact/cart
  modal.js             Diàleg de detall (botiga)
  menu.js              Menú overlay + canvi d'idioma
  router.js            Navegació per hash + fundit entre vistes
fonts/                SuperstudioTrialTT (Regular/Bold) — wordmark i títols
data/data.json        Config general: paleta, idiomes, contacte, índex de seccions
data/agenda.json      Agenda (exposicions amb O.R. anidats)
data/nosaltres.json   Text de la secció "nosaltres"
data/persones.json    Artistes/dissenyadores/pensadores (bio + link)
data/diari.json       Articles del journal
data/edicions.json    Catàleg de la botiga
assets/img/           Imatges optimitzades (.webp): agenda/ · edicions/ · mr/
assets/icons/         Favicon
tools/                Scripts: to-webp.sh, serve.py
```

> El material **font** (fotos originals, PDFs, `.pages`, mockups de `referencias/`)
> no està al repo (massa pesat). Viu al disc local i s'hauria de tenir un backup a part.
> Les imatges del repo són totes `.webp` (originals → `tools/to-webp.sh`).

## Desenvolupament

```bash
python3 -m http.server 8765     # i obre http://localhost:8765
```

## Com funciona

**Router**: cada secció viu a `#id` (`#agenda`, `#nosaltres`, `#artistes`, `#diari`,
`#botiga`, `#contacte`, `#carret`). L'índex de seccions és `data/data.json` →
`sections[]` (id, type, data, label) — el menú es construeix des d'aquí. Afegir
una secció nova = afegir una entrada a `sections[]` + el seu JSON + (si cal) un
`render*()` nou a `js/sections.js` i el seu `case` al switch de `js/router.js`.

**Agenda**: mostra tota la temporada (no una finestra de N dies). Cada exposició
és un bloc de color top-level; els O.R. (Open Research: conversa/lectura/sessió/
taller) que cauen dins del seu rang de dates van **anidats** dins del mateix bloc
(`children[]` a `agenda.json`), cadascun ubicat al seu dia exacte dins del bloc,
amb la seva descripció inline visible sota el títol/imatge. El que no cau dins de
cap exposició queda com a bloc independent.

El layout és **en flux** (sense `position:absolute`): cada dia val `--day`
(= `dayVh` dvh, a `data.json` → `agenda`). El bloc té `min-height` proporcional
a la seva durada; dins, la regió `.seg__days` posa cada O.R. amb un `min-height`
en `var(--day)` igual als dies que el separen del següent. Si el contingut d'un
O.R. excedeix el seu mínim, empeny el següent cap avall (estirar per cabre) i el
darrer reserva 1 dia de marge final. Conseqüència: el solapament és impossible,
el creixement és automàtic i el resize el resol el CSS sol — no hi ha relayout
d'O.R. en JS. L'únic que es mesura és la marca **"avui"** (`placeTodayMark` a
`js/agenda.js`), que viu fora del color i es reubica en carregar imatges i en
redimensionar.

## Pendent

- **Links** de cada artista a la seva web (cap encara).
- **Preus** de la botiga (només "Fricción" confirmat) + decisió/compte de **Stripe**.
- **Traduccions** CAST/ENG (estructura i18n llesta, contingut només en català).
- **Instagram** per a contacte.
- Data de l'esdeveniment d'Arnau Sala Saez (Catàleg de Fulles) — sense agenda fins que arribi.
- Confirmar amb la clienta si HOLON, Alicia Monreal i el col·lectiu Alba Yruela
  (del pòster antic `Recurso 2.png`) segueixen vigents.
- Doodles a mà definitius (de moment SVG aproximats meus).
