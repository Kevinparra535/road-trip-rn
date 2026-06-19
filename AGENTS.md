# Road Trip — Agent instructions

App movil (Expo SDK 54 + React Native) para moteros: planear rutas, estimar
autonomia y sugerir paradas de tanqueo. Sigue el clean-architecture-stack
(MVVM + MobX + Inversify + Clean Architecture).

## Prioridad de instrucciones

- Si una skill generica contradice `.claude/skills/road-trip/road-trip-domain.md`
  o el patron existente del repo, gana Road Trip y el patron existente.
- Antes de inventar estructura, inspecciona codigo similar en `src/` y tests en
  `src/__test__/`.
- Mantén las capas estrictas: UI -> ViewModel -> UseCases -> contratos de dominio;
  `data/` implementa contratos y habla con Firebase/HTTP.

## Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before
writing any code.

## Skills — lectura obligatoria

Antes de tocar codigo, lee:

- `.claude/skills/react-native/clean-architecture-rn-expo-mvvm.md` — reglas de capas,
  DI, ViewModel canonico y tests base.
- `.claude/skills/road-trip/road-trip-domain.md` — contexto de dominio y
  divergencias intencionales de este repo frente al stack generico.

Lee tambien, segun el trabajo:

- `.claude/skills/react-native/feature-scaffold-rn.md` — features, pantallas o
  slices verticales nuevos.
- `.claude/skills/react-native/design-system-rn.md` — UI visible, estilos,
  componentes o tokens.
- `.claude/skills/react-native/realtime-and-global-state-rn.md` — streams,
  `SubscriptionUseCase`, stores globales, sync/offline.
- `.claude/skills/react-native/unit-testing-clean-architecture.md` — UseCases,
  ViewModels, models, services, repositories o cambios de logica.
- `.claude/skills/react-native/pr-checklist-clean-architecture.md` — revisiones,
  validacion antes de merge o antes de entregar cambios grandes.
- `.claude/skills/meta/skill-authoring.md` — solo si editas o sincronizas skills.

## Reglas especificas de Road Trip

- Contratos de repositorios viven en `src/domain/repositories/`.
- Contratos de servicios de datos que devuelven Models o hablan con Firebase/HTTP
  viven junto a sus implementaciones en `src/data/services/`; no los muevas a
  `domain/services/`. La excepcion actual es `src/domain/services/HttpManager.ts`.
- Data sigue `RepositoryImpl -> Service -> Manager -> Firebase/HTTP`.
  Managers de transporte viven en `src/data/network/`.
- Screens obtienen ViewModels/Stores con `useViewModel<T>(TYPES.X)`, no con
  `container.get` inline.
- Unit tests instancian clases directamente con mocks `jest.fn()`; nunca usan el
  contenedor Inversify.
- Si tocas capas custom de Mapbox (`LineLayer`, `FillLayer`, `CircleLayer`), usa
  `slot="top"` para evitar render negro sobre estilos de Mapbox Studio.

## Comandos

- Antes de entregar codigo: `npm run lint`, `npm run format:check` y
  `npm run typecheck`.
- Para cambios de logica/features: `npm test` y `npm run test:coverage`
  (Jest + jest-expo, cobertura global >= 70%).
- Para flujos criticos de UI/navegacion, corre el E2E relevante:
  `npm run test:e2e:home`, `npm run test:e2e:routes` o `npm run test:e2e`.
- `npm start` requiere development build (`expo start --dev-client -c`);
  Mapbox no corre en Expo Go.

## Notas

- Reemplazar los placeholders `SET_*` de `app.json` (tokens Mapbox + Firebase)
  antes de buildear. No commitear secretos privados.
- Alias de imports: `@/*` -> `src/*`.
