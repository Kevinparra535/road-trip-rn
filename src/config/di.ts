import { Container } from 'inversify';

import { TYPES } from '@/config/types';

import type { AuthService } from '@/data/services/AuthService';
import { AuthServiceImpl } from '@/data/services/AuthService';
import type { DirectionsService } from '@/data/services/DirectionsService';
import { DirectionsServiceImpl } from '@/data/services/DirectionsService';
import type { ElevationService } from '@/data/services/ElevationService';
import { ElevationServiceImpl } from '@/data/services/ElevationService';
import type { FuelStationService } from '@/data/services/FuelStationService';
import { FuelStationServiceImpl } from '@/data/services/FuelStationService';
import type { LocationService } from '@/data/services/LocationService';
import { LocationServiceImpl } from '@/data/services/LocationService';
import type { MotorcycleService } from '@/data/services/MotorcycleService';
import { MotorcycleServiceImpl } from '@/data/services/MotorcycleService';
import type { MotoStatsService } from '@/data/services/MotoStatsService';
import { MotoStatsServiceImpl } from '@/data/services/MotoStatsService';
import type { NetworkService } from '@/data/services/NetworkService';
import { NetworkServiceImpl } from '@/data/services/NetworkService';
import type { OptimizationService } from '@/data/services/OptimizationService';
import { OptimizationServiceImpl } from '@/data/services/OptimizationService';
import type { PlaceCategorySearchService } from '@/data/services/PlaceCategorySearchService';
import { PlaceCategorySearchServiceImpl } from '@/data/services/PlaceCategorySearchService';
import type { PlaceSearchService } from '@/data/services/PlaceSearchService';
import { PlaceSearchServiceImpl } from '@/data/services/PlaceSearchService';
import type { PlaceSummaryService } from '@/data/services/PlaceSummaryService';
import { WikipediaSummaryService } from '@/data/services/PlaceSummaryService';
import type { RouteDraftService } from '@/data/services/RouteDraftService';
import { RouteDraftServiceImpl } from '@/data/services/RouteDraftService';
import type { RouteService } from '@/data/services/RouteService';
import { RouteServiceImpl } from '@/data/services/RouteService';
import type { RouteShareService } from '@/data/services/RouteShareService';
import { RouteShareServiceImpl } from '@/data/services/RouteShareService';
import type { ShareCodeGeneratorService } from '@/data/services/ShareCodeGeneratorService';
import { ShareCodeGeneratorServiceImpl } from '@/data/services/ShareCodeGeneratorService';
import type { TripPartyService } from '@/data/services/TripPartyService';
import { TripPartyServiceImpl } from '@/data/services/TripPartyService';

import { AuthRepositoryImpl } from '@/data/repositories/AuthRepositoryImpl';
import { DirectionsRepositoryImpl } from '@/data/repositories/DirectionsRepositoryImpl';
import { ElevationRepositoryImpl } from '@/data/repositories/ElevationRepositoryImpl';
import { FuelStationRepositoryImpl } from '@/data/repositories/FuelStationRepositoryImpl';
import { LocationRepositoryImpl } from '@/data/repositories/LocationRepositoryImpl';
import { MotorcycleRepositoryImpl } from '@/data/repositories/MotorcycleRepositoryImpl';
import { MotoStatsRepositoryImpl } from '@/data/repositories/MotoStatsRepositoryImpl';
import { NetworkRepositoryImpl } from '@/data/repositories/NetworkRepositoryImpl';
import { OptimizationRepositoryImpl } from '@/data/repositories/OptimizationRepositoryImpl';
import { PlaceCategorySearchRepositoryImpl } from '@/data/repositories/PlaceCategorySearchRepositoryImpl';
import { PlaceSearchRepositoryImpl } from '@/data/repositories/PlaceSearchRepositoryImpl';
import { PlaceSummaryRepositoryImpl } from '@/data/repositories/PlaceSummaryRepositoryImpl';
import { RecentDestinationRepositoryImpl } from '@/data/repositories/RecentDestinationRepositoryImpl';
import { RouteDraftRepositoryImpl } from '@/data/repositories/RouteDraftRepositoryImpl';
import { RouteRepositoryImpl } from '@/data/repositories/RouteRepositoryImpl';
import { RouteShareRepositoryImpl } from '@/data/repositories/RouteShareRepositoryImpl';
import { RouteTemplateRepositoryImpl } from '@/data/repositories/RouteTemplateRepositoryImpl';
import { TripPartyRepositoryImpl } from '@/data/repositories/TripPartyRepositoryImpl';

