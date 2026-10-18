# tatara, para Claude

La web de TAT ARA (tatara.cat), hecha por meowrhino con la receta del estudio
([meowrhino/JAMstack](https://github.com/meowrhino/JAMstack)), en su variante
Pangea: sin build, PHP + MariaDB, y cada push a `main` se revisa y se sube por
SFTP (`.github/workflows/publicar.yml`). Se habla en castellano. Cómo está
hecha: [DESARROLLO.md](DESARROLLO.md); lo que edita TAT ARA: [GUIA.md](GUIA.md)
(en catalán).

## Si no se publica (la Action sale en rojo)

Cuando falla, tatara.cat se queda como estaba. Para arreglarlo:

1. **El error**: la Action abre un issue con la etiqueta `build` y el mensaje
   dentro: `gh issue list --label build` y `gh issue view <n>`. El registro
   entero: `gh run list -L 3` y `gh run view <id> --log-failed`.
2. **Reprodúcelo aquí**: `npm run check` da lo mismo que el paso *Revisar los
   JSON*. `npm run build` es el paso *Preparar dist/* (necesita php y Chrome;
   del servidor solo lee).
3. **Arréglalo donde dice**, casi siempre en `data/`:
   - "no es un JSON válido … línea 542": una coma de más o de menos, o unas
     comillas sin cerrar, cerca de esa línea.
   - "la imagen no existe: assets/img/…" o una foto de `photos` que no está en
     `data/exposicions/<slug>/img/`: pregunta si falta subirla; si no, quítala
     del JSON y dilo.
   - "es un día que no existe", "es anterior a start": la fecha, en
     `AAAA-MM-DD`.
   - "no és un camp d'aquí (mal escrit?)" o "ha de ser un número…": no cuadra
     con su esquema (`schema/`). El mensaje dice qué campos hay o cómo tiene que
     ser; se arregla el dato, no el esquema.
   - "En el servidor hay cambios en data/ que no están en GitHub": alguien
     subió un JSON por SFTP. **No los pises**: `npm run build` en local los
     trae a `data/`; revísalos con `git diff`, haz commit y push, y se publica.
   - Si falla *Subir a Pangea* o *Comprobar*: el servidor o el secret
     `SFTP_PASSWORD`. Eso es de manu.
4. **Comprueba**: `npm run check` sin ✗ (las líneas con · no paran nada).

No cambies `tools/` ni el workflow para que pase: si el dato está bien y la
revisión se queja, es un fallo de la revisión, y hay que decírselo a manu. No
borres fotos, exposiciones ni nada del servidor (`lftp` va sin `--delete` a
propósito: `api/config.php` solo vive allí). No muevas la etiqueta `publicado`
a mano. Las unidades de la botiga y las comandas están en la base de datos del
servidor, no en el repo: no se tocan desde aquí.

Commit y push solo cuando te lo pidan: mensaje en castellano diciendo qué se
arregla. Al publicarse, la Action cierra el issue sola.
