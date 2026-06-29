# Plan — Autonomía + Tanqueo (el diferenciador del MVP)

> **Principio rector:** _"Según TU moto y TU viaje, cuánto rinde, si llegás, y dónde
> tanquear de verdad."_ Es el feature que más le importa al motero. Todo lo que no
> acerque a eso es ruido. Este plan **no parte de cero**: el feature está cableado
> de punta a punta y bien testeado en las capas puras — es mayormente **mejorar +
> cerrar deuda de datos**, no implementar.

Rama: `feat/autonomy-fuel-core`. Estado mapeado por workflow (5 agentes, leyendo el
código actual, no la skill). Respeta Clean Architecture (UI→VM→UseCase→dominio;
data implementa contratos) + `road-trip-domain`.

---

## Estado actual (verificado)

### ✅ Lo que ya es REAL

| Subsistema     | Qué hay                                                                                                                                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Specs**      | `Motorcycle` (tanque, consumo, gasolina, modelo de carga con pesos), `MotorcycleSpecs`, `FetchMotorcycleSpecsUseCase`, `MotoStatsRepository`, matching del dataset (acentos + scoring + confidence), `MotorcycleForm` con autocompletado "Buscar ficha técnica". 12 tests.                                       |
| **Autonomía**  | `EstimateAutonomyUseCase` (puro: factores por acompañante/maletas/ritmo + rideType, reserva 12%, ubica `FuelStop` sobre la geometría). `EstimateRouteFuelUseCase` (modelo físico aparte: velocidad/desnivel/peso). `RidingConditions` capturadas en UI (toggles en RouteDetail + chips en el Planner). 17 tests. |
| **Estaciones** | `FuelStationService` → Mapbox Search Box `gas_station` (**POIs reales**), `FindFuelStationsUseCase`, `FuelStation.priceFor()`. Cableado + 5 tests.                                                                                                                                                               |
| **UI**         | Veredicto en `DestinationPreview` (F2a), `autonomyCard` + `JourneyBar` + markers de estación en Home, `JourneyFuelBar` (F2b), avisos de tanqueo en `NavSuggestionRail`. Glanceable, keep-awake.                                                                                                                  |
| **Grupal**     | `EstimatePartyFuelPlanUseCase` (moto más débil, misma reserva 12%). 8 tests.                                                                                                                                                                                                                                     |

### ⚠️ Lo que es STUB / GAP (el trabajo real)

**Deuda de datos (alta):**

- **Precios por estación = falsos.** `fuelReferencePrices.ts` (16.200/18.100 COP nacional) se asigna **idéntico a toda estación**. La UI lo admite ("no por estación").
- **Tipo corriente/extra = asumido.** Mapbox no lo da; `toDomain` hardcodea `['corriente','extra']` para todas.
- **Scraping de specs no existe.** `MOTO_STATS_API_URL=''`; solo 23 modelos en el dataset. El hook (`fetchFromWeb` + `HttpManager`) está listo, falta la Cloud Function + leer la URL de `env`.

**Inconsistencia de modelo (alta):**

- **Dos estimadores de consumo paralelos** para la misma pregunta: `EstimateAutonomyUseCase` (booleanos discretos + rideType, ignora velocidad/desnivel/peso real) vs `EstimateRouteFuelUseCase` (velocidad/desnivel/kg, ignora rideType + booleanos). Dan `effectiveRangeKm` distintos sobre la misma ruta. **No hay única fuente de verdad del rango.**
- **La autonomía ignora el peso real configurado** (driver/passenger/luggage en kg ya disponibles) — usa castigos planos `*0.92`/`*0.93`.

**Accountability de UX (alta):**

- **Las condiciones del viaje no son ajustables en el flujo principal Home** (preview ni ruta activa) — solo en el Planner. Home/preview usan la config **estática** de la moto. El diferenciador "según moto Y viaje" queda a medias donde el motero más navega.
- **Paradas + markers + avisos NO son accionables** — solo lectura: sin tap, sin "navegar a la estación", sin desvío, sin precio por estación.
- **El tipo de gasolina de la moto no se cruza con la estación** — `priceFor(motorcycle.fuelType)` existe pero solo se usa en tests.

**Menores (media/baja):**

- Veredicto del preview usa `ascentM=0` (optimista) → puede pasar de "llegás" a "recarga" en montaña (caso típico motero).
- Sin moto registrada, el preview omite el veredicto en silencio (sin CTA).
- Match del dataset ignora el año; consumo único "mixto"; `rideStyle` (fuel) no toca el consumo.
- `RouteDetailViewModel.estimateAutonomy/loadFuelStations` sin test de VM.
- Dos caminos distintos para ubicar paradas (RouteDetail vs Home).

---

## Plan faseado

> Orden por **valor × independencia**. F0–F3 son **en-código** (sin backend, alto
> valor). F4 es **deuda de datos** (necesita backend/producto — tracks separados con
> mitigación interina). F5 es robustez.

### F0 — Unificar el modelo de consumo (fundacional) · _en-código · alta_ · ✅ HECHO

> **Implementado** (`rangeFactor.ts`: `computeRangeFactor` + `tripLoadKg`; ambos use
> cases lo consumen; autonomía pasa a peso real en kg; `loadKgFor` dedupeado). 909
> tests verdes — las 4 suites de los estimadores pasan sin cambios (comportamiento
> preservado). Falta de F0 que se difiere a F1: que los consumidores (preview/Home/
> Planner) pasen las MISMAS señales a ambos para que converjan en pantalla.

