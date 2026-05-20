# Instrucciones para Claude Chrome — Crear el estilo de mapa en Mapbox Studio

> Este documento es el **prompt** que se le pasa a Claude Chrome (modo navegador) para que cree el estilo de mapa que usará la app **Road Trip** (MVP motero). Refleja exactamente el diseño `O3a2f` (Home Navegacion Activa) de `designs/home-v2.pen`.

---

## Prompt copiable

```
Necesito que crees un estilo de mapa custom en Mapbox Studio para una app móvil de
navegación para moteros llamada "Road Trip". El estilo debe ser oscuro, atmosférico,
con tinte verde-oliva muy profundo (no el típico azul-grisáceo de los estilos default).

## Pre-requisito
- Asegúrate de estar logueado en https://studio.mapbox.com con la cuenta del usuario.
  Si no lo estás, detente y pídele al usuario que se loguee y vuelva a invocarte.

## Paso 1 — Crear el estilo base
1. Abre https://studio.mapbox.com/styles/
2. Click en "New style".
3. En el modal de templates, selecciona la pestaña "Templates" y elige
   "Monochrome" → variante "Dark". (Si "Monochrome" no aparece, usa "Standard" y
   luego cambia a una variante oscura. Como último recurso, "Navigation Night v1").
4. Click en "Customize".

## Paso 2 — Renombrar el estilo
1. En la esquina superior izquierda, click sobre el nombre actual del estilo.
2. Renómbralo a: roadtrip-night
3. Confirma con Enter.

## Paso 3 — Ajustar el color base (Background / Land / Water)
Abre el panel "Components" o "Layers" (izquierda) y aplica estos colores. Si el
template usa "Components" (Standard), abre cada componente y ajusta su color base.
Si usa "Layers" clásico, busca las capas por nombre.

| Elemento                | Color hex    |
|-------------------------|--------------|
| Background / Land base  | #0A1A0A      |
| Landuse (parks/grass)   | #0E1A0E      |
| Water                   | #0D1117      |
| Hillshade (si existe)   | reducir opacidad a 30% |

Si el panel pide un solo color de fondo, usa #0A1A0A.

## Paso 4 — Red vial (lo más importante)
Las carreteras deben ser visibles pero discretas. Tres niveles de jerarquía:

| Tipo de vía                          | Color fill | Stroke/Casing |
|--------------------------------------|------------|---------------|
| Motorway / Trunk (autopistas)        | #2A3A2A    | #1A2A1A       |
| Primary / Secondary (principales)    | #1F2F1F    | #152015       |
| Tertiary / Street / Residential      | #1A2A1A    | #152015       |
| Path / Track (offroad, terracería)   | #1F2F1F (dashed) | sin casing |

Reglas:
- Todas las vías deben tener line-cap: "round" y line-join: "round".
- El grosor (line-width) debe ser stop-based: en zoom 8 las autopistas = 1.5px,
  en zoom 14 = 8px, en zoom 18 = 24px. Para residenciales en zoom 14 = 2px, en
  zoom 18 = 10px.
- Si el template tiene capa "road-label", déjala visible pero con color
  #FFFFFF66 y halo #0A1A0A, tamaño 11px, font weight bold.

## Paso 5 — POIs (puntos de interés)
La app sólo quiere mostrar gasolineras y comida/lodging en zoom alto. Todo lo
demás contamina visualmente.

1. Busca todas las capas que empiecen por "poi-" (poi-label, poi-scalerank, etc.)
2. Para cada una: revisa su filtro (filter) y modifícalo así:
   - OCULTA (visibility: none o filter que excluya): banks, atm, offices,
     business, government, education, place_of_worship, shop (todo el grupo),
     hairdresser, real_estate.
   - DEJA VISIBLE pero con color y tamaño discreto:
     - Gas station (clase = "fuel" o maki = "fuel"): ícono propio del estilo,
       SIN texto, opacidad full. Si Studio te lo permite, oculta también este
       (lo dibujamos nosotros desde la app).
     - Restaurant / cafe / lodging: ícono pequeño, tamaño 11, color #FFFFFF55,
       solo visible desde zoom 15.

Si no puedes editar capa por capa fácilmente en el panel de "Components",
busca el toggle "Points of interest" y selecciona "Minimal" o "None", luego
agrega manualmente la categoría "fuel".

## Paso 6 — Etiquetas de lugares y calles
| Etiqueta              | Color      | Tamaño | Halo            |
|-----------------------|------------|--------|-----------------|
| Country / State       | #FFFFFF88  | 12px   | #000000 1.5px   |
| City (place-city)     | #FFFFFF77  | 12px   | #0A1A0A 1.5px   |
| Neighborhood          | #FFFFFF55  | 10px   | #0A1A0A 1px     |
| Street (road-label)   | #FFFFFF66  | 11px   | #0A1A0A 1.5px   |

Font: Inter Bold (si está disponible). Si no, Open Sans Bold.

## Paso 7 — 3D buildings
- Si el template los trae, deja la capa "building-3d" o "building-extrusion"
  visible con color #1A1F1A y opacidad 0.7. Esto da el efecto pitch 60° que la
  app usa durante navegación.
- Min zoom de la capa: 15.

## Paso 8 — Esconder ruido
Asegúrate de OCULTAR (visibility: none) estas capas si existen:
- transit-label, ferry, airport-label (todas las de transit excepto si son
  parte de la ruta)
- admin-1-boundary y admin-2-boundary internos (deja solo countries)
- contour (líneas de elevación) — la app maneja su propio elevation strip
- mountain-peak-label

## Paso 9 — Publicar
1. Click en "Publish" (esquina superior derecha).
2. Confirma "Publish as new version".
3. Una vez publicado, abre la pestaña "Share" o "Share & develop".
4. Copia el "Style URL" — tiene formato:
     mapbox://styles/<username>/<styleId>

## Paso 10 — Devolverme la información
Cuando termines, dame:
1. El Style URL completo (mapbox://styles/...).
2. El username asociado.
3. El style ID.
4. Un screenshot del preview centrado en Bogotá, Colombia (lat 4.65, lng -74.08,
   zoom 13) para validar visualmente.

Si Mapbox Studio cambia su UI y algún paso no aplica exactamente, usa tu mejor
criterio para llegar al resultado descrito (fondo verde-oliva muy oscuro, vías
discretas, sin POIs comerciales, etiquetas en blanco translúcido).
```

