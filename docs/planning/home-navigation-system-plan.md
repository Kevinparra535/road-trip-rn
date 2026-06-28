# Plan: Mejora del sistema de navegación del Home

> **Fecha:** 2026-06-28 · **Rama base:** `refactor/screen-boundary-planner-stores`
> **Supersede / actualiza** a `docs/navigation-improvement-plan.md` (varios de sus P0 —
> voz turn-by-turn, keep-awake, off-route monitor — **ya están implementados**; este
> documento parte del estado real verificado en código, no de ese backlog).
> Referencias de UX: Google Maps, Waze, Wikiloc, Uber, REVER, Calimoto/Scenic/Kurviger.
> Respeta Clean Architecture (UI → ViewModel → UseCases → dominio; data implementa
> contratos) y la regla de **screen-boundary** del repo.

---

## 0. Correcciones de realidad técnica (verificadas en código)

Tres supuestos comunes son **falsos** y reordenan las prioridades. Verificados en código,
no asumidos:

1. **La velocidad real YA está plumbeada por todas las capas.** `coords.speed` de Expo →
   `LocationModel.fromJson` ([locationModel.ts:51](../../src/data/models/locationModel.ts)) →
   `toDomain()` → `GeoLocation.speed` ([GeoLocation.ts:22](../../src/domain/entities/GeoLocation.ts)).
   El pipeline está completo. Los **únicos** huecos son: `LocationStore` no expone un getter
   `speed`, y `HomeViewModel.navSpeedKmh` hace `return null` para rutas reales
   ([HomeViewModel.ts:~1201](../../src/ui/screens/Home/HomeViewModel.ts)). El fix son **dos
   getters triviales**, NO un cambio de capa domain/data. → es F0, no F3.

2. **`@rnmapbox/maps` es `^10.3.1`, no v11.** "Mapbox Standard v11" es el _estilo_ de mapa,
   no el SDK. RNMapbox v10 **no** expone navegación turn-by-turn nativa: el **Mapbox
   Navigation SDK** (guidance nativo, reroute on-device, map-matching en vivo, voz nativa)
   es un producto **separado y de pago** que `@rnmapbox/maps` no envuelve. → El enfoque
   seguirá siendo **custom**: Directions API + GPS/simulación propios + `expo-speech` +
   snapping local contra la polyline. Hay que **declararlo** y descartar explícitamente el
   Nav SDK. Consecuencia dura: **reroute/routing offline es IMPOSIBLE** con este stack.

3. **`expo-task-manager` NO está instalado.** El background location no es "subir el
   `Accuracy`": requiere instalar `expo-task-manager`, `TaskManager.defineTask` a nivel de
   módulo, `Location.startLocationUpdatesAsync`, foreground service en Android (notificación
   persistente + canal) y `UIBackgroundModes:location` en iOS (`app.config.js`) + rebuild del
   dev client. El modelo actual "reaction de MobX sobre `LocationStore`" **no sobrevive a
   background** (el JS se suspende; el task corre en un contexto headless separado). → F3 es
   **XL**, con rearquitectura del flujo coordenada→store.

---

## 1. Diagnóstico actual

Completo en intención, pero concentrado en dos god-objects y montado sobre una topología a
medio refactorizar.

**Topología (`src/ui/navigation/`).** `RootNavigator` gatea Auth vs app → `AppDrawer`. Pese
al nombre, [`AppDrawer.tsx`](../../src/ui/navigation/AppDrawer.tsx) importa
`createDrawerNavigator` (L13) pero **nunca lo usa**: monta un `createNativeStackNavigator`
plano (L48) con 12 pantallas raíz. El import de drawer es **código muerto** y el nombre
miente. [`RoutesNavigator.tsx`](../../src/ui/navigation/RoutesNavigator.tsx) y
[`GarageNavigator.tsx`](../../src/ui/navigation/GarageNavigator.tsx) replican jerarquías ya
aplanadas y **nunca se montan: huérfanos**. Los comentarios (L102-117) documentan el
workaround iOS: dos `formSheet` no apilan confiable sobre el `fullScreenModal` del Planner,
por eso `AddStop`/`CategorySublist` van como `modal`.

