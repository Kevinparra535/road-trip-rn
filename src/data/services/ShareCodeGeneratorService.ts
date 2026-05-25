import { injectable } from 'inversify';

/**
 * Alfabeto para los codigos cortos. Excluye `0/O/1/I/L` que son visualmente
 * ambiguos cuando se dictan o se leen de pantallas pequenias. 32 chars.
 */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Longitud default del codigo: 8 chars → 32^8 = ~1.1 trillon combinaciones. */
export const DEFAULT_CODE_LENGTH = 8;

export interface ShareCodeGeneratorService {
  /**
   * Genera un codigo aleatorio de `length` chars del alfabeto seguro.
   * Inyectable para facilitar tests (override con sequencias deterministas).
   */
  generate(length?: number): string;
}

@injectable()
export class ShareCodeGeneratorServiceImpl implements ShareCodeGeneratorService {
  generate(length: number = DEFAULT_CODE_LENGTH): string {
    let out = '';
    for (let i = 0; i < length; i += 1) {
      const idx = Math.floor(Math.random() * ALPHABET.length);
      out += ALPHABET[idx];
    }
    return out;
  }
}
