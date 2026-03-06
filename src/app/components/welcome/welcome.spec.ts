import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { WelcomeComponent } from './welcome';
import { SpecStoreService } from '../../services/spec-store.service';
import { type Spec, createEmptySpec } from '../../models/spec.model';

describe('WelcomeComponent', () => {
  let component: WelcomeComponent;
  let storeSpy: {
    createSpec: ReturnType<typeof vi.fn>;
    importMarkdownFiles: ReturnType<typeof vi.fn>;
    allSpecs: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  beforeEach(async () => {
    storeSpy = {
      createSpec: vi.fn(async () => ({ ...createEmptySpec(), id: 42 })),
      importMarkdownFiles: vi.fn(async () => 0),
      allSpecs: vi.fn(() => []),
    };

    await TestBed.configureTestingModule({
      imports: [WelcomeComponent],
      providers: [
        provideRouter([{ path: 'edit/:id', component: WelcomeComponent }]),
        { provide: SpecStoreService, useValue: storeSpy },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(WelcomeComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onCreateSpec', () => {
    it('should create spec and navigate to edit route', async () => {
      await component.onCreateSpec();
      expect(storeSpy.createSpec).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/edit', 42]);
    });

    it('should not navigate when createSpec returns no id', async () => {
      storeSpy.createSpec.mockResolvedValue({ ...createEmptySpec(), id: undefined });
      await component.onCreateSpec();
      expect(storeSpy.createSpec).toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  describe('onImport', () => {
    function createMockFile(name: string, content: string) {
      return { name, text: () => Promise.resolve(content) };
    }

    /**
     * Sets up document.createElement to return a mock input.
     * The mock captures `onchange` and triggers it synchronously on `click()`,
     * returning a promise that resolves when the async onchange handler completes.
     */
    function setupFileInput(files: { name: string; text: () => Promise<string> }[]): {
      triggerAndAwait: () => Promise<void>;
    } {
      let onchangePromise: Promise<void> | undefined;

      const createElementSpy = vi.spyOn(document, 'createElement');
      const mockInput = document.createElement('input');

      vi.spyOn(mockInput, 'click').mockImplementation(() => {
        Object.defineProperty(mockInput, 'files', { value: files, configurable: true });
        // Call onchange and capture the returned promise
        const result = mockInput.onchange?.(new Event('change'));
        if (result && typeof (result as Promise<void>).then === 'function') {
          onchangePromise = result as Promise<void>;
        }
      });

      createElementSpy.mockReturnValueOnce(mockInput);

      return {
        async triggerAndAwait() {
          await component.onImport();
          if (onchangePromise) await onchangePromise;
        },
      };
    }

    it('should import a single file and navigate to last spec', async () => {
      const spec = { ...createEmptySpec(), id: 10 } as Spec;
      storeSpy.importMarkdownFiles.mockResolvedValue(1);
      storeSpy.allSpecs.mockReturnValue([spec]);

      const { triggerAndAwait } = setupFileInput([createMockFile('auth.spec.md', '# Auth')]);
      await triggerAndAwait();

      expect(storeSpy.importMarkdownFiles).toHaveBeenCalledWith([
        { name: 'auth.spec.md', content: '# Auth' },
      ]);
      expect(router.navigate).toHaveBeenCalledWith(['/edit', 10]);
    });

    it('should import multiple files and navigate to the last spec', async () => {
      const spec1 = { ...createEmptySpec(), id: 10 } as Spec;
      const spec2 = { ...createEmptySpec(), id: 11 } as Spec;
      storeSpy.importMarkdownFiles.mockResolvedValue(2);
      storeSpy.allSpecs.mockReturnValue([spec1, spec2]);

      const { triggerAndAwait } = setupFileInput([
        createMockFile('auth.spec.md', '# Auth'),
        createMockFile('db.spec.md', '# DB'),
      ]);
      await triggerAndAwait();

      expect(storeSpy.importMarkdownFiles).toHaveBeenCalledWith([
        { name: 'auth.spec.md', content: '# Auth' },
        { name: 'db.spec.md', content: '# DB' },
      ]);
      expect(router.navigate).toHaveBeenCalledWith(['/edit', 11]);
    });

    it('should not act when file picker is cancelled (no files)', async () => {
      const createElementSpy = vi.spyOn(document, 'createElement');
      const mockInput = document.createElement('input');
      vi.spyOn(mockInput, 'click').mockImplementation(() => {
        // Simulate cancel — files is null
        Object.defineProperty(mockInput, 'files', { value: null, configurable: true });
        mockInput.onchange?.(new Event('change'));
      });
      createElementSpy.mockReturnValueOnce(mockInput);

      await component.onImport();

      expect(storeSpy.importMarkdownFiles).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should not navigate when importMarkdownFiles returns 0', async () => {
      storeSpy.importMarkdownFiles.mockResolvedValue(0);

      const { triggerAndAwait } = setupFileInput([createMockFile('empty.md', '')]);
      await triggerAndAwait();

      expect(storeSpy.importMarkdownFiles).toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should configure file input with correct attributes', async () => {
      const createElementSpy = vi.spyOn(document, 'createElement');
      const mockInput = document.createElement('input');
      vi.spyOn(mockInput, 'click').mockImplementation(() => {});
      createElementSpy.mockReturnValueOnce(mockInput);

      await component.onImport();

      expect(mockInput.type).toBe('file');
      expect(mockInput.accept).toBe('.md,.spec.md');
      expect(mockInput.multiple).toBe(true);
    });
  });
});
