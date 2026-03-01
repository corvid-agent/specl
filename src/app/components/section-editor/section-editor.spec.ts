import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { SectionEditorComponent } from './section-editor';
import { type SpecSection } from '../../models/spec.model';

@Component({
  standalone: true,
  imports: [SectionEditorComponent],
  template: `
    <app-section-editor
      [section]="section()"
      [sectionIndex]="sectionIndex()"
      [totalSections]="totalSections()"
      (contentChange)="onContentChange($event)"
      (headingChange)="onHeadingChange($event)"
      (navigate)="onNavigate($event)"
    />
  `,
})
class TestHostComponent {
  section = signal<SpecSection>({
    heading: 'Public API',
    level: 2,
    content: '| Method | Returns |\n|---|---|\n| getId() | string |',
  });
  sectionIndex = signal(1);
  totalSections = signal(5);

  lastContent: string | null = null;
  lastHeading: string | null = null;
  lastNavigate: number | null = null;

  onContentChange(value: string): void {
    this.lastContent = value;
  }
  onHeadingChange(value: string): void {
    this.lastHeading = value;
  }
  onNavigate(index: number): void {
    this.lastNavigate = index;
  }
}

function getComponent(fixture: ComponentFixture<TestHostComponent>): SectionEditorComponent {
  return fixture.debugElement.children[0].componentInstance as SectionEditorComponent;
}

