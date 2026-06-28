import { PlaceSummary } from '@/domain/entities/PlaceSummary';

import { DestinationPreviewViewModel } from '@/ui/screens/DestinationPreview/DestinationPreviewViewModel';
import { NavigationStore } from '@/ui/store/NavigationStore';

import {
  makeGeoLocation,
  makePlace,
  makeRouteDirections,
  makeRouteFuelEstimate,
} from '../factories';

// `mapboxStaticImageUrl` lee `ENV.mapboxPublicToken` y `ENV.MAP_STYLE_URL`.
// Mockeamos el env para que el VM construya URLs predecibles sin tocar
// Expo Constants.
jest.mock('@/config/env', () => ({
  ENV: {
    mapboxPublicToken: 'pk.test',
    MAP_STYLE_URL: 'mapbox://styles/mapbox/navigation-night-v1',
    placeSummaryBaseUrl: 'https://wiki.test/page/summary',
  },
}));

/**
 * NavigationStore real (sin deps) sembrado opcionalmente con un previewPlace.
 * El VM lee/escribe el preview/rideType y confirm/cancel a traves de este store
 * (es el handoff compartido con el Home).
 */
const makeNavStore = (
  previewPlace: ReturnType<typeof makePlace> | null = null,
): NavigationStore => {
  const store = new NavigationStore();
  if (previewPlace) store.setPreviewPlace(previewPlace);
  return store;
};

const makeLocationStore = (
  overrides: Record<string, unknown> = {},
): {
  isLocationResponse: ReturnType<typeof makeGeoLocation> | null;
} => ({
  isLocationResponse: null,
  ...overrides,
});

const makeUseCase = (result: PlaceSummary | null = null): { run: jest.Mock } => ({
  run: jest.fn().mockResolvedValue(result),
});

