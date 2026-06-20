import { RouteDirectionsModel } from '@/data/models/routeDirectionsModel';

const mapboxResponse = {
  routes: [
    {
      distance: 42000,
      duration: 4500,
      geometry: {
        coordinates: [
          [-74, 4],
          [-73.5, 4.5],
          [-73, 5],
        ],
      },
    },
    {
      distance: 47000,
      duration: 5200,
      geometry: {
        coordinates: [
          [-74, 4],
          [-73.6, 4.6],
          [-73, 5],
        ],
      },
    },
  ],
};

describe('RouteDirectionsModel — alternativas', () => {
  it('maps the primary route and the alternatives', () => {
    const directions = RouteDirectionsModel.fromMapboxJson(mapboxResponse).toDomain();
    expect(directions.distanceKm).toBe(42);
    expect(directions.durationMin).toBe(75);
    expect(directions.geometry).toHaveLength(3);
    expect(directions.alternatives).toHaveLength(1);
    expect(directions.alternatives[0].distanceKm).toBe(47);
  });

  it('has no alternatives when only one route is returned', () => {
    const directions = RouteDirectionsModel.fromMapboxJson({
      routes: [{ distance: 1000, duration: 600, geometry: { coordinates: [] } }],
    }).toDomain();
    expect(directions.alternatives).toEqual([]);
  });
});
