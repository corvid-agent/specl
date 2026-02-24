---
module: spec-list
version: 2
status: active
files:
  - src/app/components/spec-list/spec-list.ts
  - src/app/components/spec-list/spec-list.html
  - src/app/components/spec-list/spec-list.scss
depends_on:
  - spec-store-service
  - github-connect
---

# Spec List

## Purpose

Sidebar component that displays all specs grouped by suite in collapsible folder sections, with a scrollable list and actions to create, select, delete, and import specs. Serves as the primary navigation for browsing the spec collection. Uses the store's reactive signals to stay in sync with data changes. Each spec item shows a small markdown preview of the spec's purpose section.

## Public API

### Exported Classes

| Class | Description |
|-------|-------------|
| `SpecListComponent` | Angular standalone component for browsing and managing specs |

### Component Inputs/Outputs

This component has no inputs or outputs — it reads directly from `SpecStoreService` signals and navigates via `Router`.

### Component Signals

| Signal | Type | Description |
|--------|------|-------------|
| `collapsedSuites` | `WritableSignal<Set<string>>` | Set of suite names that are currently collapsed |

## Invariants

1. Specs are grouped by suite using the store's `suites` computed signal
2. Each suite group is collapsible — clicking the suite header toggles its collapsed state
3. The spec list container is scrollable (`overflow-y: auto`, flex-fills available height)
4. Each spec item shows the filename, module name, status badge, and a truncated markdown preview of the body
5. Creating a spec navigates to `/edit/{id}` for the new spec
6. Selecting a spec navigates to `/edit/{id}`
7. Delete uses `event.stopPropagation()` to prevent triggering select on the parent list item
8. Import accepts `.md` and `.spec.md` files, supports multiple file selection
9. Import reads file contents via `File.text()` and delegates to `store.importMarkdownFiles`
10. GitHub connect component is rendered below the spec list for repo connection and pull
11. The collapse chevron rotates to indicate open/closed state

## Behavioral Examples

### Scenario: Create new spec

- **Given** user is on the spec list
- **When** user clicks "Create"
- **Then** `store.createSpec()` is called, and the router navigates to `/edit/{newId}`

### Scenario: Select existing spec

- **Given** specs are listed in the sidebar
- **When** user clicks on a spec named "auth.spec.md"
- **Then** `store.selectSpec(id)` is called and router navigates to `/edit/{id}`

### Scenario: Delete a spec

- **Given** specs are listed in the sidebar
- **When** user clicks the delete button on "auth.spec.md"
- **Then** `store.deleteSpec(id)` is called and the event does not propagate to the select handler

### Scenario: Import markdown files

- **Given** user clicks "Import"
- **When** user selects two `.spec.md` files in the file picker
- **Then** both files are read, parsed, and added to the store via `importMarkdownFiles`

### Scenario: Collapse a suite folder

- **Given** the "services" suite has 5 specs and is expanded
- **When** user clicks the "services" suite header
- **Then** the 5 spec items are hidden and the chevron rotates to indicate collapsed state

### Scenario: Expand a suite folder

- **Given** the "services" suite is collapsed
- **When** user clicks the "services" suite header again
- **Then** the spec items reappear and the chevron rotates back to expanded state

### Scenario: Markdown preview in spec item

- **Given** a spec with body text "Provides GitHub API integration..."
- **When** the spec is rendered in the list
- **Then** a truncated single-line preview of the body text is shown below the filename

## Error Cases

| Condition | Behavior |
|-----------|----------|
| No specs exist | Suite list is empty, only create/import actions are shown |
| Import with no files selected | `input.files` is null/empty, handler returns early |
| Create fails (DB error) | Error propagates; no navigation occurs |
| Spec has no body text | Preview line shows "No description" in muted text |

## Dependencies

### Consumes

| Module | What is used |
|--------|-------------|
| `spec-store-service` | `suites`, `createSpec`, `selectSpec`, `deleteSpec`, `importMarkdownFiles` |
| `github-connect` | Child component for GitHub repo connection |
| `@angular/router` | `Router` for navigation |
| `@angular/common` | `KeyValuePipe` for iterating suite map |

### Consumed By

| Module | What is used |
|--------|-------------|
| `shell` | Child component rendered as the sidebar |

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-02-24 | CorvidAgent | Initial spec |
| 2026-02-24 | CorvidAgent | Add GitHub connect component integration and onGitHubPull handler |
| 2026-02-24 | CorvidAgent | v2: Add collapsible suite folders, scrollable list, markdown preview in spec items |
