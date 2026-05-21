import { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
};

export type RoutesStackParamList = {
  RoutesList: undefined;
  RoutePlanner: { routeId?: string } | undefined;
  RouteDetail: { routeId: string };
};

export type GarageStackParamList = {
  GarageList: undefined;
  MotorcycleForm: { motorcycleId?: string } | undefined;
};

export type AppDrawerParamList = {
  HomeTab: undefined;
  RoutesTab: NavigatorScreenParams<RoutesStackParamList>;
  GarageTab: NavigatorScreenParams<GarageStackParamList>;
  ProfileTab: undefined;
};
