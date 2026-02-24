# Specl

The all-in-one spec editor. Create, import, and manage markdown specifications with a structured UI.

## Features

- **Structured Editing** — Edit frontmatter, sections, and tables through an intuitive UI
- **Live Validation** — Real-time validation against the spec format
- **Import & Export** — Import existing `.spec.md` files, export valid markdown
- **Spec Suites** — Organize specs by folder/domain
- **Dual Mode** — Works standalone (GitHub Pages, IndexedDB) or with an optional backend
- **Dark/Light Theme** — Follows system preference

## Tech Stack

- Angular 21 (standalone components, signals)
- CodeMirror 6 (markdown editing)
- Dexie.js (IndexedDB persistence)
- Bun (package manager & build)

## Development

```bash
bun install
bun start
```

## Build

```bash
bun run build
```

## Spec Format

Specl understands the `.spec.md` format with YAML frontmatter:

```yaml
---
module: module-name
version: 1
status: draft | active
files:
  - path/to/file.ts
db_tables: []
depends_on: []
---
```

Required sections: Purpose, Public API, Invariants, Behavioral Examples, Error Cases, Dependencies, Change Log.

## License

MIT
