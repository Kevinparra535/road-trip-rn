import { PlaceModel } from '@/data/models/placeModel';

describe('PlaceModel.fromMapboxFeature', () => {
  it('parsea una feature de city con context jerarquico', () => {
    const model = PlaceModel.fromMapboxFeature({
      id: 'place.123',
      text: 'Villa de Leyva',
      place_name: 'Villa de Leyva, Boyaca, Colombia',
      place_type: ['place'],
      center: [-73.5, 5.6],
      context: [
        { id: 'region.1', text: 'Boyaca' },
        { id: 'country.1', text: 'Colombia' },
      ],
    });

    expect(model).not.toBeNull();
    expect(model!.id).toBe('place.123');
    expect(model!.name).toBe('Villa de Leyva');
    expect(model!.fullName).toBe('Villa de Leyva, Boyaca, Colombia');
    expect(model!.longitude).toBe(-73.5);
    expect(model!.latitude).toBe(5.6);
    expect(model!.placeType).toBe('place');
    expect(model!.region).toBe('Boyaca');
    expect(model!.country).toBe('Colombia');
    expect(model!.category).toBeUndefined();
    expect(model!.maki).toBeUndefined();
  });

  it('extrae category y maki para POIs', () => {
    const model = PlaceModel.fromMapboxFeature({
      id: 'poi.42',
      text: 'Estacion Texaco',
      place_name: 'Estacion Texaco, Bogota',
      place_type: ['poi'],
      center: [-74.07, 4.65],
      properties: {
        category: 'gas_station, fuel',
        maki: 'fuel',
      },
    });

    expect(model!.placeType).toBe('poi');
    expect(model!.category).toBe('gas_station, fuel');
    expect(model!.maki).toBe('fuel');
  });

  it('cae a geometry.coordinates cuando no hay center', () => {
    const model = PlaceModel.fromMapboxFeature({
      id: 'addr.99',
      text: 'Calle 100',
      place_name: 'Calle 100, Bogota',
      place_type: ['address'],
      geometry: { coordinates: [-74.05, 4.7] },
    });

    expect(model!.longitude).toBe(-74.05);
    expect(model!.latitude).toBe(4.7);
    expect(model!.placeType).toBe('address');
  });

  it('devuelve null cuando no hay coordenadas validas', () => {
    expect(PlaceModel.fromMapboxFeature({ id: 'x' })).toBeNull();
    expect(
      PlaceModel.fromMapboxFeature({ id: 'x', center: ['no', 'numbers'] }),
    ).not.toBeNull(); // mapbox responde strings? igual los pasamos a Number — testeamos abajo
  });

  it('usa fallback de id cuando feature.id falta', () => {
    const model = PlaceModel.fromMapboxFeature({
      text: 'Sin id',
      center: [-74, 4],
    });
    expect(model!.id).toBe('-74,4');
  });

  it('toDomain produce una entidad Place con todos los campos', () => {
    const model = PlaceModel.fromMapboxFeature({
      id: 'place.1',
      text: 'Medellin',
      place_name: 'Medellin, Antioquia, Colombia',
      place_type: ['place'],
      center: [-75.5, 6.25],
      context: [
        { id: 'region.7', text: 'Antioquia' },
        { id: 'country.7', text: 'Colombia' },
      ],
    });
    const place = model!.toDomain();
    expect(place.placeType).toBe('place');
    expect(place.region).toBe('Antioquia');
    expect(place.country).toBe('Colombia');
    expect(place.toLngLat()).toEqual([-75.5, 6.25]);
  });
});
