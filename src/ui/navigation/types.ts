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

/**
 * Param list del stack RAÍZ real de la app (`AppStackNavigator`). Pese al
 * nombre histórico "AppDrawer", la topología es un `createNativeStackNavigator`
 * PLANO: las pantallas de planeación viven como hermanas a nivel root, no
 * anidadas bajo `RoutesTab`. Por eso se reexponen aquí —además de vía
 * `RoutesTab`/`GarageTab`— reusando las shapes de los stacks anidados: así los
 * `navigate('RoutePlanner', …)` directos quedan tipados sin `as any`/`as never`.
 *
 * La consolidación de esta duplicación (decidir tabs reales vs stack plano) es
 * trabajo de F4 — ver `docs/planning/home-navigation-system-plan.md`.
 */
export type AppStackParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList> | undefined;
  RoutesTab: NavigatorScreenParams<RoutesStackParamList> | undefined;
  GarageTab: NavigatorScreenParams<GarageStackParamList> | undefined;
  ProfileTab: undefined;
  // Pantallas FLAT a nivel root (la topología real del AppStackNavigator).
  RoutePlanner: RoutesStackParamList['RoutePlanner'];
  RouteDetail: RoutesStackParamList['RouteDetail'];
  JoinRoute: RoutesStackParamList['JoinRoute'];
  PartyMembers: RoutesStackParamList['PartyMembers'];
  AddStop: RoutesStackParamList['AddStop'];
  CategorySublist: RoutesStackParamList['CategorySublist'];
  MotorcycleForm: GarageStackParamList['MotorcycleForm'];
};