describe('SectionEditorComponent', () => {
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

  // --- Creation ---

  it('should create', () => {
    expect(getComponent(fixture)).toBeTruthy();
  });

  // --- Heading ---

  describe('heading', () => {
    it('should display the section heading in the input', () => {
      const input: HTMLInputElement = fixture.nativeElement.querySelector('.heading-input');
      expect(input.value).toBe('Public API');
    });

    it('should emit headingChange when heading is edited', () => {
      const comp = getComponent(fixture);
      (comp as any).onHeadingChange('New Heading');
      expect(host.lastHeading).toBe('New Heading');
    });

    it('should update the internal headingValue signal', () => {
      const comp = getComponent(fixture);
      (comp as any).onHeadingChange('Updated');
      expect(comp['headingValue']()).toBe('Updated');
    });

    it('should show heading prefix "##"', () => {
      const prefix = fixture.nativeElement.querySelector('.heading-prefix');
      expect(prefix.textContent.trim()).toBe('##');
    });

    it('should have accessible label for heading input', () => {
      const label = fixture.nativeElement.querySelector('label.sr-only');
      expect(label).toBeTruthy();
      expect(label.textContent).toContain('Section heading');
    });
  });

  // --- Navigation ---

  describe('navigation', () => {
    it('should show both prev and next buttons when in the middle', () => {
      host.sectionIndex.set(2);
      host.totalSections.set(5);
      fixture.detectChanges();
      const buttons = fixture.nativeElement.querySelectorAll('.section-nav-buttons button');
      expect(buttons.length).toBe(2);
    });

    it('goPrev from index 2 should emit 1', () => {
      host.sectionIndex.set(2);
      fixture.detectChanges();
      const comp = getComponent(fixture);
      (comp as any).goPrev();
      expect(host.lastNavigate).toBe(1);
    });

    it('goPrev from index 0 should emit -1 (frontmatter)', () => {
      host.sectionIndex.set(0);
      fixture.detectChanges();
      const comp = getComponent(fixture);
      (comp as any).goPrev();
      expect(host.lastNavigate).toBe(-1);
    });

    it('goNext from index 1 of 5 should emit 2', () => {
      host.sectionIndex.set(1);
      host.totalSections.set(5);
      fixture.detectChanges();
      const comp = getComponent(fixture);
      (comp as any).goNext();
      expect(host.lastNavigate).toBe(2);
    });

    it('goNext from last index should not emit', () => {
      host.sectionIndex.set(4);
      host.totalSections.set(5);
      fixture.detectChanges();
      const comp = getComponent(fixture);
      (comp as any).goNext();
      expect(host.lastNavigate).toBeNull();
    });

    it('hasPrev is always true (sectionIndex >= 0)', () => {
      host.sectionIndex.set(0);
      fixture.detectChanges();
      const comp = getComponent(fixture);
      expect(comp['hasPrev']).toBe(true);
    });

    it('hasNext is true when not at last section', () => {
      host.sectionIndex.set(2);
      host.totalSections.set(5);
      fixture.detectChanges();
      const comp = getComponent(fixture);
      expect(comp['hasNext']).toBe(true);
    });

    it('hasNext is false when at last section', () => {
      host.sectionIndex.set(4);
      host.totalSections.set(5);
      fixture.detectChanges();
      const comp = getComponent(fixture);
      expect(comp['hasNext']).toBe(false);
    });

    it('clicking prev button triggers goPrev', () => {
      host.sectionIndex.set(2);
      host.totalSections.set(5);
      fixture.detectChanges();
      const prevBtn = fixture.nativeElement.querySelector('button[aria-label="Previous section"]');
      prevBtn.click();
      expect(host.lastNavigate).toBe(1);
    });

    it('clicking next button triggers goNext', () => {
      host.sectionIndex.set(2);
      host.totalSections.set(5);
      fixture.detectChanges();
      const nextBtn = fixture.nativeElement.querySelector('button[aria-label="Next section"]');
      nextBtn.click();
      expect(host.lastNavigate).toBe(3);
    });

    it('hides next button when at last section', () => {
      host.sectionIndex.set(4);
      host.totalSections.set(5);
      fixture.detectChanges();
      const nextBtn = fixture.nativeElement.querySelector('button[aria-label="Next section"]');
      expect(nextBtn).toBeFalsy();
    });
  });

  // --- Content block parsing (structured mode) ---

  describe('structured editing mode', () => {
    it('should detect table content and enter structured mode', () => {
      const comp = getComponent(fixture);
      expect(comp['hasTable']()).toBe(true);
    });

    it('should render table editor for table blocks', () => {
      const tableEditor = fixture.nativeElement.querySelector('app-table-editor');
      expect(tableEditor).toBeTruthy();
    });

    it('should not show CodeMirror editor host in structured mode', () => {
      const editorHost = fixture.nativeElement.querySelector('.editor-host');
      expect(editorHost).toBeFalsy();
    });

    it('should parse mixed text and table content into blocks', () => {
      host.section.set({
        heading: 'Mixed',
        level: 2,
        content: 'Some intro text.\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\nSome outro text.',
      });
      fixture.detectChanges();
      const comp = getComponent(fixture);
      const blocks = comp['contentBlocks']();
      expect(blocks.length).toBe(3);
      expect(blocks[0].type).toBe('text');
      expect(blocks[1].type).toBe('table');
      expect(blocks[2].type).toBe('text');
    });

    it('should render textareas for text blocks in structured mode', () => {
      host.section.set({
        heading: 'Mixed',
        level: 2,
        content: 'Intro text.\n\n| A | B |\n|---|---|\n| 1 | 2 |',
      });
      fixture.detectChanges();
      const textareas = fixture.nativeElement.querySelectorAll('textarea.text-block');
      expect(textareas.length).toBeGreaterThanOrEqual(1);
    });

    it('onTableChange should emit updated content', () => {
      const comp = getComponent(fixture);
      (comp as any).onTableChange(0, {
        headers: ['Method', 'Returns'],
        rows: [['getId()', 'number']],
      });
      expect(host.lastContent).toBeTruthy();
      expect(host.lastContent).toContain('number');
    });

    it('onTextBlockChange should emit updated content', () => {
      host.section.set({
        heading: 'Mixed',
        level: 2,
        content: 'Intro.\n\n| A | B |\n|---|---|\n| 1 | 2 |',
      });
      fixture.detectChanges();
      const comp = getComponent(fixture);
      (comp as any).onTextBlockChange(0, 'Updated intro.');
      expect(host.lastContent).toBeTruthy();
      expect(host.lastContent).toContain('Updated intro.');
    });
  });

  // --- CodeMirror mode ---

  describe('plain text mode (no tables)', () => {
    beforeEach(() => {
      host.section.set({
        heading: 'Purpose',
        level: 2,
        content: 'This module handles scheduling.',
      });
      fixture.detectChanges();
    });

    it('should detect no table content', () => {
      const comp = getComponent(fixture);
      expect(comp['hasTable']()).toBe(false);
    });

    it('should show editor host element', () => {
      const editorHost = fixture.nativeElement.querySelector('.editor-host');
      expect(editorHost).toBeTruthy();
    });

    it('should not show structured content', () => {
      const structured = fixture.nativeElement.querySelector('.structured-content');
      expect(structured).toBeFalsy();
    });

    it('should not render table editor', () => {
      const tableEditor = fixture.nativeElement.querySelector('app-table-editor');
      expect(tableEditor).toBeFalsy();
    });
  });

  // --- Section change ---

  describe('section change', () => {
    it('should update heading when section changes', async () => {
      host.section.set({
        heading: 'Invariants',
        level: 2,
        content: '| Rule | Enforced |\n|---|---|\n| No nulls | Yes |',
      });
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      const input: HTMLInputElement = fixture.nativeElement.querySelector('.heading-input');
      expect(input.value).toBe('Invariants');
    });

    it('should reparse content blocks when section changes', () => {
      const comp = getComponent(fixture);
      const originalBlocks = comp['contentBlocks']();

      host.section.set({
        heading: 'Different',
        level: 2,
        content: '| X | Y |\n|---|---|\n| a | b |\n| c | d |',
      });
      host.sectionIndex.set(3);
      fixture.detectChanges();

      const newBlocks = comp['contentBlocks']();
      expect(newBlocks).not.toBe(originalBlocks);
    });
  });

  // --- Accessibility ---

  describe('accessibility', () => {
    it('should have aria-label on the section element', () => {
      const section = fixture.nativeElement.querySelector('.section-editor');
      expect(section.getAttribute('aria-label')).toContain('Public API');
    });

    it('should have aria-label on nav buttons', () => {
      const nav = fixture.nativeElement.querySelector('nav[aria-label="Section navigation"]');
      expect(nav).toBeTruthy();
    });

    it('should have role="region" on section body', () => {
      const body = fixture.nativeElement.querySelector('[role="region"]');
      expect(body).toBeTruthy();
    });

    it('should update aria-label when heading changes', () => {
      const comp = getComponent(fixture);
      (comp as any).onHeadingChange('Updated API');
      fixture.detectChanges();
      const section = fixture.nativeElement.querySelector('.section-editor');
      expect(section.getAttribute('aria-label')).toContain('Updated API');
    });
  });

  // --- Edge cases ---

  describe('edge cases', () => {
    it('should handle empty content', () => {
      host.section.set({ heading: 'Empty', level: 2, content: '' });
      fixture.detectChanges();
      const comp = getComponent(fixture);
      // parseContentBlocks('') returns a single empty text block
      expect(comp['contentBlocks']().every((b) => b.type === 'text')).toBe(true);
      expect(comp['hasTable']()).toBe(false);
    });

    it('should handle section with only text (no tables)', () => {
      host.section.set({
        heading: 'Notes',
        level: 3,
        content: 'Line 1\nLine 2\nLine 3',
      });
      fixture.detectChanges();
      const comp = getComponent(fixture);
      expect(comp['hasTable']()).toBe(false);
    });

    it('should clean up editor view on destroy', () => {
      // Switch to plain text mode to create a CodeMirror editor
      host.section.set({ heading: 'Plain', level: 2, content: 'No tables here.' });
      fixture.detectChanges();
      const comp = getComponent(fixture);

      // Destroying the fixture should not throw
      expect(() => fixture.destroy()).not.toThrow();
    });
  });
});