import type { AuthRepository } from '@/domain/repositories/AuthRepository';
import type { DirectionsRepository } from '@/domain/repositories/DirectionsRepository';
import type { ElevationRepository } from '@/domain/repositories/ElevationRepository';
import type { FuelStationRepository } from '@/domain/repositories/FuelStationRepository';
import type { LocationRepository } from '@/domain/repositories/LocationRepository';
import type { MotorcycleRepository } from '@/domain/repositories/MotorcycleRepository';
import type { MotoStatsRepository } from '@/domain/repositories/MotoStatsRepository';
import type { NetworkRepository } from '@/domain/repositories/NetworkRepository';
import type { OptimizationRepository } from '@/domain/repositories/OptimizationRepository';
import type { PlaceCategorySearchRepository } from '@/domain/repositories/PlaceCategorySearchRepository';
import type { PlaceSearchRepository } from '@/domain/repositories/PlaceSearchRepository';
import type { PlaceSummaryRepository } from '@/domain/repositories/PlaceSummaryRepository';
import type { RecentDestinationRepository } from '@/domain/repositories/RecentDestinationRepository';
import type { RouteDraftRepository } from '@/domain/repositories/RouteDraftRepository';
import type { RouteRepository } from '@/domain/repositories/RouteRepository';
import type { RouteShareRepository } from '@/domain/repositories/RouteShareRepository';
import type { RouteTemplateRepository } from '@/domain/repositories/RouteTemplateRepository';
import type { TripPartyRepository } from '@/domain/repositories/TripPartyRepository';
import type { HttpManager } from '@/domain/services/HttpManager';

