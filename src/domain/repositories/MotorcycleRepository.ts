import { Motorcycle } from '@/domain/entities/Motorcycle';

export interface MotorcycleRepository {
  getAllByRider(riderId: string): Promise<Motorcycle[]>;
  getById(id: string): Promise<Motorcycle | null>;
  create(motorcycle: Motorcycle): Promise<Motorcycle>;
  update(motorcycle: Motorcycle): Promise<Motorcycle>;
  delete(id: string): Promise<void>;
}
