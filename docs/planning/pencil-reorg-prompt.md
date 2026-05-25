# Prompt para reorganizar frames del Pencil según user flow

> Copiar y pegar en una sesión nueva del Pencil CLI / Claude con MCP Pencil conectado. Es autocontenido: enumera los IDs, nuevas posiciones y reglas de organización.

---

## Prompt (copiar desde aquí ↓)

````
Necesito que reorganices los frames del archivo `designs/home-v2.pen` para que sigan el orden del user flow real del MVP de Road Trip. Hoy los frames están dispersos en el canvas; quiero que queden en **swimlanes horizontales** (una fila por etapa del flow), con los frames de cada etapa ordenados de izquierda a derecha en la secuencia que el rider los recorre.

## Reglas de organización

1. Cada frame de pantalla mide **393 × 852**. Usar **paso horizontal de 453px** (393 ancho + 60 padding) y **paso vertical de 952px** (852 alto + 100 padding entre swimlanes).
2. Los **labels de sección** (frames que empiezan con "Label NN") quedan en `x: -440` con la `y` matcheada al swimlane que rotulan.
3. **No mover**: `Design Tokens` (frame de tokens), `Map Nav 3D` (reusable), `SearchBar/Default`, `SearchBar/Searching`, `SearchBar/AddStop` — quedan en el área de helpers al final.
4. **Frames "viejos" coexisten con sus v2** — no borrar los originales, sólo reposicionar. Los v2 quedan a la derecha del original para que se vea la evolución.
5. Cada `M()` (move) o `U()` (update con `x, y`) debe ser una operación por frame. Encadenar en `batch_design`.

## Layout completo (swimlanes con coordenadas exactas)

### Swimlane 0 · Onboarding (y = 0)
Orden de izquierda a derecha:

| ID         | Nombre                       | x      | y |
|------------|------------------------------|--------|---|
| `zAdUu`    | Sign In                      | 0      | 0 |
| `s5QRM`    | Sign Up                      | 453    | 0 |
| `dYsls`    | 11 - Home Sin Moto           | 906    | 0 |
| `Dk7MA`    | 14 - Registrar moto (full)   | 1359   | 0 |
| `evY1L`    | 9 - Sin permiso              | 1812   | 0 |

Label rotulando: crear `Label · Onboarding` en `x: -440, y: 0` (frame vertical 360 ancho, gap 6, con kicker "00 - ONBOARDING" + título "Sign In, Sign Up, primer arranque" + descripción "Entry del primer arranque. Sign In, Sign Up, registro de moto y permisos de ubicación.").

### Swimlane 1 · Home Base (y = 952)

| ID         | Nombre                                         | x      | y    |
|------------|------------------------------------------------|--------|------|
| `o2MXzw`   | 1 - Home Idle                                  | 0      | 952  |
| `xdTuq`    | Home Idle - Detent grande                      | 453    | 952  |
| `yRisg`    | Home Idle Detent grande v2 (con Unirse a party)| 906    | 952  |
| `TY9l2`    | Home Idle - Busqueda activa                    | 1359   | 952  |

Label en `x: -440, y: 952`: usar el `Label 01 Home Base` existente (ID `zvwIU`) — solo update su `y` a 952.

### Swimlane 2 · Búsqueda y selección (y = 1904)

| ID         | Nombre                          | x      | y    |
|------------|---------------------------------|--------|------|
| `S8LXf`    | Selector tipo de viaje (sheet)  | 0      | 1904 |
| `HYiOg`    | 2 - Home Busqueda Activa        | 453    | 1904 |
| `BSIFH`    | 2b - Destination Preview        | 906    | 1904 |
| `n02Ew`    | 9 - Cargando ruta               | 1359   | 1904 |

Label en `x: -440, y: 1904`: update `Label 02 Busqueda` (ID `T2EWK`) `y: 1904`.

### Swimlane 3 · Planeación (y = 2856)

