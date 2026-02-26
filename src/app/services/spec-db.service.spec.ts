import { TestBed } from '@angular/core/testing';
import { SpecDbService } from './spec-db.service';
import { type Spec, createEmptySpec } from '../models/spec.model';

/**
 * SpecDbService wraps Dexie (IndexedDB). Since jsdom does not provide IndexedDB,
 * we mock the internal Dexie table to verify the service methods delegate correctly.
 */

function makeSpec(overrides: Partial<Spec> = {}): Spec {
  return { ...createEmptySpec('services', 'test.spec.md'), ...overrides };
}

/** Minimal mock of Dexie.Table with in-memory storage */
function createMockTable() {
  let autoId = 0;
  const store = new Map<number, Spec>();

  return {
    _store: store,
    toArray: vi.fn(async () => [...store.values()]),
    get: vi.fn(async (id: number) => store.get(id)),
    add: vi.fn(async (spec: Spec) => {
      const id = ++autoId;
      store.set(id, { ...spec, id });
      return id;
    }),
    put: vi.fn(async (spec: Spec) => {
      store.set(spec.id!, { ...spec });
      return spec.id!;
    }),
    delete: vi.fn(async (id: number) => {
      store.delete(id);
    }),
    clear: vi.fn(async () => {
      store.clear();
    }),
    where: vi.fn((index: string) => ({
      equals: vi.fn((value: string) => ({
        toArray: vi.fn(async () =>
          [...store.values()].filter((s) => {
            if (index === 'suite') return s.suite === value;
            return false;
          }),
        ),
      })),
    })),
    orderBy: vi.fn((_index: string) => ({
      uniqueKeys: vi.fn(async () => {
        const suites = new Set([...store.values()].map((s) => s.suite));
        return [...suites].sort();
      }),
    })),
    bulkAdd: vi.fn(async (specs: Spec[]) => {
      for (const spec of specs) {
        const id = ++autoId;
        store.set(id, { ...spec, id });
      }
    }),
  };
}

describe('SpecDbService', () => {
  let service: SpecDbService;
  let mockTable: ReturnType<typeof createMockTable>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [SpecDbService] });
    service = TestBed.inject(SpecDbService);

    // Replace the internal Dexie database table with our mock
    mockTable = createMockTable();
    (service as any)['db'] = { specs: mockTable };
  });

  describe('save', () => {
    it('should insert a new spec and return its id', async () => {
      const spec = makeSpec();
      const id = await service.save(spec);
      expect(id).toBeGreaterThan(0);
      expect(mockTable.add).toHaveBeenCalled();
    });

    it('should set updatedAt on save', async () => {
      const spec = makeSpec();
      spec.updatedAt = '2000-01-01T00:00:00.000Z';
      await service.save(spec);
      expect(spec.updatedAt).not.toBe('2000-01-01T00:00:00.000Z');
    });

    it('should update an existing spec when id is present', async () => {
      const spec = makeSpec({ id: 5 });
      const id = await service.save(spec);
      expect(id).toBe(5);
      expect(mockTable.put).toHaveBeenCalled();
    });

    it('should call add for specs without id', async () => {
      const spec = makeSpec();
      delete spec.id;
      await service.save(spec);
      expect(mockTable.add).toHaveBeenCalled();
      expect(mockTable.put).not.toHaveBeenCalled();
    });

    it('should call put for specs with id', async () => {
      const spec = makeSpec({ id: 10 });
      await service.save(spec);
      expect(mockTable.put).toHaveBeenCalled();
      expect(mockTable.add).not.toHaveBeenCalled();
    });
  });

  describe('getAll', () => {
    it('should return all specs from the table', async () => {
      const all = await service.getAll();
      expect(all).toEqual([]);
      expect(mockTable.toArray).toHaveBeenCalledOnce();
    });

    it('should return specs after insertion', async () => {
      await service.save(makeSpec({ filename: 'a.spec.md' }));
      await service.save(makeSpec({ filename: 'b.spec.md' }));
      const all = await service.getAll();
      expect(all.length).toBe(2);
    });
  });

  describe('getById', () => {
    it('should delegate to table.get', async () => {
      await service.getById(42);
      expect(mockTable.get).toHaveBeenCalledWith(42);
    });

    it('should return undefined for non-existent id', async () => {
      const result = await service.getById(99999);
      expect(result).toBeUndefined();
    });

    it('should return the correct spec by id', async () => {
      const spec = makeSpec({ filename: 'find-me.spec.md' });
      const id = await service.save(spec);
      const fetched = await service.getById(id);
      expect(fetched!.filename).toBe('find-me.spec.md');
    });
  });

  describe('getBySuite', () => {
    it('should query by suite index', async () => {
      await service.save(makeSpec({ suite: 'models', filename: 'a.spec.md' }));
      await service.save(makeSpec({ suite: 'services', filename: 'b.spec.md' }));
      await service.save(makeSpec({ suite: 'models', filename: 'c.spec.md' }));

      const models = await service.getBySuite('models');
      expect(models.length).toBe(2);
      expect(models.every((s) => s.suite === 'models')).toBe(true);
    });

    it('should return empty array for non-existent suite', async () => {
      const result = await service.getBySuite('nonexistent');
      expect(result).toEqual([]);
    });
  });

  describe('delete', () => {
    it('should delegate to table.delete', async () => {
      await service.delete(7);
      expect(mockTable.delete).toHaveBeenCalledWith(7);
    });

    it('should remove a spec by id', async () => {
      const id = await service.save(makeSpec());
      await service.delete(id);
      const fetched = await service.getById(id);
      expect(fetched).toBeUndefined();
    });
  });

  describe('deleteAll', () => {
    it('should delegate to table.clear', async () => {
      await service.deleteAll();
      expect(mockTable.clear).toHaveBeenCalledOnce();
    });

    it('should clear all specs', async () => {
      await service.save(makeSpec({ filename: 'a.spec.md' }));
      await service.save(makeSpec({ filename: 'b.spec.md' }));
      await service.deleteAll();
      const all = await service.getAll();
      expect(all).toEqual([]);
    });
  });

  describe('getSuites', () => {
    it('should return unique suite names', async () => {
      await service.save(makeSpec({ suite: 'models', filename: 'a.spec.md' }));
      await service.save(makeSpec({ suite: 'services', filename: 'b.spec.md' }));
      await service.save(makeSpec({ suite: 'models', filename: 'c.spec.md' }));

      const suites = await service.getSuites();
      expect(suites).toEqual(['models', 'services']);
    });

    it('should return empty array when no specs exist', async () => {
      const suites = await service.getSuites();
      expect(suites).toEqual([]);
    });
  });

  describe('importBulk', () => {
    it('should delegate to table.bulkAdd', async () => {
      const specs = [makeSpec({ filename: 'one.spec.md' }), makeSpec({ filename: 'two.spec.md' })];
      await service.importBulk(specs);
      expect(mockTable.bulkAdd).toHaveBeenCalledWith(specs);
    });

    it('should insert multiple specs at once', async () => {
      const specs = [
        makeSpec({ filename: 'one.spec.md' }),
        makeSpec({ filename: 'two.spec.md' }),
        makeSpec({ filename: 'three.spec.md' }),
      ];
      await service.importBulk(specs);
      const all = await service.getAll();
      expect(all.length).toBe(3);
    });
  });
});
