---
module: section-nav
version: 1
status: active
files:
  - src/app/components/section-nav/section-nav.ts
  - src/app/components/section-nav/section-nav.html
  - src/app/components/section-nav/section-nav.scss
depends_on:
  - spec-models
---

# Section Nav

## Purpose

Renders a sidebar navigation listing all sections of a spec. Includes a "Frontmatter" entry at the top (index -1) followed by all parsed sections. Highlights the currently active section and supports visual indentation for subsections based on heading level.

## Public API

### Exported Classes

| Class | Description |
|-------|-------------|
| `SectionNavComponent` | Angular standalone component for section navigation |

### Exported Types

| Type | Description |
|------|-------------|
| `NavItem` | Discriminated union: `{type: 'frontmatter', label: string}` or `{type: 'section', index: number, label: string, level: number}` |

### Component Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `sections` | `SpecSection[]` | Yes | Array of editable sections to display |
| `activeIndex` | `number` | Yes | Currently active section index (-1 for frontmatter) |

### Component Outputs

| Output | Type | Description |
|--------|------|-------------|
| `selectIndex` | `number` | Emitted when a nav item is clicked, with the section index (-1 for frontmatter) |

## Invariants

1. The first nav item is always "Frontmatter" with type `'frontmatter'`
2. Section nav items preserve the order from the input `sections` array
3. `isActive` returns true for frontmatter when `activeIndex === -1` and for sections when `activeIndex === item.index`
4. Each section nav item carries its heading `level` for visual indentation in the template

## Behavioral Examples

### Scenario: Render nav for a standard spec

- **Given** sections `[{heading: 'Purpose', level: 2}, {heading: 'Exported Functions', level: 3}, {heading: 'Public API', level: 2}]`
- **When** the component renders
- **Then** nav items are: Frontmatter, Purpose (level 2), Exported Functions (level 3, indented), Public API (level 2)

### Scenario: Select a section

- **Given** frontmatter is active (index -1)
- **When** user clicks on "Purpose" (index 0)
- **Then** `selectIndex` emits `0`

### Scenario: Select frontmatter

- **Given** section index 2 is active
- **When** user clicks on "Frontmatter"
- **Then** `selectIndex` emits `-1`

## Error Cases

| Condition | Behavior |
|-----------|----------|
| Empty sections array | Only "Frontmatter" nav item is shown |
| activeIndex out of bounds | No item is highlighted as active |

## Dependencies

### Consumes

| Module | What is used |
|--------|-------------|
| `spec-models` | `SpecSection` type |

### Consumed By

| Module | What is used |
|--------|-------------|
| `editor-page` | Child component for section navigation sidebar |

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-02-24 | CorvidAgent | Initial spec |
