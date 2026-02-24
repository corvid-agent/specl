---
module: repo-browser
version: 1
status: active
files:
  - src/app/components/repo-browser/repo-browser.ts
  - src/app/components/repo-browser/repo-browser.html
  - src/app/components/repo-browser/repo-browser.scss
depends_on:
  - github-service
  - github-oauth
---

# Repo Browser

## Purpose

Displays the authenticated user's GitHub repositories in a scrollable, filterable list. Each repo shows whether it already has spec files. Repos with specs can be clicked to quick-connect; repos without specs show an "Add Specs" button that creates a branch, pushes a README and template, and opens a PR. This component is embedded inside the GitHub connect flow as an alternative to manual repo entry.

## Public API

### Exported Classes

| Class | Description |
|-------|-------------|
| `RepoBrowserComponent` | Angular standalone component for browsing and connecting GitHub repos |

### Component Inputs/Outputs

| Direction | Name | Type | Description |
|-----------|------|------|-------------|
| output | `manualConnect` | `void` | Emitted when user clicks "Manual" to switch to the manual connection form |
| output | `connected` | `void` | Emitted after a successful quick-connect to a repo |

### Component Signals

| Signal | Type | Description |
|--------|------|-------------|
| `repos` | `WritableSignal<RepoWithSpecs[]>` | Full list of user repos with spec detection results |
| `scanning` | `WritableSignal<boolean>` | True while repos are being scanned |
| `scanned` | `WritableSignal<boolean>` | True after scanning completes |
| `filter` | `WritableSignal<string>` | Current search/filter text |
| `connecting` | `WritableSignal<string \| null>` | `full_name` of repo being connected, or null |
| `initializing` | `WritableSignal<string \| null>` | `full_name` of repo being initialized with specs, or null |
| `initResult` | `WritableSignal<{repo, pr} \| null>` | Result after successful spec initialization |

## Invariants

1. `loadRepos()` is called on `ngOnInit` — the repo list is populated automatically
2. Repos are scanned in batches of 5 via `GitHubService.listReposWithSpecs()` to avoid rate limits
3. The repo list is scrollable (max-height with `overflow-y: auto`)
4. Filtering is case-insensitive and matches on `full_name` and `description`
5. Clicking a repo with specs calls `GitHubService.quickConnect(repo)` and emits `connected` on success
6. Clicking "Add Specs" calls `GitHubService.initializeSpecs(repo)`, then optimistically updates the repo to show `hasSpecs: true`
7. All interactive elements are disabled while a connect or init operation is in progress
8. The init result banner shows the PR link and can be dismissed

## Behavioral Examples

### Scenario: Scan repos on load

- **Given** the user is authenticated via OAuth
- **When** the component initializes
- **Then** `loadRepos()` fetches repos with spec detection, sets `scanning` to true during load, and `scanned` to true after

### Scenario: Filter repos

- **Given** repos are loaded and visible
- **When** user types "corvid" into the filter input
- **Then** only repos whose `full_name` or `description` contains "corvid" (case-insensitive) are shown

### Scenario: Quick-connect to a repo with specs

- **Given** repo `corvid-agent/specl` has `hasSpecs: true`
- **When** user clicks on it
- **Then** `connecting` is set to the repo name, `quickConnect()` is called, and `connected` is emitted on success

### Scenario: Initialize specs in a repo

- **Given** repo `corvid-agent/new-project` has `hasSpecs: false`
- **When** user clicks "Add Specs"
- **Then** `initializing` is set, `initializeSpecs()` creates a branch + PR, `initResult` shows the PR link, and the repo is optimistically updated to `hasSpecs: true`

### Scenario: Dismiss init result

- **Given** the init result banner is visible
- **When** user clicks "Dismiss"
- **Then** `initResult` is set to null and the banner disappears

## Error Cases

| Condition | Behavior |
|-----------|----------|
| No repos found | "No repositories found." message displayed |
| Filter matches nothing | "No repos match ..." message displayed |
| `quickConnect` fails | `connecting` is reset to null; `github.error()` shows the message |
| `initializeSpecs` fails | `initializing` is reset to null; error propagates via `github.error()` |
| Rate limit during scanning | Partial results displayed; error shown |

## Dependencies

### Consumes

| Module | What is used |
|--------|-------------|
| `github-service` | `listReposWithSpecs`, `quickConnect`, `initializeSpecs`, `error` signal |
| `github-oauth` | OAuth token presence check (indirectly via `GitHubService`) |

### Consumed By

| Module | What is used |
|--------|-------------|
| `github-connect` | Rendered as child component in the OAuth-authenticated branch |

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-02-24 | CorvidAgent | Initial spec — repo browser with scan, filter, quick-connect, and Add Specs |
