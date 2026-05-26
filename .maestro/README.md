# E2E con Maestro

Tests E2E del flow principal de Road Trip (Home + planeacion de ruta).
Maestro es CLI, no se instala via npm — instalalo con
`curl -Ls "https://get.maestro.mobile.dev" | bash` (o sigue
https://docs.maestro.dev/getting-started/installing-maestro).

## Prerequisitos

1. **Emulador Android** corriendo (Pixel 6 API 34 o similar).
2. **Dev client instalado** en el emulador. Ejecuta una vez
   `npm run android` para construirlo.
3. **`DEV_FLAGS.bypassAuth = true`** en
   [../src/config/devFlags.ts](../src/config/devFlags.ts). Esto inyecta un
   rider falso y la app arranca directo en Home sin login.
4. **`DEV_FLAGS.mockDestination = true`** — el flow `03_route_planning`
   necesita el boton "Ruta de prueba" que solo aparece con este flag.
5. **Permiso de ubicacion concedido** al menos una vez en el emulador. El
   FAB de ruta de prueba se renderiza tras `hasLocation === true`.

## Como correr

En una terminal: `npm start` (sirve Metro).
En otra terminal:

```bash
npm run test:e2e            # todos los flows
npm run test:e2e:home       # solo home (01 + 02)
npm run test:e2e:routes     # solo planeacion (03)
```

## Selectores

Los flows usan `testID` (mapea a `accessibilityIdentifier` en native).
Convencion:

- `screen-<nombre>` para los contenedores raiz.
- `<screen>-<elemento>` para botones, inputs y chips interactivos.

Si un flow falla, Maestro escribe screenshots y logs en
`~/.maestro/tests/<timestamp>/`. Tambien podes inspeccionar la UI en vivo
con `maestro studio`.
