---
name: pr-checklist-clean-architecture
description: Review gate that verifies a PR or changeset respects Clean Architecture (RN Expo + MVVM + MobX + Inversify) rules — dependency direction, layer correctness, DI, ViewModel quality, conventions, and the testing gate. Use when reviewing code or before merging.
---

<purpose>
This checklist is the merge gate for the stack: it confirms a changeset keeps the dependency
rule intact, models each layer correctly, wires DI properly, keeps ViewModels UI-agnostic,
follows cross-cutting conventions, and ships the tests the architecture requires. Passing it means
the PR is safe to merge without eroding the architecture.
</purpose>

<when_to_use>
- Reviewing a PR or changeset for architecture compliance.
- Self-checking a branch before opening or merging a PR.
- Gating any change that touches UseCases, ViewModels, models, services, or repositories.
</when_to_use>

<checklist>

### Dependency direction

- [ ] UI does not import `data/*` or Firebase directly
- [ ] ViewModels do not import `data/*`
- [ ] UseCases do not import `data/*`
- [ ] Domain does not import framework libs

### Layer correctness

- [ ] New actions are modeled as UseCases (1 action = 1 use case)
- [ ] Streaming actions implement `SubscriptionUseCase` (not `UseCase.run(): Promise`)
- [ ] Repositories are interfaces in `domain/` and implemented in `data/`
- [ ] Data returns mapped domain entities (no Firestore snapshots to UI)
- [ ] Transport library (Axios/Firebase/WS/DB) is isolated in a Manager (`data/network/`); services/repos don't import it directly

### DI correctness

- [ ] New TYPES added in `types.ts`
- [ ] Bindings exist in `di.ts` with appropriate lifetimes
- [ ] All injected classes are `@injectable()`
- [ ] Constructor deps use `@inject(TYPES.X)`

### ViewModel quality

- [ ] `makeAutoObservable(this)` used
- [ ] Actions / computed are clear
- [ ] Side effects use `reaction` with debounce when needed
- [ ] Error & loading states handled
- [ ] ViewModel is UI-agnostic (no navigation/Alert/toast/hooks/components)
- [ ] ViewModel does not import, inject, or consume another ViewModel
- [ ] Async state naming is explicit by responsibility (`isCreateXLoading`, `isXResponse`, `isUpdateXError`, etc.)
- [ ] Screen has no flow/business logic (no create-vs-update branching in UI)
- [ ] Form hydration/transformation logic lives in ViewModel (e.g. `formValues` getter)
- [ ] ViewModel instance variable is named `viewModel`, never `vm`
- [ ] Logging uses the scoped `Logger` (`new Logger('ClientsViewModel')`), not raw `console.*`
- [ ] Streams/subscriptions are torn down (ViewModel `dispose()` wired to screen `useEffect` cleanup)

### UI screen boundary

- [ ] Every new screen lives in `src/ui/screens/<Feature>/`
- [ ] Every screen folder includes `<Feature>Screen.tsx` and `<Feature>ViewModel.ts`
- [ ] `XxxScreen.tsx` imports/consumes only its colocated `./XxxViewModel`
- [ ] `XxxScreen.tsx` does not resolve `TYPES.<OtherFeature>ViewModel`
- [ ] No subcomponents are declared inside `XxxScreen.tsx`
- [ ] Screen-only components live in `src/ui/screens/<Feature>/components/`
- [ ] Shared components live in `src/ui/components/`
- [ ] Screen files do not declare top-level config constants except `StyleSheet`
- [ ] Visual constants use design-system tokens (`src/ui/styles/*`), not raw numbers/strings in screens
- [ ] Reusable UI behavior options live in `src/config/`, not `src/ui/config/`
- [ ] Screen files do not filter/map/sort/transform domain data; ViewModel exposes display-ready state/getters

### Cross-cutting conventions

- [ ] Screen retrieves ViewModel via `useViewModel(TYPES.X)` (not inline `container.get`)
- [ ] Navigation is typed (`RootStackParamList`) and lives in the Screen, not the ViewModel
- [ ] Non-serializable data passed through navigation as a serialized DTO, rehydrated in ViewModel
- [ ] No hardcoded URLs/keys; config read from `EXPO_PUBLIC_*` via Zod-validated `config/env.ts`
- [ ] Private keys/secrets are NOT in the client bundle
- [ ] Form validation uses Zod schemas in `ui/schemas` (not in `domain/`)
- [ ] Global state lives in an `@injectable()` singleton `Store` (`ui/store/`), not a leaked ViewModel

### Testing / QA — BLOCKING GATE

> Tests are part of the feature. A PR that adds/changes UseCases, ViewModels, models, services,
> or repositories **without tests must not be merged.** Full contract:
> [`unit-testing-clean-architecture`](./unit-testing-clean-architecture.md).

- [ ] **New/changed UseCases and ViewModels ship with tests** (blocking)
- [ ] `npm run test` passes locally
- [ ] `npm run test:coverage` passes and global coverage stays ≥ 70%
- [ ] New/changed ViewModels include tests for success, error, and computed state branches
- [ ] Error normalization covers both `Error` and non-`Error` thrown values
- [ ] UseCases include contract-collaboration tests (`toHaveBeenCalledWith`)
- [ ] Services/repositories with mappers include unwrap/normalization branch tests when applicable
- [ ] Model mapping tests cover date edge cases (ISO/Date/Timestamp/missing) when a model exists
- [ ] Offline/sync code tests the non-destructive merge invariant; optimistic actions test rollback
- [ ] Subscriptions tested for subscribe-on-init and teardown-on-dispose
- [ ] No `container.get` in unit tests; no real network/Firebase/timers (unless fake timers)
- [ ] Global test setup is respected (`src/__test__/setupTests.ts`) to keep CI output clean
- [ ] Coverage exclusions are justified and limited to non-behavioral files (e.g., logger wrappers, pure interfaces)
- [ ] No sensitive keys committed
- [ ] `npm run lint` passes
- [ ] `npm run format:check` passes
- [ ] Build/typecheck passes (if applicable)

</checklist>

<see_also>
- [[unit-testing-clean-architecture]] — the full testing contract this gate enforces.
- [[clean-architecture-rn-expo-mvvm]] — the architecture rules this checklist verifies.
- [[realtime-and-global-state-rn]] — subscription teardown and global `Store` conventions.
</see_also>
