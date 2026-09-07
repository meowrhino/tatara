# FUTURO — TAT ARA

Ideas planteadas pero **fuera del presupuesto actual**. No están empezadas ni
comprometidas: quedan aquí escritas para que, si algún día se contratan, no haya
que redescubrirlas.

Lo que sí está pendiente y sí está dentro del encargo vive en
[NEXT_STEPS.md](NEXT_STEPS.md) y [TODO_DOMINIO.md](TODO_DOMINIO.md).

---

## 1. Formulario de agenda en `/admin/`

**El problema.** Hoy, añadir una exposición o un evento a la agenda significa
editar `data/agenda.json` a mano: acertar con las comas y las llaves, escribir
`kind` en tres idiomas, saber si la entrada va suelta o dentro del array
`eventos` de una exposición, convertir la foto a webp por terminal y hacer
`git push`. `npm run check` avisa de casi todos los errores posibles, pero llega
*después* y sigue haciendo falta terminal y git.

En la práctica eso significa que la agenda la actualiza quien lleva el código, no
la galería.

**La idea.** Una pantalla más en `/admin/` — donde ya viven el stock y los
pedidos — con un formulario que escriba el JSON por debajo:

- Campos con etiquetas en catalán, no nombres de campo: *artista*, *títol*,
  *del … al …*, *hora*, *text* (una pestaña por idioma).
- El tipo (`kind`) como desplegable, no como texto libre.
- El color, como muestras de la paleta.
- "Aquest esdeveniment passa dins d'una exposició?" → un desplegable con las
  exposiciones cuyo rango contiene esas fechas. Así el anidado deja de ser una
  decisión sobre la estructura del archivo.
- Subir la foto desde el propio formulario: se convierte a webp, se gira si trae
  orientación EXIF y se guarda con el nombre correcto, sin pasar por terminal.
- Las mismas validaciones de `npm run check`, pero mientras se escribe.
- Publicar sin git.

**Lo que hay que resolver antes.** Dos cosas, y son las que hacen que esto no sea
media tarde:

1. **Dónde se guarda.** Ahora mismo los JSON son ficheros del repo y la web es
   estática: el Worker los sirve, no los escribe. Guardar desde el navegador
   pide o bien mover la agenda a la D1 (donde ya viven stock y pedidos), o bien
   que el admin escriba en el repo vía API de GitHub. La primera opción es más
   limpia y rompe el "el JSON es la fuente de verdad" que hoy hace que todo sea
   fácil de auditar; la segunda lo conserva pero es más frágil.
2. **Las imágenes.** Hoy la conversión a webp es `tools/to-webp.sh`, que corre en
   el Mac de quien programa. Subir desde el navegador quiere R2 (o similar) y
   hacer la conversión en el Worker.

El admin ya está protegido por `ADMIN_TOKEN`, así que la parte de acceso está.

**Coste estimado:** 2-3 días. La mitad se va en los dos puntos de arriba, no en
el formulario.

**Cuándo tiene sentido:** cuando la galería vaya a actualizar la agenda sin pasar
por el estudio. Si el flujo va a seguir siendo "la clienta manda el texto y se
sube", no compensa: la guía del README cubre el caso.

---

## 2. Reserva exacta de la altura de las imágenes

**El problema.** Las fotos de la agenda reservan `4/5` de alto antes de cargar,
que es el formato de la mayoría de carteles pero no de todas. La diferencia entre
lo reservado y lo real hace que la página crezca unos 700 px mientras se cargan,
y al recorrer el historial hacia atrás el scroll da pequeños saltos.

**La idea.** Que `npm run webp` escriba las dimensiones de cada imagen en un
archivo generado, y que la web ponga `width` y `height` en cada `<img>`. Salto
cero. La clienta no escribe nada: lo genera el script.

**Coste estimado:** media hora. **Cuándo:** cuando los saltos molesten de verdad.

---

## 3. `kind` como catálogo

**El problema.** Cada evento de la agenda repite el tipo en tres idiomas:

```json
"kind": { "ca": "Conversa", "es": "Conversación", "en": "Conversation" }
```

Son seis líneas por entrada, quince veces en el archivo, y nada impide escribir
una traducción distinta cada vez.

**La idea.** Definir el catálogo una vez en `data/data.json`, como ya se hace con
la paleta de colores, y escribir solo `"kind": "conversa"`. `npm run check` puede
listar los tipos válidos cuando alguien se equivoque.

**Coste estimado:** media hora.
