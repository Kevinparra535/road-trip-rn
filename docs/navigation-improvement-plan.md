# Plan de mejoras al sistema de navegación — auditoría completa

## 📦 Inventario actual

Lo que ya tenemos en código (post-P0/P1-parcial/P2):

**Dominio**
- `NavigationStep` (entidad con `ManeuverType` + `ManeuverModifier`)
- `RouteDirections.steps[]` poblado desde Mapbox con `steps=true`
- `RouteFuelEstimate.refuelPointsKm()` (paradas por medio tanque)
- `geoMath`: `bearingBetween`, `distanceAlongNearest`, `distanceToPolylineKm`, `pointAtDistanceAlong`, `samplePolyline`, `haversineKm`, `polylineLengthKm`, `headingTriangle`

**ViewModel (HomeViewModel)**
- Modo nav: `isNavigating`, `simulatedDistanceKm`, sim a 100 km/h × multiplicador 60
- Estado de avance: `navProgressKm`, `navRiderPoint`, `navRiderCoordinate`, `navHeading`
- Cámara heading-up: `navCameraTarget` (zoom 16.5, pitch 60, heading)
- Métricas de nav: `navRemaining` (km + ETA + hora llegada), `navSpeedKmh`
- Turn-by-turn: `currentTurn` (step actual + texto + maneuver)
- Elevación: `currentNavElevation` (altitud + ascenso + ratio)
- Llegada: `isArrived`, `arrivedAt`, `arrivalSummary`, `dismissArrival`
- Off-route: `monitorOffRoute` (chequeo local), `recalculateFrom` (1 llamada Directions)
- Offroad: `offroadCompass` (rumbo relativo + distancia)
- Breadcrumb: `breadcrumb[]`, `recordBreadcrumb()` cada tick, `breadcrumbShape` para el mapa

**UI components**
- `TurnBanner` (banner de giro con ícono de maniobra)
- `ArrivalPanel` (resumen al llegar)
- `ElevationStrip` + chip `elevationGlance` (perfil de altura)
- `OffroadCompass` (brújula al destino para offroad)
- `JourneyBar` (línea A→B con paradas y avance — en el sheet)
- Marcador del rider direccional (chevron `MaterialCommunityIcons navigation`)
- Botón Recentrar flotante
- Velocímetro en la barra de nav
- Gasolineras a lo largo de la ruta como pines

## 🔎 Brechas vs apps de referencia

| Categoría | Lo que falta | Inspirado en |
|---|---|---|
| **🔊 Audio** | Voz turn-by-turn, mute toggle, vibración alternativa | Waze, Google Maps, Rever |
| **🛡️ Seguridad** | Límite de velocidad, alerta "vas rápido", modo noche auto, keep-awake durante nav | Waze, Google Maps |
| **🛰️ GPS real** | El sim funciona, pero `LocationStore` no alimenta `navProgressKm` cuando no es ruta de prueba; el off-route nunca dispara en uso real | Google Maps |
| **🔁 Alternativas en nav** | Tenemos `route.alternatives` pero no se puede cambiar a una alterna durante nav | Google Maps, Waze |
| **➕ Multi-parada en código** | Ya está en el Pencil; falta `Waypoint[]` editable, "Agregar parada", recálculo encadenado | Rever, Google Maps |
| **➕ Parada mid-nav** | No se puede añadir una gasolinera/cafetería sin detener la nav | Google Maps |
| **📋 Banner enriquecido** | `banner_instructions` de Mapbox da texto pre-formateado mejor (componentes, abreviaciones, exit numbers) | Google Maps |
| **⏱️ Cuenta regresiva al giro** | Pencil promete "En 800 m" pero no hay umbrales 1km/400m/50m | Waze |
| **🧭 Sensor de brújula real** | `navHeading` viene de la geometría — un sensor magnetómetro daría dirección real cuando estás parado | Wikiloc |
| **📍 Grabación de track** | Tenemos `breadcrumb` en memoria, pero no se guarda como "Mi recorrido" para volver a usarlo o compartirlo | Wikiloc, Rever |
| **🌐 Follow de track guardado** | Inverso del anterior: cargar una `.gpx` o un track guardado y seguirlo en lugar de calcular ruta | Wikiloc |
| **📸 Waypoints con foto** | Marcar "estuve aquí" con foto sobre el track | Wikiloc |
| **🅿️ Pausar / reanudar** | No hay forma de "ir a almorzar" sin cerrar la nav | Rever |
| **💾 Persistencia de nav** | Si la app se cierra a la mitad del viaje, no se recupera la ruta ni el avance | Google Maps |
| **🚦 Tráfico en vivo** | No tenemos fuente de tráfico → el ETA es ideal, no realista | Google Maps, Waze |
| **🛻 POIs offroad** | Solo gasolineras. Wikiloc tiene campings, agua, miradores, mecánicos | Wikiloc |
| **⛽ Detalle de gasolinera** | Las pintamos pero no se pueden tocar para ver marca, tipo de combustible, distancia | Waze |
| **📡 CarPlay / Android Auto** | No soportado | Google Maps, Waze, Uber |
| **🏁 Reporte de hazards** | "Cop / piedra / accidente" comunitario — necesita backend | Waze |
| **🔋 Modo bajo consumo** | Pantalla atenuada / cámara plana cuando se va recto | Apps móviles modernas |
| **🛑 Botón "STOP" físico** | Botón rojo grande de finalizar (✓ ya está) — pero también una zona de toque amplia | Uber, Waze |

