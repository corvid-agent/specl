import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SpecListComponent } from './spec-list';
import { SpecStoreService } from '../../services/spec-store.service';
import { type Spec, createEmptySpec } from '../../models/spec.model';

function makeSpec(overrides: Partial<Spec> = {}): Spec {
  const base = createEmptySpec('services', 'auth.spec.md');
  base.id = 1;
  base.frontmatter.module = 'auth-service';
  base.frontmatter.status = 'active';
  base.body = 'Provides authentication for the app.\n\n## Purpose\n\nAuth stuff here.';
  return { ...base, ...overrides };
}

describe('SpecListComponent', () => {
  let component: SpecListComponent;
  let storeSpy: {
    suites: ReturnType<typeof vi.fn>;
    allSpecs: ReturnType<typeof vi.fn>;
    activeSpec: ReturnType<typeof vi.fn>;
    createSpec: ReturnType<typeof vi.fn>;
    selectSpec: ReturnType<typeof vi.fn>;
    deleteSpec: ReturnType<typeof vi.fn>;
    importMarkdownFiles: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  beforeEach(async () => {
    const spec1 = makeSpec({ id: 1, suite: 'services', filename: 'auth.spec.md' });
    const spec2 = makeSpec({
      id: 2,
      suite: 'services',
      filename: 'db.spec.md',
      frontmatter: { ...spec1.frontmatter, module: 'db-service' },
    });
    const spec3 = makeSpec({
      id: 3,
      suite: 'models',
      filename: 'user.spec.md',
      frontmatter: { ...spec1.frontmatter, module: 'user-model' },
    });

    const suitesMap = new Map<string, Spec[]>();
    suitesMap.set('services', [spec1, spec2]);
    suitesMap.set('models', [spec3]);

    storeSpy = {
      suites: vi.fn(() => suitesMap),
      allSpecs: vi.fn(() => [spec1, spec2, spec3]),
      activeSpec: vi.fn(() => null),
      createSpec: vi.fn(async () => ({ ...createEmptySpec(), id: 99 })),
      selectSpec: vi.fn(async () => {}),
      deleteSpec: vi.fn(async () => {}),
      importMarkdownFiles: vi.fn(async () => 0),
    };

    await TestBed.configureTestingModule({
      imports: [SpecListComponent],
      providers: [
        provideRouter([{ path: 'edit/:id', component: SpecListComponent }]),
        { provide: SpecStoreService, useValue: storeSpy },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SpecListComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle suite collapsed state', () => {
    expect(component.isSuiteCollapsed('services')).toBe(false);
    component.toggleSuite('services');
    expect(component.isSuiteCollapsed('services')).toBe(true);
    component.toggleSuite('services');
    expect(component.isSuiteCollapsed('services')).toBe(false);
  });

  it('should not affect other suites when toggling one', () => {
    component.toggleSuite('services');
    expect(component.isSuiteCollapsed('services')).toBe(true);
    expect(component.isSuiteCollapsed('models')).toBe(false);
  });

  it('should extract preview from spec body', () => {
    const spec = makeSpec({ body: 'Provides authentication for the app.\n\n## Purpose' });
    const preview = component.getPreview(spec);
    expect(preview).toBe('Provides authentication for the app.');
  });

  it('should truncate long previews to 80 chars', () => {
    const longText = 'A'.repeat(100);
    const spec = makeSpec({ body: longText });
    const preview = component.getPreview(spec);
    expect(preview.length).toBe(83); // 80 + '...'
    expect(preview.endsWith('...')).toBe(true);
  });

  it('should return "No description" for empty body', () => {
    const spec = makeSpec({ body: '' });
    expect(component.getPreview(spec)).toBe('No description');
  });

  it('should skip heading lines in preview', () => {
    const spec = makeSpec({ body: '# Title\n\nActual content here' });
    expect(component.getPreview(spec)).toBe('Actual content here');
  });

  it('should skip table and separator lines in preview', () => {
    const spec = makeSpec({ body: '---\n| Col |\nReal text' });
    // The preview skips --- and | lines, returns the first plain-text line
    expect(component.getPreview(spec)).toBe('Real text');
  });

  it('should create spec and navigate', async () => {
    await component.onCreateSpec();
    expect(storeSpy.createSpec).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/edit', 99]);
  });

  it('should select spec and navigate', async () => {
    await component.onSelectSpec(5);
    expect(storeSpy.selectSpec).toHaveBeenCalledWith(5);
    expect(router.navigate).toHaveBeenCalledWith(['/edit', 5]);
  });

  it('should delete spec with stopPropagation', async () => {
    const event = { stopPropagation: vi.fn() } as unknown as Event;
    await component.onDeleteSpec(event, 1);
    expect(event.stopPropagation).toHaveBeenCalled();
    expect(storeSpy.deleteSpec).toHaveBeenCalledWith(1);
  });
});
