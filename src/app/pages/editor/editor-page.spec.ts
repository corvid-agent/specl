/**
 * Unit tests for EditorPageComponent — behavior & method tests.
 *
 * Tests cover:
 * - Component initialization and route parameter handling
 * - Tab switching between edit and preview
 * - Validation triggering
 * - Frontmatter change propagation
 * - Section content and heading change propagation
 * - Navigation and mobile nav
 * - Filename editing
 *
 * Computed property tests live in editor-page-computed.spec.ts to stay
 * under happy-dom's per-file DOM element limit.
 */
import {
  type SpecFrontmatter,
  type ValidationResult,
} from '../../models/spec.model';
import { makeSpec, type TestHarness, setupTestBed } from './editor-page-test-utils';

// ══════════════════════════════════════════════════════════════════════════
// Behavior / method tests
// ══════════════════════════════════════════════════════════════════════════

describe('EditorPageComponent', () => {
  let h: TestHarness;

  beforeEach(async () => {
    h = await setupTestBed();
  });

  // ── Creation ───────────────────────────────────────────────────────────

  it('should create', () => {
    expect(h.page).toBeTruthy();
  });

  // ── Initialization ─────────────────────────────────────────────────────

  describe('ngOnInit', () => {
    it('should select spec from route params', async () => {
      const spec = makeSpec();
      h.storeSpy.selectSpec.mockImplementation(async () => {
        h.activeSpecSignal.set(spec);
      });

      h.page.ngOnInit();
      await vi.waitFor(() => expect(h.storeSpy.selectSpec).toHaveBeenCalledWith(1));
    });

    it('should set filename from loaded spec', async () => {
      const spec = makeSpec({ filename: 'my-spec.md' });
      h.storeSpy.selectSpec.mockImplementation(async () => {
        h.activeSpecSignal.set(spec);
      });

      h.page.ngOnInit();
      await vi.waitFor(() => {
        expect(h.page.filename()).toBe('my-spec.md');
      });
    });

    it('should generate template when spec body is empty', async () => {
      const spec = makeSpec({ body: '' });
      h.storeSpy.selectSpec.mockImplementation(async () => {
        h.activeSpecSignal.set(spec);
      });

      h.page.ngOnInit();
      await vi.waitFor(() => {
        expect(h.parserSpy.parseSections).toHaveBeenCalled();
        expect(h.storeSpy.updateActiveSpec).toHaveBeenCalled();
      });
    });

    it('should not generate template when spec body has content', async () => {
      const spec = makeSpec({ body: '# Module\n\n## Purpose\n\nContent here.' });
      h.storeSpy.selectSpec.mockImplementation(async () => {
        h.activeSpecSignal.set(spec);
      });

      h.page.ngOnInit();
      await vi.waitFor(() => expect(h.storeSpy.selectSpec).toHaveBeenCalled());

      expect(h.parserSpy.parseSections).not.toHaveBeenCalled();
    });

    it('should set activeSectionIndex to -1 (frontmatter)', async () => {
      const spec = makeSpec();
      h.storeSpy.selectSpec.mockImplementation(async () => {
        h.activeSpecSignal.set(spec);
      });

      h.page.ngOnInit();
      await vi.waitFor(() => expect(h.storeSpy.selectSpec).toHaveBeenCalled());

      expect(h.page.activeSectionIndex()).toBe(-1);
    });

    // The 'should not call selectSpec for id=0' test is in
    // editor-page-computed.spec.ts because it requires a separate
    // setupTestBed({ routeId: '0' }) call which would exceed
    // happy-dom's per-file DOM element limit.
  });

  // ── Tab switching ─────────────────────────────────────────────────────

  describe('setTab', () => {
    it('should switch to edit tab', () => {
      h.page.setTab('edit');
      expect(h.page.activeTab()).toBe('edit');
    });

    it('should switch to preview tab', () => {
      h.page.setTab('preview');
      expect(h.page.activeTab()).toBe('preview');
    });

    it('should trigger validation when switching to preview', () => {
      h.page.setTab('preview');
      expect(h.storeSpy.validateActiveSpec).toHaveBeenCalled();
    });

    it('should not trigger validation when switching to edit', () => {
      h.page.setTab('edit');
      expect(h.storeSpy.validateActiveSpec).not.toHaveBeenCalled();
    });
  });

  // ── Validation ────────────────────────────────────────────────────────

  describe('onValidate', () => {
    it('should set validation result from store', () => {
      const result: ValidationResult = {
        valid: false,
        errors: [{ level: 'error', field: 'module', message: 'Module is required' }],
      };
      h.storeSpy.validateActiveSpec.mockReturnValue(result);

      h.page.onValidate();

      expect(h.page.validation()).toEqual(result);
    });

    it('should set validation to null when store returns null', () => {
      h.storeSpy.validateActiveSpec.mockReturnValue(null);

      h.page.onValidate();

      expect(h.page.validation()).toBeNull();
    });
  });

  // ── Frontmatter changes ───────────────────────────────────────────────

  describe('onFrontmatterChange', () => {
    it('should mark store as dirty', () => {
      const fm: SpecFrontmatter = { module: 'updated', version: 2, status: 'active', files: [], db_tables: [], depends_on: [] };

      h.page.onFrontmatterChange(fm);

      expect(h.storeSpy.markDirty).toHaveBeenCalled();
    });

    it('should update active spec with new frontmatter', () => {
      const fm: SpecFrontmatter = { module: 'updated', version: 2, status: 'active', files: [], db_tables: [], depends_on: [] };

      h.page.onFrontmatterChange(fm);

      expect(h.storeSpy.updateActiveSpec).toHaveBeenCalledWith({ frontmatter: fm });
    });
  });

  // ── Section content changes ───────────────────────────────────────────

  describe('onSectionContentChange', () => {
    beforeEach(() => {
      h.activeSpecSignal.set(makeSpec());
    });

    it('should update section content and rebuild body', () => {
      h.page.activeSectionIndex.set(0);

      h.page.onSectionContentChange('Updated content');

      expect(h.storeSpy.markDirty).toHaveBeenCalled();
      expect(h.parserSpy.sectionsToBody).toHaveBeenCalled();
      expect(h.storeSpy.updateActiveSpec).toHaveBeenCalled();
    });

    it('should not update when activeSectionIndex is -1 (frontmatter)', () => {
      h.page.activeSectionIndex.set(-1);

      h.page.onSectionContentChange('content');

      expect(h.storeSpy.markDirty).not.toHaveBeenCalled();
    });

    it('should not update when activeSectionIndex is out of range', () => {
      h.page.activeSectionIndex.set(99);

      h.page.onSectionContentChange('content');

      expect(h.storeSpy.markDirty).not.toHaveBeenCalled();
    });
  });

  // ── Section heading changes ───────────────────────────────────────────

  describe('onSectionHeadingChange', () => {
    beforeEach(() => {
      h.activeSpecSignal.set(makeSpec());
    });

    it('should update section heading and rebuild body', () => {
      h.page.activeSectionIndex.set(0);

      h.page.onSectionHeadingChange('New Heading');

      expect(h.storeSpy.markDirty).toHaveBeenCalled();
      expect(h.parserSpy.sectionsToBody).toHaveBeenCalled();
    });

    it('should not update when activeSectionIndex is -1', () => {
      h.page.activeSectionIndex.set(-1);

      h.page.onSectionHeadingChange('New');

      expect(h.storeSpy.markDirty).not.toHaveBeenCalled();
    });
  });

  // ── Navigation ────────────────────────────────────────────────────────

  describe('onNavigate', () => {
    it('should set activeSectionIndex', () => {
      h.page.onNavigate(2);

      expect(h.page.activeSectionIndex()).toBe(2);
    });

    it('should close mobile nav on small screens', () => {
      Object.defineProperty(window, 'innerWidth', { value: 500, writable: true, configurable: true });

      h.page.onNavigate(0);

      expect(h.page.mobileNavOpen()).toBe(false);

      Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true, configurable: true });
    });

    it('should not close nav on wide screens', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true, configurable: true });

      h.page.onNavigate(0);

      expect(h.page.mobileNavOpen()).toBe(true);
    });
  });

  describe('onBackToNav', () => {
    it('should set mobileNavOpen to true', () => {
      h.page.mobileNavOpen.set(false);

      h.page.onBackToNav();

      expect(h.page.mobileNavOpen()).toBe(true);
    });
  });

  // ── Filename editing ──────────────────────────────────────────────────

  describe('onFilenameChange', () => {
    it('should update filename signal and store', () => {
      const event = { target: { value: 'new-name.spec.md' } } as unknown as Event;

      h.page.onFilenameChange(event);

      expect(h.page.filename()).toBe('new-name.spec.md');
      expect(h.storeSpy.updateActiveSpec).toHaveBeenCalledWith({ filename: 'new-name.spec.md' });
    });

    it('should default to "untitled.spec.md" for empty input', () => {
      const event = { target: { value: '' } } as unknown as Event;

      h.page.onFilenameChange(event);

      expect(h.page.filename()).toBe('untitled.spec.md');
      expect(h.storeSpy.updateActiveSpec).toHaveBeenCalledWith({ filename: 'untitled.spec.md' });
    });

    it('should trim whitespace from filename', () => {
      const event = { target: { value: '  spaced.spec.md  ' } } as unknown as Event;

      h.page.onFilenameChange(event);

      expect(h.page.filename()).toBe('spaced.spec.md');
    });
  });

  // Export tests are in editor-page-computed.spec.ts to stay under the DOM limit.
});
