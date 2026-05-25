# MVP — Planeación de Ruta

> **Status**: plan aprobado (decisiones de producto cerradas). Pendiente: diseño en Pencil + implementación por slices.

## 1. Contexto y visión

La planeación de ruta es **el fuerte del MVP** de Road Trip. No es una pantalla más: es el corazón del producto. La visión, en una frase:

> El rider planea un viaje (solo o grupal) con paradas semánticamente clasificadas (arranque / comida / tanqueo / turismo / descanso / destino), comparte la ruta con su party por código, y el sistema calcula el plan de tanqueo considerando la moto de cada miembro.

### Diferenciadores

1. **Tramos coloreados por tipo de parada**. El feedback visual es instantáneo: el rider mira el mapa y entiende el viaje sin leer texto.
2. **Multi-rider con motos heterogéneas**. El cálculo de tanqueo se hace contra la **moto del party con menos autonomía** (lower bound). Es el problema real que ningún competidor resuelve: ir en grupo con motos de distinto rango.
3. **Sugerencias semánticas**. "¿Querés tanquear en Sopó?" "¿Comer en La Calera?" — sugerimos lugares relevantes según el tipo de parada y la posición en la ruta.
4. **Compartir por código/link**. La ruta es un artefacto compartible, no un estado local. Otro rider la abre, se suma al party, y desde ese momento ve los cambios.

### Ejemplo canónico (citado del usuario)

> Arrancamos en Bogotá, paramos a comer en La Calera, recomendamos visitar Sopó (o tanquear en Sopó si la autonomía lo demanda), ruta termina en Catedral de Sal en Zipaquirá.

3 paradas + arranque + destino, con tipos heterogéneos (`food → tourism|fuel → destination`), cada tramo con su color, ruta compartible con un party de N riders.

---

## 2. Decisiones de producto (cerradas)

| #   | Decisión                          | Implicancia                                                                                                        |
| --- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| D1  | **Scope MVP = slices C.1–C.6**    | Tramos + party + share + cálculo colectivo. Diferimos edición colaborativa real-time (C.7) y voz (C.8).            |
| D2  | **`StopKind` vive en `Waypoint`** | El color del SEGMENTO entre 2 waypoints se deriva del kind del waypoint destino. Modelo simple, sin entidad nueva. |
| D3  | **Detección híbrida del kind**    | Categoría → fija el kind directo. Texto libre → infiere de Mapbox category. Usuario puede editar.                  |
| D4  | **Backend = Firestore + rules**   | Ruta + party + shareCode viven en Firestore. Sin cloud functions custom. `onSnapshot` para sync.                   |

---

## 3. Modelo de dominio extendido

### 3.1. Tipos nuevos

```ts
// src/domain/entities/StopKind.ts (nuevo)
export type StopKind =
  | 'start' // Punto de arranque (verde)
  | 'food' // Alimentación (amarillo)
  | 'fuel' // Tanqueo (naranja oscuro)
  | 'tourism' // Turismo / visita / atracción (morado)
  | 'rest' // Descanso / mirador / parador (azul claro)
  | 'destination'; // Punto final (rojo / acento)
```

Colores asignados en `Colors.ts` bajo namespace `Colors.stopKind.{food,fuel,tourism,rest,destination}` siguiendo la regla del design system (sin hex inline).

### 3.2. Cambios a entidades existentes

**`Waypoint`** (`src/domain/entities/Waypoint.ts`):

```ts
// Antes
kind: 'start' | 'stop' | 'destination';

// Después
kind: StopKind;
// + opcional: `mapboxCategory?: string` para guardar el category original del POI
// + opcional: `userOverrideKind?: boolean` para saber si el rider lo editó manualmente
```

Migración: los `Waypoint` actuales con `kind: 'stop'` se mapean a `kind: 'food'` por default (heurística mínima — el plan de migración real lo decidimos en C.1).

**`Route`** (`src/domain/entities/Route.ts`):

```ts
// Agregar:
shareCode?: string;            // codigo corto para compartir (`r-A3K9-7M2P`)
sharePermissions?: 'read' | 'edit';  // default 'read' al compartir
partyId?: string;              // id del TripParty si la ruta es colaborativa
isSolo: boolean;               // si es solo o grupal (orthogonal a rideType)
```

