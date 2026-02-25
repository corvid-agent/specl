import { Component, input, output, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { type MarkdownTable } from '../../models/markdown-table';

@Component({
  selector: 'app-table-editor',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './table-editor.html',
  styleUrl: './table-editor.scss',
})
export class TableEditorComponent {
  readonly table = input.required<MarkdownTable>();
  readonly tableChange = output<MarkdownTable>();

  protected readonly isEmpty = computed(() => this.table().rows.length === 0);

  protected onCellChange(rowIndex: number, colIndex: number, value: string): void {
    const t = this.table();
    const rows = t.rows.map((r) => [...r]);
    rows[rowIndex][colIndex] = value;
    this.tableChange.emit({ headers: t.headers, rows });
  }

  protected addRow(): void {
    const t = this.table();
    const newRow = t.headers.map(() => '');
    this.tableChange.emit({ headers: t.headers, rows: [...t.rows, newRow] });
  }

  protected removeRow(index: number): void {
    const t = this.table();
    const rows = [...t.rows];
    rows.splice(index, 1);
    this.tableChange.emit({ headers: t.headers, rows });
  }

  protected moveRowUp(index: number): void {
    if (index <= 0) return;
    const t = this.table();
    const rows = t.rows.map((r) => [...r]);
    [rows[index - 1], rows[index]] = [rows[index], rows[index - 1]];
    this.tableChange.emit({ headers: t.headers, rows });
  }

  protected moveRowDown(index: number): void {
    const t = this.table();
    if (index >= t.rows.length - 1) return;
    const rows = t.rows.map((r) => [...r]);
    [rows[index], rows[index + 1]] = [rows[index + 1], rows[index]];
    this.tableChange.emit({ headers: t.headers, rows });
  }
}
