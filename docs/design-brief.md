# Road Trip — Design Brief

> Brief de contexto para diseñar pantallas/flujos de la app. Pasalo entero al iniciar
> una sesión con Claude design + Pencil. Asume cero conocimiento previo.

---

## 1. Producto en 30 segundos

App móvil (iOS-first, Expo + React Native) para **moteros que planean rutas**:

- Trazar una ruta A → B con paradas intermedias (comida, tanqueo, turismo, descanso).
- **Estimar autonomía** según la moto registrada + condiciones (acompañante, maletas, ritmo).
- Sugerir paradas de tanqueo sobre la ruta cuando el tanque no alcanza.
- Compartir la ruta con un código → "party" en vivo donde el owner navega y los demás ven en read-only.
- Plan de tanqueo grupal: el algoritmo elige paradas para que **la moto más débil del party** llegue siempre.

**Persona:** motero adulto, ya rueda. Quiere planear sin fricción y arrancar rápido.
Usa la app **con guantes a veces** → targets grandes, contraste alto, sin micro-affordances.

**Tono visual:** Waze / Google Maps oscuro + acento naranja moto. NO es bancario,
NO es minimalista pastel. Es **utilitario, alto contraste, dark-first**.

---

## 2. Stack visual

- **Tema:** Dark always (no light mode).
- **Tipografía:** Inter (Bold / SemiBold / Medium / Regular). El `fontWeight` va
  horneado en el `fontFamily` — nunca se setea inline.
- **Iconos:** Ionicons (principal) + MaterialCommunityIcons (para motos / gasolina).
- **Mapa:** Mapbox style v11. Las paradas se pintan como dots coloreados por
  StopKind; los segmentos del polyline cambian de color al pasar por cada parada.

---

## 3. Tokens (fuente de verdad)

### Colores

```
bgPrimary       #0D0D0D   fondo de pantalla
bgGradientEnd   #1A1A1A   fondo cards / search bar
bgCard          #242424   superficie elevada
cardBorder      #2A2A2A   borde card
separator       #2A2A2A   divisor fino

accent          #FF9800   naranja moto — CTAs, activos, ruta highway
accentDim       rgba(FF9800, 0.12)   bg de chips activos
accentDimBorder rgba(FF9800, 0.31)   borde chips activos
accentSoft      rgba(FF9800, 0.10)   highlight de primer resultado
accentGlow      rgba(FF9800, 0.27)   halo de marcadores

textPrimary     #FFFFFF
textSecondary   #9CA3AF   muted gris claro
textMuted       #6B7280   muted gris oscuro
iconMuted       #9CA3AF

alerts.error    #E74446   rojo
alerts.warning  #FF9800   = accent
alerts.check    #4CAF50   verde
```

### StopKind (paradas) — **regla canónica de color**

```
start        #4CAF50  verde   ARRANQUE      ícono: flag
food         #E6C229  amarillo COMIDA        ícono: restaurant
fuel         #E8A030  naranja oscuro TANQUEO  ícono: water
tourism      #9B59B6  morado  TURISMO        ícono: camera
rest         #3DA5D9  azul    DESCANSO       ícono: leaf
other        #9CA3AF  gris    PARADA         ícono: ellipse-outline
destination  #E74446  rojo    DESTINO        ícono: pin
```

Color del **segmento** del polyline = color del `StopKind` del waypoint **destino**
del segmento (ej. start → food = amarillo; food → fuel = naranja oscuro).

### RideType (tipo de viaje, no StopKind)

```
highway      #4CAF50   carretera
offroad      #E8A030   destapada
group        #2196F3   grupal
longtrip     #9B59B6   largo
```

### Tipografía (escala `ms()`)

| Token | Family | Size | Uso |
|---|---|---|---|
| `bigHeader` | Bold | 25 | Hero numbers |
| `header1` | Bold | 30 | Page titles |
| `header2` | Bold | 26 | Section titles |
| `header3` | SemiBold | 22 | Card headers |
| `header4` | Medium | 22 | Secondary headers |
| `header5` | Medium | 18 | Empty state titles |
| `bodyText` | Regular | 15 | Body copy |
| `bodyTextBold` | SemiBold | 15 | Énfasis body, nombres de card |
| `smallBodyText` | Regular | 13 | Descripciones, subtítulos |
| `inputsBold` | SemiBold | 17 | Nav titles |
| `callToActions` | SemiBold | 18 | Botón grande |
| `links` | Medium | 12 | Badges, etiquetas, links |
| `bigNumbers` | Bold | 50 | Stats grandes |

