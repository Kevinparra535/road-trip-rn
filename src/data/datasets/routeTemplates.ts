import { RouteAvoidPreferences } from '@/domain/entities/RouteAvoidPreferences';
import { RouteTemplate } from '@/domain/entities/RouteTemplate';

/**
 * Plantillas curadas de viaje. Hardcoded (paralelo a `motoStatsDataset`): son
 * "shared wisdom" iguales para todos los riders, no requieren infra. Si en el
 * futuro se quieren plantillas personales, irían en Firestore en otro slice.
 */
export const ROUTE_TEMPLATES: RouteTemplate[] = [
  new RouteTemplate({
    id: 'dominical',
    name: 'Dominical',
    description: 'Salida de un día sin afán, evitando autopistas.',
    iconName: 'sunny-outline',
    rideType: 'group',
    suggestedStopKinds: ['food', 'rest'],
    avoid: new RouteAvoidPreferences({ highways: true }),
    isRoundTrip: true,
    suggestedStopDurationMin: 30,
  }),
  new RouteTemplate({
    id: 'fin-de-semana',
    name: 'Fin de semana',
    description: 'Dos días con pernocte; paradas de comida y tanqueo.',
    iconName: 'calendar-outline',
    rideType: 'longtrip',
    suggestedStopKinds: ['food', 'fuel', 'rest'],
    suggestedStopDurationMin: 30,
  }),
  new RouteTemplate({
    id: 'viaje-largo',
    name: 'Viaje largo',
    description: 'Ruta de varios días por carretera, con tanqueos frecuentes.',
    iconName: 'map-outline',
    rideType: 'longtrip',
    suggestedStopKinds: ['fuel', 'food', 'rest'],
    suggestedStopDurationMin: 45,
  }),
  new RouteTemplate({
    id: 'offroad',
    name: 'Offroad',
    description: 'Trochas y destapado; evita peajes y autopistas.',
    iconName: 'trail-sign-outline',
    rideType: 'offroad',
    suggestedStopKinds: ['rest', 'fuel'],
    avoid: new RouteAvoidPreferences({ tolls: true, highways: true }),
    suggestedStopDurationMin: 20,
  }),
  new RouteTemplate({
    id: 'expedicion',
    name: 'Expedición',
    description: 'Viaje largo con turismo; paradas amplias para explorar.',
    iconName: 'compass-outline',
    rideType: 'longtrip',
    suggestedStopKinds: ['fuel', 'food', 'rest', 'tourism'],
    isRoundTrip: false,
    suggestedStopDurationMin: 60,
  }),
];