// BuildRoutePreviewUseCase: por defecto devuelve una ruta sin veredicto de moto.
const makeBuildRoutePreview = (
  result: unknown = { route: makeRouteDirections(), fuel: null },
): { run: jest.Mock } => ({
  run: jest.fn().mockResolvedValue(result),
});

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('DestinationPreviewViewModel', () => {
  it('exposes initial empty state', () => {
    const vm = new DestinationPreviewViewModel(
      makeNavStore() as any,
      makeLocationStore() as any,
      makeUseCase() as any,
      makeBuildRoutePreview() as any,
    );

    expect(vm.previewPlace).toBeNull();
    expect(vm.hasPreview).toBe(false);
    expect(vm.typeLabel).toBeNull();
    expect(vm.contextLine).toBe('');
    expect(vm.distanceKm).toBeNull();
    expect(vm.etaMin).toBeNull();
    expect(vm.hasStats).toBe(false);
    expect(vm.staticMapUrl).toBeNull();
    expect(vm.isPlaceSummaryLoading).toBe(false);
    expect(vm.isPlaceSummaryError).toBeNull();
    expect(vm.isPlaceSummaryResponse).toBeNull();
  });

  it('derives type label and context line from the previewed place', () => {
    const place = makePlace({
      placeType: 'place',
      region: 'Boyaca',
      country: 'Colombia',
    });
    const vm = new DestinationPreviewViewModel(
      makeNavStore(place) as any,
      makeLocationStore() as any,
      makeUseCase() as any,
      makeBuildRoutePreview() as any,
    );

    expect(vm.hasPreview).toBe(true);
    expect(vm.typeLabel).toBe('Ciudad');
    expect(vm.contextLine).toBe('Boyaca, Colombia');
  });

  it('computes distance and ETA when user location is known', () => {
    const place = makePlace({ latitude: 5.5, longitude: -73.5 });
    const vm = new DestinationPreviewViewModel(
      makeNavStore(place) as any,
      makeLocationStore({
        isLocationResponse: makeGeoLocation({
          latitude: 4.6,
          longitude: -74.0,
        }),
      }) as any,
      makeUseCase() as any,
      makeBuildRoutePreview() as any,
    );

    expect(vm.distanceKm).not.toBeNull();
    expect(vm.distanceKm!).toBeGreaterThan(0);
    expect(vm.etaMin).not.toBeNull();
    expect(vm.etaMin!).toBeGreaterThan(0);
    expect(vm.hasStats).toBe(true);
  });

  it('builds a static map URL with the previewed place coordinates', () => {
    const place = makePlace({ latitude: 5.5, longitude: -73.5 });
    const vm = new DestinationPreviewViewModel(
      makeNavStore(place) as any,
      makeLocationStore() as any,
      makeUseCase() as any,
      makeBuildRoutePreview() as any,
    );

    vm.setViewportWidth(320);
    const url = vm.staticMapUrl;
    expect(url).not.toBeNull();
    expect(url!).toContain('-73.5');
    expect(url!).toContain('5.5');
    expect(url!).toContain('pk.test');
  });

  it('loadPlaceSummary populates response and toggles loading flags', async () => {
    const place = makePlace();
    const summary = new PlaceSummary({
      title: place.name,
      extract: 'desc',
    });
    const useCase = makeUseCase(summary);
    const vm = new DestinationPreviewViewModel(
      makeNavStore(place) as any,
      makeLocationStore() as any,
      useCase as any,
      makeBuildRoutePreview() as any,
    );

    const pending = vm.loadPlaceSummary();
    expect(vm.isPlaceSummaryLoading).toBe(true);
    await pending;

    expect(useCase.run).toHaveBeenCalledWith({ name: place.name });
    expect(vm.isPlaceSummaryLoading).toBe(false);
    expect(vm.isPlaceSummaryError).toBeNull();
    expect(vm.isPlaceSummaryResponse).toBe(summary);
  });

  it('loadPlaceSummary sets error message on rejection', async () => {
    const place = makePlace();
    const useCase = {
      run: jest.fn().mockRejectedValue(new Error('boom')),
    };
    const vm = new DestinationPreviewViewModel(
      makeNavStore(place) as any,
      makeLocationStore() as any,
      useCase as any,
      makeBuildRoutePreview() as any,
    );

    await vm.loadPlaceSummary();

    expect(vm.isPlaceSummaryLoading).toBe(false);
    expect(vm.isPlaceSummaryError).toContain('boom');
    expect(vm.isPlaceSummaryResponse).toBeNull();
  });

  it('confirm delegates to the navStore (emits confirmedPlace, clears preview)', () => {
    const place = makePlace();
    const navStore = makeNavStore(place);
    const vm = new DestinationPreviewViewModel(
      navStore as any,
      makeLocationStore() as any,
      makeUseCase() as any,
      makeBuildRoutePreview() as any,
    );

    expect(vm.previewPlace).toBe(place);
    vm.confirm();
    // confirmPreview mueve el preview a la señal one-shot `confirmedPlace`.
    expect(navStore.confirmedPlace).toBe(place);
    expect(navStore.previewPlace).toBeNull();
    expect(vm.previewPlace).toBeNull();
  });

  it('cancel delegates to the navStore (clears preview without confirming)', () => {
    const place = makePlace();
    const navStore = makeNavStore(place);
    const vm = new DestinationPreviewViewModel(
      navStore as any,
      makeLocationStore() as any,
      makeUseCase() as any,
      makeBuildRoutePreview() as any,
    );

    vm.cancel();
    expect(navStore.previewPlace).toBeNull();
    expect(navStore.confirmedPlace).toBeNull();
    expect(vm.previewPlace).toBeNull();
  });

  it('reset clears summary state and viewport width', () => {
    const vm = new DestinationPreviewViewModel(
      makeNavStore() as any,
      makeLocationStore() as any,
      makeUseCase() as any,
      makeBuildRoutePreview() as any,
    );
    vm.setViewportWidth(500);
    (vm as any).isPlaceSummaryResponse = new PlaceSummary({ title: 'X' });

    vm.reset();

    expect(vm.viewportWidth).toBe(320);
    expect(vm.isPlaceSummaryResponse).toBeNull();
  });

  it('dispose releases the reaction without throwing', async () => {
    const vm = new DestinationPreviewViewModel(
      makeNavStore() as any,
      makeLocationStore() as any,
      makeUseCase() as any,
      makeBuildRoutePreview() as any,
    );

    await flush();
    expect(() => vm.dispose()).not.toThrow();
    // Llamarlo dos veces es seguro (defensa).
    expect(() => vm.dispose()).not.toThrow();
  });

  // ── F2a: preview de ruta real + veredicto de autonomía ────────────────────

  const makeLocatedNav = (place = makePlace({ latitude: 5.5, longitude: -73.5 })) => ({
    navStore: makeNavStore(place),
    location: makeLocationStore({
      isLocationResponse: makeGeoLocation({ latitude: 4.6, longitude: -74.0 }),
    }),
  });

  it('loadRoutePreview puebla la ruta real + veredicto y alterna el loading', async () => {
    const { navStore, location } = makeLocatedNav();
    const build = makeBuildRoutePreview({
      route: makeRouteDirections({ distanceKm: 120, durationMin: 95 }),
      fuel: makeRouteFuelEstimate({ distanceKm: 120 }),
    });
    const vm = new DestinationPreviewViewModel(
      navStore as any,
      location as any,
      makeUseCase() as any,
      build as any,
    );

    const pending = vm.loadRoutePreview();
    expect(vm.isRoutePreviewLoading).toBe(true);
    await pending;

    expect(build.run).toHaveBeenCalledTimes(1);
    expect(vm.isRoutePreviewLoading).toBe(false);
    expect(vm.hasRoutePreview).toBe(true);
    expect(vm.realDistanceLabel).toBe('120 km');
    expect(vm.realEtaLabel).toBe('1 h 35 min');
  });

  it('no llama al UseCase si aún no hay ubicación', async () => {
    const build = makeBuildRoutePreview();
    const vm = new DestinationPreviewViewModel(
      makeNavStore(makePlace()) as any,
      makeLocationStore() as any, // sin isLocationResponse
      makeUseCase() as any,
      build as any,
    );

    await vm.loadRoutePreview();
    expect(build.run).not.toHaveBeenCalled();
    expect(vm.hasRoutePreview).toBe(false);
  });

  it('autonomyVerdict: "llegas con el tanque" + reserva cuando alcanza', async () => {
    const { navStore, location } = makeLocatedNav();
    const build = makeBuildRoutePreview({
      route: makeRouteDirections({ distanceKm: 60 }),
      // distancia << rango efectivo -> alcanza, reserva alta.
      fuel: makeRouteFuelEstimate({ distanceKm: 60, effectiveRangeKm: 420 }),
    });
    const vm = new DestinationPreviewViewModel(
      navStore as any,
      location as any,
      makeUseCase() as any,
      build as any,
    );

    await vm.loadRoutePreview();

    expect(vm.autonomyVerdict?.reaches).toBe(true);
    expect(vm.autonomyVerdict?.label).toContain('Llegas con tu tanque');
    expect(vm.autonomyVerdict?.reservePercent).toBeGreaterThan(0);
  });

  it('autonomyVerdict: muestra los tanqueos cuando NO alcanza', async () => {
    const { navStore, location } = makeLocatedNav();
    const build = makeBuildRoutePreview({
      route: makeRouteDirections({ distanceKm: 900 }),
      // distancia >> rango -> no alcanza, necesita tanqueos.
      fuel: makeRouteFuelEstimate({ distanceKm: 900, effectiveRangeKm: 300 }),
    });
    const vm = new DestinationPreviewViewModel(
      navStore as any,
      location as any,
      makeUseCase() as any,
      build as any,
    );

    await vm.loadRoutePreview();

    expect(vm.autonomyVerdict?.reaches).toBe(false);
    expect(vm.autonomyVerdict?.label).toMatch(/tanqueo/);
  });

  it('sin moto activa: hay ruta pero el veredicto queda null', async () => {
    const { navStore, location } = makeLocatedNav();
    const build = makeBuildRoutePreview({ route: makeRouteDirections(), fuel: null });
    const vm = new DestinationPreviewViewModel(
      navStore as any,
      location as any,
      makeUseCase() as any,
      build as any,
    );

    await vm.loadRoutePreview();

    expect(vm.hasRoutePreview).toBe(true);
    expect(vm.hasMotorcycleVerdict).toBe(false);
    expect(vm.autonomyVerdict).toBeNull();
  });

  it('setRideStyle se refleja y se pasa al BuildRoutePreviewUseCase (F5)', async () => {
    const { navStore, location } = makeLocatedNav();
    const build = makeBuildRoutePreview();
    const vm = new DestinationPreviewViewModel(
      navStore as any,
      location as any,
      makeUseCase() as any,
      build as any,
    );

    expect(vm.rideStyle).toBe('fast');
    vm.setRideStyle('curvy');
    expect(vm.rideStyle).toBe('curvy');

    await vm.loadRoutePreview();
    expect(build.run.mock.calls[0][0].rideStyle).toBe('curvy');
  });
});
