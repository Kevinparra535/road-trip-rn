import { LinkingOptions } from '@react-navigation/native';

import { AppStackParamList } from './types';

/**
 * Deep-linking del stack raíz (F4). Mapea URLs entrantes a pantallas tipadas
 * sobre `AppStackParamList`:
 *
 *   roadtrip://route/<routeId>   -> RouteDetail
 *   roadtrip://join/<code>       -> JoinRoute (compartir-para-unirse a una rodada)
 *   roadtrip://plan              -> RoutePlanner
 *   roadtrip://home              -> Home
 *
 * Scheme `roadtrip` declarado en `app.json`. También acepta el dominio https
 * para Universal/App Links cuando se configure el AASA / assetlinks.
 *
 * PENDIENTE (documentado en docs/planning/home-navigation-system-plan.md, F4):
 * el gating de auth — si llega un deep link con sesión cerrada, `RootNavigator`
 * monta `AuthNavigator` y el target (RouteDetail/JoinRoute) no existe aún, así
 * que el link se pierde. La solución robusta es persistir la URL pendiente y
 * resolverla post-login; requiere validación en device. Hoy el linking funciona
 * para el caso autenticado (app abierta y con sesión).
 */
export const linking: LinkingOptions<AppStackParamList> = {
  prefixes: ['roadtrip://', 'https://roadtrip.app'],
  config: {
    screens: {
      HomeTab: {
        screens: {
          HomeMain: 'home',
        },
      },
      RouteDetail: 'route/:routeId',
      JoinRoute: 'join/:initialCode',
      RoutePlanner: 'plan',
    },
  },
};
