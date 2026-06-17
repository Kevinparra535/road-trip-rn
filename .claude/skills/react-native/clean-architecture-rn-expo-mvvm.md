---
name: clean-architecture-rn-expo-mvvm
description: Apply this stack's Clean Architecture for React Native (Expo) using MVVM + MobX + Inversify — layer boundaries, folder placement, naming, UseCase/entity/model contracts, DI bindings, and the ViewModel pattern. Use when creating or refactoring features, screens, viewmodels, use cases, repositories, services, or DI wiring.
---

<purpose>
This skill enforces the canonical layering for RN (Expo) features: a strict dependency
direction (UI → ViewModel → UseCase → domain contracts ← data implementations) plus the
contracts, naming, and DI wiring that keep features substitutable, testable, and free of
framework leakage. It is the architectural baseline every other RN skill builds on.
</purpose>

<when_to_use>
- Adding a new screen/feature module.
- Creating or refactoring ViewModels, UseCases, repositories, or services.
- Touching DI (`src/config/di.ts`, `src/config/types.ts`).
- Needing folder placement conventions or dependency-direction rules.
</when_to_use>

<rules>

### Dependency direction (non-negotiable)

- UI/View depends on ViewModel only.
- ViewModel depends on UseCases, not repositories directly.
- UseCases depend on domain contracts (interfaces), not data implementations.
- Data layer implements repositories/services and talks to Firebase/network.
- Domain layer stays free of framework/infrastructure.
- ViewModel is UI-agnostic: no React hooks, no navigation calls, no Alert/toast/snackbar APIs, no component imports — so the same ViewModel is portable and unit-testable without a renderer.
- UI screens stay thin: bind inputs, call ViewModel actions, render ViewModel state.

### SOLID (golden rule — apply whenever it applies)

SOLID is, alongside the dependency direction, the other golden rule of this stack. Honor it in every layer; deviate only with a documented reason.

- **S — Single Responsibility:** Screen renders UI only, ViewModel manages presentation state/actions, UseCase executes one business action, Repository/Service handles persistence/integration.
- **O — Open/Closed:** extend behavior through new use cases/services or new implementations; avoid editing stable contracts unless the requirement truly changes.
- **L — Liskov Substitution:** every implementation is safely substitutable for its interface (same input/output expectations, no hidden side effects).
- **I — Interface Segregation:** prefer small focused contracts; split interfaces when consumers use only subsets of behavior (e.g. `UseCase` vs `SubscriptionUseCase` for streams).
- **D — Dependency Inversion:** upper layers depend on abstractions from `domain/*`; concrete implementations are wired only through DI (`TYPES` + bindings). The single documented exception is the scoped `Logger` (see ADR 006): it is instantiated, not injected, because it has no substitution need — DIP applies when there is something to substitute.

### Folder placement

- UI screens + components: `src/ui/...`
- ViewModels: colocated next to screens (e.g. `src/ui/screens/<Feature>/<Feature>ViewModel.ts`)
- Use cases: `src/domain/useCases/<UseCaseName>/index.ts` (one folder per use case)
- Domain entities: `src/domain/entities/`
- Repository contracts: `src/domain/repositories/`
- Domain service contracts: `src/domain/services/`
- Data implementations: `src/data/...` (services/network/models/repositories)
- Data models: `src/data/models/<entityModel>.ts` with `fromJson/toJson/toDomain`
- Transport managers (Axios/Firebase/WS/DB adapters): `src/data/network/`
- Global stores (session/network/location): `src/ui/store/<Name>Store.ts`
- Shared hooks (e.g. `useViewModel`): `src/ui/hooks/`
- Form schemas/validators (Zod): `src/ui/schemas/` (or `src/ui/validators/`)
- Env config (Zod-validated): `src/config/env.ts`
- Logger: `src/ui/utils/Logger.ts` (instantiated per consumer, not injected)

### Naming conventions

- `XxxScreen.tsx`
- `XxxViewModel.ts`
- `<UseCaseName>/index.ts` for each use case folder (e.g. `GetAllBankUseCase/index.ts`)
- `XxxRepository` (interface in domain)
- `XxxRepositoryImpl` (implementation in data)
- `XxxService` / `XxxServiceImpl` as needed
- ViewModel instance variable (in screens and tests) is always `viewModel`, never `vm`. Spell out `ViewModel` in prose too.

### Lint + format baseline (mandatory)

- Keep and use existing project config: `eslint.config.js`, `.prettierrc`, `.prettierignore`.
- Required `package.json` scripts: `lint` (`eslint .`), `lint:fix` (`eslint . --fix`), `format` (`prettier --write .`), `format:check` (`prettier --check .`).
- Keep `eslint-config-prettier` enabled in flat config so lint and format rules don't conflict.
- Run `npm run lint` and `npm run format:check` before handing off architecture/scaffold tasks.

