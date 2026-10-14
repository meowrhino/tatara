# Guia — com actualitzar la web de TAT ARA

Aquesta guia és per canviar la web vosaltres mateixes: l'agenda, les
exposicions, els textos, la botiga… Tot es fa amb **Visual Studio Code**, un
programa gratuït: canvieu els fitxers a l'ordinador i, en guardar-los, pugen a
GitHub i es publiquen sols.

> **La regla d'or**: només toqueu **dues carpetes**: `data/` (els textos, les
> dates i els preus) i `assets/` (les fotos i els PDF). La resta és el codi:
> millor no tocar-lo.
>
> L'única cosa que **no** es fa a GitHub són les **unitats de la botiga** i les
> comandes: van al panell `tatara.cat/admin/` (punt 6).

Quan guardeu un canvi, la web s'actualitza sola en **2 o 3 minuts**. Si us
equivoqueu en alguna cosa, la web **no es trenca**: es queda com estava fins que
ho arregleu (punt 7, *Si alguna cosa va malament*).

---

## 0. Abans de començar (només el primer cop)

1. Feu-vos un compte a [github.com](https://github.com) (millor una
   organització a nom de l'associació) i passeu-nos el nom d'usuari.
2. Us passem **una còpia de la web al vostre compte**: des d'aquell moment és
   vostra i viu a `https://github.com/EL-VOSTRE-USUARI/tatara`.
3. Instal·leu **Visual Studio Code**: https://code.visualstudio.com
4. Obriu-lo i porteu-hi la web: a l'esquerra, la icona de les branques
   (**Source Control**) → **Clone Repository** → **Clone from GitHub** → entreu
   amb el vostre compte → trieu `EL-VOSTRE-USUARI/tatara` → trieu una carpeta
   de l'ordinador → **Open**. Si us demana instal·lar Git, accepteu.

A partir d'aquí, la web és aquella carpeta: cada cop que obriu VS Code, s'obre
allà.

Per preparar les fotos, **imgToWeb**: https://meowrhino.github.io/imgToWeb/ (les
passa al format de la web, `.webp`, a la mida justa). **Obriu-lo amb Chrome o
Firefox**, no amb Safari: Safari no sap fer `.webp` i imgToWeb se salta les
fotos.

---

## 1. Com està organitzat

```
data/
  agenda.json          ← l'agenda: exposicions, converses, tallers
  exposicions.json     ← les fitxes de la secció Exposicions
  nosaltres.json       ← el text de Nosaltres
  recerca.json         ← el text i les fotos de Recerca
  botiga.json          ← els productes: títol, autor, preu, foto
  envios.json          ← les zones i preus d'enviament
  data.json            ← l'adreça, el correu, els enllaços de Contacte
  menu.json            ← els noms del menú
assets/
  img/agenda/          ← les fotos de l'agenda
  img/expos/           ← les fotos de les exposicions
  img/recerca/         ← les fotos de recerca
  img/edicions/        ← les fotos de la botiga
  pdf/                 ← els fulls de sala
```

Cada fitxer de `data/` comença amb un `_comment` que explica què admet cada
camp: és la documentació més fiable, perquè viu al costat de les dades.

---

## 2. Com es fa un canvi amb VS Code

1. **Abans de res, baixeu l'última versió**: a la barra de baix de tot, cliqueu
   les fletxes ⟳ (**Sync**). Així teniu el que hi ha publicat.
2. A la columna de l'esquerra, obriu el fitxer (per exemple `data/agenda.json`)
   i canvieu el que calgui. Guardeu amb **Cmd+S**.
   Si alguna cosa surt **subratllada en vermell**, hi ha una coma o unes
   cometes malament: arregleu-ho abans de seguir (punt 7).
3. A l'esquerra, la icona de les branques (**Source Control**): escriviu en una
   línia què heu canviat ("agenda: taller de novembre") i cliqueu **Commit**.
4. Cliqueu **Sync Changes** (el mateix botó blau).