**Tipado.** `types.ts` define param lists serializables, pero los cruces a la raíz usan
escapes: `(navigation as any).navigate('RoutePlanner')` (HomeScreen ~L473, DestinationPreview
~L99) y `navigate(... as never)`. Sin `linking` config: cero deep-linking, cero persistencia.

**Motor turn-by-turn (en [`HomeViewModel.ts`](../../src/ui/screens/Home/HomeViewModel.ts),
~2359 líneas).** Dos modos:

- **Simulación** (solo `DEV_FAKE_DESTINATION`): tick 500 ms × 60 de aceleración, 100 km/h
  constante, proyecta con `pointAtDistanceAlong()`. Siempre on-route.
- **GPS real** (cualquier otro destino): `reaction` sobre `LocationStore.coordinates`,
  `navProgressKm` proyecta GPS crudo sobre la polyline (`distanceAlongNearest`).
  `navSpeedKmh` → `null` (ver §0.1).

**Off-route.** `OFF_ROUTE_THRESHOLD_KM=0.06`, `OFF_ROUTE_CONFIRM_TICKS=4`,
`monitorOffRoute()` + `recalculateFrom()` que sí re-llama Mapbox **pero sin retry/backoff/
aviso** y reseteando `simulatedDistanceKm=0` (discontinuidad visual + salto de step en GPS
real). Si Mapbox falla, loguea y sigue sobre ruta stale. **`recalculateFrom` además
reconstruye solo origen→destino: pierde las paradas intermedias.**

**Voz/cámara/arribo.** `expo-speech` (`es-CO`), dedup de anuncios, `isMuted` solo en memoria,
keep-awake. Cámara estilo Waze (pitch 0 → 60°, follow bearing-up, heading triangle). Arribo a
`distanceKm - navProgressKm <= 0.05`.

**Flujo search→preview→ruta→handoff (lo más sano).** Buscador en el bottom sheet →
`setPreviewPlace` en [`NavigationStore`](../../src/ui/store/NavigationStore.ts) (singleton
lean, 150 L, **sin use-cases**, solo señales) → `DestinationPreview` (formSheet) → al confirmar
emite `confirmedPlace` (one-shot) y una `reaction` del Home traza ruta + registra reciente. La
ETA del preview es **cruda** (`distancia*1.3/80`). Handoff Planner→nav vía `pendingPlannerNav`.
**Este patrón de señales one-shot es limpio y debe preservarse.**

**Funciona:** z-stack mapa+sheet sin scrim · señales one-shot cross-screen · preview→confirm
reversible · separación sim/GPS · dedup de voz · limpieza de timers/reactions en unmount.
**No funciona:** velocidad real `null` · sin background · reroute frágil que pierde paradas ·
motor atrapado en el VM · topología engañosa + 2 navegadores huérfanos.

---

## 2. Brechas vs. apps de referencia

