import { NavigationStep } from '@/domain/entities/NavigationStep';

import {
  computeNextManeuver,
  ComputeNextManeuverUseCase,
  fallbackInstruction,
} from '@/domain/useCases/ComputeNextManeuverUseCase';
import {
  detectOffRoute,
  DetectOffRouteUseCase,
} from '@/domain/useCases/DetectOffRouteUseCase';
import { snapToRoute, SnapToRouteUseCase } from '@/domain/useCases/SnapToRouteUseCase';

const step = (over: Partial<ConstructorParameters<typeof NavigationStep>[0]>) =>
  new NavigationStep({
    distanceKm: 1,
    durationMin: 1,
    distanceFromStartKm: 0,
    instruction: '',
    streetName: '',
    maneuverType: 'turn',
    maneuverModifier: 'right',
    maneuverLocation: { latitude: 0, longitude: 0 },
    ...over,
  });

// Línea ~111 km a lo largo del ecuador (1° de longitud) con un vértice medio.
// `distanceAlongNearest`/`distanceToPolylineKm` proyectan sobre el vértice más
// cercano (no perpendicular), por eso el punto medio coincide con un vértice.
const LINE = [
  { latitude: 0, longitude: 0 },
  { latitude: 0, longitude: 0.5 },
  { latitude: 0, longitude: 1 },
];

describe('snapToRoute', () => {
  it('devuelve ceros con geometría insuficiente', () => {
    expect(
      snapToRoute([{ latitude: 0, longitude: 0 }], { latitude: 0, longitude: 0 }),
    ).toEqual({
      progressKm: 0,
      snapped: null,
      deviationKm: 0,
    });
  });

  it('proyecta el avance y desviación ~0 para un punto sobre un vértice', () => {
    const result = snapToRoute(LINE, { latitude: 0, longitude: 0.5 });
    expect(result.progressKm).toBeGreaterThan(50);
    expect(result.progressKm).toBeLessThan(60);
    expect(result.deviationKm).toBeLessThan(0.001);
    expect(result.snapped).not.toBeNull();
  });

  it('reporta desviación cuando el punto está fuera de la línea', () => {
    const result = snapToRoute(LINE, { latitude: 0.02, longitude: 0.5 });
    expect(result.deviationKm).toBeGreaterThan(1); // ~2.2 km al vértice medio
  });

  it('la clase UseCase delega en la función pura', async () => {
    const uc = new SnapToRouteUseCase();
    const result = await uc.run({
      geometry: LINE,
      point: { latitude: 0, longitude: 0.5 },
    });
    expect(result.progressKm).toBeGreaterThan(50);
  });
});

describe('detectOffRoute', () => {
  it('resetea a 0 cuando la desviación está dentro del umbral', () => {
    expect(detectOffRoute({ deviationKm: 0.02, consecutiveTicks: 3 })).toEqual({
      ticks: 0,
      isOffRoute: false,
      shouldReroute: false,
    });
  });

  it('acumula ticks sin gatillar mientras no se confirma', () => {
    expect(detectOffRoute({ deviationKm: 0.2, consecutiveTicks: 0 })).toEqual({
      ticks: 1,
      isOffRoute: true,
      shouldReroute: false,
    });
  });

  it('gatilla el reroute al alcanzar los ticks de confirmación y resetea', () => {
    // consecutiveTicks 3 -> ticks 4 == OFF_ROUTE_CONFIRM_TICKS.
    const result = detectOffRoute({ deviationKm: 0.5, consecutiveTicks: 3 });
    expect(result.shouldReroute).toBe(true);
    expect(result.ticks).toBe(0);
  });

  it('la clase UseCase delega en la función pura', async () => {
    const uc = new DetectOffRouteUseCase();
    expect(await uc.run({ deviationKm: 0.02, consecutiveTicks: 2 })).toEqual({
      ticks: 0,
      isOffRoute: false,
      shouldReroute: false,
    });
  });
});

describe('computeNextManeuver', () => {
  it('devuelve null sin steps', () => {
    expect(computeNextManeuver([], 0)).toBeNull();
  });

  it('salta el step depart y devuelve la próxima maniobra con distancia restante', () => {
    const steps = [
      step({ distanceFromStartKm: 0, maneuverType: 'depart', maneuverModifier: null }),
      step({
        distanceFromStartKm: 5,
        instruction: 'Gira a la derecha en Calle 80',
        streetName: 'Calle 80',
      }),
    ];
    const result = computeNextManeuver(steps, 2);
    expect(result?.remainingKm).toBeCloseTo(3, 5);
    expect(result?.instruction).toBe('Gira a la derecha en Calle 80');
    expect(result?.streetName).toBe('Calle 80');
  });

  it('usa el fallback cuando Mapbox no entrega instrucción', () => {
    const steps = [
      step({ distanceFromStartKm: 0, maneuverType: 'depart', maneuverModifier: null }),
      step({ distanceFromStartKm: 5, instruction: '', maneuverModifier: 'left' }),
    ];
    expect(computeNextManeuver(steps, 0)?.instruction).toBe('Gira a la izquierda');
  });

  it('devuelve null cuando ya se pasaron todas las maniobras', () => {
    const steps = [
      step({ distanceFromStartKm: 0, maneuverType: 'depart', maneuverModifier: null }),
      step({ distanceFromStartKm: 5 }),
    ];
    expect(computeNextManeuver(steps, 10)).toBeNull();
  });

  it('la clase UseCase delega en la función pura', async () => {
    const uc = new ComputeNextManeuverUseCase();
    expect(await uc.run({ steps: [], progressKm: 0 })).toBeNull();
  });
});

describe('fallbackInstruction', () => {
  it('mapea arribo y rotonda por tipo', () => {
    expect(
      fallbackInstruction(step({ maneuverType: 'arrive', maneuverModifier: null })),
    ).toBe('Llegas al destino');
    expect(
      fallbackInstruction(step({ maneuverType: 'roundabout', maneuverModifier: null })),
    ).toBe('Entra a la rotonda');
  });

  it('mapea los modificadores direccionales', () => {
    expect(fallbackInstruction(step({ maneuverModifier: 'uturn' }))).toBe(
      'Da media vuelta',
    );
    expect(fallbackInstruction(step({ maneuverModifier: 'straight' }))).toBe(
      'Continua de frente',
    );
  });
});
