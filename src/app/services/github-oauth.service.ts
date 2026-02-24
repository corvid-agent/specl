import { Injectable, signal, computed } from '@angular/core';
import { environment } from '../../environments/environment';

export type OAuthState = 'idle' | 'awaiting_code' | 'polling' | 'authenticated' | 'error';

export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

const TOKEN_KEY = 'specl:github-oauth-token';
const USER_KEY = 'specl:github-oauth-user';
const CORS_PROXY = 'https://corsproxy.io/?url=';

@Injectable({ providedIn: 'root' })
export class GitHubOAuthService {
  private readonly _state = signal<OAuthState>(this.restoreState());
  private readonly _userCode = signal<string | null>(null);
  private readonly _verificationUri = signal<string | null>(null);
  private readonly _accessToken = signal<string | null>(this.restoreToken());
  private readonly _username = signal<string | null>(this.restoreUser()?.login ?? null);
  private readonly _avatarUrl = signal<string | null>(this.restoreUser()?.avatar_url ?? null);
  private readonly _error = signal<string | null>(null);

  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private cancelled = false;

  readonly state = this._state.asReadonly();
  readonly userCode = this._userCode.asReadonly();
  readonly verificationUri = this._verificationUri.asReadonly();
  readonly accessToken = this._accessToken.asReadonly();
  readonly username = this._username.asReadonly();
  readonly avatarUrl = this._avatarUrl.asReadonly();
  readonly error = this._error.asReadonly();

  readonly authenticated = computed(() => this._accessToken() !== null);

  /**
   * Start the GitHub OAuth Device Flow.
   * Requests a device code, then polls for the access token.
   */
  async startDeviceFlow(): Promise<void> {
    const clientId = environment.GITHUB_CLIENT_ID;
    if (!clientId) {
      throw new Error('GitHub OAuth Client ID not configured');
    }

    this.cancelled = false;
    this._error.set(null);
    this._state.set('awaiting_code');

    try {
      // Step 1: Request device and user codes
      const codeRes = await fetch(`${CORS_PROXY}https://github.com/login/device/code`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          scope: 'repo',
        }),
      });

      if (!codeRes.ok) {
        throw new Error(`Device code request failed: HTTP ${codeRes.status}`);
      }

      const codeData: DeviceCodeResponse = await codeRes.json();
      this._userCode.set(codeData.user_code);
      this._verificationUri.set(codeData.verification_uri);

      // Open GitHub verification page in a new tab
      window.open(codeData.verification_uri, '_blank', 'noopener');

      // Step 2: Poll for the access token
      this._state.set('polling');
      await this.pollForToken(clientId, codeData);
    } catch (err: unknown) {
      if (!this.cancelled) {
        const msg = err instanceof Error ? err.message : 'OAuth flow failed';
        this._error.set(msg);
        this._state.set('error');
      }
    }
  }

  /**
   * Cancel an in-progress device flow.
   */
  cancelFlow(): void {
    this.cancelled = true;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    this._state.set('idle');
    this._userCode.set(null);
    this._verificationUri.set(null);
    this._error.set(null);
  }

  /**
   * Sign out: clear token, user info, and localStorage.
   */
  signOut(): void {
    this.cancelFlow();
    this._accessToken.set(null);
    this._username.set(null);
    this._avatarUrl.set(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  // ─── Private helpers ─────────────────────────────────────────────

  private async pollForToken(clientId: string, codeData: DeviceCodeResponse): Promise<void> {
    let interval = codeData.interval * 1000; // Convert to ms
    const expiresAt = Date.now() + codeData.expires_in * 1000;
    let consecutiveFailures = 0;

    while (!this.cancelled) {
      // Wait for the polling interval
      await new Promise<void>((resolve) => {
        this.pollTimer = setTimeout(resolve, interval);
      });

      if (this.cancelled) return;

      // Check if the code has expired
      if (Date.now() >= expiresAt) {
        this._error.set('Device code expired — please try again');
        this._state.set('error');
        return;
      }

      try {
        const tokenRes = await fetch(`${CORS_PROXY}https://github.com/login/oauth/access_token`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_id: clientId,
            device_code: codeData.device_code,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          }),
        });

        if (!tokenRes.ok) {
          consecutiveFailures++;
          if (consecutiveFailures >= 3) {
            this._error.set('Token polling failed after multiple attempts');
            this._state.set('error');
            return;
          }
          continue;
        }

        const tokenData = await tokenRes.json();
        consecutiveFailures = 0;

        if (tokenData.access_token) {
          // Success!
          this._accessToken.set(tokenData.access_token);
          localStorage.setItem(TOKEN_KEY, tokenData.access_token);

          this._userCode.set(null);
          this._verificationUri.set(null);
          this._state.set('authenticated');

          // Fetch user profile
          await this.fetchUserProfile(tokenData.access_token);
          return;
        }

        // Handle pending/error states from GitHub
        switch (tokenData.error) {
          case 'authorization_pending':
            // User hasn't authorized yet — keep polling
            break;

          case 'slow_down':
            // Increase interval by 5 seconds
            interval += 5000;
            break;

          case 'expired_token':
            this._error.set('Device code expired — please try again');
            this._state.set('error');
            return;

          case 'access_denied':
            this._error.set('Authorization was denied');
            this._state.set('error');
            return;

          default:
            this._error.set(tokenData.error_description ?? tokenData.error ?? 'Unknown OAuth error');
            this._state.set('error');
            return;
        }
      } catch {
        consecutiveFailures++;
        if (consecutiveFailures >= 3) {
          this._error.set('Token polling failed after multiple attempts');
          this._state.set('error');
          return;
        }
      }
    }
  }

  private async fetchUserProfile(token: string): Promise<void> {
    try {
      const res = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
        },
      });

      if (res.ok) {
        const user = await res.json();
        this._username.set(user.login);
        this._avatarUrl.set(user.avatar_url);
        localStorage.setItem(USER_KEY, JSON.stringify({ login: user.login, avatar_url: user.avatar_url }));
      }
    } catch {
      // Non-fatal: token works but we couldn't get user info
    }
  }

  private restoreToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  private restoreUser(): { login: string; avatar_url: string } | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private restoreState(): OAuthState {
    try {
      return localStorage.getItem(TOKEN_KEY) ? 'authenticated' : 'idle';
    } catch {
      return 'idle';
    }
  }
}