| #   | Brecha                                                                                                         | Severidad        | Referencias                                                           |
| --- | -------------------------------------------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------- |
| G1  | Velocímetro `null` en rutas reales (solo la ruta DEV lo muestra)                                               | Alta             | Waze, Google, Uber, Calimoto                                          |
| G2  | Sin background location: la nav se congela al apagarse la pantalla                                             | Alta             | Google (lock-screen), Uber, todas las moto-apps                       |
| G3  | Reroute frágil: sin retry, sin aviso, **pierde paradas intermedias**                                           | Alta             | Google/Waze (reroute confiable); REVER falla aquí                     |
| G4  | Motor de nav dentro del god-object `HomeViewModel` (~2359 L)                                                   | Alta             | reparto de responsabilidades (todas)                                  |
| G5  | Preview pobre: solo distancia/ETA cruda; sin verdict de autonomía ni nº de tanqueos ni alternativas comparadas | Alta             | Google (preview de rutas), Calimoto/Kurviger (verdict de combustible) |
| G6  | Sin barra de progreso del viaje → reframe a **"barra de combustible del viaje"**                               | Media-Alta       | Google (trip progress)                                                |
| G7  | Velocímetro/ETA/autonomía no son glanceables (falta el dato diferencial: km al próximo tanqueo / reserva)      | Alta (seguridad) | Waze/Uber (two-zone), Beeline                                         |
| G8  | Topología engañosa + huérfanos + `as any`/`as never`                                                           | Alta (deuda)     | —                                                                     |
| G9  | Sin deep-linking ni recuperación post-crash                                                                    | Media            | Uber, Waze (Send-ETA)                                                 |
| G10 | Overlay no endurecido para casco/guantes/sol; sin modo día-sol/noche                                           | Alta (seguridad) | Uber (+contraste), Scenic (glove-friendly)                            |
| G11 | Sin selector de estilo de ruta (rápido/curvo/fuel-optimized)                                                   | Media            | REVER, Kurviger, Beeline                                              |
| G12 | Sin offline (tiles + geometría + tanqueos) — crítico en carretera rural                                        | Media-Alta       | Wikiloc, Scenic, Calimoto                                             |
| G13 | Sin distinción via/stop ni alertas de arribo a tanqueo                                                         | Media            | Scenic                                                                |
| G14 | Sin snapping → GPS crudo puede gatillar off-route falso                                                        | Media            | Google/Waze (snap local)                                              |
| G15 | Favoritos (casa/trabajo) y recientes solo locales                                                              | Media            | Uber, Google                                                          |

---

## 3. Principios de diseño

1. **Glanceabilidad para casco = restricción dura.** Un número dominante por zona, tipografía
   e iconos más grandes/contrastados que en auto, modo día-sol/noche. _(Waze two-zone; Uber
   +123% contraste de línea validado con conductores; Beeline = flecha+distancia.)_
2. **Mapa grande / UI mínima en marcha.** El mapa nunca se tapa; sin scrim; interactivo en
   todos los detents; el botón "finalizar" no puede cubrir el área de maniobra _(lección REVER)_.
3. **Destino primero, lo demás derivado.** Una afordancia dominante "¿A dónde vamos?";
   autonomía/paradas/rodada se computan después. _(Uber destination-first.)_
4. **Progressive disclosure escalonado y reversible.** buscar → preview de lugar → **preview
   de ruta de primera clase** → navegar; cada paso es un compromiso explícito; back deshace uno.
5. **Autonomía/combustible como columna vertebral diferencial.** El verdict "¿llego con este
   tanque? / N tanqueos / reserva %" aparece en el preview y como token glanceable en marcha.
6. **Voz como canal primario, pantalla como respaldo.** Cada maniobra, arribo a tanqueo y
   evento off-route se hablan; tuneado para intercom Bluetooth.
7. **Offline y batería como promesa _honesta_.** Pre-descarga de **tiles del corredor +
   geometría de ruta + POIs de tanqueo cacheados**; nav que sigue dibujando y avisando sin
   señal. **Explícitamente NO prometemos reroute sin señal** (imposible sin Nav SDK — ver §0.2):
   ante off-route sin red, se avisa claro al rider en vez de fingir un recálculo.
8. **Identidad motera.** Vocabulario colombiano ("tanqueo", no "gas station"), estilo de ruta
   curvo/scenic, rodada grupal como extensión del Send-ETA.

---

## 4. Plan faseado

Cada fase respeta CAS: pantalla en su carpeta con VM 1:1, Screen solo composición + StyleSheet,
**un VM no depende de otro VM** (se extrae a Store/UseCase por DI), navegación tipada, tests sin
contenedor (instancia directa con `jest.fn()`, cobertura global ≥ 70%).

