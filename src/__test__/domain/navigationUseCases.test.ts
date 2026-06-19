import { detectOffRoute } from '@/domain/useCases/DetectOffRouteUseCase';
import { ProjectRouteProgressUseCase } from '@/domain/useCases/ProjectRouteProgressUseCase';

describe('detectOffRoute', () => {
  it('marks a moving rider outside the route threshold as candidate', () => {
    const decision = detectOffRoute({
      distanceToRouteKm: 0.12,
      thresholdKm: 0.06,
      speedKmh: 35,
      accuracyM: 12,
    });

    expect(decision.isOffRouteCandidate).toBe(true);
    expect(decision.reason).toBe('off_route');
  });

  it('does not mark stationary GPS drift as off-route', () => {
    const decision = detectOffRoute({
      distanceToRouteKm: 0.12,
      thresholdKm: 0.06,
      speedKmh: 2,
      accuracyM: 12,
    });

    expect(decision.isOffRouteCandidate).toBe(false);
    expect(decision.reason).toBe('stationary');
  });

  it('does not mark low-accuracy readings as off-route', () => {
    const decision = detectOffRoute({
      distanceToRouteKm: 0.12,
      thresholdKm: 0.06,
      speedKmh: 35,
      accuracyM: 120,
    });

    expect(decision.isOffRouteCandidate).toBe(false);
    expect(decision.reason).toBe('low_accuracy');
  });
});

describe('ProjectRouteProgressUseCase', () => {
  it('can clamp backward GPS jumps when requested', async () => {
    const useCase = new ProjectRouteProgressUseCase();
    const result = await useCase.run({
      geometry: [
        { latitude: 0, longitude: 0 },
        { latitude: 0, longitude: 1 },
      ],
      point: { latitude: 0, longitude: 0.2 },
      previousProgressKm: 30,
      clampBackwardJumps: true,
    });

    expect(result.progressKm).toBe(30);
    expect(result.wasClamped).toBe(true);
  });
});
