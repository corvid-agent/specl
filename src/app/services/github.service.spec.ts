import { TestBed } from '@angular/core/testing';
import { GitHubService } from './github.service';
import { GitHubOAuthService } from './github-oauth.service';
import { signal } from '@angular/core';

describe('GitHubService', () => {
  let service: GitHubService;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const oauthSpy = {
      accessToken: signal('test-token'),
      authenticated: signal(true),
    };

    TestBed.configureTestingModule({
      providers: [
        GitHubService,
        { provide: GitHubOAuthService, useValue: oauthSpy },
      ],
    });

    service = TestBed.inject(GitHubService);

    // Mock fetch globally
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    // Mock localStorage
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, val: string) => { store[key] = val; },
      removeItem: (key: string) => { delete store[key]; },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('listUserRepos', () => {
    it('should fetch user repos sorted by updated', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { full_name: 'org/repo1', name: 'repo1', owner: { login: 'org' }, default_branch: 'main', private: false, description: null, updated_at: '2026-01-01', html_url: 'https://github.com/org/repo1' },
        ],
      });

      const repos = await service.listUserRepos();
      expect(repos.length).toBe(1);
      expect(repos[0].full_name).toBe('org/repo1');
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/user/repos'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        }),
      );
    });

    it('should return empty array on error', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Unauthorized' }),
      });

      const repos = await service.listUserRepos();
      expect(repos).toEqual([]);
    });
  });

  describe('scanRepoForSpecs', () => {
    it('should return specs path when spec files found', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tree: [
            { path: 'specs', type: 'tree' },
            { path: 'specs/auth.spec.md', type: 'blob' },
          ],
        }),
      });

      const path = await service.scanRepoForSpecs('org', 'repo', 'main');
      expect(path).toBe('specs');
    });

    it('should check multiple candidate directories', async () => {
      // Tree has 'spec' directory but not 'specs'
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tree: [
            { path: 'spec', type: 'tree' },
            { path: 'spec/foo.spec.md', type: 'blob' },
          ],
        }),
      });

      const path = await service.scanRepoForSpecs('org', 'repo', 'main');
      expect(path).toBe('spec');
    });

    it('should return null when no spec dirs found', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tree: [] }),
      });

      const path = await service.scanRepoForSpecs('org', 'repo', 'main');
      expect(path).toBeNull();
    });
  });

  describe('initializeSpecs', () => {
    it('should create branch, push files, and create PR', async () => {
      // Mock: get base branch SHA
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ object: { sha: 'abc123' } }),
      });

      // Mock: create branch
      fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      // Mock: push README
      fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({ content: { sha: 'def456' } }) });

      // Mock: push template
      fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({ content: { sha: 'ghi789' } }) });

      // Mock: create PR
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          number: 7,
          html_url: 'https://github.com/org/repo/pull/7',
          title: 'Initialize specs directory',
          state: 'open',
        }),
      });

      const repo = {
        full_name: 'org/repo',
        name: 'repo',
        owner: { login: 'org' },
        default_branch: 'main',
        private: false,
        description: null,
        updated_at: '2026-01-01',
        html_url: 'https://github.com/org/repo',
      };

      const pr = await service.initializeSpecs(repo);
      expect(pr.number).toBe(7);
      expect(pr.html_url).toBe('https://github.com/org/repo/pull/7');

      // Verify the calls
      expect(fetchSpy).toHaveBeenCalledTimes(5);

      // Call 1: get base branch
      expect(fetchSpy.mock.calls[0][0]).toContain('/repos/org/repo/git/ref/heads/main');

      // Call 2: create branch
      expect(fetchSpy.mock.calls[1][0]).toContain('/repos/org/repo/git/refs');

      // Call 3: push README
      expect(fetchSpy.mock.calls[2][0]).toContain('/repos/org/repo/contents/specs/README.md');

      // Call 4: push template
      expect(fetchSpy.mock.calls[3][0]).toContain('/repos/org/repo/contents/specs/_template.spec.md');

      // Call 5: create PR
      expect(fetchSpy.mock.calls[4][0]).toContain('/repos/org/repo/pulls');
    });

    it('should throw when base branch fetch fails', async () => {
      fetchSpy.mockResolvedValueOnce({ ok: false, status: 404 });

      const repo = {
        full_name: 'org/repo',
        name: 'repo',
        owner: { login: 'org' },
        default_branch: 'main',
        private: false,
        description: null,
        updated_at: '2026-01-01',
        html_url: 'https://github.com/org/repo',
      };

      await expect(service.initializeSpecs(repo)).rejects.toThrow('Failed to get base branch');
    });

    it('should set loading state during initialization', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ object: { sha: 'abc123' } }),
      });
      fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({ content: { sha: 'x' } }) });
      fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({ content: { sha: 'y' } }) });
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ number: 1, html_url: '', title: '', state: 'open' }),
      });

      const repo = {
        full_name: 'org/repo',
        name: 'repo',
        owner: { login: 'org' },
        default_branch: 'main',
        private: false,
        description: null,
        updated_at: '2026-01-01',
        html_url: 'https://github.com/org/repo',
      };

      await service.initializeSpecs(repo);
      // After completion, loading should be false
      expect(service.loading()).toBe(false);
    });
  });

  describe('connect', () => {
    it('should test connection and save config on success', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ full_name: 'org/repo' }),
      });

      const result = await service.connect({
        token: 'pat-token',
        owner: 'org',
        repo: 'repo',
        branch: 'main',
        specsPath: 'specs',
      });

      expect(result).toBe(true);
      expect(service.connected()).toBe(true);
      expect(service.config()).toBeTruthy();
    });

    it('should set error on connection failure', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Not Found' }),
      });

      const result = await service.connect({
        token: 'bad-token',
        owner: 'org',
        repo: 'nonexistent',
        branch: 'main',
        specsPath: 'specs',
      });

      expect(result).toBe(false);
      expect(service.connected()).toBe(false);
      expect(service.error()).toBe('Not Found');
    });
  });

  describe('disconnect', () => {
    it('should clear all state', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ full_name: 'org/repo' }),
      });
      await service.connect({
        token: 'token',
        owner: 'org',
        repo: 'repo',
        branch: 'main',
        specsPath: 'specs',
      });

      service.disconnect();
      expect(service.config()).toBeNull();
      expect(service.connected()).toBe(false);
    });
  });
});
