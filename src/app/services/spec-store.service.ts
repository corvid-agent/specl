import { Injectable, signal, computed } from '@angular/core';
import { type Spec, createEmptySpec } from '../models/spec.model';
import { SpecDbService } from './spec-db.service';
import { SpecParserService } from './spec-parser.service';
import { SpecValidatorService } from './spec-validator.service';
import { type ValidationResult } from '../models/spec.model';

@Injectable({ providedIn: 'root' })
export class SpecStoreService {
  private readonly specs = signal<Spec[]>([]);
  private readonly activeSpecId = signal<number | null>(null);
  private readonly dirty = signal(false);

  readonly allSpecs = this.specs.asReadonly();
  readonly isDirty = this.dirty.asReadonly();

  readonly activeSpec = computed(() => {
    const id = this.activeSpecId();
    if (id === null) return null;
    return this.specs().find((s) => s.id === id) ?? null;
  });

  readonly suites = computed(() => {
    const suiteMap = new Map<string, Spec[]>();
    for (const spec of this.specs()) {
      const existing = suiteMap.get(spec.suite) ?? [];
      existing.push(spec);
      suiteMap.set(spec.suite, existing);
    }
    return suiteMap;
  });

  constructor(
    private readonly db: SpecDbService,
    private readonly parser: SpecParserService,
    private readonly validator: SpecValidatorService,
  ) {}

  async loadAll(): Promise<void> {
    const all = await this.db.getAll();
    this.specs.set(all);
  }

  async createSpec(suite = 'default', filename = 'untitled.spec.md'): Promise<Spec> {
    const spec = createEmptySpec(suite, filename);
    const id = await this.db.save(spec);
    spec.id = id;
    this.specs.update((s) => [...s, spec]);
    this.activeSpecId.set(id);
    return spec;
  }

  async selectSpec(id: number): Promise<void> {
    this.activeSpecId.set(id);
    this.dirty.set(false);
  }

  async updateActiveSpec(partial: Partial<Spec>): Promise<void> {
    const current = this.activeSpec();
    if (!current?.id) return;

    const updated = { ...current, ...partial, updatedAt: new Date().toISOString() };
    await this.db.save(updated);

    this.specs.update((specs) => specs.map((s) => (s.id === current.id ? updated : s)));
    this.dirty.set(false);
  }

  markDirty(): void {
    this.dirty.set(true);
  }

  async deleteSpec(id: number): Promise<void> {
    await this.db.delete(id);
    this.specs.update((s) => s.filter((spec) => spec.id !== id));
    if (this.activeSpecId() === id) {
      this.activeSpecId.set(null);
    }
  }

  async importMarkdownFiles(files: { name: string; content: string; path?: string }[]): Promise<number> {
    const imported: Spec[] = [];
    for (const file of files) {
      const suite = this.inferSuite(file.path ?? file.name);
      const spec = this.parser.parseMarkdown(file.content, file.name, suite);
      spec.filepath = file.path;
      const id = await this.db.save(spec);
      spec.id = id;
      imported.push(spec);
    }
    this.specs.update((s) => [...s, ...imported]);
    return imported.length;
  }

  async exportSpec(id: number): Promise<string | null> {
    const spec = this.specs().find((s) => s.id === id);
    if (!spec) return null;
    return this.parser.serializeToMarkdown(spec);
  }

  validateActiveSpec(): ValidationResult | null {
    const spec = this.activeSpec();
    if (!spec) return null;
    return this.validator.validate(spec);
  }

  private inferSuite(pathOrName: string): string {
    const parts = pathOrName.replace(/\\/g, '/').split('/');
    if (parts.length <= 1) return 'default';
    // Use the parent directory as suite name
    return parts[parts.length - 2] ?? 'default';
  }
}
