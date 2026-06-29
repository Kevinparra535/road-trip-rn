import { RidingConditions } from '@/domain/entities/RidingConditions';

import {
  computeRangeFactor,
  MAX_RANGE_FACTOR,
  MIN_RANGE_FACTOR,
  tripLoadKg,
} from '@/domain/useCases/rangeFactor';

import { makeMotorcycle } from '../factories';

describe('computeRangeFactor', () => {
  it('sin señales devuelve 1 (neutral)', () => {
    expect(computeRangeFactor({ distanceKm: 100 })).toBe(1);
  });

  it('penaliza alejarse de la velocidad óptima (70 km/h)', () => {
    // avg 140 km/h: |140-70| * 0.004 = 0.28 -> 0.72
    expect(computeRangeFactor({ distanceKm: 140, durationMin: 60 })).toBeCloseTo(0.72, 5);
  });

  it('penaliza el desnivel de subida por km', () => {
    // 1000 m / 100 km = 10 m/km * 0.006 = 0.06 -> 0.94
    expect(computeRangeFactor({ distanceKm: 100, ascentM: 1000 })).toBeCloseTo(0.94, 5);
  });

  it('penaliza por peso sobre la carga base (80 kg)', () => {
    // 160 kg -> (80/80) * 0.18 = 0.18 -> 0.82
    expect(computeRangeFactor({ distanceKm: 100, loadKg: 160 })).toBeCloseTo(0.82, 5);
  });

  it('aplica ritmo exigente y tipo de rodada', () => {
    expect(computeRangeFactor({ distanceKm: 100, aggressiveRiding: true })).toBeCloseTo(
      0.88,
      5,
    );
    expect(computeRangeFactor({ distanceKm: 100, rideType: 'offroad' })).toBeCloseTo(
      0.8,
      5,
    );
    expect(computeRangeFactor({ distanceKm: 100, rideType: 'highway' })).toBeCloseTo(
      1.03,
      5,
    );
  });

  it('combina todas las señales multiplicativamente', () => {
    // velocidad 70 (neutral) * peso 160 (0.82) * ritmo (0.88) * highway (1.03)
    expect(
      computeRangeFactor({
        distanceKm: 70,
        durationMin: 60,
        loadKg: 160,
        aggressiveRiding: true,
        rideType: 'highway',
      }),
    ).toBeCloseTo(0.82 * 0.88 * 1.03, 5);
  });

  it('acota el factor a [MIN, MAX]', () => {
    // offroad (0.8) * peso 200kg (0.73) * ritmo (0.88) * subida 20 m/km (0.88)
    // ≈ 0.45 -> por debajo del piso, se acota a MIN.
    const low = computeRangeFactor({
      distanceKm: 100,
      ascentM: 2000,
      loadKg: 200,
      aggressiveRiding: true,
      rideType: 'offroad',
    });
    expect(low).toBe(MIN_RANGE_FACTOR);

    const high = computeRangeFactor({
      distanceKm: 70,
      durationMin: 60,
      rideType: 'highway',
    });
    expect(high).toBeLessThanOrEqual(MAX_RANGE_FACTOR);
    expect(high).toBeCloseTo(1.03, 5);
  });
});

describe('tripLoadKg', () => {
  it('solo piloto = peso del piloto', () => {
    const moto = makeMotorcycle({ driverWeightKg: 80 });
    expect(tripLoadKg(moto, RidingConditions.default())).toBe(80);
  });

  it('suma copiloto y maletas según las condiciones del viaje', () => {
    const moto = makeMotorcycle({
      driverWeightKg: 80,
      passengerWeightKg: 60,
      luggage: [
        { position: 'left', weightKg: 10 },
        { position: 'right', weightKg: 5 },
      ],
    });
    expect(
      tripLoadKg(
        moto,
        new RidingConditions({
          hasPassenger: true,
          hasLuggage: true,
          aggressiveRiding: false,
        }),
      ),
    ).toBe(155); // 80 + 60 + 15
  });

  it('ignora copiloto/maletas si el viaje no los lleva', () => {
    const moto = makeMotorcycle({
      driverWeightKg: 80,
      passengerWeightKg: 60,
      luggage: [{ position: 'top', weightKg: 20 }],
    });
    expect(
      tripLoadKg(
        moto,
        new RidingConditions({
          hasPassenger: false,
          hasLuggage: false,
          aggressiveRiding: false,
        }),
      ),
    ).toBe(80);
  });
});
