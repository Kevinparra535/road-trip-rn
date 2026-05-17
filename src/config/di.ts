import 'reflect-metadata';
import { Container } from 'inversify';

import { TYPES } from '@/config/types';
import { AuthRepositoryImpl } from '@/data/repositories/AuthRepositoryImpl';
import { DirectionsRepositoryImpl } from '@/data/repositories/DirectionsRepositoryImpl';
import { FuelStationRepositoryImpl } from '@/data/repositories/FuelStationRepositoryImpl';
import { LocationRepositoryImpl } from '@/data/repositories/LocationRepositoryImpl';
import { MotoStatsRepositoryImpl } from '@/data/repositories/MotoStatsRepositoryImpl';
import { MotorcycleRepositoryImpl } from '@/data/repositories/MotorcycleRepositoryImpl';
import { RouteRepositoryImpl } from '@/data/repositories/RouteRepositoryImpl';
import { AuthServiceImpl } from '@/data/services/AuthService';
import type { AuthService } from '@/data/services/AuthService';
import { DirectionsServiceImpl } from '@/data/services/DirectionsService';
import type { DirectionsService } from '@/data/services/DirectionsService';
import { FuelStationServiceImpl } from '@/data/services/FuelStationService';
import type { FuelStationService } from '@/data/services/FuelStationService';
import { LocationServiceImpl } from '@/data/services/LocationService';
import type { LocationService } from '@/data/services/LocationService';
import { MotoStatsServiceImpl } from '@/data/services/MotoStatsService';
import type { MotoStatsService } from '@/data/services/MotoStatsService';
import { MotorcycleServiceImpl } from '@/data/services/MotorcycleService';
import type { MotorcycleService } from '@/data/services/MotorcycleService';
import { RouteServiceImpl } from '@/data/services/RouteService';
import type { RouteService } from '@/data/services/RouteService';
import type { AuthRepository } from '@/domain/repositories/AuthRepository';
import type { DirectionsRepository } from '@/domain/repositories/DirectionsRepository';
import type { FuelStationRepository } from '@/domain/repositories/FuelStationRepository';
import type { LocationRepository } from '@/domain/repositories/LocationRepository';
import type { MotoStatsRepository } from '@/domain/repositories/MotoStatsRepository';
import type { MotorcycleRepository } from '@/domain/repositories/MotorcycleRepository';
import type { RouteRepository } from '@/domain/repositories/RouteRepository';
import { CalculateDirectionsUseCase } from '@/domain/useCases/CalculateDirectionsUseCase';
import { CreateMotorcycleUseCase } from '@/domain/useCases/CreateMotorcycleUseCase';
import { CreateRouteUseCase } from '@/domain/useCases/CreateRouteUseCase';
import { DeleteMotorcycleUseCase } from '@/domain/useCases/DeleteMotorcycleUseCase';
import { DeleteRouteUseCase } from '@/domain/useCases/DeleteRouteUseCase';
import { EstimateAutonomyUseCase } from '@/domain/useCases/EstimateAutonomyUseCase';
import { FetchMotorcycleSpecsUseCase } from '@/domain/useCases/FetchMotorcycleSpecsUseCase';
import { FindFuelStationsUseCase } from '@/domain/useCases/FindFuelStationsUseCase';
import { GetAllMotorcyclesUseCase } from '@/domain/useCases/GetAllMotorcyclesUseCase';
import { GetAllRoutesUseCase } from '@/domain/useCases/GetAllRoutesUseCase';
import { GetCurrentLocationUseCase } from '@/domain/useCases/GetCurrentLocationUseCase';
import { GetCurrentRiderUseCase } from '@/domain/useCases/GetCurrentRiderUseCase';
import { GetMotorcycleUseCase } from '@/domain/useCases/GetMotorcycleUseCase';
import { GetRouteUseCase } from '@/domain/useCases/GetRouteUseCase';
import { ObserveAuthStateUseCase } from '@/domain/useCases/ObserveAuthStateUseCase';
import { RequestLocationPermissionUseCase } from '@/domain/useCases/RequestLocationPermissionUseCase';
import { SignInUseCase } from '@/domain/useCases/SignInUseCase';
import { SignOutUseCase } from '@/domain/useCases/SignOutUseCase';
import { SignUpUseCase } from '@/domain/useCases/SignUpUseCase';
import { UpdateMotorcycleUseCase } from '@/domain/useCases/UpdateMotorcycleUseCase';
import { UpdateRouteUseCase } from '@/domain/useCases/UpdateRouteUseCase';
import { WatchLocationUseCase } from '@/domain/useCases/WatchLocationUseCase';
import { AuthViewModel } from '@/ui/screens/Auth/AuthViewModel';
import { GarageViewModel } from '@/ui/screens/Garage/GarageViewModel';
import { MotorcycleFormViewModel } from '@/ui/screens/Garage/MotorcycleFormViewModel';
import { RouteDetailViewModel } from '@/ui/screens/Routes/RouteDetailViewModel';
import { RoutePlannerViewModel } from '@/ui/screens/Routes/RoutePlannerViewModel';
import { RoutesViewModel } from '@/ui/screens/Routes/RoutesViewModel';
import { LocationStore } from '@/ui/viewModels/LocationStore';
import { SessionViewModel } from '@/ui/viewModels/SessionViewModel';