### Spacing

```
xs 4   sm 8   md 12   lg 16   xl 24   xxl 32
spacex2 20   ← padding horizontal de pantalla
spacex6 48   ← padding bottom + top de safe area
```

### Border radius (iOS HIG)

```
xs 4    badges chicos
sm 6    chips, dots
md 10   botones, inputs, cards pequeños
lg 14   cards grandes / forms
xl 20   sheets, tops de bottom sheet
pill 999  cápsulas, avatars, botones pildora
```

---

## 4. Componentes existentes (reusar siempre)

| Componente | Path | Cuándo |
|---|---|---|
| `<PrimaryButton>` | `@/ui/components/PrimaryButton` | Cualquier CTA gradient |
| `<AppTextInput>` | `@/ui/components/AppTextInput` | Todos los inputs (con variante `search`) |
| `<GradientView>` | `@/ui/components/GradientView` | Cualquier degradado (preset `header` o `accent`) |
| `<BottomSheet>` | `@/ui/components/BottomSheet` | Bottom sheets custom (no native formSheet) |

Reglas duras:
- Nunca `LinearGradient` directo → usar `GradientView`.
- Nunca `TouchableOpacity + gradient` → usar `PrimaryButton`.
- Nunca `<TextInput>` desnudo → usar `AppTextInput`.
- Nunca `rgba()` hardcoded → usar `hexToRgba(hex, alpha)`.

---

## 5. Convenciones de pantalla

### Presentación

| Tipo | iOS preset | Cuándo |
|---|---|---|
| Pantalla principal | `card` (default) | Home, navegación |
| Sheet apilado sobre el mapa | `formSheet` con `sheetAllowedDetents: 'fitToContents'` | Routes list, RoutePlanner, RouteDetail, JoinRoute, PartyMembers |
| Modal full-screen sobre formSheet | `modal` | AddStop y CategorySublist (iOS no apila 2 formSheets confiablemente) |

### Layout base

```
SafeAreaView (edges: top, left, right) + Colors.base.bgPrimary
└── navbar (paddingHorizontal: spacex2, paddingVertical: md, flex row)
    ├── back chevron (TouchableOpacity, hitSlop 8)
    ├── título centrado (Fonts.inputsBold, textPrimary)
    └── acción derecha o close X
└── contenido (ScrollView contentContainerStyle: padding spacex2)
```

### Card pattern

```
padding: Spacings.md
backgroundColor: Colors.base.bgCard
borderRadius: BorderRadius.md
borderWidth: 1, borderColor: Colors.base.cardBorder
```

### Chip pattern (filtros, categorías)

```
paddingHorizontal: md, paddingVertical: sm
borderRadius: pill
borderWidth: 1
active   → bg: hexToRgba(meta.color, 0.18), border: meta.color, text: meta.color
inactive → bg: bgCard, border: cardBorder, text: textSecondary
```

---

## 6. Inventario de pantallas existentes

**Auth** (`src/ui/screens/Auth/`)
- SignIn, SignUp

**Home** (`src/ui/screens/Home/`)
- HomeScreen — mapa Mapbox + bottom sheet con 3 detents (peek / medium / large).
  Idle: 3 chips de acción (Planear viaje / Mi garaje / Viaje grupal) + sección Recientes.
  Activo: search results + DestinationPreview formSheet.
- DestinationPreviewScreen — card con info del destino + CTA "Trazar ruta".

**Garage** (`src/ui/screens/Garage/`)
- GarageScreen — lista de motos registradas.
- MotorcycleFormScreen — alta/edición de moto (tanque, rendimiento, tipo gasolina).

**Routes** (`src/ui/screens/Routes/`)
- RoutesScreen — lista de rutas guardadas.
- **RoutePlannerScreen** (frame Pencil `ydBys`) — search + timeline coloreado por
  StopKind + stats (distancia/tiempo/paradas) + CTA "Iniciar navegación".
  Variantes: viewer read-only (`AMu8J`), Save sheet (`S85Zfj`).
- **AddStopScreen** (frame `DiJJK`) — grid 2x3 de categorías + lista de recientes.
  Modo "Editar parada" cuando hay edit activo.
