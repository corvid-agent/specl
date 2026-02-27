---
module: table-editor
version: 1
status: active
files:
  - src/app/components/table-editor/table-editor.ts
  - src/app/components/table-editor/table-editor.html
  - src/app/components/table-editor/table-editor.scss
  - src/app/models/markdown-table.ts
depends_on:
  - spec-models
---

# Table Editor

## Purpose

Provides an inline structured editing interface for markdown tables within spec sections. Instead of editing raw pipe-delimited markdown, users interact with a grid of text inputs rendered in an HTML table. The component receives a parsed `MarkdownTable` and emits immutable updates on every cell change, row addition, deletion, or reorder. The companion `markdown-table` model handles parsing raw markdown into structured `MarkdownTable` data and serializing it back, as well as splitting section content into interleaved text and table `ContentBlock` segments.

## Public API

### Exported Classes

| Class | Description |
|-------|-------------|
| `TableEditorComponent` | Angular standalone component for inline editing of a single markdown table |

### Component Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `table` | `MarkdownTable` | Yes | The parsed table data to display and edit |

### Component Outputs

| Output | Type | Description |
|--------|------|-------------|
| `tableChange` | `MarkdownTable` | Emitted with a new immutable table object whenever any cell, row addition, deletion, or reorder occurs |

### Exported Types (markdown-table model)

| Type | Description |
|------|-------------|
| `MarkdownTable` | Interface with `headers: string[]` and `rows: string[][]` representing a parsed markdown table |
| `ContentBlock` | Interface with `type: 'text' \| 'table'`, optional `text` for text blocks, optional `table` for table blocks |

### Exported Functions (markdown-table model)

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `parseContentBlocks` | `(content: string)` | `ContentBlock[]` | Splits section markdown into interleaved text and table blocks |
| `serializeContentBlocks` | `(blocks: ContentBlock[])` | `string` | Joins content blocks back into a single markdown string |
| `parseMarkdownTable` | `(raw: string)` | `MarkdownTable \| null` | Parses a raw pipe-delimited markdown table string into structured data; returns null if invalid |
| `serializeMarkdownTable` | `(table: MarkdownTable)` | `string` | Converts structured table data back to a pipe-delimited markdown string with aligned columns |

## Invariants

1. Every mutation (cell edit, add row, remove row, move row) emits a new `MarkdownTable` object — the original is never mutated
2. Headers are read-only in the component — only row data can be edited
3. New rows are always appended with empty strings matching the header count
4. Row cells are padded or trimmed to match the header count during parsing
5. `moveRowUp` is a no-op when the row index is 0; `moveRowDown` is a no-op when the row is last
6. `parseMarkdownTable` requires at least a header row and a separator row (minimum 2 lines); returns null otherwise
7. The separator row must match the pattern `|---...|---...|` (pipes and dashes, optional colons for alignment)
8. `parseContentBlocks` identifies table lines as those starting with `|` and ending with `|` (after trimming whitespace)
9. Table lines that fail to parse as a valid table are treated as plain text blocks
10. `serializeMarkdownTable` pads columns to align pipes based on the widest cell in each column, with a minimum width of 3
11. Row action buttons (move up, move down, remove) are only visible on row hover

## Behavioral Examples

### Scenario: Edit a cell value

- **Given** a table with headers `["Name", "Type"]` and one row `["id", "number"]`
- **When** user changes the second cell to `"string"`
- **Then** `tableChange` emits `{ headers: ["Name", "Type"], rows: [["id", "string"]] }`

### Scenario: Add a row

- **Given** a table with 2 headers and 1 existing row
- **When** user clicks "+ Add Row"
- **Then** `tableChange` emits with the original row plus a new row of `["", ""]`

### Scenario: Remove a row

- **Given** a table with rows at indices 0, 1, 2
- **When** user clicks the remove button on row 1
- **Then** `tableChange` emits with only rows 0 and 2

### Scenario: Move row up

- **Given** a table with rows `[["a"], ["b"], ["c"]]`
- **When** user moves row at index 2 up
- **Then** `tableChange` emits with rows `[["a"], ["c"], ["b"]]`

### Scenario: Move first row up (no-op)

- **Given** a table with rows `[["a"], ["b"]]`
- **When** `moveRowUp(0)` is called
- **Then** no event is emitted; the table remains unchanged

### Scenario: Empty table shows placeholder

- **Given** a table with headers but zero rows
- **When** the component renders
- **Then** an empty state message "No rows yet. Add one below." is displayed

### Scenario: Parse section content with mixed text and tables

- **Given** section content containing a paragraph, then a markdown table, then more text
- **When** `parseContentBlocks(content)` is called
- **Then** returns 3 blocks: text, table, text — in order

### Scenario: Round-trip serialization preserves content

- **Given** a markdown string with a valid table
- **When** `parseContentBlocks` then `serializeContentBlocks` are called in sequence
- **Then** the output is semantically equivalent to the input (column alignment may differ)

## Error Cases

| Condition | Behavior |
|-----------|----------|
| Table string with fewer than 2 lines | `parseMarkdownTable` returns `null` |
| Missing separator row (no `---` pattern) | `parseMarkdownTable` returns `null` |
| Row has fewer cells than headers | Cells are padded with empty strings |
| Row has more cells than headers | Extra cells are trimmed to match header count |
| Table lines that fail parsing | `parseContentBlocks` falls back to treating them as text blocks |
| Table with zero headers | `serializeMarkdownTable` returns empty string |

## Dependencies

### Consumes

| Module | What is used |
|--------|-------------|
| `@angular/core` | `Component`, `input`, `output`, `computed` |
| `@angular/forms` | `FormsModule` (for `ngModel` on cell inputs) |

### Consumed By

| Module | What is used |
|--------|-------------|
| `section-editor` | `TableEditorComponent` for inline table editing; `parseContentBlocks`, `serializeContentBlocks`, `MarkdownTable`, `ContentBlock` from `markdown-table` model |
| `editor-page` | Indirectly via section-editor |

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-02-25 | CorvidAgent | Initial spec |
