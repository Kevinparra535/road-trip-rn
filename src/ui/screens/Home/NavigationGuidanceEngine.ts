import { ElevationProfile } from '@/domain/entities/ElevationProfile';
import { FuelStation } from '@/domain/entities/FuelStation';
import { FuelStop } from '@/domain/entities/FuelStop';
import {
  ManeuverModifier,
  ManeuverType,
} from '@/domain/entities/NavigationStep';
import { GeoPoint } from '@/domain/entities/Route';
import { RouteDirections } from '@/domain/entities/RouteDirections';
import { RouteFuelEstimate } from '@/domain/entities/RouteFuelEstimate';

import { haversineKm } from '@/domain/geo/geoMath';

const NAV_SUGGESTION_LIMIT = 3;
const NAV_FUEL_SOON_THRESHOLD_KM = 25;
const NAV_STATION_NEARBY_THRESHOLD_KM = 5;
const NAV_ELEVATION_LOOKAHEAD_KM = 3;
const NAV_ELEVATION_DELTA_THRESHOLD_M = 35;
const NAV_CURVE_WARNING_KM = 0.8;
const NAV_ARRIVAL_SOON_KM = 5;
const NAV_SUGGESTION_MIN_VISIBLE_MS = 4500;
const NAV_SUGGESTION_COOLDOWN_MS = 12000;

export type NavSuggestionKind =
  | 'fuel'
  | 'fuel-warning'
  | 'station'
  | 'climb'
  | 'descent'
  | 'curve'
  | 'arrival';

export type NavSuggestion = {
  id: string;
  kind: NavSuggestionKind;
  title: string;
  value: string;
  detail: string;
};

export type NavigationGuidanceTurn = {
  remainingKm: number;
  distanceText: string;
  instruction: string;
  streetName: string;
  maneuverType: ManeuverType;
  maneuverModifier: ManeuverModifier | null;
};

export type NavigationGuidanceInput = {
  route: RouteDirections;
  isNavigating: boolean;
  progressKm: number;
  riderPoint: GeoPoint | null;
  fuelStops: FuelStop[];
  fuelEstimate: RouteFuelEstimate | null;
  fuelStations: FuelStation[];
  elevationProfile: ElevationProfile | null;
  currentTurn: NavigationGuidanceTurn | null;
  destinationName: string;
  arrivalThresholdKm: number;
};

export type NavigationSuggestionLifecycleState = {
  visible: NavSuggestion[];
  enteredAtMsById: Record<string, number>;
  cooldownUntilMsById: Record<string, number>;
};

export type NavigationSuggestionLifecycleInput = {
  candidates: NavSuggestion[];
  previous: NavigationSuggestionLifecycleState;
  nowMs: number;
  limit?: number;
  minVisibleMs?: number;
  cooldownMs?: number;
};

export type NavigationSuggestionLifecycleResult = {
  suggestions: NavSuggestion[];
  lifecycle: NavigationSuggestionLifecycleState;
};

type RankedNavSuggestion = NavSuggestion & { priority: number };

export const createNavigationSuggestionLifecycleState =
  (): NavigationSuggestionLifecycleState => ({
    visible: [],
    enteredAtMsById: {},
    cooldownUntilMsById: {},
  });

export const stationDisplayName = (station: FuelStation): string =>
  station.brand || station.name;

export const findNearestFuelStation = (
  point: GeoPoint,
  stations: FuelStation[],
): { station: FuelStation; distanceKm: number } | null => {
  let best: FuelStation | null = null;
  let bestKm = Infinity;
  for (const station of stations) {
    const distanceKm = haversineKm(point, {
      latitude: station.latitude,
      longitude: station.longitude,
    });
    if (distanceKm < bestKm) {
      bestKm = distanceKm;
      best = station;
    }
  }
  return best ? { station: best, distanceKm: bestKm } : null;
};

export const formatGuidanceDistance = (km: number): string => {
  if (km < 0.05) return 'Ahora';
  if (km < 1) {
    const meters = Math.max(50, Math.round((km * 1000) / 50) * 50);
    return `${meters} m`;
  }
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
};

