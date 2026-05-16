---
name: road-trip-domain
description: Domain context for the Road Trip app (MVP de planeacion de rutas para moteros). Use it together with the react-native architecture skills when adding or changing features.
---

# Skill — Road Trip domain

Road Trip es una app movil (Expo + React Native) para moteros: planear rutas,
estimar autonomia segun la moto y el viaje, y sugerir paradas de tanqueo.
Sigue el clean-architecture-stack (MVVM + MobX + Inversify + Clean Architecture).
Lee siempre las skills de `skills/react-native/` antes de tocar codigo.

## Stack confirmado

- **Mapas:** Mapbox via `@rnmapbox/maps`. Requiere development build (no Expo Go).
- **Backend:** Firebase (Auth + Firestore). Capa data: `RepoImpl -> Service -> Firebase`.
- **Navegacion:** React Navigation (native-stack + bottom-tabs). Las pantallas
  viven en `src/ui/screens`; los navegadores en `src/ui/navigation`.
- **Estado:** MobX. ViewModels canonicos (`updateLoadingState` + `handleError`).
- **DI:** Inversify. Registrar todo en `src/config/types.ts` y `src/config/di.ts`.

## Capas y convenciones del proyecto

- Contratos de servicios de datos (los que devuelven Models y hablan con
  Firebase/HTTP) viven en `src/data/services/` junto a su impl — NO en
  `domain/services/`. El dominio solo conoce las interfaces de
  `domain/repositories/`.
- Servicios de dominio puros (sin infraestructura) pueden vivir como UseCase
  con logica real (ej. `EstimateAutonomyUseCase`).
- VMs globales no asociadas a una pantalla: `src/ui/viewModels/`
  (ej. `SessionViewModel`, singleton).
- Cada feature es un slice vertical: entity -> repository (domain) ->
  model + service + repoImpl (data) -> useCases -> ViewModel -> Screen -> DI.

## Entidades de dominio (MVP)

- `Rider` — usuario/motero (cuenta Firebase).
- `Motorcycle` — moto registrada (tanque, rendimiento km/L, tipo de gasolina
  `corriente`/`extra`). `MotorcycleSpecs` — ficha tecnica resuelta.
- `Route` + `Waypoint` — ruta con tipo (`group`/`offroad`/`highway`/`longtrip`).
  `RouteDirections` — trazado calculado por Mapbox.
- `RidingConditions` — variables del viaje (acompanado, maletas, ritmo).
- `AutonomyEstimate` + `FuelStop` — resultado del calculo de autonomia.
- `FuelStation` — estacion cercana a una parada de tanqueo.

## Reglas de negocio clave

- Autonomia: `EstimateAutonomyUseCase` es logica pura. Aplica factores por
  acompanante/maletas/ritmo y por tipo de rodada, reserva un 12% del tanque y
  ubica las paradas de tanqueo sobre la geometria de la ruta.
- Stats de moto: `MotoStatsService` intenta una busqueda web (endpoint
  configurable, idealmente una Cloud Function) y degrada a un dataset curado
  local (`src/data/datasets/motoStatsDataset.ts`).
- Estaciones: `FuelStationService` usa la Mapbox Search Box category API para
  POIs reales; los precios son de referencia (no por estacion).

## Pendiente / fuera del MVP

- Rodadas grupales con ubicacion en vivo (party + tracking en tiempo real).
- Backend real de scraping de stats (hoy: dataset local + hook HTTP).
- Fuente real de precios de combustible por estacion.

## Secretos / configuracion

`app.json > expo.extra` y `@rnmapbox/maps` plugin contienen placeholders
`SET_*`. Reemplazar por tokens reales (Mapbox + Firebase) antes de buildear.
`src/config/env.ts` centraliza la lectura de esa configuracion.
