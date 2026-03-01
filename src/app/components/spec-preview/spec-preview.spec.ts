import { Component, signal } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { SpecPreviewComponent } from './spec-preview';
import { type ValidationResult } from '../../models/spec.model';

@Component({
  standalone: true,
  imports: [SpecPreviewComponent],
  template: `<app-spec-preview [markdown]="markdown()" [validation]="validation()" />`,
})
class TestHostComponent {
  markdown = signal('# Hello');
  validation = signal<ValidationResult | null>(null);
}

describe('SpecPreviewComponent', () => {
  let host: TestHostComponent;
  let fixture: ReturnType<typeof TestBed.createComponent<TestHostComponent>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(host).toBeTruthy();
  });

  it('should render markdown as HTML', async () => {
    host.markdown.set('**bold text**');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const article = fixture.nativeElement.querySelector('.preview-content');
    expect(article.innerHTML).toContain('<strong>bold text</strong>');
  });

  it('should render headings', async () => {
    host.markdown.set('# Test Heading');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const article = fixture.nativeElement.querySelector('.preview-content');
    expect(article.innerHTML).toContain('<h1');
    expect(article.innerHTML).toContain('Test Heading');
  });

  it('should not show validation panel when validation is null', () => {
    host.validation.set(null);
    fixture.detectChanges();
    const panel = fixture.nativeElement.querySelector('.validation-panel');
    expect(panel).toBeFalsy();
  });

  it('should show valid badge when validation is valid', () => {
    host.validation.set({ valid: true, errors: [] });
    fixture.detectChanges();
    const badge = fixture.nativeElement.querySelector('.status-badge.valid');
    expect(badge).toBeTruthy();
    expect(badge.textContent.trim()).toBe('Valid');
  });

  it('should show error count when validation has errors', () => {
    host.validation.set({
      valid: false,
      errors: [
        { level: 'error', field: 'module', message: 'Required' },
        { level: 'error', field: 'version', message: 'Must be positive' },
      ],
    });
    fixture.detectChanges();
    const badge = fixture.nativeElement.querySelector('.status-badge.invalid');
    expect(badge).toBeTruthy();
    expect(badge.textContent.trim()).toBe('2 error(s)');
  });

  it('should show warning count alongside errors', () => {
    host.validation.set({
      valid: false,
      errors: [
        { level: 'error', field: 'module', message: 'Required' },
        { level: 'warning', field: 'files', message: 'Consider adding files' },
      ],
    });
    fixture.detectChanges();
    const warningBadge = fixture.nativeElement.querySelector('.status-badge.warning');
    expect(warningBadge).toBeTruthy();
    expect(warningBadge.textContent.trim()).toBe('1 warning(s)');
  });

  it('should show warning count on valid spec with warnings', () => {
    host.validation.set({
      valid: true,
      errors: [{ level: 'warning', field: 'depends_on', message: 'No dependencies listed' }],
    });
    fixture.detectChanges();
    const warningBadge = fixture.nativeElement.querySelector('.status-badge.warning');
    expect(warningBadge).toBeTruthy();
    expect(warningBadge.textContent.trim()).toBe('1 warning(s)');
  });

  it('should list all validation issues', () => {
    host.validation.set({
      valid: false,
      errors: [
        { level: 'error', field: 'module', message: 'Required' },
        { level: 'warning', field: 'files', message: 'Consider adding files' },
      ],
    });
    fixture.detectChanges();
    const items = fixture.nativeElement.querySelectorAll('.validation-list li');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('module');
    expect(items[0].textContent).toContain('Required');
    expect(items[1].textContent).toContain('files');
  });

  it('should apply error class to error items', () => {
    host.validation.set({
      valid: false,
      errors: [{ level: 'error', field: 'module', message: 'Required' }],
    });
    fixture.detectChanges();
    const item = fixture.nativeElement.querySelector('.validation-list li');
    expect(item.classList.contains('error')).toBe(true);
  });

  it('should apply warning class to warning items', () => {
    host.validation.set({
      valid: true,
      errors: [{ level: 'warning', field: 'files', message: 'Consider adding files' }],
    });
    fixture.detectChanges();
    const item = fixture.nativeElement.querySelector('.validation-list li');
    expect(item.classList.contains('warning')).toBe(true);
  });

  it('should not show validation list when valid with no warnings', () => {
    host.validation.set({ valid: true, errors: [] });
    fixture.detectChanges();
    const list = fixture.nativeElement.querySelector('.validation-list');
    expect(list).toBeFalsy();
  });

  it('should apply valid class to panel when valid', () => {
    host.validation.set({ valid: true, errors: [] });
    fixture.detectChanges();
    const panel = fixture.nativeElement.querySelector('.validation-panel');
    expect(panel.classList.contains('valid')).toBe(true);
    expect(panel.classList.contains('invalid')).toBe(false);
  });

  it('should apply invalid class to panel when invalid', () => {
    host.validation.set({
      valid: false,
      errors: [{ level: 'error', field: 'module', message: 'Required' }],
    });
    fixture.detectChanges();
    const panel = fixture.nativeElement.querySelector('.validation-panel');
    expect(panel.classList.contains('invalid')).toBe(true);
    expect(panel.classList.contains('valid')).toBe(false);
  });
});
