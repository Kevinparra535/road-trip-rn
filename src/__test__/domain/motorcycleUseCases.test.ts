import { MotorcycleRepository } from '@/domain/repositories/MotorcycleRepository';
import { MotoStatsRepository } from '@/domain/repositories/MotoStatsRepository';

import { CreateMotorcycleUseCase } from '@/domain/useCases/CreateMotorcycleUseCase';
import { DeleteMotorcycleUseCase } from '@/domain/useCases/DeleteMotorcycleUseCase';
import { FetchMotorcycleSpecsUseCase } from '@/domain/useCases/FetchMotorcycleSpecsUseCase';
import { GetAllMotorcyclesUseCase } from '@/domain/useCases/GetAllMotorcyclesUseCase';
import { GetMotorcycleUseCase } from '@/domain/useCases/GetMotorcycleUseCase';
import { UpdateMotorcycleUseCase } from '@/domain/useCases/UpdateMotorcycleUseCase';

import { makeMotorcycle, makeMotorcycleSpecs } from '../factories';

const makeRepo = (): jest.Mocked<MotorcycleRepository> => ({
  getAllByRider: jest.fn(),
  getById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

describe('Motorcycle CRUD use cases', () => {
  it('lists motorcycles by rider', async () => {
    const repo = makeRepo();
    repo.getAllByRider.mockResolvedValue([makeMotorcycle()]);
    const result = await new GetAllMotorcyclesUseCase(repo).run('rider-1');
    expect(repo.getAllByRider).toHaveBeenCalledWith('rider-1');
    expect(result).toHaveLength(1);
  });

  it('gets one motorcycle by id', async () => {
    const repo = makeRepo();
    repo.getById.mockResolvedValue(makeMotorcycle());
    const result = await new GetMotorcycleUseCase(repo).run('moto-1');
    expect(result?.id).toBe('moto-1');
  });

  it('creates a valid motorcycle', async () => {
    const repo = makeRepo();
    const moto = makeMotorcycle();
    repo.create.mockResolvedValue(moto);
    await new CreateMotorcycleUseCase(repo).run(moto);
    expect(repo.create).toHaveBeenCalledWith(moto);
  });

  it('rejects creating a motorcycle with no tank capacity', async () => {
    const repo = makeRepo();
    await expect(
      new CreateMotorcycleUseCase(repo).run(makeMotorcycle({ tankCapacityLiters: 0 })),
    ).rejects.toThrow('tanque');
  });

  it('rejects creating a motorcycle with no consumption', async () => {
    const repo = makeRepo();
    await expect(
      new CreateMotorcycleUseCase(repo).run(
        makeMotorcycle({ fuelConsumptionKmPerLiter: 0 }),
      ),
    ).rejects.toThrow('rendimiento');
  });

  it('rejects updating a motorcycle without id', async () => {
    const repo = makeRepo();
    await expect(
      new UpdateMotorcycleUseCase(repo).run(makeMotorcycle({ id: '' })),
    ).rejects.toThrow('id');
  });

  it('updates a motorcycle with id', async () => {
    const repo = makeRepo();
    const moto = makeMotorcycle();
    repo.update.mockResolvedValue(moto);
    await new UpdateMotorcycleUseCase(repo).run(moto);
    expect(repo.update).toHaveBeenCalledWith(moto);
  });

  it('deletes a motorcycle', async () => {
    const repo = makeRepo();
    repo.delete.mockResolvedValue();
    await new DeleteMotorcycleUseCase(repo).run('moto-1');
    expect(repo.delete).toHaveBeenCalledWith('moto-1');
  });
});

describe('FetchMotorcycleSpecsUseCase', () => {
  const makeStatsRepo = (): jest.Mocked<MotoStatsRepository> => ({
    findSpecs: jest.fn(),
  });

  it('delegates a valid query', async () => {
    const repo = makeStatsRepo();
    repo.findSpecs.mockResolvedValue(makeMotorcycleSpecs());
    const specs = await new FetchMotorcycleSpecsUseCase(repo).run({
      brand: 'Yamaha',
      model: 'XTZ 250',
      year: 2022,
    });
    expect(specs?.confidence).toBe('high');
  });

  it('rejects an incomplete query', async () => {
    const repo = makeStatsRepo();
    await expect(
      new FetchMotorcycleSpecsUseCase(repo).run({
        brand: '',
        model: '',
        year: 2022,
      }),
    ).rejects.toThrow('obligatorios');
  });
});
