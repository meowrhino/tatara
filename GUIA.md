# Guia — com actualitzar la web de TAT ARA

Per a qui porta el contingut de la web: textos, dates, fotos i preus. No cal
saber programar ni tenir GitHub: només un editor de text, Cyberduck i el
navegador.

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
| L'adreça, el correu, els enllaços del peu | `data/data.json` |
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

La fitxa es pinta sempre igual: a l'esquerra el **títol**, a sota l'**autor** i
a sota l'**editorial** (o qualsevol altra dada de context); a la dreta, sol, el
**preu**.

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

## Si algú fa canvis de disseny a la web

El contingut bo és **el que hi ha al servidor**, el que vosaltres pugeu. Qui
toqui el codi l'ha de baixar del servidor abans de publicar res (està explicat a
[DESARROLLO.md](DESARROLLO.md)); si no, podria tornar a pujar una versió vella
dels JSON i desfer els vostres canvis. Si sabeu que algú farà canvis, recordeu-li.

