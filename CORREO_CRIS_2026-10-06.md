# Correo de Cris — 6 de octubre de 2026

Feedback de Cris después de hablar con **Ariadna Serrahima** (gráfica, experta en
publicaciones y tipografía), con una maqueta en PDF (`CRIS WEB.pdf`, 6 páginas).
A Ariadna le gustan las tres columnas, el texto que enmarca cada esquina, que
todo sea scroll hacia abajo y que se vea como un archivo; pide reforzar esa idea
de archivo al 100 %.

El diseño anterior quedó guardado en la etiqueta `v0-disseny-color` y en
[meowrhino.github.io/tatarav0](https://meowrhino.github.io/tatarav0/).

---

## Punto por punto: qué pedía y qué se ha hecho

| Punto del correo | Qué se ha hecho | Estado |
|---|---|---|
| **0)** 4 columnas, las dos del centro juntas | Rejilla de 4 columnas iguales: menú · contenido (2 centrales) · carrito/idiomas | ✅ Coincide con el PDF casi al píxel |
| **1)** Un solo cuerpo, sin negritas, títulos en mayúscula | Un solo tamaño (`--fs`), cero negritas, títulos en mayúscula | ✅ |
| **1)** Interlineado 11/9 (y 13 en la lista de expos) | 1,4 y 1,7, lo que mide el PDF, en vez de 1,22 y 1,44 | ⚠️ Duda 1 |
| **1)** Cuerpo 9 (el de la agenda) | 12px en móvil; en escritorio crece con la columna (13–20px) para mantener los ~72 caracteres por línea del PDF | ⚠️ Duda 2 |
| **1)** Todo a la izquierda, sin partir palabras | Hecho, imágenes incluidas | ✅ Salvo contacte, newsletter y carret vacío, centrados a petición de Manu |
| **2)** TAT ARA más grande | ~3,3 veces el texto en escritorio, 1,8 en móvil, peso regular | ✅ |
| **3)** Blanco y negro, hilo negro, mismo grosor | Fuera colores, grises y opacidades; hilo de 1px entre eventos; cruces de 1px | ✅ |
| **4)** Sin carteles en la agenda | Quitados los 23 | ✅ La agenda queda sin imágenes hasta que haya fotos de obra |
| **5)** Expos sin marco, artista + expo, subrayado en vez de +, cruz más grande | Hecho; la ficha se abre en la columna y el botón de atrás funciona | ✅ |
| **5)** Unificar los scrolls | Todas las secciones empiezan a la misma altura, justo debajo de TAT | ✅ |
| **6)** Shop: fondos duplicados y texto en dos bloques | Fuera la caja gris; título/autor a la izquierda, precio solo a la derecha | ✅ |
| **7)** Botón redondo en contacte | No se hace (decisión de Manu) | ✅ Descartado |
| Menú siempre a la vista | Columna fija en escritorio; en móvil sigue el menú desplegable | ⚠️ Duda 3 |
| Agenda: sin pasado/futuro, tipo abajo | Fuera; el tipo va abajo **a la derecha**, como en el PDF (el correo decía izquierda) | ⚠️ Duda 4 |
| Agenda "por evento, no por meses" | Sin tocar: ya va por evento | ⏳ Para la reunión en persona |
| Licencia estética: el contenido pasa por debajo del logo | Hecho en escritorio; en móvil las barras son blancas para que se lea | ✅ Decisión propia en móvil |
| PDF: SHOP en lugar del carrito / flechas en la foto | Se queda el carrito; sin carrusel | ✅ |

## Dudas

1. **Interlineado.** Los números de Ariadna (11/9 = 1,22) dan un texto más
   apretado que su propio PDF (~1,4). Se ha seguido el PDF. Cambiarlo es una
   línea del CSS (`--lh`).
2. **Tamaño de letra.** Con 12px fijos en una columna tan ancha salen líneas de
   ~95 caracteres, nada que ver con el PDF; por eso crece con la pantalla. Es la
   decisión más interpretada: conviene que Cris la vea en una pantalla grande.
3. **Móvil.** Ni el correo ni el PDF hablan de móvil. El menú desplegable y las
   barras blancas son decisión propia.
4. **Tipo de evento: izquierda o derecha.** El correo dice izquierda y el PDF lo
   pone a la derecha. Se ha seguido el PDF: ocupa justo el sitio donde estaba
   "passat / ara / proximament".

## Vistos y no tocados

- **La ficha de producto de la botiga sigue siendo una ventana con marco.** Es
  la única que queda (las expos ya se abren en la columna). Por coherencia podría
  abrirse igual. No lo pidió nadie; ~1 hora.
- **Recerca no tiene título arriba.** En la página 6 del PDF lo tiene;
  `recerca.json` no trae ninguno. Si se quiere, es una línea en el JSON.

## Colgado

Para preguntar a Cris:

1. ¿Vídeo en la agenda? (el botón de play de la página 1 del PDF)
2. "Por evento y no por meses": hablarlo en persona.
3. Fotos de obra para la agenda, si se quieren.

Fuera del diseño (el rediseño ya está publicado en tatara.cat desde el 7 de octubre de 2026):

- **Borrar el Worker viejo de Cloudflare** (antes, mirar si su D1 tiene altas
  de newsletter). Ver [TRASPASO.md](TRASPASO.md), punto 1.
- **Contestar la pregunta de Cris sobre el coste**: proponía calcular el % de
  tiempo de más que ha llevado la web.

Stripe, stock, página legal y avisos por correo siguen en
[TRASPASO.md](TRASPASO.md).
