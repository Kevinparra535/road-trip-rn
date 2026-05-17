import { MotorcycleModel } from '@/data/models/motorcycleModel';

const baseJson = {
  id: 'm1',
  rider_id: 'r1',
  brand: 'CFMOTO',
  model: '450MT',
  year: 2026,
  fuel_type: 'extra',
  tank_capacity_liters: 17.5,
  fuel_consumption_km_per_liter: 26,
};

describe('MotorcycleModel — carga (piloto, copiloto y maleteros)', () => {
  it('parses passenger and luggage, dropping invalid entries', () => {
    const domain = MotorcycleModel.fromJson({
      ...baseJson,
      driver_weight_kg: 80,
      has_passenger: true,
      passenger_weight_kg: 60,
      luggage: [
        { position: 'left', weight_kg: 8 },
        { position: 'top', weight_kg: 12 },
        { position: 'bogus', weight_kg: 5 },
        { position: 'right', weight_kg: 0 },
      ],
    }).toDomain();

    expect(domain.hasPassenger).toBe(true);
    expect(domain.driverWeightKg).toBe(80);
    expect(domain.passengerWeightKg).toBe(60);
    // 'bogus' (posicion invalida) y 'right' (0 kg) quedan descartados.
    expect(domain.luggage).toHaveLength(2);
    // 80 piloto + 60 copiloto + 20 maleteros.
    expect(domain.totalLoadKg()).toBe(160);
  });

  it('defaults driver/passenger weights and no luggage', () => {
    const domain = MotorcycleModel.fromJson(baseJson).toDomain();
    expect(domain.hasPassenger).toBe(false);
    expect(domain.driverWeightKg).toBe(78);
    expect(domain.passengerWeightKg).toBe(65);
    expect(domain.luggage).toEqual([]);
  });

  it('serializes luggage back to snake_case', () => {
    const json = MotorcycleModel.fromJson({
      ...baseJson,
      luggage: [{ position: 'left', weight_kg: 5 }],
    }).toJson();
    expect(json.has_passenger).toBe(false);
    expect(json.luggage).toEqual([{ position: 'left', weight_kg: 5 }]);
  });
});
