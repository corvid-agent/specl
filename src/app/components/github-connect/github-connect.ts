import { Component, inject, signal, output } from '@angular/core';
import { GitHubService, type GitHubConfig } from '../../services/github.service';
import { GitHubOAuthService } from '../../services/github-oauth.service';
import { RepoBrowserComponent } from '../repo-browser/repo-browser';
import { environment } from '../../../environments/environment';

type ConnectMode = 'oauth' | 'pat';

@Component({
  selector: 'app-github-connect',
  standalone: true,
  imports: [RepoBrowserComponent],
  templateUrl: './github-connect.html',
  styleUrl: './github-connect.scss',
})
export class GitHubConnectComponent {
  readonly github = inject(GitHubService);
  readonly oauth = inject(GitHubOAuthService);

  readonly showForm = signal(false);
  readonly showManualForm = signal(false);
  readonly connectMode = signal<ConnectMode>('oauth');
  readonly token = signal('');
  readonly owner = signal('');
  readonly repo = signal('');
  readonly branch = signal('main');
  readonly specsPath = signal('specs');

  readonly oauthAvailable = Boolean(environment.GITHUB_CLIENT_ID);

  /** Emitted when specs are pulled from GitHub */
  readonly specsPulled = output<{ name: string; content: string; path: string; sha: string }[]>();

  toggleForm(): void {
    this.showForm.update((v) => !v);
  }

  togglePat(): void {
    this.showForm.update((v) => !v);
    this.connectMode.set('pat');
  }

  setMode(mode: ConnectMode): void {
    this.connectMode.set(mode);
  }

  async onSignIn(): Promise<void> {
    await this.oauth.startDeviceFlow();
  }

  onCancelFlow(): void {
    this.oauth.cancelFlow();
  }

  onSignOut(): void {
    this.github.disconnect();
    this.oauth.signOut();
    this.showForm.set(false);
  }

  async onConnect(): Promise<void> {
    if (this.oauth.authenticated()) {
      // OAuth mode: connect with repo config, token comes from OAuth service
      await this.github.connectWithOAuth({
        owner: this.owner(),
        repo: this.repo(),
        branch: this.branch(),
        specsPath: this.specsPath(),
      });
    } else {
      // PAT mode: use the manually entered token
      const config: GitHubConfig = {
        token: this.token(),
        owner: this.owner(),
        repo: this.repo(),
        branch: this.branch(),
        specsPath: this.specsPath(),
      };
      await this.github.connect(config);
    }
  }

  onManualConnect(): void {
    this.showManualForm.set(true);
  }

  onRepoBrowserConnected(): void {
    this.showManualForm.set(false);
  }

  onDisconnect(): void {
    this.github.disconnect();
    this.showForm.set(false);
    this.showManualForm.set(false);
  }

  async onPull(): Promise<void> {
    const specs = await this.github.pullSpecs();
    this.specsPulled.emit(specs);
  }

  async copyCode(): Promise<void> {
    const code = this.oauth.userCode();
    if (code) {
      await navigator.clipboard.writeText(code);
    }
  }

  updateField(field: 'token' | 'owner' | 'repo' | 'branch' | 'specsPath', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this[field].set(value);
  }
}
