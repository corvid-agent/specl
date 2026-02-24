---
module: spec-list
version: 1
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

Sidebar component that displays all specs grouped by suite, with actions to create, select, delete, and import specs. Serves as the primary navigation for browsing the spec collection. Uses the store's reactive signals to stay in sync with data changes.

## Public API

### Exported Classes

| Class | Description |
|-------|-------------|
| `SpecListComponent` | Angular standalone component for browsing and managing specs |

### Component Inputs/Outputs

This component has no inputs or outputs — it reads directly from `SpecStoreService` signals and navigates via `Router`.

## Invariants

1. Specs are grouped by suite using the store's `suites` computed signal
2. Creating a spec navigates to `/edit/{id}` for the new spec
3. Selecting a spec navigates to `/edit/{id}`
4. Delete uses `event.stopPropagation()` to prevent triggering select on the parent list item
5. Import accepts `.md` and `.spec.md` files, supports multiple file selection
6. Import reads file contents via `File.text()` and delegates to `store.importMarkdownFiles`
7. GitHub connect component is rendered below the spec list for repo connection and pull

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

## Error Cases

| Condition | Behavior |
|-----------|----------|
| No specs exist | Suite list is empty, only create/import actions are shown |
| Import with no files selected | `input.files` is null/empty, handler returns early |
| Create fails (DB error) | Error propagates; no navigation occurs |

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
