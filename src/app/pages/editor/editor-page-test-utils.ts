/**
 * Shared test utilities for EditorPageComponent spec files.
 *
 * Extracted to avoid duplicating setup across editor-page.spec.ts and
 * editor-page-computed.spec.ts (split to work around happy-dom's
 * per-file DOM element limit).
 */
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, type Params } from '@angular/router';
import { type Signal, type WritableSignal, signal } from '@angular/core';
import { of, type Observable } from 'rxjs';
import { EditorPageComponent } from './editor-page';
import { SpecStoreService } from '../../services/spec-store.service';
import { SpecParserService } from '../../services/spec-parser.service';
import { GitHubService } from '../../services/github.service';
import {
  type Spec,
  type SpecFrontmatter,
  type SpecSection,
  type ValidationResult,
  createEmptySpec,
} from '../../models/spec.model';

// ── Type helper for accessing protected members in tests ─────────────────

export interface EditorPageTestable {
  activeTab: WritableSignal<'edit' | 'preview'>;
  validation: WritableSignal<ValidationResult | null>;
  filename: WritableSignal<string>;
  activeSectionIndex: WritableSignal<number>;
  prUrl: WritableSignal<string | null>;
  prLoading: WritableSignal<boolean>;
  mobileNavOpen: WritableSignal<boolean>;
  canCreatePR: Signal<boolean>;
  spec: Signal<Spec | null>;
  isDirty: Signal<boolean>;
  body: Signal<string>;
  frontmatter: Signal<SpecFrontmatter>;
  sections: Signal<SpecSection[]>;
  knownModules: Signal<string[]>;
  editableSections: Signal<SpecSection[]>;
  activeEditableSection: Signal<SpecSection | null>;
  setTab: (tab: 'edit' | 'preview') => void;
  onValidate: () => void;
  onFrontmatterChange: (fm: SpecFrontmatter) => void;
  onSectionContentChange: (content: string) => void;
  onSectionHeadingChange: (heading: string) => void;
  onNavigate: (index: number) => void;
  onBackToNav: () => void;
  onFilenameChange: (event: Event) => void;
  onExport: () => Promise<void>;
  onCreatePR: () => Promise<void>;
  ngOnInit: () => void;
}

// ── Helper ───────────────────────────────────────────────────────────────

export function makeSpec(overrides: Partial<Spec> = {}): Spec {
  const base = createEmptySpec('services', 'auth.spec.md');
  base.id = 1;
  base.frontmatter.module = 'auth-service';
  base.frontmatter.status = 'active';
  base.body = '# auth-service\n\n## Purpose\n\nHandles authentication.\n\n## Public API\n\nExports functions.';
  base.sections = [
    { heading: 'auth-service', level: 1, content: '' },
    { heading: 'Purpose', level: 2, content: 'Handles authentication.' },
    { heading: 'Public API', level: 2, content: 'Exports functions.' },
  ];
  return { ...base, ...overrides };
}

export interface TestHarness {
  page: EditorPageTestable;
  activeSpecSignal: WritableSignal<Spec | null>;
  isDirtySignal: WritableSignal<boolean>;
  allSpecsSignal: WritableSignal<Spec[]>;
  storeSpy: {
    activeSpec: WritableSignal<Spec | null>;
    isDirty: WritableSignal<boolean>;
    allSpecs: WritableSignal<Spec[]>;
    selectSpec: ReturnType<typeof vi.fn>;
    updateActiveSpec: ReturnType<typeof vi.fn>;
    markDirty: ReturnType<typeof vi.fn>;
    validateActiveSpec: ReturnType<typeof vi.fn>;
    exportSpec: ReturnType<typeof vi.fn>;
  };
  parserSpy: {
    parseSections: ReturnType<typeof vi.fn>;
    sectionsToBody: ReturnType<typeof vi.fn>;
  };
  githubSpy: {
    connected: WritableSignal<boolean>;
    createSpecPR: ReturnType<typeof vi.fn>;
    _error: WritableSignal<string | null>;
  };
}

export async function setupTestBed(opts?: { routeId?: string }): Promise<TestHarness> {
  TestBed.resetTestingModule();
  const activeSpecSignal = signal<Spec | null>(null);
  const isDirtySignal = signal(false);
  const allSpecsSignal = signal<Spec[]>([]);

  const storeSpy = {
    activeSpec: activeSpecSignal,
    isDirty: isDirtySignal,
    allSpecs: allSpecsSignal,
    selectSpec: vi.fn(async () => {}),
    updateActiveSpec: vi.fn(async () => {}),
    markDirty: vi.fn(),
    validateActiveSpec: vi.fn(() => ({ valid: true, errors: [] } as ValidationResult)),
    exportSpec: vi.fn(async () => '---\nmodule: auth\n---\n# auth\n'),
  };

  const parserSpy = {
    parseSections: vi.fn(() => [
      { heading: 'auth-service', level: 1, content: '' },
      { heading: 'Purpose', level: 2, content: 'Template content.' },
    ]),
    sectionsToBody: vi.fn((_title: string, sections: SpecSection[]) =>
      sections.map((s) => `## ${s.heading}\n\n${s.content}`).join('\n\n'),
    ),
  };

  const githubSpy = {
    connected: signal(false),
    createSpecPR: vi.fn(async () => ({ html_url: 'https://github.com/owner/repo/pull/42' })),
    _error: signal<string | null>(null),
  };

  const routeParams$: Observable<Params> = of({ id: opts?.routeId ?? '1' });

  await TestBed.configureTestingModule({
    imports: [EditorPageComponent],
    providers: [
      { provide: SpecStoreService, useValue: storeSpy },
      { provide: SpecParserService, useValue: parserSpy },
      { provide: GitHubService, useValue: githubSpy },
      { provide: ActivatedRoute, useValue: { params: routeParams$ } },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(EditorPageComponent);
  const page = fixture.componentInstance as unknown as EditorPageTestable;

  return { page, activeSpecSignal, isDirtySignal, allSpecsSignal, storeSpy, parserSpy, githubSpy };
}