export const buildNavigationSuggestions = ({
  route,
  isNavigating,
  progressKm,
  riderPoint,
  fuelStops,
  fuelEstimate,
  fuelStations,
  elevationProfile,
  currentTurn,
  destinationName,
  arrivalThresholdKm,
}: NavigationGuidanceInput): NavSuggestion[] => {
  if (!isNavigating) return [];

  const routeProgressKm = Math.max(0, Math.min(route.distanceKm, progressKm));
  const suggestions: RankedNavSuggestion[] = [];
  const nextFuelStop =
    fuelStops
      .filter((stop) => stop.distanceFromStartKm > routeProgressKm + 0.1)
      .sort((a, b) => a.distanceFromStartKm - b.distanceFromStartKm)[0] ?? null;

  if (nextFuelStop) {
    const remainingToStopKm = Math.max(
      0,
      nextFuelStop.distanceFromStartKm - routeProgressKm,
    );
    const station = findNearestFuelStation(
      nextFuelStop.location,
      fuelStations,
    )?.station;
    const isFuelCritical =
      fuelEstimate !== null && !fuelEstimate.reachesWithoutRefuel;
    const isFuelSoon = remainingToStopKm <= NAV_FUEL_SOON_THRESHOLD_KM;
    suggestions.push({
      id: `fuel-${nextFuelStop.id}`,
      kind: isFuelCritical || isFuelSoon ? 'fuel-warning' : 'fuel',
      title:
        isFuelCritical || isFuelSoon
          ? 'Tanqueo recomendado'
          : 'Proximo tanqueo',
      value: formatGuidanceDistance(remainingToStopKm),
      detail: station
        ? stationDisplayName(station)
        : 'Parada sugerida por autonomia',
      priority: isFuelCritical ? 105 : isFuelSoon ? 92 : 55,
    });
  } else if (fuelEstimate !== null && !fuelEstimate.reachesWithoutRefuel) {
    suggestions.push({
      id: 'fuel-range-warning',
      kind: 'fuel-warning',
      title: 'Autonomia justa',
      value: `${Math.round(fuelEstimate.effectiveRangeKm)} km`,
      detail: 'Busca gasolina en ruta',
      priority: 105,
    });
  }

  const hasFuelSuggestion = suggestions.some(
    (suggestion) =>
      suggestion.kind === 'fuel' || suggestion.kind === 'fuel-warning',
  );
  const nearestStation = riderPoint
    ? findNearestFuelStation(riderPoint, fuelStations)
    : null;
  if (
    !hasFuelSuggestion &&
    nearestStation !== null &&
    nearestStation.distanceKm <= NAV_STATION_NEARBY_THRESHOLD_KM
  ) {
    suggestions.push({
      id: `station-${nearestStation.station.id}`,
      kind: 'station',
      title: 'Gasolinera cerca',
      value: formatGuidanceDistance(nearestStation.distanceKm),
      detail: stationDisplayName(nearestStation.station),
      priority: 78,
    });
  }

  if (elevationProfile && !elevationProfile.isEmpty) {
    const lookAheadKm = Math.min(
      route.distanceKm,
      routeProgressKm + NAV_ELEVATION_LOOKAHEAD_KM,
    );
    const currentM = elevationProfile.elevationAtKm(routeProgressKm);
    const aheadM = elevationProfile.elevationAtKm(lookAheadKm);
    if (currentM !== null && aheadM !== null) {
      const deltaM = aheadM - currentM;
      if (Math.abs(deltaM) >= NAV_ELEVATION_DELTA_THRESHOLD_M) {
        const isClimb = deltaM > 0;
        suggestions.push({
          id: isClimb ? 'elevation-climb' : 'elevation-descent',
          kind: isClimb ? 'climb' : 'descent',
          title: isClimb ? 'Subida adelante' : 'Bajada adelante',
          value: `${isClimb ? '+' : ''}${Math.round(deltaM)} m`,
          detail: `Proximos ${formatGuidanceDistance(
            Math.max(0, lookAheadKm - routeProgressKm),
          )}`,
          priority: 72,
        });
      }
    }
  }

  const isSharpCurve =
    currentTurn !== null &&
    currentTurn.remainingKm <= NAV_CURVE_WARNING_KM &&
    (currentTurn.maneuverModifier === 'sharp left' ||
      currentTurn.maneuverModifier === 'sharp right' ||
      currentTurn.maneuverModifier === 'uturn' ||
      currentTurn.maneuverType === 'roundabout' ||
      currentTurn.maneuverType === 'rotary');
  if (currentTurn !== null && isSharpCurve) {
    suggestions.push({
      id: 'turn-curve',
      kind: 'curve',
      title: 'Curva cerrada',
      value: currentTurn.distanceText,
      detail: currentTurn.streetName || currentTurn.instruction,
      priority: 90,
    });
  }

  const remainingKm = Math.max(0, route.distanceKm - routeProgressKm);
  if (remainingKm > arrivalThresholdKm && remainingKm <= NAV_ARRIVAL_SOON_KM) {
    suggestions.push({
      id: 'arrival-soon',
      kind: 'arrival',
      title: 'Llegada cerca',
      value: formatGuidanceDistance(remainingKm),
      detail: destinationName,
      priority: 64,
    });
  }

  return suggestions
    .sort((a, b) => b.priority - a.priority)
    .slice(0, NAV_SUGGESTION_LIMIT)
    .map(({ id, kind, title, value, detail }) => ({
      id,
      kind,
      title,
      value,
      detail,
    }));
};

