import { Place } from '@/domain/entities/Place';
import { RecentDestination } from '@/domain/entities/RecentDestination';

import { AddStopViewModel } from '@/ui/screens/Routes/AddStopViewModel';

describe('AddStopViewModel', () => {
  const build = (recents: RecentDestination[] = []) => {
    const getRecentDestinations = {
      run: jest.fn().mockResolvedValue(recents),
    };
    const planner = {
      waypoints: [] as any[],
      selectSearchResult: jest.fn(),
    };
    return {
      vm: new AddStopViewModel(getRecentDestinations as any, planner as any),
      getRecentDestinations,
      planner,
    };
  };

  it('expone las 6 categorias del grid', () => {
    const { vm } = build();
    expect(vm.categories).toHaveLength(6);
    expect(vm.categories.map((c) => c.label)).toEqual(
      expect.arrayContaining([
        'Gasolinera',
        'Comida',
        'Cafe',
        'Bano',
        'Turismo',
        'Mirador',
      ]),
    );
  });

  it('initialize carga los recientes', async () => {
    const recent = new RecentDestination({
      id: 'r-1',
      placeId: 'p-1',
      name: 'Villa de Leyva',
      fullName: 'Villa de Leyva, Boyaca',
      latitude: 5.6,
      longitude: -73.5,
      visitedAt: new Date(),
    });
    const { vm } = build([recent]);
    await vm.initialize();
    expect(vm.recents).toHaveLength(1);
    expect(vm.recents[0].name).toBe('Villa de Leyva');
    expect(vm.isLoading).toBe(false);
  });

  it('selectRecent convierte a Place y delega al planner', () => {
    const recent = new RecentDestination({
      id: 'r-1',
      placeId: 'p-1',
      name: 'Estacion Terpel',
      fullName: 'Estacion Terpel, Bogota',
      latitude: 4.6,
      longitude: -74,
      visitedAt: new Date(),
      category: 'gas_station',
    });
    const { vm, planner } = build();
    vm.selectRecent(recent);
    expect(planner.selectSearchResult).toHaveBeenCalledTimes(1);
    const passedPlace: Place = planner.selectSearchResult.mock.calls[0][0];
    expect(passedPlace.name).toBe('Estacion Terpel');
    expect(passedPlace.category).toBe('gas_station');
  });

  it('initialize captura errores y deja isError', async () => {
    const getRecentDestinations = {
      run: jest.fn().mockRejectedValue(new Error('AsyncStorage corrupted')),
    };
    const vm = new AddStopViewModel(
      getRecentDestinations as any,
      { waypoints: [] } as any,
    );
    await vm.initialize();
    expect(vm.isError).toContain('AsyncStorage');
    expect(vm.isLoading).toBe(false);
  });
});
