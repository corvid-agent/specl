import { Component, inject, signal, output } from '@angular/core';
import { GitHubService, type GitHubConfig } from '../../services/github.service';

@Component({
  selector: 'app-github-connect',
  standalone: true,
  templateUrl: './github-connect.html',
  styleUrl: './github-connect.scss',
})
export class GitHubConnectComponent {
  readonly github = inject(GitHubService);

  readonly showForm = signal(false);
  readonly token = signal('');
  readonly owner = signal('');
  readonly repo = signal('');
  readonly branch = signal('main');
  readonly specsPath = signal('specs');

  /** Emitted when specs are pulled from GitHub */
  readonly specsPulled = output<{ name: string; content: string; path: string; sha: string }[]>();

  toggleForm(): void {
    this.showForm.update((v) => !v);
  }

  async onConnect(): Promise<void> {
    const config: GitHubConfig = {
      token: this.token(),
      owner: this.owner(),
      repo: this.repo(),
      branch: this.branch(),
      specsPath: this.specsPath(),
    };
    await this.github.connect(config);
  }

  onDisconnect(): void {
    this.github.disconnect();
    this.showForm.set(false);
  }

  async onPull(): Promise<void> {
    const specs = await this.github.pullSpecs();
    this.specsPulled.emit(specs);
  }

  updateField(field: 'token' | 'owner' | 'repo' | 'branch' | 'specsPath', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this[field].set(value);
  }
}