Ja està: en 2-3 minuts surt a la web.

**Per afegir fotos o PDF**: arrossegueu els fitxers a la carpeta que toqui (per
exemple `assets/img/expos/`) a la columna de l'esquerra de VS Code, i després
els passos 3 i 4.

---

## 3. Els tres idiomes

Qualsevol text es pot escriure de dues maneres:

```json
"title": "No Limits"
"title": { "ca": "Bossa Nº1", "es": "Bolso Nº1", "en": "Bag Nº1" }
```

La primera és per al que no es tradueix (noms propis, títols d'obra). La segona,
per a tota la resta. Si falta un idioma, la web ensenya el català.

---

## 4. El que més fareu

### Afegir una exposició a l'agenda

A `data/agenda.json`, **copieu un bloc que ja hi sigui** (de `{` a `},`, amb la
coma) i canvieu-ne els camps. L'ordre dins del fitxer és igual: la web ordena
per data.

```json
{
  "slug": "nom-curt-sense-accents",
  "kind": { "ca": "Exposició", "es": "Exposición", "en": "Exhibition" },
  "title": { "ca": "Títol", "es": "Título", "en": "Title" },
  "artist": "Nom de l'artista",
  "image": "assets/img/agenda/nom-curt.webp",
  "start": "2027-03-01",
  "end": "2027-04-15",
  "description": { "ca": "…", "es": "…", "en": "…" }
},
```

| camp | què és | exemple |
|---|---|---|
| `slug` | un nom curt i únic, sense accents ni espais. No es veu enlloc | `"guus-vandeweerd"` |
| `kind` | el tipus. Surt a baix a la dreta | `{ "ca": "Conversa", … }` |
| `title` | el títol | `{ "ca": "Inventory", … }` |
| `artist` | *(opcional)* qui | `"Guus Vandeweerd"` |
| `image` | *(opcional)* una foto de l'obra, **mai el cartell** (repeteix el que ja diu el text). O dues, en una llista | `["assets/img/agenda/a.webp", "assets/img/agenda/b.webp"]` |
| `start` / `end` | sempre `AAAA-MM-DD`. Sense `end`, és d'un sol dia | `"2027-03-01"` |
| `time` | *(opcional)* l'hora | `"18:30"` |
| `description` | *(opcional)* el text | `{ "ca": "…", … }` |

### Afegir una conversa, una lectura o un taller dins d'una exposició

Si passa **durant** una exposició, va dins del seu `eventos`, amb els mateixos
camps. La data ha de caure dins de les de l'exposició:

```json
"eventos": [
  {
    "slug": "conversa-amb-algu",
    "kind": { "ca": "Conversa", "es": "Conversación", "en": "Conversation" },
    "title": { "ca": "…", "es": "…", "en": "…" },
    "artist": "Qui hi participa",
    "start": "2027-03-12",
    "time": "18:30"
  }
]
```

Si passa fora de qualsevol exposició, va com un bloc més de l'agenda.

### Afegir una fitxa a la secció Exposicions

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
},
```

- `link` i `pdf` són opcionals (`"link": null` si no en té).
- Per deixar aire entre grups, s'hi pot posar `{ "spacer": true },`.
- Cada fitxa té la seva adreça, que surt del `name`:
  `tatara.cat/exposicions/nom-de-l-artista/`. **Si canvieu el `name`, canvia
  l'adreça**, i l'antiga (si algú l'havia compartit) porta a la llista.

### Afegir un producte a la botiga

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
},
```

- **`"price": null` vol dir "pròximament"**: es veu però no es pot comprar. En
  posar-hi un número, passa a ser comprable tot sol.
- **L'`id` no es canvia mai** un cop el producte ha existit: és la clau amb què
  es guarden l'stock i les comandes.
- Després, al panell, poseu-hi les unitats (punt 6). Sense unitats surt com a
  **exhaurit**.

### Canviar un text de Nosaltres o de Recerca