import { AddRecentDestinationUseCase } from '@/domain/useCases/AddRecentDestinationUseCase';
import { CalculateDirectionsUseCase } from '@/domain/useCases/CalculateDirectionsUseCase';
import { ClearRecentDestinationsUseCase } from '@/domain/useCases/ClearRecentDestinationsUseCase';
import { ClearRouteDraftUseCase } from '@/domain/useCases/ClearRouteDraftUseCase';
import { CreateMotorcycleUseCase } from '@/domain/useCases/CreateMotorcycleUseCase';
import { CreateRouteUseCase } from '@/domain/useCases/CreateRouteUseCase';
import { CreateTripPartyUseCase } from '@/domain/useCases/CreateTripPartyUseCase';
import { DeleteMotorcycleUseCase } from '@/domain/useCases/DeleteMotorcycleUseCase';
import { DeleteRouteUseCase } from '@/domain/useCases/DeleteRouteUseCase';
import { DetectOffRouteUseCase } from '@/domain/useCases/DetectOffRouteUseCase';
import { EstimateAutonomyUseCase } from '@/domain/useCases/EstimateAutonomyUseCase';
import { EstimatePartyFuelPlanUseCase } from '@/domain/useCases/EstimatePartyFuelPlanUseCase';
import { EstimateRouteFuelUseCase } from '@/domain/useCases/EstimateRouteFuelUseCase';
import { FetchMotorcycleSpecsUseCase } from '@/domain/useCases/FetchMotorcycleSpecsUseCase';
import { FindFuelStationsUseCase } from '@/domain/useCases/FindFuelStationsUseCase';
import { FlushPendingDraftsUseCase } from '@/domain/useCases/FlushPendingDraftsUseCase';
import { GenerateRouteShareCodeUseCase } from '@/domain/useCases/GenerateRouteShareCodeUseCase';
import { GetAllMotorcyclesUseCase } from '@/domain/useCases/GetAllMotorcyclesUseCase';
import { GetAllRoutesUseCase } from '@/domain/useCases/GetAllRoutesUseCase';
import { GetCurrentLocationUseCase } from '@/domain/useCases/GetCurrentLocationUseCase';
import { GetCurrentRiderUseCase } from '@/domain/useCases/GetCurrentRiderUseCase';
import { GetMotorcycleUseCase } from '@/domain/useCases/GetMotorcycleUseCase';
import { GetPlaceSummaryUseCase } from '@/domain/useCases/GetPlaceSummaryUseCase';
import { GetRecentDestinationsUseCase } from '@/domain/useCases/GetRecentDestinationsUseCase';
import { GetRouteDraftUseCase } from '@/domain/useCases/GetRouteDraftUseCase';
import { GetRouteElevationUseCase } from '@/domain/useCases/GetRouteElevationUseCase';
import { GetRouteTemplatesUseCase } from '@/domain/useCases/GetRouteTemplatesUseCase';
import { GetRouteUseCase } from '@/domain/useCases/GetRouteUseCase';
import { InferStopKindUseCase } from '@/domain/useCases/InferStopKindUseCase';
import { JoinTripPartyUseCase } from '@/domain/useCases/JoinTripPartyUseCase';
import { LeaveTripPartyUseCase } from '@/domain/useCases/LeaveTripPartyUseCase';
import { ObserveAuthStateUseCase } from '@/domain/useCases/ObserveAuthStateUseCase';
import { ObserveNetworkStatusUseCase } from '@/domain/useCases/ObserveNetworkStatusUseCase';
import { ObserveTripPartyUseCase } from '@/domain/useCases/ObserveTripPartyUseCase';
import { OptimizeRouteOrderUseCase } from '@/domain/useCases/OptimizeRouteOrderUseCase';
import { ProjectRouteProgressUseCase } from '@/domain/useCases/ProjectRouteProgressUseCase';
import { RequestLocationPermissionUseCase } from '@/domain/useCases/RequestLocationPermissionUseCase';
import { ResolveRouteShareCodeUseCase } from '@/domain/useCases/ResolveRouteShareCodeUseCase';
import { RevokeRouteShareCodeUseCase } from '@/domain/useCases/RevokeRouteShareCodeUseCase';
import { SaveRouteDraftUseCase } from '@/domain/useCases/SaveRouteDraftUseCase';
import { SearchPlacesByCategoryUseCase } from '@/domain/useCases/SearchPlacesByCategoryUseCase';
import { SearchPlacesUseCase } from '@/domain/useCases/SearchPlacesUseCase';
import { SignInUseCase } from '@/domain/useCases/SignInUseCase';
import { SignOutUseCase } from '@/domain/useCases/SignOutUseCase';
import { SignUpUseCase } from '@/domain/useCases/SignUpUseCase';
import { UpdateMotorcycleUseCase } from '@/domain/useCases/UpdateMotorcycleUseCase';
import { UpdateRouteUseCase } from '@/domain/useCases/UpdateRouteUseCase';
import { WatchHeadingUseCase } from '@/domain/useCases/WatchHeadingUseCase';
import { WatchLocationUseCase } from '@/domain/useCases/WatchLocationUseCase';

import { AuthViewModel } from '@/ui/screens/Auth/AuthViewModel';
import { GarageViewModel } from '@/ui/screens/Garage/GarageViewModel';
import { MotorcycleFormViewModel } from '@/ui/screens/Garage/MotorcycleFormViewModel';
import { DestinationPreviewViewModel } from '@/ui/screens/Home/DestinationPreviewViewModel';
import { HomeViewModel } from '@/ui/screens/Home/HomeViewModel';
import { PartyMembersViewModel } from '@/ui/screens/Party/PartyMembersViewModel';
import { AddStopViewModel } from '@/ui/screens/Routes/AddStopViewModel';
import { CategorySublistViewModel } from '@/ui/screens/Routes/CategorySublistViewModel';
import { JoinRouteViewModel } from '@/ui/screens/Routes/JoinRouteViewModel';
import { RouteDetailViewModel } from '@/ui/screens/Routes/RouteDetailViewModel';
import { RoutePlannerViewModel } from '@/ui/screens/Routes/RoutePlannerViewModel';
import { RoutesViewModel } from '@/ui/screens/Routes/RoutesViewModel';

