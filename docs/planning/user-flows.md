# User Flows — MVP Road Trip

> Cruce de los frames del Pencil contra los flows del MVP. Identifica gaps de pantallas/transiciones que faltan para que la navegación del rider sea coherente end-to-end.

## 1. Inventario consolidado de frames del Pencil

Agrupados por sección (label del Pencil) + estado vs requerido por el MVP.

### 01 — Home Base

| Frame                         | ID       | Estado    |
| ----------------------------- | -------- | --------- |
| `1 - Home Idle`               | `o2MXzw` | ✅ existe |
| `Home Idle - Detent grande`   | `xdTuq`  | ✅ existe |
| `Home Idle - Busqueda activa` | `TY9l2`  | ✅ existe |

### 02 — Búsqueda

| Frame                      | ID      | Estado    |
| -------------------------- | ------- | --------- |
| `2 - Home Busqueda Activa` | `HYiOg` | ✅ existe |
| `2b - Destination Preview` | `BSIFH` | ✅ existe |

### 03 — Planeación

| Frame                                        | ID       | Estado                            |
| -------------------------------------------- | -------- | --------------------------------- |
| `3 - Home Ruta Asomado`                      | `pEMZA`  | ✅ existe                         |
| `3b - Agregar parada (Quick + Voice)`        | `OzTvZ`  | ✅ existe (4 categorías)          |
| `3b v2 - Agregar parada (Turismo + Mirador)` | `DiJJK`  | ✅ **nuevo** (6 categorías)       |
| `11 - Planear ruta (formSheet full)`         | `kYA7r`  | ✅ viejo (sin StopKind)           |
| `11 - Planear ruta v2 (StopKind)`            | `ydBys`  | ✅ **nuevo** (timeline coloreado) |
| `12 - Detalle de ruta (formSheet)`           | `ufCBn`  | ✅ viejo (sin party)              |
| `12 v2 - Detalle de ruta (con party)`        | `m5eDAS` | ✅ **nuevo** (party banner)       |
| `Selector tipo de viaje (sheet)`             | `S8LXf`  | ✅ **nuevo**                      |
| `Compartir ruta (sheet)`                     | `LbG7X`  | ✅ **nuevo**                      |
| `Party - Miembros (sheet)`                   | `gYdbc`  | ✅ **nuevo**                      |
| `Unirse a party (sheet)`                     | `DKTgF`  | ✅ **nuevo**                      |
| `Plan tanqueo party (sheet)`                 | `E4EXLu` | ✅ **nuevo**                      |

### 04 — Navegación

| Frame                                  | ID      | Estado    |
| -------------------------------------- | ------- | --------- |
| `6a - Home Navegacion`                 | `O3a2f` | ✅ existe |
| `6a - Home Nav Activa · Sin Elevacion` | `NWLDE` | ✅ existe |
| `6b - Home Nav Activa + Elevacion`     | `MR9RX` | ✅ existe |
| `7 - Home Recalculando`                | `meRZm` | ✅ existe |

### 05 — Estados

| Frame                         | ID      | Estado    |
| ----------------------------- | ------- | --------- |
| `8 - Llegada`                 | `FPmDk` | ✅ existe |
| `9 - Sin permiso` (ubicación) | `evY1L` | ✅ existe |
| `9 - Cargando ruta`           | `n02Ew` | ✅ existe |
| `11 - Home Sin Moto`          | `dYsls` | ✅ existe |

### 06 — Tabs / form sheets

| Frame                        | ID       | Estado                               |
| ---------------------------- | -------- | ------------------------------------ |
| `10 - Rutas (formSheet)`     | `eIwmB`  | ✅ existe (lista de rutas guardadas) |
| `13 - Mi Garaje (formSheet)` | `l1bPuR` | ✅ existe                            |
| `15 - Perfil (formSheet)`    | `Q1bWZ1` | ✅ existe                            |

### 07 — Forms

| Frame                        | ID      | Estado    |
| ---------------------------- | ------- | --------- |
| `14 - Registrar moto (full)` | `Dk7MA` | ✅ existe |

---

## 2. User flows del MVP

### Flow A — **Onboarding** (primer arranque)

