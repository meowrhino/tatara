# TAT ARA — web

Web de **TAT ARA**, espai galeria d'art, disseny i ecologia (Barcelona).
Vanilla HTML/CSS/JS, sense dependències de build. Mobile-first, trilingüe (CAT/CAST/ENG).

## Estructura

```
index.html          Shell de la pàgina (#view + barra inferior + menú overlay + modal)
css/styles.css       Estils (minimal, monospace, color només a l'agenda)
js/app.js            Router per hash + renderitzat de cada secció
fonts/                SuperstudioTrialTT (Regular/Bold) — wordmark i títols
data/data.json        Config general: paleta, idiomes, contacte, índex de seccions
data/events.json      Agenda (exposicions amb O.R. anidats)
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
`render*()` nou a `js/app.js`.

**Agenda**: mostra tota la temporada (no una finestra de N dies). Cada exposició
és un bloc de color top-level; els O.R. (Open Research: conversa/lectura/sessió/
taller) que cauen dins del seu rang de dates van **anidats** dins del mateix bloc
(`children[]` a `events.json`), cadascun amb el seu propi botó que obre el seu
modal. El que no cau dins de cap exposició queda com a bloc independent. L'alçada
de cada bloc és `max(minEventVh, dies·dayVh)` però creix amb el contingut real
(imatge + fills) — `dayVh` (a `data.json` → `agenda`) és només un terra, no el
factor principal.

## Pendent

- **Links** de cada artista a la seva web (cap encara).
- **Preus** de la botiga (només "Fricción" confirmat) + decisió/compte de **Stripe**.
- **Traduccions** CAST/ENG (estructura i18n llesta, contingut només en català).
- **Instagram** per a contacte.
- Data de l'esdeveniment d'Arnau Sala Saez (Catàleg de Fulles) — sense agenda fins que arribi.
- Confirmar amb la clienta si HOLON, Alicia Monreal i el col·lectiu Alba Yruela
  (del pòster antic `Recurso 2.png`) segueixen vigents.
- Doodles a mà definitius (de moment SVG aproximats meus).