### 3.3. Entidades nuevas

```ts
// src/domain/entities/TripParty.ts (nuevo)
export type TripParty = {
  id: string;
  routeId: string;
  ownerId: string; // rider que creó el party
  members: PartyMember[];
  createdAt: Date;
  // Estado del party
  status: 'planning' | 'navigating' | 'completed';
};

// src/domain/entities/PartyMember.ts (nuevo)
export type PartyMember = {
  riderId: string;
  riderName: string;
  riderInitials: string;
  motorcycleId: string;
  motorcycleName: string;
  tankCapacityL: number;
  consumptionKmPerL: number;
  joinedAt: Date;
  // Permisos del miembro dentro del party
  role: 'owner' | 'editor' | 'viewer';
};
```

### 3.4. Repositorios y use cases nuevos (vista global)

```
src/domain/repositories/
├── TripPartyRepository.ts           # CRUD + observar cambios del party
├── RouteShareRepository.ts          # generar/resolver shareCode

src/domain/useCases/
├── CreateTripPartyUseCase/          # owner crea party desde una ruta
├── JoinTripPartyUseCase/            # rider con shareCode se suma al party
├── LeaveTripPartyUseCase/
├── GenerateRouteShareCodeUseCase/   # crea/regenera el shareCode
├── ResolveRouteShareCodeUseCase/    # lee la ruta + party desde un código
├── EstimatePartyFuelPlanUseCase/    # tanqueo colectivo (lower-bound moto débil)
├── SearchPlacesByCategoryUseCase/   # busca POIs por categoría a lo largo de la ruta
├── InferStopKindUseCase/            # mapea Mapbox category → StopKind
```

### 3.5. Capa data (implementaciones)

```
src/data/repositories/
├── TripPartyRepositoryImpl.ts       # Firestore con onSnapshot
├── RouteShareRepositoryImpl.ts      # Firestore + index por shareCode

src/data/services/
├── ShareCodeService.ts              # genera códigos cortos únicos (`r-A3K9-7M2P`)
├── PlaceCategorySearchService.ts    # wraps Mapbox Search by category
```

### 3.6. Firestore — colecciones nuevas

```
/routes/{routeId}                 # ya existe; agregar shareCode, partyId
  shareCode: string (indexed, unique)
  ...
/parties/{partyId}                # nuevo
  routeId: string
  ownerId: string
  members: PartyMember[]
  status: ...
/shareCodes/{shareCode}           # lookup index: shareCode → routeId
  routeId: string
  createdAt: Timestamp
```

Reglas de Firestore (resumen):

- `/routes/{routeId}`: lectura permitida si `request.auth.uid` está en `party.members[].riderId` O si la ruta es del propio rider (`riderId`)
- `/parties/{partyId}`: lectura para members; escritura solo para owner (o editores para campos limitados)
- `/shareCodes/{shareCode}`: lectura pública (necesario para resolver el código), escritura solo Cloud Function o regla restringida (anti-flood)

---

## 4. Pantallas — Pencil (frames existentes + por crear)

### 4.1. Frames a actualizar

| Frame Pencil                          | Cambios necesarios                                                                                                                                   |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `11 - Planear ruta (formSheet full)`  | **Timeline coloreado por `StopKind`**. Cada parada con su ícono + color. CTA "Iniciar navegación" condicional según si la ruta es del rider o party. |
| `3 - Home Ruta Asomado`               | Stats card sin cambio mayor, pero los dots del mapa pasan a usar colores por `StopKind`. Agregar chip "Party (3)" si aplica.                         |
| `3b - Agregar parada (Quick + Voice)` | El grid de categorías ya muestra Gasolinera/Comida/Café/Baño — **agregar Turismo y Mirador**. Voz queda para C.8.                                    |
| `12 - Detalle de ruta (formSheet)`    | Agregar acción **"Compartir ruta"** que abre el sheet de share (frame nuevo abajo). Mostrar miembros del party si existe.                            |

### 4.2. Frames nuevos por crear en Pencil

