---
name: unit-testing-clean-architecture
description: Write and review unit tests for the RN (Expo) MVVM + MobX + Inversify Clean Architecture. Tests are mandatory for every feature. Use when adding or refactoring UseCases, ViewModels, models, services, or repositories, or before merging any PR that touches business logic.
---

<purpose>
Tests are part of the feature, not an afterthought. A feature is "done" only when its UseCases
and ViewModel ship with tests; a PR that adds or changes business logic without tests is
incomplete and must not be merged. This is a blocking gate, and the single source of truth for
testing — other skills (feature-scaffold, pr-checklist) defer here for detail.
</purpose>

<when_to_use>

- Create or refactor a UseCase, ViewModel, model, service, or repository implementation.
- Add validation schemas, debounce/retry logic, or sync/offline behavior.
- Review test quality or coverage in a PR.
- Decide what to test, how to mock, and what coverage is acceptable.
  </when_to_use>

<rules>

### Testing stack (mandatory)

- Jest + jest-expo as the test runner. Do not use Vitest in these projects.
- Test environment: `node` (pure logic). Add `@testing-library/react-native` only when asserting
  real screen rendering — most coverage comes from ViewModel/UseCase unit tests.
- `reflect-metadata` must be imported by the Jest setup if decorated classes are instantiated.
- Required `package.json` scripts:
  - `test`: `jest`
  - `test:watch`: `jest --watch`
  - `test:coverage`: `jest --coverage`

### Golden rule: no DI container in unit tests

Unit tests never call `container.get(...)`. Instantiate the class under test directly, passing
`jest.fn()`-backed mocks for its dependencies. The DI container is for production wiring only;
tests prove the class works against its contracts, not against the container. See the
`di-free-instantiation` example.

### Folder layout (mandatory)

Tests live under `src/__test__/`, mirroring the source tree:

```
src/__test__/
├── setupTests.ts                       # global setup (console silencing, native mocks)
├── factories.ts                        # entity/model factories (makeClient, makeRoute, …)
├── domain/
│   └── useCases/<UseCaseName>.test.ts
├── data/
│   ├── models/<entity>Model.test.ts
│   ├── repositories/<Feature>RepositoryImpl.test.ts
│   └── services/<Feature>Service.test.ts
├── ui/
│   ├── viewModels/<Feature>ViewModel.test.ts
│   └── screens/<Feature>Screen.test.tsx   # only when using RTL
└── store/<Store>.test.ts                   # global stores, if any
```

### Global setup (mandatory)

Keep test noise out of CI with a single global setup, never per-test ad-hoc muting. Wire one
`setupTests.ts` into `jest.config` — see the `global-setup` and `jest-config` examples.

### Factories (mandatory for shared fixtures)

Centralize sample entities/models in `src/__test__/factories.ts` so tests stay DRY and
intention-revealing. Each factory takes overrides — see the `factories` example.

### What to test, by layer

**UseCase**

1. Happy path — returns expected output and calls the repository contract.
2. Error path — error from the repository propagates (or is handled as designed).
3. Collaboration — assert `toHaveBeenCalledWith(...)` so the contract is locked.

**ViewModel**

- State transitions for each async action: `loading → response` and `loading → error`.
- Computed getters consumed by the UI (`isLoaded`, `submitError`, `hasSubmitSuccess`, …).
- Entrypoints (`initialize`, `submit`, `consumeResult`, `reset`).
- Error normalization: cover both `Error` and non-`Error` thrown values.
- Branching: create-vs-update mode, null response, stale/debounced states.

**Model**

- `fromJson` parses backend shape (including `snake_case` and missing fields).
- `toJson` round-trips.
- `toDomain` maps to the entity and renames fields correctly at the boundary.
- Date edge cases: ISO string, `Date`, Firebase `Timestamp`-like (`{ toDate() }`), and a
  bad/missing value that hits the fallback. This is the #1 source of mapping bugs in practice.

**Service**

- If the service unwraps/normalizes API responses or errors, test both the wrapped payload shape
  and the plain payload shape, plus the error-normalization branch.

**Repository implementation**

- Maps models to entities (no transport shapes leak out).
- Sync/offline invariants when applicable: e.g. a sync must not overwrite local unsynced changes.
  Make the invariant an explicit test (see offline-first repos).

### Async, timers, and reactive behavior

- Debounce / retry: use `jest.useFakeTimers()`; assert the stale-input branch (a newer input
  supersedes an in-flight one) and the final settled state.
- Optimistic update + rollback: assert the field flips immediately, then reverts to the previous
  value when the UseCase rejects — see the `optimistic-rollback` example.
- Subscriptions / observables: assert the ViewModel subscribes on `initialize`, updates on emit, and
  tears down on `dispose` (no leaked subscriptions). See [[realtime-and-global-state-rn]].

### Coverage policy

- Baseline: ≥ 70% global (`npm run test:coverage`). Target > 80% for bounded features; reference
  implementations reach ~88%.
