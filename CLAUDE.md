# Specl — AI Agent Instructions

## Project

Specl is a browser-based spec editor for `.spec.md` files. It is built with Angular 21 (standalone components, signals) and uses IndexedDB via Dexie.js for persistence.

## Key Commands

```bash
bun install              # Install dependencies
bun run start            # Dev server on localhost:4200
bun run build            # Production build
bun run spec-check specs/  # Validate all spec files
```

## Spec-Driven Development

This project follows spec-driven development. Before writing or modifying code:

1. Read the relevant spec in `specs/` (organized by `models/`, `services/`, `components/`, `pages/`)
2. Update or create the spec first if the change alters public API, invariants, or behavior
3. Run `bun run spec-check specs/` to validate
4. Implement code that satisfies the spec's invariants and behavioral examples
5. Update the Change Log section in the spec

## Project Structure

```
src/app/
  models/           # Types and interfaces (spec.model.ts, spec-template.ts)
  services/         # Business logic (store, parser, validator, db)
  components/       # UI components (shell, spec-list, section-nav, section-editor, etc.)
  pages/            # Route pages (editor)
specs/              # .spec.md files organized by domain
tools/              # CLI tools (spec-check.ts)
.speckit/           # Spec-kit constitution and config
```

## Conventions

- All components are standalone (no NgModule)
- State management uses Angular signals (not RxJS observables)
- SCSS with CSS custom properties for theming
- Mobile-first responsive design (breakpoint: 768px)
- `yaml` package for frontmatter parsing
- `marked` package for markdown rendering
