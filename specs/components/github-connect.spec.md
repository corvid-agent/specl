---
module: github-connect
version: 2
status: active
files:
  - src/app/components/github-connect/github-connect.ts
  - src/app/components/github-connect/github-connect.html
  - src/app/components/github-connect/github-connect.scss
depends_on:
  - github-service
  - github-oauth
---

# GitHub Connect

## Purpose

Sidebar component for configuring and managing the GitHub connection. Supports two authentication modes: **OAuth Device Flow** (primary, one-click "Sign in with GitHub") and **Personal Access Token** (fallback). Once authenticated, displays a repo configuration form. Once connected to a repo, displays the connection status and offers "Pull Specs" and "Disconnect" actions. Emits pulled specs to the parent component for import into the local store.

## Public API

### Exported Classes

| Class | Description |
|-------|-------------|
| `GitHubConnectComponent` | Angular standalone component for GitHub repository connection |

### Component Outputs

| Output | Type | Description |
|--------|------|-------------|
| `specsPulled` | `{name, content, path, sha}[]` | Emitted when specs are successfully pulled from the connected repo |

### Component Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `toggleForm` | `()` | `void` | Toggles visibility of the repo configuration form |
| `togglePat` | `()` | `void` | Toggles the PAT form and sets connect mode to `pat` |
| `onSignIn` | `()` | `Promise<void>` | Initiates GitHub OAuth Device Flow via `GitHubOAuthService` |
| `onCancelFlow` | `()` | `void` | Cancels an in-progress device flow |
| `onSignOut` | `()` | `void` | Signs out of OAuth, disconnects from repo |
| `onConnect` | `()` | `Promise<void>` | Connects to repo using OAuth token or PAT depending on auth state |
| `onDisconnect` | `()` | `void` | Disconnects from repo and hides the form |
| `onPull` | `()` | `Promise<void>` | Pulls all specs and emits via `specsPulled` output |
| `copyCode` | `()` | `Promise<void>` | Copies the device flow user code to clipboard |
| `updateField` | `(field, event)` | `void` | Updates a form field signal from an input event |

## Invariants

1. When `GITHUB_CLIENT_ID` is configured, a "Sign in with GitHub" button is shown as the primary auth method
2. A "Use Personal Access Token" button is always available as a fallback
3. During the device flow, the user code is displayed with a "Copy" button and a link to GitHub's verification page opens automatically
4. Once authenticated via OAuth, the user's avatar and username are displayed
5. After OAuth sign-in, a "Connect Repo" button reveals the repo configuration form (owner, repo, branch, specsPath — no token field)
6. In PAT mode, the full form includes the token field
7. When connected to a repo, the form is replaced by connection info showing `owner/repo` with "Pull Specs", "Disconnect", and (if OAuth) "Sign Out" buttons
8. The "Connect" button is disabled when required fields are empty
9. The "Pull Specs" button is disabled while loading
10. Error messages from both `GitHubService` and `GitHubOAuthService` are displayed in `.form-error`
11. Default values: branch is `main`, specsPath is `specs`

## Behavioral Examples

### Scenario: Sign in with GitHub OAuth

- **Given** user is not authenticated and `GITHUB_CLIENT_ID` is configured
- **When** user clicks "Sign in with GitHub"
- **Then** the device flow starts, a user code is displayed, GitHub verification page opens in a new tab, and the component shows "Waiting for authorization..."
- **And** once the user authorizes on GitHub, the component shows the user's avatar/username and a "Connect Repo" button

### Scenario: Connect repo after OAuth sign-in

- **Given** user is authenticated via OAuth but not connected to a repo
- **When** user clicks "Connect Repo", fills in owner/repo, and clicks "Connect"
- **Then** `GitHubService.connectWithOAuth()` is called using the OAuth token, and on success the component shows the connected state

### Scenario: Fall back to PAT

- **Given** user is not authenticated
- **When** user clicks "Use Personal Access Token", fills in token/owner/repo, and clicks "Connect"
- **Then** `GitHubService.connect()` is called with the PAT, and on success the form is replaced with connection status

### Scenario: Pull specs from connected repo

- **Given** user is connected to `CorvidLabs/corvid-agent`
- **When** user clicks "Pull Specs"
- **Then** all `.spec.md` files are fetched and emitted via `specsPulled`

### Scenario: Disconnect from repo

- **Given** user is connected
- **When** user clicks "Disconnect"
- **Then** `GitHubService.disconnect()` is called, component reverts to showing the auth buttons (OAuth session persists)

### Scenario: Sign out completely

- **Given** user is authenticated via OAuth and connected to a repo
- **When** user clicks "Sign Out"
- **Then** both `GitHubService.disconnect()` and `GitHubOAuthService.signOut()` are called, component reverts to initial state

## Error Cases

| Condition | Behavior |
|-----------|----------|
| Connection fails (bad token/repo) | Error message from GitHub service displayed in `.form-error` |
| OAuth device flow error | Error from `GitHubOAuthService` displayed in `.form-error` |
| Device code expires | Error message shown, user can retry |
| User denies OAuth authorization | Error message "Authorization was denied" shown |
| Pull fails (network/API error) | Error propagates to GitHub service's error signal |
| Form submitted with empty required fields | Connect button is disabled, no API call made |

## Dependencies

### Consumes

| Module | What is used |
|--------|-------------|
| `github-service` | `connect`, `connectWithOAuth`, `disconnect`, `pullSpecs`, `connected`, `loading`, `error`, `config` signals |
| `github-oauth` | `startDeviceFlow`, `cancelFlow`, `signOut`, `state`, `userCode`, `verificationUri`, `authenticated`, `username`, `avatarUrl`, `error` signals |
| `environment` | `GITHUB_CLIENT_ID` to determine if OAuth is available |

### Consumed By

| Module | What is used |
|--------|-------------|
| `spec-list` | Rendered as a child component, `specsPulled` output triggers import |

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-02-24 | CorvidAgent | Initial spec — GitHub connect sidebar component |
| 2026-02-24 | CorvidAgent | Add OAuth Device Flow support as primary auth, PAT as fallback |