---

## Después de que Claude Chrome devuelva el Style URL

Reemplaza la constante en [src/ui/map/mapbox.ts](../src/ui/map/mapbox.ts):

```ts
export const MAP_STYLE_URL = 'mapbox://styles/<username>/<styleId>';
```

Eso es todo — los tres screens (`HomeScreen`, `RoutePlannerScreen`, `RouteDetailScreen`) ya leen de esa constante.

## Paleta de referencia (extraída del Pencil)

| Elemento Pencil          | Color    | Uso en Studio                            |
|--------------------------|----------|------------------------------------------|
| `YsVAk` gradient top     | #0A1A0A  | Background / Land                        |
| `YsVAk` gradient mid     | #0E1A0E  | Landuse parks                            |
| `YsVAk` gradient bottom  | #0D1117  | Water                                    |
| `luxhj` Cross Road       | #1A2A1A  | Road tertiary / street fill              |
| `DraFP` Cross Road 2     | #152015  | Road casing                              |
| `HF5AM` Route Core       | #FF9800  | (NO va en Studio — lo dibuja la app)     |
| Pin/Origin               | #FF9800  | (NO va en Studio — lo dibuja la app)     |
| Pin/Destination          | #4CAF50  | (NO va en Studio — lo dibuja la app)     |
| Pin/Gas Station          | #2196F3  | (NO va en Studio — lo dibuja la app)     |
| Labels                   | #FFFFFF40 → #FFFFFF88 | road/place labels        |

## Notas

- **Ruta, pines, breadcrumb, marker del rider** NO se estilizan en Mapbox Studio. Esos
  son `ShapeSource` + `LineLayer`/`CircleLayer` en código React Native, dibujados
  encima del mapa. El estilo de Studio sólo controla el **fondo** (terreno, agua,
  calles, etiquetas, POIs).
- Cuando armemos el modo día (P2.2 del plan de navegación), repetimos este mismo
  proceso pero con paleta clara y guardamos como `roadtrip-day`.
