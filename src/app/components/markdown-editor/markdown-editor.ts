import {
  Component,
  ElementRef,
  input,
  output,
  viewChild,
  effect,
  OnDestroy,
} from '@angular/core';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';

@Component({
  selector: 'app-markdown-editor',
  standalone: true,
  templateUrl: './markdown-editor.html',
  styleUrl: './markdown-editor.scss',
})
export class MarkdownEditorComponent implements OnDestroy {
  readonly content = input.required<string>();
  readonly contentChange = output<string>();

  private readonly editorHost = viewChild.required<ElementRef<HTMLDivElement>>('editorHost');
  private view: EditorView | null = null;
  private suppressUpdate = false;

  constructor() {
    effect(() => {
      const host = this.editorHost().nativeElement;
      const value = this.content();

      if (this.view) {
        // Update content if it changed externally
        if (!this.suppressUpdate) {
          const currentContent = this.view.state.doc.toString();
          if (currentContent !== value) {
            this.view.dispatch({
              changes: { from: 0, to: currentContent.length, insert: value },
            });
          }
        }
        this.suppressUpdate = false;
        return;
      }

      this.view = new EditorView({
        state: EditorState.create({
          doc: value,
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
              '&': { height: '100%' },
              '.cm-scroller': { overflow: 'auto' },
            }),
          ],
        }),
        parent: host,
      });
    });
  }

  ngOnDestroy(): void {
    this.view?.destroy();
  }
}