## 🗺️ Plan priorizado

### **🔴 P0 — Lo que necesitamos cerrar para sentirlo completo (semana 1)**

| # | Item | Por qué | Esfuerzo |
|---|---|---|---|
| 0.1 | **GPS real en nav** — cuando `!isSimulatedNavigation`, alimentar el avance desde `LocationStore` y disparar el off-route real | El sistema está construido pero solo se prueba en sim | M |
| 0.2 | **Voz turn-by-turn** — pedir `voice_instructions=true`, modelar `voiceInstructions` por step, `expo-speech` + toggle mute | Para conducir es lo más importante; un motero no mira la pantalla | M |
| 0.3 | **Keep-awake durante nav** — `expo-keep-awake` para que la pantalla no se apague | Sin esto la nav se interrumpe — bug obvio | S |
| 0.4 | **Umbrales de aviso al giro** — disparar voz a 1000m / 400m / 50m antes del step | Sin esto la voz no es útil aunque exista | S |

### **🟡 P1 — Lo que diferencia un MVP serio (semana 2-3)**

| # | Item | Por qué | Esfuerzo |
|---|---|---|---|
| 1.1 | **Multi-parada en código** — `waypoints[]` editable + UI del planner del Pencil + recálculo encadenado | Pilar del MVP, ya hay diseño | L |
| 1.2 | **Cambiar a ruta alternativa** durante nav (un tap en la alt para hacerla principal) | Funcionalidad estándar; ya computamos alternatives | S |
| 1.3 | **Grabar y guardar `breadcrumb`** como "Mi recorrido" (Firestore + tab Rutas) | Diferenciador clave para adventurers (Wikiloc) | L |
| 1.4 | **Banner enriquecido** — usar `banner_instructions` de Mapbox para mejor UX visual | El TurnBanner está, falta enriquecer el texto | S |
| 1.5 | **Tap a gasolinera en el mapa** — bottom sheet con marca, tipo, precio, distancia a ella | Refuerza el pilar de paradas de tanqueo | M |
| 1.6 | **Pausar/reanudar nav** — botón "pausa" que conserva la ruta y el avance | UX motero realista | S |
| 1.7 | **Persistencia de nav** — guardar estado en AsyncStorage; al reabrir, "¿continuar el viaje?" | Resiliencia básica | M |

### **🟢 P2 — Calidad y seguridad (semana 4+)**

| # | Item | Por qué | Esfuerzo |
|---|---|---|---|
| 2.1 | **Límite de velocidad + alerta** (necesita fuente; Mapbox lo da en algunos casos vía `annotations=maxspeed`) | Seguridad real | M |
| 2.2 | **Modo noche automático** según hora local o luminosidad | Confort y seguridad | S |
| 2.3 | **POIs offroad** (campings, agua, mecánicos) — fuente Mapbox categories | Diferenciador adventurer | M |
| 2.4 | **Sensor de brújula real** vía `expo-sensors` cuando el rider está quieto | Más preciso que la geometría | S |
| 2.5 | **Add stop mid-nav** — agregar una gasolinera/parada sin terminar la nav | UX moderna | M |
| 2.6 | **Compartir ETA / live tracking** con contacto (link público temporal) | Seguridad — "voy en camino" | L |

### **🔵 P3 — Diferenciación / post-MVP**

- CarPlay / Android Auto
- Cargar tracks `.gpx` y seguirlos (estilo Wikiloc)
- Waypoints con foto sobre el track
- Reportar hazards (cop / piedra / accidente) — comunidad
- Tráfico en vivo (requiere fuente como TomTom/Mapbox traffic data)
- Detección de caída (acelerómetro + alerta)
- Rodadas grupales con tracking en vivo (el pilar pendiente del MVP)

## 🤔 Decisiones que necesito de tu lado antes de avanzar

1. **¿Voz en P0?** Es lo más impactante para moto. ¿Solo español-CO o multi-idioma?
2. **GPS real en P0** — confirmas que sí lo wireamos esta iteración?
3. **Grabar tracks (P1.3)** — ¿se guardan en Firestore o solo local en AsyncStorage por ahora?
4. **Multi-parada (P1.1)** — ¿`Waypoint[]` editable en VM o creamos una entidad `TripPlan` aparte?
5. **CarPlay** — ¿lo metemos en MVP o lo dejamos en P3? (es trabajo serio).
6. **Pausar nav (P1.6)** vs simplemente "minimizar" la pantalla manteniendo nav en BG — ¿qué semántica querés?
7. **Tracks `.gpx`** (P3) — ¿es prioritario para vos? Wikiloc/Rever lo viven.

## Sugerencia de orden de PRs

1. PR1 — **P0.2 + P0.3 + P0.4**: voz + keep-awake + umbrales (1 commit grande, alto impacto sensorial).
2. PR2 — **P0.1**: GPS real durante nav.
3. PR3 — **P1.1**: multi-parada (es el más grande y el más esperado).
4. PR4 — **P1.3**: grabar tracks (Wikiloc-style).
5. PR5+ — el resto, según el orden que prefieras.

¿Cuál tomamos? Mi recomendación es **PR1 (voz/keep-awake/umbrales)** porque es 1-2 días de trabajo y cambia la sensación de la app por completo.