| Frame nuevo                     | Rol                                                                                                                      | Slice |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----- |
| `Selector tipo de viaje`        | Onboarding del flow: ¿solo o grupal? × ¿carretera, offroad, largo?                                                       | C.2   |
| `Compartir ruta`                | Sheet con código grande + QR + botón copiar link + selector de permisos                                                  | C.4   |
| `Party — Miembros`              | Lista de riders con nombre, iniciales, moto, autonomía. Botón "Invitar" + indicador "Esperando…"                         | C.5   |
| `Unirse a party`                | Pantalla para pegar/escanear código, ingresar nombre + elegir moto del garage                                            | C.5   |
| `Plan de tanqueo del party`     | Sub-card o sheet del Planear ruta mostrando paradas de tanqueo sugeridas con cálculo del par `(moto débil, moto fuerte)` | C.6   |
| `Cambios pendientes` (post-MVP) | Cuando otro miembro edita, banner "Juan agregó una parada" con ✓ / ✗                                                     | C.7   |

---

## 5. Slices de implementación (orden, dependencias, tamaño)

### Slice C.1 — `StopKind` + colores por segmento (S, 1–2 días)

**Dominio:**

- `src/domain/entities/StopKind.ts` (nuevo)
- `src/domain/entities/Waypoint.ts`: `kind: StopKind` + `mapboxCategory?` + `userOverrideKind?`
- `src/domain/useCases/InferStopKindUseCase/` (nuevo, puro mapping)

**Data:**

- `src/data/models/waypointModel.ts`: actualizar `fromJson`/`toJson` (cubierto vía RouteModel)
- `src/data/models/routeModel.ts`: handle migración de `kind: 'stop'` → `food` o `userOverrideKind: false`

**UI:**

- `src/ui/styles/Colors.ts`: agregar `Colors.stopKind.{food,fuel,tourism,rest,destination}`
- `src/ui/screens/Home/HomeViewModel.ts` `routeLines`: en vez de una línea uniforme, generar **N líneas** (una por segmento) con color del waypoint destino
- `src/ui/screens/Home/HomeScreen.tsx`: render N `Mapbox.LineLayer` (uno por segmento). `slot="top"` ya está.

**Tests:**

- `InferStopKindUseCase` con categorías Mapbox conocidas
- `routeLines` getter genera segmentos con colores correctos
- Migración: ruta legacy con `kind: 'stop'` carga sin romper

**Riesgo bajo, no rompe nada existente.**

---

### Slice C.2 — Frame 11 Planear ruta rediseñado (M, 4–5 días)

**Pre-requisito**: Pencil actualizado con timeline coloreado (Fase B).

**Domain/Data**: ninguno nuevo (reusa C.1).

**UI:**

- `src/ui/screens/Routes/RoutePlannerScreen.tsx`: rediseño completo siguiendo frame 11
  - Header: "Planear ruta" + X (cerrar)
  - Mapa thumbnail (no interactivo) — reusar Mapbox Static Images como en `DestinationPreview`
  - Timeline coloreado: lista vertical con dot del color del `StopKind` + nombre + sub-ubicación + botón delete
  - Botón "Agregar otra parada" (abre frame 3b)
  - Stats row: `distancia / tiempo / paradas`
  - CTA "Iniciar navegación"
- **Saca de la pantalla**: input "Nombre de la ruta" + `RideTypeSelector`. Estos se mueven a un sheet secundario "Guardar como ruta" disparado desde el `Detalle de ruta` (frame 12), no obligatorio para planear.

**ViewModel**:

- Probablemente extender `RoutePlannerViewModel` con `stopKinds`, `setStopKind(waypointId, kind)`, `removeStop(waypointId)`.

**Tests:**

- Estado: timeline ordenado por waypoint order, colores correctos
- Acción: removeStop, addStop con kind explícito, reordenar

---

### Slice C.3 — Sugerencias semánticas por categoría (M, 3–4 días)

**Domain:**

- `src/domain/repositories/PlaceCategorySearchRepository.ts` (nuevo)
- `src/domain/useCases/SearchPlacesByCategoryUseCase/` (nuevo)
  - Input: `{ category: 'food' | 'tourism' | 'fuel' | 'rest', alongRoute: GeoPoint[], maxResults: number }`
  - Output: `Place[]` ranked por proximidad al trazado

**Data:**

- `src/data/repositories/PlaceCategorySearchRepositoryImpl.ts`
- `src/data/services/PlaceCategorySearchService.ts`: wrapper de Mapbox Search Box API (`category=fuel|restaurant|tourist_attraction|rest_area`)