export const resolveNavigationSuggestionLifecycle = ({
  candidates,
  previous,
  nowMs,
  limit = NAV_SUGGESTION_LIMIT,
  minVisibleMs = NAV_SUGGESTION_MIN_VISIBLE_MS,
  cooldownMs = NAV_SUGGESTION_COOLDOWN_MS,
}: NavigationSuggestionLifecycleInput): NavigationSuggestionLifecycleResult => {
  const candidateById = new Map(
    candidates.map((suggestion) => [suggestion.id, suggestion]),
  );
  const nextVisible: NavSuggestion[] = [];
  const nextEnteredAtMsById: Record<string, number> = {};
  const nextCooldownUntilMsById = Object.fromEntries(
    Object.entries(previous.cooldownUntilMsById).filter(
      ([, untilMs]) => untilMs > nowMs,
    ),
  );
  const activeIds = new Set<string>();

  previous.visible.forEach((previousSuggestion) => {
    if (nextVisible.length >= limit) return;
    const candidate = candidateById.get(previousSuggestion.id);
    const enteredAtMs =
      previous.enteredAtMsById[previousSuggestion.id] ?? nowMs;
    const isStillWarm = nowMs - enteredAtMs < minVisibleMs;
    if (!candidate && !isStillWarm) {
      nextCooldownUntilMsById[previousSuggestion.id] = Math.max(
        nextCooldownUntilMsById[previousSuggestion.id] ?? 0,
        nowMs + cooldownMs,
      );
      return;
    }

    const suggestion = candidate ?? previousSuggestion;
    nextVisible.push(suggestion);
    nextEnteredAtMsById[suggestion.id] = enteredAtMs;
    activeIds.add(suggestion.id);
  });

  candidates.forEach((candidate) => {
    if (nextVisible.length >= limit || activeIds.has(candidate.id)) return;
    const cooldownUntilMs = nextCooldownUntilMsById[candidate.id] ?? 0;
    if (cooldownUntilMs > nowMs) return;
    nextVisible.push(candidate);
    nextEnteredAtMsById[candidate.id] = nowMs;
    activeIds.add(candidate.id);
  });

  return {
    suggestions: nextVisible,
    lifecycle: {
      visible: nextVisible,
      enteredAtMsById: nextEnteredAtMsById,
      cooldownUntilMsById: nextCooldownUntilMsById,
    },
  };
};

const NavigationGuidanceEngine = {
  buildNavigationSuggestions,
  createNavigationSuggestionLifecycleState,
  findNearestFuelStation,
  formatGuidanceDistance,
  resolveNavigationSuggestionLifecycle,
  stationDisplayName,
};

export default NavigationGuidanceEngine;
