import { AutonomyEstimate } from '@/domain/entities/AutonomyEstimate';
import { Motorcycle } from '@/domain/entities/Motorcycle';
import { Place } from '@/domain/entities/Place';
import { RouteAvoidPreferences } from '@/domain/entities/RouteAvoidPreferences';
import { RouteDirections } from '@/domain/entities/RouteDirections';
import { RouteShareCode } from '@/domain/entities/RouteShareCode';
import { RouteTemplate } from '@/domain/entities/RouteTemplate';

import { RouteDetailViewModel } from '@/ui/screens/Routes/RouteDetailViewModel';
import { RoutePlannerViewModel } from '@/ui/screens/Routes/RoutePlannerViewModel';
import { RoutesViewModel } from '@/ui/screens/Routes/RoutesViewModel';
import { PlannerInsightsStore } from '@/ui/store/PlannerInsightsStore';
import { PlannerTemplateController } from '@/ui/store/PlannerTemplateController';

import {
  makeElevationProfile,
  makeMotorcycle,
  makeRider,
  makeRoute,
  makeRouteFuelEstimate,
} from '../factories';

describe('RoutesViewModel', () => {
  const build = (routes: any = [makeRoute()]) => {
    const getCurrentRider = { run: jest.fn().mockResolvedValue(makeRider()) };
    const getAll = { run: jest.fn().mockResolvedValue(routes) };
    const del = { run: jest.fn().mockResolvedValue(undefined) };
    return {
      vm: new RoutesViewModel(
        getCurrentRider as any,
        getAll as any,
        del as any,
      ),
    };
  };

  it('loads routes for the rider', async () => {
    const { vm } = build();
    await vm.initialize();
    expect(vm.isLoaded).toBe(true);
    expect(vm.isEmpty).toBe(false);
  });

  it('deletes a route from the list', async () => {
    const { vm } = build();
    await vm.initialize();
    await vm.delete('route-1');
    expect(vm.isRoutesResponse).toHaveLength(0);
  });
});

