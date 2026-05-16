import { Route } from '@/domain/entities/Route';

export interface RouteRepository {
  getAllByRider(riderId: string): Promise<Route[]>;
  getById(id: string): Promise<Route | null>;
  create(route: Route): Promise<Route>;
  update(route: Route): Promise<Route>;
  delete(id: string): Promise<void>;
}
