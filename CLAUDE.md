# NutriBEL — web multipágina

Web para NutriBEL (La Vega, República Dominicana): clínica de nutrición de la Dra. Bielka Eusebio + restaurante de comida saludable. En `bale/` vive la página autónoma de balé, el estudio de Barre, Ballet & Pilates del mismo edificio.

La dueña aprueba todo el contenido y tiene los derechos de todas las fotos.

## Punto de partida

`referencia/demo-completo-aprobado.html` es la versión de una sola página que el cliente ya vio y aprobó. **Respeta su diseño, textos, colores, animaciones y comportamiento.** La tarea es separarlo en páginas independientes con CSS y JS compartidos, cargar los datos desde `data/*.json` y usar las imágenes de `assets/img/` como archivos (en el demo están incrustadas en base64).

Las imágenes de `referencia/` son páginas del PDF del menú y bocetos del cliente: úsalas como guía visual.

## Páginas (un HTML por módulo)

| Archivo | Contenido |
|---|---|
| `index.html` | Presentación: H1 "Nutrición *personalizada* y bienestar *integral*" con la línea "Una experiencia que conecta cuerpo y mente", 4 pasos en píldoras de color, logo animado en el centro, la doctora a la derecha. Debajo: ¿Quiénes somos? y Nuestra fundadora (títulos UCATECI e INTEC). Referencia: `referencia/pdf-pagina-presentacion.png` |
| `metodo.html` | "Crea tu menú personalizado con el método del 1 al 6". Usa `assets/img/metodo/titulo-crea-tu-menu.png` y los íconos `paso-1..6.png`, cada paso con su color (ver `referencia/pdf-pagina-metodo.png`). Incluye "¿Por qué 6 pasos?" y "Nosotros nos encargamos del resto" |
| `menu.html` | Plato del día (Nutrialmuerzo de lunes a viernes), pestañas por sección, filtros (alto en proteína, keto, sin gluten, ligero), fotos, tamaños, opciones, armador de power-bowl, carrito |
| `servicios.html` | Servicios de consulta: nutrición y bienestar + seguimiento de condiciones de salud. Aviso: la consulta no sustituye al médico tratante |
| `planes.html` | 13 planes con filtros, **sin precios**; los de temporada muestran "Disponible ahora" según la fecha; botón "Consultar con la doctora" lleva a `consulta.html?plan=...` con el plan preseleccionado |
| `bale/` | balé — Barre, Ballet & Pilates, página autónoma. Ver sección propia abajo. `bale.html` de la raíz solo redirige a `bale/` |
| `consulta.html` | Formulario de cita → WhatsApp. Motivo con grupos (consulta, condición, planes). Bloquea domingos. Aviso de no escribir diagnósticos |
| `contacto.html` | Horario (L–V 8:00 am–8:00 pm, sábado 8:00 am–4:00 pm) con indicador abierto/cerrado, fachada + interior, dirección, Cómo llegar, WhatsApp, Instagram |
| `panel.html` | Panel del negocio (demo): datos del negocio, Nutrialmuerzo de la semana, info nutricional, etiquetas, agotado hoy |

Barra de navegación igual en todas las páginas de NutriBEL, marcando la página actual. balé no está en la navegación: la única conexión es el botón "Ir a balé" de la cabecera de NutriBEL, que lleva a `bale/`. Desde balé no hay ningún enlace a NutriBEL.

## Arquitectura

```
css/base.css      tokens, tipografía, cabecera, navegación, botones, bandas, modo oscuro, transición
css/<pagina>.css  estilos propios de cada página si hacen falta
js/common.js      cabecera y navegación, modo oscuro, carrito compartido, WhatsApp, horario abierto/cerrado
js/<pagina>.js    lógica de cada página
data/*.json       contenido
assets/img/...    imágenes
```

- **Carrito compartido:** debe persistir entre páginas en `localStorage`, para poder agregar desde el menú o desde el plato del día y enviar desde cualquier página. Incluye la modalidad de entrega (recoger, en el local, delivery cercano RD$75, zona retirada RD$150 con campo de dirección). Los precios `null` se muestran como "Precio por confirmar" y no suman al total.
- **Datos:** cárgalos con `fetch`. Esto no funciona abriendo el archivo directamente, así que usa un servidor local (`npx serve` o Live Server).
- **Despliegue:** GitHub Pages, sin frameworks ni compilación.

