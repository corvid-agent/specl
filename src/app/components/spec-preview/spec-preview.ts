import { Component, input, signal, effect } from '@angular/core';
import { marked } from 'marked';
import { type ValidationResult, type ValidationError } from '../../models/spec.model';

@Component({
  selector: 'app-spec-preview',
  standalone: true,
  templateUrl: './spec-preview.html',
  styleUrl: './spec-preview.scss',
})
export class SpecPreviewComponent {
  readonly markdown = input.required<string>();
  readonly validation = input<ValidationResult | null>(null);

  protected readonly html = signal('');

  constructor() {
    effect(() => {
      const md = this.markdown();
      const result = marked.parse(md);
      if (typeof result === 'string') {
        this.html.set(result);
      } else {
        result.then((r) => this.html.set(r));
      }
    });
  }

  protected get errors(): ValidationError[] {
    return this.validation()?.errors.filter((e) => e.level === 'error') ?? [];
  }

  protected get warnings(): ValidationError[] {
    return this.validation()?.errors.filter((e) => e.level === 'warning') ?? [];
  }
}
