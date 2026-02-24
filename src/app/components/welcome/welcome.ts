import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SpecStoreService } from '../../services/spec-store.service';

@Component({
  selector: 'app-welcome',
  standalone: true,
  templateUrl: './welcome.html',
  styleUrl: './welcome.scss',
})
export class WelcomeComponent {
  private readonly store = inject(SpecStoreService);
  private readonly router = inject(Router);

  async onCreateSpec(): Promise<void> {
    const spec = await this.store.createSpec();
    if (spec.id) {
      await this.router.navigate(['/edit', spec.id]);
    }
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
      const count = await this.store.importMarkdownFiles(files);
      if (count > 0) {
        const allSpecs = this.store.allSpecs();
        const last = allSpecs[allSpecs.length - 1];
        if (last?.id) {
          await this.router.navigate(['/edit', last.id]);
        }
      }
    };
    input.click();
  }
}