**UI:**

- Frame 3b ya existe; ahora con datos reales
- Grid de categorías → tap → muestra lista de POIs cercanos a la ruta, agrupados por tramo
- Tap en POI → agrega como waypoint con `stopKind` derivado

**Tests:**

- `SearchPlacesByCategoryUseCase` con mock del service
- Ranking por proximidad al trazado

---

### Slice C.4 — `RouteShareCode` (M, 3–4 días)

**Domain:**

- `src/domain/repositories/RouteShareRepository.ts`
- `src/domain/useCases/GenerateRouteShareCodeUseCase/`: genera código corto (`r-XXXX-YYYY`), inserta en `/shareCodes/{code}` con `routeId`
- `src/domain/useCases/ResolveRouteShareCodeUseCase/`: dado un código, devuelve `{ route, partyOrNull }`

**Data:**

- `src/data/repositories/RouteShareRepositoryImpl.ts` (Firestore)
- `src/data/services/ShareCodeService.ts`: generador de códigos cortos con retry si colisiona

**UI:**

- Nuevo sheet `RouteShareSheet` (frame nuevo en Pencil)
- Botón "Compartir ruta" en `RouteDetailScreen` (frame 12)
- Pantalla nueva `JoinRouteScreen` para pegar código (deep link `roadtrip://join/r-XXXX-YYYY` → resuelve y muestra preview)

**Firestore:**

- Migración rules + index en `/shareCodes`

**Tests:**

- Generación de códigos únicos (mock collision)
- Resolución: código válido → ruta; código inválido → null; código expirado → null

---

### Slice C.5 — `TripParty` + `PartyMember` (L, 5–7 días)

**Domain:**

- `src/domain/entities/TripParty.ts`, `PartyMember.ts`
- `src/domain/repositories/TripPartyRepository.ts` con `observe(partyId): Observable<TripParty>` (para sync)
- 3 useCases: `CreateTripParty`, `JoinTripParty`, `LeaveTripParty`

**Data:**

- `src/data/repositories/TripPartyRepositoryImpl.ts` con `onSnapshot`
- `src/data/models/tripPartyModel.ts`

**UI:**

- 2 frames nuevos en Pencil: `Party — Miembros`, `Unirse a party`
- `PartyMembersScreen` listando miembros con sus motos
- `JoinPartyScreen` con campo código + selector de moto del garage
- En el `RoutePlannerScreen`: chip "Party (3)" + abre members sheet

**Decisión técnica importante**: el `HomeViewModel` necesita observar el party activo. Probablemente conviene crear `TripPartyStore` (singleton) inyectado en `HomeViewModel` — el party es estado global de la app durante un viaje.

**Tests:**

- Crear party → owner es el primer member
- Join: agrega member, sync via `onSnapshot`
- Leave: si era owner, se promociona el siguiente; si no, solo se elimina
- Rules de Firestore: tests en el emulador

---

### Slice C.6 — `PartyFuelPlan` (M, 3–4 días)

**Domain:**

- `src/domain/useCases/EstimatePartyFuelPlanUseCase/`
  - Input: `{ route: Route, party: TripParty }`
  - Output: `PartyFuelPlan { stops: FuelStop[], weakestMotoId: string, strongestMotoId: string }`
- Algoritmo: por cada km de la ruta, calcula combustible restante de la moto débil. Cuando llega al 30% del tanque, marca punto de tanqueo. (Reusar `EstimateRouteFuelUseCase` por moto, agregar lógica de envelope)

**UI:**

- Card nueva en `RoutePlannerScreen` (cuando hay party): "Plan de tanqueo del party"
- Muestra: gasolinera sugerida, "Tanqueo necesario para Yamaha XTZ 250 (más débil)", "Margen: 50 km hasta la siguiente"
- Visual: timeline de tanqueo paralelo al timeline de paradas

**Tests:**

- Cálculo con 2 motos: una de 100km de rango, otra de 300km. Debe sugerir tanqueo cuando la de 100km llega al 30%.
- Edge cases: party de 1 (igual a single rider), motos con consumo extremo

---

### Slices diferidos (post-MVP)

