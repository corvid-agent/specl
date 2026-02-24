---
module: spec-models
version: 1
status: active
files:
  - src/app/models/spec.model.ts
depends_on: []
---

# Spec Models

## Purpose

Defines the core data types and interfaces for the Specl application. All other services and components consume these types. This module is the canonical source of truth for what a spec document looks like in memory, what validation results contain, and what the required structure of a spec is.

## Public API

### Exported Types

| Type | Description |
|------|-------------|
| `SpecStatus` | Union type `'draft' \| 'active'` representing publication state |
| `SpecFrontmatter` | Interface for YAML frontmatter metadata (module, version, status, files, db_tables, depends_on) |
| `SpecSection` | Interface for a parsed markdown section (heading, level, content) |
| `Spec` | Interface for a complete spec document including frontmatter, body, sections, metadata, and optional `githubSha` for GitHub sync |
| `SpecSuite` | Interface grouping a suite name with its specs |
| `ValidationError` | Interface for a single validation issue (level, field, message) |
| `ValidationResult` | Interface for the result of validation (valid flag + errors array) |

### Exported Constants

| Constant | Type | Description |
|----------|------|-------------|
| `REQUIRED_SECTIONS` | `readonly string[]` | The 7 required level-2 section headings: Purpose, Public API, Invariants, Behavioral Examples, Error Cases, Dependencies, Change Log |
| `DEFAULT_FRONTMATTER` | `SpecFrontmatter` | Default frontmatter with empty module, version 1, draft status, and empty arrays |

### Exported Functions

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `createEmptySpec` | `(suite?: string, filename?: string)` | `Spec` | Creates a new Spec with default frontmatter, empty body/sections, and ISO timestamps |

## Invariants

1. `SpecStatus` only permits the values `'draft'` and `'active'`
2. `REQUIRED_SECTIONS` always contains exactly 7 entries matching the corvid-agent spec format
3. `DEFAULT_FRONTMATTER` has empty module, version 1, status draft, and empty arrays for files, db_tables, depends_on
4. `createEmptySpec` always returns a Spec with valid ISO timestamps for createdAt and updatedAt
5. `Spec.id` is optional — it is only populated after database persistence
6. `Spec.githubSha` is optional — set when a spec is pulled from GitHub, used for update operations

## Behavioral Examples

### Scenario: Create empty spec with defaults

- **Given** no arguments are provided
- **When** `createEmptySpec()` is called
- **Then** returns a Spec with suite `'default'`, filename `'untitled.spec.md'`, empty body, empty sections array, and DEFAULT_FRONTMATTER values

### Scenario: Create empty spec with custom suite

- **Given** suite is `'services'` and filename is `'parser.spec.md'`
- **When** `createEmptySpec('services', 'parser.spec.md')` is called
- **Then** returns a Spec with suite `'services'` and filename `'parser.spec.md'`

## Error Cases

| Condition | Behavior |
|-----------|----------|
| No error cases | This module only defines types and simple factory functions with no failure modes |

## Dependencies

### Consumes

| Module | What is used |
|--------|-------------|
| (none) | This is a leaf module with no dependencies |

### Consumed By

| Module | What is used |
|--------|-------------|
| `spec-parser-service` | `Spec`, `SpecFrontmatter`, `SpecSection`, `DEFAULT_FRONTMATTER`, `createEmptySpec` |
| `spec-validator-service` | `Spec`, `ValidationResult`, `ValidationError`, `REQUIRED_SECTIONS` |
| `spec-db-service` | `Spec` |
| `spec-store-service` | `Spec`, `createEmptySpec`, `ValidationResult` |
| `editor-page` | `SpecFrontmatter`, `SpecSection`, `ValidationResult` |
| `section-editor` | `SpecSection` |
| `section-nav` | `SpecSection` |
| `frontmatter-editor` | `SpecFrontmatter`, `SpecStatus` |
| `spec-preview` | `ValidationResult`, `ValidationError` |
| `spec-template` | `SpecFrontmatter` |
| `github-service` | `Spec` (for GitHub SHA tracking) |

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-02-24 | CorvidAgent | Initial spec |
| 2026-02-24 | CorvidAgent | Add `githubSha` optional field to Spec, add github-service consumer |