import { FetchHttpManager } from '@/data/network/FetchHttpManager';
import { LocationStore } from '@/ui/store/LocationStore';
import { NavigationSessionStore } from '@/ui/store/NavigationSessionStore';
import { NetworkStore } from '@/ui/store/NetworkStore';
import { PlannerInsightsStore } from '@/ui/store/PlannerInsightsStore';
import { PlannerTemplateController } from '@/ui/store/PlannerTemplateController';
import { SessionStore } from '@/ui/store/SessionStore';
import { SyncCoordinator } from '@/ui/store/SyncCoordinator';
import { TripPartyStore } from '@/ui/store/TripPartyStore';

import 'reflect-metadata';

export const container = new Container();

// ── Managers: singleton ─────────────────────────────────────────────────────
container
  .bind<HttpManager>(TYPES.HttpManager)
  .to(FetchHttpManager)
  .inSingletonScope();

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
container
  .bind<PlaceSearchService>(TYPES.PlaceSearchService)
  .to(PlaceSearchServiceImpl)
  .inSingletonScope();
container
  .bind<PlaceCategorySearchService>(TYPES.PlaceCategorySearchService)
  .to(PlaceCategorySearchServiceImpl)
  .inSingletonScope();
container
  .bind<RouteShareService>(TYPES.RouteShareService)
  .to(RouteShareServiceImpl)
  .inSingletonScope();
container
  .bind<RouteDraftService>(TYPES.RouteDraftService)
  .to(RouteDraftServiceImpl)
  .inSingletonScope();
container
  .bind<ShareCodeGeneratorService>(TYPES.ShareCodeGeneratorService)
  .to(ShareCodeGeneratorServiceImpl)
  .inSingletonScope();
container
  .bind<TripPartyService>(TYPES.TripPartyService)
  .to(TripPartyServiceImpl)
  .inSingletonScope();
container
  .bind<NetworkService>(TYPES.NetworkService)
  .to(NetworkServiceImpl)
  .inSingletonScope();
container
  .bind<PlaceSummaryService>(TYPES.PlaceSummaryService)
  .to(WikipediaSummaryService)
  .inSingletonScope();
container
  .bind<ElevationService>(TYPES.ElevationService)
  .to(ElevationServiceImpl)
  .inSingletonScope();
container
  .bind<OptimizationService>(TYPES.OptimizationService)
  .to(OptimizationServiceImpl)
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
container
  .bind<PlaceSearchRepository>(TYPES.PlaceSearchRepository)
  .to(PlaceSearchRepositoryImpl)
  .inSingletonScope();
container
  .bind<PlaceCategorySearchRepository>(TYPES.PlaceCategorySearchRepository)
  .to(PlaceCategorySearchRepositoryImpl)
  .inSingletonScope();
container
  .bind<RouteShareRepository>(TYPES.RouteShareRepository)
  .to(RouteShareRepositoryImpl)
  .inSingletonScope();
container
  .bind<TripPartyRepository>(TYPES.TripPartyRepository)
  .to(TripPartyRepositoryImpl)
  .inSingletonScope();
container
  .bind<NetworkRepository>(TYPES.NetworkRepository)
  .to(NetworkRepositoryImpl)
  .inSingletonScope();
container
  .bind<PlaceSummaryRepository>(TYPES.PlaceSummaryRepository)
  .to(PlaceSummaryRepositoryImpl)
  .inSingletonScope();
container
  .bind<RecentDestinationRepository>(TYPES.RecentDestinationRepository)
  .to(RecentDestinationRepositoryImpl)
  .inSingletonScope();
container
  .bind<RouteDraftRepository>(TYPES.RouteDraftRepository)
  .to(RouteDraftRepositoryImpl)
  .inSingletonScope();
