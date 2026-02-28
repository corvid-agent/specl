import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TableEditorComponent } from './table-editor';
import { type MarkdownTable } from '../../models/markdown-table';

@Component({
  standalone: true,
  imports: [TableEditorComponent],
  template: `<app-table-editor [table]="table()" (tableChange)="onTableChange($event)" />`,
})
class TestHostComponent {
  table = signal<MarkdownTable>({ headers: ['Name', 'Type'], rows: [['id', 'number']] });
  lastEmitted: MarkdownTable | null = null;
  onTableChange(t: MarkdownTable): void {
    this.lastEmitted = t;
  }
}

describe('TableEditorComponent', () => {
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

  function getComponent(): TableEditorComponent {
    return fixture.debugElement.children[0].componentInstance as TableEditorComponent;
  }

  it('should create', () => {
    expect(host).toBeTruthy();
  });

  it('should render headers as table column headers', () => {
    const headers = fixture.nativeElement.querySelectorAll('th');
    expect(headers[0].textContent.trim()).toBe('Name');
    expect(headers[1].textContent.trim()).toBe('Type');
  });

  it('should render correct number of cell inputs', () => {
    const inputs = fixture.nativeElement.querySelectorAll('input.cell-input');
    expect(inputs.length).toBe(2);
  });

  describe('onCellChange', () => {
    it('should emit new table with updated cell value', () => {
      (getComponent() as any).onCellChange(0, 1, 'string');
      expect(host.lastEmitted).toEqual({
        headers: ['Name', 'Type'],
        rows: [['id', 'string']],
      });
    });

    it('should not mutate the original table', () => {
      const original = host.table();
      const originalRow = [...original.rows[0]];
      (getComponent() as any).onCellChange(0, 0, 'changed');
      expect(original.rows[0]).toEqual(originalRow);
    });
  });

  describe('addRow', () => {
    it('should emit table with new empty row appended', () => {
      (getComponent() as any).addRow();
      expect(host.lastEmitted).toEqual({
        headers: ['Name', 'Type'],
        rows: [['id', 'number'], ['', '']],
      });
    });

    it('should create empty cells matching header count', () => {
      host.table.set({ headers: ['A', 'B', 'C'], rows: [] });
      fixture.detectChanges();
      (getComponent() as any).addRow();
      expect(host.lastEmitted!.rows[0]).toEqual(['', '', '']);
    });
  });

  describe('removeRow', () => {
    it('should emit table without the removed row', () => {
      host.table.set({ headers: ['Name'], rows: [['a'], ['b'], ['c']] });
      fixture.detectChanges();
      (getComponent() as any).removeRow(1);
      expect(host.lastEmitted).toEqual({
        headers: ['Name'],
        rows: [['a'], ['c']],
      });
    });
  });

  describe('moveRowUp', () => {
    it('should swap row with the one above', () => {
      host.table.set({ headers: ['Name'], rows: [['a'], ['b'], ['c']] });
      fixture.detectChanges();
      (getComponent() as any).moveRowUp(2);
      expect(host.lastEmitted).toEqual({
        headers: ['Name'],
        rows: [['a'], ['c'], ['b']],
      });
    });

    it('should be a no-op when row index is 0', () => {
      host.table.set({ headers: ['Name'], rows: [['a'], ['b']] });
      fixture.detectChanges();
      (getComponent() as any).moveRowUp(0);
      expect(host.lastEmitted).toBeNull();
    });
  });

  describe('moveRowDown', () => {
    it('should swap row with the one below', () => {
      host.table.set({ headers: ['Name'], rows: [['a'], ['b'], ['c']] });
      fixture.detectChanges();
      (getComponent() as any).moveRowDown(0);
      expect(host.lastEmitted).toEqual({
        headers: ['Name'],
        rows: [['b'], ['a'], ['c']],
      });
    });

    it('should be a no-op when row is last', () => {
      host.table.set({ headers: ['Name'], rows: [['a'], ['b']] });
      fixture.detectChanges();
      (getComponent() as any).moveRowDown(1);
      expect(host.lastEmitted).toBeNull();
    });
  });

  describe('empty state', () => {
    it('should show empty state message when table has no rows', () => {
      host.table.set({ headers: ['Name'], rows: [] });
      fixture.detectChanges();
      const emptyState = fixture.nativeElement.querySelector('.empty-state');
      expect(emptyState).toBeTruthy();
      expect(emptyState.textContent.trim()).toBe('No rows yet. Add one below.');
    });

    it('should not show empty state when table has rows', () => {
      const emptyState = fixture.nativeElement.querySelector('.empty-state');
      expect(emptyState).toBeFalsy();
    });
  });

  describe('immutability', () => {
    it('should preserve headers reference on row mutations', () => {
      const originalHeaders = host.table().headers;
      (getComponent() as any).addRow();
      expect(host.lastEmitted!.headers).toBe(originalHeaders);
    });

    it('should create new row arrays on moveRowUp', () => {
      host.table.set({ headers: ['Name'], rows: [['a'], ['b']] });
      fixture.detectChanges();
      const originalRows = host.table().rows;
      (getComponent() as any).moveRowUp(1);
      expect(host.lastEmitted!.rows).not.toBe(originalRows);
    });
  });
});
