export const TYPES = {
  // ── Services (capa data) ──
  AuthService: Symbol.for('AuthService'),
  MotorcycleService: Symbol.for('MotorcycleService'),
  MotoStatsService: Symbol.for('MotoStatsService'),
  RouteService: Symbol.for('RouteService'),
  DirectionsService: Symbol.for('DirectionsService'),

  // ── Repositories (contrato en domain, impl en data) ──
  AuthRepository: Symbol.for('AuthRepository'),
  MotorcycleRepository: Symbol.for('MotorcycleRepository'),
  MotoStatsRepository: Symbol.for('MotoStatsRepository'),
  RouteRepository: Symbol.for('RouteRepository'),
  DirectionsRepository: Symbol.for('DirectionsRepository'),

  // ── UseCases (capa domain) ──
  SignUpUseCase: Symbol.for('SignUpUseCase'),
  SignInUseCase: Symbol.for('SignInUseCase'),
  SignOutUseCase: Symbol.for('SignOutUseCase'),
  GetCurrentRiderUseCase: Symbol.for('GetCurrentRiderUseCase'),
  ObserveAuthStateUseCase: Symbol.for('ObserveAuthStateUseCase'),
  GetAllMotorcyclesUseCase: Symbol.for('GetAllMotorcyclesUseCase'),
  GetMotorcycleUseCase: Symbol.for('GetMotorcycleUseCase'),
  CreateMotorcycleUseCase: Symbol.for('CreateMotorcycleUseCase'),
  UpdateMotorcycleUseCase: Symbol.for('UpdateMotorcycleUseCase'),
  DeleteMotorcycleUseCase: Symbol.for('DeleteMotorcycleUseCase'),
  FetchMotorcycleSpecsUseCase: Symbol.for('FetchMotorcycleSpecsUseCase'),
  GetAllRoutesUseCase: Symbol.for('GetAllRoutesUseCase'),
  GetRouteUseCase: Symbol.for('GetRouteUseCase'),
  CreateRouteUseCase: Symbol.for('CreateRouteUseCase'),
  UpdateRouteUseCase: Symbol.for('UpdateRouteUseCase'),
  DeleteRouteUseCase: Symbol.for('DeleteRouteUseCase'),
  CalculateDirectionsUseCase: Symbol.for('CalculateDirectionsUseCase'),

  // ── ViewModels (capa ui) ──
  SessionViewModel: Symbol.for('SessionViewModel'),
  AuthViewModel: Symbol.for('AuthViewModel'),
  GarageViewModel: Symbol.for('GarageViewModel'),
  MotorcycleFormViewModel: Symbol.for('MotorcycleFormViewModel'),
  RoutesViewModel: Symbol.for('RoutesViewModel'),
  RoutePlannerViewModel: Symbol.for('RoutePlannerViewModel'),
} as const;
