---
module: spec-db-service
version: 1
status: active
files:
  - src/app/services/spec-db.service.ts
depends_on:
  - spec-models
---

# Spec DB Service

## Purpose

Provides client-side persistence for specs using IndexedDB via Dexie.js. All CRUD operations for specs go through this service. The database is local to the browser — no server or network calls are involved.

## Public API

### Exported Classes

| Class | Description |
|-------|-------------|
| `SpecDbService` | Angular injectable service for IndexedDB CRUD operations on specs |

#### SpecDbService Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `getAll` | `()` | `Promise<Spec[]>` | Retrieves all specs from the database |
| `getBySuite` | `(suite: string)` | `Promise<Spec[]>` | Retrieves all specs in a given suite |
| `getById` | `(id: number)` | `Promise<Spec \| undefined>` | Retrieves a single spec by its auto-increment ID |
| `save` | `(spec: Spec)` | `Promise<number>` | Inserts or updates a spec. Sets `updatedAt` to current ISO timestamp. Returns the spec ID |
| `delete` | `(id: number)` | `Promise<void>` | Deletes a spec by ID |
| `deleteAll` | `()` | `Promise<void>` | Clears all specs from the database |
| `getSuites` | `()` | `Promise<string[]>` | Returns an array of unique suite names |
| `importBulk` | `(specs: Spec[])` | `Promise<void>` | Bulk-inserts an array of specs |

## Invariants

1. Database name is `'specl'`, table name is `'specs'`
2. Primary key is `++id` (auto-increment integer)
3. Indices exist on: `filename`, `suite`, `[suite+filename]` (compound), `frontmatter.module`
4. `save()` always updates `updatedAt` to the current ISO timestamp before writing
5. `save()` uses `put` for existing specs (has `id`) and `add` for new specs (no `id`)
6. All methods are async and return Promises

## Behavioral Examples

### Scenario: Save a new spec

- **Given** a spec with no `id` field
- **When** `save(spec)` is called
- **Then** the spec is inserted, an auto-increment ID is returned, and `updatedAt` is set to now

### Scenario: Update an existing spec

- **Given** a spec with `id: 5`
- **When** `save(spec)` is called
- **Then** the spec at ID 5 is replaced with the updated data and `updatedAt` is refreshed

### Scenario: Get specs by suite

- **Given** specs in suites `'services'` and `'components'`
- **When** `getBySuite('services')` is called
- **Then** only specs with `suite === 'services'` are returned

### Scenario: Get unique suites

- **Given** specs in suites `'services'`, `'services'`, `'components'`
- **When** `getSuites()` is called
- **Then** returns `['components', 'services']` (unique, ordered)

## Error Cases

| Condition | Behavior |
|-----------|----------|
| `getById` with non-existent ID | Returns `undefined` |
| `delete` with non-existent ID | Silently succeeds (Dexie behavior) |
| IndexedDB not available | Dexie throws; errors propagate to caller |
| `importBulk` with duplicate keys | Dexie throws on key conflicts |

## Dependencies

### Consumes

| Module | What is used |
|--------|-------------|
| `spec-models` | `Spec` type |
| `dexie` (npm) | `Dexie`, `Table` for IndexedDB abstraction |

### Consumed By

| Module | What is used |
|--------|-------------|
| `spec-store-service` | All CRUD methods for state management |

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-02-24 | CorvidAgent | Initial spec |
