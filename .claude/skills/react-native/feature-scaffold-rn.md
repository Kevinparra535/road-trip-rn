---
name: feature-scaffold-rn
description: Scaffold a new feature module in RN (Expo) following our MVVM + MobX + Inversify Clean Architecture. Use when creating a screen/feature end-to-end with UseCases, repository contract, repo impl, service, DI bindings, and unit tests.
---

<purpose>
Generate the full vertical slice of a feature — UI Screen + ViewModel + UseCases + domain
contracts + data implementations + DI bindings + tests — so every feature lands with the same
layering, the same canonical entity/model/ViewModel shape, and the same wiring. Consistency here
is what keeps the architecture inspectable and the layers swappable.
</purpose>

<when_to_use>
- Creating a new feature end-to-end (e.g. "Clients", "Measurements", "Sessions").
- Adding a screen that needs its own UseCases, repository contract, repo impl, and service.
- Wiring a new feature into Inversify DI with its tests.
</when_to_use>

<rules>

### Inputs (infer when missing)

Ask for, or default, the following:

- Feature name (PascalCase): `Feature`
- Main entities involved (e.g. Client, Session)
- CRUD actions required — default: list/get/create/update/delete
- Data source / manager — default: REST via Axios

When unspecified, assume a REST backend with an Axios manager, standard CRUD use cases, and a
minimal UI skeleton with basic ViewModel state/actions.

### Files to create (default scaffold)

**UI**

- `src/ui/screens/<Feature>/<Feature>Screen.tsx`
- `src/ui/screens/<Feature>/<Feature>ViewModel.ts`
- `src/ui/screens/<Feature>/components/` (only if needed)

**Domain**

- `src/domain/entities/<Entity>.ts` (if new)
- `src/domain/repositories/<Feature>Repository.ts`
- `src/domain/useCases/`
  - `GetAll<Feature>UseCase/index.ts`
  - `Get<Feature>UseCase/index.ts`
  - `Create<Feature>UseCase/index.ts`
  - `Update<Feature>UseCase/index.ts`
  - `Delete<Feature>UseCase/index.ts`
  - `UseCase.ts` (base interface)

**Data**

- `src/data/models/<entityModel>.ts` (DTO/JSON ↔ Domain mapper)
- `src/data/services/<Feature>Service.ts` (delegates to the selected manager)
- `src/data/repositories/<Feature>RepositoryImpl.ts`
- `src/data/network/<Manager>.ts` (only when a new transport adapter is needed — reuse the shared `HttpManager`/`FirebaseManager` otherwise)

**Forms** (only when the feature has user input)

- `src/ui/schemas/<feature>.schema.ts` (Zod schema + `z.infer` type; bind with react-hook-form)

**DI**

- Edit `src/config/types.ts`
- Edit `src/config/di.ts`

**Unit tests**

- `src/__test__/domain/useCases/<feature>/` (use case tests)
- `src/__test__/ui/viewModels/<Feature>ViewModel.test.ts` (viewmodel tests)
- Optional: `src/__test__/data/repositories/<Feature>RepositoryImpl.test.ts` (mapping/contract tests)
- Recommended: `src/__test__/data/services/<Feature>Service.test.ts` when service has unwrap/normalization logic
- Recommended: `src/__test__/data/network/*HttpManager.test.ts` when adding/changing transport adapters

### Layering

Each layer depends only inward, so transport details never leak to UI:

- UI depends only on ViewModel.
- ViewModel depends only on UseCases.
- UseCases depend only on domain contracts.
- Data layer implements contracts and calls service/network.
- Manager details stay isolated in service/network adapters (Axios, Firebase, GraphQL, etc.).
- Map transport models to domain entities; keep manager-specific shapes out of domain/UI.
- ViewModel stays UI-agnostic (no navigation APIs, no Alert/toast APIs, no React hooks).
- Screen logic stays minimal: bind fields, call ViewModel methods, render ViewModel state/errors/loading.

### Entity and model structure

Domain entities are class-based (not plain interfaces) with:

- `type <Entity>ConstructorParams`
- index signature `[key: string]: any`
- constructor assigning required fields and defaults for dates/errors
- `Object.assign(this, params)`

Data models follow this shape:

- `type <Entity>ModelConstructorParams`
- utility date parser (e.g. `toDate(value: unknown): Date`)
- `static fromJson(json)`
- `toJson(): Record<string, unknown>`
- `declare module './<entityModel>'` + `prototype.toDomain()` returning the domain entity

Preserve backend field names exactly as requested (snake_case or custom names); do not auto-rename.

### SOLID

- **S — Single Responsibility:** each class has one reason to change (Screen renders UI, ViewModel orchestrates state/actions, UseCase executes one business action, Repository handles the persistence contract).
- **O — Open/Closed:** extend behavior by adding new UseCases/services; leave stable contracts unmodified unless required.
- **L — Liskov Substitution:** implementations (`XxxRepositoryImpl`, `XxxServiceImpl`) respect interface behavior and return types without surprises.
- **I — Interface Segregation:** prefer small focused contracts (split read/write concerns when needed) over large "god interfaces".
- **D — Dependency Inversion:** depend on abstractions (`domain/repositories`, `domain/services`) and inject via Inversify `TYPES`; never on concrete data classes in domain/UI layers.

