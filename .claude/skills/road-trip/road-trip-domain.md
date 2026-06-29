---
name: road-trip-domain
description: Domain context for the Road Trip app (MVP de planeación de rutas para moteros) and where this project intentionally deviates from the stack skills. Use it together with the react-native skills whenever you add or change a feature.
---

<purpose>
Road Trip aplica el clean-architecture-stack (MVVM + MobX + Inversify) a una app móvil
para moteros: planear rutas, estimar autonomía según la moto y el viaje, y sugerir paradas
de tanqueo. Esta skill aporta el contexto de dominio que las skills genéricas del stack no
tienen, y registra las divergencias intencionales del proyecto frente a esas skills para que
las copias sincronizadas y la realidad del código no se contradigan.
</purpose>

<when_to_use>

- Antes de tocar cualquier feature de Road Trip (úsala junto con [[clean-architecture-rn-expo-mvvm]]).
- Al añadir entidades, UseCases o servicios de dominio motero (autonomía, tanqueo, rutas, stats).
- Para confirmar dónde vive algo en ESTE proyecto cuando difiere de la convención del stack.
  </when_to_use>

<rules>

### Stack confirmado

- **Mapas:** Mapbox vía `@rnmapbox/maps`. Requiere development build (no Expo Go).
- **Backend:** Firebase (Auth + Firestore). Capa data: `RepoImpl → Service → Manager → Firebase`.
- **Navegación:** React Navigation (native-stack + bottom-tabs). Pantallas en
  `src/ui/screens`; navegadores en `src/ui/navigation`.
- **Estado:** MobX. ViewModels canónicos (`updateLoadingState` + `handleError`).
- **DI:** Inversify. Registrar todo en `src/config/types.ts` y `src/config/di.ts`.

### Capas y convenciones del proyecto

- Contratos de servicios de datos (los que devuelven Models y hablan con Firebase/HTTP)
  viven en `src/data/services/` junto a su impl — NO en `domain/services/`. El dominio solo
  conoce las interfaces de `domain/repositories/`.
- **Managers de transporte** en `src/data/network/`: `firebase.ts` (SDK de Firebase) y
  `FetchHttpManager.ts` (implementa `HttpManager` de `domain/services/`, envuelve `fetch`).
  Los services HTTP (Mapbox, Wikipedia) inyectan `HttpManager`, no llaman `fetch` directo.
- Servicios de dominio puros (sin infraestructura) pueden vivir como UseCase con lógica real
  (ej. `EstimateAutonomyUseCase`).
- Cada feature es un slice vertical: entity → repository (domain) → model + service + repoImpl
  (data) → useCases → ViewModel → Screen → DI. Ver [[feature-scaffold-rn]].

### Convenciones de UI alineadas con el stack

- **Stores globales en `src/ui/store/`** (`SessionStore`, `LocationStore`, `TripPartyStore`),
  bindeados singleton, `@injectable()` + `makeAutoObservable`. Ver [[realtime-and-global-state-rn]].
- **Hook `useViewModel`** (`src/ui/hooks/useViewModel.ts`): las pantallas obtienen su
  ViewModel/Store con `useViewModel<T>(TYPES.X)`, no con `container.get` inline.
- **Zod** para validación de input: `src/config/env.ts` valida la config al boot, y los
  formularios usan esquemas en `src/ui/schemas/` (auth, motorcycleForm, joinRoute). Las
  invariantes de negocio siguen en entidades/UseCases, no en los esquemas.
- **Streams:** `SubscriptionUseCase` (en `src/domain/useCases/UseCase.ts`) y
  `ObserveTripPartyUseCase` siguen el patrón de [[realtime-and-global-state-rn]].

### Particularidad del proyecto

- `src/data/services/MotoStatsService.ts` lee la URL de la búsqueda web de `ENV.motoStatsApiUrl`
  (config validada por Zod en `src/config/env.ts`, default `''`). Vacía = búsqueda web
  deshabilitada → degrada al dataset local (`src/data/datasets/motoStatsDataset.ts`). Inyecta
  `HttpManager` igual; activar la Cloud Function = setear `MOTO_STATS_API_URL` por entorno
  (vía `app.config.js`), sin tocar código.

### Entidades de dominio (MVP)

- `Rider` — usuario/motero (cuenta Firebase).
- `Motorcycle` — moto registrada (tanque, rendimiento km/L, tipo de gasolina
  `corriente`/`extra`). `MotorcycleSpecs` — ficha técnica resuelta.
- `Route` + `Waypoint` — ruta con tipo (`group`/`offroad`/`highway`/`longtrip`).
  `RouteDirections` — trazado calculado por Mapbox.
- `RidingConditions` — variables del viaje (acompañado, maletas, ritmo).
- `AutonomyEstimate` + `FuelStop` — resultado del cálculo de autonomía.
- `FuelStation` — estación cercana a una parada de tanqueo.

### Reglas de negocio clave

- **Autonomía:** `EstimateAutonomyUseCase` es lógica pura. Aplica factores por
  acompañante/maletas/ritmo y por tipo de rodada, reserva un 12% del tanque y ubica las
  paradas de tanqueo sobre la geometría de la ruta.
- **Stats de moto:** `MotoStatsService` intenta una búsqueda web (endpoint configurable,
  idealmente una Cloud Function) y degrada a un dataset curado local
  (`src/data/datasets/motoStatsDataset.ts`).
- **Estaciones:** `FuelStationService` usa la Mapbox Search Box category API para POIs reales;
  los precios son de referencia (no por estación).

### Pendiente / fuera del MVP

- Rodadas grupales con ubicación en vivo (party + tracking en tiempo real).
- Backend real de scraping de stats (hoy: dataset local + hook HTTP).
- Fuente real de precios de combustible por estación.

### Secretos / configuración

`app.json > expo.extra` y el plugin `@rnmapbox/maps` contienen placeholders `SET_*`.
Reemplazar por tokens reales (Mapbox + Firebase) antes de buildear. `src/config/env.ts`
centraliza la lectura de esa configuración.

</rules>

<see_also>

- [[clean-architecture-rn-expo-mvvm]] — reglas de capas, DI y ViewModel canónico.
- [[feature-scaffold-rn]] — cómo crear un slice vertical end-to-end.
- [[design-system-rn]] — tokens y componentes de UI.
- [[realtime-and-global-state-rn]] — streams, stores globales y sync.
- [[unit-testing-clean-architecture]] — contrato de tests obligatorio por feature.
- [[pr-checklist-clean-architecture]] — checklist de PR.
</see_also>