A `data/nosaltres.json` o `data/recerca.json`. Qualsevol paraula pot enllaçar a
una altra secció posant-la entre claudàtors:

```
"les trobareu a la [botiga](botiga)"
```

Entre parèntesis hi va el nom de la secció: `agenda`, `nosaltres`,
`exposicions`, `recerca`, `botiga`, `contacte`, `newsletter`.

### Fotos

1. Passeu-les per imgToWeb.
2. Poseu-los un nom que s'entengui, sense accents, espais ni majúscules:
   `guus-vandeweerd-1.webp`.
3. Pugeu-les a la carpeta que toqui d'`assets/img/` (punt 2).
4. Escriviu aquest nom al JSON, amb la carpeta davant:
   `"assets/img/expos/guus-vandeweerd-1.webp"`.

Si una foto es veu **de costat**, gireu-la a l'ordinador abans de passar-la per
imgToWeb.

La imatge que surt en compartir un enllaç (WhatsApp, Instagram…) i el que veu
Google **es fan sols** en publicar: no cal fer res.

---

## 5. Contacte, menú i enviaments

- **Adreça, correu i enllaços de Contacte** (IG, Newsletter, Medium): a
  `data/data.json`, dins de `contact`. Un enllaç a una secció de la web s'escriu
  `"#newsletter"`; un a una altra web, sencer: `"https://…"`.
- **Els noms del menú**: a `data/menu.json`, el `label` de cada secció. L'`id`
  no es toca.
- **Les zones d'enviament**: a `data/envios.json`. Buit (`[]`) vol dir que només
  es pot recollir a la galeria.

---

## 6. Stock i comandes: el panell

A **`tatara.cat/admin/`**, amb la contrasenya del panell:

- **`stock.html`**: quantes unitats queden de cada peça. Baixen soles amb cada
  venda; aquí es posen quan arriben exemplars nous.
- **`tickets.html`**: les comandes, els missatges i les altes a la newsletter.

Això no és a GitHub perquè ho ha de poder canviar el servidor tot sol (quan
algú paga), i el servidor no pot escriure a GitHub.

---

## 7. Si alguna cosa va malament

**Quasi sempre és una coma o unes cometes.** En un `.json`:

- cada text va entre cometes dobles: `"així"`;
- entre dos blocs, o dues coses d'una llista, hi va una coma: `["1", "2", "3"]`;
- **després de l'últim, no**: `["1", "2", "3",]` ✗.

**Com saber si ha anat bé**: a GitHub, pestanya **Actions**. L'últim que heu
guardat surt amb un cercle:

- 🟢 verd: publicat.
- 🟡 groc: publicant-se (2-3 minuts).
- 🔴 vermell: no s'ha publicat, i **la web segueix com estava**. Entreu-hi,
  cliqueu **publicar** i al pas **Revisar los JSON** veureu una línia amb ✗ que
  diu què passa i on. Per exemple:

  ```
  ✗ data/agenda.json no es un JSON válido y la web no lo va a poder abrir.
       Expected double-quoted property name in JSON at position 28881 (line 542 column 27)
       línea 542:  "end": "2026-10-31",,
  ✗ guus-vandeweerd-swab: la imagen no existe: assets/img/agenda/guus.webp
  ✗ taller-recerca-local: "start" (2027-02-30) es un día que no existe en el calendario
  ```

  Arregleu-ho (el número de línia diu on mirar), guardeu un altre cop, i
  llestos.

Les línies amb **·** en comptes de ✗ són avisos (per exemple, un text sense
traduir): la web es publica igual.

| Passa això | És això |
|---|---|
| Un **buit gris** on hauria d'anar una foto | El nom del fitxer no coincideix. Compte amb accents i majúscules |
| Un producte surt però diu **exhaurit** | Falten unitats a `admin/stock.html` |
| Un producte surt però diu **pròximament** | Li falta el `price` |

Si no veieu què és, escriviu-nos amb el missatge en vermell i ho mirem.