### Use case convention

- Each use case lives in its own folder: `src/domain/useCases/<UseCaseName>/index.ts`.
- Each imports `UseCase` from `src/domain/useCases/UseCase.ts`.
- Each class implements `UseCase<Input, Output>`.
- The public execution method is `run(data)` (or `run()` when input is `void`).

### ViewModel standard

All ViewModels follow one canonical pattern:

1. `@injectable()` decorator + `makeAutoObservable(this)` in the constructor.
2. State fields grouped by concern (one group per async call type).
3. `private logger = new Logger('<ViewModelName>')` for consistent error logging.
4. `type ICalls = 'callA' | 'callB'` union naming every async operation.
5. `private updateLoadingState(isLoading, error, type: ICalls)` wraps all loading/error field assignments inside `runInAction` + a `switch` on `type`. Loading/error fields are mutated only through this method.
6. `private handleError(error: unknown, type: ICalls)` formats the message, calls `this.logger.error()`, then delegates to `updateLoadingState(false, message, type)`.
7. All mutations after `await` (setting domain data from the response) are wrapped in `runInAction(() => { ... })`.
8. `reset()` wraps all field resets in `runInAction`.
9. The ViewModel exposes explicit entrypoint methods for screen flows, e.g. `initialize(routeParam?)`, `submit(formValues)`, `consumeResult()`.
10. The ViewModel owns the create-vs-update mode and branching; the UI does not decide it.

ViewModel naming:

- State names are explicit by responsibility:
  - `isCreate<Entity>Loading / isCreate<Entity>Error / isCreate<Entity>Response`
  - `is<Entity>Loading / is<Entity>Error / is<Entity>Response`
  - `isUpdate<Entity>Loading / isUpdate<Entity>Error / isUpdate<Entity>Response`
- `ICalls` may stay operation-centered internally (e.g. `'loadBank'`, `'createBank'`, `'updateBank'`); public ViewModel state prioritizes direct readability.
- Prefer ViewModel getters for UI hydration (e.g. `formValues`) to keep mapping/transformation out of screen code.

### DI checklist

1. Add `TYPES.<Feature>Service`
2. Add `TYPES.<Feature>Repository`
3. Add `TYPES.<UseCases...>`
4. Add `TYPES.<Feature>ViewModel` (if using DI retrieval)
5. Bind:
   - Service: singleton
   - RepoImpl: singleton
   - UseCases: transient
   - ViewModel: transient

### Lint and format

- Use the existing config files: `eslint.config.js`, `.prettierrc`, `.prettierignore`.
- Ensure `package.json` contains these scripts:
  - `lint`: `eslint .`
  - `lint:fix`: `eslint . --fix`
  - `format`: `prettier --write .`
  - `format:check`: `prettier --check .`
- Keep `eslint-config-prettier` in the ESLint flat config to prevent collisions with Prettier output.
- Validate scaffold changes with `npm run lint` and `npm run format:check` before returning results.

### Unit testing

A scaffolded feature is not complete without tests. At minimum, ship:

1. `GetAll<Feature>UseCase` success and error
2. `Create<Feature>UseCase` input handling and repository call
3. `<Feature>ViewModel.load()` updates `loading/items/error` correctly
4. One mutating action in the ViewModel (`create`/`update`/`delete`) with success + failure
5. `<Feature>ViewModel` getters/computed and reset/consume-result methods
6. `<Feature>Service` response unwrap + error normalization branches (if a service exists)

Run `npm run test` and `npm run test:coverage` (≥ 70% global) before returning results. Stack,
no-container mocking, factories, coverage policy, async/timer and subscription patterns, and the
per-feature definition of done live in [[unit-testing-clean-architecture]].

</rules>

<examples>

<example name="Entity template">

```ts
export type <Entity>ConstructorParams = {
  id: string;
  // ...fields
  [key: string]: any;
};

export class <Entity> {
  [key: string]: any;

  id: string;
  // ...fields

  constructor(params: <Entity>ConstructorParams) {
    this.id = params.id;
    // ...assignments
    Object.assign(this, params);
  }
}
```

</example>

<example name="Model template">

```ts
export class <Entity>Model {
  static fromJson(json: any): <Entity>Model {
    return new <Entity>Model({ ...json });
  }

  toJson(): Record<string, unknown> {
    return { ... };
  }
}

declare module './<entityModel>' {
  interface <Entity>Model {
    toDomain(): <Entity>;
  }
}

<Entity>Model.prototype.toDomain = function toDomain(): <Entity> {
  return new <Entity>({ ... });
};
```

</example>

