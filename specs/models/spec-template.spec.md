---
module: spec-template
version: 1
status: active
files:
  - src/app/models/spec-template.ts
depends_on:
  - spec-models
---

# Spec Template

## Purpose

Generates a markdown body template pre-filled with all required sections and placeholder content when a new spec is created. Ensures every new spec starts with the correct structure matching the corvid-agent spec format, reducing manual boilerplate.

## Public API

### Exported Functions

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `generateSpecTemplate` | `(fm: SpecFrontmatter)` | `string` | Generates a full markdown body with title from `fm.module`, all 7 required sections with placeholder tables and content, and today's date in the Change Log |

## Invariants

1. Output always starts with `# {module}` as the level-1 heading
2. Output always contains all 7 required sections: Purpose, Public API, Invariants, Behavioral Examples, Error Cases, Dependencies, Change Log
3. Public API section includes subsections for Exported Functions, Exported Types, and Exported Classes with markdown tables
4. Change Log always has one entry with today's date in ISO format (YYYY-MM-DD)
5. Output is a valid markdown string with no frontmatter (frontmatter is handled separately)

## Behavioral Examples

### Scenario: Generate template for auth module

- **Given** frontmatter with `module: 'auth'`
- **When** `generateSpecTemplate(fm)` is called
- **Then** output starts with `# auth` and contains all required sections with placeholder content

### Scenario: Change Log date

- **Given** any frontmatter
- **When** `generateSpecTemplate(fm)` is called
- **Then** the Change Log table contains a row with today's date in YYYY-MM-DD format

## Error Cases

| Condition | Behavior |
|-----------|----------|
| Empty module name | Template still generates with `# ` as the title (empty heading) |
| Missing frontmatter fields | Only `module` is used; other fields are ignored |

## Dependencies

### Consumes

| Module | What is used |
|--------|-------------|
| `spec-models` | `SpecFrontmatter` type |

### Consumed By

| Module | What is used |
|--------|-------------|
| `editor-page` | `generateSpecTemplate()` to populate empty specs |

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-02-24 | CorvidAgent | Initial spec |
