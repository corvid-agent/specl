---
module: spec-validator-service
version: 1
status: active
files:
  - src/app/services/spec-validator.service.ts
depends_on:
  - spec-models
---

# Spec Validator Service

## Purpose

Validates a Spec against the required structure and frontmatter rules. Produces a `ValidationResult` with typed errors (blocking) and warnings (informational). Used to give the user real-time feedback about whether their spec is complete and well-formed before export.

## Public API

### Exported Classes

| Class | Description |
|-------|-------------|
| `SpecValidatorService` | Angular injectable service for validating specs |

#### SpecValidatorService Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `validate` | `(spec: Spec)` | `ValidationResult` | Validates frontmatter and sections, returns result with `valid` flag and `errors` array |

## Invariants

1. `valid` is `true` if and only if there are zero errors with `level: 'error'` — warnings do not affect validity
2. Frontmatter validation checks: module non-empty, version >= 1, status is 'draft' or 'active', files array has at least 1 non-empty entry
3. Section validation checks all 7 `REQUIRED_SECTIONS` are present as level-2 headings
4. Empty level-2 sections produce warnings, not errors
5. The method always returns a `ValidationResult` — never throws

## Behavioral Examples

### Scenario: Valid spec passes validation

- **Given** a spec with module `'auth'`, version 1, status `'active'`, files `['server/auth.ts']`, and all 7 required sections present with content
- **When** `validate(spec)` is called
- **Then** result is `{ valid: true, errors: [] }`

### Scenario: Missing module name

- **Given** a spec with empty module name
- **When** `validate(spec)` is called
- **Then** result contains an error with `field: 'module'` and `message: 'Module name is required'`

### Scenario: Missing required section

- **Given** a spec missing the `## Invariants` section
- **When** `validate(spec)` is called
- **Then** result contains an error with `field: 'sections'` and `message: 'Missing required section: ## Invariants'`

### Scenario: Empty section produces warning

- **Given** a spec with `## Purpose` section present but with empty content
- **When** `validate(spec)` is called
- **Then** result contains a warning (not error) with `message: 'Section "## Purpose" is empty'` and `valid` may still be `true`

### Scenario: Version zero

- **Given** a spec with version `0`
- **When** `validate(spec)` is called
- **Then** result contains an error with `field: 'version'` and `message: 'Version must be a positive number'`

## Error Cases

| Condition | Behavior |
|-----------|----------|
| Empty module | Error: `'Module name is required'` |
| Version < 1 or missing | Error: `'Version must be a positive number'` |
| Invalid status | Error: `'Status must be "draft" or "active"'` |
| No files listed | Error: `'At least one file is required'` |
| Empty file path in array | Error: `'File paths must not be empty'` |
| Missing required section | Error: `'Missing required section: ## {name}'` |
| Empty level-2 section content | Warning: `'Section "## {name}" is empty'` |

## Dependencies

### Consumes

| Module | What is used |
|--------|-------------|
| `spec-models` | `Spec`, `ValidationResult`, `ValidationError`, `REQUIRED_SECTIONS` |

### Consumed By

| Module | What is used |
|--------|-------------|
| `spec-store-service` | `validate()` for on-demand validation |

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-02-24 | CorvidAgent | Initial spec |