```
[App abre] → Login/Sign Up → ???REGISTRAR PRIMER MOTO???
                              ↓
                          [Home Idle] o [11 - Home Sin Moto]
```

**Pantallas que tenemos**: `11 - Home Sin Moto` (estado), `14 - Registrar moto`.
**Gaps**:

- 🔴 **Falta pantalla de Sign In / Sign Up** — el código tiene `AuthViewModel` y `AuthScreen` pero NO HAY frames Pencil de esto. Decidir si el flow lo necesita o si arrancamos con un sign-in mínimo de Firebase.
- 🟡 **Onboarding tipo welcome** (3 slides explicativas del valor del producto): probablemente innecesario para MVP, valida si hace falta.

---

### Flow B — **Planear ruta SOLO** (single rider, viaje ad-hoc)

```
[Home Idle]
   ↓ tap chip "Planear viaje"
[Selector tipo de viaje]
   ↓ elegir Carretera + Solo + tap Continuar
[Home Idle - Búsqueda activa]
   ↓ buscar destino (ej. "Catedral de Sal")
   ↓ tap resultado
[2b - Destination Preview]
   ↓ tap "Trazar ruta"
[9 - Cargando ruta] (transición)
   ↓ ruta calculada
[3 - Home Ruta Asomado] (peek con stats compactos)
   ↓ tap "Ver detalles" o expand sheet
[11 - Planear ruta v2] (timeline coloreado editable)
   ↓ tap "Agregar otra parada"
[3b v2 - Agregar parada] (grid de 6 categorías)
   ↓ elegir categoría o buscar
   ↓ tap lugar
[11 - Planear ruta v2] (con parada nueva)
   ↓ tap "Iniciar navegación"
[6a / 6b - Navegación activa]
```

**Pantallas que tenemos**: TODAS las del flow.
**Gaps**:

- 🟡 **Transición Selector → Búsqueda**: el frame Selector termina con "Continuar". ¿A dónde lleva? Asumimos que abre el SearchBar del Home idle pre-expandido. Falta clarificar en el Pencil con una flecha o nota.
- 🟡 **Frame 3b después de elegir categoría** (ej. "Comida"): muestra una lista de restaurantes cercanos. El frame actual muestra el GRID de categorías pero no el SUB-listado de resultados por categoría. Falta esa pantalla intermedia: `3b-2 - Resultados por categoría`.

---

### Flow C — **Planear ruta GRUPAL** (rider crea party + invita)

```
[Home Idle]
   ↓ tap chip "Planear viaje"
[Selector tipo de viaje]
   ↓ elegir Carretera + GRUPAL + tap Continuar
[Búsqueda + Preview + 11 - Planear ruta v2]  (mismo que Flow B)
   ↓ aparece chip "Party (1)" en el header
   ↓ tap chip Party o tap "Compartir"
[Compartir ruta (sheet)]
   ↓ rider copia código o muestra QR
   ↓ rider X cierra el sheet
[11 - Planear ruta v2] (con chip Party (1))
   ↓ ??? esperando que se unan ???
   ↓ otro rider se une (ver Flow D)
   ↓ chip pasa a "Party (2)"
   ↓ tap chip Party
[Party - Miembros]
   ↓ ver lista, tap "Plan de tanqueo"
[Plan tanqueo party]
   ↓ rider revisa, X cierra
[11 - Planear ruta v2]
   ↓ tap "Iniciar navegación"
[6a / 6b - Navegación]
```

**Pantallas que tenemos**: todas las del flow.
**Gaps**:

- 🟡 **Estado "esperando party members"**: no hay frame que muestre claramente "1/3 unido" o "esperando 2 riders más". El chip "Party (1)" del frame 11 v2 podría comunicarlo, pero falta el estado de "owner espera a que el code sea usado".
- 🟡 **Transición de chip "Party (N)" a `Party - Miembros`**: el frame 11 v2 NO TIENE el chip "Party (N)" todavía (lo dibujé conceptualmente). **Falta agregarlo** al frame 11 v2 cuando la ruta es grupal.
- 🟢 Toda la sección de Plan de tanqueo está bien cubierta.

