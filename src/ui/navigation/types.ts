import { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
};

export type RoutesStackParamList = {
  RoutesList: undefined;
  RoutePlanner: { routeId?: string } | undefined;
  RouteDetail: { routeId: string };
  /**
   * Pantalla para unirse a una ruta compartida. `initialCode` permite
   * pre-llenar el input (ej. desde un deep link futuro). C.4.
   */
  JoinRoute: { initialCode?: string } | undefined;
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
