import { AutonomyEstimate } from '@/domain/entities/AutonomyEstimate';
import { FuelStation } from '@/domain/entities/FuelStation';
import { RouteShareCode } from '@/domain/entities/RouteShareCode';

import Colors from '@/ui/styles/Colors';

import { RouteDetailViewModel } from '@/ui/screens/RouteDetail/RouteDetailViewModel';

import { makeMotorcycle, makeRider, makeRoute, makeWaypoint } from '../factories';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeShareCode = (partyId?: string): RouteShareCode =>
  new RouteShareCode({
    code: 'ABCD2345',
    routeId: 'route-1',
    ownerId: 'rider-1',
    partyId,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

const makeEstimate = (
  overrides: Partial<{
    totalFuelLiters: number;
    effectiveRangeKm: number;
    safetyReserveKm: number;
    reachesWithoutRefuel: boolean;
  }> = {},
): AutonomyEstimate =>
  new AutonomyEstimate({
    totalDistanceKm: 120,
    fullTankRangeKm: 360,
    effectiveRangeKm: overrides.effectiveRangeKm ?? 300,
    safetyReserveKm: overrides.safetyReserveKm ?? 40,
    totalFuelLiters: overrides.totalFuelLiters ?? 8.4,
    reachesWithoutRefuel: overrides.reachesWithoutRefuel ?? true,
    fuelStops: [],
    conditionsSummary: 'solo',
  });

// Minimal partyStore: we test `partyMatchesActive` so we need `isPartyForRoute`.
const makePartyStore = (isPartyForRouteResult: boolean = false) => ({
  setActiveParty: jest.fn(),
  isPartyForRoute: jest.fn().mockReturnValue(isPartyForRouteResult),
  hasActiveParty: isPartyForRouteResult,
  clear: jest.fn(),
});

const build = (
  overrides: Partial<{
    route: ReturnType<typeof makeRoute> | null;
    motorcycles: ReturnType<typeof makeMotorcycle>[];
    partyStore: ReturnType<typeof makePartyStore>;
  }> = {},
) => {
  const route =
    overrides.route !== undefined ? overrides.route : makeRoute({ id: 'route-1' });
  const getRoute = { run: jest.fn().mockResolvedValue(route) };
  const getCurrentRider = { run: jest.fn().mockResolvedValue(makeRider()) };
  const getAllMotorcycles = {
    run: jest.fn().mockResolvedValue(overrides.motorcycles ?? []),
  };
  const estimateAutonomy = { run: jest.fn() };
  const findFuelStations = { run: jest.fn().mockResolvedValue([]) };
  const del = { run: jest.fn().mockResolvedValue(undefined) };
  const generateShareCode = { run: jest.fn() };
  const revokeShareCode = { run: jest.fn() };
  const createTripParty = { run: jest.fn() };
  const partyStore = overrides.partyStore ?? makePartyStore();
  const downloadOffline = { run: jest.fn().mockResolvedValue(undefined) };

  const viewModel = new RouteDetailViewModel(
    getRoute as any,
    getCurrentRider as any,
    getAllMotorcycles as any,
    estimateAutonomy as any,
    findFuelStations as any,
    del as any,
    generateShareCode as any,
    revokeShareCode as any,
    createTripParty as any,
    partyStore as any,
    downloadOffline as any,
  );

  return {
    viewModel,
    getRoute,
    getCurrentRider,
    getAllMotorcycles,
    estimateAutonomy,
    findFuelStations,
    del,
    generateShareCode,
    partyStore,
    downloadOffline,
  };
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RouteDetailViewModel', () => {
  // ── initialize() ──────────────────────────────────────────────────────────

  describe('initialize()', () => {
    it('happy path: loads route and motorcycles, selects first motorcycle', async () => {
      const moto = makeMotorcycle({ id: 'moto-1' });
      const { viewModel, getRoute, getAllMotorcycles } = build({ motorcycles: [moto] });

      await viewModel.initialize('route-1');

      expect(getRoute.run).toHaveBeenCalledWith('route-1');
      expect(getAllMotorcycles.run).toHaveBeenCalledWith('rider-1');
      expect(viewModel.isRouteResponse).not.toBeNull();
      expect(viewModel.isRouteError).toBeNull();
      expect(viewModel.isRouteLoading).toBe(false);
      expect(viewModel.selectedMotorcycleId).toBe('moto-1');
    });

    it('sets error when no authenticated rider', async () => {
      const { viewModel, getCurrentRider } = build();
      getCurrentRider.run.mockResolvedValueOnce(null);

      await viewModel.initialize('route-1');

      expect(viewModel.isRouteError).toContain('rider');
      expect(viewModel.isRouteLoading).toBe(false);
    });

    it('sets error when route does not exist', async () => {
      const { viewModel, getRoute } = build();
      getRoute.run.mockResolvedValueOnce(null);

      await viewModel.initialize('missing-id');

      expect(viewModel.isRouteError).toContain('ruta');
    });

    it('normalizes non-Error thrown values on initialize', async () => {
      const { viewModel, getRoute } = build();
      getRoute.run.mockRejectedValueOnce('plain string error');

      await viewModel.initialize('route-1');

      expect(viewModel.isRouteError).toContain('plain string error');
    });
  });

  // ── lineShape getter ──────────────────────────────────────────────────────

  describe('lineShape', () => {
    it('returns a GeoJSON LineString with empty coordinates when no route loaded', () => {
      const { viewModel } = build();
      const shape = viewModel.lineShape;
      expect(shape.type).toBe('Feature');
      expect(shape.geometry.type).toBe('LineString');
      expect(shape.geometry.coordinates).toHaveLength(0);
    });

    it('maps route geometry to [longitude, latitude] coordinate pairs', async () => {
      const route = makeRoute({
        geometry: [
          { latitude: 4.6, longitude: -74.08 },
          { latitude: 5.0, longitude: -73.5 },
        ],
      });
      const { viewModel } = build({ route });
      await viewModel.initialize('route-1');

      const shape = viewModel.lineShape;
      expect(shape.geometry.coordinates).toHaveLength(2);
      // GeoJSON order: [longitude, latitude]
      expect(shape.geometry.coordinates[0]).toEqual([-74.08, 4.6]);
      expect(shape.geometry.coordinates[1]).toEqual([-73.5, 5.0]);
    });
  });

  // ── centerCoordinate getter ───────────────────────────────────────────────

  describe('centerCoordinate', () => {
    it('returns Bogota fallback when no route is loaded', () => {
      const { viewModel } = build();
      const [lng, lat] = viewModel.centerCoordinate;
      // Bogota fallback: [-74.0817, 4.6097]
      expect(lng).toBeCloseTo(-74.0817, 3);
      expect(lat).toBeCloseTo(4.6097, 3);
    });

    it('returns first waypoint coordinate after route loaded', async () => {
      const route = makeRoute({
        waypoints: [
          makeWaypoint({
            id: 'w-1',
            latitude: 5.6,
            longitude: -73.5,
            kind: 'start',
            order: 0,
          }),
          makeWaypoint({
            id: 'w-2',
            latitude: 4.6,
            longitude: -74.0,
            kind: 'destination',
            order: 1,
          }),
        ],
      });
      const { viewModel } = build({ route });
      await viewModel.initialize('route-1');

      const [lng, lat] = viewModel.centerCoordinate;
      expect(lng).toBe(-73.5);
      expect(lat).toBe(5.6);
    });
  });

  // ── lineColor getter ──────────────────────────────────────────────────────

  describe('lineColor', () => {
    it('returns accent color when no route loaded', () => {
      const { viewModel } = build();
      expect(viewModel.lineColor).toBe(Colors.base.accent);
    });

    it('returns highway color for highway ride type', async () => {
      const route = makeRoute({ rideType: 'highway' });
      const { viewModel } = build({ route });
      await viewModel.initialize('route-1');
      expect(viewModel.lineColor).toBe(Colors.base.iconHighway);
    });

    it('returns offroad color for offroad ride type', async () => {
      const route = makeRoute({ rideType: 'offroad' });
      const { viewModel } = build({ route });
      await viewModel.initialize('route-1');
      expect(viewModel.lineColor).toBe(Colors.base.iconOffroad);
    });
  });

  // ── rideTypeLabel getter ──────────────────────────────────────────────────

  describe('rideTypeLabel', () => {
    it('returns empty string when no route loaded', () => {
      const { viewModel } = build();
      expect(viewModel.rideTypeLabel).toBe('');
    });

    it('returns "Carretera" for highway ride type', async () => {
      const route = makeRoute({ rideType: 'highway' });
      const { viewModel } = build({ route });
      await viewModel.initialize('route-1');
      expect(viewModel.rideTypeLabel).toBe('Carretera');
    });

    it('returns "Rodada grupal" for group ride type', async () => {
      const route = makeRoute({ rideType: 'group' });
      const { viewModel } = build({ route });
      await viewModel.initialize('route-1');
      expect(viewModel.rideTypeLabel).toBe('Rodada grupal');
    });
  });

  // ── shareMessage getter ───────────────────────────────────────────────────

  describe('shareMessage', () => {
    it('returns empty string when route or shareCode is missing', () => {
      const { viewModel } = build();
      expect(viewModel.shareMessage).toBe('');
    });

    it('returns empty string when route loaded but no shareCode', async () => {
      const { viewModel } = build();
      await viewModel.initialize('route-1');
      // shareCode is still null
      expect(viewModel.shareMessage).toBe('');
    });

    it('composes share message with route name and display code', async () => {
      const route = makeRoute({ name: 'Bogota - La Vega' });
      const { viewModel } = build({ route });
      await viewModel.initialize('route-1');
      // Manually set shareCode (normally set via generateShareCode action).
      (viewModel as any).shareCode = makeShareCode();

      expect(viewModel.shareMessage).toContain('Bogota - La Vega');
      expect(viewModel.shareMessage).toContain('ABCD-2345');
    });
  });

  // ── estimateBannerColor getter ────────────────────────────────────────────

  describe('estimateBannerColor', () => {
    it('returns bgInfoCard when no estimate set', () => {
      const { viewModel } = build();
      expect(viewModel.estimateBannerColor).toBe(Colors.base.bgInfoCard);
    });

    it('returns accentDim when estimate reachesWithoutRefuel=true', async () => {
      const { viewModel } = build();
      await viewModel.initialize('route-1');
      (viewModel as any).estimate = makeEstimate({ reachesWithoutRefuel: true });
      expect(viewModel.estimateBannerColor).toBe(Colors.base.accentDim);
    });

    it('returns bgInfoCard when estimate reachesWithoutRefuel=false', async () => {
      const { viewModel } = build();
      await viewModel.initialize('route-1');
      (viewModel as any).estimate = makeEstimate({ reachesWithoutRefuel: false });
      expect(viewModel.estimateBannerColor).toBe(Colors.base.bgInfoCard);
    });
  });

  // ── partyMatchesActive getter ─────────────────────────────────────────────

  describe('partyMatchesActive', () => {
    it('returns false when no route is loaded', () => {
      const { viewModel } = build({ partyStore: makePartyStore(false) });
      expect(viewModel.partyMatchesActive).toBe(false);
    });

    it('returns false when party does not match this route', async () => {
      const partyStore = makePartyStore(false);
      const { viewModel } = build({ partyStore });
      await viewModel.initialize('route-1');
      expect(viewModel.partyMatchesActive).toBe(false);
    });

    it('returns true when party matches the loaded route', async () => {
      const partyStore = makePartyStore(true);
      const { viewModel } = build({ partyStore });
      await viewModel.initialize('route-1');
      expect(viewModel.partyMatchesActive).toBe(true);
    });
  });

  // ── distanceLabel / totalFuelLabel / effectiveRangeLabel / safetyReserveLabel ──

  describe('distance and fuel label getters', () => {
    it('distanceLabel formats 0 when no route', () => {
      const { viewModel } = build();
      expect(viewModel.distanceLabel).toBe('0 m');
    });

    it('distanceLabel formats route distance in km', async () => {
      const route = makeRoute({ distanceKm: 600 });
      const { viewModel } = build({ route });
      await viewModel.initialize('route-1');
      expect(viewModel.distanceLabel).toBe('600 km');
    });

    it('totalFuelLabel shows 0.0 L when no estimate', () => {
      const { viewModel } = build();
      expect(viewModel.totalFuelLabel).toBe('0.0 L');
    });

    it('totalFuelLabel shows formatted liters from estimate', async () => {
      const { viewModel } = build();
      await viewModel.initialize('route-1');
      (viewModel as any).estimate = makeEstimate({ totalFuelLiters: 8.4 });
      expect(viewModel.totalFuelLabel).toBe('8.4 L');
    });

    it('effectiveRangeLabel shows 0 km when no estimate', () => {
      const { viewModel } = build();
      expect(viewModel.effectiveRangeLabel).toBe('0 km');
    });

    it('effectiveRangeLabel shows rounded km from estimate', async () => {
      const { viewModel } = build();
      await viewModel.initialize('route-1');
      (viewModel as any).estimate = makeEstimate({ effectiveRangeKm: 302.7 });
      expect(viewModel.effectiveRangeLabel).toBe('303 km');
    });

    it('safetyReserveLabel shows 0 km when no estimate', () => {
      const { viewModel } = build();
      expect(viewModel.safetyReserveLabel).toBe('0 km');
    });

    it('safetyReserveLabel shows rounded km from estimate', async () => {
      const { viewModel } = build();
      await viewModel.initialize('route-1');
      (viewModel as any).estimate = makeEstimate({ safetyReserveKm: 38.9 });
      expect(viewModel.safetyReserveLabel).toBe('39 km');
    });
  });

  // ── priceLabel(value) ─────────────────────────────────────────────────────

  describe('priceLabel()', () => {
    it('formats a number using Colombian locale', () => {
      const { viewModel } = build();
      // Just check that a positive number doesn't throw.
      const result = viewModel.priceLabel(15000);
      expect(typeof result).toBe('string');
      expect(result).not.toBe('');
    });

    it('returns "0" for null value', () => {
      const { viewModel } = build();
      expect(viewModel.priceLabel(null)).toBe('0');
    });

    it('returns "0" for undefined value', () => {
      const { viewModel } = build();
      expect(viewModel.priceLabel(undefined)).toBe('0');
    });
  });

  // ── fuelStationRows(): cruce con la gasolina de la moto (F2) ────────────────

  describe('fuelStationRows (F2)', () => {
    const stationWith = (id: string) =>
      new FuelStation({
        id,
        name: 'EDS Test',
        brand: 'Terpel',
        latitude: 4.7,
        longitude: -74.05,
        fuelTypes: ['corriente', 'extra'],
        referencePriceCorriente: 16200,
        referencePriceExtra: 18100,
      });

    it('muestra el precio de la gasolina que usa la moto activa', () => {
      const { viewModel } = build();
      viewModel.motorcycles = [makeMotorcycle({ id: 'moto-1', fuelType: 'extra' })];
      viewModel.selectedMotorcycleId = 'moto-1';
      viewModel.fuelStations = [stationWith('s1')];

      const rows = viewModel.fuelStationRows;
      expect(rows).toHaveLength(1);
      expect(rows[0].fuelLabel).toBe('Extra');
      expect(rows[0].fuelPriceLabel).toBe(`$${viewModel.priceLabel(18100)}`);
      expect(rows[0].latitude).toBe(4.7);
      expect(rows[0].longitude).toBe(-74.05);
    });

    it('cae a corriente cuando no hay moto activa', () => {
      const { viewModel } = build();
      viewModel.motorcycles = [];
      viewModel.selectedMotorcycleId = null;
      viewModel.fuelStations = [stationWith('s2')];

      const rows = viewModel.fuelStationRows;
      expect(rows[0].fuelLabel).toBe('Corriente');
      expect(rows[0].fuelPriceLabel).toBe(`$${viewModel.priceLabel(16200)}`);
    });
  });

  // ── reset() ───────────────────────────────────────────────────────────────

  describe('downloadOffline (F5 — G12)', () => {
    it('descarga el corredor de la ruta y marca éxito', async () => {
      const route = makeRoute({
        id: 'route-1',
        geometry: [
          { latitude: 4, longitude: -74 },
          { latitude: 5, longitude: -73 },
        ],
      });
      const { viewModel, downloadOffline } = build({ route });
      await viewModel.initialize('route-1');
      expect(viewModel.canDownloadOffline).toBe(true);

      await viewModel.downloadOffline();

      expect(downloadOffline.run).toHaveBeenCalledTimes(1);
      expect(downloadOffline.run.mock.calls[0][0].name).toBe('route-route-1');
      expect(viewModel.hasOfflineSuccess).toBe(true);
      expect(viewModel.isOfflineDownloading).toBe(false);
    });

    it('no descarga si la ruta no tiene geometría', async () => {
      const route = makeRoute({ id: 'route-1', geometry: [] });
      const { viewModel, downloadOffline } = build({ route });
      await viewModel.initialize('route-1');
      expect(viewModel.canDownloadOffline).toBe(false);

      await viewModel.downloadOffline();
      expect(downloadOffline.run).not.toHaveBeenCalled();
    });
  });

  describe('reset()', () => {
    it('clears all transient state', async () => {
      const { viewModel } = build();
      await viewModel.initialize('route-1');
      (viewModel as any).estimate = makeEstimate();
      (viewModel as any).shareCode = makeShareCode();

      viewModel.reset();

      expect(viewModel.isRouteResponse).toBeNull();
      expect(viewModel.isRouteLoading).toBe(false);
      expect(viewModel.isRouteError).toBeNull();
      expect(viewModel.estimate).toBeNull();
      expect(viewModel.shareCode).toBeNull();
      expect(viewModel.hasDeleteSuccess).toBe(false);
      expect(viewModel.isShareSheetOpen).toBe(false);
    });
  });
});