export const container = new Container();

// ── Services: singleton ────────────────────────────────────────────────────
container
  .bind<AuthService>(TYPES.AuthService)
  .to(AuthServiceImpl)
  .inSingletonScope();
container
  .bind<MotorcycleService>(TYPES.MotorcycleService)
  .to(MotorcycleServiceImpl)
  .inSingletonScope();
container
  .bind<MotoStatsService>(TYPES.MotoStatsService)
  .to(MotoStatsServiceImpl)
  .inSingletonScope();
container
  .bind<RouteService>(TYPES.RouteService)
  .to(RouteServiceImpl)
  .inSingletonScope();
container
  .bind<DirectionsService>(TYPES.DirectionsService)
  .to(DirectionsServiceImpl)
  .inSingletonScope();
container
  .bind<FuelStationService>(TYPES.FuelStationService)
  .to(FuelStationServiceImpl)
  .inSingletonScope();
container
  .bind<LocationService>(TYPES.LocationService)
  .to(LocationServiceImpl)
  .inSingletonScope();

// ── Repositories: singleton ─────────────────────────────────────────────────
container
  .bind<AuthRepository>(TYPES.AuthRepository)
  .to(AuthRepositoryImpl)
  .inSingletonScope();
container
  .bind<MotorcycleRepository>(TYPES.MotorcycleRepository)
  .to(MotorcycleRepositoryImpl)
  .inSingletonScope();
container
  .bind<MotoStatsRepository>(TYPES.MotoStatsRepository)
  .to(MotoStatsRepositoryImpl)
  .inSingletonScope();
container
  .bind<RouteRepository>(TYPES.RouteRepository)
  .to(RouteRepositoryImpl)
  .inSingletonScope();
container
  .bind<DirectionsRepository>(TYPES.DirectionsRepository)
  .to(DirectionsRepositoryImpl)
  .inSingletonScope();
container
  .bind<FuelStationRepository>(TYPES.FuelStationRepository)
  .to(FuelStationRepositoryImpl)
  .inSingletonScope();
container
  .bind<LocationRepository>(TYPES.LocationRepository)
  .to(LocationRepositoryImpl)
  .inSingletonScope();

// ── UseCases: transient ─────────────────────────────────────────────────────
container.bind<SignUpUseCase>(TYPES.SignUpUseCase).to(SignUpUseCase);
container.bind<SignInUseCase>(TYPES.SignInUseCase).to(SignInUseCase);
container.bind<SignOutUseCase>(TYPES.SignOutUseCase).to(SignOutUseCase);
container
  .bind<GetCurrentRiderUseCase>(TYPES.GetCurrentRiderUseCase)
  .to(GetCurrentRiderUseCase);