container
  .bind<ElevationRepository>(TYPES.ElevationRepository)
  .to(ElevationRepositoryImpl)
  .inSingletonScope();
container
  .bind<OptimizationRepository>(TYPES.OptimizationRepository)
  .to(OptimizationRepositoryImpl)
  .inSingletonScope();
container
  .bind<RouteTemplateRepository>(TYPES.RouteTemplateRepository)
  .to(RouteTemplateRepositoryImpl)
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
  .bind<ProjectRouteProgressUseCase>(TYPES.ProjectRouteProgressUseCase)
  .to(ProjectRouteProgressUseCase);
container
  .bind<DetectOffRouteUseCase>(TYPES.DetectOffRouteUseCase)
  .to(DetectOffRouteUseCase);
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
container
  .bind<WatchHeadingUseCase>(TYPES.WatchHeadingUseCase)
  .to(WatchHeadingUseCase);
container
  .bind<SearchPlacesUseCase>(TYPES.SearchPlacesUseCase)
  .to(SearchPlacesUseCase);
container
  .bind<SearchPlacesByCategoryUseCase>(TYPES.SearchPlacesByCategoryUseCase)
  .to(SearchPlacesByCategoryUseCase);
container
  .bind<GenerateRouteShareCodeUseCase>(TYPES.GenerateRouteShareCodeUseCase)
  .to(GenerateRouteShareCodeUseCase);
container
  .bind<ResolveRouteShareCodeUseCase>(TYPES.ResolveRouteShareCodeUseCase)
  .to(ResolveRouteShareCodeUseCase);
container
  .bind<RevokeRouteShareCodeUseCase>(TYPES.RevokeRouteShareCodeUseCase)
  .to(RevokeRouteShareCodeUseCase);
container
  .bind<CreateTripPartyUseCase>(TYPES.CreateTripPartyUseCase)
  .to(CreateTripPartyUseCase);
container
  .bind<JoinTripPartyUseCase>(TYPES.JoinTripPartyUseCase)
  .to(JoinTripPartyUseCase);
container
  .bind<LeaveTripPartyUseCase>(TYPES.LeaveTripPartyUseCase)
  .to(LeaveTripPartyUseCase);
container
  .bind<ObserveTripPartyUseCase>(TYPES.ObserveTripPartyUseCase)
  .to(ObserveTripPartyUseCase);
container
  .bind<EstimatePartyFuelPlanUseCase>(TYPES.EstimatePartyFuelPlanUseCase)
  .to(EstimatePartyFuelPlanUseCase);
container
  .bind<ObserveNetworkStatusUseCase>(TYPES.ObserveNetworkStatusUseCase)
  .to(ObserveNetworkStatusUseCase);
container
  .bind<FlushPendingDraftsUseCase>(TYPES.FlushPendingDraftsUseCase)
  .to(FlushPendingDraftsUseCase);
container
  .bind<GetPlaceSummaryUseCase>(TYPES.GetPlaceSummaryUseCase)
  .to(GetPlaceSummaryUseCase);
container
  .bind<GetRecentDestinationsUseCase>(TYPES.GetRecentDestinationsUseCase)
  .to(GetRecentDestinationsUseCase);
container
  .bind<AddRecentDestinationUseCase>(TYPES.AddRecentDestinationUseCase)
  .to(AddRecentDestinationUseCase);
container
  .bind<ClearRecentDestinationsUseCase>(TYPES.ClearRecentDestinationsUseCase)
  .to(ClearRecentDestinationsUseCase);
container
  .bind<GetRouteDraftUseCase>(TYPES.GetRouteDraftUseCase)
  .to(GetRouteDraftUseCase);
container
  .bind<SaveRouteDraftUseCase>(TYPES.SaveRouteDraftUseCase)
  .to(SaveRouteDraftUseCase);
container
  .bind<ClearRouteDraftUseCase>(TYPES.ClearRouteDraftUseCase)
  .to(ClearRouteDraftUseCase);
