import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { MarkdownEditorComponent } from './markdown-editor';

@Component({
  standalone: true,
  imports: [MarkdownEditorComponent],
  template: `<app-markdown-editor [content]="content()" (contentChange)="onContentChange($event)" />`,
})
class TestHostComponent {
  content = signal('# Hello');
  lastContentChange: string | null = null;

  onContentChange(value: string): void {
    this.lastContentChange = value;
  }
}

function getEditor(fixture: ComponentFixture<TestHostComponent>): MarkdownEditorComponent {
  return fixture.debugElement.children[0].componentInstance as MarkdownEditorComponent;
}

describe('MarkdownEditorComponent', () => {
  let host: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  // --- Creation ---

  it('should create', () => {
    expect(getEditor(fixture)).toBeTruthy();
  });

  it('should create an EditorView on initial render', () => {
    const comp = getEditor(fixture);
    expect(comp['view']).toBeTruthy();
  });

  it('should initialize with the provided content', () => {
    const comp = getEditor(fixture);
    const doc = comp['view']!.state.doc.toString();
    expect(doc).toBe('# Hello');
  });

  it('should render the editor host element', () => {
    const editorHost = fixture.nativeElement.querySelector('.editor-host');
    expect(editorHost).toBeTruthy();
  });

  it('should have aria-label on the editor', () => {
    const cmContent = fixture.nativeElement.querySelector('[aria-label="Markdown editor"]');
    expect(cmContent).toBeTruthy();
  });

  // --- Content change emission ---

  it('should emit contentChange when the document changes via dispatch', () => {
    const comp = getEditor(fixture);
    const view = comp['view']!;

    // Simulate a user edit by dispatching a transaction
    view.dispatch({
      changes: { from: view.state.doc.length, insert: '\nWorld' },
    });

    expect(host.lastContentChange).toBe('# Hello\nWorld');
  });

  it('should set suppressUpdate when document changes', () => {
    const comp = getEditor(fixture);
    const view = comp['view']!;

    view.dispatch({
      changes: { from: view.state.doc.length, insert: '!' },
    });

    expect(comp['suppressUpdate']).toBe(true);
  });

  // --- External content sync ---

  it('should sync editor when content input changes externally', async () => {
    const comp = getEditor(fixture);

    host.content.set('# World');
    fixture.detectChanges();
    await fixture.whenStable();

    const doc = comp['view']!.state.doc.toString();
    expect(doc).toBe('# World');
  });

  // --- Identical content no-op ---

  it('should not dispatch when content is identical', async () => {
    const comp = getEditor(fixture);
    const view = comp['view']!;
    const dispatchSpy = vi.spyOn(view, 'dispatch');

    // Set content to the same value
    host.content.set('# Hello');
    fixture.detectChanges();
    await fixture.whenStable();

    // dispatch should not have been called since the content is the same
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  // --- Suppress flag prevents feedback loop ---

  it('should skip dispatch when suppressUpdate is true', async () => {
    const comp = getEditor(fixture);
    const view = comp['view']!;

    // Simulate user typing (sets suppressUpdate = true)
    view.dispatch({
      changes: { from: view.state.doc.length, insert: '!' },
    });
    expect(comp['suppressUpdate']).toBe(true);

    const dispatchSpy = vi.spyOn(view, 'dispatch');

    // Parent reacts to contentChange by updating content input
    host.content.set(view.state.doc.toString());
    fixture.detectChanges();
    await fixture.whenStable();

    // Effect should have skipped dispatch and reset suppressUpdate
    expect(dispatchSpy).not.toHaveBeenCalled();
    expect(comp['suppressUpdate']).toBe(false);
  });

  // --- Destroy cleanup ---

  it('should call view.destroy() on ngOnDestroy', () => {
    const comp = getEditor(fixture);
    const view = comp['view']!;
    const destroySpy = vi.spyOn(view, 'destroy');

    comp.ngOnDestroy();

    expect(destroySpy).toHaveBeenCalledOnce();
  });

  it('should handle ngOnDestroy when view is null', () => {
    const comp = getEditor(fixture);
    comp['view'] = null;

    expect(() => comp.ngOnDestroy()).not.toThrow();
  });
});
