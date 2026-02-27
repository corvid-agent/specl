import {
  Component,
  ElementRef,
  input,
  output,
  viewChild,
  effect,
  OnDestroy,
  signal,
  computed,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { type SpecSection } from '../../models/spec.model';
import {
  type ContentBlock,
  type MarkdownTable,
  parseContentBlocks,
  serializeContentBlocks,
} from '../../models/markdown-table';
import { TableEditorComponent } from '../table-editor/table-editor';

@Component({
  selector: 'app-section-editor',
  standalone: true,
  imports: [FormsModule, TableEditorComponent],
  templateUrl: './section-editor.html',
  styleUrl: './section-editor.scss',
})
export class SectionEditorComponent implements OnDestroy {
  readonly section = input.required<SpecSection>();
  readonly sectionIndex = input.required<number>();
  readonly totalSections = input.required<number>();
  readonly contentChange = output<string>();
  readonly headingChange = output<string>();
  readonly navigate = output<number>();

  private readonly editorHost = viewChild<ElementRef<HTMLDivElement>>('sectionEditorHost');
  private view: EditorView | null = null;
  private suppressUpdate = false;
  private suppressBlockParse = false;
  private currentIndex = -1;

  protected readonly headingValue = signal('');

  /** Parsed content blocks for structured editing mode */
  protected readonly contentBlocks = signal<ContentBlock[]>([]);

  /** Whether this section has any tables (and should use structured mode) */
  protected readonly hasTable = computed(() =>
    this.contentBlocks().some((b) => b.type === 'table'),
  );

  constructor() {
    effect(() => {
      const sec = this.section();
      const idx = this.sectionIndex();

      // Parse content blocks on every section change (unless change came from structured editor)
      if (this.suppressBlockParse) {
        this.suppressBlockParse = false;
      } else {
        const blocks = parseContentBlocks(sec.content);
        this.contentBlocks.set(blocks);
      }

      this.headingValue.set(sec.heading);

      // If section changed, reset
      if (this.currentIndex !== idx) {
        this.destroyEditor();
        this.currentIndex = idx;
      }
    });

    // Separate effect for CodeMirror — only runs when NOT in structured mode
    effect(() => {
      const host = this.editorHost()?.nativeElement;
      if (!host) return; // host doesn't exist (structured mode or not rendered yet)

      const sec = this.section();
      const idx = this.sectionIndex();

      if (this.hasTable()) {
        this.destroyEditor();
        return;
      }

      // Same index — update existing editor if needed
      if (this.view && this.currentIndex === idx) {
        if (!this.suppressUpdate) {
          const current = this.view.state.doc.toString();
          if (current !== sec.content) {
            this.view.dispatch({
              changes: { from: 0, to: current.length, insert: sec.content },
            });
          }
        }
        this.suppressUpdate = false;
        return;
      }

      this.destroyEditor();

      this.view = new EditorView({
        state: EditorState.create({
          doc: sec.content,
          extensions: [
            lineNumbers(),
            highlightActiveLine(),
            EditorView.lineWrapping,
            history(),
            keymap.of([...defaultKeymap, ...historyKeymap]),
            markdown(),
            syntaxHighlighting(defaultHighlightStyle),
            oneDark,
            EditorView.updateListener.of((update) => {
              if (update.docChanged) {
                this.suppressUpdate = true;
                this.contentChange.emit(update.state.doc.toString());
              }
            }),
            EditorView.theme({
              '&': { height: '100%', fontSize: '14px' },
              '.cm-scroller': { overflow: 'auto', padding: '8px 0' },
              '.cm-content': { padding: '0 4px' },
            }),
          ],
        }),
        parent: host,
      });
    });
  }

  ngOnDestroy(): void {
    this.destroyEditor();
  }

  private destroyEditor(): void {
    this.view?.destroy();
    this.view = null;
  }

  /** Emit full serialized content from structured blocks */
  private emitFromBlocks(blocks: ContentBlock[]): void {
    this.contentBlocks.set(blocks);
    const content = serializeContentBlocks(blocks);
    this.suppressUpdate = true;
    this.suppressBlockParse = true;
    this.contentChange.emit(content);
  }

  protected onTableChange(blockIndex: number, table: MarkdownTable): void {
    const blocks = this.contentBlocks().map((b, i) =>
      i === blockIndex ? { ...b, table } : b,
    );
    this.emitFromBlocks(blocks);
  }

  protected onTextBlockChange(blockIndex: number, text: string): void {
    const blocks = this.contentBlocks().map((b, i) =>
      i === blockIndex ? { ...b, text } : b,
    );
    this.emitFromBlocks(blocks);
  }

  protected onHeadingChange(value: string): void {
    this.headingValue.set(value);
    this.headingChange.emit(value);
  }

  protected goPrev(): void {
    const idx = this.sectionIndex();
    if (idx > 0) {
      this.navigate.emit(idx - 1);
    } else {
      this.navigate.emit(-1);
    }
  }

  protected goNext(): void {
    const idx = this.sectionIndex();
    if (idx < this.totalSections() - 1) {
      this.navigate.emit(idx + 1);
    }
  }

  protected get hasPrev(): boolean {
    return this.sectionIndex() >= 0;
  }

  protected get hasNext(): boolean {
    return this.sectionIndex() < this.totalSections() - 1;
  }
}