| ID         | Nombre                                       | x      | y    |
|------------|----------------------------------------------|--------|------|
| `pEMZA`    | 3 - Home Ruta Asomado                        | 0      | 2856 |
| `kYA7r`    | 11 - Planear ruta (formSheet full) [viejo]   | 453    | 2856 |
| `ydBys`    | 11 - Planear ruta v2 (StopKind)              | 906    | 2856 |
| `OzTvZ`    | 3b - Agregar parada (Quick + Voice) [viejo]  | 1359   | 2856 |
| `DiJJK`    | 3b v2 - Agregar parada (Turismo + Mirador)   | 1812   | 2856 |
| `rc0EQ`    | Sub-listado categoría (Comida)               | 2265   | 2856 |
| `S85Zfj`   | Guardar como ruta (sheet)                    | 2718   | 2856 |

Label en `x: -440, y: 2856`: update `Label 03 Planeacion` (ID `DDVR3`) `y: 2856`.

### Swimlane 4 · Party / Sharing (y = 3808)

| ID         | Nombre                                          | x      | y    |
|------------|-------------------------------------------------|--------|------|
| `LbG7X`    | Compartir ruta (sheet)                          | 0      | 3808 |
| `DKTgF`    | Unirse a party (sheet)                          | 453    | 3808 |
| `X6VmlT`   | Party Joined Confirmation (overlay)             | 906    | 3808 |
| `gYdbc`    | Party - Miembros (sheet)                        | 1359   | 3808 |
| `E4EXLu`   | Plan tanqueo party (sheet)                      | 1812   | 3808 |
| `AMu8J`    | 11 v2 - Planear ruta (read-only viewer)         | 2265   | 3808 |

Label nuevo en `x: -440, y: 3808`: crear `Label · Party / Sharing` (kicker "04 - PARTY / SHARING", título "Rodada grupal", desc "Compartir codigo, unirse al party, gestionar miembros, calculo de tanqueo colectivo, vista read-only para viewers.").

### Swimlane 5 · Detalle de ruta guardada (y = 4760)

| ID         | Nombre                              | x      | y    |
|------------|-------------------------------------|--------|------|
| `ufCBn`    | 12 - Detalle de ruta [viejo]        | 0      | 4760 |
| `m5eDAS`   | 12 v2 - Detalle de ruta (con party) | 453    | 4760 |

Label nuevo en `x: -440, y: 4760`: crear `Label · Detalle de ruta` (kicker "05 - DETALLE", título "Ruta guardada", desc "Vista expandida de una ruta nombrada en Mis Rutas. Acciones: compartir, editar, iniciar.").

### Swimlane 6 · Navegación (y = 5712)

| ID         | Nombre                                          | x      | y    |
|------------|-------------------------------------------------|--------|------|
| `O3a2f`    | 6a - Home Navegacion                            | 0      | 5712 |
| `NWLDE`    | 6a - Home Nav Activa · Sin Elevacion            | 453    | 5712 |
| `MR9RX`    | 6b - Home Nav Activa + Elevacion                | 906    | 5712 |
| `syWDe`    | 6a v2 - Nav activa con party + próximo tanqueo  | 1359   | 5712 |
| `meRZm`    | 7 - Home Recalculando                           | 1812   | 5712 |
| `FPmDk`    | 8 - Llegada                                     | 2265   | 5712 |

Label en `x: -440, y: 5712`: update `Label 04 Navegacion` (ID `Dfj4V`) `y: 5712`.

### Swimlane 7 · Form sheets (tabs) (y = 6664)

| ID         | Nombre                       | x      | y    |
|------------|------------------------------|--------|------|
| `eIwmB`    | 10 - Rutas (formSheet)       | 0      | 6664 |
| `l1bPuR`   | 13 - Mi Garaje (formSheet)   | 453    | 6664 |
| `Q1bWZ1`   | 15 - Perfil (formSheet)      | 906    | 6664 |