### UseCase base contract (mandatory)

- Keep `src/domain/useCases/UseCase.ts` as the canonical base interface.
- Every use case imports `UseCase` from `@/domain/useCases/UseCase` and `implements UseCase<Input, Output>`.
- Use `run(data)` as the execution method (or `run()` with `void` input), not ad-hoc method names — so all use cases invoke identically.

### Entity + model contract (mandatory)

- Entities in `domain/entities` are class-based with a constructor params type, `[key: string]: any`, and `Object.assign(this, params)`.
- Models in `data/models` expose: a constructor params type; date conversion helper(s) (`unknown` → `Date`); `static fromJson(json)`; `toJson()`; and module augmentation + `prototype.toDomain()` returning the domain entity class.
- Keep exact field names defined by product/backend (`snake_case`, custom names, etc.).

### DI (Inversify)

- All injectable classes use `@injectable()`; constructor dependencies use `@inject(TYPES.Something)`.
- Register in `src/config/di.ts` and add the symbol in `src/config/types.ts`.
- Prefer singleton for services/managers; transient for UseCases and ViewModels unless specified.
- Adding a new module: (1) add `TYPES.<NewThing>` in `types.ts`; (2) bind in `di.ts` — Manager/Service `.inSingletonScope()` if shared, UseCases transient, ViewModel transient (singleton only if truly global).

### ViewModel pattern (MobX)

- Call `makeAutoObservable(this)` in the constructor.
- Keep state as fields, actions as methods, computed as getters.
- Prefer `reaction(...)` for autosave side effects (with debounce).
- Keep business-flow decisions in the ViewModel (create vs update, initialize/load, mapping form values to domain entities); Firebase calls go through UseCases, never in UI components.
- UI carries no branching business flow beyond simple event wiring (`onPress`, `onChange`, `useEffect` bridge).

#### ViewModel naming standard

- Group async state by responsibility. A generic group is the default (`isItemsLoading/Error/Response`, `isSubmitting/isSubmitError`); switch to entity-explicit names (`isCreate<Entity>Loading`, `is<Entity>Response`, etc.) when one ViewModel handles several entities and generic names would collide.
- `ICalls` may stay operation-centered (`'loadBank' | 'createBank' | 'updateBank'`), but public state naming prioritizes readability and direct responsibility.
- For edit-mode form defaults, expose a ViewModel getter (e.g. `formValues`) instead of composing values in UI.
- `reset()` clears transient UI-facing state (loading/error/success flags), preserving persisted domain state only if intended.

### Logger standard (mandatory)

The scoped logger is a deliberate DI exception: it has no behavior worth substituting in tests
and is needed everywhere, so threading it through DI adds ceremony with no payoff.

- A `Logger` class lives at `src/ui/utils/Logger.ts` (add `src/shared/Logger.ts` only if the data layer must log without importing from `ui/`).
- Instantiate it per consumer with a scope tag, not via Inversify: `private logger = new Logger('<ClassName>')`.
- Use it for all ViewModel/service/repository error logging (`this.logger.error(...)`) instead of raw `console.*`.
- It is excluded from coverage (pure report-noise wrapper).

### Manager vs Service layer (data)

The data layer has two distinct roles, kept separate so the transport library can be swapped
without touching services or repositories:

- **Manager** = raw transport adapter. Owns the third-party library (Axios, Firebase SDK, WebSocket, WatermelonDB) and exposes a small, library-agnostic interface (e.g. `AxiosHttpManager implements HttpManager`, `FirebaseManager`, `WatermelonManager`, `FinnhubSocketManager`). Lives in `src/data/network/`. Interface contracts (e.g. `HttpManager`) live in `domain/services/`; implementations bind singleton.
- **Service** = uses a Manager and converts payloads ↔ domain via models (`fromJson`/`toDomain`). Lives in `src/data/services/`.
- **RepositoryImpl** = uses a Service, returns domain entities only.

```
RepositoryImpl → Service → Manager → (Axios / Firebase / WS / DB)
```

### Environment config + validation

- All runtime config lives in `src/config/`, read from `EXPO_PUBLIC_*` env vars — never hardcode URLs, keys, or IPs in services.
- Centralize and validate env in `src/config/env.ts` with Zod, failing fast at boot with a clear list of missing/invalid vars.
- Only `EXPO_PUBLIC_`-prefixed vars reach the bundle. Keep secrets server-side (e.g. behind a Cloud Function) — never ship private API keys in the client.

### Form validation (Zod + react-hook-form)

