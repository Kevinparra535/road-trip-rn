import { FuelType, LuggagePosition } from '@/domain/entities/Motorcycle';

export const FUEL_OPTIONS: FuelType[] = ['corriente', 'extra'];

export const LUGGAGE_POSITIONS: LuggagePosition[] = ['left', 'right', 'top'];

export const LUGGAGE_LABEL: Record<LuggagePosition, string> = {
  left: 'izquierdo',
  right: 'derecho',
  top: 'superior',
};
