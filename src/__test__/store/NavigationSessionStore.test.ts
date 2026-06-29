import { NavigationSessionStore } from '@/ui/store/NavigationSessionStore';

import { makeGeoLocation, makePlace, makeRouteDirections } from '../factories';

const makeLocationStore = (overrides: Record<string, unknown> = {}) => ({
  isLocationResponse: null as ReturnType<typeof makeGeoLocation> | null,
  speed: null as number | null,
  ...overrides,
});

const makeReroute = (
  run: jest.Mock = jest.fn().mockResolvedValue(makeRouteDirections()),
) => ({
  run,
});

const makeGetPrefs = (muted = false) => ({
  run: jest.fn().mockResolvedValue({ muted }),
});
const makeSetMute = () => ({ run: jest.fn().mockResolvedValue(undefined) });

// El simulador usa setInterval y el GPS real una reaction de MobX; con timers
// falsos no se disparan solos y disponemos cada store creado en afterEach para
// no filtrar handles entre tests (clave bajo `test:coverage`).
const created: NavigationSessionStore[] = [];
beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  created.splice(0).forEach((store) => store.dispose());
  jest.clearAllTimers();
  jest.useRealTimers();
});

const make = (
  over: { location?: any; reroute?: any; getPrefs?: any; setMute?: any } = {},
) => {
  const location = over.location ?? makeLocationStore();
  const reroute = over.reroute ?? makeReroute();
  const getPrefs = over.getPrefs ?? makeGetPrefs();
  const setMute = over.setMute ?? makeSetMute();
  const store = new NavigationSessionStore(
    location as any,
    reroute as any,
    getPrefs as any,
    setMute as any,
  );
  created.push(store);
  return { store, location, reroute, getPrefs, setMute };
};

const startParams = (over: Record<string, unknown> = {}) => ({
  route: makeRouteDirections({ distanceKm: 100 }),
  destination: makePlace({ name: 'Destino' }),
  intermediateStops: [],
  rideType: 'highway' as const,
  isSimulated: false,
  ...over,
});