- **CategorySublistScreen** (frame `rc0EQ`) — POIs filtrados por categoría con
  badge "EN LA RUTA" para los cercanos al polyline.
- RouteDetailScreen — detalle de ruta guardada con autonomía + share.
- JoinRouteScreen — input de código de 6 chars para unirse a un party.

**Party** (`src/ui/screens/Party/`)
- PartyMembersScreen — miembros del party con moto y rango de autonomía.

**Profile** (`src/ui/screens/Profile/`)
- ProfileScreen — datos de cuenta.

---

## 7. Patrones recurrentes

### Timeline de paradas (Planner)

Cada fila = un waypoint:
- **Dot** coloreado por StopKind (14×14, pill, tappable para re-categorizar)
- **Nombre** + **chip de label** (`COMIDA`, `TANQUEO`, etc.)
- **Subtítulo**: categoría Mapbox o coords
- **Acciones derecha**: pencil (editar) + flechas reorder (solo intermedios) + X (eliminar)

### Stat row (Distancia / Tiempo / Paradas)

3 cards iguales en flex row con `Fonts.bodyTextBold` arriba y `Fonts.links` letter-spaced abajo.

### Badge "EN LA RUTA"

Pill chiquita verde — `paddingHorizontal: sm`, `bg: hexToRgba(alerts.check, 0.18)`,
`border: hexToRgba(alerts.check, 0.4)`, text `Fonts.links` color `alerts.check`.

### Party chip en navbar

Pill con `bg: accentDim`, `border: accentDimBorder`, ícono people + texto
`Party (N)` en `Fonts.links` color `accent`.

### Preview de ruta en el mapa global

Cuando el Planner está abierto, el mapa del Home (debajo del formSheet) muestra:
- **Pins coloreados por StopKind** (extremos 18px, intermedios 14px, borde blanco)
- **Polyline multi-segmento** si hay directions (cada segmento color del destino)
- **Línea punteada** si todavía no hay directions (feedback inmediato)
- **Auto-fit** de cámara al bbox de los waypoints

---

## 8. Anti-patterns (NO hacer)

- ❌ Colores hardcoded fuera de `Colors.ts` — agregar al token primero.
- ❌ `rgba()` literal — usar `hexToRgba(hex, alpha)`.
- ❌ `fontFamily` o `fontWeight` inline — siempre `...Fonts.token`.
- ❌ `fontSize` sin `ms()` scaling.
- ❌ Botón con `LinearGradient` custom — usar `PrimaryButton`.
- ❌ 2 formSheets apilados en iOS — el segundo se rompe. Usar `modal` para el de arriba.
- ❌ Tappable < 44×44 sin `hitSlop`. Los moteros usan guantes.
- ❌ Light mode / pastel / minimalista plano — esta app es alto contraste, dark, naranja.
- ❌ Localización en inglés en strings — la app es español (Colombia / LatAm).

---

## 9. Frame del Pencil

Archivo único: `designs/home-v2.pen`. Acceso vía MCP `pencil:open_document` →
`pencil:batch_get` por id de frame. Frames clave referenciados arriba:
- `ydBys` Planear ruta v2
- `AMu8J` Planear ruta — viewer read-only
- `S85Zfj` Guardar ruta (sheet)
- `DiJJK` Agregar parada
- `rc0EQ` Sub-listado de categoría

---

## 10. Cómo pedir un diseño

Buen prompt:

> "Diseñá la pantalla de **Plan de tanqueo del party** en el RoutePlanner.
> Es un card que aparece **debajo de la stat row** y arriba del CTA cuando hay
> party activa Y directions calculadas. Muestra:
> - Header: ícono dot fuel + 'Plan de tanqueo del party'
> - Subtítulo: 'Moto débil: Diego (180km) · Más fuerte: Kevin (380km)'
> - Si `reachesWithoutRefuel`: ícono check verde + 'Todas las motos llegan sin tanquear.'
> - Si no: lista de paradas numeradas con 'Km 120 · Margen 20km'.
>
> Usa color `stopKind.fuel` (#E8A030) para el dot y los numbers; resto en
> tokens normales. Padding md, bg bgCard, border cardBorder, radius md."

Incluye siempre: **dónde aparece**, **qué muestra**, **estados** (loading / empty / success),
**colores específicos**, y **referencias a frames existentes** que el diseño debe respetar.