- Cover behavior, not lines — don't add assertion-free tests to inflate metrics.
- Acceptable coverage exclusions (report noise only, zero business logic):
  - logger wrappers (e.g. `src/ui/utils/Logger.ts`)
  - pure type/interface contracts (`domain/repositories/*`, `domain/services/*`)
  - generated/native bridge files
- Never exclude ViewModels, UseCases, repositories, services, validators, or stores.

### E2E (complement, not a substitute)

Unit tests are the floor. For critical user journeys, add Maestro flows (`.maestro/flows/*.yaml`)
as smoke/E2E coverage. E2E does not replace the unit-test gate.

</rules>

<examples>

<example name="di-free-instantiation">
```ts
// ✅ Correct — direct instantiation with mocked collaborators
const getAll = { run: jest.fn().mockResolvedValue([sampleClient]) };
const viewModel = new ClientsViewModel(getAll as unknown as GetAllClientUseCase);
await viewModel.loadAll();
expect(viewModel.isItemsResponse).toEqual([sampleClient]);

// ❌ Wrong — pulling the real graph from the container
const viewModel = container.get<ClientsViewModel>(TYPES.ClientsViewModel);

````
</example>

<example name="global-setup">
```ts
// src/__test__/setupTests.ts
import 'reflect-metadata';

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});
````

</example>

<example name="jest-config">
```js
// jest.config.js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/src/__test__/setupTests.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
};
```
</example>

<example name="factories">
```ts
// src/__test__/factories.ts
import { Client } from '@/domain/entities/Client';

export const makeClient = (overrides: Partial<ClientConstructorParams> = {}): Client =>
new Client({
id: 'c1',
name: 'Ada Lovelace',
email: 'ada@corp.com',
...overrides,
});

````
</example>

<example name="usecase-test">
```ts
describe('GetAllClientUseCase', () => {
  it('returns clients from the repository', async () => {
    const repo = { getAll: jest.fn().mockResolvedValue([makeClient()]) };
    const uc = new GetAllClientUseCase(repo as unknown as ClientRepository);

    const result = await uc.run();

    expect(repo.getAll).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
  });

  it('propagates repository errors', async () => {
    const repo = { getAll: jest.fn().mockRejectedValue(new Error('boom')) };
    const uc = new GetAllClientUseCase(repo as unknown as ClientRepository);

    await expect(uc.run()).rejects.toThrow('boom');
  });
});
````

</example>

<example name="viewmodel-test">
```ts
describe('ClientsViewModel.loadAll', () => {
  const build = () => {
    const getAll = { run: jest.fn() };
    const viewModel = new ClientsViewModel(getAll as unknown as GetAllClientUseCase);
    return { viewModel, getAll };
  };

it('sets response on success and clears loading', async () => {
const { viewModel, getAll } = build();
getAll.run.mockResolvedValue([makeClient()]);

    await viewModel.loadAll();

    expect(viewModel.isItemsLoading).toBe(false);
    expect(viewModel.isItemsResponse).toHaveLength(1);
    expect(viewModel.isLoaded).toBe(true);

});

it('records a normalized error on failure', async () => {
const { viewModel, getAll } = build();
getAll.run.mockRejectedValue('plain string failure');

    await viewModel.loadAll();

    expect(viewModel.isItemsLoading).toBe(false);
    expect(viewModel.isItemsError).toContain('plain string failure');

});
});

````
</example>

<example name="optimistic-rollback">
```ts
it('reverts optimistic toggle when the use case fails', async () => {
  const toggle = { run: jest.fn().mockRejectedValue(new Error('offline')) };
  const viewModel = new HomeViewModel(/* …mocks… */, toggle as unknown as ToggleTaskCompletedUseCase);
  viewModel.tasks = [makeTask({ id: 't1', completed: false })];

  await viewModel.toggleTaskStatus('t1');

  expect(viewModel.tasks.find((t) => t.id === 't1')?.completed).toBe(false); // rolled back
});
````

</example>

</examples>

<output_format>
Definition of done for every feature:

1. UseCase happy path + error path + collaboration assertions.
2. ViewModel: state transitions, computed getters, `reset`/`consume*Result`, error
   normalization (`Error` and non-`Error`).
3. At least one mutating action (`create`/`update`/`delete`) with success and failure.
4. Model mapping incl. date edge cases (when a model exists).
5. Service unwrap/normalization branches (when a service exists).
6. Repository mapping + sync invariants (when offline/sync exists).
7. `npm run test` green, `npm run test:coverage` ≥ 70% global.
8. No `container.get` in tests; no real network/Firebase/timers (unless fake timers).
   </output_format>

<see_also>

- [[realtime-and-global-state-rn]] — subscription/observable lifecycle and global-state testing.
- [[feature-scaffold-rn]] — generates the feature whose tests this skill governs.
- [[pr-checklist-clean-architecture]] — review gate enforcing this testing requirement.
- [[clean-architecture-rn-expo-mvvm]] — the architecture these tests verify.
  </see_also>
