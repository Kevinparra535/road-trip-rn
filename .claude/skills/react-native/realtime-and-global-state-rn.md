---
name: realtime-and-global-state-rn
description: Add realtime streams, cross-screen global state, and offline/sync to the RN (Expo) MVVM + MobX + Inversify Clean Architecture. Use when a feature needs Firestore/WebSocket/observable subscriptions, app-global stores (session, network, location), reconnection-driven sync, or offline-first persistence.
---

<purpose>
The base architecture is request/response: `UI → ViewModel → UseCase → Repository`, fitting `run(): Promise<T>`.
That shape breaks down for live data, shared state, and connectivity. This skill adds the patterns
for those cases — a `SubscriptionUseCase` contract for streams, app-scoped singleton stores for
state that outlives a screen, a reconnection coordinator, non-destructive offline merge, and the
lifecycle discipline that keeps subscriptions from leaking — without disturbing the request/response
core.
</purpose>

<when_to_use>
- A screen must react to a **live stream** (Firestore listener, WebSocket feed, DB observable).
- State must be **shared across screens** (auth/session, network status, current location).
- The app must **re-sync on reconnection** or work **offline-first**.

Plain CRUD does not need these patterns — they add lifecycle cost. Reach for them only when the
feature genuinely requires live data, shared state, or connectivity handling.
</when_to_use>

<rules>

### SubscriptionUseCase (the second UseCase contract)

A stream does not fit `run(): Promise<T>` — forcing it there leaks (you end up returning
`Promise<Unsubscribe>` or a one-shot value). Add a dedicated contract alongside the canonical
`UseCase`.

- A use case that streams implements `SubscriptionUseCase`, not `UseCase`.
- `subscribe(...)` returns an `Unsubscribe`; on error, still return a safe no-op `Unsubscribe`
  so callers can always tear down.
- Keep one streaming use case per source (`ObserveTripPartyUseCase`, `WatchLocationUseCase`).
- The repository exposes the stream (`observeX(): Observable<X>` or a listener); the use case
  adapts it to `(onNext, onError) => Unsubscribe`. The ViewModel never imports the data source.
- Use one style for the same kind of work: if a source streams, model it as `SubscriptionUseCase`
  everywhere — avoid some `Watch*` use cases returning `Promise<Unsubscribe>` while others use
  `subscribe`.

### Global stores (app-scoped MobX state)

A `ViewModel` is screen-scoped (transient). When state must outlive a single screen or be shared,
use a **Store**: same implementation as a ViewModel (`@injectable()` + `makeAutoObservable`), but bound
as a **singleton** in DI.

| Aspect            | ViewModel                          | Store                                   |
| ----------------- | ---------------------------------- | --------------------------------------- |
| Scope             | One screen                         | App-global                              |
| DI lifetime       | `transient`                        | `inSingletonScope()`                    |
| Location          | `src/ui/screens/<F>/<F>ViewModel.ts` | `src/ui/store/<Name>Store.ts`         |
| Examples          | `ClientsViewModel`                 | `SessionStore`, `NetworkStore`, `LocationStore` |

- Stores are `@injectable()`, registered with `.inSingletonScope()`, and named `XxxStore`; place
  them all under `src/ui/store/` (do not scatter them in `src/stores/`).
- A store owns one concern (session, network, location) — no god-store.
- A ViewModel may inject a store to read shared state; the store never imports a ViewModel.
- Stores obey the layer rules: side effects go through UseCases / SubscriptionUseCases.
- Stores expose a lifecycle: `start()` / `dispose()` (or `clear()`) for subscriptions.

### Reconnection-driven sync (coordinator)

Keep sync orchestration out of ViewModels. A `@injectable()` singleton coordinator reacts to
network transitions with `mobx.reaction` and triggers the sync use case. Start it once at app
bootstrap (`App.tsx`) and stop it on teardown.

### Offline-first sync policy (non-destructive)

When merging remote data into local persistence, preserve local intent before reconciling — never
silently overwrite unsynced local changes. Make this invariant an explicit unit test (a sync run
must not clobber a local toggle). See [[unit-testing-clean-architecture]].

### Optimistic update + rollback (ViewModel)

For snappy UX on mutations, update ViewModel state immediately, call the use case, and revert on failure.
Wrap all mutations in `runInAction` and route errors through `handleError`.

### Screen lifecycle for subscriptions

Streams are torn down. The ViewModel subscribes in an entrypoint and exposes `dispose()`; the screen wires
subscribe/teardown through `useEffect` cleanup. The ViewModel holds the unsubscribe handle and calls it in
`dispose()` so re-mounts and unmounts never leak a listener.

### Passing non-serializable data through navigation

Domain entities with methods do not travel as navigation params (they lose their methods crossing
the boundary). Pass a plain serialized DTO and rehydrate the entity in the ViewModel.

### DI checklist

