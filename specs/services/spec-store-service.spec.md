---
module: spec-store-service
version: 1
status: active
files:
  - src/app/services/spec-store.service.ts
depends_on:
  - spec-models
  - spec-db-service
  - spec-parser-service
  - spec-validator-service
---

# Spec Store Service

## Purpose

Central state management for the Specl application using Angular signals. Coordinates between the database layer, parser, and validator to provide a reactive data layer that components can consume. Manages the active spec selection, dirty state tracking, and all spec lifecycle operations (create, load, update, delete, import, export, validate).

## Public API

### Exported Classes

| Class | Description |
|-------|-------------|
| `SpecStoreService` | Angular injectable service for reactive spec state management |

#### SpecStoreService Signals (Readonly)

| Signal | Type | Description |
|--------|------|-------------|
| `allSpecs` | `Signal<Spec[]>` | Readonly signal of all loaded specs |
| `isDirty` | `Signal<boolean>` | Readonly signal indicating unsaved changes |
| `activeSpec` | `Signal<Spec \| null>` | Computed signal of the currently selected spec |
| `suites` | `Signal<Map<string, Spec[]>>` | Computed signal grouping specs by suite name |

#### SpecStoreService Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `loadAll` | `()` | `Promise<void>` | Loads all specs from the database into the signal store |
| `createSpec` | `(suite?: string, filename?: string)` | `Promise<Spec>` | Creates a new empty spec, saves to DB, adds to store, and selects it |
| `selectSpec` | `(id: number)` | `Promise<void>` | Sets the active spec by ID and resets dirty flag |
| `updateActiveSpec` | `(partial: Partial<Spec>)` | `Promise<void>` | Patches the active spec, saves to DB, updates store, clears dirty flag |
| `markDirty` | `()` | `void` | Sets the dirty flag to true |
| `deleteSpec` | `(id: number)` | `Promise<void>` | Deletes from DB, removes from store, clears active if it was selected |
| `importMarkdownFiles` | `(files: {name, content, path?, sha?}[])` | `Promise<number>` | Parses and imports multiple markdown files, stores `githubSha` if provided, returns count imported |
| `exportSpec` | `(id: number)` | `Promise<string \| null>` | Serializes a spec to markdown string, returns null if not found |
| `validateActiveSpec` | `()` | `ValidationResult \| null` | Validates the active spec, returns null if no active spec |

## Invariants

1. `activeSpec` is `null` when no spec is selected or the selected ID doesn't match any spec
2. `isDirty` resets to `false` after `updateActiveSpec` and `selectSpec`
3. `createSpec` always selects the newly created spec
4. `deleteSpec` clears `activeSpecId` if the deleted spec was selected
5. `importMarkdownFiles` infers suite from file path — parent directory becomes suite name, defaults to `'default'`
6. `updateActiveSpec` is a no-op if no active spec or active spec has no ID
7. All mutations to the specs signal are immutable — new arrays are created, not mutated in place

## Behavioral Examples

### Scenario: Create and select a new spec

- **Given** store has 2 existing specs
- **When** `createSpec('services', 'new.spec.md')` is called
- **Then** store has 3 specs, the new spec is the `activeSpec`, and `isDirty` is false

### Scenario: Import files with path-based suite inference

- **Given** a file with path `'algochat/bridge.spec.md'`
- **When** `importMarkdownFiles([{name: 'bridge.spec.md', content: raw, path: 'algochat/bridge.spec.md'}])` is called
- **Then** the imported spec has `suite: 'algochat'`

### Scenario: Import file with no path

- **Given** a file with only name `'test.spec.md'` and no path
- **When** `importMarkdownFiles([{name: 'test.spec.md', content: raw}])` is called
- **Then** the imported spec has `suite: 'default'`

### Scenario: Delete the active spec

- **Given** spec with ID 3 is currently active
- **When** `deleteSpec(3)` is called
- **Then** `activeSpec` becomes `null`

### Scenario: Export a spec

- **Given** a spec with ID 1 exists in the store
- **When** `exportSpec(1)` is called
- **Then** returns a markdown string with YAML frontmatter and body

## Error Cases

| Condition | Behavior |
|-----------|----------|
| `updateActiveSpec` with no active spec | No-op, returns immediately |
| `exportSpec` with non-existent ID | Returns `null` |
| `validateActiveSpec` with no active spec | Returns `null` |
| DB errors during save/delete | Errors propagate to caller (no internal catch) |

## Dependencies

### Consumes

| Module | What is used |
|--------|-------------|
| `spec-models` | `Spec`, `createEmptySpec`, `ValidationResult` |
| `spec-db-service` | `getAll`, `save`, `delete` for persistence |
| `spec-parser-service` | `parseMarkdown` for import, `serializeToMarkdown` for export |
| `spec-validator-service` | `validate` for spec validation |

### Consumed By

| Module | What is used |
|--------|-------------|
| `editor-page` | `activeSpec`, `isDirty`, `selectSpec`, `updateActiveSpec`, `markDirty`, `validateActiveSpec`, `exportSpec` |
| `spec-list` | `allSpecs`, `suites`, `createSpec`, `selectSpec`, `deleteSpec`, `importMarkdownFiles` |

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-02-24 | CorvidAgent | Initial spec |
| 2026-02-24 | CorvidAgent | Add `sha` param to `importMarkdownFiles` for GitHub integration |
