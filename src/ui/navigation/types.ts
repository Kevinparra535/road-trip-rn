import { NavigatorScreenParams } from '@react-navigation/native';

import { SearchableCategory } from '@/domain/repositories/PlaceCategorySearchRepository';

export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
};

/**
 * Forma serializable de un Place para pasar como navigation param. Place es
 * una clase con métodos (`toLngLat()`, etc.) — los params deben ser planos
 * para que el state persistance no rompa. El RoutePlanner reconstruye con
 * `initializeWithDestination(...)`.
 */
export type SerializedPlace = {
  latitude: number;
  longitude: number;
  name: string;
  mapboxCategory?: string;
  placeType?: string;
};

/** Waypoint serializado para duplicar una ruta (params de navegación planos). */
export type SerializedDuplicateWaypoint = {
  name: string;
  latitude: number;
  longitude: number;
  kind: string;
  order: number;
  mapboxCategory?: string;
  categoryKind?: string;
  notes?: string;
  stopDurationMin?: number;
  isReturnClone?: boolean;
};

/**
 * Forma serializable de una ruta para duplicarla. El RouteDetail la arma con
 * `getDuplicationPayload()` y el RoutePlanner la rehidrata con
 * `duplicateRoute(...)` (waypoints con ids nuevos, nombre con "(copia)").
 */
export type SerializedDuplicateRoute = {
  name: string;
  rideType: string;
  waypoints: SerializedDuplicateWaypoint[];
  avoid?: {
    tolls: boolean;
    highways: boolean;
    ferries: boolean;
    unpaved: boolean;
  };
  roundTrip?: boolean;
};

export type RoutesStackParamList = {
  RoutesList: undefined;
  /**
   * `routeId` carga una ruta existente (modo edit). `destinationPlace` viene
   * del DestinationPreview del Home (A2 del flow brief) — abre el Planner
   * con un destino preseteado y el bloque "Falta arranque" arriba.
   * `duplicateFrom` rehidrata el Planner como copia de una ruta existente.
   */
  RoutePlanner:
    | {
        routeId?: string;
        destinationPlace?: SerializedPlace;
        duplicateFrom?: SerializedDuplicateRoute;
      }
    | undefined;
  RouteDetail: { routeId: string };
  /**
   * Pantalla para unirse a una ruta compartida. `initialCode` permite
   * pre-llenar el input (ej. desde un deep link futuro). C.4.
   */
  JoinRoute: { initialCode?: string } | undefined;
  /** Lista de miembros del party activo. C.5. */
  PartyMembers: undefined;
  /** Pantalla dedicada para agregar parada por categoría. UX gap fix. */
  AddStop: undefined;
  /** Sub-listado de POIs filtrados por categoría. UX gap fix. */
  CategorySublist: { category: SearchableCategory };
};

export type GarageStackParamList = {
  GarageList: undefined;
  MotorcycleForm: { motorcycleId?: string } | undefined;
};

export type HomeStackParamList = {
  HomeMain: undefined;
  // DestinationPreview se monta como native formSheet sobre el mapa; el Place
  // a previsualizar vive en `HomeViewModel.previewPlace` (singleton).
  DestinationPreview: undefined;
};

export type AppDrawerParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  RoutesTab: NavigatorScreenParams<RoutesStackParamList>;
  GarageTab: NavigatorScreenParams<GarageStackParamList>;
  ProfileTab: undefined;
};
