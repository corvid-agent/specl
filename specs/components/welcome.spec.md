---
module: welcome
version: 1
status: active
files:
  - src/app/components/welcome/welcome.ts
  - src/app/components/welcome/welcome.html
  - src/app/components/welcome/welcome.scss
depends_on:
  - spec-store-service
---

# Welcome

## Purpose

Landing page displayed when no spec is selected. Presents the application title, tagline, and two primary actions: creating a new spec and importing existing `.spec.md` files. Also displays three feature cards describing the application's capabilities. After a successful create or import, navigates the user to the editor.

## Public API

### Exported Classes

| Class | Description |
|-------|-------------|
| `WelcomeComponent` | Angular standalone component — application landing page |

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `onCreateSpec()` | `Promise<void>` | Creates a new spec via the store, then navigates to `/edit/:id` |
| `onImport()` | `Promise<void>` | Opens a file picker for `.md` / `.spec.md` files, imports them via the store, then navigates to the last imported spec |

## Invariants

1. "Create New Spec" calls `store.createSpec()` and navigates to `/edit/:id` with the new spec's ID
2. "Import" opens a native file input restricted to `.md` and `.spec.md` extensions with `multiple` enabled
3. After import, the user is navigated to the last spec in `store.allSpecs()` (the most recently added)
4. If `createSpec()` returns an object without an `id`, no navigation occurs
5. If no files are selected in the file picker (user cancels), no import is attempted
6. If `importMarkdownFiles` returns `0` (no specs imported), no navigation occurs
7. The layout is responsive — actions stack vertically and features switch to single-column on mobile (<768 px)

## Behavioral Examples

### Scenario: Create new spec

- **Given** the user is on the welcome page
- **When** the user clicks "Create New Spec"
- **Then** `store.createSpec()` is called, and the app navigates to `/edit/:id`

### Scenario: Import single file

- **Given** the user is on the welcome page
- **When** the user clicks "Import .spec.md Files" and selects one file
- **Then** the file is read as text, `store.importMarkdownFiles()` is called with the file data, and the app navigates to the editor for the imported spec

### Scenario: Import multiple files

- **Given** the user selects 3 `.spec.md` files
- **When** the import completes with count > 0
- **Then** the app navigates to the last spec in `store.allSpecs()`

### Scenario: Import cancelled

- **Given** the user clicks import
- **When** the user cancels the file picker (no files selected)
- **Then** nothing happens — no import call, no navigation

### Scenario: Import yields zero specs

- **Given** the user selects files that fail to parse
- **When** `importMarkdownFiles` returns `0`
- **Then** no navigation occurs

## Error Cases

| Condition | Behavior |
|-----------|----------|
| `createSpec()` returns object without `id` | Navigation is skipped (guarded by `if (spec.id)`) |
| File read fails | Unhandled — `file.text()` rejection would propagate |
| `allSpecs()` is empty after import | `last` is `undefined`, navigation skipped due to `last?.id` guard |

## Dependencies

### Consumes

| Module | What is used |
|--------|-------------|
| `spec-store-service` | `SpecStoreService` — `createSpec()`, `importMarkdownFiles()`, `allSpecs()` |
| `@angular/router` | `Router` — `navigate()` |

### Consumed By

| Module | What is used |
|--------|-------------|
| `app.routes` | Lazy-loaded as the default child route of `ShellComponent` |

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-03-01 | CorvidAgent | Initial spec |