**Orden recomendado:** `F0 → (F1 ∥ F4-parcial) → F2a → F3 → F2b → F5`. F1 y F3 son las dos
fases obligatorias (extracción del motor y nav real).

---

### F0 — Quick wins de alto impacto / bajo riesgo · **S**

**Objetivo.** Limpiar deuda barata, encender el velocímetro real y endurecer glanceabilidad sin
tocar el motor. _(Uber: leverage cosmético; Waze/Beeline: un número por zona.)_

- **ui/navigation:** borrar el import muerto `createDrawerNavigator` (AppDrawer.tsx:13);
  eliminar `RoutesNavigator.tsx` y `GarageNavigator.tsx` (huérfanos, viven en git); renombrar
  símbolo `AppDrawer`→`AppStackNavigator` y `AppDrawerParamList`→`AppStackParamList` (sin
  cambiar topología). El rename y el re-tipado tocan los **mismos** archivos
  (HomeScreen/DestinationPreview/types) → hacerse **juntos** o el typecheck queda roto a mitad.
  Reemplazar los `(navigation as any)`/`as never` por `CompositeNavigationProp` correcto que
  incluya el param list raíz.
- **ui/store + ui/screens (velocímetro real, G1):** añadir `get speed(): number | null` a
  `LocationStore` (lee `this.isLocationResponse?.speed`); en `HomeViewModel.navSpeedKmh`
  reemplazar `return null` por leer `locationStore.speed` convertido **m/s → km/h** (`*3.6`).
  **Manejar `null`/`-1`** (Expo entrega velocidad ausente como `null` o `-1` a baja velocidad/
  arranque en frío) con fallback a derivada posición/tiempo; sin esto el velocímetro parpadea
  a 0/blanco en semáforos. **NO tocar** `GeoLocation`/`LocationModel`/`LocationRepositoryImpl`
  (ya propagan speed).
- **ui/screens (glanceabilidad):** subir tamaño/contraste de `TurnBanner` y la barra inferior;
  garantizar que "finalizar" no tape la maniobra; localizar labels a "tanqueo".
- **config:** mover `NAV_*`/`SIM_*`/`OFF_ROUTE_*` del top-level de `HomeViewModel` a
  `src/config/navigation.ts` (la regla prohíbe constantes de config en el Screen/VM).

**Tests.** Conversión speed m/s→km/h con `null`/`-1`; render de TurnBanner agrandado; typecheck
verde tras el rename. **Hecho cuando:** velocímetro ≠ null en rutas reales, cero `as any`/`as
never` en navegación, huérfanos borrados, lint/typecheck/format verdes.

**Dependencias:** ninguna (base de todo).

> **Prerrequisito que NO existe:** persistir `isMuted` (y luego `rideStyle`) **no puede** ir por
> AsyncStorage directo desde el VM/Store (CAS lo prohíbe). Requiere un **`PreferencesRepository`**
> (contrato en `domain/repositories/` + impl en `data/` + UseCases get/set). No existe hoy.
> Crearlo aquí (mini-slice) o reusar el patrón de `RouteDraftService`. Hasta entonces, `isMuted`
> persistente queda **fuera de F0**.

---

### F1 — Extraer el motor de navegación a `NavigationSessionStore` + UseCases · **L** ⟵ CLAVE

**Objetivo.** Sacar las ~500 líneas del motor del `HomeViewModel` god-object hacia un Store
singleton dedicado + UseCases, alineando con screen-boundary (el motor es estado que debe
sobrevivir al mount de la pantalla).

> **Nota honesta de esfuerzo:** este Store **no** es "como `NavigationStore`" (ese es un buzón
> de señales sin use-cases). Es un **store-orquestador** (varios UseCases inyectados + reaction
> sobre el feed GPS + `setInterval` del simulador + ciclo start/stop/dispose), más cercano a
> `PlannerStore`/`SyncCoordinator`. Hay que registrarlo en Inversify (`TYPES` + `di.ts`) y mover
> una reaction viva sin romper su ciclo de vida. **L grande**, no extracción mecánica.