---

### Flow D — **Unirse a un party existente**

```
[Otro rider recibe link/código por WhatsApp]
   ↓ abre el link OR
[Home Idle]
   ↓ ??? entry point ???
[Unirse a party]
   ↓ pega código, elige su moto, tap "Unirse al party"
[??? confirmation ???]
   ↓
[Party - Miembros] (ahora con 2 miembros)
   ↓ tap "Ver ruta" o el botón equivalente
[11 - Planear ruta v2] (con chip Party (2), modo viewer/editor según permisos)
   ↓ ??? espera al owner que tape Iniciar navegación ???
[6a / 6b - Navegación]
```

**Pantallas que tenemos**: `Unirse a party`, `Party - Miembros`.
**Gaps**:

- 🔴 **Entry point del Flow D faltante**: ¿cómo entra el rider invitado a `Unirse a party`? Opciones:
  - Deep link `roadtrip://join/r-XXXX-YYYY` → directo a `Unirse a party` con código pre-llenado
  - Botón "Unirse a party" en algún lado del Home idle (ej. chip o menú)
  - En `13 - Mi Garaje` o `15 - Perfil`
  - **Falta frame**: chip "Unirse a party" en el Home idle, o un FAB.
- 🟡 **Confirmation post-join**: tras tap "Unirse al party", no hay frame que muestre "te uniste exitosamente, esto es lo que el party está planeando". Necesitamos pantalla intermedia: `Party Joined Confirmation` (puede ser overlay tipo toast/modal).
- 🟡 **Modo viewer vs editor en el frame 11 v2**: si el party member tiene rol `viewer`, debería ver la ruta en read-only (sin botones de delete waypoint, sin "Agregar parada"). El frame actual NO TIENE variante read-only.
- 🟡 **Sincronización**: ¿cómo se entera el party de que el owner inició la navegación? Falta un estado "Owner inició la navegación · ¿Te unís?".

---

### Flow E — **Navegación activa**

```
[6a / 6b - Navegación] (turn-by-turn)
   ↓ rider se sale de la ruta
[7 - Home Recalculando]
   ↓ ruta nueva calculada
[6a / 6b - Navegación]
   ↓ llega cerca del destino
[8 - Llegada]
```

**Pantallas que tenemos**: todas.
**Gaps**:

- 🟡 **Banner durante navegación de "próxima parada de tanqueo a 45km"** (sobre todo en modo party): el cálculo del Plan de tanqueo está en sheet aparte. Pero durante la navegación activa, el rider debería ver un banner sutil "Próximo tanqueo: 45 km". Falta ese elemento en el frame 6a/6b.
- 🟡 **Vista del party durante navegación**: ¿el frame 6a/6b muestra los avatares de los party members en el mapa? Para una rodada grupal sería clave ver dónde está cada uno. Falta diseño del componente "mini-avatars en el mapa" + sheet "Party en ruta".

---

### Flow F — **Llegada y post-viaje**

```
[8 - Llegada]
   ↓ rider toca "Continuar" o "Guardar ruta"
[??? Guardar como ruta ???]
   ↓
[Home Idle] (vuelve al inicio) o
[10 - Rutas] (ve la lista actualizada con la ruta recién guardada)
```

**Pantallas que tenemos**: `8 - Llegada`, `10 - Rutas`.
**Gaps**:

- 🔴 **Frame "Guardar como ruta"** (nombre + tipo + opciones): no existe. Es donde se mueve la decisión de nombrar/guardar la ruta. Sin este frame, las rutas ad-hoc del Flow B no quedan registradas en "Mis rutas".
- 🟡 **Resumen post-viaje** (km recorridos, combustible usado, paradas hechas, fotos sugeridas?): el `8 - Llegada` muestra solo "Llegaste". Pencil podría tener un sub-frame con el resumen del viaje.
- 🟡 **Sharing post-viaje** ("compartí tu rodada por X"): nice-to-have, post-MVP.

---

## 3. Gap analysis consolidado

### 🔴 Bloqueantes para MVP funcional (3)