container
  .bind<ObserveAuthStateUseCase>(TYPES.ObserveAuthStateUseCase)
  .to(ObserveAuthStateUseCase);
container
  .bind<GetAllMotorcyclesUseCase>(TYPES.GetAllMotorcyclesUseCase)
  .to(GetAllMotorcyclesUseCase);
container
  .bind<GetMotorcycleUseCase>(TYPES.GetMotorcycleUseCase)
  .to(GetMotorcycleUseCase);
container
  .bind<CreateMotorcycleUseCase>(TYPES.CreateMotorcycleUseCase)
  .to(CreateMotorcycleUseCase);
container
  .bind<UpdateMotorcycleUseCase>(TYPES.UpdateMotorcycleUseCase)
  .to(UpdateMotorcycleUseCase);
container
  .bind<DeleteMotorcycleUseCase>(TYPES.DeleteMotorcycleUseCase)
  .to(DeleteMotorcycleUseCase);
container
  .bind<FetchMotorcycleSpecsUseCase>(TYPES.FetchMotorcycleSpecsUseCase)
  .to(FetchMotorcycleSpecsUseCase);
container
  .bind<GetAllRoutesUseCase>(TYPES.GetAllRoutesUseCase)
  .to(GetAllRoutesUseCase);
container.bind<GetRouteUseCase>(TYPES.GetRouteUseCase).to(GetRouteUseCase);
container
  .bind<CreateRouteUseCase>(TYPES.CreateRouteUseCase)
  .to(CreateRouteUseCase);
container
  .bind<UpdateRouteUseCase>(TYPES.UpdateRouteUseCase)
  .to(UpdateRouteUseCase);
container
  .bind<DeleteRouteUseCase>(TYPES.DeleteRouteUseCase)
  .to(DeleteRouteUseCase);
container
  .bind<CalculateDirectionsUseCase>(TYPES.CalculateDirectionsUseCase)
  .to(CalculateDirectionsUseCase);
container
  .bind<EstimateAutonomyUseCase>(TYPES.EstimateAutonomyUseCase)
  .to(EstimateAutonomyUseCase);
container
  .bind<FindFuelStationsUseCase>(TYPES.FindFuelStationsUseCase)
  .to(FindFuelStationsUseCase);
container
  .bind<RequestLocationPermissionUseCase>(
    TYPES.RequestLocationPermissionUseCase,
  )
  .to(RequestLocationPermissionUseCase);
container
  .bind<GetCurrentLocationUseCase>(TYPES.GetCurrentLocationUseCase)
  .to(GetCurrentLocationUseCase);
container
  .bind<WatchLocationUseCase>(TYPES.WatchLocationUseCase)
  .to(WatchLocationUseCase);

// ── ViewModels ──────────────────────────────────────────────────────────────
container
  .bind<SessionViewModel>(TYPES.SessionViewModel)
  .to(SessionViewModel)
  .inSingletonScope();
container
  .bind<LocationStore>(TYPES.LocationStore)
  .to(LocationStore)
  .inSingletonScope();
container.bind<AuthViewModel>(TYPES.AuthViewModel).to(AuthViewModel);
container.bind<GarageViewModel>(TYPES.GarageViewModel).to(GarageViewModel);
container
  .bind<MotorcycleFormViewModel>(TYPES.MotorcycleFormViewModel)
  .to(MotorcycleFormViewModel);
container.bind<RoutesViewModel>(TYPES.RoutesViewModel).to(RoutesViewModel);
container
  .bind<RoutePlannerViewModel>(TYPES.RoutePlannerViewModel)
  .to(RoutePlannerViewModel);
container
  .bind<RouteDetailViewModel>(TYPES.RouteDetailViewModel)
  .to(RouteDetailViewModel);