- **C.7 — Edición colaborativa real-time**: con onSnapshot del party + lock optimista por waypoint. Banner "Juan agregó una parada" con ✓/✗.
- **C.8 — Voz para agregar parada**: integración con `expo-speech-recognition` para el botón de voz del frame 3b.

---

## 6. Plan de ejecución (orden por semanas)

| Semana  | Fase                                | Output                                                                                                                                          |
| ------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **1**   | Diseño en Pencil (Fase B)           | Frames actualizados (3, 3b, 11, 12) + frames nuevos (selector tipo viaje, compartir, party, unirse, fuel plan). Snapshot del Pencil compartido. |
| **2**   | Slice C.1                           | `StopKind` + colores por segmento. PR pequeño.                                                                                                  |
| **3**   | Slice C.2                           | Frame 11 rediseñado en código. PR mediano.                                                                                                      |
| **4**   | Slice C.3                           | Sugerencias por categoría. PR mediano.                                                                                                          |
| **5–6** | Slice C.4                           | RouteShareCode + JoinRoute. PR mediano.                                                                                                         |
| **7–9** | Slice C.5                           | TripParty + PartyMember + sync. PR grande.                                                                                                      |
| **10**  | Slice C.6                           | PartyFuelPlan. PR mediano.                                                                                                                      |
| **11**  | Buffer / QA / smoke tests en device | MVP completo.                                                                                                                                   |

Total estimado: **~10–11 semanas** para el MVP completo si dedico ~4 días/semana de programación efectiva.

---

## 7. Riesgos y desconocidos

| Riesgo                                              | Mitigación                                                                                                                                                                                             |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Mapbox Search by category cobertura en Colombia** | Validar con búsquedas reales (Bogotá → Zipaquirá) antes de C.3. Si la cobertura es pobre, fallback a OSM Overpass como ya hacemos para gasolineras.                                                    |
| **Firestore rules complejas con party**             | Empezar con rules simples (owner-only edit) y refinar con tests en el emulador. No abrir edición colaborativa hasta tener tests sólidos.                                                               |
| **Conflictos de edición simultánea**                | C.7 (diferida). En C.5 el owner es el único que edita; otros members ven la ruta read-only. Esto evita race conditions complejas.                                                                      |
| **`Waypoint.kind` migration**                       | Las rutas guardadas actualmente tienen `kind: 'stop'`. El modelo lo mapea a `'food'` con `userOverrideKind: false` para que el rider pueda cambiarlo después sin perder información.                   |
| **UX de "moto del party"**                          | Cada party member debe tener UNA moto registrada. Si no la tiene, lo redirigimos a registrar antes de unirse. Edge case: cambiar moto mid-trip. Por ahora bloqueamos el cambio una vez unido al party. |
| **Cost de Firestore reads con onSnapshot**          | Limitar el observer al party activo; cancelar al salir de la pantalla. Cache local con MobX para datos no críticos.                                                                                    |

---

## 8. Decisiones tomadas (referencia rápida)

1. `StopKind` en `Waypoint` (no en `RouteSegment`)
2. Color del segmento = color del waypoint destino
3. Detección híbrida (categoría explícita → kind directo; texto libre → infer)
4. Firestore con rules para sharing/party (sin cloud functions)
5. Owner-only edit en MVP (edición colaborativa real-time post-MVP)
6. Cada party member tiene UNA moto fija (cambio post-MVP)
7. RideTypeSelector sale del Planner; se mueve al sheet "Guardar como ruta"

---

## 9. Próximo paso

**Fase B — Diseño en Pencil**. Lista priorizada de frames a crear/actualizar:

1. (alta) Actualizar `11 - Planear ruta` con timeline coloreado por `StopKind`
2. (alta) Expandir `3b - Agregar parada` con categoría Turismo
3. (alta) Crear `Compartir ruta` (sheet con código + QR + permisos)
4. (alta) Crear `Party — Miembros`
5. (media) Crear `Unirse a party`
6. (media) Crear `Plan de tanqueo del party` (card o sub-sheet)
7. (media) Actualizar `12 - Detalle de ruta` con acción "Compartir" y miembros del party
8. (baja) Crear `Selector tipo de viaje` (entrada al flow, opcional según UX)

Después de Fase B, arrancamos con Slice C.1.
