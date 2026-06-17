import { RouteTemplate } from '@/domain/entities/RouteTemplate';

import { GetRouteTemplatesUseCase } from '@/domain/useCases/GetRouteTemplatesUseCase';

import { PlannerTemplateController } from '@/ui/store/PlannerTemplateController';

const tpl = (id: string) =>
  new RouteTemplate({
    id,
    name: id,
    description: '',
    iconName: 'x',
    rideType: 'group',
    suggestedStopKinds: [],
  });

const build = () => {
  const getTemplates = {
    run: jest.fn().mockResolvedValue([tpl('dominical'), tpl('offroad')]),
  };
  const store = new PlannerTemplateController(
    getTemplates as unknown as GetRouteTemplatesUseCase,
  );
  return { store, getTemplates };
};

describe('PlannerTemplateController', () => {
  it('loads the catalog once (idempotent)', async () => {
    const { store, getTemplates } = build();
    await store.loadTemplates();
    await store.loadTemplates();
    expect(getTemplates.run).toHaveBeenCalledTimes(1);
    expect(store.templates).toHaveLength(2);
  });

  it('openTemplateSheet opens and loads; close closes', async () => {
    const { store, getTemplates } = build();
    store.openTemplateSheet();
    expect(store.isTemplateSheetOpen).toBe(true);
    await Promise.resolve();
    await Promise.resolve();
    expect(getTemplates.run).toHaveBeenCalled();
    store.closeTemplateSheet();
    expect(store.isTemplateSheetOpen).toBe(false);
  });

  it('findTemplate returns the match or null', async () => {
    const { store } = build();
    await store.loadTemplates();
    expect(store.findTemplate('offroad')?.id).toBe('offroad');
    expect(store.findTemplate('nope')).toBeNull();
  });

  it('records an error when loading fails', async () => {
    const getTemplates = {
      run: jest.fn().mockRejectedValue(new Error('boom')),
    };
    const store = new PlannerTemplateController(
      getTemplates as unknown as GetRouteTemplatesUseCase,
    );
    await store.loadTemplates();
    expect(store.isTemplatesError).toContain('boom');
    expect(store.isTemplatesLoading).toBe(false);
  });

  it('reset closes the sheet but keeps the loaded catalog', async () => {
    const { store } = build();
    await store.loadTemplates();
    store.openTemplateSheet();
    store.reset();
    expect(store.isTemplateSheetOpen).toBe(false);
    expect(store.templates).toHaveLength(2);
  });
});
