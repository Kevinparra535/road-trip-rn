import { GarageViewModel } from '@/ui/screens/Garage/GarageViewModel';
import { MotorcycleFormViewModel } from '@/ui/screens/Garage/MotorcycleFormViewModel';
import { makeMotorcycle, makeMotorcycleSpecs, makeRider } from '../factories';

describe('GarageViewModel', () => {
  const build = (overrides: {
    rider?: any;
    motos?: any;
    deleteImpl?: any;
  } = {}) => {
    const getCurrentRider = {
      run: jest.fn().mockResolvedValue(overrides.rider ?? makeRider()),
    };
    const getAll = {
      run: jest.fn().mockResolvedValue(overrides.motos ?? [makeMotorcycle()]),
    };
    const del = {
      run: overrides.deleteImpl ?? jest.fn().mockResolvedValue(undefined),
    };
    const vm = new GarageViewModel(
      getCurrentRider as any,
      getAll as any,
      del as any,
    );
    return { vm, getAll, del };
  };

  it('loads motorcycles for the current rider', async () => {
    const { vm, getAll } = build();
    await vm.initialize();
    expect(getAll.run).toHaveBeenCalledWith('rider-1');
    expect(vm.isLoaded).toBe(true);
    expect(vm.isEmpty).toBe(false);
  });

  it('reports empty state with no motorcycles', async () => {
    const { vm } = build({ motos: [] });
    await vm.initialize();
    expect(vm.isEmpty).toBe(true);
  });

  it('errors when there is no authenticated rider', async () => {
    const { vm } = build({ rider: null });
    await vm.initialize();
    expect(vm.isMotorcyclesError).toContain('rider');
  });

  it('removes a motorcycle from the list on delete', async () => {
    const { vm } = build();
    await vm.initialize();
    const ok = await vm.delete('moto-1');
    expect(ok).toBe(true);
    expect(vm.isMotorcyclesResponse).toHaveLength(0);
  });
});

describe('MotorcycleFormViewModel', () => {
  const build = () => {
    const getCurrentRider = { run: jest.fn().mockResolvedValue(makeRider()) };
    const getMotorcycle = { run: jest.fn() };
    const create = { run: jest.fn().mockResolvedValue(makeMotorcycle()) };
    const update = { run: jest.fn().mockResolvedValue(makeMotorcycle()) };
    const fetchSpecs = { run: jest.fn() };
    const vm = new MotorcycleFormViewModel(
      getCurrentRider as any,
      getMotorcycle as any,
      create as any,
      update as any,
      fetchSpecs as any,
    );
    return { vm, getMotorcycle, create, update, fetchSpecs };
  };

  it('is invalid until required fields are filled', async () => {
    const { vm } = build();
    await vm.initialize();
    expect(vm.isValid).toBe(false);
    vm.setBrand('Yamaha');
    vm.setModel('XTZ 250');
    vm.setYearText('2022');
    vm.setTankCapacityText('12');
    vm.setConsumptionText('30');
    expect(vm.isValid).toBe(true);
    expect(vm.estimatedRangeKm).toBe(360);
  });

  it('prefills the form when specs are found', async () => {
    const { vm, fetchSpecs } = build();
    fetchSpecs.run.mockResolvedValue(makeMotorcycleSpecs());
    await vm.initialize();
    vm.setBrand('Yamaha');
    vm.setModel('XTZ 250');
    vm.setYearText('2022');
    await vm.fetchSpecs();
    expect(vm.tankCapacityText).toBe('12');
    expect(vm.consumptionText).toBe('30');
    expect(vm.specsResult).not.toBeNull();
  });

  it('flags specs not found', async () => {
    const { vm, fetchSpecs } = build();
    fetchSpecs.run.mockResolvedValue(null);
    await vm.initialize();
    vm.setBrand('Rara');
    vm.setModel('Modelo X');
    vm.setYearText('2022');
    await vm.fetchSpecs();
    expect(vm.specsNotFound).toBe(true);
  });

  it('creates a motorcycle on submit', async () => {
    const { vm, create } = build();
    await vm.initialize();
    vm.setBrand('Yamaha');
    vm.setModel('XTZ 250');
    vm.setYearText('2022');
    vm.setTankCapacityText('12');
    vm.setConsumptionText('30');
    const ok = await vm.submit();
    expect(ok).toBe(true);
    expect(create.run).toHaveBeenCalled();
    expect(vm.hasSubmitSuccess).toBe(true);
  });

  it('switches to edit mode and updates an existing motorcycle', async () => {
    const { vm, getMotorcycle, update } = build();
    getMotorcycle.run.mockResolvedValue(makeMotorcycle({ id: 'moto-9' }));
    await vm.initialize('moto-9');
    expect(vm.isEditMode).toBe(true);
    expect(vm.title).toBe('Editar moto');
    await vm.submit();
    expect(update.run).toHaveBeenCalled();
  });
});