container
  .bind<GetRouteElevationUseCase>(TYPES.GetRouteElevationUseCase)
  .to(GetRouteElevationUseCase);
container
  .bind<EstimateRouteFuelUseCase>(TYPES.EstimateRouteFuelUseCase)
  .to(EstimateRouteFuelUseCase);
container
  .bind<InferStopKindUseCase>(TYPES.InferStopKindUseCase)
  .to(InferStopKindUseCase);
container
  .bind<OptimizeRouteOrderUseCase>(TYPES.OptimizeRouteOrderUseCase)
  .to(OptimizeRouteOrderUseCase);
container
  .bind<GetRouteTemplatesUseCase>(TYPES.GetRouteTemplatesUseCase)
  .to(GetRouteTemplatesUseCase);

// ── ViewModels ──────────────────────────────────────────────────────────────
container
  .bind<SessionStore>(TYPES.SessionStore)
  .to(SessionStore)
  .inSingletonScope();
container
  .bind<LocationStore>(TYPES.LocationStore)
  .to(LocationStore)
  .inSingletonScope();
container
  .bind<NavigationSessionStore>(TYPES.NavigationSessionStore)
  .to(NavigationSessionStore)
  .inSingletonScope();
container
  .bind<TripPartyStore>(TYPES.TripPartyStore)
  .to(TripPartyStore)
  .inSingletonScope();
container
  .bind<PlannerInsightsStore>(TYPES.PlannerInsightsStore)
  .to(PlannerInsightsStore)
  .inSingletonScope();
container
  .bind<PlannerTemplateController>(TYPES.PlannerTemplateController)
  .to(PlannerTemplateController)
  .inSingletonScope();
container
  .bind<NetworkStore>(TYPES.NetworkStore)
  .to(NetworkStore)
  .inSingletonScope();
container
  .bind<SyncCoordinator>(TYPES.SyncCoordinator)
  .to(SyncCoordinator)
  .inSingletonScope();
container.bind<AuthViewModel>(TYPES.AuthViewModel).to(AuthViewModel);
container.bind<GarageViewModel>(TYPES.GarageViewModel).to(GarageViewModel);
container
  .bind<MotorcycleFormViewModel>(TYPES.MotorcycleFormViewModel)
  .to(MotorcycleFormViewModel);
container.bind<RoutesViewModel>(TYPES.RoutesViewModel).to(RoutesViewModel);
// Singleton: el Planner es estado compartido entre el RoutePlannerScreen, el
// AddStopScreen y el CategorySublistScreen — todos mutaan los mismos
// waypoints. Sin singleton, cada inyeccion crea un VM fantasma y las
// mutaciones se pierden (bug visible: "el boton agregar parada no funciona").
container
  .bind<RoutePlannerViewModel>(TYPES.RoutePlannerViewModel)
  .to(RoutePlannerViewModel)
  .inSingletonScope();
container
  .bind<RouteDetailViewModel>(TYPES.RouteDetailViewModel)
  .to(RouteDetailViewModel);
// Singleton: HomeScreen y DestinationPreviewScreen (formSheet sobre el mapa)
// comparten estado vía VM — el previewPlace lo setea Home al elegir un
// resultado y lo lee el sheet para mostrar la card de confirmación.
container
  .bind<HomeViewModel>(TYPES.HomeViewModel)
  .to(HomeViewModel)
  .inSingletonScope();
container
  .bind<DestinationPreviewViewModel>(TYPES.DestinationPreviewViewModel)
  .to(DestinationPreviewViewModel);
container
  .bind<JoinRouteViewModel>(TYPES.JoinRouteViewModel)
  .to(JoinRouteViewModel);
container
  .bind<PartyMembersViewModel>(TYPES.PartyMembersViewModel)
  .to(PartyMembersViewModel);
container.bind<AddStopViewModel>(TYPES.AddStopViewModel).to(AddStopViewModel);
container
  .bind<CategorySublistViewModel>(TYPES.CategorySublistViewModel)
  .to(CategorySublistViewModel);