- `TYPES.<Store>` for each store; bind with `.inSingletonScope()`.
- `TYPES.SyncCoordinator` (singleton) when reconnection sync exists.
- Streaming use cases (`SubscriptionUseCase`) remain `transient`.
- Repositories exposing streams stay singleton.

### Testing requirements

Realtime/global-state code is fully covered by [[unit-testing-clean-architecture]]. Mandatory cases:

- Subscription: subscribes on `initialize`, updates on emit, **tears down** on `dispose`.
- Reconnection: `reaction` fires sync on offline→online, not on online→offline.
- Offline sync: non-destructive merge invariant.
- Optimistic update: immediate flip + rollback on failure.

### SOLID fit

- **ISP:** `SubscriptionUseCase` keeps streaming out of the request/response `UseCase` contract — each consumer depends only on the shape it uses.
- **SRP:** one concern per Store; one streaming use case per source.
- **DIP:** ViewModels and Stores depend on domain contracts (use cases), never on the SDK (Firestore/WebSocket/NetInfo).

</rules>

<examples>

<example name="SubscriptionUseCase contract">
```ts
// src/domain/useCases/UseCase.ts
export interface UseCase<Input, Output> {
  run(data: Input): Promise<Output>;
}

export type Unsubscribe = () => void;

export interface SubscriptionUseCase<Input, Output> {
  subscribe(
    input: Input,
    onNext: (value: Output) => void,
    onError?: (error: unknown) => void,
  ): Unsubscribe;
}
```
</example>

<example name="Streaming use case implementation">
```ts
@injectable()
export class ObserveTripPartyUseCase
  implements SubscriptionUseCase<string, TripParty>
{
  constructor(
    @inject(TYPES.TripPartyRepository)
    private readonly repo: TripPartyRepository,
  ) {}

  subscribe(partyId: string, onNext: (p: TripParty) => void, onError?) {
    return this.repo.observeParty(partyId, onNext, onError);
  }
}
```
</example>

<example name="Global store (NetworkStore)">
```ts
@injectable()
export class NetworkStore {
  isOffline = false;

  constructor() {
    makeAutoObservable(this);
  }

  start() {
    return NetInfo.addEventListener((state) =>
      runInAction(() => {
        this.isOffline = !state.isConnected;
      }),
    );
  }
}
```
</example>

<example name="Reconnection sync coordinator">
```ts
@injectable()
export class SyncCoordinator {
  private disposeReaction?: () => void;

  constructor(
    @inject(TYPES.NetworkStore) private readonly network: NetworkStore,
    @inject(TYPES.SyncTasksUseCase) private readonly syncTasks: SyncTasksUseCase,
  ) {}

  start() {
    this.disposeReaction = reaction(
      () => this.network.isOffline,
      (isOffline, wasOffline) => {
        if (wasOffline && !isOffline) void this.syncTasks.run();
      },
    );
  }

  stop() {
    this.disposeReaction?.();
  }
}
```
</example>

<example name="Non-destructive offline merge">
```ts
// data/repositories: pseudo-policy
const local = await this.db.findById(remote.id);
if (local && local.hasPendingChanges) {
  // keep the local-edited field, take the rest from remote
  record.completed = local.completed;
}
```
</example>

<example name="Optimistic update + rollback">
```ts
async toggleTaskStatus(id: string) {
  const prev = this.tasks.find((t) => t.id === id)?.completed ?? false;
  runInAction(() => this.setCompleted(id, !prev)); // optimistic
  try {
    await this.toggleTaskUseCase.run(id);
  } catch (error) {
    runInAction(() => this.setCompleted(id, prev)); // rollback
    this.handleError(error, 'toggle');
  }
}
```
</example>

<example name="Screen lifecycle wiring">
```tsx
const HomeScreen = observer(() => {
  const viewModel = useViewModel(TYPES.HomeViewModel);

  useEffect(() => {
    viewModel.initialize(); // sets up subscriptions
    return () => viewModel.dispose(); // tears them down
  }, [viewModel]);
  // …
});
```
</example>

<example name="ViewModel subscribe/dispose handle">
```ts
private unsubscribe?: Unsubscribe;

initialize() {
  this.unsubscribe = this.observeTasksUseCase.subscribe(
    undefined,
    (tasks) => runInAction(() => { this.tasks = tasks; }),
    (error) => this.handleError(error, 'observe'),
  );
}

dispose() {
  this.unsubscribe?.();
  this.unsubscribe = undefined;
}
```
</example>

<example name="Serialized DTO through navigation">
```ts
export type SerializedPlace = { latitude: number; longitude: number; name: string };
// Screen: navigation.navigate('Planner', { place: place.serialize() })
// ViewModel:     initializeWithDestination(serialized: SerializedPlace) { … new Place(serialized) }
```
</example>

</examples>

<see_also>
- [[unit-testing-clean-architecture]] — the test patterns that cover subscriptions, reconnection sync, and optimistic rollback.
- [[clean-architecture-rn-expo-mvvm]] — the base MVVM + MobX + Inversify architecture this skill extends.
</see_also>
