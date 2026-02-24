import { Component, inject, signal, output, OnInit } from '@angular/core';
import { GitHubService, type RepoWithSpecs } from '../../services/github.service';
import { GitHubOAuthService } from '../../services/github-oauth.service';

@Component({
  selector: 'app-repo-browser',
  standalone: true,
  templateUrl: './repo-browser.html',
  styleUrl: './repo-browser.scss',
})
export class RepoBrowserComponent implements OnInit {
  readonly github = inject(GitHubService);
  readonly oauth = inject(GitHubOAuthService);

  readonly repos = signal<RepoWithSpecs[]>([]);
  readonly scanning = signal(false);
  readonly scanned = signal(false);
  readonly filter = signal('');
  readonly connecting = signal<string | null>(null);

  /** Emitted when user wants to use manual form instead */
  readonly manualConnect = output<void>();

  /** Emitted after successful connection */
  readonly connected = output<void>();

  ngOnInit(): void {
    this.loadRepos();
  }

  async loadRepos(): Promise<void> {
    this.scanning.set(true);
    this.scanned.set(false);

    try {
      const repos = await this.github.listReposWithSpecs();
      this.repos.set(repos);
    } finally {
      this.scanning.set(false);
      this.scanned.set(true);
    }
  }

  filteredRepos(): RepoWithSpecs[] {
    const q = this.filter().toLowerCase();
    if (!q) return this.repos();
    return this.repos().filter(
      (r) =>
        r.full_name.toLowerCase().includes(q) ||
        (r.description?.toLowerCase().includes(q) ?? false),
    );
  }

  async onSelectRepo(repo: RepoWithSpecs): Promise<void> {
    this.connecting.set(repo.full_name);
    try {
      const ok = await this.github.quickConnect(repo);
      if (ok) {
        this.connected.emit();
      }
    } finally {
      this.connecting.set(null);
    }
  }

  updateFilter(event: Event): void {
    this.filter.set((event.target as HTMLInputElement).value);
  }

  onManual(): void {
    this.manualConnect.emit();
  }
}
