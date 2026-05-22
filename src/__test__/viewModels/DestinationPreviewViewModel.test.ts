import { PlaceSummary } from '@/domain/entities/PlaceSummary';
import { DestinationPreviewViewModel } from '@/ui/screens/Home/DestinationPreviewViewModel';

import { makeGeoLocation, makePlace } from '../factories';

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

const makeHomeVM = (
  overrides: Record<string, unknown> = {},
): {
  previewPlace: ReturnType<typeof makePlace> | null;
  confirmPreview: jest.Mock;
  cancelPreview: jest.Mock;
} => ({
  previewPlace: null,
  confirmPreview: jest.fn(),
  cancelPreview: jest.fn(),
  ...overrides,
});

const makeLocationStore = (
  overrides: Record<string, unknown> = {},
): {
  isLocationResponse: ReturnType<typeof makeGeoLocation> | null;
} => ({
  isLocationResponse: null,
  ...overrides,
});

const makeUseCase = (
  result: PlaceSummary | null = null,
): { run: jest.Mock } => ({
  run: jest.fn().mockResolvedValue(result),
});

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('DestinationPreviewViewModel', () => {
  it('exposes initial empty state', () => {
    const vm = new DestinationPreviewViewModel(
      makeHomeVM() as any,
      makeLocationStore() as any,
      makeUseCase() as any,
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
      makeHomeVM({ previewPlace: place }) as any,
      makeLocationStore() as any,
      makeUseCase() as any,
    );

    expect(vm.hasPreview).toBe(true);
    expect(vm.typeLabel).toBe('Ciudad');
    expect(vm.contextLine).toBe('Boyaca, Colombia');
  });

  it('computes distance and ETA when user location is known', () => {
    const place = makePlace({ latitude: 5.5, longitude: -73.5 });
    const vm = new DestinationPreviewViewModel(
      makeHomeVM({ previewPlace: place }) as any,
      makeLocationStore({
        isLocationResponse: makeGeoLocation({
          latitude: 4.6,
          longitude: -74.0,
        }),
      }) as any,
      makeUseCase() as any,
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
      makeHomeVM({ previewPlace: place }) as any,
      makeLocationStore() as any,
      makeUseCase() as any,
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
      makeHomeVM({ previewPlace: place }) as any,
      makeLocationStore() as any,
      useCase as any,
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
      makeHomeVM({ previewPlace: place }) as any,
      makeLocationStore() as any,
      useCase as any,
    );

    await vm.loadPlaceSummary();

    expect(vm.isPlaceSummaryLoading).toBe(false);
    expect(vm.isPlaceSummaryError).toContain('boom');
    expect(vm.isPlaceSummaryResponse).toBeNull();
  });

  it('confirm and cancel delegate to the parent VM', () => {
    const home = makeHomeVM({ previewPlace: makePlace() });
    const vm = new DestinationPreviewViewModel(
      home as any,
      makeLocationStore() as any,
      makeUseCase() as any,
    );

    vm.confirm();
    expect(home.confirmPreview).toHaveBeenCalled();

    vm.cancel();
    expect(home.cancelPreview).toHaveBeenCalled();
  });

  it('reset clears summary state and viewport width', () => {
    const vm = new DestinationPreviewViewModel(
      makeHomeVM() as any,
      makeLocationStore() as any,
      makeUseCase() as any,
    );
    vm.setViewportWidth(500);
    (vm as any).isPlaceSummaryResponse = new PlaceSummary({ title: 'X' });

    vm.reset();

    expect(vm.viewportWidth).toBe(320);
    expect(vm.isPlaceSummaryResponse).toBeNull();
  });

  it('dispose releases the reaction without throwing', async () => {
    const vm = new DestinationPreviewViewModel(
      makeHomeVM() as any,
      makeLocationStore() as any,
      makeUseCase() as any,
    );

    await flush();
    expect(() => vm.dispose()).not.toThrow();
    // Llamarlo dos veces es seguro (defensa).
    expect(() => vm.dispose()).not.toThrow();
  });
});
