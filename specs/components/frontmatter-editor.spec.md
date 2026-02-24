---
module: frontmatter-editor
version: 1
status: active
files:
  - src/app/components/frontmatter-editor/frontmatter-editor.ts
  - src/app/components/frontmatter-editor/frontmatter-editor.html
  - src/app/components/frontmatter-editor/frontmatter-editor.scss
depends_on:
  - spec-models
---

# Frontmatter Editor

## Purpose

Provides a structured form UI for editing spec YAML frontmatter fields. Renders text inputs for module and version, a select dropdown for status, and dynamic add/remove lists for files, db_tables, and depends_on. All changes emit the complete updated frontmatter object to the parent.

## Public API

### Exported Classes

| Class | Description |
|-------|-------------|
| `FrontmatterEditorComponent` | Angular standalone component for editing SpecFrontmatter |

### Component Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `frontmatter` | `SpecFrontmatter` | Yes | The current frontmatter to edit |

### Component Outputs

| Output | Type | Description |
|--------|------|-------------|
| `frontmatterChange` | `SpecFrontmatter` | Emitted with the complete updated frontmatter on any field change |

## Invariants

1. Every change emits the full `SpecFrontmatter` object — not partial updates
2. Array items (files, db_tables, depends_on) are added via temporary input fields that clear after add
3. Empty strings are not added to arrays — `trim()` is checked before adding
4. Removing an array item splices by index and emits the updated frontmatter
5. The frontmatter input is never mutated — spread copies are always created

## Behavioral Examples

### Scenario: Change module name

- **Given** frontmatter with `module: 'auth'`
- **When** user changes the module input to `'auth-middleware'`
- **Then** `frontmatterChange` emits with `{...frontmatter, module: 'auth-middleware'}`

### Scenario: Add a file path

- **Given** frontmatter with `files: ['server/auth.ts']`
- **When** user types `'server/middleware.ts'` in the new file input and clicks add
- **Then** `frontmatterChange` emits with `files: ['server/auth.ts', 'server/middleware.ts']`
- **And** the new file input is cleared

### Scenario: Remove a file path

- **Given** frontmatter with `files: ['a.ts', 'b.ts', 'c.ts']`
- **When** user clicks remove on index 1
- **Then** `frontmatterChange` emits with `files: ['a.ts', 'c.ts']`

### Scenario: Add empty string blocked

- **Given** the new file input is empty or whitespace
- **When** user clicks add
- **Then** nothing happens — no emit, no change

### Scenario: Change status

- **Given** frontmatter with `status: 'draft'`
- **When** user selects `'active'` from the dropdown
- **Then** `frontmatterChange` emits with `status: 'active'`

## Error Cases

| Condition | Behavior |
|-----------|----------|
| Empty string in add input | Blocked — `trim()` check prevents adding |
| Remove at invalid index | `splice` is safe — no error, but array may not change |

## Dependencies

### Consumes

| Module | What is used |
|--------|-------------|
| `spec-models` | `SpecFrontmatter`, `SpecStatus` types |
| `@angular/forms` | `FormsModule` for two-way binding |

### Consumed By

| Module | What is used |
|--------|-------------|
| `editor-page` | Child component for editing frontmatter when `activeSectionIndex === -1` |

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-02-24 | CorvidAgent | Initial spec |
