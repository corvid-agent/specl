/**
 * Unit tests for EditorPageComponent — export, PR creation, and ngOnInit edge cases.
 *
 * Split from editor-page.spec.ts to stay under happy-dom's per-file
 * DOM element limit (~27 TestBed.createComponent calls).
 */
import { type SpecFrontmatter, type SpecSection } from '../../models/spec.model';
import { makeSpec, type TestHarness, setupTestBed } from './editor-page-test-utils';

// ══════════════════════════════════════════════════════════════════════════
// ngOnInit edge case (requires separate TestBed with different routeId)
// ══════════════════════════════════════════════════════════════════════════

describe('EditorPageComponent — ngOnInit edge case', () => {
  it('should not call selectSpec for id=0', async () => {
    const h = await setupTestBed({ routeId: '0' });
    h.page.ngOnInit();

    await vi.waitFor(() => {
      expect(h.storeSpy.selectSpec).not.toHaveBeenCalled();
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Export
// ══════════════════════════════════════════════════════════════════════════

describe('EditorPageComponent — onExport', () => {
  let h: TestHarness;

  beforeEach(async () => {
    h = await setupTestBed();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call store.exportSpec with spec id', async () => {
    h.activeSpecSignal.set(makeSpec({ id: 42 }));

    const clickSpy = vi.fn();
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        return { set href(_: string) {}, set download(_: string) {}, click: clickSpy } as unknown as HTMLAnchorElement;
      }
      return origCreateElement(tag);
    });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    await h.page.onExport();

    expect(h.storeSpy.exportSpec).toHaveBeenCalledWith(42);
    expect(clickSpy).toHaveBeenCalled();
  });

  it('should return early when spec has no id', async () => {
    h.activeSpecSignal.set(makeSpec({ id: undefined }));

    await h.page.onExport();

    expect(h.storeSpy.exportSpec).not.toHaveBeenCalled();
  });

  it('should return early when exportSpec returns no content', async () => {
    h.activeSpecSignal.set(makeSpec({ id: 1 }));
    h.storeSpy.exportSpec.mockResolvedValue(null);

    const clickSpy = vi.fn();
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        return { click: clickSpy } as unknown as HTMLAnchorElement;
      }
      return origCreateElement(tag);
    });

    await h.page.onExport();

    expect(clickSpy).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════
// PR creation
// ══════════════════════════════════════════════════════════════════════════

describe('EditorPageComponent — onCreatePR', () => {
  let h: TestHarness;

  beforeEach(async () => {
    h = await setupTestBed();
  });

  it('should create PR and set prUrl on success', async () => {
    h.activeSpecSignal.set(makeSpec({
      id: 1,
      filepath: 'specs/auth.spec.md',
      githubSha: 'abc123',
    }));

    await h.page.onCreatePR();

    expect(h.githubSpy.createSpecPR).toHaveBeenCalledWith(
      'specs/auth.spec.md',
      expect.any(String),
      'abc123',
      expect.stringContaining('update auth.spec.md'),
      expect.any(String),
    );
    expect(h.page.prUrl()).toBe('https://github.com/owner/repo/pull/42');
  });

  it('should set prLoading during PR creation', async () => {
    let loadingDuringCall = false;
    h.githubSpy.createSpecPR.mockImplementation(async () => {
      loadingDuringCall = h.page.prLoading() as boolean;
      return { html_url: 'https://github.com/owner/repo/pull/1' };
    });

    h.activeSpecSignal.set(makeSpec({ id: 1, filepath: 'specs/test.spec.md' }));

    await h.page.onCreatePR();

    expect(loadingDuringCall).toBe(true);
    expect(h.page.prLoading()).toBe(false);
  });

  it('should set github error on failure', async () => {
    h.githubSpy.createSpecPR.mockRejectedValue(new Error('API rate limit exceeded'));

    h.activeSpecSignal.set(makeSpec({ id: 1, filepath: 'specs/test.spec.md' }));

    await h.page.onCreatePR();

    expect(h.githubSpy._error()).toBe('API rate limit exceeded');
    expect(h.page.prLoading()).toBe(false);
  });

  it('should handle non-Error exceptions', async () => {
    h.githubSpy.createSpecPR.mockRejectedValue('string error');

    h.activeSpecSignal.set(makeSpec({ id: 1, filepath: 'specs/test.spec.md' }));

    await h.page.onCreatePR();

    expect(h.githubSpy._error()).toBe('PR creation failed');
  });

  it('should return early when spec has no id', async () => {
    h.activeSpecSignal.set(makeSpec({ id: undefined }));

    await h.page.onCreatePR();

    expect(h.githubSpy.createSpecPR).not.toHaveBeenCalled();
  });

  it('should return early when spec has no filepath', async () => {
    h.activeSpecSignal.set(makeSpec({ id: 1, filepath: undefined }));

    await h.page.onCreatePR();

    expect(h.githubSpy.createSpecPR).not.toHaveBeenCalled();
  });

  it('should clear prUrl before new PR creation', async () => {
    h.page.prUrl.set('https://old-url');

    h.activeSpecSignal.set(makeSpec({ id: 1, filepath: 'specs/test.spec.md' }));

    await h.page.onCreatePR();

    expect(h.page.prUrl()).toBe('https://github.com/owner/repo/pull/42');
  });

  it('should include module name and version in PR description', async () => {
    h.activeSpecSignal.set(makeSpec({
      id: 1,
      filepath: 'specs/auth.spec.md',
      frontmatter: {
        module: 'auth-service',
        version: 3,
        status: 'active',
        files: [],
        db_tables: [],
        depends_on: [],
      },
    }));

    await h.page.onCreatePR();

    const description = h.githubSpy.createSpecPR.mock.calls[0][4] as string;
    expect(description).toContain('auth-service');
    expect(description).toContain('v3');
  });
});
