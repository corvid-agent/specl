# Specl Project Constitution

## Identity

Specl is a spec-driven development tool — an Angular web application for creating, editing, validating, and managing `.spec.md` specification files. It follows its own specification format and bootstraps itself: the specs for Specl are written using Specl.

## Core Principles

1. **Specs are the source of truth.** Every module must have a corresponding `.spec.md` file in `specs/`. Code is generated from and validated against specs.
2. **Self-hosting.** Specl uses its own spec format and tools. Changes to the format must be reflected in both the codebase and the project's own specs.
3. **Validation is mandatory.** All specs must pass `bun run spec-check specs/` before merge. CI enforces this.
4. **Simplicity over abstraction.** Prefer direct, minimal implementations. Don't add configuration layers, feature flags, or abstractions until needed.

## Spec Format

Every `.spec.md` file must have:

- YAML frontmatter with: `module`, `version`, `status`, `files`, and optionally `db_tables` and `depends_on`
- Seven required sections (as `##` headings): Purpose, Public API, Invariants, Behavioral Examples, Error Cases, Dependencies, Change Log

## Development Workflow

1. **Specify first.** Before writing code, create or update the relevant `.spec.md` file.
2. **Validate specs.** Run `bun run spec-check specs/` to catch structural issues.
3. **Implement against spec.** Code must satisfy the invariants and behavioral examples defined in the spec.
4. **Update Change Log.** When modifying a module, add an entry to the spec's Change Log section.

## Technology Stack

- Angular 21 (standalone components, signals)
- CodeMirror 6 (markdown editing)
- Dexie.js (IndexedDB persistence)
- Bun (runtime and package manager)
- GitHub Pages (deployment)

## Quality Gates

- `bun run build` must succeed
- `bun run spec-check specs/` must exit 0
- All required spec sections must be present and non-empty for `active` status specs
