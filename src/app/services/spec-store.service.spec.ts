import { TestBed } from '@angular/core/testing';
import { SpecStoreService } from './spec-store.service';
import { SpecDbService } from './spec-db.service';
import { SpecParserService } from './spec-parser.service';
import { SpecValidatorService } from './spec-validator.service';
import { type Spec, createEmptySpec } from '../models/spec.model';

function makeSpec(overrides: Partial<Spec> = {}): Spec {
  return { ...createEmptySpec('services', 'test.spec.md'), id: 1, ...overrides };
}

describe('SpecStoreService', () => {
  let store: SpecStoreService;
  let dbMock: {
    getAll: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let parserMock: {
    parseMarkdown: ReturnType<typeof vi.fn>;
    serializeToMarkdown: ReturnType<typeof vi.fn>;
  };
  let validatorMock: {
    validate: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    dbMock = {
      getAll: vi.fn().mockResolvedValue([]),
      save: vi.fn().mockResolvedValue(1),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    parserMock = {
      parseMarkdown: vi.fn().mockReturnValue(createEmptySpec('default', 'parsed.spec.md')),
      serializeToMarkdown: vi.fn().mockReturnValue('---\nmodule: test\n---\n'),
    };

    validatorMock = {
      validate: vi.fn().mockReturnValue({ valid: true, errors: [] }),
    };

    TestBed.configureTestingModule({
      providers: [
        SpecStoreService,
        { provide: SpecDbService, useValue: dbMock },
        { provide: SpecParserService, useValue: parserMock },
        { provide: SpecValidatorService, useValue: validatorMock },
      ],
    });

    store = TestBed.inject(SpecStoreService);
  });

  describe('loadAll', () => {
    it('should populate allSpecs from database', async () => {
      const specs = [makeSpec({ id: 1 }), makeSpec({ id: 2, filename: 'other.spec.md' })];
      dbMock.getAll.mockResolvedValue(specs);

      await store.loadAll();

      expect(store.allSpecs()).toEqual(specs);
      expect(dbMock.getAll).toHaveBeenCalledOnce();
    });

    it('should replace existing specs on reload', async () => {
      dbMock.getAll.mockResolvedValue([makeSpec({ id: 1 })]);
      await store.loadAll();
      expect(store.allSpecs().length).toBe(1);

      dbMock.getAll.mockResolvedValue([makeSpec({ id: 2 }), makeSpec({ id: 3 })]);
      await store.loadAll();
      expect(store.allSpecs().length).toBe(2);
    });
  });

  describe('createSpec', () => {
    it('should save to db and add to allSpecs', async () => {
      dbMock.save.mockResolvedValue(42);

      const spec = await store.createSpec('models', 'new.spec.md');

      expect(spec.id).toBe(42);
      expect(spec.suite).toBe('models');
      expect(spec.filename).toBe('new.spec.md');
      expect(dbMock.save).toHaveBeenCalledOnce();
      expect(store.allSpecs().length).toBe(1);
    });

    it('should set the new spec as active', async () => {
      dbMock.save.mockResolvedValue(10);

      await store.createSpec();

      expect(store.activeSpec()?.id).toBe(10);
    });

    it('should use default suite and filename when not provided', async () => {
      dbMock.save.mockResolvedValue(1);

      const spec = await store.createSpec();

      expect(spec.suite).toBe('default');
      expect(spec.filename).toBe('untitled.spec.md');
    });
  });

  describe('selectSpec', () => {
    it('should set activeSpec to the selected spec', async () => {
      const specs = [makeSpec({ id: 1 }), makeSpec({ id: 2, filename: 'two.spec.md' })];
      dbMock.getAll.mockResolvedValue(specs);
      await store.loadAll();

      await store.selectSpec(2);

      expect(store.activeSpec()?.id).toBe(2);
    });

    it('should clear dirty flag on selection', async () => {
      dbMock.save.mockResolvedValue(1);
      await store.createSpec();
      store.markDirty();
      expect(store.isDirty()).toBe(true);

      await store.selectSpec(1);

      expect(store.isDirty()).toBe(false);
    });

    it('should return null activeSpec when id has no match', async () => {
      await store.selectSpec(999);

      expect(store.activeSpec()).toBeNull();
    });
  });

  describe('updateActiveSpec', () => {
    it('should update the active spec in db and state', async () => {
      dbMock.save.mockResolvedValue(1);
      await store.createSpec('services', 'orig.spec.md');

      await store.updateActiveSpec({ filename: 'renamed.spec.md' });

      expect(dbMock.save).toHaveBeenCalledTimes(2);
      expect(store.activeSpec()?.filename).toBe('renamed.spec.md');
    });

    it('should set updatedAt timestamp', async () => {
      dbMock.save.mockResolvedValue(1);
      await store.createSpec();

      await store.updateActiveSpec({ filename: 'changed.spec.md' });
      const after = store.activeSpec()?.updatedAt;

      // updatedAt should be a valid ISO timestamp set during the update
      expect(after).toBeDefined();
      expect(new Date(after!).getTime()).not.toBeNaN();
    });

    it('should clear dirty flag after update', async () => {
      dbMock.save.mockResolvedValue(1);
      await store.createSpec();
      store.markDirty();

      await store.updateActiveSpec({ filename: 'changed.spec.md' });

      expect(store.isDirty()).toBe(false);
    });

    it('should do nothing if no active spec', async () => {
      await store.updateActiveSpec({ filename: 'nope.spec.md' });

      expect(dbMock.save).not.toHaveBeenCalled();
    });
  });

  describe('markDirty', () => {
    it('should set isDirty to true', () => {
      expect(store.isDirty()).toBe(false);
      store.markDirty();
      expect(store.isDirty()).toBe(true);
    });
  });

  describe('deleteSpec', () => {
    it('should remove spec from db and state', async () => {
      dbMock.save.mockResolvedValue(1);
      await store.createSpec();
      expect(store.allSpecs().length).toBe(1);

      await store.deleteSpec(1);

      expect(dbMock.delete).toHaveBeenCalledWith(1);
      expect(store.allSpecs().length).toBe(0);
    });

    it('should clear activeSpec when deleting the active spec', async () => {
      dbMock.save.mockResolvedValue(5);
      await store.createSpec();
      expect(store.activeSpec()?.id).toBe(5);

      await store.deleteSpec(5);

      expect(store.activeSpec()).toBeNull();
    });

    it('should keep activeSpec when deleting a different spec', async () => {
      const specs = [makeSpec({ id: 1 }), makeSpec({ id: 2 })];
      dbMock.getAll.mockResolvedValue(specs);
      await store.loadAll();
      await store.selectSpec(2);

      await store.deleteSpec(1);

      expect(store.activeSpec()?.id).toBe(2);
    });
  });

  describe('importMarkdownFiles', () => {
    it('should parse each file and save to db', async () => {
      let nextId = 10;
      dbMock.save.mockImplementation(async () => nextId++);
      parserMock.parseMarkdown.mockReturnValue(createEmptySpec('services', 'imported.spec.md'));

      const files = [
        { name: 'one.spec.md', content: '# One', path: 'services/one.spec.md' },
        { name: 'two.spec.md', content: '# Two', path: 'models/two.spec.md' },
      ];

      const count = await store.importMarkdownFiles(files);

      expect(count).toBe(2);
      expect(parserMock.parseMarkdown).toHaveBeenCalledTimes(2);
      expect(dbMock.save).toHaveBeenCalledTimes(2);
      expect(store.allSpecs().length).toBe(2);
    });

    it('should infer suite from file path', async () => {
      dbMock.save.mockResolvedValue(1);
      parserMock.parseMarkdown.mockReturnValue(createEmptySpec('services', 'test.spec.md'));

      await store.importMarkdownFiles([
        { name: 'test.spec.md', content: '---\n---', path: 'services/test.spec.md' },
      ]);

      // Parser should be called with suite inferred from path
      expect(parserMock.parseMarkdown).toHaveBeenCalledWith('---\n---', 'test.spec.md', 'services');
    });

    it('should set githubSha when provided', async () => {
      dbMock.save.mockResolvedValue(1);
      const parsed = createEmptySpec('services', 'test.spec.md');
      parserMock.parseMarkdown.mockReturnValue(parsed);

      await store.importMarkdownFiles([
        { name: 'test.spec.md', content: '# Test', sha: 'abc123' },
      ]);

      expect(store.allSpecs()[0].githubSha).toBe('abc123');
    });

    it('should set filepath when path is provided', async () => {
      dbMock.save.mockResolvedValue(1);
      const parsed = createEmptySpec('services', 'test.spec.md');
      parserMock.parseMarkdown.mockReturnValue(parsed);

      await store.importMarkdownFiles([
        { name: 'test.spec.md', content: '# Test', path: 'specs/services/test.spec.md' },
      ]);

      expect(store.allSpecs()[0].filepath).toBe('specs/services/test.spec.md');
    });
  });

  describe('exportSpec', () => {
    it('should serialize the spec to markdown', async () => {
      dbMock.save.mockResolvedValue(1);
      await store.createSpec();
      parserMock.serializeToMarkdown.mockReturnValue('---\nmodule: exported\n---\n');

      const result = await store.exportSpec(1);

      expect(result).toBe('---\nmodule: exported\n---\n');
      expect(parserMock.serializeToMarkdown).toHaveBeenCalledOnce();
    });

    it('should return null for non-existent spec', async () => {
      const result = await store.exportSpec(999);
      expect(result).toBeNull();
    });
  });

  describe('validateActiveSpec', () => {
    it('should validate the active spec with known modules', async () => {
      const specs = [
        makeSpec({ id: 1, frontmatter: { ...createEmptySpec().frontmatter, module: 'auth' } }),
        makeSpec({ id: 2, frontmatter: { ...createEmptySpec().frontmatter, module: 'db' } }),
      ];
      dbMock.getAll.mockResolvedValue(specs);
      await store.loadAll();
      await store.selectSpec(1);

      store.validateActiveSpec();

      expect(validatorMock.validate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1 }),
        ['auth', 'db'],
      );
    });

    it('should return null when no active spec', () => {
      const result = store.validateActiveSpec();
      expect(result).toBeNull();
    });

    it('should return validation result', async () => {
      dbMock.save.mockResolvedValue(1);
      await store.createSpec();
      validatorMock.validate.mockReturnValue({ valid: false, errors: [{ level: 'error', field: 'module', message: 'Required' }] });

      const result = store.validateActiveSpec();

      expect(result!.valid).toBe(false);
      expect(result!.errors.length).toBe(1);
    });
  });

  describe('suites computed', () => {
    it('should group specs by suite name', async () => {
      const specs = [
        makeSpec({ id: 1, suite: 'models' }),
        makeSpec({ id: 2, suite: 'services' }),
        makeSpec({ id: 3, suite: 'models' }),
      ];
      dbMock.getAll.mockResolvedValue(specs);
      await store.loadAll();

      const suites = store.suites();

      expect(suites.get('models')!.length).toBe(2);
      expect(suites.get('services')!.length).toBe(1);
    });

    it('should return empty map when no specs loaded', () => {
      expect(store.suites().size).toBe(0);
    });
  });

  describe('activeSpec computed', () => {
    it('should return null when no spec is selected', () => {
      expect(store.activeSpec()).toBeNull();
    });

    it('should return the matching spec when selected', async () => {
      const specs = [makeSpec({ id: 5, filename: 'target.spec.md' })];
      dbMock.getAll.mockResolvedValue(specs);
      await store.loadAll();
      await store.selectSpec(5);

      expect(store.activeSpec()?.filename).toBe('target.spec.md');
    });
  });
});
