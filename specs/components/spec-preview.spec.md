---
module: spec-preview
version: 1
status: active
files:
  - src/app/components/spec-preview/spec-preview.ts
  - src/app/components/spec-preview/spec-preview.html
  - src/app/components/spec-preview/spec-preview.scss
depends_on:
  - spec-models
---

# Spec Preview

## Purpose

Renders a live HTML preview of the spec's markdown body and displays validation results. Converts markdown to HTML using the `marked` library. Separates validation errors and warnings for display with distinct visual styling (red for errors, yellow for warnings).

## Public API

### Exported Classes

| Class | Description |
|-------|-------------|
| `SpecPreviewComponent` | Angular standalone component for rendered preview and validation display |

### Component Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `markdown` | `string` | Yes | Raw markdown body to render |
| `validation` | `ValidationResult \| null` | No | Validation result to display (default: null) |

### Computed Properties

| Property | Type | Description |
|----------|------|-------------|
| `html` | `Signal<string>` | Rendered HTML from markdown |
| `errors` | `ValidationError[]` | Filtered validation errors (level: 'error') |
| `warnings` | `ValidationError[]` | Filtered validation warnings (level: 'warning') |

## Invariants

1. Markdown is re-rendered to HTML reactively whenever the `markdown` input changes
2. `marked.parse` may return a string or Promise — both cases are handled
3. Errors and warnings are derived from the validation input, filtered by level
4. If validation is null, both `errors` and `warnings` return empty arrays

## Behavioral Examples

### Scenario: Render markdown preview

- **Given** markdown input is `'## Purpose\n\nHandles authentication'`
- **When** the component renders
- **Then** the HTML signal contains `<h2>Purpose</h2>\n<p>Handles authentication</p>`

### Scenario: Display validation errors

- **Given** validation result has 2 errors and 1 warning
- **When** the component renders
- **Then** `errors` returns the 2 error items and `warnings` returns the 1 warning item

### Scenario: No validation

- **Given** validation input is null
- **When** the component renders
- **Then** `errors` and `warnings` both return empty arrays

## Error Cases

| Condition | Behavior |
|-----------|----------|
| Empty markdown | `marked.parse('')` returns empty string, preview is blank |
| Invalid markdown syntax | `marked` renders best-effort HTML (it doesn't throw) |
| Validation is null | No validation messages displayed |

## Dependencies

### Consumes

| Module | What is used |
|--------|-------------|
| `spec-models` | `ValidationResult`, `ValidationError` types |
| `marked` (npm) | `marked.parse` for markdown-to-HTML conversion |

### Consumed By

| Module | What is used |
|--------|-------------|
| `editor-page` | Child component in the preview tab |

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-02-24 | CorvidAgent | Initial spec |
