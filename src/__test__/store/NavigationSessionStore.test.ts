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
});
