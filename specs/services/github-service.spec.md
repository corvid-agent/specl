---
module: github-service
version: 1
status: active
files:
  - src/app/services/github.service.ts
depends_on:
  - spec-models
  - spec-store-service
  - github-oauth
---

# GitHub Service

## Purpose

Provides GitHub API integration for the Specl application, enabling users to connect to a GitHub repository, pull `.spec.md` files, push changes to new branches, and create pull requests. All API calls use the GitHub REST API v3 with either a personal access token (PAT) or an OAuth access token from `GitHubOAuthService`. This is the bridge between the local IndexedDB spec store and remote GitHub repositories.

## Public API

### Exported Types

| Type | Description |
|------|-------------|
| `GitHubConfig` | Configuration interface: `token`, `owner`, `repo`, `branch`, `specsPath` |
| `GitHubRepoFile` | File metadata from GitHub Contents API: `name`, `path`, `sha`, `type` |
| `GitHubPullRequest` | PR metadata: `number`, `html_url`, `title`, `state` |

### Exported Classes

| Class | Description |
|-------|-------------|
| `GitHubService` | Angular injectable service for GitHub API operations |

#### GitHubService Signals (Readonly)

| Signal | Type | Description |
|--------|------|-------------|
| `config` | `Signal<GitHubConfig \| null>` | Current GitHub configuration, null if not configured |
| `connected` | `Signal<boolean>` | Whether a valid GitHub connection is active |
| `loading` | `Signal<boolean>` | Whether an API operation is in progress |
| `error` | `Signal<string \| null>` | Last error message, null if no error |
| `configured` | `Signal<boolean>` | Computed: true if config is non-null |

#### GitHubService Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `connect` | `(config: GitHubConfig)` | `Promise<boolean>` | Tests connection by fetching repo metadata, saves config to localStorage on success |
| `connectWithOAuth` | `(repoConfig: Omit<GitHubConfig, 'token'>)` | `Promise<boolean>` | Connects using the OAuth token from `GitHubOAuthService` instead of a PAT |
| `disconnect` | `()` | `void` | Clears config, connection state, and localStorage |
| `listSpecFiles` | `()` | `Promise<GitHubRepoFile[]>` | Lists `.spec.md` files and directories in the configured specs path |
| `listAllSpecFiles` | `()` | `Promise<GitHubRepoFile[]>` | Recursively lists all `.spec.md` files under the specs path |
| `readFile` | `(path: string)` | `Promise<{content, sha}>` | Reads a file's content (Base64-decoded) and SHA from the repo |
| `pullSpecs` | `()` | `Promise<{name, content, path, sha}[]>` | Reads all spec files and returns them ready for import into the store |
| `createBranch` | `(branchName: string)` | `Promise<void>` | Creates a new branch from the configured base branch |
| `pushFile` | `(path, content, message, branch, existingSha?)` | `Promise<string>` | Creates or updates a file on a branch, returns new SHA |
| `pushSpecsAsPR` | `(specs[], title, body)` | `Promise<GitHubPullRequest>` | Creates a branch, pushes all spec files, and opens a PR |
| `createSpecPR` | `(specPath, content, existingSha, title, description)` | `Promise<GitHubPullRequest>` | Convenience: pushes a single spec and creates a PR |

## Invariants

1. Config is persisted to `localStorage` under key `specl:github-config` on successful connect
2. `connect()` tests the connection by fetching `/repos/{owner}/{repo}` before saving config
3. `disconnect()` always clears both in-memory state and localStorage
4. All API requests include `Authorization: Bearer {token}` and `X-GitHub-Api-Version: 2022-11-28` headers; if config has no PAT, the OAuth token from `GitHubOAuthService` is used as fallback
5. `pullSpecs()` recursively walks the specs directory, only returning files ending in `.spec.md`
6. `pushSpecsAsPR()` creates a unique branch named `specl/update-{timestamp}` for each PR
7. File content is Base64-decoded on read and Base64-encoded (with UTF-8 handling) on write
8. Loading and error signals are set/cleared around all async operations
9. On app startup, config is restored from localStorage (but `connected` remains false until `connect()` is called)

## Behavioral Examples

### Scenario: Connect to a GitHub repository with PAT

- **Given** a valid PAT, owner `CorvidLabs`, repo `corvid-agent`, branch `main`, specsPath `specs`
- **When** `connect(config)` is called
- **Then** the service fetches `/repos/CorvidLabs/corvid-agent`, sets `connected` to true, saves config to localStorage

### Scenario: Connect to a GitHub repository with OAuth

- **Given** the user is authenticated via `GitHubOAuthService`
- **When** `connectWithOAuth({ owner: 'CorvidLabs', repo: 'corvid-agent', branch: 'main', specsPath: 'specs' })` is called
- **Then** the service uses the OAuth token for the API call, sets `connected` to true on success

### Scenario: Pull specs from a repository

- **Given** the service is connected and the repo has `specs/services/auth.spec.md` and `specs/models/user.spec.md`
- **When** `pullSpecs()` is called
- **Then** returns an array with two entries, each containing `name`, `content` (decoded markdown), `path`, and `sha`

### Scenario: Create a PR for a spec change

- **Given** a connected service and a spec at `specs/services/auth.spec.md` with SHA `abc123`
- **When** `createSpecPR('specs/services/auth.spec.md', content, 'abc123', 'docs: update auth', 'Updated auth spec')` is called
- **Then** a new branch `specl/update-{timestamp}` is created, the file is pushed with the existing SHA, and a PR is opened against the base branch

### Scenario: Disconnect

- **Given** the service is connected
- **When** `disconnect()` is called
- **Then** `config` becomes null, `connected` becomes false, and localStorage key is removed

## Error Cases

| Condition | Behavior |
|-----------|----------|
| Invalid token or repo on `connect()` | `error` signal set with API error message, `connected` stays false, returns false |
| API call without config | Throws `'GitHub not configured'` |
| File not found on `readFile()` | Throws with HTTP status |
| Branch already exists on `createBranch()` | Throws with GitHub API error message |
| Rate limit exceeded | API returns 403, error propagates to caller |
| Network failure | Fetch throws, caught and set as error message |

## Dependencies

### Consumes

| Module | What is used |
|--------|-------------|
| GitHub REST API (external) | Contents, Git Refs, Pulls endpoints |
| `localStorage` (browser) | Config persistence |
| `github-oauth` | `accessToken` signal used as auth fallback when PAT not set |

### Consumed By

| Module | What is used |
|--------|-------------|
| `github-connect` | `connect`, `connectWithOAuth`, `disconnect`, `pullSpecs`, signals |
| `editor-page` | `connected`, `createSpecPR` for PR creation |

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-02-24 | CorvidAgent | Initial spec — GitHub integration for pull/push/PR workflows |
| 2026-02-24 | CorvidAgent | Add OAuth token fallback via `GitHubOAuthService`, add `connectWithOAuth` method |
