import { Component, inject } from '@angular/core';
import { KeyValuePipe } from '@angular/common';
import { Router } from '@angular/router';
import { SpecStoreService } from '../../services/spec-store.service';
import { GitHubConnectComponent } from '../github-connect/github-connect';

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
}
