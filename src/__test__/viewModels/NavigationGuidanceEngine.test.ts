import { FuelStation } from '@/domain/entities/FuelStation';
import { FuelStop } from '@/domain/entities/FuelStop';

import {
  buildNavigationSuggestions,
  createNavigationSuggestionLifecycleState,
  NavigationGuidanceInput,
  resolveNavigationSuggestionLifecycle,
} from '@/ui/screens/Home/NavigationGuidanceEngine';

import {
  makeElevationProfile,
  makeRouteDirections,
  makeRouteFuelEstimate,
} from '../factories';

const baseInput = (
  overrides: Partial<NavigationGuidanceInput> = {},
): NavigationGuidanceInput => ({
  route: makeRouteDirections({
    distanceKm: 120,
    geometry: [
      { latitude: 0, longitude: 0 },
      { latitude: 1, longitude: 0 },
    ],
  }),
  isNavigating: true,
  progressKm: 0,
  riderPoint: { latitude: 0, longitude: 0 },
  fuelStops: [],
  fuelEstimate: null,
  fuelStations: [],
  elevationProfile: null,
  currentTurn: null,
  destinationName: 'Destino',
  arrivalThresholdKm: 0.05,
  ...overrides,
});

describe('NavigationGuidanceEngine', () => {
  it('prioriza el proximo tanqueo recomendado', () => {
    const suggestions = buildNavigationSuggestions(
      baseInput({
        fuelEstimate: makeRouteFuelEstimate({
          distanceKm: 120,
          effectiveRangeKm: 40,
        }),
        fuelStops: [
          new FuelStop({
            id: 'refuel-1',
            order: 1,
            distanceFromStartKm: 20,
            location: { latitude: 0.18, longitude: 0 },
            label: 'Tanqueo 1',
          }),
        ],
        fuelStations: [
          new FuelStation({
            id: 'station-1',
            name: 'EDS Terpel Norte',
            brand: 'Terpel',
            latitude: 0.18,
            longitude: 0,
            fuelTypes: ['corriente', 'extra'],
          }),
        ],
      }),
    );

    expect(suggestions[0]).toEqual(
      expect.objectContaining({
        kind: 'fuel-warning',
        title: 'Tanqueo recomendado',
        value: '20 km',
        detail: 'Terpel',
      }),
    );
  });

  it('muestra gasolinera cercana cuando no hay tanqueo pendiente', () => {
    const suggestions = buildNavigationSuggestions(
      baseInput({
        route: makeRouteDirections({
          distanceKm: 20,
          geometry: [
            { latitude: 0, longitude: 0 },
            { latitude: 0.2, longitude: 0 },
          ],
        }),
        fuelStations: [
          new FuelStation({
            id: 'station-near',
            name: 'Primax Calle 80',
            brand: null,
            latitude: 0.01,
            longitude: 0,
            fuelTypes: ['corriente'],
          }),
        ],
      }),
    );

    expect(suggestions[0]).toEqual(
      expect.objectContaining({
        kind: 'station',
        title: 'Gasolinera cerca',
        value: '1.1 km',
        detail: 'Primax Calle 80',
      }),
    );
  });

  it('anticipa cambios de elevacion en la ruta', () => {
    const suggestions = buildNavigationSuggestions(
      baseInput({
        route: makeRouteDirections({
          distanceKm: 10,
          geometry: [
            { latitude: 0, longitude: 0 },
            { latitude: 0.1, longitude: 0 },
          ],
        }),
        elevationProfile: makeElevationProfile({
          samples: [
            { distanceKm: 0, elevationM: 1000, latitude: 0, longitude: 0 },
            { distanceKm: 3, elevationM: 1080, latitude: 0.03, longitude: 0 },
            { distanceKm: 10, elevationM: 1090, latitude: 0.1, longitude: 0 },
          ],
        }),
      }),
    );

    expect(suggestions[0]).toEqual(
      expect.objectContaining({
        kind: 'climb',
        title: 'Subida adelante',
        value: '+80 m',
        detail: 'Proximos 3.0 km',
      }),
    );
  });

  it('sube una curva cerrada cuando esta cerca', () => {
    const suggestions = buildNavigationSuggestions(
      baseInput({
        currentTurn: {
          remainingKm: 0.6,
          distanceText: 'En 600 m',
          instruction: 'Giro cerrado a la derecha',
          streetName: 'Via Honda',
          maneuverType: 'turn',
          maneuverModifier: 'sharp right',
        },
      }),
    );

    expect(suggestions[0]).toEqual(
      expect.objectContaining({
        kind: 'curve',
        title: 'Curva cerrada',
        value: 'En 600 m',
        detail: 'Via Honda',
      }),
    );
  });

  it('muestra llegada cerca sin cubrir el umbral final de llegada', () => {
    const suggestions = buildNavigationSuggestions(
      baseInput({
        route: makeRouteDirections({
          distanceKm: 120,
          geometry: [
            { latitude: 0, longitude: 0 },
            { latitude: 1, longitude: 0 },
          ],
        }),
        progressKm: 116.2,
        destinationName: 'Villa',
      }),
    );

    expect(suggestions[0]).toEqual(
      expect.objectContaining({
        kind: 'arrival',
        title: 'Llegada cerca',
        value: '3.8 km',
        detail: 'Villa',
      }),
    );
  });

  it('mantiene el orden visible aunque llegue una sugerencia de mayor prioridad', () => {
    const previous = resolveNavigationSuggestionLifecycle({
      candidates: [
        {
          id: 'station-near',
          kind: 'station',
          title: 'Gasolinera cerca',
          value: '1.1 km',
          detail: 'Primax Calle 80',
        },
      ],
      previous: createNavigationSuggestionLifecycleState(),
      nowMs: 1000,
    });

    const next = resolveNavigationSuggestionLifecycle({
      candidates: [
        {
          id: 'turn-curve',
          kind: 'curve',
          title: 'Curva cerrada',
          value: 'En 600 m',
          detail: 'Via Honda',
        },
        {
          id: 'station-near',
          kind: 'station',
          title: 'Gasolinera cerca',
          value: '900 m',
          detail: 'Primax Calle 80',
        },
      ],
      previous: previous.lifecycle,
      nowMs: 1600,
    });

    expect(next.suggestions.map((suggestion) => suggestion.id)).toEqual([
      'station-near',
      'turn-curve',
    ]);
    expect(next.suggestions[0].value).toBe('900 m');
  });

  it('retiene una sugerencia brevemente para evitar parpadeo', () => {
    const first = resolveNavigationSuggestionLifecycle({
      candidates: [
        {
          id: 'fuel-refuel-1',
          kind: 'fuel-warning',
          title: 'Tanqueo recomendado',
          value: '20 km',
          detail: 'Terpel',
        },
      ],
      previous: createNavigationSuggestionLifecycleState(),
      nowMs: 1000,
    });

    const warm = resolveNavigationSuggestionLifecycle({
      candidates: [],
      previous: first.lifecycle,
      nowMs: 3000,
    });

    expect(warm.suggestions).toHaveLength(1);
    expect(warm.suggestions[0].id).toBe('fuel-refuel-1');
  });

  it('aplica cooldown cuando una sugerencia desaparece y reaparece', () => {
    const first = resolveNavigationSuggestionLifecycle({
      candidates: [
        {
          id: 'fuel-refuel-1',
          kind: 'fuel-warning',
          title: 'Tanqueo recomendado',
          value: '20 km',
          detail: 'Terpel',
        },
      ],
      previous: createNavigationSuggestionLifecycleState(),
      nowMs: 1000,
    });

    const expired = resolveNavigationSuggestionLifecycle({
      candidates: [],
      previous: first.lifecycle,
      nowMs: 7000,
    });
    const suppressed = resolveNavigationSuggestionLifecycle({
      candidates: [
        {
          id: 'fuel-refuel-1',
          kind: 'fuel-warning',
          title: 'Tanqueo recomendado',
          value: '19 km',
          detail: 'Terpel',
        },
      ],
      previous: expired.lifecycle,
      nowMs: 8000,
    });
    const afterCooldown = resolveNavigationSuggestionLifecycle({
      candidates: [
        {
          id: 'fuel-refuel-1',
          kind: 'fuel-warning',
          title: 'Tanqueo recomendado',
          value: '18 km',
          detail: 'Terpel',
        },
      ],
      previous: suppressed.lifecycle,
      nowMs: 20000,
    });

    expect(expired.suggestions).toEqual([]);
    expect(suppressed.suggestions).toEqual([]);
    expect(afterCooldown.suggestions[0]).toEqual(
      expect.objectContaining({ id: 'fuel-refuel-1', value: '18 km' }),
    );
  });
});