**Qué:** una **única fuente de verdad** del rango efectivo. Hoy `EstimateAutonomyUseCase`
y `EstimateRouteFuelUseCase` divergen. Consolidar en UN estimador puro que reciba
`(moto, ruta, condiciones+carga)` y devuelva `effectiveRangeKm`, consumo efectivo y las
paradas — combinando lo mejor de ambos (peso real en kg + velocidad/desnivel **y** los
factores por condición/rideType).
**Por qué:** todo lo de abajo (preview, Home, Planner, nav) debe leer del mismo número;
hoy el motero ve cifras que no cuadran.
**Capas:** `domain/useCases` (puro). Posible nueva entidad `RangeModel`/inputs unificados;
deprecar gradualmente el segundo estimador. **Tests:** portar + fusionar los 17+casos.
**Riesgo:** medio (toca lógica testeada). Hacerlo primero evita construir sobre arena.

### F1 — Autonomía según el viaje REAL (no solo la moto) · _en-código · alta_

**Qué:** (a) el estimador unificado usa el **peso real en kg** (driver+passenger+luggage),
no castigos planos. (b) **Plumbear `RidingConditions`** (acompañante/maletas/ritmo) al
**flujo principal**: preview (`BuildRoutePreviewUseCase`) + ruta activa del Home, no solo
el Planner. El veredicto refleja "el viaje de hoy".
**Por qué:** cierra el gap central — "autonomía según moto **Y** viaje" hoy solo está
completo en el Planner.
**Capas:** UseCase (acepta condiciones), VM/Store (expone los toggles en preview/Home),
UI (un control compacto de condiciones glanceable). **Tests:** VM + UseCase.

### F2 — Estaciones accionables + cruce con tu gasolina · _en-código · alta_

**Qué:** (a) hacer **tappables** las paradas/markers/avisos → sheet de estación: nombre,
marca, distancia/desvío, **precio del combustible de TU moto** (`priceFor(moto.fuelType)`),
y acción "navegar a la estación" / "abrir en Maps". (b) **resaltar** el precio compatible
(corriente vs extra) y de-priorizar el irrelevante.
**Por qué:** cierra el último paso del diferenciador de tanqueo: pasar de "ver dónde" a
"actuar". El precio sigue siendo de referencia (F4) pero ya **relevante a la moto** y
honestamente etiquetado.
**Capas:** VM (cruza `motorcycle.fuelType`), UI (sheet + handlers de navegación tipada).

### F3 — Veredicto confiable + enganche · _en-código · media_

**Qué:** (a) preview usa **elevación real** (no `ascentM=0`) o muestra "estimado, se afina
al confirmar". (b) **sin moto** → CTA "Registrá tu moto para saber si llegás". (c) medidor
**"% de tanque que gastarás"** (`rangeUsedPercent` ya se calcula, no se muestra).
**Por qué:** la cifra estrella no debe traicionar la confianza (montaña) y hay que enganchar
al motero sin moto hacia el diferenciador desde el primer destino.

### F4 — Datos reales (backend/producto · tracks separados) · _bloqueado · alta_

> Deuda de **datos**, no de arquitectura — el código ya está listo para activarse.

- **(a) Specs reales:** desplegar la Cloud Function de scraping/búsqueda + cablear
  `MOTO_STATS_API_URL` por `src/config/env.ts` (no hardcode). _Interino:_ ampliar el dataset
  (23 → N modelos) + soportar año/variantes en el matching.
- **(b) Precios por estación:** fuente real (o al menos regional + fecha + refresh) y tipo
  de combustible real si la fuente lo da. _Interino:_ etiquetar con fecha + "referencia".
- **Decisión de producto necesaria:** ¿qué fuente de precios/specs? ¿alcance geográfico?

### F5 — Robustez + calibración · _en-código · media_

- Tests de orquestación UI (`RouteDetailViewModel.estimateAutonomy/loadFuelStations`).
- Calibrar/documentar las heurísticas (factores 0.92/0.93/0.88, reserva 12%, etc.).
- Unificar los 2 caminos de ubicación de paradas (RouteDetail vs Home).

---

## Estado de implementación

- **F0 ✅** — modelo unificado (`rangeFactor.ts`), peso real en kg.
- **F1 ✅** — condiciones del viaje en preview + Home (`NavigationStore` + plumbing).
- **F2 ✅** — estaciones tappables (abrir en Maps) + precio cruzado con la gasolina de la moto.
- **F3 ✅** — % de tanque + caveat de estimado + CTA sin-moto en el preview.
- **F4 🟡** — en-código hecho (URL de specs por env, lista para activar); **bloqueado**:
  desplegar la Cloud Function + fuente real de precios por estación (backend/producto).
- **F5 ✅ (parcial)** — tests de orquestación de `RouteDetailViewModel` + calibración
  documentada en `rangeFactor.ts`. **Diferido**: unificar los 2 caminos de paradas
  (RouteDetail `estimate.fuelStops` vs Home `estimate.refuelPointsKm()`) — severidad baja,
  tocaría el comportamiento del Home; se deja para un refactor dedicado.

## Orden recomendado

**F0 → F1 → F2 → F3** (en-código, alto valor, secuencial por dependencia), con **F5**
intercalado donde toque lógica. **F4** corre en paralelo como track de producto/datos
(no bloquea F0–F3, que ya mejoran muchísimo el diferenciador con los datos actuales).

**Dónde empezar:** F0 (unificar el modelo) es fundacional y desbloquea el resto — pero si
preferís impacto visible primero, F2 (estaciones accionables) es el "wow" más directo para
el motero. Recomiendo **F0 primero** para no construir sobre la divergencia.