- **domain/ (UseCases nuevos, lógica pura testeable):**
  - `SnapToRouteUseCase` — proyecta GPS sobre la polyline (mueve `distanceAlongNearest`/
    `pointAtDistanceAlong` de `geoMath` detrás de un UseCase). Snapping **local**, NO la Mapbox
    Map Matching API (REST, 100 coords/req, rate-limited, sin offline — inviable por tick).
  - `ComputeNextManeuverUseCase` — saca la lógica de `currentTurn` desde `NavigationStep[]`.
  - `DetectOffRouteUseCase` — umbral + confirm-ticks.
  - `RerouteUseCase` — recálculo desde la posición actual reusando `CalculateDirectionsUseCase`,
    **con retry/backoff**, **preservando `rideType` y las paradas intermedias** (cierra G3) y
    **re-anclando** `navProgressKm` sobre la nueva polyline en vez de resetear a 0.
- **ui/store:** `NavigationSessionStore` (singleton, inyectable) que posee `isNavigating`,
  `navProgressKm`, `navSpeedKmh`, `currentTurn`, `isArrived`, `offRouteTicks`, el tick de
  simulación y la reaction del feed GPS; orquesta los UseCases. **Decidir** cómo el Store elige
  entre simulador (`setInterval`, muere en background) y GPS real (futuro background task) y
  testear la transición.
- **ui/screens:** `HomeViewModel` deja de poseer el motor; expone getters proxy para el render.
  El handoff `pendingPlannerNav` lo consume el Store. **No** se crea pantalla nueva (eso es
  decisión futura).

**Tests.** Cada UseCase con `jest.fn()` (snap; off-route con debounce de 4 ticks; reroute
fallo→retry→éxito **conservando paradas**). Store: ciclo start/stop/dispose; una lectura GPS
avanza `navProgressKm`; off-route confirmado dispara `RerouteUseCase`. **Hecho cuando:**
`HomeViewModel` baja sustancialmente de líneas, el motor vive en el Store, E2E Home/routes verde.

**Dependencias:** F0. Habilita F2/F3/recuperación-de-F4.

---

### F2a — Preview de ruta de primera clase · **M**

**Objetivo.** Hacer del preview el momento donde el rider ve autonomía, nº de tanqueos y
alternativas comparadas **antes** de iniciar. _(Google: preview de alternativas; Calimoto/
Kurviger: verdict de combustible.)_

- **domain/:** reusar `EstimateRouteFuelUseCase`/`EstimateAutonomyUseCase`/
  `FindFuelStationsUseCase` para producir un `RoutePreviewSummary` (distancia, **ETA real de
  Mapbox** —no `*1.3/80`—, verdict "llego / N tanqueos / reserva %", posiciones de tanqueo).
- **data/:** pedir `alternatives=true` + `steps=true` (verificar que la entidad
  `RouteDirections` mapea **steps por alternativa**, hoy probablemente solo la principal;
  infla el payload ~3×).
- **ui/screens:** **computar el verdict vía UseCase inyectado en `DestinationPreviewViewModel`
  (o en `NavigationSessionStore`) — NO leyendo `PlannerInsightsStore`** (es contexto Planner;
  acoplaría dos features). Mostrar polyline, verdict, nº/posición de tanqueos, alternativas
  (recomendada = la que minimiza riesgo de quedarse sin gasolina, otras atenuadas), CTA grande
  "Iniciar ruta" en zona del pulgar.

**Tests.** VM del preview: verdict "llega/no llega"; orden de alternativas por riesgo de
combustible. **Dependencias:** F1.

---

### F3 — Navegación real: GPS, background, reroute confiable · **XL** ⟵ CLAVE

**Objetivo.** Reemplazar la simulación por nav real y batir a REVER en su debilidad (no
reroutea). Enfoque **custom** (ver §0.2): Directions API + GPS propio + `expo-speech` + snapping
local. **Sin** Mapbox Navigation SDK.

