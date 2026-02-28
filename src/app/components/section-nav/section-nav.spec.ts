import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SectionNavComponent } from './section-nav';
import { type SpecSection } from '../../models/spec.model';

@Component({
  standalone: true,
  imports: [SectionNavComponent],
  template: `<app-section-nav
    [sections]="sections()"
    [activeIndex]="activeIndex()"
    (selectIndex)="onSelect($event)"
  />`,
})
class TestHostComponent {
  sections = signal<SpecSection[]>([]);
  activeIndex = signal(-1);
  lastSelected: number | null = null;
  onSelect(index: number): void {
    this.lastSelected = index;
  }
}

describe('SectionNavComponent', () => {
  let host: TestHostComponent;
  let fixture: ReturnType<typeof TestBed.createComponent<TestHostComponent>>;

  const sampleSections: SpecSection[] = [
    { heading: 'Purpose', level: 2, content: 'Purpose content' },
    { heading: 'Public API', level: 2, content: 'API content' },
    { heading: 'Exported Classes', level: 3, content: 'Classes' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    host.sections.set(sampleSections);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(host).toBeTruthy();
  });

  it('should render Frontmatter as first nav item', () => {
    const buttons = fixture.nativeElement.querySelectorAll('button.nav-item');
    expect(buttons[0].textContent).toContain('Frontmatter');
  });

  it('should render all sections as nav items', () => {
    const buttons = fixture.nativeElement.querySelectorAll('button.nav-item');
    // Frontmatter + 3 sections = 4
    expect(buttons.length).toBe(4);
    expect(buttons[1].textContent).toContain('Purpose');
    expect(buttons[2].textContent).toContain('Public API');
    expect(buttons[3].textContent).toContain('Exported Classes');
  });

  it('should mark frontmatter as active when activeIndex is -1', () => {
    host.activeIndex.set(-1);
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('button.nav-item');
    expect(buttons[0].classList.contains('active')).toBe(true);
    expect(buttons[1].classList.contains('active')).toBe(false);
  });

  it('should mark correct section as active', () => {
    host.activeIndex.set(1);
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('button.nav-item');
    expect(buttons[0].classList.contains('active')).toBe(false);
    expect(buttons[2].classList.contains('active')).toBe(true); // index 1 = "Public API" = 3rd button
  });

  it('should emit -1 when frontmatter is clicked', () => {
    const buttons = fixture.nativeElement.querySelectorAll('button.nav-item');
    buttons[0].click();
    expect(host.lastSelected).toBe(-1);
  });

  it('should emit section index when section is clicked', () => {
    const buttons = fixture.nativeElement.querySelectorAll('button.nav-item');
    buttons[2].click();
    expect(host.lastSelected).toBe(1);
  });

  it('should apply level-3 class for deeply nested sections', () => {
    const buttons = fixture.nativeElement.querySelectorAll('button.nav-item');
    expect(buttons[3].classList.contains('level-3')).toBe(true);
  });

  it('should apply level-2 class for standard sections', () => {
    const buttons = fixture.nativeElement.querySelectorAll('button.nav-item');
    expect(buttons[1].classList.contains('level-2')).toBe(true);
  });

  it('should apply frontmatter class to frontmatter button', () => {
    const buttons = fixture.nativeElement.querySelectorAll('button.nav-item');
    expect(buttons[0].classList.contains('frontmatter')).toBe(true);
  });

  it('should update nav items when sections input changes', () => {
    host.sections.set([{ heading: 'Only Section', level: 2, content: '' }]);
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('button.nav-item');
    expect(buttons.length).toBe(2); // Frontmatter + 1 section
    expect(buttons[1].textContent).toContain('Only Section');
  });

  it('should render with empty sections', () => {
    host.sections.set([]);
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('button.nav-item');
    expect(buttons.length).toBe(1); // Only Frontmatter
  });
});
