import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FrontmatterEditorComponent } from './frontmatter-editor';
import { type SpecFrontmatter } from '../../models/spec.model';

@Component({
  standalone: true,
  imports: [FrontmatterEditorComponent],
  template: `<app-frontmatter-editor
    [frontmatter]="frontmatter()"
    [knownModules]="knownModules()"
    (frontmatterChange)="onFrontmatterChange($event)"
  />`,
})
class TestHostComponent {
  frontmatter = signal<SpecFrontmatter>({
    module: 'auth-service',
    version: 1,
    status: 'draft',
    files: [],
    db_tables: [],
    depends_on: [],
  });
  knownModules = signal<string[]>([]);
  lastEmitted: SpecFrontmatter | null = null;
  onFrontmatterChange(fm: SpecFrontmatter): void {
    this.lastEmitted = fm;
  }
}

describe('FrontmatterEditorComponent', () => {
  let host: TestHostComponent;
  let fixture: ReturnType<typeof TestBed.createComponent<TestHostComponent>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(host).toBeTruthy();
  });

  describe('availableModules computed', () => {
    it('should exclude current module from suggestions', () => {
      host.knownModules.set(['auth-service', 'user-service', 'db-service']);
      fixture.detectChanges();

      const datalist = fixture.nativeElement.querySelector('#dep-suggestions');
      const options = datalist.querySelectorAll('option');
      const values = Array.from(options).map((o: any) => o.value);

      expect(values).toEqual(['user-service', 'db-service']);
      expect(values).not.toContain('auth-service');
    });

    it('should exclude already-added dependencies from suggestions', () => {
      host.knownModules.set(['auth-service', 'user-service', 'db-service', 'cache-service']);
      host.frontmatter.set({
        ...host.frontmatter(),
        depends_on: ['user-service'],
      });
      fixture.detectChanges();

      const datalist = fixture.nativeElement.querySelector('#dep-suggestions');
      const options = datalist.querySelectorAll('option');
      const values = Array.from(options).map((o: any) => o.value);

      expect(values).toEqual(['db-service', 'cache-service']);
      expect(values).not.toContain('auth-service'); // current module
      expect(values).not.toContain('user-service'); // already added
    });
  });

  describe('addFile', () => {
    it('should emit updated frontmatter with new file added', () => {
      const input = fixture.nativeElement.querySelector('#fm-new-file') as HTMLInputElement;
      const addBtn = fixture.nativeElement.querySelector(
        'fieldset:nth-of-type(1) .add-row button',
      ) as HTMLButtonElement;

      input.value = 'server/auth.ts';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      addBtn.click();
      fixture.detectChanges();

      expect(host.lastEmitted).toBeTruthy();
      expect(host.lastEmitted!.files).toEqual(['server/auth.ts']);
    });

    it('should not emit when input is empty or whitespace', () => {
      const input = fixture.nativeElement.querySelector('#fm-new-file') as HTMLInputElement;
      const addBtn = fixture.nativeElement.querySelector(
        'fieldset:nth-of-type(1) .add-row button',
      ) as HTMLButtonElement;

      input.value = '   ';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      addBtn.click();
      fixture.detectChanges();

      expect(host.lastEmitted).toBeNull();
    });
  });

  describe('removeFile', () => {
    it('should emit frontmatter without the removed file', () => {
      host.frontmatter.set({
        ...host.frontmatter(),
        files: ['file-a.ts', 'file-b.ts', 'file-c.ts'],
      });
      fixture.detectChanges();

      // Click the remove button for the second file (index 1)
      const removeButtons = fixture.nativeElement.querySelectorAll(
        'fieldset:nth-of-type(1) .list-item button',
      );
      expect(removeButtons.length).toBe(3);
      removeButtons[1].click();
      fixture.detectChanges();

      expect(host.lastEmitted).toBeTruthy();
      expect(host.lastEmitted!.files).toEqual(['file-a.ts', 'file-c.ts']);
    });
  });

  describe('addTable', () => {
    it('should emit updated frontmatter with new table added', () => {
      const input = fixture.nativeElement.querySelector('#fm-new-table') as HTMLInputElement;
      const addBtn = fixture.nativeElement.querySelector(
        'fieldset:nth-of-type(2) .add-row button',
      ) as HTMLButtonElement;

      input.value = 'sessions';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      addBtn.click();
      fixture.detectChanges();

      expect(host.lastEmitted).toBeTruthy();
      expect(host.lastEmitted!.db_tables).toEqual(['sessions']);
    });
  });

  describe('addDependency', () => {
    it('should emit updated frontmatter with new dependency added', () => {
      const input = fixture.nativeElement.querySelector('#fm-new-dep') as HTMLInputElement;
      const addBtn = fixture.nativeElement.querySelector(
        'fieldset:nth-of-type(3) .add-row button',
      ) as HTMLButtonElement;

      input.value = 'user-service';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      addBtn.click();
      fixture.detectChanges();

      expect(host.lastEmitted).toBeTruthy();
      expect(host.lastEmitted!.depends_on).toEqual(['user-service']);
    });

    it('should not emit when dependency input is empty', () => {
      const input = fixture.nativeElement.querySelector('#fm-new-dep') as HTMLInputElement;
      const addBtn = fixture.nativeElement.querySelector(
        'fieldset:nth-of-type(3) .add-row button',
      ) as HTMLButtonElement;

      input.value = '';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      addBtn.click();
      fixture.detectChanges();

      expect(host.lastEmitted).toBeNull();
    });
  });

  describe('removeDependency', () => {
    it('should emit frontmatter without the removed dependency', () => {
      host.frontmatter.set({
        ...host.frontmatter(),
        depends_on: ['dep-a', 'dep-b'],
      });
      fixture.detectChanges();

      const removeButtons = fixture.nativeElement.querySelectorAll(
        'fieldset:nth-of-type(3) .list-item button',
      );
      expect(removeButtons.length).toBe(2);
      removeButtons[0].click();
      fixture.detectChanges();

      expect(host.lastEmitted).toBeTruthy();
      expect(host.lastEmitted!.depends_on).toEqual(['dep-b']);
    });
  });

  describe('onFieldChange', () => {
    it('should emit when module name is changed via input', () => {
      const input = fixture.nativeElement.querySelector('#fm-module') as HTMLInputElement;
      input.value = 'new-module-name';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(host.lastEmitted).toBeTruthy();
      expect(host.lastEmitted!.module).toBe('new-module-name');
      // Other fields should remain unchanged
      expect(host.lastEmitted!.version).toBe(1);
      expect(host.lastEmitted!.status).toBe('draft');
    });
  });

  describe('immutability', () => {
    it('should not mutate the original frontmatter when adding a file', () => {
      const original = host.frontmatter();
      const originalFiles = [...original.files];

      const input = fixture.nativeElement.querySelector('#fm-new-file') as HTMLInputElement;
      const addBtn = fixture.nativeElement.querySelector(
        'fieldset:nth-of-type(1) .add-row button',
      ) as HTMLButtonElement;

      input.value = 'new-file.ts';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      addBtn.click();
      fixture.detectChanges();

      // Original frontmatter should be untouched
      expect(host.frontmatter().files).toEqual(originalFiles);
      expect(host.lastEmitted!.files).toEqual(['new-file.ts']);
    });
  });
});