Label en `x: -440, y: 6664`: update `Label 06 Tabs` (ID `pCYMo`) `y: 6664`.

### Swimlane 8 · Helpers / sistema (y = 7616)

| ID         | Nombre                         | x      | y    |
|------------|--------------------------------|--------|------|
| `LKRyq`    | Navigation Map (meta)          | 0      | 7616 |
| `UjrOg`    | Design Tokens                  | 906    | 7616 |

Label en `x: -440, y: 7616`: update `Label 08 Sistema` (ID `FA4j7`) `y: 7616`.

### Swimlane 9 · Reusables / componentes (y = 8568)

Los 4 reusables ya están en su área. Solo asegurarse que estén en `y: 8568` (probablemente ya están):

| ID         | Nombre                | x      | y    |
|------------|-----------------------|--------|------|
| `YsVAk`    | Map Nav 3D            | 0      | 8568 |
| `yde3c`    | SearchBar/Default     | 453    | 8568 |
| `IRAc4`    | SearchBar/Searching   | 906    | 8568 |
| `Uz9qV`    | SearchBar/AddStop     | 1359   | 8568 |

Label en `x: -440, y: 8568`: update `Label 10 Reusables` (ID `YbQq0`) `y: 8568`.

## Labels obsoletos a borrar / consolidar

Estos labels viejos quedan reemplazados por los swimlanes nuevos — **borrarlos** después de mover el resto:

- `me2cZ` (Label 05 Estados) — los estados quedan repartidos en sus respectivos swimlanes (Onboarding, Búsqueda, Navegación).
- `n5o12` (Label 07 Forms y Legacy) — Registrar moto va en Onboarding.
- `hbEUd` (Label 09 Tokens) — Design Tokens va al swimlane Sistema.

## Conexiones (flechas) opcionales

Si Pencil soporta `connection` nodes, agregar flechas de conexión entre frames consecutivos del flow (ej. de `Sign In` → `Home Sin Moto`). Si no soporta, dejarlo y agregar notas de "→ ver swimlane N" donde aplique.

## Verificación

Al terminar:

1. Llamar `get_editor_state` para listar todos los frames y verificar que el documento se sigue parseando.
2. Tomar screenshots de cada swimlane (no de cada frame individual) para confirmar visualmente que los frames quedaron alineados y en orden. Usar `get_screenshot` con un nodo wrapper o pegando coordenadas manualmente.
3. Reportar al usuario:
   - Cuántos frames se reposicionaron.
   - Cuántos labels nuevos se crearon.
   - Si hubo algún frame que no aparezca en este prompt y dónde lo dejaste.

## Notas

- El archivo está en `C:\Users\Usuario\Documents\dev\road-trip\designs\home-v2.pen` (Windows).
- Tokens de design system (`stopStart`, `stopFood`, etc.) ya están definidos — no tocar.
- Si encuentras un frame con un ID que NO está en este prompt, NO lo muevas; reportalo al usuario para que decida dónde va.
- Si un ID listado en este prompt NO EXISTE en el documento (puede pasar si el archivo cambió), reportalo y omite esa operación. No abortes el resto.

¿Listo? Ejecuta el reordenamiento.
````

---

## Notas para el usuario sobre cómo usar este prompt

- **Lo entregás a otra sesión** del Pencil CLI (puede ser una sesión nueva de Claude Code con el MCP de Pencil conectado) o a un agente Plan/general-purpose con acceso al MCP.
- **No requiere contexto previo**: incluye todos los IDs, coordenadas, reglas y verificación. La sesión receptora solo necesita poder llamar `mcp__pencil__batch_design` con operaciones `M()` o `U()`.
- **Reversible**: las operaciones de mover (`U` o `M`) no destruyen contenido. Si algo queda raro, podés pegarle al agente "deshacé los moves del último batch".
- **Si el archivo cambió** (frames nuevos / borrados desde esta sesión), el prompt te avisa de los IDs faltantes; podés agregarlos al swimlane que corresponda manualmente.
