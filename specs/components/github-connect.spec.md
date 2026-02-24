---
module: github-connect
version: 1
status: active
files:
  - src/app/components/github-connect/github-connect.ts
  - src/app/components/github-connect/github-connect.html
  - src/app/components/github-connect/github-connect.scss
depends_on:
  - github-service
---

# GitHub Connect

## Purpose

Sidebar component for configuring and managing the GitHub connection. Provides a form to enter PAT, owner, repo, branch, and specs path. Once connected, displays the connection status and offers "Pull Specs" and "Disconnect" actions. Emits pulled specs to the parent component for import into the local store.

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
| `toggleForm` | `()` | `void` | Toggles visibility of the connection form |
| `onConnect` | `()` | `Promise<void>` | Builds config from form fields and calls `github.connect()` |
| `onDisconnect` | `()` | `void` | Disconnects and hides the form |
| `onPull` | `()` | `Promise<void>` | Pulls all specs and emits via `specsPulled` output |
| `updateField` | `(field, event)` | `void` | Updates a form field signal from an input event |

## Invariants

1. The form is hidden by default and toggled with the "Connect GitHub" button
2. When connected, the form is replaced by connection info showing `owner/repo`
3. The "Connect" button is disabled when token, owner, or repo fields are empty
4. The "Pull Specs" button is disabled while loading
5. Error messages from the GitHub service are displayed in the form area
6. Token field uses `type="password"` to mask the PAT
7. Default values: branch is `main`, specsPath is `specs`

## Behavioral Examples

### Scenario: Open connection form and connect

- **Given** user is not connected
- **When** user clicks "Connect GitHub", fills in token/owner/repo, and clicks "Connect"
- **Then** `GitHubService.connect()` is called, and on success the form is replaced with connection status

### Scenario: Pull specs from connected repo

- **Given** user is connected to `CorvidLabs/corvid-agent`
- **When** user clicks "Pull Specs"
- **Then** all `.spec.md` files are fetched and emitted via `specsPulled`

### Scenario: Disconnect

- **Given** user is connected
- **When** user clicks "Disconnect"
- **Then** `GitHubService.disconnect()` is called and the component reverts to showing the "Connect GitHub" button

## Error Cases

| Condition | Behavior |
|-----------|----------|
| Connection fails (bad token/repo) | Error message from GitHub service displayed in `.form-error` |
| Pull fails (network/API error) | Error propagates to GitHub service's error signal |
| Form submitted with empty required fields | Connect button is disabled, no API call made |

## Dependencies

### Consumes

| Module | What is used |
|--------|-------------|
| `github-service` | `connect`, `disconnect`, `pullSpecs`, `connected`, `loading`, `error`, `config` signals |

### Consumed By

| Module | What is used |
|--------|-------------|
| `spec-list` | Rendered as a child component, `specsPulled` output triggers import |

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-02-24 | CorvidAgent | Initial spec — GitHub connect sidebar component |
