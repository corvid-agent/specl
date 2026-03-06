import { TestBed } from '@angular/core/testing';
import { GitHubOAuthService } from './github-oauth.service';
import { environment } from '../../environments/environment';

describe('GitHubOAuthService', () => {
  let service: GitHubOAuthService;
  let fetchSpy: ReturnType<typeof vi.fn>;
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, val: string) => {
        store[key] = val;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
    });

    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    // Stub window.open to prevent actual navigation
    vi.stubGlobal('open', vi.fn());

    TestBed.configureTestingModule({
      providers: [GitHubOAuthService],
    });

    service = TestBed.inject(GitHubOAuthService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should start idle when no token in localStorage', () => {
      expect(service.state()).toBe('idle');
      expect(service.accessToken()).toBeNull();
      expect(service.authenticated()).toBe(false);
    });

    it('should restore authenticated state from localStorage', () => {
      store['specl:github-oauth-token'] = 'saved-token';
      store['specl:github-oauth-user'] = JSON.stringify({
        login: 'octocat',
        avatar_url: 'https://github.com/octocat.png',
      });

      // Re-create the service so constructor picks up stored values
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [GitHubOAuthService] });
      const restored = TestBed.inject(GitHubOAuthService);

      expect(restored.state()).toBe('authenticated');
      expect(restored.accessToken()).toBe('saved-token');
      expect(restored.username()).toBe('octocat');
      expect(restored.avatarUrl()).toBe('https://github.com/octocat.png');
      expect(restored.authenticated()).toBe(true);
    });

    it('should handle corrupt JSON in localStorage gracefully', () => {
      store['specl:github-oauth-token'] = 'some-token';
      store['specl:github-oauth-user'] = '{broken json';

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [GitHubOAuthService] });
      const restored = TestBed.inject(GitHubOAuthService);

      // Token restores fine, but user parse fails gracefully
      expect(restored.state()).toBe('authenticated');
      expect(restored.accessToken()).toBe('some-token');
      expect(restored.username()).toBeNull();
      expect(restored.avatarUrl()).toBeNull();
    });
  });

  describe('cancelFlow', () => {
    it('should reset all flow state to idle', () => {
      service.cancelFlow();
      expect(service.state()).toBe('idle');
      expect(service.userCode()).toBeNull();
      expect(service.verificationUri()).toBeNull();
      expect(service.error()).toBeNull();
    });
  });

  describe('signOut', () => {
    it('should clear token and user info from signals and localStorage', () => {
      store['specl:github-oauth-token'] = 'my-token';
      store['specl:github-oauth-user'] = JSON.stringify({ login: 'u', avatar_url: 'a' });

      service.signOut();

      expect(service.state()).toBe('idle');
      expect(service.accessToken()).toBeNull();
      expect(service.username()).toBeNull();
      expect(service.avatarUrl()).toBeNull();
      expect(store['specl:github-oauth-token']).toBeUndefined();
      expect(store['specl:github-oauth-user']).toBeUndefined();
    });
  });

  describe('startDeviceFlow', () => {
    it('should throw when GITHUB_CLIENT_ID is empty', async () => {
      const original = environment.GITHUB_CLIENT_ID;
      (environment as { GITHUB_CLIENT_ID: string }).GITHUB_CLIENT_ID = '';

      await expect(service.startDeviceFlow()).rejects.toThrow(
        'GitHub OAuth Client ID not configured',
      );

      (environment as { GITHUB_CLIENT_ID: string }).GITHUB_CLIENT_ID = original;
    });

    it('should set error state when device code request fails', async () => {
      fetchSpy.mockResolvedValueOnce({ ok: false, status: 500 });

      await service.startDeviceFlow();

      expect(service.state()).toBe('error');
      expect(service.error()).toContain('HTTP 500');
    });

    it('should complete full flow with successful token', async () => {
      // Step 1: device code response
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          device_code: 'dc-123',
          user_code: 'ABCD-1234',
          verification_uri: 'https://github.com/login/device',
          expires_in: 900,
          interval: 0, // 0 seconds for fast test
        }),
      });

      // Step 2: token response — immediate success
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'gho_abc123' }),
      });

      // Step 3: user profile fetch
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ login: 'testuser', avatar_url: 'https://example.com/avatar.png' }),
      });

      await service.startDeviceFlow();

      expect(service.state()).toBe('authenticated');
      expect(service.accessToken()).toBe('gho_abc123');
      expect(service.username()).toBe('testuser');
      expect(service.avatarUrl()).toBe('https://example.com/avatar.png');
      expect(service.userCode()).toBeNull(); // Cleared after success
      expect(store['specl:github-oauth-token']).toBe('gho_abc123');
    });

    it('should handle access_denied error from GitHub', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          device_code: 'dc-456',
          user_code: 'EFGH-5678',
          verification_uri: 'https://github.com/login/device',
          expires_in: 900,
          interval: 0,
        }),
      });

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: 'access_denied' }),
      });

      await service.startDeviceFlow();

      expect(service.state()).toBe('error');
      expect(service.error()).toBe('Authorization was denied');
    });

    it('should handle expired_token error from GitHub', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          device_code: 'dc-789',
          user_code: 'IJKL-9012',
          verification_uri: 'https://github.com/login/device',
          expires_in: 900,
          interval: 0,
        }),
      });

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: 'expired_token' }),
      });

      await service.startDeviceFlow();

      expect(service.state()).toBe('error');
      expect(service.error()).toContain('expired');
    });

    it('should set error after 3 consecutive HTTP failures', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          device_code: 'dc-fail',
          user_code: 'FAIL-0000',
          verification_uri: 'https://github.com/login/device',
          expires_in: 900,
          interval: 0,
        }),
      });

      // 3 consecutive non-ok responses
      for (let i = 0; i < 3; i++) {
        fetchSpy.mockResolvedValueOnce({ ok: false, status: 502 });
      }

      await service.startDeviceFlow();

      expect(service.state()).toBe('error');
      expect(service.error()).toBe('Token polling failed after multiple attempts');
    });

    it('should set error after 3 consecutive network errors', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          device_code: 'dc-net',
          user_code: 'NET-0000',
          verification_uri: 'https://github.com/login/device',
          expires_in: 900,
          interval: 0,
        }),
      });

      // 3 consecutive fetch throws
      for (let i = 0; i < 3; i++) {
        fetchSpy.mockRejectedValueOnce(new Error('Network error'));
      }

      await service.startDeviceFlow();

      expect(service.state()).toBe('error');
      expect(service.error()).toBe('Token polling failed after multiple attempts');
    });

    it('should handle unknown OAuth error with error_description', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          device_code: 'dc-unk',
          user_code: 'UNK-0000',
          verification_uri: 'https://github.com/login/device',
          expires_in: 900,
          interval: 0,
        }),
      });

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          error: 'some_custom_error',
          error_description: 'Something went wrong on GitHub',
        }),
      });

      await service.startDeviceFlow();

      expect(service.state()).toBe('error');
      expect(service.error()).toBe('Something went wrong on GitHub');
    });

    it('should handle non-fatal user profile fetch failure', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          device_code: 'dc-nf',
          user_code: 'NF-0000',
          verification_uri: 'https://github.com/login/device',
          expires_in: 900,
          interval: 0,
        }),
      });

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'gho_noprofile' }),
      });

      // Profile fetch fails
      fetchSpy.mockResolvedValueOnce({ ok: false, status: 403 });

      await service.startDeviceFlow();

      // Should still be authenticated — profile failure is non-fatal
      expect(service.state()).toBe('authenticated');
      expect(service.accessToken()).toBe('gho_noprofile');
      expect(service.username()).toBeNull();
    });
  });
});
