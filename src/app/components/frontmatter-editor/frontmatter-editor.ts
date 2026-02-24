import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { type SpecFrontmatter, type SpecStatus } from '../../models/spec.model';

@Component({
  selector: 'app-frontmatter-editor',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './frontmatter-editor.html',
  styleUrl: './frontmatter-editor.scss',
})
export class FrontmatterEditorComponent {
  readonly frontmatter = input.required<SpecFrontmatter>();
  readonly frontmatterChange = output<SpecFrontmatter>();

  protected newFile = '';
  protected newTable = '';
  protected newDep = '';

  protected onFieldChange(field: keyof SpecFrontmatter, value: string | number): void {
    const updated = { ...this.frontmatter(), [field]: value };
    this.frontmatterChange.emit(updated);
  }

  protected onStatusChange(value: string): void {
    this.onFieldChange('status', value as SpecStatus);
  }

  protected addFile(): void {
    const file = this.newFile.trim();
    if (!file) return;
    const updated = { ...this.frontmatter(), files: [...this.frontmatter().files, file] };
    this.newFile = '';
    this.frontmatterChange.emit(updated);
  }

  protected removeFile(index: number): void {
    const files = [...this.frontmatter().files];
    files.splice(index, 1);
    this.frontmatterChange.emit({ ...this.frontmatter(), files });
  }

  protected addTable(): void {
    const table = this.newTable.trim();
    if (!table) return;
    const updated = { ...this.frontmatter(), db_tables: [...this.frontmatter().db_tables, table] };
    this.newTable = '';
    this.frontmatterChange.emit(updated);
  }

  protected removeTable(index: number): void {
    const db_tables = [...this.frontmatter().db_tables];
    db_tables.splice(index, 1);
    this.frontmatterChange.emit({ ...this.frontmatter(), db_tables });
  }

  protected addDependency(): void {
    const dep = this.newDep.trim();
    if (!dep) return;
    const updated = { ...this.frontmatter(), depends_on: [...this.frontmatter().depends_on, dep] };
    this.newDep = '';
    this.frontmatterChange.emit(updated);
  }

  protected removeDependency(index: number): void {
    const depends_on = [...this.frontmatter().depends_on];
    depends_on.splice(index, 1);
    this.frontmatterChange.emit({ ...this.frontmatter(), depends_on });
  }
}
