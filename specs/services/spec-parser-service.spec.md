---
module: spec-parser-service
version: 1
status: active
files:
  - src/app/services/spec-parser.service.ts
depends_on:
  - spec-models
---

# Spec Parser Service

## Purpose

Parses raw `.spec.md` markdown files into structured `Spec` objects and serializes them back. Handles YAML frontmatter extraction/serialization, section parsing by heading level, and body reconstruction from sections. This is the core serialization layer that enables round-tripping between raw markdown and the in-memory Spec model.

## Public API

### Exported Classes

| Class | Description |
|-------|-------------|
| `SpecParserService` | Angular injectable service for parsing and serializing spec markdown |

#### SpecParserService Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `parseMarkdown` | `(raw: string, filename?: string, suite?: string)` | `Spec` | Parses raw markdown with YAML frontmatter into a complete Spec object |
| `serializeToMarkdown` | `(spec: Spec)` | `string` | Serializes a Spec back to markdown with YAML frontmatter delimiters |
| `parseSections` | `(body: string)` | `SpecSection[]` | Parses a markdown body into an array of sections split by headings |
| `sectionsToBody` | `(title: string, sections: SpecSection[])` | `string` | Reconstructs a full markdown body from a title and array of sections |

## Invariants

1. `parseMarkdown` followed by `serializeToMarkdown` produces output that, when parsed again, yields an equivalent Spec (round-trip fidelity)
2. Frontmatter regex pattern is `^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$` — requires opening and closing `---` delimiters
3. If no valid frontmatter is found, `DEFAULT_FRONTMATTER` is used and the entire raw input becomes the body
4. If YAML parsing fails, `DEFAULT_FRONTMATTER` is used and the entire raw input becomes the body
5. `parseSections` recognizes headings levels 1-6 via the pattern `^(#{1,6})\s+(.+)$`
6. Section content is trimmed — leading and trailing whitespace is removed from each section's content
7. `sectionsToBody` only includes the `# title` line if the title string is non-empty
8. `serializeFrontmatter` omits `db_tables` and `depends_on` when their arrays are empty
9. Array fields in frontmatter (`files`, `db_tables`, `depends_on`) are always coerced to string arrays via `.map(String)`

## Behavioral Examples

### Scenario: Parse a complete spec file

- **Given** raw markdown with valid YAML frontmatter and a body containing `## Purpose` and `## Public API` sections
- **When** `parseMarkdown(raw, 'auth.spec.md', 'middleware')` is called
- **Then** the returned Spec has the parsed frontmatter fields, `body` containing everything after the frontmatter, and `sections` array with entries for each heading found

### Scenario: Parse markdown with no frontmatter

- **Given** raw markdown with no `---` delimiters
- **When** `parseMarkdown(raw)` is called
- **Then** the returned Spec has `DEFAULT_FRONTMATTER` and the entire raw input as the body

### Scenario: Serialize frontmatter with empty optional arrays

- **Given** a Spec with `db_tables: []` and `depends_on: []`
- **When** `serializeToMarkdown(spec)` is called
- **Then** the output YAML frontmatter does not include `db_tables` or `depends_on` keys

### Scenario: Rebuild body from sections

- **Given** title `'Auth'` and sections `[{heading: 'Purpose', level: 2, content: 'Handles auth'}]`
- **When** `sectionsToBody('Auth', sections)` is called
- **Then** output is `# Auth\n\n## Purpose\n\nHandles auth\n`

## Error Cases

| Condition | Behavior |
|-----------|----------|
| Invalid YAML in frontmatter | Falls back to `DEFAULT_FRONTMATTER`, entire raw input becomes body |
| No frontmatter delimiters found | Falls back to `DEFAULT_FRONTMATTER`, entire raw input becomes body |
| Body with no headings | `parseSections` returns empty array |
| Empty raw input | Returns spec with default frontmatter and empty body/sections |

## Dependencies

### Consumes

| Module | What is used |
|--------|-------------|
| `spec-models` | `Spec`, `SpecFrontmatter`, `SpecSection`, `DEFAULT_FRONTMATTER`, `createEmptySpec` |
| `yaml` (npm) | `parse`, `stringify` for YAML serialization |

### Consumed By

| Module | What is used |
|--------|-------------|
| `spec-store-service` | `parseMarkdown()` for import, `serializeToMarkdown()` for export |
| `editor-page` | `parseSections()` for template parsing, `sectionsToBody()` for body reconstruction |

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-02-24 | CorvidAgent | Initial spec |
