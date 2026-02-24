import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SpecStoreService } from '../../services/spec-store.service';
import { SpecParserService } from '../../services/spec-parser.service';
import { GitHubService } from '../../services/github.service';
import { FrontmatterEditorComponent } from '../../components/frontmatter-editor/frontmatter-editor';
import { SectionNavComponent } from '../../components/section-nav/section-nav';
import { SectionEditorComponent } from '../../components/section-editor/section-editor';
import { SpecPreviewComponent } from '../../components/spec-preview/spec-preview';
import { type SpecFrontmatter, type SpecSection, type ValidationResult } from '../../models/spec.model';
import { generateSpecTemplate } from '../../models/spec-template';

type EditorTab = 'edit' | 'preview';

@Component({
  selector: 'app-editor-page',
  standalone: true,
  imports: [FrontmatterEditorComponent, SectionNavComponent, SectionEditorComponent, SpecPreviewComponent],
  templateUrl: './editor-page.html',
  styleUrl: './editor-page.scss',
})
export class EditorPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(SpecStoreService);
  private readonly parser = inject(SpecParserService);
  protected readonly github = inject(GitHubService);

  protected readonly activeTab = signal<EditorTab>('edit');
  protected readonly validation = signal<ValidationResult | null>(null);
  protected readonly filename = signal('');
  protected readonly activeSectionIndex = signal<number>(-1); // -1 = frontmatter
  protected readonly prUrl = signal<string | null>(null);
  protected readonly prLoading = signal(false);

  /** Mobile: whether the section nav is visible (true = showing nav, false = showing editor) */
  protected readonly mobileNavOpen = signal(true);

  protected readonly canCreatePR = computed(() => {
    const s = this.spec();
    return this.github.connected() && s?.filepath != null;
  });

  protected readonly spec = this.store.activeSpec;
  protected readonly isDirty = this.store.isDirty;

  protected readonly body = computed(() => this.spec()?.body ?? '');
  protected readonly frontmatter = computed(
    () =>
      this.spec()?.frontmatter ?? {
        module: '',
        version: 1,
        status: 'draft' as const,
        files: [],
        db_tables: [],
        depends_on: [],
      },
  );

  protected readonly sections = computed(() => this.spec()?.sections ?? []);

  // Sections excluding the level-1 title (for nav and editing)
  protected readonly editableSections = computed(() => {
    return this.sections().filter((s) => s.level >= 2);
  });

  protected readonly activeEditableSection = computed(() => {
    const idx = this.activeSectionIndex();
    const secs = this.editableSections();
    if (idx < 0 || idx >= secs.length) return null;
    return secs[idx];
  });

  ngOnInit(): void {
    this.route.params.subscribe(async (params) => {
      const id = Number(params['id']);
      if (id) {
        await this.store.selectSpec(id);
        const spec = this.store.activeSpec();
        if (spec) {
          this.filename.set(spec.filename);
          if (!spec.body || spec.body.trim() === '') {
            const template = generateSpecTemplate(spec.frontmatter);
            const sections = this.parser.parseSections(template);
            await this.store.updateActiveSpec({ body: template, sections });
          }
          this.activeSectionIndex.set(-1);
          this.mobileNavOpen.set(true);
        }
      }
    });
  }

  protected onFrontmatterChange(fm: SpecFrontmatter): void {
    this.store.markDirty();
    this.store.updateActiveSpec({ frontmatter: fm });
  }

  protected onSectionContentChange(content: string): void {
    const idx = this.activeSectionIndex();
    const allSections = [...this.sections()];
    const editables = this.editableSections();
    if (idx < 0 || idx >= editables.length) return;

    const target = editables[idx];
    const fullIndex = allSections.findIndex(
      (s) => s.heading === target.heading && s.level === target.level,
    );
    if (fullIndex === -1) return;

    allSections[fullIndex] = { ...allSections[fullIndex], content };
    this.rebuildBody(allSections);
  }

  protected onSectionHeadingChange(heading: string): void {
    const idx = this.activeSectionIndex();
    const allSections = [...this.sections()];
    const editables = this.editableSections();
    if (idx < 0 || idx >= editables.length) return;

    const target = editables[idx];
    const fullIndex = allSections.findIndex(
      (s) => s.heading === target.heading && s.level === target.level,
    );
    if (fullIndex === -1) return;

    allSections[fullIndex] = { ...allSections[fullIndex], heading };
    this.rebuildBody(allSections);
  }

  protected onNavigate(index: number): void {
    this.activeSectionIndex.set(index);
    // On mobile, selecting a section hides the nav and shows the editor
    if (window.innerWidth < 768) {
      this.mobileNavOpen.set(false);
    }
  }

  protected onBackToNav(): void {
    this.mobileNavOpen.set(true);
  }

  protected onFilenameChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const filename = input.value.trim() || 'untitled.spec.md';
    this.filename.set(filename);
    this.store.updateActiveSpec({ filename });
  }

  protected onValidate(): void {
    this.validation.set(this.store.validateActiveSpec());
  }

  protected async onExport(): Promise<void> {
    const spec = this.spec();
    if (!spec?.id) return;

    const content = await this.store.exportSpec(spec.id);
    if (!content) return;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = spec.filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  protected async onCreatePR(): Promise<void> {
    const s = this.spec();
    if (!s?.id || !s.filepath) return;

    const content = await this.store.exportSpec(s.id);
    if (!content) return;

    this.prLoading.set(true);
    this.prUrl.set(null);

    try {
      const title = `docs: update ${s.filename}`;
      const description = [
        `Updates spec \`${s.frontmatter.module}\` (v${s.frontmatter.version}).`,
        '',
        `**File:** \`${s.filepath}\``,
        `**Status:** ${s.frontmatter.status}`,
        '',
        'Created with [Specl](https://github.com/corvid-agent/specl)',
      ].join('\n');

      const pr = await this.github.createSpecPR(
        s.filepath,
        content,
        s.githubSha,
        title,
        description,
      );

      this.prUrl.set(pr.html_url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'PR creation failed';
      this.github['_error'].set(msg);
    } finally {
      this.prLoading.set(false);
    }
  }

  protected setTab(tab: EditorTab): void {
    if (tab === 'preview') {
      this.onValidate();
    }
    this.activeTab.set(tab);
  }

  private rebuildBody(sections: SpecSection[]): void {
    this.store.markDirty();
    const titleSection = sections.find((s) => s.level === 1);
    const titleText = titleSection?.heading ?? this.frontmatter().module ?? '';
    const nonTitleSections = sections.filter((s) => s.level >= 2);
    const body = this.parser.sectionsToBody(titleText, nonTitleSections);
    this.store.updateActiveSpec({ body, sections });
  }
}
