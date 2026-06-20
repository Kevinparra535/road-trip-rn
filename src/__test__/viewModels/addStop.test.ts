import { Place } from '@/domain/entities/Place';
import { RecentDestination } from '@/domain/entities/RecentDestination';

import { AddStopViewModel } from '@/ui/screens/AddStop/AddStopViewModel';

describe('AddStopViewModel', () => {
  const build = (
    recents: RecentDestination[] = [],
    plannerOverrides: Partial<{
      isEditingWaypoint: boolean;
      searchQuery: string;
      searchResults: Place[] | null;
      isSearchLoading: boolean;
      isSearchError: string | null;
    }> = {},
  ) => {
    const getRecentDestinations = {
      run: jest.fn().mockResolvedValue(recents),
    };
    // El planner se construye como objeto plano y `makeAutoObservable` del VM
    // lo proxy-a en profundidad: hay que fijar los flags AL CONSTRUIR (mutar el
    // objeto original despues no lo veria el proxy del VM).
    const planner = {
      waypoints: [] as any[],
      isEditingWaypoint: false,
      searchQuery: '',
      searchResults: null as Place[] | null,
      isSearchLoading: false,
      isSearchError: null as string | null,
      selectSearchResult: jest.fn(),
      replaceEditingWaypoint: jest.fn(),
      setSearchQuery: jest.fn(),
      clearSearch: jest.fn(),
      cancelEditingWaypoint: jest.fn(),
      ...plannerOverrides,
    };
    return {
      vm: new AddStopViewModel(getRecentDestinations as any, planner as any),
      getRecentDestinations,
      planner,
    };
  };

  const makePlace = () =>
    new Place({
      id: 'p-search',
      name: 'Catedral de Sal',
      fullName: 'Catedral de Sal, Zipaquira',
      latitude: 5.02,
      longitude: -74,
      category: 'tourism',
    });

  it('expone las 8 categorias del grid (incl. Pueblos/Hospedaje/Cafe)', () => {
    const { vm } = build();
    expect(vm.categories).toHaveLength(8);
    expect(vm.categories.map((c) => c.label)).toEqual(
      expect.arrayContaining([
        'Gasolinera',
        'Comida',
        'Cafe',
        'Bano',
        'Turismo',
        'Mirador',
        'Pueblos',
        'Hospedaje',
      ]),
    );
  });

  it('los tiles nuevos usan category + kind dedicados (town/lodging/cafe)', () => {
    const { vm } = build();
    const byLabel = (label: string) =>
      vm.categories.find((c) => c.label === label);

    expect(byLabel('Pueblos')).toMatchObject({
      category: 'town',
      kind: 'town',
      iconName: 'business',
    });
    expect(byLabel('Hospedaje')).toMatchObject({
      category: 'lodging',
      kind: 'lodging',
      iconName: 'bed',
    });
    expect(byLabel('Cafe')).toMatchObject({
      category: 'cafe',
      kind: 'cafe',
      iconName: 'cafe',
    });
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

  it('selectSearchResult en modo normal delega a planner.selectSearchResult', () => {
    const { vm, planner } = build([], { isEditingWaypoint: false });
    const place = makePlace();
    vm.selectSearchResult(place);
    expect(planner.selectSearchResult).toHaveBeenCalledTimes(1);
    expect(planner.selectSearchResult).toHaveBeenCalledWith(place);
    expect(planner.replaceEditingWaypoint).not.toHaveBeenCalled();
  });

  it('selectSearchResult en modo edicion reemplaza el waypoint en edicion', () => {
    const { vm, planner } = build([], { isEditingWaypoint: true });
    const place = makePlace();
    vm.selectSearchResult(place);
    expect(planner.replaceEditingWaypoint).toHaveBeenCalledTimes(1);
    expect(planner.replaceEditingWaypoint).toHaveBeenCalledWith({
      latitude: place.latitude,
      longitude: place.longitude,
      name: place.name,
      mapboxCategory: place.category,
    });
    expect(planner.selectSearchResult).not.toHaveBeenCalled();
  });

  it('reset limpia la busqueda del planner', () => {
    const { vm, planner } = build();
    vm.reset();
    expect(planner.clearSearch).toHaveBeenCalledTimes(1);
    expect(planner.cancelEditingWaypoint).toHaveBeenCalledTimes(1);
  });

  it('isSearching es true solo con query no vacia (trim)', () => {
    expect(build([], { searchQuery: '' }).vm.isSearching).toBe(false);
    expect(build([], { searchQuery: '   ' }).vm.isSearching).toBe(false);
    expect(build([], { searchQuery: 'villa' }).vm.isSearching).toBe(true);
  });

  it('expone el estado de busqueda del planner via getters', () => {
    const place = makePlace();
    const { vm } = build([], {
      searchQuery: 'cat',
      searchResults: [place],
      isSearchLoading: true,
      isSearchError: 'boom',
    });
    expect(vm.searchQuery).toBe('cat');
    expect(vm.searchResults).toEqual([place]);
    expect(vm.isSearchLoading).toBe(true);
    expect(vm.isSearchError).toBe('boom');
  });

  it('setSearchQuery y clearSearch delegan al planner', () => {
    const { vm, planner } = build();
    vm.setSearchQuery('zipa');
    expect(planner.setSearchQuery).toHaveBeenCalledWith('zipa');
    vm.clearSearch();
    expect(planner.clearSearch).toHaveBeenCalledTimes(1);
  });
});
