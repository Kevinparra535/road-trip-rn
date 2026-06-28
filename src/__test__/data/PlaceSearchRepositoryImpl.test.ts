import { PlaceSearchRepositoryImpl } from '@/data/repositories/PlaceSearchRepositoryImpl';

import { PlaceModel } from '@/data/models/placeModel';

const mapboxFeature = {
  id: 'place.123',
  text: 'Villa de Leyva',
  place_name: 'Villa de Leyva, Boyaca, Colombia',
  center: [-73.5269, 5.6339],
};

describe('PlaceModel', () => {
  it('maps a Mapbox geocoding feature to a domain Place', () => {
    const place = PlaceModel.fromMapboxFeature(mapboxFeature)?.toDomain();
    expect(place?.name).toBe('Villa de Leyva');
    expect(place?.fullName).toContain('Boyaca');
    expect(place?.toLngLat()).toEqual([-73.5269, 5.6339]);
  });

  it('returns null for a feature without coordinates', () => {
    expect(PlaceModel.fromMapboxFeature({ text: 'sin coords' })).toBeNull();
  });

  it('serializes back through toJson', () => {
    const model = PlaceModel.fromMapboxFeature(mapboxFeature);
    expect(model?.toJson()).toMatchObject({
      name: 'Villa de Leyva',
      latitude: 5.6339,
    });
  });
});

describe('PlaceSearchRepositoryImpl', () => {
  it('maps service models and forwards the proximity as [lng, lat]', async () => {
    const model = PlaceModel.fromMapboxFeature(mapboxFeature);
    const service = { search: jest.fn().mockResolvedValue([model]) };
    const repo = new PlaceSearchRepositoryImpl(service as any);

    const places = await repo.searchPlaces('villa', {
      latitude: 4.6,
      longitude: -74,
    });

    expect(places).toHaveLength(1);
    expect(places[0].name).toBe('Villa de Leyva');
    expect(service.search).toHaveBeenCalledWith('villa', [-74, 4.6], undefined);
  });

  it('searches without proximity when none is provided', async () => {
    const service = { search: jest.fn().mockResolvedValue([]) };
    await new PlaceSearchRepositoryImpl(service as any).searchPlaces('bogota');
    expect(service.search).toHaveBeenCalledWith('bogota', undefined, undefined);
  });
});