| #   | Gap                                                        | Donde encaja                     | Esfuerzo                                    |
| --- | ---------------------------------------------------------- | -------------------------------- | ------------------------------------------- |
| 1   | Pantalla **Sign In / Sign Up** (Flow A)                    | inicio, primer entry             | Frame nuevo + uso de `AuthScreen` existente |
| 2   | Entry point para **Unirse a party** desde Home (Flow D)    | Home Idle                        | Chip nuevo en idle o FAB                    |
| 3   | Frame **"Guardar como ruta"** (nombre + rideType) (Flow F) | post-llegada o desde frame 11 v2 | Frame nuevo (modal/sheet)                   |

### 🟡 Smells de UX (8)

| #   | Gap                                                                                                      | Donde encaja            |
| --- | -------------------------------------------------------------------------------------------------------- | ----------------------- |
| 4   | Transición "Selector tipo de viaje → Búsqueda" sin flecha clara en el Pencil                             | post-Selector           |
| 5   | Sub-listado de resultados por categoría dentro de `3b v2` (tap "Comida" → muestra restaurantes cercanos) | Add stop flow           |
| 6   | Chip "Party (N)" en el header del frame 11 v2 (no lo dibujé)                                             | frame 11 v2             |
| 7   | Estado "esperando party members" del owner                                                               | frame 11 v2 + Compartir |
| 8   | Confirmation post-join "te uniste exitosamente"                                                          | post-Unirse             |
| 9   | Variante read-only del frame 11 v2 para party viewers                                                    | frame 11 v2             |
| 10  | Banner "Próximo tanqueo: 45 km" durante navegación                                                       | frame 6a/6b             |
| 11  | Mini-avatares de party members en el mapa de navegación                                                  | frame 6a/6b             |

### 🟢 Cubierto adecuadamente

- Flow B (planear solo) — completo
- Flow C (planear grupal) — completo salvo el chip "Party (N)" en 11 v2
- Flow E (navegación) — completo en single rider; falta integración party
- Flow F (post-llegada) — solo falta el "Guardar como ruta"

---

## 4. Plan de acción sugerido

### Ronda 3 de Pencil (3 frames + 2 updates) — bloqueantes 🔴

1. **Frame nuevo**: `Sign In / Sign Up`
2. **Update**: agregar chip "Unirse a party" en `Home Idle Detent grande` (al lado de Recientes) o como FAB
3. **Frame nuevo**: `Guardar como ruta` (sheet con AppTextInput de nombre + RideTypeSelector + CTA Guardar)
4. **Update**: agregar chip "Party (N)" al header del frame 11 v2 cuando hay party activo (smell #6)

### Ronda 4 de Pencil (refinamientos UX) — smells 🟡

5. **Frame nuevo**: `Sub-listado de categoría` (post-tap "Comida" en 3b v2)
6. **Frame nuevo**: `Party Joined Confirmation` (toast/overlay)
7. **Variante**: `11 v2 read-only` para party viewers (sin delete, sin agregar)
8. **Update**: agregar banner "Próximo tanqueo" en frame 6a/6b
9. **Update**: agregar mini-avatares de party en el mapa de 6a/6b

### Post-Pencil

Una vez cerrados los gaps 🔴, podemos pasar a Slice C.2 (RoutePlannerScreen rediseñada en código).

---

## 5. Notas sobre coherencia narrativa

- **Hay buena cobertura del flow single-rider**. El usuario puede arrancar, buscar, planear, navegar, llegar.
- **El flow grupal tiene los bloques mayores pero faltan los conectores**: el chip "Party (N)" + el estado "esperando" + el confirmation post-join son las piezas que conectan los frames sueltos. Con esos 3 elementos, el flow grupal queda lineal.
- **El concepto Route guardada (frame 12)** está bien dibujado pero falta el flow que CREA esa ruta guardada. Hoy no hay forma de pasar de "ruta ad-hoc" a "ruta nombrada en Mis Rutas". El gap #3 ("Guardar como ruta") es lo que lo resuelve.
- **El party multi-rider durante navegación activa** está sub-diseñado. Para que sea verdaderamente colaborativo, falta ver los avatares de los otros riders en el mapa (gap #11) y comunicar próximos tanqueos en tiempo real (gap #10).
