import { FuelStation } from '@/domain/entities/FuelStation';
import { FuelStop } from '@/domain/entities/FuelStop';

import {
  buildNavigationSuggestions,
  NavigationGuidanceInput,
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
});