<example name="ViewModel template">

```ts
import { inject, injectable } from 'inversify';
import { makeAutoObservable, runInAction } from 'mobx';

import { TYPES } from '@/config/types';
import { <Entity> } from '@/domain/entities/<Entity>';
import { GetAll<Entity>UseCase } from '@/domain/useCases/GetAll<Entity>UseCase';
import Logger from '@/ui/utils/Logger';

type ICalls = 'items' | 'create' | 'update' | 'delete';

@injectable()
export class <Feature>ViewModel {
  // ── State ─────────────────────────────────────────────────────────────────
  isItemsLoading: boolean = false;
  isItemsError: string | null = null;
  isItemsResponse: <Entity>[] | null = null;

  isSubmitting: boolean = false;
  isSubmitError: string | null = null;

  private logger = new Logger('<Feature>ViewModel');

  constructor(
    @inject(TYPES.GetAll<Entity>UseCase)
    private readonly getAll<Entity>UseCase: GetAll<Entity>UseCase,
  ) {
    makeAutoObservable(this);
  }

  // ── Computed ──────────────────────────────────────────────────────────────

  get isLoaded(): boolean {
    return !this.isItemsLoading && this.isItemsResponse !== null;
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  async loadAll(): Promise<void> {
    this.updateLoadingState(true, null, 'items');
    try {
      const response = await this.getAll<Entity>UseCase.run();
      runInAction(() => {
        this.isItemsResponse = response;
      });
      this.updateLoadingState(false, null, 'items');
    } catch (error) {
      this.handleError(error, 'items');
    }
  }

  async create(data: <Entity>): Promise<boolean> {
    this.updateLoadingState(true, null, 'create');
    try {
      await this.create<Entity>UseCase.run(data);
      this.updateLoadingState(false, null, 'create');
      return true;
    } catch (error) {
      this.handleError(error, 'create');
      return false;
    }
  }

  reset(): void {
    runInAction(() => {
      this.isItemsResponse = null;
      this.isItemsLoading = false;
      this.isItemsError = null;
      this.isSubmitting = false;
      this.isSubmitError = null;
    });
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private updateLoadingState(isLoading: boolean, error: string | null, type: ICalls) {
    runInAction(() => {
      switch (type) {
        case 'items':
          this.isItemsLoading = isLoading;
          this.isItemsError = error;
          break;
        case 'create':
        case 'update':
        case 'delete':
          this.isSubmitting = isLoading;
          this.isSubmitError = error;
          break;
      }
    });
  }

  private handleError(error: unknown, type: ICalls) {
    const errorMessage = `Error in ${type}: ${
      error instanceof Error ? error.message : String(error)
    }`;
    this.logger.error(errorMessage);
    this.updateLoadingState(false, errorMessage, type);
  }
}
```

</example>

<example name="Screen pattern (observer + useViewModel)">

Use the shared `useViewModel` hook instead of repeating `container.get(...)` inline (define it
once at `src/ui/hooks/useViewModel.ts`):

```tsx
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { TYPES } from '@/config/types';
import { useViewModel } from '@/ui/hooks/useViewModel';
import { <Feature>ViewModel } from './<Feature>ViewModel';

const <Feature>Screen = observer(() => {
  // ViewModel instantiation — useViewModel memoizes container.get for transient scope
  const viewModel = useViewModel<<Feature>ViewModel>(TYPES.<Feature>ViewModel);

  // Side effects (data loading) — always useEffect, never useMemo
  useEffect(() => {
    viewModel.loadAll();
  }, [viewModel]);

  // ...render
});
```

Screen/ViewModel rules at a glance:

| Rule                 | Correct                                 | Wrong                                            |
| -------------------- | --------------------------------------- | ------------------------------------------------ |
| Instantiate ViewModel       | `useViewModel(TYPES.X)`                  | `new ViewModel()` in component body              |
| Name the instance    | `const viewModel = ...`                 | `const vm = ...`                                 |
| Trigger side effects | `useEffect(() => { viewModel.load() }, [viewModel])`  | `useMemo(() => { viewModel.load() }, [...])`            |
| Mutate after `await` | `runInAction(() => { this.x = val })`   | `this.x = val` directly after await              |
| Log + set error      | `handleError(e, type)`                  | Inline `this.error = e.message`                  |
| Set loading/error    | `updateLoadingState(bool, msg, type)`   | Direct field assignment scattered through action |

</example>

</examples>

<output_format>
Return:

1. A file-by-file plan (paths)
2. Code blocks per file (or diffs)
3. DI changes explicitly shown
4. Unit test files + test cases added
5. "How to test" steps (`npm test` and the targeted test command)
</output_format>

<see_also>
- [[clean-architecture-rn-expo-mvvm]] — the general architecture rules this scaffold follows.
- [[unit-testing-clean-architecture]] — the full testing stack, factories, and coverage policy.
- [[design-system-rn]] — UI/component conventions for the screen layer.
</see_also>