- **data/ (trabajo nativo, no trivial):** subir `LocationServiceImpl` a
  `Accuracy.BestForNavigation` y bajar `timeInterval` **solo durante nav** (en Android gana el
  menor de `timeInterval`/`distanceInterval`). **Background:** instalar **`expo-task-manager`**,
  `TaskManager.defineTask` a nivel módulo, `Location.startLocationUpdatesAsync`, **foreground
  service Android** (notificación + canal) y `UIBackgroundModes:location` iOS en `app.config.js`
  → **rearquitectar** el flujo coordenada→store para contexto headless (la reaction MobX no
  sobrevive a JS suspendido). Rebuild del dev client; validar en device (no Expo Go).
- **ui/store:** `navSpeedKmh` ya real (de F0); `RerouteUseCase` (de F1) ejercido con GPS real,
  con retry/backoff + aviso (toast + voz) y re-anclaje de progreso (no reset a 0).
- **ui/screens:** velocímetro real; estados explícitos overview vs guidance; recentrar agrandado.

**Tests.** Reroute con fallo persistente → backoff → aviso; re-anclaje sin salto a 0; permiso
background (mock). **Nota:** el `TaskManager.defineTask` headless corre fuera del árbol React y
**no** se testea con render — definir estrategia para la ruta de datos background→store.

**Riesgos.** Batería (GPS high + pantalla encendida + keep-awake): medir y degradar accuracy en
tramos rectos largos. Permisos background: iOS "When In Use"→"Always" en **dos pasos**;
Android 10+ exige `ACCESS_BACKGROUND_LOCATION` runtime. **Hipótesis a verificar** contra docs
v54 (`sdk/location`, `sdk/task-manager`) **en device**. **Dependencias:** F1.

---

### F2b — Token de combustible en vivo (`JourneyFuelBar`) · **S-M**

**Objetivo.** El verdict de combustible **en marcha**: barra de combustible del viaje con el
punto de reserva y el próximo tanqueo, como token glanceable (Principio 5/G6/G7). Depende del
progreso de nav real → **va después de F3** (separado de F2a a propósito; en F2a el verdict es
estático). **Dependencias:** F2a + F3.

---

### F4 — Topología, tipado fuerte y deep-linking · **M**

**Objetivo.** Cerrar la deuda de navegación y habilitar linking (compartir-para-unirse,
recuperación post-crash). _(Uber/Waze: status out-of-app, Send-ETA.)_

- **ui/navigation:** **decidir la topología definitiva ANTES de borrar nada estructural** — o un
  `createDrawerNavigator` real si el diseño lo pide, o un `RootStack` honesto con `Screen.Group`
  por contexto en vez de 12 pantallas planas. Tipar todos los param lists. Añadir `linking`
  (react-navigation v7 ✓) para `RouteDetail`/`JoinRoute`/`RoutePlanner`.
- **Auth gating (faltaba):** `RootNavigator` gatea Auth vs App; un deep-link estando
  **no-autenticado** debe **guardar la URL pendiente y resolverla post-login**.
- **Persistencia de navegación (con cuidado):** **excluir** del state persistido las señales
  one-shot en memoria (`pendingPlannerNav`, `confirmedPlace`) o se restauran huérfanas; y la
  recuperación de una **sesión de nav** depende de que el estado viva en `NavigationSessionStore`
  (F1), no en el VM.

**Tests.** Parsing URL→params tipados; back/dismiss a través del mix formSheet/modal/
fullScreenModal (la regresión a evitar). **Dependencias:** F0 (linking a JoinRoute/RouteDetail
es independiente de F1-F3; linking que **restaure nav** depende de F1).

---

### F5 — Identidad motera: estilo de ruta, via/stop, offline, voz primaria · **M-L** (visión)

- **domain/:** `rideStyle` (rápido/curvo/fuel-optimized) en `CalculateDirectionsUseCase`; flag
  `via`/`stop` por `Waypoint`; reorden geográfico al insertar (`OptimizeRouteOrderUseCase` ya
  existe).
