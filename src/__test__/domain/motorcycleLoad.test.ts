import { makeMotorcycle } from '../factories';

describe('Motorcycle.totalLoadKg', () => {
  it('counts the default driver weight', () => {
    // makeMotorcycle usa el peso por defecto del piloto (78 kg).
    expect(makeMotorcycle().totalLoadKg()).toBe(78);
  });

  it('adds the passenger weight when there is a copilot', () => {
    const motorcycle = makeMotorcycle({ hasPassenger: true });
    expect(motorcycle.totalLoadKg()).toBe(143); // 78 + 65
  });

  it('ignores the passenger weight without a copilot', () => {
    const motorcycle = makeMotorcycle({
      driverWeightKg: 80,
      passengerWeightKg: 70,
    });
    expect(motorcycle.totalLoadKg()).toBe(80);
  });

  it('uses the configured driver and passenger weights', () => {
    const motorcycle = makeMotorcycle({
      driverWeightKg: 90,
      hasPassenger: true,
      passengerWeightKg: 55,
    });
    expect(motorcycle.totalLoadKg()).toBe(145);
  });

  it('sums driver, passenger and every luggage case', () => {
    const motorcycle = makeMotorcycle({
      driverWeightKg: 80,
      hasPassenger: true,
      passengerWeightKg: 60,
      luggage: [
        { position: 'left', weightKg: 8 },
        { position: 'top', weightKg: 12 },
      ],
    });
    expect(motorcycle.totalLoadKg()).toBe(160);
  });
});
