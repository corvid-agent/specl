import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SpecStoreService } from '../../services/spec-store.service';
import { SpecParserService } from '../../services/spec-parser.service';
import { FrontmatterEditorComponent } from '../../components/frontmatter-editor/frontmatter-editor';
import { MarkdownEditorComponent } from '../../components/markdown-editor/markdown-editor';
import { SpecPreviewComponent } from '../../components/spec-preview/spec-preview';
import { type SpecFrontmatter, type ValidationResult } from '../../models/spec.model';
import { generateSpecTemplate } from '../../models/spec-template';

type EditorTab = 'edit' | 'preview';

@Component({
  selector: 'app-editor-page',
  standalone: true,
  imports: [FrontmatterEditorComponent, MarkdownEditorComponent, SpecPreviewComponent],
  templateUrl: './editor-page.html',
  styleUrl: './editor-page.scss',
})
export class EditorPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(SpecStoreService);
  private readonly parser = inject(SpecParserService);

  protected readonly activeTab = signal<EditorTab>('edit');
  protected readonly validation = signal<ValidationResult | null>(null);
  protected readonly filename = signal('');

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

  ngOnInit(): void {
    this.route.params.subscribe(async (params) => {
      const id = Number(params['id']);
      if (id) {
        await this.store.selectSpec(id);
        const spec = this.store.activeSpec();
        if (spec) {
          this.filename.set(spec.filename);
          // If body is empty, generate template
          if (!spec.body || spec.body.trim() === '') {
            const template = generateSpecTemplate(spec.frontmatter);
            await this.store.updateActiveSpec({ body: template, sections: this.parser.parseMarkdown(template).sections });
          }
        }
      }
    });
  }

  protected onFrontmatterChange(fm: SpecFrontmatter): void {
    this.store.markDirty();
    const spec = this.spec();
    if (spec) {
      this.store.updateActiveSpec({ frontmatter: fm });
    }
  }

  protected onBodyChange(body: string): void {
    this.store.markDirty();
    const sections = this.parser.parseMarkdown(body).sections;
    this.store.updateActiveSpec({ body, sections });
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

  protected setTab(tab: EditorTab): void {
    if (tab === 'preview') {
      this.onValidate();
    }
    this.activeTab.set(tab);
  }
}
