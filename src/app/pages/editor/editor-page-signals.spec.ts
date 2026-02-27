/**
 * Unit tests for EditorPageComponent — computed properties & rebuildBody.
 *
 * Split from editor-page.spec.ts to stay under happy-dom's per-file
 * DOM element limit (~27 TestBed.createComponent calls).
 *
 * Tests cover:
 * - Computed: canCreatePR, editableSections, activeEditableSection
 * - Computed: knownModules, body, frontmatter
 * - rebuildBody (tested through section changes)
 */
import { type SpecFrontmatter, type SpecSection } from '../../models/spec.model';
import { makeSpec, type TestHarness, setupTestBed } from './editor-page-test-utils';

describe('EditorPageComponent — computed properties', () => {
  let h: TestHarness;

  beforeEach(async () => {
    h = await setupTestBed();
  });

  describe('canCreatePR', () => {
    it('should return true when github is connected and spec has filepath', () => {
      h.githubSpy.connected.set(true);
      h.activeSpecSignal.set(makeSpec({ filepath: 'specs/test.spec.md' }));

      expect(h.page.canCreatePR()).toBe(true);
    });

    it('should return false when github is not connected', () => {
      h.githubSpy.connected.set(false);
      h.activeSpecSignal.set(makeSpec({ filepath: 'specs/test.spec.md' }));

      expect(h.page.canCreatePR()).toBe(false);
    });

    it('should return false when spec has no filepath', () => {
      h.githubSpy.connected.set(true);
      h.activeSpecSignal.set(makeSpec({ filepath: undefined }));

      expect(h.page.canCreatePR()).toBe(false);
    });

    it('should return false when no spec is loaded', () => {
      h.githubSpy.connected.set(true);
      h.activeSpecSignal.set(null);

      expect(h.page.canCreatePR()).toBe(false);
    });
  });

  describe('editableSections', () => {
    it('should filter out level-1 sections', () => {
      h.activeSpecSignal.set(makeSpec({
        sections: [
          { heading: 'Title', level: 1, content: '' },
          { heading: 'Purpose', level: 2, content: 'text' },
          { heading: 'Sub', level: 3, content: 'nested' },
        ],
      }));

      const editables = h.page.editableSections();
      expect(editables).toHaveLength(2);
      expect(editables[0].heading).toBe('Purpose');
      expect(editables[1].heading).toBe('Sub');
    });

    it('should return empty array when no spec', () => {
      h.activeSpecSignal.set(null);

      expect(h.page.editableSections()).toEqual([]);
    });
  });

  describe('activeEditableSection', () => {
    it('should return null when activeSectionIndex is -1', () => {
      h.activeSpecSignal.set(makeSpec());
      h.page.activeSectionIndex.set(-1);

      expect(h.page.activeEditableSection()).toBeNull();
    });

    it('should return the correct section for valid index', () => {
      h.activeSpecSignal.set(makeSpec());
      h.page.activeSectionIndex.set(0);

      const section = h.page.activeEditableSection();
      expect(section).not.toBeNull();
      expect(section!.heading).toBe('Purpose');
    });

    it('should return null for out-of-range index', () => {
      h.activeSpecSignal.set(makeSpec());
      h.page.activeSectionIndex.set(99);

      expect(h.page.activeEditableSection()).toBeNull();
    });
  });

  describe('knownModules', () => {
    it('should extract and sort module names from all specs', () => {
      h.allSpecsSignal.set([
        makeSpec({ frontmatter: { ...makeSpec().frontmatter, module: 'zebra' } }),
        makeSpec({ frontmatter: { ...makeSpec().frontmatter, module: 'alpha' } }),
        makeSpec({ frontmatter: { ...makeSpec().frontmatter, module: 'middle' } }),
      ]);

      expect(h.page.knownModules()).toEqual(['alpha', 'middle', 'zebra']);
    });

    it('should filter out empty module names', () => {
      h.allSpecsSignal.set([
        makeSpec({ frontmatter: { ...makeSpec().frontmatter, module: 'valid' } }),
        makeSpec({ frontmatter: { ...makeSpec().frontmatter, module: '' } }),
      ]);

      expect(h.page.knownModules()).toEqual(['valid']);
    });
  });

  describe('body', () => {
    it('should return spec body', () => {
      h.activeSpecSignal.set(makeSpec({ body: '# Test\n\nContent' }));

      expect(h.page.body()).toBe('# Test\n\nContent');
    });

    it('should return empty string when no spec', () => {
      h.activeSpecSignal.set(null);

      expect(h.page.body()).toBe('');
    });
  });

  describe('frontmatter', () => {
    it('should return spec frontmatter', () => {
      const fm: SpecFrontmatter = { module: 'test', version: 2, status: 'active', files: ['a.ts'], db_tables: [], depends_on: [] };
      h.activeSpecSignal.set(makeSpec({ frontmatter: fm }));

      expect(h.page.frontmatter()).toEqual(fm);
    });

    it('should return default frontmatter when no spec', () => {
      h.activeSpecSignal.set(null);

      const fm = h.page.frontmatter();
      expect(fm.module).toBe('');
      expect(fm.version).toBe(1);
      expect(fm.status).toBe('draft');
    });
  });

  // ── rebuildBody (private, tested through section changes) ─────────────

  describe('rebuildBody (via section changes)', () => {
    it('should call parser.sectionsToBody with title and non-title sections', () => {
      h.activeSpecSignal.set(makeSpec());
      h.page.activeSectionIndex.set(0);

      h.page.onSectionContentChange('New content');

      expect(h.parserSpy.sectionsToBody).toHaveBeenCalled();
      const [title, sections] = h.parserSpy.sectionsToBody.mock.calls[0] as [string, SpecSection[]];
      expect(title).toBe('auth-service');
      expect(sections.every((s: SpecSection) => s.level >= 2)).toBe(true);
    });

    it('should update store with rebuilt body and sections', () => {
      h.parserSpy.sectionsToBody.mockReturnValue('## Purpose\n\nUpdated content');

      h.activeSpecSignal.set(makeSpec());
      h.page.activeSectionIndex.set(0);

      h.page.onSectionContentChange('Updated content');

      expect(h.storeSpy.updateActiveSpec).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.any(String),
          sections: expect.any(Array),
        }),
      );
    });
  });
});
