---
module: github-oauth
version: 1
status: active
files:
  - src/app/services/github-oauth.service.ts
depends_on:
  - github-service
---

# GitHub OAuth Service

## Purpose

Implements the GitHub OAuth Device Flow (RFC 8628) for Specl, enabling users to authenticate with GitHub without entering a personal access token (PAT). This is a client-only flow requiring no backend server — the user clicks "Sign in with GitHub," receives a one-time code, authorizes on GitHub's website, and the app automatically detects authorization and stores the access token. The service manages the full device flow lifecycle: initiation, polling, token storage, and sign-out.

## Public API

### Exported Types

| Type | Description |
|------|-------------|
| `OAuthState` | Union: `'idle' \| 'awaiting_code' \| 'polling' \| 'authenticated' \| 'error'` |
| `DeviceCodeResponse` | Device code response from GitHub: `device_code`, `user_code`, `verification_uri`, `expires_in`, `interval` |

### Exported Classes

| Class | Description |
|-------|-------------|
| `GitHubOAuthService` | Angular injectable service implementing the GitHub Device Flow |

#### Signals (Readonly)

| Signal | Type | Description |
|--------|------|-------------|
| `state` | `Signal<OAuthState>` | Current state of the OAuth flow |
| `userCode` | `Signal<string \| null>` | The user code to display during device flow, null when not in flow |
| `verificationUri` | `Signal<string \| null>` | The URI where user enters the code |
| `accessToken` | `Signal<string \| null>` | The OAuth access token, null if not authenticated |
| `username` | `Signal<string \| null>` | GitHub username of the authenticated user |
| `avatarUrl` | `Signal<string \| null>` | GitHub avatar URL of the authenticated user |
| `error` | `Signal<string \| null>` | Error message, null if no error |
| `authenticated` | `Signal<boolean>` | Computed: true when accessToken is non-null |

#### Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `startDeviceFlow` | `()` | `Promise<void>` | Initiates the device flow: requests a device code, then begins polling |
| `cancelFlow` | `()` | `void` | Cancels an in-progress device flow and resets to idle |
| `signOut` | `()` | `void` | Clears the stored access token, username, avatar, and resets to idle |

## Invariants

1. The GitHub OAuth App Client ID is configured via `environment.ts` as `GITHUB_CLIENT_ID`
2. Device flow requests go to `https://github.com/login/device/code` with `Accept: application/json`
3. Token polling requests go to `https://github.com/login/oauth/access_token` with `Accept: application/json`
4. Polling interval respects the `interval` value from the device code response (typically 5 seconds)
5. Polling stops when: token is granted, user denies, code expires, or flow is cancelled
6. Access token is stored in `localStorage` under key `specl:github-oauth-token`
7. Username and avatar URL are stored in `localStorage` under `specl:github-oauth-user`
8. On construction, the service restores token and user info from localStorage and sets `authenticated` if a token exists
9. After obtaining a token, the service fetches `/user` from the GitHub API to get the username and avatar
10. Requested scopes: `repo` (for read/write access to repositories)
11. `startDeviceFlow()` transitions state: `idle` → `awaiting_code` → `polling` → `authenticated`
12. If GitHub returns `slow_down` during polling, the interval is increased by 5 seconds
13. CORS proxy: GitHub's OAuth endpoints do not support CORS. Requests are proxied through `https://corsproxy.io/?url=` prefix
14. `cancelFlow()` aborts any in-progress polling and resets state to `idle`

## Behavioral Examples

### Scenario: Successful device flow authentication

- **Given** the service is in `idle` state
- **When** `startDeviceFlow()` is called
- **Then** state becomes `awaiting_code`, `userCode` and `verificationUri` are populated
- **And** state becomes `polling` while waiting for user to authorize
- **And** once authorized, state becomes `authenticated`, `accessToken` is set, user info is fetched

### Scenario: User denies authorization

- **Given** the service is polling for authorization
- **When** the user clicks "Cancel" on GitHub's device authorization page
- **Then** polling receives `access_denied` error, state becomes `error`, error message is set

### Scenario: Device code expires

- **Given** the service is polling and the code expires (default 15 minutes)
- **When** the next poll response returns `expired_token`
- **Then** state becomes `error` with message about expiration

### Scenario: Cancel flow

- **Given** the service is in `polling` state
- **When** `cancelFlow()` is called
- **Then** polling stops, state resets to `idle`, userCode and verificationUri are cleared

### Scenario: Restore session on startup

- **Given** localStorage contains a valid OAuth token and user info
- **When** the service is constructed
- **Then** `accessToken`, `username`, and `avatarUrl` are restored, state is `authenticated`

### Scenario: Sign out

- **Given** the service is in `authenticated` state
- **When** `signOut()` is called
- **Then** token and user info are cleared from memory and localStorage, state becomes `idle`

## Error Cases

| Condition | Behavior |
|-----------|----------|
| Device code request fails (network) | State set to `error`, error message from exception |
| GitHub returns `access_denied` | State set to `error`, message: "Authorization was denied" |
| GitHub returns `expired_token` | State set to `error`, message: "Device code expired — please try again" |
| Token polling network failure | Retries on next interval; gives up after 3 consecutive failures |
| `/user` fetch fails after token obtained | Token is still stored, username/avatar remain null |
| No `GITHUB_CLIENT_ID` configured | `startDeviceFlow()` throws: "GitHub OAuth Client ID not configured" |

## Dependencies

### Consumes

| Module | What is used |
|--------|-------------|
| GitHub OAuth API (external) | Device code and access token endpoints |
| GitHub REST API (external) | `/user` endpoint for profile info |
| `localStorage` (browser) | Token and user info persistence |
| `environment` | `GITHUB_CLIENT_ID` |

### Consumed By

| Module | What is used |
|--------|-------------|
| `github-connect` | `startDeviceFlow`, `signOut`, `cancelFlow`, signals for UI state |
| `github-service` | `accessToken` signal used as auth token when PAT not provided |

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-02-24 | CorvidAgent | Initial spec — GitHub OAuth Device Flow for client-side auth |
