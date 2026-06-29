# TAT ARA — web

Web de **TAT ARA**, espai galeria d'art, disseny i ecologia (Barcelona).
Vanilla HTML/CSS/JS, sense dependencies de build. Mobile-first, trilingüe (CAT/CAST/ENG).

## Estructura

```
index.html          Pàgina (agenda + barra inferior + menú overlay)
css/styles.css      Estils (minimal, monospace, color només a l'agenda)
js/agenda.js        Motor de l'agenda
data/events.json    Dades dels esdeveniments (i18n-ready)
assets/img/         Imatges optimitzades (.webp): agenda/ · edicions/ · mr/
tools/              Scripts: to-webp.sh, serve.py
```

> El material **font** (fotos originals, PDFs, `.pages`, mockups de `referencias/`)
> no està al repo (massa pesat). Viu al disc local i s'hauria de tenir un backup a part.
> Les imatges del repo són totes `.webp` (originals → `tools/to-webp.sh`).

## Desenvolupament

```bash
python3 -m http.server 8765     # i obre http://localhost:8765
```

Truc: `?start=2026-01-20` salta a una data amb esdeveniments reals.

## Agenda

Tira vertical: 1 dia = `--day-vh` (3dvh), des d'avui fins a +30 dies.
Cada esdeveniment és un bloc de color; els buits diuen «TAT ARA».
Esdeveniments a `data/events.json` (`demo: true` = farciment, esborrar quan hi
hagi dades reals dins la finestra).

## Pendent

- Font **superstudioTrial** (wordmark) — placeholder amb Space Mono de moment.
- Seccions: nosaltres, artistas, diari, botiga (+ Stripe), contacte, carrito.
- Traduccions CAST/ENG, links d'artistes, preus de botiga.
