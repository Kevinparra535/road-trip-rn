import { inject, injectable } from 'inversify';

import { DEV_FAKE_MOTORCYCLE, DEV_FLAGS } from '@/config/devFlags';
import { TYPES } from '@/config/types';
import type { MotorcycleService } from '@/data/services/MotorcycleService';
import { Motorcycle } from '@/domain/entities/Motorcycle';
import { MotorcycleRepository } from '@/domain/repositories/MotorcycleRepository';

@injectable()
export class MotorcycleRepositoryImpl implements MotorcycleRepository {
  constructor(
    @inject(TYPES.MotorcycleService)
    private readonly service: MotorcycleService,
  ) {}

  async getAllByRider(riderId: string): Promise<Motorcycle[]> {
    if (DEV_FLAGS.mockGarage) return [DEV_FAKE_MOTORCYCLE];
    const models = await this.service.fetchAllByRider(riderId);
    return models.map((m) => m.toDomain());
  }

  async getById(id: string): Promise<Motorcycle | null> {
    if (DEV_FLAGS.mockGarage && id === DEV_FAKE_MOTORCYCLE.id) {
      return DEV_FAKE_MOTORCYCLE;
    }
    const model = await this.service.fetchById(id);
    return model ? model.toDomain() : null;
  }

  async create(motorcycle: Motorcycle): Promise<Motorcycle> {
    const model = await this.service.create(this.toPayload(motorcycle));
    return model.toDomain();
  }

  async update(motorcycle: Motorcycle): Promise<Motorcycle> {
    const model = await this.service.update(
      motorcycle.id,
      this.toPayload(motorcycle),
    );
    return model.toDomain();
  }

  async delete(id: string): Promise<void> {
    await this.service.delete(id);
  }

  private toPayload(motorcycle: Motorcycle): Record<string, unknown> {
    return {
      rider_id: motorcycle.riderId,
      brand: motorcycle.brand,
      model: motorcycle.model,
      year: motorcycle.year,
      nickname: motorcycle.nickname,
      fuel_type: motorcycle.fuelType,
      tank_capacity_liters: motorcycle.tankCapacityLiters,
      fuel_consumption_km_per_liter: motorcycle.fuelConsumptionKmPerLiter,
      engine_cc: motorcycle.engineCc,
      driver_weight_kg: motorcycle.driverWeightKg,
      has_passenger: motorcycle.hasPassenger,
      passenger_weight_kg: motorcycle.passengerWeightKg,
      luggage: motorcycle.luggage.map((item) => ({
        position: item.position,
        weight_kg: item.weightKg,
      })),
    };
  }
}
