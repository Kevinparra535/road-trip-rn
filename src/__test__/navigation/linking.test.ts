import { getStateFromPath } from '@react-navigation/native';

import { linking } from '@/ui/navigation/linking';

/** Encuentra la ruta hoja (con params) del state devuelto por getStateFromPath. */
const leaf = (path: string) => {
  const state = getStateFromPath(path, linking.config);
  let route: any = state?.routes?.[state.routes.length - 1];
  while (route?.state?.routes) {
    route = route.state.routes[route.state.routes.length - 1];
  }
  return route as { name: string; params?: Record<string, unknown> } | undefined;
};

describe('linking config', () => {
  it('declara el scheme roadtrip y el dominio https', () => {
    expect(linking.prefixes).toContain('roadtrip://');
    expect(linking.prefixes).toContain('https://roadtrip.app');
  });

  it('route/<id> -> RouteDetail con routeId tipado', () => {
    const route = leaf('route/r-123');
    expect(route?.name).toBe('RouteDetail');
    expect(route?.params).toMatchObject({ routeId: 'r-123' });
  });

  it('join/<code> -> JoinRoute con initialCode (compartir-para-unirse)', () => {
    const route = leaf('join/ABC123');
    expect(route?.name).toBe('JoinRoute');
    expect(route?.params).toMatchObject({ initialCode: 'ABC123' });
  });

  it('plan -> RoutePlanner', () => {
    expect(leaf('plan')?.name).toBe('RoutePlanner');
  });

  it('home -> HomeMain (dentro del HomeTab anidado)', () => {
    expect(leaf('home')?.name).toBe('HomeMain');
  });
});
