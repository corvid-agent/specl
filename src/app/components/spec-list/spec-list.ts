import { Component, inject, signal } from '@angular/core';
import { KeyValuePipe } from '@angular/common';
import { Router } from '@angular/router';
import { SpecStoreService } from '../../services/spec-store.service';
import { GitHubConnectComponent } from '../github-connect/github-connect';
import type { Spec } from '../../models/spec.model';

@Component({
  selector: 'app-spec-list',
  standalone: true,
  imports: [KeyValuePipe, GitHubConnectComponent],
  templateUrl: './spec-list.html',
  styleUrl: './spec-list.scss',
})
export class SpecListComponent {
  protected readonly store = inject(SpecStoreService);
  private readonly router = inject(Router);

  /** Tracks which suite folders are collapsed */
  protected readonly collapsedSuites = signal(new Set<string>());

  async onCreateSpec(): Promise<void> {
    const spec = await this.store.createSpec();
    if (spec.id) {
      await this.router.navigate(['/edit', spec.id]);
    }
  }

  async onSelectSpec(id: number): Promise<void> {
    await this.store.selectSpec(id);
    await this.router.navigate(['/edit', id]);
  }

  async onDeleteSpec(event: Event, id: number): Promise<void> {
    event.stopPropagation();
    await this.store.deleteSpec(id);
  }

  async onImport(): Promise<void> {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.spec.md';
    input.multiple = true;
    input.onchange = async () => {
      if (!input.files) return;
      const files: { name: string; content: string }[] = [];
      for (const file of Array.from(input.files)) {
        const content = await file.text();
        files.push({ name: file.name, content });
      }
      await this.store.importMarkdownFiles(files);
    };
    input.click();
  }

  async onGitHubPull(specs: { name: string; content: string; path: string; sha: string }[]): Promise<void> {
    const count = await this.store.importMarkdownFiles(specs);
    if (count > 0) {
      const allSpecs = this.store.allSpecs();
      const last = allSpecs[allSpecs.length - 1];
      if (last?.id) {
        await this.router.navigate(['/edit', last.id]);
      }
    }
  }

  toggleSuite(suiteName: string): void {
    this.collapsedSuites.update((set) => {
      const next = new Set(set);
      if (next.has(suiteName)) {
        next.delete(suiteName);
      } else {
        next.add(suiteName);
      }
      return next;
    });
  }

  isSuiteCollapsed(suiteName: string): boolean {
    return this.collapsedSuites().has(suiteName);
  }

  /** Comparator for keyvalue pipe: 'default' first, then alphabetical */
  suiteOrder = (a: { key: string }, b: { key: string }): number => {
    if (a.key === 'default') return -1;
    if (b.key === 'default') return 1;
    return a.key.localeCompare(b.key);
  };

  /** Extract a one-line preview from the spec body */
  getPreview(spec: Spec): string {
    if (!spec.body) return 'No description';
    // Find the Purpose section or use the first non-heading line
    const lines = spec.body.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('|') && !trimmed.startsWith('---')) {
        return trimmed.length > 80 ? trimmed.slice(0, 80) + '...' : trimmed;
      }
    }
    return 'No description';
  }
}
