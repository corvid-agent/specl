import { TestBed } from '@angular/core/testing';
import { RepoBrowserComponent } from './repo-browser';
import {
  GitHubService,
  type RepoWithSpecs,
  type GitHubPullRequest,
} from '../../services/github.service';
import { GitHubOAuthService } from '../../services/github-oauth.service';
import { signal } from '@angular/core';

function makeRepo(overrides: Partial<RepoWithSpecs> = {}): RepoWithSpecs {
  return {
    full_name: 'owner/repo',
    name: 'repo',
    owner: { login: 'owner' },
    default_branch: 'main',
    private: false,
    description: 'A test repo',
    updated_at: '2026-01-01T00:00:00Z',
    html_url: 'https://github.com/owner/repo',
    hasSpecs: false,
    specsPath: null,
    ...overrides,
  };
}

const mockPR: GitHubPullRequest = {
  number: 42,
  html_url: 'https://github.com/owner/repo/pull/42',
  title: 'Initialize specs directory',
  state: 'open',
};

describe('RepoBrowserComponent', () => {
  let component: RepoBrowserComponent;
  let githubSpy: {
    listReposWithSpecs: ReturnType<typeof vi.fn>;
    quickConnect: ReturnType<typeof vi.fn>;
    initializeSpecs: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof signal>;
  };
  let oauthSpy: {
    accessToken: ReturnType<typeof signal>;
    authenticated: ReturnType<typeof signal>;
  };

  beforeEach(async () => {
    githubSpy = {
      listReposWithSpecs: vi.fn(async () => [
        makeRepo({ full_name: 'org/with-specs', name: 'with-specs', hasSpecs: true, specsPath: 'specs' }),
        makeRepo({ full_name: 'org/no-specs', name: 'no-specs', hasSpecs: false }),
        makeRepo({ full_name: 'org/another', name: 'another', description: 'Private helper', hasSpecs: false }),
      ]),
      quickConnect: vi.fn(async () => true),
      initializeSpecs: vi.fn(async () => mockPR),
      error: signal(null),
    };

    oauthSpy = {
      accessToken: signal('test-token'),
      authenticated: signal(true),
    };

    await TestBed.configureTestingModule({
      imports: [RepoBrowserComponent],
      providers: [
        { provide: GitHubService, useValue: githubSpy },
        { provide: GitHubOAuthService, useValue: oauthSpy },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(RepoBrowserComponent);
    component = fixture.componentInstance;
    // Don't call detectChanges (triggers ngOnInit) — we call loadRepos manually in tests
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load repos on init', async () => {
    await component.loadRepos();
    expect(githubSpy.listReposWithSpecs).toHaveBeenCalled();
    expect(component.repos().length).toBe(3);
    expect(component.scanned()).toBe(true);
    expect(component.scanning()).toBe(false);
  });

  it('should filter repos by name (case-insensitive)', async () => {
    await component.loadRepos();
    component.filter.set('with-specs');
    const filtered = component.filteredRepos();
    expect(filtered.length).toBe(1);
    expect(filtered[0].full_name).toBe('org/with-specs');
  });

  it('should filter repos by description', async () => {
    await component.loadRepos();
    component.filter.set('private helper');
    const filtered = component.filteredRepos();
    expect(filtered.length).toBe(1);
    expect(filtered[0].full_name).toBe('org/another');
  });

  it('should return all repos when filter is empty', async () => {
    await component.loadRepos();
    component.filter.set('');
    expect(component.filteredRepos().length).toBe(3);
  });

  it('should quick-connect to a repo with specs', async () => {
    await component.loadRepos();
    const repo = component.repos()[0]; // has specs
    const connectedSpy = vi.fn();
    component.connected.subscribe(connectedSpy);

    await component.onSelectRepo(repo);
    expect(githubSpy.quickConnect).toHaveBeenCalledWith(repo);
    expect(connectedSpy).toHaveBeenCalled();
  });

  it('should set connecting state during quick-connect', async () => {
    githubSpy.quickConnect.mockImplementation(async () => {
      expect(component.connecting()).toBe('org/with-specs');
      return true;
    });

    await component.loadRepos();
    const repo = component.repos()[0];
    await component.onSelectRepo(repo);
    expect(component.connecting()).toBeNull();
  });

  it('should initialize specs and set initResult', async () => {
    await component.loadRepos();
    const repo = component.repos()[1]; // no specs
    const event = { stopPropagation: vi.fn() } as unknown as Event;

    await component.onInitSpecs(event, repo);
    expect(event.stopPropagation).toHaveBeenCalled();
    expect(githubSpy.initializeSpecs).toHaveBeenCalledWith(repo);
    expect(component.initResult()).toEqual({ repo: 'org/no-specs', pr: mockPR });
  });

  it('should optimistically update repo after init', async () => {
    await component.loadRepos();
    const repo = component.repos()[1]; // no specs
    const event = { stopPropagation: vi.fn() } as unknown as Event;

    await component.onInitSpecs(event, repo);
    const updated = component.repos().find((r) => r.full_name === 'org/no-specs');
    expect(updated?.hasSpecs).toBe(true);
    expect(updated?.specsPath).toBe('specs');
  });

  it('should dismiss init result', async () => {
    await component.loadRepos();
    const repo = component.repos()[1];
    const event = { stopPropagation: vi.fn() } as unknown as Event;
    await component.onInitSpecs(event, repo);
    expect(component.initResult()).not.toBeNull();

    component.dismissInitResult();
    expect(component.initResult()).toBeNull();
  });

  it('should reset initializing state even on error', async () => {
    githubSpy.initializeSpecs.mockRejectedValue(new Error('API error'));
    await component.loadRepos();
    const repo = component.repos()[1];
    const event = { stopPropagation: vi.fn() } as unknown as Event;

    await component.onInitSpecs(event, repo).catch(() => {});
    expect(component.initializing()).toBeNull();
  });

  it('should emit manualConnect when manual button is clicked', () => {
    const spy = vi.fn();
    component.manualConnect.subscribe(spy);
    component.onManual();
    expect(spy).toHaveBeenCalled();
  });
});
