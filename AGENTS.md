# Road Trip — Agent instructions

App movil (Expo SDK 54 + React Native) para moteros: planear rutas, estimar
autonomia y sugerir paradas de tanqueo. Sigue el clean-architecture-stack
(MVVM + MobX + Inversify + Clean Architecture).

## Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before
writing any code.

## Skills — leelas antes de tocar codigo

- `.claude/skills/react-native/clean-architecture-rn-expo-mvvm.md` — reglas de capas,
  DI y ViewModel canonico.
- `.claude/skills/react-native/feature-scaffold-rn.md` — como crear un slice vertical.
- `.claude/skills/react-native/design-system-rn.md` — tokens y componentes de UI.
- `.claude/skills/react-native/realtime-and-global-state-rn.md` — streams
  (`SubscriptionUseCase`), stores globales, sync/offline.
- `.claude/skills/react-native/unit-testing-clean-architecture.md` — contrato de tests
  obligatorio por feature (Jest + jest-expo, cobertura > 70%).
- `.claude/skills/react-native/pr-checklist-clean-architecture.md` — checklist de PR.
- `.claude/skills/meta/skill-authoring.md` — formato canonico y convencion para
  mantener/sincronizar estas skills.
- `.claude/skills/road-trip/road-trip-domain.md` — contexto de dominio de esta app y
  divergencias intencionales frente a las skills del stack.

## Comandos

- `npm run lint` / `npm run format:check` — deben pasar antes de entregar.
- `npm test` / `npm run test:coverage` — Jest + jest-expo, cobertura > 70%.
- `npm start` — requiere development build (Mapbox no corre en Expo Go).

## Notas

- Reemplazar los placeholders `SET_*` de `app.json` (tokens Mapbox + Firebase).
- Alias de imports: `@/*` -> `src/*`.
