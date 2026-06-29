import { Linking } from 'react-native';
import { LinkingOptions } from '@react-navigation/native';

import { PendingDeepLinkStore } from '@/ui/store/PendingDeepLinkStore';

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

/**
 * Construye el `linking` con **auth-gating** (F4): si llega un deep link con la
 * sesión cerrada, lo guarda en el `PendingDeepLinkStore` en vez de perderlo, y
 * lo reemite al login. Recibe los stores como accessors para no acoplar este
 * módulo al container de DI (así los tests de `linking.config` no lo tocan); el
 * cableado lo hace `App.tsx`.
 */
export const createAuthGatedLinking = (
  getIsAuthenticated: () => boolean,
  getPending: () => PendingDeepLinkStore,
): LinkingOptions<AppStackParamList> => ({
  ...linking,
  async getInitialURL() {
    const url = await Linking.getInitialURL();
    if (!url) return null;
    return getPending().gate(url, getIsAuthenticated()) === 'allow' ? url : null;
  },
  subscribe(listener) {
    const onReceive = ({ url }: { url: string }) => {
      if (getPending().gate(url, getIsAuthenticated()) === 'allow') listener(url);
    };
    const sub = Linking.addEventListener('url', onReceive);
    const unstash = getPending().onResolved((url) => listener(url));
    return () => {
      sub.remove();
      unstash();
    };
  },
});