describe('RoutePlannerViewModel', () => {
  const build = (
    overrides: {
      searchResults?: Place[];
      searchError?: Error;
      categoryResults?: Place[];
      categoryError?: Error;
    } = {},
  ) => {
    const getCurrentRider = { run: jest.fn().mockResolvedValue(makeRider()) };
    const getRoute = { run: jest.fn() };
    const calculate = {
      run: jest.fn().mockResolvedValue(
        new RouteDirections({
          distanceKm: 120,
          durationMin: 90,
          geometry: [{ latitude: 4, longitude: -74 }],
        }),
      ),
    };
    const create = { run: jest.fn().mockResolvedValue(makeRoute()) };
    const update = { run: jest.fn().mockResolvedValue(makeRoute()) };
    const searchPlaces = {
      run: jest.fn(async () => {
        if (overrides.searchError) throw overrides.searchError;
        return overrides.searchResults ?? [];
      }),
    };
    const searchPlacesByCategory = {
      run: jest.fn(async () => {
        if (overrides.categoryError) throw overrides.categoryError;
        return overrides.categoryResults ?? [];
      }),
    };
    const estimatePartyFuel = { run: jest.fn() };
    const observePartyUseCase = {
      subscribe: jest.fn(() => () => undefined),
    };
    // Mock por defecto: rider sin motos. Tests que quieran el aviso de
    // "Sin moto registrada" no necesitan tocar nada; los que quieran moto
    // registrada sobreescriben `getAllMotorcycles.run`.
    const getAllMotorcycles = {
      run: jest.fn(async (): Promise<Motorcycle[]> => []),
    };
    // E3 draft mocks. Por defecto el draft repo es no-op.
    const saveDraft = { run: jest.fn().mockResolvedValue(undefined) };
    const clearDraft = { run: jest.fn().mockResolvedValue(undefined) };
    const optimize = { run: jest.fn() };

    // Store de insights real (use cases mockeados) — así el conditionsKey es
    // observable y la reaction del VM dispara al togglear o cambiar directions.
    const insightsAutonomy = {
      run: jest.fn().mockResolvedValue(
        new AutonomyEstimate({
          totalDistanceKm: 100,
          fullTankRangeKm: 300,
          effectiveRangeKm: 250,
          safetyReserveKm: 30,
          totalFuelLiters: 5,
          reachesWithoutRefuel: true,
          fuelStops: [],
          conditionsSummary: 'solo',
        }),
      ),
    };
    const insightsFuel = {
      run: jest.fn().mockResolvedValue(makeRouteFuelEstimate()),
    };
    const insightsElevation = {
      run: jest.fn().mockResolvedValue(makeElevationProfile()),
    };
    const insightsSummary = { run: jest.fn().mockResolvedValue(null) };
    const insights = new PlannerInsightsStore(
      insightsAutonomy as any,
      insightsFuel as any,
      insightsElevation as any,
      insightsSummary as any,
    );

    // Controller de plantillas real con un catálogo mockeado de 1 template.
    const getTemplates = {
      run: jest.fn().mockResolvedValue([
        new RouteTemplate({
          id: 'dominical',
          name: 'Dominical',
          description: 'test',
          iconName: 'sunny-outline',
          rideType: 'group',
          suggestedStopKinds: ['food', 'rest'],
          avoid: new RouteAvoidPreferences({ highways: true }),
          isRoundTrip: true,
          suggestedStopDurationMin: 30,
        }),
      ]),
    };
    const templates = new PlannerTemplateController(getTemplates as any);

    const partyStore =
      new (require('@/ui/store/TripPartyStore').TripPartyStore)(
        observePartyUseCase as any,
      );
    const locationStore = {
      hasLocation: false,
      isLocationResponse: null,
    };
    const vm = new RoutePlannerViewModel(
      getCurrentRider as any,
      getRoute as any,
      calculate as any,
      create as any,
      update as any,
      searchPlaces as any,
      searchPlacesByCategory as any,
      estimatePartyFuel as any,
      getAllMotorcycles as any,
      saveDraft as any,
      clearDraft as any,
      optimize as any,
      partyStore as any,
      locationStore as any,
      insights as any,
      templates as any,
    );
    return {
      vm,
      calculate,
      create,
      searchPlaces,
      searchPlacesByCategory,
      estimatePartyFuel,
      getAllMotorcycles,
      saveDraft,
      clearDraft,
      optimize,
      partyStore,
      insights,
      insightsAutonomy,
      insightsElevation,
      templates,
      getTemplates,
    };
  };

  // Ayuda: avanza el debounce de search (400ms) sin esperar tiempo real.
  const flushDebounce = async () => {
    jest.advanceTimersByTime(450);
    // Vacia microtasks pendientes (promises encadenadas por el reaction).
    await Promise.resolve();
    await Promise.resolve();
  };

  it('normalizes waypoint kinds as points are added', async () => {
    const { vm } = build();
    await vm.initialize();
    vm.addWaypoint(4.6, -74.08);
    vm.addWaypoint(4.7, -74.1);
    vm.addWaypoint(4.8, -74.2);
    expect(vm.waypoints[0].kind).toBe('start');
    expect(vm.waypoints[2].kind).toBe('destination');
    expect(vm.canCalculate).toBe(true);
  });

  it('calculates directions and enables saving', async () => {
    const { vm, calculate } = build();
    await vm.initialize();
    vm.setName('Mi ruta');
    vm.addWaypoint(4.6, -74.08);
    vm.addWaypoint(4.8, -74.2);
    await vm.calculateDirections();
    expect(calculate.run).toHaveBeenCalled();
    expect(vm.distanceKm).toBe(120);
    expect(vm.canSave).toBe(true);
  });

  it('saves the route after calculating', async () => {
    const { vm, create } = build();
    await vm.initialize();
    vm.setName('Mi ruta');
    vm.addWaypoint(4.6, -74.08);
    vm.addWaypoint(4.8, -74.2);
    await vm.calculateDirections();
    const ok = await vm.submit();
    expect(ok).toBe(true);
    expect(create.run).toHaveBeenCalled();
  });

  it('clears directions when ride type changes', async () => {
    const { vm } = build();
    await vm.initialize();
    vm.addWaypoint(4.6, -74.08);
    vm.addWaypoint(4.8, -74.2);
    await vm.calculateDirections();
    vm.setRideType('offroad');
    expect(vm.directions).toBeNull();
  });

  it('setStopKind only updates intermediate waypoints and marks override', async () => {
    const { vm } = build();
    await vm.initialize();
    vm.addWaypoint(4.6, -74.08, 'A');
    vm.addWaypoint(4.7, -74.1, 'B');
    vm.addWaypoint(4.8, -74.2, 'C');

    const intermediateId = vm.waypoints[1].id;
    vm.setStopKind(intermediateId, 'fuel');

    const updated = vm.waypoints.find((w) => w.id === intermediateId);
    expect(updated?.kind).toBe('fuel');
    expect(updated?.userOverrideKind).toBe(true);

    // start/destination no se pueden cambiar
    const startId = vm.waypoints[0].id;
    const destId = vm.waypoints[2].id;
    vm.setStopKind(startId, 'tourism');
    vm.setStopKind(destId, 'tourism');
    expect(vm.waypoints[0].kind).toBe('start');
    expect(vm.waypoints[2].kind).toBe('destination');

    // un kind invalido (start/destination) sobre un intermedio es no-op
    vm.setStopKind(intermediateId, 'start');
    expect(vm.waypoints[1].kind).toBe('fuel');
  });

  it('moveStop reordena paradas intermedias y bloquea start/destination', async () => {
    const { vm } = build();
    await vm.initialize();
    vm.addWaypoint(4.6, -74.08, 'Start');
    vm.addWaypoint(4.7, -74.1, 'A');
    vm.addWaypoint(4.8, -74.2, 'B');
    vm.addWaypoint(4.9, -74.3, 'End');

    const aId = vm.waypoints[1].id;
    const bId = vm.waypoints[2].id;

    // A esta en pos 1, B en pos 2. Movemos B hacia arriba.
    vm.moveStop(bId, 'up');
    expect(vm.waypoints[1].id).toBe(bId);
    expect(vm.waypoints[2].id).toBe(aId);

    // Tratamos de mover el destino (pos 3) hacia arriba — no-op.
    const destId = vm.waypoints[3].id;
    vm.moveStop(destId, 'up');
    expect(vm.waypoints[3].id).toBe(destId);

    // Tratamos de mover A (que ya esta en pos 2 luego del swap) por debajo del
    // destination — no-op por limite.
    vm.moveStop(aId, 'down');
    expect(vm.waypoints[2].id).toBe(aId);
  });

  it('timelineItems setea canMoveUp/canMoveDown segun la posicion', async () => {
    const { vm } = build();
    await vm.initialize();
    vm.addWaypoint(4.6, -74.08, 'Start');
    vm.addWaypoint(4.7, -74.1, 'A');
    vm.addWaypoint(4.8, -74.2, 'B');
    vm.addWaypoint(4.9, -74.3, 'End');

    const items = vm.timelineItems;
    // start: no es intermedio
    expect(items[0].canMoveUp).toBe(false);
    expect(items[0].canMoveDown).toBe(false);
    // A (primer intermedio): no puede subir mas (esta justo bajo el start)
    expect(items[1].canMoveUp).toBe(false);
    expect(items[1].canMoveDown).toBe(true);
    // B (ultimo intermedio): no puede bajar mas (esta justo sobre destino)
    expect(items[2].canMoveUp).toBe(true);
    expect(items[2].canMoveDown).toBe(false);
    // destination
    expect(items[3].canMoveUp).toBe(false);
    expect(items[3].canMoveDown).toBe(false);
  });

  it('save sheet open/close + persiste notes en submit', async () => {
    const { vm, create } = build();
    await vm.initialize();
    vm.addWaypoint(4.6, -74.08, 'Start');
    vm.addWaypoint(4.8, -74.2, 'End');
    await vm.calculateDirections();

    expect(vm.isSaveSheetOpen).toBe(false);
    vm.openSaveSheet();
    expect(vm.isSaveSheetOpen).toBe(true);

    vm.setName('Test ruta');
    vm.setNotes('Salida temprano');
    const ok = await vm.submit();
    expect(ok).toBe(true);

    const routePassed = create.run.mock.calls[0][0];
    expect(routePassed.name).toBe('Test ruta');
    expect(routePassed.notes).toBe('Salida temprano');

    vm.closeSaveSheet();
    expect(vm.isSaveSheetOpen).toBe(false);
  });

  it('isReadOnly true cuando hay party activa de otra ruta', async () => {
    const { vm, partyStore } = build();
    await vm.initialize();
    // Sin party activa: isReadOnly = false.
    expect(vm.isReadOnly).toBe(false);

    // Simular party activa con un OWNER distinto al rider actual + routeId
    // que matchea con editingId. Como riderId = 'rider-1' (de makeRider),
    // el party con ownerId 'other-rider' deberia hacer isReadOnly = true.
    const party = new (require('@/domain/entities/TripParty').TripParty)({
      id: 'p-1',
      routeId: 'route-1',
      ownerId: 'other-rider',
      members: [],
      createdAt: new Date(),
    });
    // Forzar editingId a 'route-1' (lo que normalmente se setea via hydrateFrom)
    (vm as any).editingId = 'route-1';
    // Bypass observer y setear directamente.
    partyStore.activeParty = party;

    expect(vm.isReadOnly).toBe(true);
  });

  it('addWaypoint usa kind=other por default (no food)', async () => {
    const { vm } = build();
    await vm.initialize();
    vm.addWaypoint(4.6, -74.08, 'A');
    vm.addWaypoint(4.7, -74.1, 'B'); // intermediate
    vm.addWaypoint(4.8, -74.2, 'C');
    // start y destination quedan posicionales, pero el intermedio default
    // debe ser 'other' (no 'food' que etiquetaria como comida).
    expect(vm.waypoints[1].kind).toBe('other');
  });

  it('removeStop borra cualquier waypoint y reasigna start/destination', async () => {
    const { vm } = build();
    await vm.initialize();
    vm.addWaypoint(4.6, -74.08, 'A');
    vm.addWaypoint(4.7, -74.1, 'B');
    vm.addWaypoint(4.8, -74.2, 'C');

    const startId = vm.waypoints[0].id;
    const intermediateId = vm.waypoints[1].id;

    // Borrar el start: el waypoint vecino se convierte en nuevo start.
    vm.removeStop(startId);
    expect(vm.waypoints).toHaveLength(2);
    expect(vm.waypoints.find((w) => w.id === startId)).toBeUndefined();
    expect(vm.waypoints[0].kind).toBe('start');
    expect(vm.waypoints[1].kind).toBe('destination');

    // Tras el primer borrado, lo que era el intermedio ahora es start.
    // Volverlo a borrar deja una sola parada (sin start ni dest definidos).
    vm.removeStop(intermediateId);
    expect(vm.waypoints).toHaveLength(1);
  });

  it('addWaypointWithKind inserta antes del destination y marca override', async () => {
    const { vm } = build();
    await vm.initialize();
    vm.addWaypoint(4.6, -74.08, 'Start');
    vm.addWaypoint(4.8, -74.2, 'End'); // start + destination ya existen
    vm.addWaypointWithKind({
      latitude: 4.65,
      longitude: -74.09,
      name: 'Estacion Terpel',
      kind: 'fuel',
      mapboxCategory: 'gas_station',
    });

    // El intermedio quedo en posicion 1 (entre start y destination).
    expect(vm.waypoints).toHaveLength(3);
    expect(vm.waypoints[0].kind).toBe('start');
    expect(vm.waypoints[2].kind).toBe('destination');

    const intermediate = vm.waypoints[1];
    expect(intermediate.kind).toBe('fuel');
    expect(intermediate.userOverrideKind).toBe(true);
    expect(intermediate.mapboxCategory).toBe('gas_station');
  });

  it('startEditingWaypoint marca el id y editingWaypoint apunta al target', async () => {
    const { vm } = build();
    await vm.initialize();
    vm.addWaypoint(4.6, -74.08, 'A');
    vm.addWaypoint(4.8, -74.2, 'B');

    const destId = vm.waypoints[1].id;
    vm.startEditingWaypoint(destId);

    expect(vm.isEditingWaypoint).toBe(true);
    expect(vm.editingWaypointId).toBe(destId);
    expect(vm.editingWaypoint?.id).toBe(destId);
  });

  it('cancelEditingWaypoint limpia el id sin tocar waypoints', async () => {
    const { vm } = build();
    await vm.initialize();
    vm.addWaypoint(4.6, -74.08, 'A');
    vm.addWaypoint(4.8, -74.2, 'B');

    vm.startEditingWaypoint(vm.waypoints[1].id);
    vm.cancelEditingWaypoint();

    expect(vm.isEditingWaypoint).toBe(false);
    expect(vm.editingWaypointId).toBeNull();
    expect(vm.waypoints).toHaveLength(2);
  });

  it('replaceEditingWaypoint cambia coords/nombre del destino conservando posicion', async () => {
    const { vm } = build();
    await vm.initialize();
    vm.addWaypoint(4.6, -74.08, 'Bogota');
    vm.addWaypoint(5.0, -74.0, 'Destino viejo');

    const destId = vm.waypoints[1].id;
    vm.startEditingWaypoint(destId);
    vm.replaceEditingWaypoint({
      latitude: 5.6325,
      longitude: -73.5253,
      name: 'Villa de Leyva',
      mapboxCategory: 'place',
    });

    // Mismo id + misma posicion, nuevos datos.
    expect(vm.waypoints[1].id).toBe(destId);
    expect(vm.waypoints[1].name).toBe('Villa de Leyva');
    expect(vm.waypoints[1].latitude).toBe(5.6325);
    expect(vm.waypoints[1].longitude).toBe(-73.5253);
    expect(vm.waypoints[1].kind).toBe('destination');
    // Edit limpiado tras confirmar.
    expect(vm.isEditingWaypoint).toBe(false);
    // Directions invalidadas — proximo calculo recalcula.
    expect(vm.directions).toBeNull();
  });

  it('replaceEditingWaypoint en un intermedio respeta el kind explicito', async () => {
    const { vm } = build();
    await vm.initialize();
    vm.addWaypoint(4.6, -74.08, 'Start');
    vm.addWaypoint(4.7, -74.1, 'Intermedio');
    vm.addWaypoint(4.8, -74.2, 'End');

    const interId = vm.waypoints[1].id;
    vm.startEditingWaypoint(interId);
    vm.replaceEditingWaypoint({
      latitude: 4.75,
      longitude: -74.15,
      name: 'Terpel La Caro',
      kind: 'fuel',
      mapboxCategory: 'gas_station',
    });

    const updated = vm.waypoints[1];
    expect(updated.id).toBe(interId);
    expect(updated.kind).toBe('fuel');
    expect(updated.name).toBe('Terpel La Caro');
    expect(updated.userOverrideKind).toBe(true);
  });

  it('replaceEditingWaypoint en el start fuerza kind=start aunque pasen otro', async () => {
    const { vm } = build();
    await vm.initialize();
    vm.addWaypoint(4.6, -74.08, 'Start viejo');
    vm.addWaypoint(4.8, -74.2, 'End');

    const startId = vm.waypoints[0].id;
    vm.startEditingWaypoint(startId);
    // Aunque pasemos kind 'fuel', la normalizacion lo fuerza a 'start' por
    // estar en posicion 0.
    vm.replaceEditingWaypoint({
      latitude: 4.65,
      longitude: -74.09,
      name: 'Start nuevo',
      kind: 'fuel',
    });

    expect(vm.waypoints[0].kind).toBe('start');
    expect(vm.waypoints[0].name).toBe('Start nuevo');
  });

  it('replaceEditingWaypoint sin edit activo es no-op', async () => {
    const { vm } = build();
    await vm.initialize();
    vm.addWaypoint(4.6, -74.08, 'A');
    vm.addWaypoint(4.8, -74.2, 'B');

    vm.replaceEditingWaypoint({
      latitude: 99,
      longitude: 99,
      name: 'NO DEBE APARECER',
    });

    expect(vm.waypoints[0].name).toBe('A');
    expect(vm.waypoints[1].name).toBe('B');
  });

  // ── Lote 1 flow brief: guard de salir + sheet "Ruta guardada" ─────────
  describe('exit guard + confirm discard (Lote 1)', () => {
    it('hasUnsavedChanges es false sin waypoints, true con al menos uno', async () => {
      const { vm } = build();
      await vm.initialize();
      expect(vm.hasUnsavedChanges).toBe(false);

      vm.addWaypoint(4.6, -74.08, 'A');
      expect(vm.hasUnsavedChanges).toBe(true);
    });

    it('requestExit sin cambios devuelve true sin abrir el sheet', async () => {
      const { vm } = build();
      await vm.initialize();
      expect(vm.requestExit()).toBe(true);
      expect(vm.isExitConfirmOpen).toBe(false);
    });

    it('requestExit con cambios devuelve false y abre el sheet', async () => {
      const { vm } = build();
      await vm.initialize();
      vm.addWaypoint(4.6, -74.08, 'A');
      vm.addWaypoint(4.8, -74.2, 'B');

      expect(vm.requestExit()).toBe(false);
      expect(vm.isExitConfirmOpen).toBe(true);
    });

    it('confirmDiscard limpia waypoints + name + notes + cierra el sheet', async () => {
      const { vm } = build();
      await vm.initialize();
      vm.addWaypoint(4.6, -74.08, 'A');
      vm.addWaypoint(4.8, -74.2, 'B');
      vm.setName('Mi ruta');
      vm.setNotes('Salida temprano');
      vm.requestExit(); // abre el sheet

      vm.confirmDiscard();

      expect(vm.waypoints).toEqual([]);
      expect(vm.directions).toBeNull();
      expect(vm.name).toBe('');
      expect(vm.notes).toBe('');
      expect(vm.isExitConfirmOpen).toBe(false);
    });

    it('cancelExit solo cierra el sheet sin tocar waypoints', async () => {
      const { vm } = build();
      await vm.initialize();
      vm.addWaypoint(4.6, -74.08, 'A');
      vm.requestExit();

      vm.cancelExit();

      expect(vm.isExitConfirmOpen).toBe(false);
      expect(vm.waypoints).toHaveLength(1);
    });
  });

  describe('submit success → sheet "Ruta guardada" (Lote 1)', () => {
    it('submit exitoso guarda savedRouteId y abre el sheet de confirmacion', async () => {
      const { vm, create } = build();
      // El mock de createRouteUseCase devuelve un Route con id 'route-1'
      // (definido en factories.makeRoute()).
      create.run.mockResolvedValueOnce({ ...makeRoute(), id: 'route-99' });
      await vm.initialize();
      vm.setName('Mi ruta');
      vm.addWaypoint(4.6, -74.08, 'A');
      vm.addWaypoint(4.8, -74.2, 'B');
      await vm.calculateDirections();

      const ok = await vm.submit();
      expect(ok).toBe(true);
      expect(vm.savedRouteId).toBe('route-99');
      expect(vm.isSavedSheetOpen).toBe(true);
      // Bonus: el sheet "Guardar ruta" se cierra automaticamente.
      expect(vm.isSaveSheetOpen).toBe(false);
    });

    it('closeSavedSheet apaga el flag', async () => {
      const { vm, create } = build();
      create.run.mockResolvedValueOnce({ ...makeRoute(), id: 'route-99' });
      await vm.initialize();
      vm.setName('Mi ruta');
      vm.addWaypoint(4.6, -74.08, 'A');
      vm.addWaypoint(4.8, -74.2, 'B');
      await vm.calculateDirections();
      await vm.submit();

      vm.closeSavedSheet();
      expect(vm.isSavedSheetOpen).toBe(false);
      // El id persiste por si el rider abre Ver detalle despues.
      expect(vm.savedRouteId).toBe('route-99');
    });
  });

  // ── Lote 2 flow brief: estados ricos del Planner ──────────────────────
  describe('hasMotorcycleRegistered + loadMotorcycles (Lote 2)', () => {
    it('default seguro: hasMotorcycleRegistered=true mientras motorcycles=null', () => {
      const { vm } = build();
      // No llamamos initialize — motorcycles sigue en null.
      expect(vm.motorcycles).toBeNull();
      // Devuelve true para no mostrar el notice prematuramente (parpadeo).
      expect(vm.hasMotorcycleRegistered).toBe(true);
    });

    it('initialize carga motos vacias → hasMotorcycleRegistered=false', async () => {
      const { vm, getAllMotorcycles } = build();
      await vm.initialize();
      // Espera al microtask para que loadMotorcycles termine.
      await Promise.resolve();
      await Promise.resolve();
      expect(getAllMotorcycles.run).toHaveBeenCalled();
      expect(vm.motorcycles).toEqual([]);
      expect(vm.hasMotorcycleRegistered).toBe(false);
    });

    it('rider con moto registrada → hasMotorcycleRegistered=true', async () => {
      const { vm, getAllMotorcycles } = build();
      getAllMotorcycles.run.mockResolvedValueOnce([makeMotorcycle()] as never);
      await vm.initialize();
      await Promise.resolve();
      await Promise.resolve();
      expect(vm.hasMotorcycleRegistered).toBe(true);
    });

    it('error cargando motos no rompe el flow + queda en null', async () => {
      const { vm, getAllMotorcycles } = build();
      getAllMotorcycles.run.mockRejectedValueOnce(new Error('boom'));
      await vm.initialize();
      await Promise.resolve();
      await Promise.resolve();
      expect(vm.motorcycles).toBeNull();
      // Default seguro: no muestra el aviso si no podemos confirmar.
      expect(vm.hasMotorcycleRegistered).toBe(true);
    });
  });

  describe('initializeWithDestination + needsStartPoint (Lote 3b A2)', () => {
    it('default needsStartPoint=false sin waypoints', async () => {
      const { vm } = build();
      await vm.initialize();
      expect(vm.needsStartPoint).toBe(false);
    });

    it('initializeWithDestination crea 1 waypoint kind=destination', async () => {
      const { vm } = build();
      await vm.initialize();
      vm.initializeWithDestination({
        latitude: 5.0,
        longitude: -73.5,
        name: 'Valle de Bravo',
        mapboxCategory: 'place',
      });
      expect(vm.waypoints).toHaveLength(1);
      expect(vm.waypoints[0].kind).toBe('destination');
      expect(vm.waypoints[0].name).toBe('Valle de Bravo');
      expect(vm.needsStartPoint).toBe(true);
    });

    it('normalize NO convierte el destino solo a start', async () => {
      const { vm } = build();
      await vm.initialize();
      vm.initializeWithDestination({
        latitude: 5.0,
        longitude: -73.5,
        name: 'Valle de Bravo',
      });
      // Bug que estaba antes: normalize forzaba kind=start por estar en pos 0.
      expect(vm.waypoints[0].kind).toBe('destination');
    });

    it('useCurrentLocationAsStart conserva el destino existente', async () => {
      const { vm } = build();
      await vm.initialize();
      vm.initializeWithDestination({
        latitude: 5.0,
        longitude: -73.5,
        name: 'Valle de Bravo',
      });
      // Mock del location store: el rider tiene location.
      (vm as any).locationStore.isLocationResponse = {
        latitude: 4.6,
        longitude: -74.08,
      };
      vm.useCurrentLocationAsStart();

      expect(vm.waypoints).toHaveLength(2);
      expect(vm.waypoints[0].kind).toBe('start');
      expect(vm.waypoints[0].name).toBe('Mi ubicacion');
      expect(vm.waypoints[1].kind).toBe('destination');
      expect(vm.waypoints[1].name).toBe('Valle de Bravo');
      expect(vm.needsStartPoint).toBe(false);
    });
  });

  describe('draft persistence (Lote 3c E3)', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    const flushDraftDebounce = async () => {
      jest.advanceTimersByTime(850);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    };

    it('agregar waypoints dispara saveDraft (debounced)', async () => {
      const { vm, saveDraft } = build();
      await vm.initialize();
      vm.addWaypoint(4.6, -74.08, 'A');
      vm.addWaypoint(4.8, -74.2, 'B');

      expect(saveDraft.run).not.toHaveBeenCalled();
      await flushDraftDebounce();
      expect(saveDraft.run).toHaveBeenCalled();

      const draft = saveDraft.run.mock.calls[0][0];
      expect(draft.waypoints).toHaveLength(2);
      expect(draft.riderId).toBeTruthy();
    });

    it('confirmDiscard limpia el draft', async () => {
      const { vm, clearDraft } = build();
      await vm.initialize();
      vm.addWaypoint(4.6, -74.08, 'A');
      vm.addWaypoint(4.8, -74.2, 'B');
      vm.requestExit();

      vm.confirmDiscard();
      // El clear se llama async; le damos un microtask.
      await Promise.resolve();
      await Promise.resolve();
      expect(clearDraft.run).toHaveBeenCalled();
    });

    it('submit exitoso limpia el draft', async () => {
      const { vm, create, clearDraft } = build();
      create.run.mockResolvedValueOnce({ ...makeRoute(), id: 'route-99' });
      await vm.initialize();
      vm.setName('Mi ruta');
      vm.addWaypoint(4.6, -74.08, 'A');
      vm.addWaypoint(4.8, -74.2, 'B');
      await vm.calculateDirections();
      await vm.submit();
      await Promise.resolve();
      await Promise.resolve();
      expect(clearDraft.run).toHaveBeenCalled();
    });

    it('initializeFromDraft hidrata waypoints + name + notes', async () => {
      const { vm } = build();
      await vm.initialize();
      const draft = {
        id: 'rider-1',
        riderId: 'rider-1',
        name: 'Mi viaje',
        notes: 'Salida temprano',
        rideType: 'highway' as const,
        waypoints: [
          {
            id: 'wp-1',
            name: 'Start',
            latitude: 4.6,
            longitude: -74.08,
            kind: 'start' as const,
            order: 0,
          } as any,
          {
            id: 'wp-2',
            name: 'Dest',
            latitude: 4.8,
            longitude: -74.2,
            kind: 'destination' as const,
            order: 1,
          } as any,
        ],
        updatedAt: new Date(),
      };
      vm.initializeFromDraft(draft as any);

      expect(vm.waypoints).toHaveLength(2);
      expect(vm.name).toBe('Mi viaje');
      expect(vm.notes).toBe('Salida temprano');
      expect(vm.waypoints[0].name).toBe('Start');
      expect(vm.waypoints[1].name).toBe('Dest');
    });
  });

  describe('dismissDirectionsError (Lote 2)', () => {
    it('limpia isDirectionsError tras error de calcula', async () => {
      const { vm, calculate } = build();
      calculate.run.mockRejectedValueOnce(new Error('No hay vias cercanas'));
      await vm.initialize();
      vm.addWaypoint(4.6, -74.08, 'A');
      vm.addWaypoint(4.8, -74.2, 'B');
      await vm.calculateDirections();

      expect(vm.isDirectionsError).toContain('No hay vias cercanas');
      vm.dismissDirectionsError();
      expect(vm.isDirectionsError).toBeNull();
    });
  });

  describe('search flow', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('setSearchQuery dispara la busqueda con debounce', async () => {
      const { vm, searchPlaces } = build({
        searchResults: [
          new Place({
            id: 'p1',
            name: 'Villa de Leyva',
            fullName: 'Villa de Leyva, Boyaca, CO',
            latitude: 5.6325,
            longitude: -73.5253,
            placeType: 'place',
          }),
        ],
      });
      await vm.initialize();

      vm.setSearchQuery('Villa');
      // antes del debounce no se llamo aun
      expect(searchPlaces.run).not.toHaveBeenCalled();

      await flushDebounce();
      expect(searchPlaces.run).toHaveBeenCalledWith({
        query: 'Villa',
        proximity: undefined,
      });
      expect(vm.searchResults).toHaveLength(1);
      expect(vm.searchResults?.[0].name).toBe('Villa de Leyva');
      vm.dispose();
    });

    it('runSearch ignora queries menores a MIN_PLACE_QUERY_LENGTH', async () => {
      const { vm, searchPlaces } = build();
      await vm.initialize();
      vm.setSearchQuery('Vi'); // 2 chars
      await flushDebounce();
      expect(searchPlaces.run).not.toHaveBeenCalled();
      expect(vm.searchResults).toBeNull();
      vm.dispose();
    });

    it('selectSearchResult agrega waypoint con StopKind inferido y override', async () => {
      const { vm } = build();
      await vm.initialize();
      // Start + destination ya existen para que el resultado sea intermedio.
      vm.addWaypoint(4.6, -74.08, 'Bogota');
      vm.addWaypoint(5.6, -73.5, 'Villa de Leyva');

      const gasStation = new Place({
        id: 'p2',
        name: 'Estacion Terpel',
        fullName: 'Estacion Terpel, Tunja',
        latitude: 5.5,
        longitude: -73.4,
        placeType: 'poi',
        category: 'gas_station',
      });
      vm.selectSearchResult(gasStation);

      const intermediate = vm.waypoints[1];
      expect(intermediate.name).toBe('Estacion Terpel');
      expect(intermediate.kind).toBe('fuel');
      expect(intermediate.userOverrideKind).toBe(true);
      expect(intermediate.mapboxCategory).toBe('gas_station');
      // El search se limpia luego de elegir.
      expect(vm.searchQuery).toBe('');
      expect(vm.searchResults).toBeNull();
      vm.dispose();
    });

    it('selectSearchResult cae a kind=other si Mapbox no devuelve categoria util', async () => {
      const { vm } = build();
      await vm.initialize();
      vm.addWaypoint(4.6, -74.08, 'Bogota');
      vm.addWaypoint(5.6, -73.5, 'Villa de Leyva');

      const ambiguous = new Place({
        id: 'p3',
        name: 'Lugar X',
        fullName: 'Lugar X, CO',
        latitude: 5.5,
        longitude: -73.4,
        placeType: 'address',
        // sin category, sin placeType=poi -> InferStopKind devuelve null
      });
      vm.selectSearchResult(ambiguous);
      expect(vm.waypoints[1].kind).toBe('other');
      vm.dispose();
    });

    it('clearSearch resetea estado del buscador', async () => {
      const { vm } = build({
        searchResults: [
          new Place({
            id: 'p1',
            name: 'X',
            fullName: 'X',
            latitude: 0,
            longitude: 0,
          }),
        ],
      });
      await vm.initialize();
      vm.setSearchQuery('Villa');
      await flushDebounce();
      expect(vm.searchResults).not.toBeNull();

      vm.clearSearch();
      expect(vm.searchQuery).toBe('');
      expect(vm.searchResults).toBeNull();
      expect(vm.isSearchError).toBeNull();
      expect(vm.isSearchLoading).toBe(false);
      vm.dispose();
    });
  });

  describe('category search flow', () => {
    it('searchByCategory activa la categoria y guarda resultados', async () => {
      const place = new Place({
        id: 'gas-1',
        name: 'Terpel Norte',
        fullName: 'Terpel Norte, Bogota',
        latitude: 4.65,
        longitude: -74.05,
        category: 'gas_station',
      });
      const { vm, searchPlacesByCategory } = build({
        categoryResults: [place],
      });
      await vm.initialize();
      vm.addWaypoint(4.6, -74.08, 'Bogota');
      vm.addWaypoint(5.6, -73.5, 'Villa de Leyva');

      await vm.searchByCategory('fuel');
      expect(searchPlacesByCategory.run).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'fuel' }),
      );
      expect(vm.activeCategory).toBe('fuel');
      expect(vm.categoryResults).toHaveLength(1);
      expect(vm.categoryResults?.[0].name).toBe('Terpel Norte');
      vm.dispose();
    });

    it('searchByCategory toggle: re-tap a la misma categoria la apaga', async () => {
      const { vm } = build({ categoryResults: [] });
      await vm.initialize();
      vm.addWaypoint(4.6, -74.08, 'A');
      vm.addWaypoint(4.8, -74.2, 'B');

      await vm.searchByCategory('food');
      expect(vm.activeCategory).toBe('food');
      await vm.searchByCategory('food');
      expect(vm.activeCategory).toBeNull();
      expect(vm.categoryResults).toBeNull();
      vm.dispose();
    });

    it('searchByCategory limpia el text search activo', async () => {
      const { vm } = build({ categoryResults: [] });
      await vm.initialize();
      vm.addWaypoint(4.6, -74.08, 'A');
      vm.addWaypoint(4.8, -74.2, 'B');

      vm.setSearchQuery('estacion'); // text search activo
      await vm.searchByCategory('fuel');
      expect(vm.searchQuery).toBe('');
      expect(vm.searchResults).toBeNull();
      vm.dispose();
    });

    it('selectCategoryResult agrega waypoint con el kind del chip activo', async () => {
      const place = new Place({
        id: 'tour-1',
        name: 'Catedral de Sal',
        fullName: 'Catedral de Sal, Zipaquira',
        latitude: 5.02,
        longitude: -74.0,
        category: 'place_of_worship', // categoria que NO mapearia a 'tourism'
      });
      const { vm } = build({ categoryResults: [place] });
      await vm.initialize();
      vm.addWaypoint(4.6, -74.08, 'Bogota');
      vm.addWaypoint(5.6, -73.5, 'Villa de Leyva');

      await vm.searchByCategory('tourism');
      vm.selectCategoryResult(place);

      const intermediate = vm.waypoints[1];
      expect(intermediate.name).toBe('Catedral de Sal');
      // El kind viene del chip activo, NO de inferencia de categoria.
      expect(intermediate.kind).toBe('tourism');
      expect(intermediate.userOverrideKind).toBe(true);
      // El filtro se cierra despues de elegir.
      expect(vm.activeCategory).toBeNull();
      vm.dispose();
    });

    it('selectCategoryResult sin activeCategory es no-op (defensa)', async () => {
      const place = new Place({
        id: 'p1',
        name: 'X',
        fullName: 'X',
        latitude: 0,
        longitude: 0,
      });
      const { vm } = build();
      await vm.initialize();
      vm.selectCategoryResult(place);
      expect(vm.waypoints).toHaveLength(0);
      vm.dispose();
    });

    it('searchByCategory sin waypoints devuelve [] sin llamar al use case', async () => {
      const { vm, searchPlacesByCategory } = build({ categoryResults: [] });
      await vm.initialize();
      // sin waypoints, alongRoute esta vacio -> no llamada
      await vm.searchByCategory('rest');
      expect(searchPlacesByCategory.run).not.toHaveBeenCalled();
      expect(vm.categoryResults).toEqual([]);
      vm.dispose();
    });
  });

  it('timelineItems devuelve metadata ordenada con flags posicionales', async () => {
    const { vm } = build();
    await vm.initialize();
    vm.addWaypoint(4.6, -74.08, 'Bogota');
    vm.addWaypoint(4.8, -74.2, 'Villa de Leyva');
    vm.addWaypointWithKind({
      latitude: 4.65,
      longitude: -74.09,
      name: 'La Calera',
      kind: 'food',
      mapboxCategory: 'restaurant',
    });

    const items = vm.timelineItems;
    expect(items).toHaveLength(3);
    expect(items[0].isFirst).toBe(true);
    expect(items[0].isLast).toBe(false);
    expect(items[0].isIntermediate).toBe(false);
    expect(items[0].kind).toBe('start');

    expect(items[1].isIntermediate).toBe(true);
    expect(items[1].kind).toBe('food');
    expect(items[1].sub).toBe('restaurant'); // mapboxCategory prioritized

    expect(items[2].isLast).toBe(true);
    expect(items[2].kind).toBe('destination');
    // sub cae a coord cuando no hay mapboxCategory
    expect(items[2].sub).toMatch(/^\d+\.\d+, -?\d+\.\d+$/);
  });

  describe('route options: avoid / alternatives / optimize / reverse / round-trip (F5)', () => {
    beforeEach(() => jest.useFakeTimers());

    const flush800 = async () => {
      jest.advanceTimersByTime(850);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    };

    it('setAvoidTolls dispara auto-recalc pasando avoid al use case', async () => {
      const { vm, calculate } = build();
      await vm.initialize();
      vm.addWaypoint(4.6, -74.08);
      vm.addWaypoint(4.8, -74.2);
      await vm.calculateDirections();
      calculate.run.mockClear();

      vm.setAvoidTolls(true);
      expect(vm.avoid.tolls).toBe(true);
      await flush800();

      expect(calculate.run).toHaveBeenCalled();
      const lastArg =
        calculate.run.mock.calls[calculate.run.mock.calls.length - 1][0];
      expect(lastArg.avoid.tolls).toBe(true);
    });

    it('selectAlternative cambia activeDirections sin recalcular', async () => {
      const { vm, calculate } = build();
      const alt = new RouteDirections({
        distanceKm: 150,
        durationMin: 70,
        geometry: [{ latitude: 5, longitude: -73 }],
      });
      const main = new RouteDirections({
        distanceKm: 100,
        durationMin: 90,
        geometry: [{ latitude: 4, longitude: -74 }],
        alternatives: [alt],
      });
      calculate.run.mockResolvedValue(main);
      await vm.initialize();
      vm.addWaypoint(4.6, -74.08);
      vm.addWaypoint(4.8, -74.2);
      await vm.calculateDirections();

      expect(vm.availableAlternatives).toHaveLength(2);
      expect(vm.distanceKm).toBe(100);
      calculate.run.mockClear();

      vm.selectAlternative(1);
      expect(vm.distanceKm).toBe(150);
      expect(calculate.run).not.toHaveBeenCalled();

      // Índice fuera de rango: no-op (se queda en la alternativa actual).
      vm.selectAlternative(9);
      expect(vm.distanceKm).toBe(150);
    });

    it('optimizeOrder con menos de 3 waypoints es no-op', async () => {
      const { vm, optimize } = build();
      await vm.initialize();
      vm.addWaypoint(4.6, -74.08);
      vm.addWaypoint(4.8, -74.2);
      expect(vm.canOptimize).toBe(false);
      await vm.optimizeOrder();
      expect(optimize.run).not.toHaveBeenCalled();
    });

    it('optimizeOrder reordena conservando metadata del waypoint', async () => {
      const { vm, optimize } = build();
      await vm.initialize();
      vm.addWaypoint(4.6, -74.08, 'A');
      vm.addWaypoint(4.7, -74.1, 'B');
      vm.addWaypoint(4.75, -74.15, 'C');
      vm.addWaypoint(4.8, -74.2, 'D');
      const ids = vm.waypoints.map((w) => w.id);
      vm.setStopKind(ids[1], 'food'); // B = food
      // Orden óptimo: intercambia B y C → [A, C, B, D].
      const reordered = [ids[0], ids[2], ids[1], ids[3]];
      optimize.run.mockResolvedValue({
        waypointIds: reordered,
        directions: new RouteDirections({
          distanceKm: 50,
          durationMin: 40,
          geometry: [],
        }),
      });

      expect(vm.canOptimize).toBe(true);
      await vm.optimizeOrder();

      expect(optimize.run).toHaveBeenCalled();
      expect(vm.waypoints.map((w) => w.id)).toEqual(reordered);
      // Metadata preservada: B sigue siendo 'food' tras re-permutar.
      expect(vm.waypoints.find((w) => w.id === ids[1])?.kind).toBe('food');
      expect(vm.distanceKm).toBe(50);
    });

    it('reverseRoute invierte y recategoriza start/destination', async () => {
      const { vm } = build();
      await vm.initialize();
      vm.addWaypoint(4.6, -74.08, 'A');
      vm.addWaypoint(4.7, -74.1, 'B');
      vm.addWaypoint(4.8, -74.2, 'D');
      const before = vm.waypoints.map((w) => w.id);

      vm.reverseRoute();

      expect(vm.waypoints.map((w) => w.id)).toEqual([
        before[2],
        before[1],
        before[0],
      ]);
      expect(vm.waypoints[0].kind).toBe('start');
      expect(vm.waypoints[2].kind).toBe('destination');
    });

    it('toggleRoundTrip agrega y quita el clon de retorno', async () => {
      const { vm } = build();
      await vm.initialize();
      vm.addWaypoint(4.6, -74.08, 'A');
      vm.addWaypoint(4.8, -74.2, 'D');
      expect(vm.waypoints).toHaveLength(2);

      vm.toggleRoundTrip();
      expect(vm.isRoundTrip).toBe(true);
      expect(vm.waypoints).toHaveLength(3);
      expect(vm.waypoints[1].kind).toBe('other'); // ex-destino degradado
      expect(vm.waypoints[2].kind).toBe('destination');
      expect(vm.waypoints[2].isReturnClone).toBe(true);

      vm.toggleRoundTrip();
      expect(vm.isRoundTrip).toBe(false);
      expect(vm.waypoints).toHaveLength(2);
      expect(vm.waypoints[1].kind).toBe('destination');
    });
  });

  describe('waypoint notes + stopDuration + ETA real (F6)', () => {
    beforeEach(() => jest.useFakeTimers());

    const flush800 = async () => {
      jest.advanceTimersByTime(850);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    };

    const planFour = async (vm: any) => {
      await vm.initialize();
      vm.addWaypoint(4.6, -74.08, 'A');
      vm.addWaypoint(4.7, -74.1, 'B');
      vm.addWaypoint(4.75, -74.15, 'C');
      vm.addWaypoint(4.8, -74.2, 'D');
    };

    it('setWaypointNotes actualiza la nota sin invalidar ni recalcular directions', async () => {
      const { vm, calculate } = build();
      await planFour(vm);
      // Drena el auto-recalc pendiente (debounced) de los addWaypoint para que
      // no contamine la aserción de "no recalc" tras cambiar la nota.
      await flush800();
      const bId = vm.waypoints[1].id;
      expect(vm.directions).not.toBeNull();
      calculate.run.mockClear();

      vm.setWaypointNotes(bId, 'tanquear y almorzar');

      expect(vm.waypoints[1].notes).toBe('tanquear y almorzar');
      expect(vm.directions).not.toBeNull();
      await flush800();
      expect(calculate.run).not.toHaveBeenCalled();
    });

    it('setWaypointStopDuration setea y limpia la duración', async () => {
      const { vm } = build();
      await planFour(vm);
      const bId = vm.waypoints[1].id;
      vm.setWaypointStopDuration(bId, 30);
      expect(vm.waypoints[1].stopDurationMin).toBe(30);
      vm.setWaypointStopDuration(bId, 0);
      expect(vm.waypoints[1].stopDurationMin).toBeUndefined();
    });

    it('totalStopDurationMin y etaWithStopsMin suman solo intermedios', async () => {
      const { vm } = build();
      await planFour(vm);
      await vm.calculateDirections(); // mock: durationMin = 90
      const ids = vm.waypoints.map((w: any) => w.id);
      vm.setWaypointStopDuration(ids[1], 30); // B intermedio
      vm.setWaypointStopDuration(ids[2], 15); // C intermedio
      expect(vm.totalStopDurationMin).toBe(45);
      expect(vm.etaWithStopsMin).toBe(135);
    });

    it('timelineItems exponen notes y stopDurationMin', async () => {
      const { vm } = build();
      await planFour(vm);
      const bId = vm.waypoints[1].id;
      vm.setWaypointNotes(bId, 'café');
      vm.setWaypointStopDuration(bId, 20);
      const item = vm.timelineItems.find((i: any) => i.id === bId);
      expect(item?.notes).toBe('café');
      expect(item?.stopDurationMin).toBe(20);
    });

    it('preserva notes/duración al reordenar (moveStop)', async () => {
      const { vm } = build();
      await planFour(vm);
      const bId = vm.waypoints[1].id;
      vm.setWaypointNotes(bId, 'parada B');
      vm.setWaypointStopDuration(bId, 25);
      vm.moveStop(bId, 'down');
      const b = vm.waypoints.find((w: any) => w.id === bId);
      expect(b?.notes).toBe('parada B');
      expect(b?.stopDurationMin).toBe(25);
    });
  });

  describe('insights: autonomy/elevation/fuel reaction (F7)', () => {
    beforeEach(() => jest.useFakeTimers());

    // Insights usa 600ms; avanzamos 700 (sin llegar a los 800 del auto-recalc,
    // que no debe contaminar) y drenamos microtasks de la cadena del store.
    const flushInsights = async () => {
      jest.advanceTimersByTime(700);
      for (let i = 0; i < 6; i++) await Promise.resolve();
    };

    it('recomputes insights tras calcular directions (con moto)', async () => {
      const { vm, getAllMotorcycles, insightsElevation, insightsAutonomy } =
        build();
      getAllMotorcycles.run.mockResolvedValue([makeMotorcycle()]);
      await vm.initialize();
      vm.addWaypoint(4.6, -74.08);
      vm.addWaypoint(4.8, -74.2);
      await vm.calculateDirections();
      await flushInsights();

      expect(insightsElevation.run).toHaveBeenCalled();
      expect(insightsAutonomy.run).toHaveBeenCalled();
      expect(vm.insights.autonomyEstimate).not.toBeNull();
    });

    it('togglear una condición recomputa los insights', async () => {
      const { vm, getAllMotorcycles, insightsAutonomy } = build();
      getAllMotorcycles.run.mockResolvedValue([makeMotorcycle()]);
      await vm.initialize();
      vm.addWaypoint(4.6, -74.08);
      vm.addWaypoint(4.8, -74.2);
      await vm.calculateDirections();
      await flushInsights();
      insightsAutonomy.run.mockClear();

      vm.insights.togglePassenger(true);
      await flushInsights();

      expect(insightsAutonomy.run).toHaveBeenCalled();
    });

    it('sin moto registrada no recomputa (limpia estimados)', async () => {
      // build() por defecto: getAllMotorcycles → [] (rider sin motos).
      const { vm, insightsElevation } = build();
      await vm.initialize();
      vm.addWaypoint(4.6, -74.08);
      vm.addWaypoint(4.8, -74.2);
      await vm.calculateDirections();
      await flushInsights();

      expect(insightsElevation.run).not.toHaveBeenCalled();
      expect(vm.insights.autonomyEstimate).toBeNull();
    });

    it('reset limpia los insights', async () => {
      const { vm, getAllMotorcycles } = build();
      getAllMotorcycles.run.mockResolvedValue([makeMotorcycle()]);
      await vm.initialize();
      vm.addWaypoint(4.6, -74.08);
      vm.addWaypoint(4.8, -74.2);
      await vm.calculateDirections();
      await flushInsights();
      expect(vm.insights.autonomyEstimate).not.toBeNull();

      vm.reset();
      expect(vm.insights.autonomyEstimate).toBeNull();
    });
  });

  describe('templates + duplicate + multi-día (F8)', () => {
    beforeEach(() => jest.useFakeTimers());

    it('applyTemplate aplica rideType/avoid/duración y round-trip', async () => {
      const { vm } = build();
      await vm.initialize();
      await vm.templates.loadTemplates();
      vm.addWaypoint(4.6, -74.08, 'A');
      vm.addWaypoint(4.7, -74.1, 'B');
      vm.addWaypoint(4.8, -74.2, 'D');

      vm.applyTemplate('dominical');

      expect(vm.rideType).toBe('group');
      expect(vm.avoid.highways).toBe(true);
      // round-trip activado (≥2 waypoints) → clon de retorno agregado.
      expect(vm.isRoundTrip).toBe(true);
      expect(vm.waypoints.some((w) => w.isReturnClone)).toBe(true);
      // duración sugerida aplicada al intermedio sin duración previa.
      expect(vm.waypoints.find((w) => w.name === 'B')?.stopDurationMin).toBe(
        30,
      );
      expect(vm.templates.isTemplateSheetOpen).toBe(false);
    });

    it('applyTemplate es no-op si el id no existe', async () => {
      const { vm } = build();
      await vm.initialize();
      await vm.templates.loadTemplates();
      vm.applyTemplate('inexistente');
      expect(vm.rideType).toBe('highway'); // default sin cambios
    });

    it('duplicateRoute hidrata con ids nuevos, "(copia)" y metadata', async () => {
      const { vm } = build();
      await vm.initialize();
      vm.duplicateRoute({
        name: 'Ruta Test',
        rideType: 'offroad',
        waypoints: [
          {
            name: 'A',
            latitude: 4.6,
            longitude: -74.08,
            kind: 'start',
            order: 0,
          },
          {
            name: 'B',
            latitude: 4.7,
            longitude: -74.1,
            kind: 'food',
            order: 1,
            notes: 'almuerzo',
            stopDurationMin: 25,
          },
          {
            name: 'D',
            latitude: 4.8,
            longitude: -74.2,
            kind: 'destination',
            order: 2,
          },
        ],
        avoid: { tolls: true, highways: false, ferries: false, unpaved: false },
        roundTrip: false,
      });

      expect(vm.name).toBe('Ruta Test (copia)');
      expect(vm.rideType).toBe('offroad');
      expect(vm.avoid.tolls).toBe(true);
      expect(vm.waypoints).toHaveLength(3);
      expect(vm.waypoints.every((w) => w.id.startsWith('wp-'))).toBe(true);
      const b = vm.waypoints.find((w) => w.name === 'B');
      expect(b?.notes).toBe('almuerzo');
      expect(b?.stopDurationMin).toBe(25);
    });

    it('toggleMultiDay activa y desactiva la segmentación', async () => {
      const { vm } = build();
      await vm.initialize();
      for (let i = 0; i < 6; i++) vm.addWaypoint(4.6 + i * 0.1, -74 + i * 0.1);

      vm.toggleMultiDay();
      expect(vm.isMultiDay).toBe(true);
      expect(vm.days).toHaveLength(1);
      expect([vm.days![0].startIdx, vm.days![0].endIdx]).toEqual([0, 5]);

      vm.toggleMultiDay();
      expect(vm.isMultiDay).toBe(false);
      expect(vm.days).toBeNull();
    });

    it('markEndOfDay / unmarkEndOfDay / setOvernightName segmentan como se espera', async () => {
      const { vm } = build();
      await vm.initialize();
      for (let i = 0; i < 6; i++) vm.addWaypoint(4.6 + i * 0.1, -74 + i * 0.1);
      vm.toggleMultiDay();

      vm.markEndOfDay(2);
      expect(vm.days!.map((d) => [d.startIdx, d.endIdx])).toEqual([
        [0, 2],
        [3, 5],
      ]);

      vm.markEndOfDay(4);
      expect(vm.days!.map((d) => [d.startIdx, d.endIdx])).toEqual([
        [0, 2],
        [3, 4],
        [5, 5],
      ]);

      vm.unmarkEndOfDay(0); // quita el corte que cierra el día 0 (boundary 2)
      expect(vm.days!.map((d) => [d.startIdx, d.endIdx])).toEqual([
        [0, 4],
        [5, 5],
      ]);

      vm.setOvernightName(0, 'Villa de Leyva');
      expect(vm.days![0].overnightName).toBe('Villa de Leyva');
    });

    it('resincroniza la segmentación multi-día al cambiar los waypoints', async () => {
      const { vm } = build();
      await vm.initialize();
      for (let i = 0; i < 6; i++) vm.addWaypoint(4.6 + i * 0.1, -74 + i * 0.1);
      vm.toggleMultiDay();
      vm.markEndOfDay(4); // boundaries [4] → días [0..4],[5..5]
      expect(vm.days!.map((d) => [d.startIdx, d.endIdx])).toEqual([
        [0, 4],
        [5, 5],
      ]);

      // Quita un waypoint → 5 wp (lastIdx 4); el boundary 4 cae fuera de rango
      // y se descarta. Multi-día sigue activo, sin índices stale.
      vm.removeStop(vm.waypoints[2].id);

      expect(vm.days).not.toBeNull();
      expect(vm.waypoints).toHaveLength(5);
      expect(vm.days!.map((d) => [d.startIdx, d.endIdx])).toEqual([[0, 4]]);
    });

    it('apaga multi-día si los waypoints bajan de 2', async () => {
      const { vm } = build();
      await vm.initialize();
      vm.addWaypoint(4.6, -74.08, 'A');
      vm.addWaypoint(4.7, -74.1, 'B');
      vm.addWaypoint(4.8, -74.2, 'D');
      vm.toggleMultiDay();
      expect(vm.isMultiDay).toBe(true);

      vm.removeStop(vm.waypoints[1].id); // 2 wp
      expect(vm.isMultiDay).toBe(true); // 2 sigue siendo válido
      vm.removeStop(vm.waypoints[1].id); // 1 wp
      expect(vm.isMultiDay).toBe(false); // <2 → multi-día apagado
    });
  });
});

