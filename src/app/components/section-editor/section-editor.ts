import {
  Component,
  ElementRef,
  input,
  output,
  viewChild,
  effect,
  OnDestroy,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { type SpecSection } from '../../models/spec.model';

@Component({
  selector: 'app-section-editor',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './section-editor.html',
  styleUrl: './section-editor.scss',
})
export class SectionEditorComponent implements OnDestroy {
  readonly section = input.required<SpecSection>();
  readonly sectionIndex = input.required<number>();
  readonly totalSections = input.required<number>();
  readonly contentChange = output<string>();
  readonly headingChange = output<string>();
  readonly navigate = output<number>(); // emit index to navigate to

  private readonly editorHost = viewChild<ElementRef<HTMLDivElement>>('sectionEditorHost');
  private view: EditorView | null = null;
  private suppressUpdate = false;
  private currentIndex = -1;

  protected readonly headingValue = signal('');

  constructor() {
    effect(() => {
      const host = this.editorHost()?.nativeElement;
      if (!host) return;

      const sec = this.section();
      const idx = this.sectionIndex();

      // If section changed, destroy old editor and create new one
      if (this.currentIndex !== idx) {
        this.destroyEditor();
        this.currentIndex = idx;
      }

      this.headingValue.set(sec.heading);

      if (this.view) {
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

      this.view = new EditorView({
        state: EditorState.create({
          doc: sec.content,
          extensions: [
            lineNumbers(),
            highlightActiveLine(),
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

  protected onHeadingChange(value: string): void {
    this.headingValue.set(value);
    this.headingChange.emit(value);
  }

  protected goPrev(): void {
    const idx = this.sectionIndex();
    if (idx > 0) {
      this.navigate.emit(idx - 1);
    } else {
      this.navigate.emit(-1); // go to frontmatter
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