- **data/:** descarga de **tiles** de regiones offline de Mapbox (corredor) — **límite de tile
  count**, y **no** incluye Directions ni FuelStation, que hay que cachear aparte. Recordatorio
  §0.2/Principio 7: **reroute offline no es posible**; offline = ver/seguir + avisar, no recalcular.
- **ui/store:** `PlannerStore` persiste `rideStyle` (vía `PreferencesRepository` de F0); alertas
  de arribo a "stop" silenciando "via".
- **ui/screens:** selector de estilo en el Planner; AddStop elige via/stop; voz primaria tuneada
  para intercom; botón "agregar tanqueo más cercano" de una pulsación.

**Dependencias:** F1, F2, F3.

---

## 5. Estados degradados + telemetría (transversal, no opcional)

Para una app de moto en carretera rural, esto es **seguridad**, no nice-to-have. Definir como
entregables nombrados (repartidos en F0/F3):

- **Estados degradados:** sin fix GPS (túnel) · sin red para reroute (offline) · `speed` null
  ≥ 30 s · batería crítica · **permiso background denegado pero foreground OK** (degradar a nav
  que muere en background **con aviso**). Cada uno con su UI/voz.
- **Telemetría:** instrumentar reroutes fallidos, off-route falsos, divergencia ETA y crashes
  del background task. **Sin esto, las métricas de §6 no se pueden medir.**
- **i18n/a11y (deuda a nombrar):** hoy los strings están hardcoded en español (no hay sistema
  i18n). Soportar Dynamic Type / escalado de fuente (rider présbita), VoiceOver/TalkBack, y
  fallback de voz si `es-CO` no está en el device.

---

## 6. Métricas de éxito

- **Glanceabilidad:** un número dominante por zona; lectura objetivo < 1 s; contraste de línea y
  tipografía medibles vs baseline; validar con casco/guantes/sol en device.
- **Pasos para arrancar:** reciente/guardada en ≤ 2 taps; preview→iniciar en 1 CTA en zona del pulgar.
- **Precisión:** velocímetro ≠ null en 100% de rutas reales; off-route falsos reducidos
  (post-snapping); reroute con retry **preservando paradas**; ETA de preview dentro de ±Y% de la
  ETA real de Mapbox (hoy diverge por `*1.3/80`).
- **Diferenciador:** verdict "llego/N tanqueos/reserva" en 100% de previews; barra de combustible
  con punto de reserva visible en marcha.
- **Robustez:** nav sobrevive a pantalla apagada/background sin congelarse; corredor offline
  navegable sin señal (tiles+geometría+POI), con aviso claro de no-reroute.
- **Arquitectura/CAS:** `HomeViewModel` bajo un umbral de líneas acordado; motor fuera del VM
  (en `NavigationSessionStore`); cero `as any`/`as never` en navegación; cobertura ≥ 70%; E2E verde.

---

## 7. Hipótesis a verificar contra docs Expo SDK v54 (antes de implementar)

1. `Accuracy.BestForNavigation` + background location task (`expo-location` + `expo-task-manager`,
   foreground service Android, `UIBackgroundModes` iOS).
2. Descarga de regiones offline de `@rnmapbox/maps` v10 (límites de tile count).
3. `alternatives=true` + `steps=true` en Mapbox Directions v5 → steps por alternativa (sí lo hace;
   confirmar el mapeo en la entidad `RouteDirections`).
4. `linking` config en `NavigationContainer` con react-navigation v7 + auth gating.
5. Que el snapping local contra la polyline (ya hay `distanceToPolylineKm`) basta para G14 sin la
   Map Matching API REST.

> **Recordatorio de stack:** Mapbox **no** corre en Expo Go; toda validación de mapa/nav/background
> es en development build (`expo start --dev-client -c`). Secrets vía `app.config.js`/env.