describe('NavigationSessionStore', () => {
  it('arranca sin sesión activa', () => {
    const { store } = make();
    expect(store.isNavigating).toBe(false);
    expect(store.route).toBeNull();
    expect(store.navSpeedLabel).toBeNull();
    expect(store.currentTurn).toBeNull();
    expect(store.navRemaining).toBeNull();
  });

  it('start activa la sesión y guarda el snapshot; stop la termina', () => {
    const { store } = make();
    store.start(startParams({ isSimulated: false }));
    expect(store.isNavigating).toBe(true);
    expect(store.route).not.toBeNull();
    expect(store.destination?.name).toBe('Destino');

    store.stop();
    expect(store.isNavigating).toBe(false);
  });

  it('navSpeedKmh: simulado = promedio modelado, real = GPS m/s -> km/h', () => {
    const sim = make();
    sim.store.start(startParams({ isSimulated: true }));
    expect(sim.store.navSpeedLabel).toBe(100);

    const real = make({ location: makeLocationStore({ speed: 10 }) });
    real.store.start(startParams({ isSimulated: false }));
    expect(real.store.navSpeedLabel).toBe(36);

    const noFix = make({ location: makeLocationStore({ speed: null }) });
    noFix.store.start(startParams({ isSimulated: false }));
    expect(noFix.store.navSpeedLabel).toBeNull();
  });

  it('toggleMute alterna y persiste vía SetMutePreferenceUseCase', () => {
    const { store, setMute } = make();
    expect(store.isMuted).toBe(false);
    store.toggleMute();
    expect(store.isMuted).toBe(true);
    expect(setMute.run).toHaveBeenCalledWith(true);
  });

  it('loadPreferences hidrata el mute persistido', async () => {
    const { store, getPrefs } = make({ getPrefs: makeGetPrefs(true) });
    await store.loadPreferences();
    expect(getPrefs.run).toHaveBeenCalledTimes(1);
    expect(store.isMuted).toBe(true);
  });

  it('reset limpia la sesión por completo', () => {
    const { store } = make();
    store.start(startParams());
    store.reset();
    expect(store.isNavigating).toBe(false);
    expect(store.route).toBeNull();
    expect(store.destination).toBeNull();
  });

  it('toggleElevationStrip alterna el strip 6b/6a', () => {
    const { store } = make();
    expect(store.isElevationStripOpen).toBe(true);
    store.toggleElevationStrip();
    expect(store.isElevationStripOpen).toBe(false);
  });

  it('start conserva el rideStyle en la sesión (F5: el reroute lo preserva)', () => {
    const { store } = make();
    store.start(startParams({ rideStyle: 'curvy' }));
    expect(store.rideStyle).toBe('curvy');
  });

  it('el simulador avanza hasta el destino y marca la llegada', () => {
    const { store } = make();
    // Geometría densa (~10 m entre vértices) para que el rider simulado quede
    // siempre cerca de un vértice y NO gatille un off-route espurio.
    store.start(
      startParams({
        isSimulated: true,
        route: makeRouteDirections({
          distanceKm: 0.2,
          geometry: Array.from({ length: 21 }, (_, i) => ({
            latitude: 4 + i * 0.00009,
            longitude: -74,
          })),
        }),
      }),
    );

    jest.advanceTimersByTime(600); // 1 tick del simulador (500 ms)

    expect(store.isArrived).toBe(true);
    expect(store.isNavigating).toBe(false);
    expect(store.arrivalSummary?.destinationName).toBe('Destino');
  });

  it('off-route sostenido (GPS real) gatilla el reroute conservando paradas + estilo', async () => {
    const reroute = makeReroute();
    const { store } = make({
      // Rider ~1.1 km al norte del inicio de la ruta: nearest vertex = el primero
      // (progress 0, sin arribo) pero fuera del umbral -> off-route en cada tick.
      location: makeLocationStore({
        isLocationResponse: makeGeoLocation({ latitude: 0.01, longitude: 0 }),
      }),
      reroute,
    });
    store.start(
      startParams({
        isSimulated: false,
        rideStyle: 'fuel',
        intermediateStops: [makePlace({ name: 'Parada' })],
        route: makeRouteDirections({
          distanceKm: 5,
          geometry: [
            { latitude: 0, longitude: 0 },
            { latitude: 0, longitude: 0.001 },
            { latitude: 0, longitude: 0.002 },
          ],
        }),
      }),
    );

    // OFF_ROUTE_CONFIRM_TICKS = 4: la reaction GPS llamó 1 vez (fireImmediately);
    // completamos los 3 ticks restantes manualmente.
    (store as any).monitorOffRoute();
    (store as any).monitorOffRoute();
    (store as any).monitorOffRoute();
    await Promise.resolve();

    expect(reroute.run).toHaveBeenCalled();
    const input = reroute.run.mock.calls[0][0];
    expect(input.rideStyle).toBe('fuel');
    expect(input.intermediateStops).toHaveLength(1);
  });

  it('respeta el multiplicador de velocidad del simulador (Navigation Lab)', () => {
    // Geometría densa (~50 m entre vértices) sobre una ruta de 1 km para que el
    // rider simulado quede siempre sobre la línea y NO gatille off-route.
    const denseRoute = () =>
      makeRouteDirections({
        distanceKm: 1,
        geometry: Array.from({ length: 21 }, (_, i) => ({
          latitude: 4 + i * 0.00045,
          longitude: -74,
        })),
      });

    const slow = make();
    slow.store.start(
      startParams({
        isSimulated: true,
        simSpeedMultiplier: 1,
        route: denseRoute(),
      }),
    );
    jest.advanceTimersByTime(600); // 1 tick

    const fast = make();
    fast.store.start(
      startParams({
        isSimulated: true,
        simSpeedMultiplier: 60,
        route: denseRoute(),
      }),
    );
    jest.advanceTimersByTime(600);

    // A 60× el rider avanza mucho más por tick que a 1×.
    expect(fast.store.simulatedDistanceKm).toBeGreaterThan(
      slow.store.simulatedDistanceKm,
    );
    // A 1× un tick avanza ~14 m: ni cerca de llegar a una ruta de 1 km.
    expect(slow.store.isNavigating).toBe(true);
  });
});