## Sistema de diseño (ya aprobado)

**Colores (modo claro, por defecto):**
- **Base:** `--olive #3F4D2B`, `--leaf #56643C`, `--lime #A6C24F`, `--cream #FAF8F2` (fondo), `--paper #FFFFFF`, `--ink #1F2617`, `--muted #5E6452`, `--line #E4DFD2`.
- **Acentos:** `--cta #C0581E` (solo botones de acción principal), `--orange #C0581E` (planes), `--plum #5B3480` (parte clínica: servicios y consulta). El naranja se ajustó desde `#C45A1F` para llegar a 4,5:1 con texto blanco; en modo oscuro el texto sobre el naranja es oscuro (`#161a11`).
- **Bandas de sección:** `--sage #E8EDDD`, `--lav #F1EBF6`, `--peach #FBEDE1`.
- **Pasos del servicio:** `#D9822B`, `#E6B422`, `#8FAE36`, `#5B3480`.

**Modo oscuro:** solo con el botón luna/sol, nunca automático por el sistema. Usa el atributo propio `data-mode="dark"` en `<html>`, no `data-theme`. Se recuerda en `localStorage`. La transición es un círculo que se expande desde el botón con `document.startViewTransition` y `clip-path` (650 ms). Si el navegador no lo soporta, hace un fundido de colores; con `prefers-reduced-motion`, el cambio es instantáneo. Copia los tokens del modo oscuro del demo.

**Tipografía (Google Fonts):**
- **Fraunces** para titulares, nombres de platos y planes: peso 500–600, `font-variation-settings: "SOFT" 60`. Las palabras clave van en cursiva y color `--leaf` (ej.: "Nutrición *personalizada* y bienestar *integral*").
- **Plus Jakarta Sans** para texto, botones y pestañas.

**Tarjetas:** fondo blanco, borde de 1.5px `--line`, franja superior de 6px del color de la sección y foto arriba (proporción 16:10) cuando hay imagen.

## Logo animado (index)

Hay dos máscaras PNG blancas sobre transparente del mismo tamaño y centradas entre sí: `marca/anillo-vegetales-mascara.png` y `marca/manzana-mascara.png`. Se colorean con `background:#A6C24F` y `mask-image`, dentro de un círculo verde `#3F4D2B`.

- **Entrada:** el círculo escala, el anillo entra girando y la manzana salta con rebote.
- **Después:** el anillo gira despacio (70 s por vuelta) y la manzana flota suave. Un borde punteado exterior gira en sentido contrario. Al pasar el ratón, el anillo gira más rápido.

Ver `referencia/boceto-logo-animado.png` y `referencia/boceto-anillo-animado.png`.

## balé (`bale/`)

Submarca con identidad propia; su logo usa una serif fina sobre crema. **Página autónoma**: todo vive en `bale/` (`index.html`, `css/`, `js/`, `img/`, `video/`, `data/`), con su copia mínima de la base (`bale/css/base.css`, `bale/js/core.js`). No carga nada de NutriBEL y debe seguir funcionando si se copia sola a otro dominio. Rutas siempre relativas. Claves de `localStorage` con prefijo `bale-`.

