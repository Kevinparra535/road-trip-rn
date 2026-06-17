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
- El Manager de transporte (Firebase) vive en `src/data/network/firebase.ts`.
- Servicios de dominio puros (sin infraestructura) pueden vivir como UseCase con lógica real
  (ej. `EstimateAutonomyUseCase`).
- Cada feature es un slice vertical: entity → repository (domain) → model + service + repoImpl
  (data) → useCases → ViewModel → Screen → DI. Ver [[feature-scaffold-rn]].

### Divergencias intencionales frente a las skills del stack

Estas son diferencias reales del código frente a las skills sincronizadas. Respétalas al
trabajar aquí; si vas a cerrarlas, hazlo a propósito y actualiza esta nota.

- **Stores globales en `src/ui/viewModels/`**, no en `src/ui/store/` como pide
  [[realtime-and-global-state-rn]]. Hoy existen `SessionViewModel`, `LocationStore` y
  `TripPartyStore` ahí (singletons). Siguen siendo `@injectable()` + `makeAutoObservable`.
- **Sin hook `useViewModel`.** Las pantallas instancian el ViewModel con
  `useMemo(() => container.get(...), [])` inline, no con `useViewModel(TYPES.X)`.
- **Sin Zod.** `src/config/env.ts` lee la config sin validación Zod, y aún no hay
  `src/ui/schemas/` para formularios. La recomendación de Zod en [[clean-architecture-rn-expo-mvvm]]
  es objetivo, no estado actual.
- **Streams ya en uso:** `SubscriptionUseCase` (en `src/domain/useCases/UseCase.ts`) y
  `ObserveTripPartyUseCase` ya siguen el patrón de [[realtime-and-global-state-rn]].

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
- [[realtime-and-global-state-rn]] — streams, stores globales y sync (ver divergencias arriba).
- [[unit-testing-clean-architecture]] — contrato de tests obligatorio por feature.
- [[pr-checklist-clean-architecture]] — checklist de PR.
</see_also>
</content>
