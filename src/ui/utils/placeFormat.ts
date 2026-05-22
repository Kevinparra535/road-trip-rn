import { Place } from '@/domain/entities/Place';

/**
 * Etiqueta amigable del tipo de lugar para mostrar como badge en UI.
 * Devuelve `null` si no hay un placeType claro o si no merece resaltarse.
 *
 * Vive en UI (no en `Place`) porque es texto de presentacion y depende del
 * idioma: el dominio no debe saber de "Ciudad" vs "City". Mover esta logica
 * al VM/helper deja a `Place` como entidad pura.
 */
export const placeTypeLabel = (place: Place): string | null => {
  if (place.category) {
    const first = place.category.split(',')[0]?.trim();
    if (first) return first.charAt(0).toUpperCase() + first.slice(1);
  }
  switch (place.placeType) {
    case 'place':
      return 'Ciudad';
    case 'region':
      return 'Región';
    case 'country':
      return 'País';
    case 'address':
      return 'Dirección';
    case 'poi':
      return 'Lugar';
    case 'locality':
      return 'Localidad';
    case 'neighborhood':
      return 'Barrio';
    default:
      return null;
  }
};

/** "Region, Pais" segun lo que este disponible. */
export const placeContextLine = (place: Place): string =>
  [place.region, place.country].filter(Boolean).join(', ');