- **Cero NutriBEL en la navegación** (pedido de la dueña): sin la cabecera, la navegación, el carrito, el pie ni el WhatsApp de NutriBEL, y sin botón "← NutriBEL". NutriBEL solo aparece en la dirección ("En el edificio de NutriBEL") y en la tarjeta "Balé × NutriBEL" de Comunidad, **sin enlace**. Sin menciones a la Dra. Bielka Eusebio.
- **Identidad (aprobada):** Cormorant Garamond (titulares) y Montserrat (textos, etiquetas espaciadas); crema `#F3E4D8`, espresso `#2E2723`, acento rosado `#7A3E5C` (fondo `#F7E6E8`); rosa `#F4C5CE` y acento `#ED2F59` de sus redes, con moderación (botón principal y etiquetas, con texto blanco). Modo oscuro propio. Favicon y logo en `bale/img/`.
- **Entrada:** telón de terciopelo rosa con el logo en crema y una cinta que se dibuja; se abre hacia los lados (≈2,2 s), se salta con un clic o una tecla y no aparece con `prefers-reduced-motion`. Todas las animaciones terminan.
- **Datos:** `bale/data/config.json` (WhatsApp +1 849-638-6337, correo de reservas, Instagram @balestudio.rd, dirección, Maps, pago `POR CONFIRMAR`, cargo de cancelación, aviso por correo con FormSubmit), `horario.json`, `precios.json`, `comunidad.json` y `bale.json` (el resto). El número de NutriBEL (18097357036) no puede aparecer en `bale/`.
- **Horario oficial:** el de la publicación fijada del Instagram de balé (10 de septiembre de 2026), 18 clases con Marifer (María Fernanda Pimentel), Lynette, Rusmairy y Viviana (Viviana Medina Sánchez). Etiquetas `avanzado`, `miembros` y `primera`. Ballet niñas: 2 a 5 y 6 a 11 años, solo con Rusmairy. Sin Mat Pilates (solo se menciona en el texto de la membresía ilimitada).
- **Reservas:** clases de barra con esquema SVG de la sala (`sala.filas` × `sala.por_fila`, por confirmar) y foto de las barras nuevas; Reformer y Ballet niñas con cupo por número. Al confirmar: WhatsApp de balé con la reserva completa y la línea del cargo de RD$300, aviso por correo (FormSubmit) y `.ics` de la clase. Los recordatorios automáticos todavía no existen: la página lo dice ("Vista previa: los recordatorios automáticos llegan en la siguiente fase").
- **Precios:** tabla oficial (clase individual, membresías, clase infantil y uniformes) y certificado de regalo. Pago por transferencia, datos por confirmar. No inventar datos bancarios.
- **Comunidad:** `proximos` (con fecha; se ocultan solos) y `momentos` (siempre visibles). Guía para César en `bale/COMO-ACTUALIZAR.md`.
- **Panel del negocio (`bale/panel.html`, demo):** contacto, aviso para las clientas, clases canceladas por fecha, cupos y sala, precios y próximos eventos. Guarda en `localStorage` (`bale-panel`, solo lo que difiere de los JSON) y lo aplican `core.js` y `bale.js`. "Descargar archivos para publicar" genera los JSON de `bale/data/` actualizados. Enlazado desde el pie de balé, nunca desde NutriBEL.
- **Portada:** video en `bale/video/` (vertical en el teléfono, horizontal en el escritorio), muted, playsinline, loop y póster; no se reproduce con `prefers-reduced-motion`. Se regenera con `referencia/bale-recursos/video/generar-portada.py`.

**Reglas que no se rompen en balé:**
1. Nunca caras de niñas: de ballet infantil solo piernas, medias, zapatillas y piso.
2. Solo el mat beige con el logo de balé: ninguna foto con mats negros, verdes ni marrones.
3. Fotos del equipo: no publicar una cara con nombre sin confirmación de la dueña (mientras tanto, iniciales; las fotos van en `bale/img/equipo/<nombre>.webp`).
4. Una instructora que ya no trabaja en balé no aparece en ningún archivo del repositorio.

## Reglas

- Todo el texto de la web va en español.
- Nunca guardar datos de salud de pacientes en el navegador ni enviarlos por formularios de la web.
- Accesibilidad: `alt` en todas las fotos, foco visible, contraste AA y `aria-label` en botones de ícono.
- Responsive desde 360px, sin scroll horizontal. Respeta las áreas seguras de iOS como en el demo.
- Imágenes en WebP con `loading="lazy"` fuera de la primera pantalla.
- Fotos del menú: solo la foto real de ese plato (de las sesiones de Drive). Nunca la de otro plato ni de stock; si no hay, el plato va sin foto.

## Pendiente de confirmar con el cliente

Revisa la lista `pendiente` en `data/negocio.json` y `bale/data/bale.json`. No inventes precios: muéstralos como "Precio por confirmar" (los planes no muestran precio).