- Form/input validation is a UI concern — schemas live in `src/ui/schemas/` (or `src/ui/validators/`), never in `domain/`.
- Use Zod schemas with `z.infer` for form types and `react-hook-form` for binding. Use the official `@hookform/resolvers/zod`, or a tiny custom `zodResolver` for zero extra deps. Use `superRefine` for cross-field rules (e.g. date-A must be one year after date-B).
- Domain entities still validate true business invariants inside UseCases/entities; form schemas validate user input shape only — don't duplicate business rules in the schema.

### Screen → ViewModel wiring

Standardize ViewModel retrieval behind the `useViewModel` hook instead of repeating `container.get(...)` inline (see examples).

### Typed navigation (mandatory)

- Define a typed param list (`RootStackParamList`) and parametrize the navigator (`createNativeStackNavigator<RootStackParamList>()`) so `navigate(...)` is type-safe.
- Navigation stays in the Screen, never in the ViewModel (the ViewModel is UI-agnostic): the screen calls `viewModel.action()` then navigates based on ViewModel result/state.
- For conditional routing (auth gate, onboarding), drive it from a global session store via an `observer` navigator — see [[realtime-and-global-state-rn]].
- Don't pass non-serializable data (entities with methods) as params — pass a plain serialized DTO and rehydrate in the ViewModel.

### Realtime, global state & offline

For live streams (Firestore/WebSocket/DB observables), app-global stores (session, network,
location), reconnection-driven sync, optimistic update + rollback, and offline-first
persistence, follow [[realtime-and-global-state-rn]]. Don't force streams into
`UseCase.run(): Promise` — use the `SubscriptionUseCase` contract.

### Unit testing (mandatory)

Tests are part of the feature: a PR that adds or changes UseCases/ViewModels/models/services
without tests is incomplete and must not merge. Baseline is Jest + jest-expo, mocks via
`jest.fn()` (never `container.get` in tests), and ≥ 70% global coverage. The full testing
contract — folder layout, factories, per-layer cases, async/timer/subscription patterns,
optimistic-rollback and sync-invariant tests, coverage policy, and the per-feature definition of
done — lives in [[unit-testing-clean-architecture]]. Apply it for every feature.

</rules>

<examples>

<example name="Entity + model contract">
```ts
export type XxxConstructorParams = { id: string; [key: string]: any };

export class Xxx {
  [key: string]: any;
  id: string;

  constructor(params: XxxConstructorParams) {
    this.id = params.id;
    Object.assign(this, params);
  }
}
```

```ts
export class XxxModel {
   static fromJson(json: any): XxxModel {
      return new XxxModel({ ...json });
   }

   toJson(): Record<string, unknown> {
      return { ... };
   }
}

declare module './xxxModel' {
   interface XxxModel {
      toDomain(): Xxx;
   }
}

XxxModel.prototype.toDomain = function toDomain(): Xxx {
   return new Xxx({ ... });
};
```
</example>

<example name="Env config + validation (Zod)">
```ts
// src/config/env.ts
import { z } from 'zod';

const schema = z.object({
  EXPO_PUBLIC_API_BASE_URL: z.string().url(),
  EXPO_PUBLIC_API_KEY: z.string().min(1),
});

export const env = schema.parse({
  EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
  EXPO_PUBLIC_API_KEY: process.env.EXPO_PUBLIC_API_KEY,
});
```
</example>

<example name="useViewModel hook + screen wiring">
```ts
// src/ui/hooks/useViewModel.ts
import { useMemo } from 'react';
import { container } from '@/config/di';

// TYPES values are Symbol.for(...), so a `symbol` id keeps this inversify-version-agnostic
export function useViewModel<T>(type: symbol): T {
  // empty deps: transient ViewModel instantiated once per screen mount
  return useMemo(() => container.get<T>(type), [type]);
}
```

```tsx
const ClientsScreen = observer(() => {
  const viewModel = useViewModel<ClientsViewModel>(TYPES.ClientsViewModel);
  useEffect(() => { viewModel.loadAll(); }, [viewModel]);
  // …
});
```
</example>

</examples>

<output_format>
When implementing a request:

- Propose the file list you will create/edit.
- Follow the layer rules above.
- Provide minimal diffs or clear code blocks per file.
- Update DI bindings if new classes are added.
- Include the unit test files/cases added and how to run them (`npm test` or a targeted jest command).
</output_format>

<see_also>
This project's reference stack: React Native (Expo) + MVVM, MobX for state, Inversify for DI, a
UseCases layer per action, and a data layer (RepositoryImpl → Service → Manager → Firebase/network).

- [[unit-testing-clean-architecture]] — the mandatory per-feature testing contract.
- [[realtime-and-global-state-rn]] — live streams, global stores, sync, and offline-first.
- [[design-system-rn]] — UI/component conventions.
- [[feature-scaffold-rn]] — scaffolding a new feature module end to end.
- [[pr-checklist-clean-architecture]] — review gate enforcing these conventions.
</see_also>
