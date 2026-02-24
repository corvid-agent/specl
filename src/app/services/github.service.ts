import { Injectable, inject, signal, computed } from '@angular/core';
import { GitHubOAuthService } from './github-oauth.service';

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  specsPath: string;
}

export interface GitHubRepoFile {
  name: string;
  path: string;
  sha: string;
  type: 'file' | 'dir';
}

export interface GitHubPullRequest {
  number: number;
  html_url: string;
  title: string;
  state: string;
}

export interface GitHubRepo {
  full_name: string;
  name: string;
  owner: { login: string };
  default_branch: string;
  private: boolean;
  description: string | null;
  updated_at: string;
  html_url: string;
}

export interface RepoWithSpecs extends GitHubRepo {
  hasSpecs: boolean;
  specsPath: string | null;
}

const STORAGE_KEY = 'specl:github-config';

@Injectable({ providedIn: 'root' })
export class GitHubService {
  private readonly oauth = inject(GitHubOAuthService);
  private readonly _config = signal<GitHubConfig | null>(this.loadConfig());
  private readonly _connected = signal(false);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly config = this._config.asReadonly();
  readonly connected = this._connected.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly configured = computed(() => this._config() !== null);

  /**
   * Save GitHub configuration and test the connection.
   */
  async connect(config: GitHubConfig): Promise<boolean> {
    this._loading.set(true);
    this._error.set(null);

    try {
      // Test the connection by fetching the repo
      const res = await this.api(`/repos/${config.owner}/${config.repo}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? `HTTP ${res.status}`);
      }

      this._config.set(config);
      this._connected.set(true);
      this.saveConfig(config);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      this._error.set(msg);
      this._connected.set(false);
      return false;
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Connect using only the OAuth token (no PAT needed).
   * Requires owner, repo, branch, and specsPath — token comes from GitHubOAuthService.
   */
  async connectWithOAuth(repoConfig: Omit<GitHubConfig, 'token'>): Promise<boolean> {
    const oauthToken = this.oauth.accessToken();
    if (!oauthToken) {
      this._error.set('Not signed in with GitHub OAuth');
      return false;
    }

    const config: GitHubConfig = { ...repoConfig, token: '' };
    return this.connect(config);
  }

  /**
   * Disconnect and clear saved config.
   */
  disconnect(): void {
    this._config.set(null);
    this._connected.set(false);
    this._error.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * List spec files in the configured repo specs directory.
   */
  async listSpecFiles(): Promise<GitHubRepoFile[]> {
    const cfg = this.requireConfig();
    this._loading.set(true);
    this._error.set(null);

    try {
      const files = await this.listDirectory(cfg.specsPath);
      return files.filter((f) => f.name.endsWith('.spec.md') || f.type === 'dir');
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Recursively list all .spec.md files in the specs directory.
   */
  async listAllSpecFiles(): Promise<GitHubRepoFile[]> {
    const cfg = this.requireConfig();
    this._loading.set(true);
    this._error.set(null);

    try {
      return await this.walkDirectory(cfg.specsPath);
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Read the content of a file from the repo.
   */
  async readFile(path: string): Promise<{ content: string; sha: string }> {
    const cfg = this.requireConfig();
    const res = await this.api(
      `/repos/${cfg.owner}/${cfg.repo}/contents/${path}?ref=${cfg.branch}`,
    );
    if (!res.ok) throw new Error(`Failed to read ${path}: HTTP ${res.status}`);

    const data = await res.json();
    const content = atob(data.content.replace(/\n/g, ''));
    return { content, sha: data.sha };
  }

  /**
   * Read multiple spec files and return them for import.
   */
  async pullSpecs(): Promise<{ name: string; content: string; path: string; sha: string }[]> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const files = await this.listAllSpecFiles();
      const specs: { name: string; content: string; path: string; sha: string }[] = [];

      for (const file of files) {
        const { content, sha } = await this.readFile(file.path);
        specs.push({ name: file.name, content, path: file.path, sha });
      }

      return specs;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to pull specs';
      this._error.set(msg);
      throw err;
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Create a new branch from the configured base branch.
   */
  async createBranch(branchName: string): Promise<void> {
    const cfg = this.requireConfig();

    // Get the SHA of the base branch
    const refRes = await this.api(
      `/repos/${cfg.owner}/${cfg.repo}/git/ref/heads/${cfg.branch}`,
    );
    if (!refRes.ok) throw new Error(`Failed to get base branch: HTTP ${refRes.status}`);
    const refData = await refRes.json();
    const baseSha = refData.object.sha;

    // Create the new branch
    const createRes = await this.api(`/repos/${cfg.owner}/${cfg.repo}/git/refs`, {
      method: 'POST',
      body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: baseSha }),
    });

    if (!createRes.ok) {
      const body = await createRes.json().catch(() => ({}));
      throw new Error(body.message ?? `Failed to create branch: HTTP ${createRes.status}`);
    }
  }

  /**
   * Create or update a file on a specific branch.
   */
  async pushFile(
    path: string,
    content: string,
    message: string,
    branch: string,
    existingSha?: string,
  ): Promise<string> {
    const cfg = this.requireConfig();
    const encoded = btoa(unescape(encodeURIComponent(content)));

    const body: Record<string, unknown> = {
      message,
      content: encoded,
      branch,
    };

    if (existingSha) {
      body['sha'] = existingSha;
    }

    const res = await this.api(`/repos/${cfg.owner}/${cfg.repo}/contents/${path}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message ?? `Failed to push ${path}: HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.content.sha;
  }

  /**
   * Push multiple spec files to a new branch and create a PR.
   */
  async pushSpecsAsPR(
    specs: { path: string; content: string; sha?: string }[],
    title: string,
    body: string,
  ): Promise<GitHubPullRequest> {
    const cfg = this.requireConfig();
    this._loading.set(true);
    this._error.set(null);

    try {
      // Create a unique branch name
      const timestamp = Date.now();
      const branchName = `specl/update-${timestamp}`;
      await this.createBranch(branchName);

      // Push each file to the new branch
      for (const spec of specs) {
        await this.pushFile(spec.path, spec.content, `docs: update ${spec.path}`, branchName, spec.sha);
      }

      // Create the pull request
      const prRes = await this.api(`/repos/${cfg.owner}/${cfg.repo}/pulls`, {
        method: 'POST',
        body: JSON.stringify({
          title,
          body,
          head: branchName,
          base: cfg.branch,
        }),
      });

      if (!prRes.ok) {
        const data = await prRes.json().catch(() => ({}));
        throw new Error(data.message ?? `Failed to create PR: HTTP ${prRes.status}`);
      }

      return await prRes.json();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to push specs';
      this._error.set(msg);
      throw err;
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Create a pull request for a single spec change.
   */
  async createSpecPR(
    specPath: string,
    content: string,
    existingSha: string | undefined,
    title: string,
    description: string,
  ): Promise<GitHubPullRequest> {
    return this.pushSpecsAsPR(
      [{ path: specPath, content, sha: existingSha }],
      title,
      description,
    );
  }

  /**
   * List repositories accessible to the authenticated user.
   * Fetches up to 100 repos sorted by most recently updated.
   */
  async listUserRepos(): Promise<GitHubRepo[]> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const res = await this.api('/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to list repos';
      this._error.set(msg);
      return [];
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Check if a repo has spec files by looking for common spec directories.
   * Returns the specs path if found, null otherwise.
   */
  async scanRepoForSpecs(owner: string, repo: string, branch: string): Promise<string | null> {
    const candidates = ['specs', 'spec', 'docs/specs'];

    for (const candidate of candidates) {
      try {
        const res = await this.api(
          `/repos/${owner}/${repo}/contents/${candidate}?ref=${branch}`,
        );
        if (!res.ok) continue;

        const data: Array<{ name: string; type: string }> = await res.json();
        const hasSpecFiles = data.some(
          (item) => item.name.endsWith('.spec.md') || item.type === 'dir',
        );
        if (hasSpecFiles) return candidate;
      } catch {
        continue;
      }
    }
    return null;
  }

  /**
   * List repos and check each for spec files.
   * Scans in parallel (batched) for speed.
   */
  async listReposWithSpecs(): Promise<RepoWithSpecs[]> {
    const repos = await this.listUserRepos();
    if (repos.length === 0) return [];

    this._loading.set(true);

    try {
      // Scan repos in parallel batches of 5 to avoid rate limiting
      const results: RepoWithSpecs[] = [];
      const batchSize = 5;

      for (let i = 0; i < repos.length; i += batchSize) {
        const batch = repos.slice(i, i + batchSize);
        const scanned = await Promise.all(
          batch.map(async (repo) => {
            const specsPath = await this.scanRepoForSpecs(
              repo.owner.login,
              repo.name,
              repo.default_branch,
            );
            return {
              ...repo,
              hasSpecs: specsPath !== null,
              specsPath,
            } as RepoWithSpecs;
          }),
        );
        results.push(...scanned);
      }

      // Sort: repos with specs first, then by updated_at
      results.sort((a, b) => {
        if (a.hasSpecs && !b.hasSpecs) return -1;
        if (!a.hasSpecs && b.hasSpecs) return 1;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });

      return results;
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Quick-connect to a repo using its metadata. Fills in defaults automatically.
   */
  async quickConnect(repo: RepoWithSpecs): Promise<boolean> {
    const repoConfig = {
      owner: repo.owner.login,
      repo: repo.name,
      branch: repo.default_branch,
      specsPath: repo.specsPath ?? 'specs',
    };

    if (this.oauth.accessToken()) {
      return this.connectWithOAuth(repoConfig);
    }
    return false;
  }

  // ─── Private helpers ─────────────────────────────────────────────

  private requireConfig(): GitHubConfig {
    const cfg = this._config();
    if (!cfg) throw new Error('GitHub not configured');
    return cfg;
  }

  private async api(path: string, init?: RequestInit): Promise<Response> {
    const cfg = this._config();
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    // Use PAT if available, otherwise fall back to OAuth token
    const token = cfg?.token || this.oauth.accessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(`https://api.github.com${path}`, {
      ...init,
      headers: { ...headers, ...(init?.headers as Record<string, string>) },
    });
  }

  private async listDirectory(path: string): Promise<GitHubRepoFile[]> {
    const cfg = this.requireConfig();
    const res = await this.api(
      `/repos/${cfg.owner}/${cfg.repo}/contents/${path}?ref=${cfg.branch}`,
    );
    if (!res.ok) throw new Error(`Failed to list ${path}: HTTP ${res.status}`);

    const data: Array<{ name: string; path: string; sha: string; type: string }> = await res.json();
    return data.map((item) => ({
      name: item.name,
      path: item.path,
      sha: item.sha,
      type: item.type as 'file' | 'dir',
    }));
  }

  private async walkDirectory(path: string): Promise<GitHubRepoFile[]> {
    const entries = await this.listDirectory(path);
    const files: GitHubRepoFile[] = [];

    for (const entry of entries) {
      if (entry.type === 'dir') {
        const subFiles = await this.walkDirectory(entry.path);
        files.push(...subFiles);
      } else if (entry.name.endsWith('.spec.md')) {
        files.push(entry);
      }
    }

    return files;
  }

  private loadConfig(): GitHubConfig | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as GitHubConfig;
    } catch {
      return null;
    }
  }

  private saveConfig(config: GitHubConfig): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }
}