describe('RouteDetailViewModel', () => {
  const build = (motos: any = [makeMotorcycle()]) => {
    const getRoute = { run: jest.fn().mockResolvedValue(makeRoute()) };
    const getCurrentRider = { run: jest.fn().mockResolvedValue(makeRider()) };
    const getAllMotos = { run: jest.fn().mockResolvedValue(motos) };
    const estimate = {
      run: jest.fn().mockResolvedValue(
        new AutonomyEstimate({
          totalDistanceKm: 600,
          fullTankRangeKm: 360,
          effectiveRangeKm: 300,
          safetyReserveKm: 40,
          totalFuelLiters: 20,
          reachesWithoutRefuel: false,
          fuelStops: [],
          conditionsSummary: 'solo',
        }),
      ),
    };
    const findStations = { run: jest.fn().mockResolvedValue([]) };
    const del = { run: jest.fn().mockResolvedValue(undefined) };
    const generateShare = {
      run: jest.fn().mockResolvedValue(
        new RouteShareCode({
          code: 'ABCD2345',
          routeId: 'route-1',
          ownerId: 'rider-1',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        }),
      ),
    };
    const revokeShare = { run: jest.fn().mockResolvedValue(undefined) };
    const createParty = { run: jest.fn() };
    const observePartyUseCase = {
      subscribe: jest.fn(() => () => undefined),
    };
    const partyStore =
      new (require('@/ui/store/TripPartyStore').TripPartyStore)(
        observePartyUseCase as any,
      );
    const vm = new RouteDetailViewModel(
      getRoute as any,
      getCurrentRider as any,
      getAllMotos as any,
      estimate as any,
      findStations as any,
      del as any,
      generateShare as any,
      revokeShare as any,
      createParty as any,
      partyStore as any,
    );
    return {
      vm,
      estimate,
      generateShare,
      revokeShare,
      createParty,
      partyStore,
    };
  };

  it('loads the route and auto-selects the first motorcycle', async () => {
    const { vm } = build();
    await vm.initialize('route-1');
    expect(vm.isRouteResponse).not.toBeNull();
    expect(vm.selectedMotorcycle?.id).toBe('moto-1');
    expect(vm.canEstimate).toBe(true);
  });

  it('getDuplicationPayload es null sin ruta cargada', () => {
    const { vm } = build();
    expect(vm.getDuplicationPayload()).toBeNull();
  });

  it('getDuplicationPayload arma el DTO serializable desde la ruta cargada', async () => {
    const { vm } = build();
    await vm.initialize('route-1');
    const payload = vm.getDuplicationPayload();
    expect(payload).not.toBeNull();
    expect(payload!.name).toBe(makeRoute().name);
    expect(payload!.waypoints).toHaveLength(makeRoute().waypoints.length);
    expect(['group', 'offroad', 'highway', 'longtrip']).toContain(
      payload!.rideType,
    );
    // Waypoints planos (sin métodos) para que el navigation param sea serializable.
    payload!.waypoints.forEach((w) => {
      expect(typeof w.latitude).toBe('number');
      expect(typeof w.kind).toBe('string');
    });
  });

  it('estimates autonomy with the selected motorcycle', async () => {
    const { vm, estimate } = build();
    await vm.initialize('route-1');
    await vm.estimateAutonomy();
    expect(estimate.run).toHaveBeenCalled();
    expect(vm.estimate?.reachesWithoutRefuel).toBe(false);
  });

  it('invalidates the estimate when conditions change', async () => {
    const { vm } = build();
    await vm.initialize('route-1');
    await vm.estimateAutonomy();
    vm.togglePassenger();
    expect(vm.estimate).toBeNull();
  });

  it('reports when the rider has no motorcycles', async () => {
    const { vm } = build([]);
    await vm.initialize('route-1');
    expect(vm.hasMotorcycles).toBe(false);
    expect(vm.canEstimate).toBe(false);
  });

  describe('share code flow (C.4)', () => {
    it('openShareSheet abre + genera el codigo si no existe', async () => {
      const { vm, generateShare } = build();
      await vm.initialize('route-1');
      await vm.openShareSheet();
      expect(vm.isShareSheetOpen).toBe(true);
      expect(generateShare.run).toHaveBeenCalledWith({
        routeId: 'route-1',
        ownerId: 'rider-1',
      });
      expect(vm.shareCode?.code).toBe('ABCD2345');
    });

    it('openShareSheet con codigo existente NO regenera', async () => {
      const { vm, generateShare } = build();
      await vm.initialize('route-1');
      await vm.openShareSheet();
      generateShare.run.mockClear();
      vm.closeShareSheet();
      await vm.openShareSheet();
      expect(generateShare.run).not.toHaveBeenCalled();
    });

    it('revokeShareCode limpia el estado local incluso si el remoto falla', async () => {
      const { vm, revokeShare } = build();
      revokeShare.run.mockRejectedValueOnce(new Error('network'));
      await vm.initialize('route-1');
      await vm.openShareSheet();
      expect(vm.shareCode).not.toBeNull();
      await vm.revokeShareCode();
      expect(vm.shareCode).toBeNull();
    });
  });
});
