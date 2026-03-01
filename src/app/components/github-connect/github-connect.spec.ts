import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { GitHubConnectComponent } from './github-connect';
import { GitHubService } from '../../services/github.service';
import { GitHubOAuthService, type OAuthState } from '../../services/github-oauth.service';
import { signal } from '@angular/core';

function createGitHubServiceSpy() {
  return {
    connected: signal(false),
    loading: signal(false),
    error: signal<string | null>(null),
    config: signal<{ owner: string; repo: string; branch: string; specsPath: string } | null>(null),
    connect: vi.fn(async () => {}),
    connectWithOAuth: vi.fn(async () => {}),
    disconnect: vi.fn(),
    pullSpecs: vi.fn(async () => [] as { name: string; content: string; path: string; sha: string }[]),
    listReposWithSpecs: vi.fn(async () => []),
    initSpecsInRepo: vi.fn(async () => ({ pr: null })),
  };
}

function createOAuthServiceSpy() {
  return {
    state: signal<OAuthState>('idle'),
    authenticated: signal(false),
    userCode: signal<string | null>(null),
    verificationUri: signal<string | null>(null),
    accessToken: signal<string | null>(null),
    username: signal<string | null>(null),
    avatarUrl: signal<string | null>(null),
    error: signal<string | null>(null),
    startDeviceFlow: vi.fn(async () => {}),
    cancelFlow: vi.fn(),
    signOut: vi.fn(),
  };
}

