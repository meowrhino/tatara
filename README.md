# TAT ARA — web

> **Aquest repositori és l'arxiu de l'estudi.** Des del 20 d'octubre de 2026 la
> web viu a [cristinanoguer/TATARAWEB](https://github.com/cristinanoguer/TATARAWEB)
> i es publica des d'allà. Aquí, `main` és el que es va entregar aquell dia, i la
> branca `cliente` és una còpia del seu repositori que s'actualitza cada nit
> (`.github/workflows/espejo.yml`). Una còpia navegable, només estàtica, viu a
> `tatara-copia.manuellatourf.workers.dev`; es puja a mà des del Mac de l'estudi
> (`npm run build` a la còpia de la clienta, `rm -rf dist/api dist/admin`, i
> `npx wrangler deploy --name tatara-copia --assets dist`), o cada nit si el
> repo té els secrets `CLOUDFLARE_API_TOKEN` i `CLOUDFLARE_ACCOUNT_ID`.

Web de **TAT ARA**, espai galeria d'art, disseny i ecologia (Carrer Martí 59B,
Barcelona): agenda, exposicions, recerca, botiga i newsletter, en català,
castellà i anglès.

HTML, CSS i JS sense build, i un backend petit en PHP amb MariaDB, tot a
l'allotjament de [Pangea](https://pangea.org).

## On viu cada cosa

| | |
|---|---|
| **La web** | [tatara.cat](https://tatara.cat), a Pangea |
| El codi | aquest repositori |
| El primer disseny (v0, arxivat) | [meowrhino.github.io/tatarav0](https://meowrhino.github.io/tatarav0/) |

> **Publicar** és sol: cada canvi a `main` (des de GitHub o amb `git push`) es
> revisa i es puja a Pangea per SFTP, amb GitHub Actions. Detall a
> [DESARROLLO.md](DESARROLLO.md#publicar-en-pangea).

## Documents

| | Per a qui | Què hi ha |
|---|---|---|
| [GUIA.md](GUIA.md) | TAT ARA | Com canviar textos, dates, fotos i preus des de GitHub (en català) |
| [TRASPASO.md](TRASPASO.md) | totes dues parts | Qui té què, les claus, qui es queda el repositori i la llista del traspàs |
| [DESARROLLO.md](DESARROLLO.md) | qui toqui el codi | Estructura, disseny, com publicar a Pangea, l'API i les proves |
| [CLAUDE.md](CLAUDE.md) | Claude | Què fer si la web no es publica (la Action en vermell, un issue) |

## En dues línies

```bash
npm run dev      # la web en local, amb la seva API: http://127.0.0.1:8788
npm run check    # revisa els JSON abans de pujar-los
```
