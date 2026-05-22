import { PlaceSummary } from '@/domain/entities/PlaceSummary';
import { PlaceSummaryRepository } from '@/domain/repositories/PlaceSummaryRepository';
import { GetPlaceSummaryUseCase } from '@/domain/useCases/GetPlaceSummaryUseCase';

const makeRepo = (): jest.Mocked<PlaceSummaryRepository> => ({
  getSummary: jest.fn(),
});

const makeSummary = (overrides: Partial<PlaceSummary> = {}): PlaceSummary =>
  new PlaceSummary({
    title: 'Villa de Leyva',
    extract: 'Pueblo colonial en Boyacá.',
    thumbnailUrl: 'https://example.com/villa.jpg',
    sourceUrl: 'https://es.wikipedia.org/wiki/Villa_de_Leyva',
    ...overrides,
  });

describe('GetPlaceSummaryUseCase', () => {
  it('trims the name and delegates to the repository', async () => {
    const repo = makeRepo();
    const summary = makeSummary();
    repo.getSummary.mockResolvedValue(summary);

    const result = await new GetPlaceSummaryUseCase(repo).run({
      name: '  Villa de Leyva  ',
    });

    expect(result).toBe(summary);
    expect(repo.getSummary).toHaveBeenCalledWith('Villa de Leyva');
  });

  it('returns null for empty names without calling the repository', async () => {
    const repo = makeRepo();

    const result = await new GetPlaceSummaryUseCase(repo).run({ name: '   ' });

    expect(result).toBeNull();
    expect(repo.getSummary).not.toHaveBeenCalled();
  });

  it('returns null when the repository finds no article', async () => {
    const repo = makeRepo();
    repo.getSummary.mockResolvedValue(null);

    const result = await new GetPlaceSummaryUseCase(repo).run({
      name: 'Inexistente',
    });

    expect(result).toBeNull();
  });

  it('propagates repository errors', async () => {
    const repo = makeRepo();
    repo.getSummary.mockRejectedValue(new Error('network down'));

    await expect(
      new GetPlaceSummaryUseCase(repo).run({ name: 'Bogota' }),
    ).rejects.toThrow('network down');
  });
});