describe('GitHubConnectComponent', () => {
  let component: GitHubConnectComponent;
  let fixture: ComponentFixture<GitHubConnectComponent>;
  let githubSpy: ReturnType<typeof createGitHubServiceSpy>;
  let oauthSpy: ReturnType<typeof createOAuthServiceSpy>;

  beforeEach(async () => {
    githubSpy = createGitHubServiceSpy();
    oauthSpy = createOAuthServiceSpy();

    await TestBed.configureTestingModule({
      imports: [GitHubConnectComponent],
      providers: [
        { provide: GitHubService, useValue: githubSpy },
        { provide: GitHubOAuthService, useValue: oauthSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GitHubConnectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // --- Creation ---

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // --- Idle state (not connected, not authenticated) ---

  describe('idle state', () => {
    it('should show PAT toggle button', () => {
      const patBtn = fixture.nativeElement.querySelector('.github-toggle');
      expect(patBtn).toBeTruthy();
      expect(patBtn.textContent.trim()).toContain('Use Personal Access Token');
    });

    it('should not show connected view', () => {
      const connected = fixture.nativeElement.querySelector('.github-connected');
      expect(connected).toBeFalsy();
    });

    it('should not show device flow view', () => {
      const deviceFlow = fixture.nativeElement.querySelector('.device-flow');
      expect(deviceFlow).toBeFalsy();
    });
  });

  // --- PAT form toggle ---

  describe('PAT form', () => {
    it('togglePat() should show form and set mode to pat', () => {
      component.togglePat();
      fixture.detectChanges();
      expect(component.showForm()).toBe(true);
      expect(component.connectMode()).toBe('pat');
    });

    it('should show token input when PAT form is open', () => {
      component.togglePat();
      fixture.detectChanges();
      const tokenInput = fixture.nativeElement.querySelector('input[type="password"]');
      expect(tokenInput).toBeTruthy();
    });

    it('should show owner, repo, branch, specsPath inputs in PAT form', () => {
      component.togglePat();
      fixture.detectChanges();
      const inputs = fixture.nativeElement.querySelectorAll('.form-input');
      expect(inputs.length).toBe(5); // token + owner + repo + branch + specsPath
    });

    it('calling togglePat() twice should hide the form', () => {
      component.togglePat();
      fixture.detectChanges();
      expect(component.showForm()).toBe(true);

      component.togglePat();
      fixture.detectChanges();
      expect(component.showForm()).toBe(false);
    });

    it('connect button should be disabled when required fields are empty', () => {
      component.togglePat();
      fixture.detectChanges();
      const connectBtn = fixture.nativeElement.querySelector('.btn-primary');
      expect(connectBtn.disabled).toBe(true);
    });

    it('connect button should be enabled when token, owner, and repo are filled', () => {
      component.togglePat();
      component.token.set('ghp_test123');
      component.owner.set('test-org');
      component.repo.set('test-repo');
      fixture.detectChanges();
      const connectBtn = fixture.nativeElement.querySelector('.btn-primary');
      expect(connectBtn.disabled).toBe(false);
    });
  });

  // --- Signal state management ---

  describe('signal state', () => {
    it('should have default values', () => {
      expect(component.showForm()).toBe(false);
      expect(component.showManualForm()).toBe(false);
      expect(component.connectMode()).toBe('oauth');
      expect(component.token()).toBe('');
      expect(component.owner()).toBe('');
      expect(component.repo()).toBe('');
      expect(component.branch()).toBe('main');
      expect(component.specsPath()).toBe('specs');
    });

    it('setMode should change connectMode', () => {
      component.setMode('pat');
      expect(component.connectMode()).toBe('pat');
      component.setMode('oauth');
      expect(component.connectMode()).toBe('oauth');
    });

    it('updateField should update the corresponding signal', () => {
      const event = { target: { value: 'new-owner' } } as unknown as Event;
      component.updateField('owner', event);
      expect(component.owner()).toBe('new-owner');
    });

    it('updateField should work for all supported fields', () => {
      const fields = ['token', 'owner', 'repo', 'branch', 'specsPath'] as const;
      for (const field of fields) {
        const event = { target: { value: `test-${field}` } } as unknown as Event;
        component.updateField(field, event);
        expect(component[field]()).toBe(`test-${field}`);
      }
    });
  });

  // --- Device flow (awaiting_code / polling) ---

  describe('device flow state', () => {
    beforeEach(() => {
      oauthSpy.state.set('awaiting_code');
      oauthSpy.userCode.set('ABCD-1234');
      oauthSpy.verificationUri.set('https://github.com/login/device');
      fixture.detectChanges();
    });

    it('should show device flow UI', () => {
      const deviceFlow = fixture.nativeElement.querySelector('.device-flow');
      expect(deviceFlow).toBeTruthy();
    });

    it('should display the user code', () => {
      const code = fixture.nativeElement.querySelector('.device-code');
      expect(code.textContent.trim()).toBe('ABCD-1234');
    });

    it('should show verification link', () => {
      const link = fixture.nativeElement.querySelector('.verification-link');
      expect(link).toBeTruthy();
      expect(link.getAttribute('href')).toBe('https://github.com/login/device');
    });

    it('should show cancel button', () => {
      const buttons = fixture.nativeElement.querySelectorAll('.device-flow > button');
      const cancelBtn = buttons[buttons.length - 1];
      expect(cancelBtn.textContent.trim()).toBe('Cancel');
    });

    it('clicking cancel should call oauth.cancelFlow()', () => {
      const buttons = fixture.nativeElement.querySelectorAll('.device-flow > button');
      const cancelBtn = buttons[buttons.length - 1];
      cancelBtn.click();
      expect(oauthSpy.cancelFlow).toHaveBeenCalled();
    });

    it('should show polling status when state is polling', () => {
      oauthSpy.state.set('polling');
      fixture.detectChanges();
      const status = fixture.nativeElement.querySelector('.polling-status');
      expect(status).toBeTruthy();
      expect(status.textContent).toContain('Waiting for authorization');
    });
  });

  // --- Connected state ---

  describe('connected state', () => {
    beforeEach(() => {
      githubSpy.connected.set(true);
      githubSpy.config.set({ owner: 'test-org', repo: 'test-repo', branch: 'main', specsPath: 'specs' });
      fixture.detectChanges();
    });

    it('should show connected view', () => {
      const connected = fixture.nativeElement.querySelector('.github-connected');
      expect(connected).toBeTruthy();
    });

    it('should display owner/repo label', () => {
      const label = fixture.nativeElement.querySelector('.connection-label');
      expect(label.textContent).toContain('test-org');
      expect(label.textContent).toContain('test-repo');
    });

    it('should show Pull Specs button', () => {
      const pullBtn = fixture.nativeElement.querySelector('.btn-primary');
      expect(pullBtn.textContent.trim()).toContain('Pull Specs');
    });

    it('should show Disconnect button', () => {
      const buttons = fixture.nativeElement.querySelectorAll('.connected-actions button');
      const disconnectBtn = Array.from(buttons).find(
        (b) => (b as HTMLElement).textContent?.trim() === 'Disconnect',
      ) as HTMLElement;
      expect(disconnectBtn).toBeTruthy();
    });

    it('Pull Specs button should be disabled while loading', () => {
      githubSpy.loading.set(true);
      fixture.detectChanges();
      const pullBtn = fixture.nativeElement.querySelector('.btn-primary');
      expect(pullBtn.disabled).toBe(true);
      expect(pullBtn.textContent.trim()).toContain('Pulling');
    });

    it('clicking Disconnect should call github.disconnect()', () => {
      const buttons = fixture.nativeElement.querySelectorAll('.connected-actions button');
      const disconnectBtn = Array.from(buttons).find(
        (b) => (b as HTMLElement).textContent?.trim() === 'Disconnect',
      ) as HTMLElement;
      disconnectBtn.click();
      expect(githubSpy.disconnect).toHaveBeenCalled();
    });

    it('should show Sign Out button when OAuth authenticated', () => {
      oauthSpy.authenticated.set(true);
      fixture.detectChanges();
      const buttons = fixture.nativeElement.querySelectorAll('.connected-actions button');
      const signOutBtn = Array.from(buttons).find(
        (b) => (b as HTMLElement).textContent?.trim() === 'Sign Out',
      ) as HTMLElement;
      expect(signOutBtn).toBeTruthy();
    });

    it('should show avatar when OAuth authenticated', () => {
      oauthSpy.authenticated.set(true);
      oauthSpy.avatarUrl.set('https://example.com/avatar.png');
      oauthSpy.username.set('testuser');
      fixture.detectChanges();
      const avatar = fixture.nativeElement.querySelector('.avatar');
      expect(avatar).toBeTruthy();
    });

    it('should show status dot when not OAuth authenticated', () => {
      oauthSpy.authenticated.set(false);
      fixture.detectChanges();
      const dot = fixture.nativeElement.querySelector('.status-dot');
      expect(dot).toBeTruthy();
    });
  });

  // --- OAuth signed in but not connected ---

  describe('OAuth signed in, not connected', () => {
    beforeEach(() => {
      oauthSpy.authenticated.set(true);
      oauthSpy.state.set('authenticated');
      oauthSpy.username.set('testuser');
      oauthSpy.avatarUrl.set('https://example.com/avatar.png');
      githubSpy.connected.set(false);
      fixture.detectChanges();
    });

    it('should show signed-in view with username', () => {
      const label = fixture.nativeElement.querySelector('.connection-label');
      expect(label.textContent).toContain('testuser');
    });

    it('should show repo browser by default', () => {
      const repoBrowser = fixture.nativeElement.querySelector('app-repo-browser');
      expect(repoBrowser).toBeTruthy();
    });

    it('should show manual form after clicking manual connect', () => {
      component.onManualConnect();
      fixture.detectChanges();
      const form = fixture.nativeElement.querySelector('.github-form');
      expect(form).toBeTruthy();
    });

    it('onRepoBrowserConnected should hide manual form', () => {
      component.onManualConnect();
      fixture.detectChanges();
      component.onRepoBrowserConnected();
      fixture.detectChanges();
      expect(component.showManualForm()).toBe(false);
    });
  });

  // --- Connection actions ---

  describe('connection actions', () => {
    it('onConnect with PAT mode should call github.connect()', async () => {
      oauthSpy.authenticated.set(false);
      component.token.set('ghp_test');
      component.owner.set('myorg');
      component.repo.set('myrepo');
      component.branch.set('main');
      component.specsPath.set('specs');

      await component.onConnect();
      expect(githubSpy.connect).toHaveBeenCalledWith({
        token: 'ghp_test',
        owner: 'myorg',
        repo: 'myrepo',
        branch: 'main',
        specsPath: 'specs',
      });
    });

    it('onConnect with OAuth mode should call github.connectWithOAuth()', async () => {
      oauthSpy.authenticated.set(true);
      component.owner.set('myorg');
      component.repo.set('myrepo');
      component.branch.set('dev');
      component.specsPath.set('docs/specs');

      await component.onConnect();
      expect(githubSpy.connectWithOAuth).toHaveBeenCalledWith({
        owner: 'myorg',
        repo: 'myrepo',
        branch: 'dev',
        specsPath: 'docs/specs',
      });
    });

    it('onSignIn should call oauth.startDeviceFlow()', async () => {
      await component.onSignIn();
      expect(oauthSpy.startDeviceFlow).toHaveBeenCalled();
    });

    it('onCancelFlow should call oauth.cancelFlow()', () => {
      component.onCancelFlow();
      expect(oauthSpy.cancelFlow).toHaveBeenCalled();
    });

    it('onSignOut should call both github.disconnect() and oauth.signOut()', () => {
      component.onSignOut();
      expect(githubSpy.disconnect).toHaveBeenCalled();
      expect(oauthSpy.signOut).toHaveBeenCalled();
    });

    it('onSignOut should hide form', () => {
      component.showForm.set(true);
      component.onSignOut();
      expect(component.showForm()).toBe(false);
    });

    it('onDisconnect should call github.disconnect() and hide forms', () => {
      component.showForm.set(true);
      component.showManualForm.set(true);
      component.onDisconnect();
      expect(githubSpy.disconnect).toHaveBeenCalled();
      expect(component.showForm()).toBe(false);
      expect(component.showManualForm()).toBe(false);
    });

    it('onPull should call github.pullSpecs() and emit result', async () => {
      const mockSpecs = [{ name: 'test.spec.md', content: '# Test', path: 'specs/test.spec.md', sha: 'abc123' }];
      githubSpy.pullSpecs.mockResolvedValue(mockSpecs);

      let emitted: unknown[] | null = null;
      component.specsPulled.subscribe((specs) => {
        emitted = specs;
      });

      await component.onPull();
      expect(githubSpy.pullSpecs).toHaveBeenCalled();
      expect(emitted).toEqual(mockSpecs);
    });
  });

  // --- Error display ---

  describe('error display', () => {
    it('should show OAuth error when state is error', () => {
      oauthSpy.state.set('error');
      oauthSpy.error.set('OAuth flow failed');
      fixture.detectChanges();
      const errorDiv = fixture.nativeElement.querySelector('.form-error');
      expect(errorDiv).toBeTruthy();
      expect(errorDiv.textContent).toContain('OAuth flow failed');
    });

    it('should show GitHub error in PAT form', () => {
      component.togglePat();
      githubSpy.error.set('Invalid token');
      fixture.detectChanges();
      const errorDiv = fixture.nativeElement.querySelector('.form-error');
      expect(errorDiv).toBeTruthy();
      expect(errorDiv.textContent).toContain('Invalid token');
    });
  });

  // --- Accessibility ---

  describe('accessibility', () => {
    it('should have aria-label on section', () => {
      const section = fixture.nativeElement.querySelector('section[aria-label="GitHub connection"]');
      expect(section).toBeTruthy();
    });

    it('PAT toggle should have aria-expanded', () => {
      const toggle = fixture.nativeElement.querySelector('.github-toggle');
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      component.togglePat();
      fixture.detectChanges();
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
    });

    it('error messages should have role="alert"', () => {
      oauthSpy.state.set('error');
      oauthSpy.error.set('Test error');
      fixture.detectChanges();
      const alert = fixture.nativeElement.querySelector('[role="alert"]');
      expect(alert).toBeTruthy();
    });

    it('device flow region should have aria-label', () => {
      oauthSpy.state.set('awaiting_code');
      oauthSpy.userCode.set('TEST-CODE');
      fixture.detectChanges();
      const region = fixture.nativeElement.querySelector('[aria-label="Device authorization"]');
      expect(region).toBeTruthy();
    });
  });
});
