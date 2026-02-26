---
module: markdown-table
version: 1
status: active
files:
  - src/app/models/markdown-table.ts
depends_on: []
---

# Markdown Table

## Purpose

Provides utilities for parsing and serializing markdown tables and mixed content blocks. Enables structured editing of table data within spec sections by converting between raw markdown strings and typed data structures (`MarkdownTable`, `ContentBlock`). This module is the bridge between raw markdown text and the structured table editing UI.

## Public API

### Exported Types

| Type | Description |
|------|-------------|
| `MarkdownTable` | Interface with `headers: string[]` and `rows: string[][]` representing a parsed markdown table |
| `ContentBlock` | Interface with `type: 'text' \| 'table'`, optional `text?: string` for text blocks, and optional `table?: MarkdownTable` for table blocks |

### Exported Functions

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `parseMarkdownTable` | `(raw: string)` | `MarkdownTable \| null` | Parses a raw markdown table string into structured data. Requires at least a header row and a separator row. Returns `null` if the input is not a valid table. |
| `serializeMarkdownTable` | `(table: MarkdownTable)` | `string` | Serializes a `MarkdownTable` back to a formatted markdown string with aligned columns. Returns empty string if headers are empty. |
| `parseContentBlocks` | `(content: string)` | `ContentBlock[]` | Splits section content into an ordered array of text and table blocks. Lines starting and ending with `\|` are treated as table lines. |
| `serializeContentBlocks` | `(blocks: ContentBlock[])` | `string` | Serializes an array of `ContentBlock` objects back into a single markdown string by joining text and serialized tables. |

## Invariants

1. `parseMarkdownTable` followed by `serializeMarkdownTable` produces a table that, when parsed again, yields an equivalent `MarkdownTable` (round-trip fidelity)
2. `parseContentBlocks` followed by `serializeContentBlocks` preserves the semantic content of the input (text stays as text, tables stay as tables)
3. `parseMarkdownTable` returns `null` if the input has fewer than 2 lines (header + separator are required)
4. `parseMarkdownTable` returns `null` if the second line is not a valid separator row (pipes and dashes, optionally with colons for alignment)
5. Data rows are always padded or trimmed to match the header column count — `rows[n].length === headers.length` for all rows
6. `serializeMarkdownTable` returns empty string when `headers` is empty
7. `serializeMarkdownTable` pads columns to uniform width (minimum 3 characters) for visual alignment
8. A line is considered a table line if and only if it starts with `|` (after trimming leading whitespace) and ends with `|` (after trimming trailing whitespace)
9. `parseContentBlocks` never produces adjacent blocks of the same type — text blocks and table blocks always alternate (with possible leading/trailing text blocks)
10. Table lines that fail to parse as a valid table (e.g., only 1 pipe-delimited line) are demoted to text blocks

## Behavioral Examples

### Scenario: Parse a simple two-column table

- **Given** raw markdown:
  ```
  | Name | Value |
  |------|-------|
  | foo  | 42    |
  ```
- **When** `parseMarkdownTable(raw)` is called
- **Then** returns `{ headers: ['Name', 'Value'], rows: [['foo', '42']] }`

### Scenario: Parse table with mismatched column counts

- **Given** a table where a data row has fewer columns than headers
- **When** `parseMarkdownTable(raw)` is called
- **Then** the short row is padded with empty strings to match the header count

### Scenario: Parse table with extra columns in data rows

- **Given** a table where a data row has more columns than headers
- **When** `parseMarkdownTable(raw)` is called
- **Then** the extra columns are trimmed to match the header count

### Scenario: Serialize a table with aligned columns

- **Given** a `MarkdownTable` with headers `['A', 'LongHeader']` and rows `[['x', 'y']]`
- **When** `serializeMarkdownTable(table)` is called
- **Then** output has columns padded to uniform width with pipe separators

### Scenario: Parse mixed content with text and tables

- **Given** section content containing a text paragraph, then a markdown table, then more text
- **When** `parseContentBlocks(content)` is called
- **Then** returns three blocks: `[{ type: 'text', ... }, { type: 'table', ... }, { type: 'text', ... }]`

### Scenario: Round-trip content blocks

- **Given** any valid section content string
- **When** `serializeContentBlocks(parseContentBlocks(content))` is called
- **Then** the result, when parsed again, yields equivalent content blocks

### Scenario: Content with no tables

- **Given** section content with no pipe-delimited lines
- **When** `parseContentBlocks(content)` is called
- **Then** returns a single text block containing the entire content

## Error Cases

| Condition | Behavior |
|-----------|----------|
| Fewer than 2 lines in table input | `parseMarkdownTable` returns `null` |
| Missing separator row (no dashes) | `parseMarkdownTable` returns `null` |
| First row has no pipe-delimited cells | `parseMarkdownTable` returns `null` (empty headers) |
| Empty headers array in `serializeMarkdownTable` | Returns empty string `''` |
| Table lines that fail parsing | `parseContentBlocks` demotes them to text (appended to adjacent text block) |
| Single pipe-delimited line (no separator) | Treated as text by `parseContentBlocks` since `parseMarkdownTable` requires >= 2 lines |
| Empty content string | `parseContentBlocks` returns a single text block with empty string |
| Text block with undefined text | `serializeContentBlocks` substitutes empty string (`''`) |
| Table block with undefined table | `serializeContentBlocks` substitutes empty string (`''`) |

## Dependencies

### Consumes

| Module | What is used |
|--------|-------------|
| (none) | This is a leaf module with no dependencies |

### Consumed By

| Module | What is used |
|--------|-------------|
| `section-editor` | `parseContentBlocks`, `serializeContentBlocks`, `ContentBlock`, `MarkdownTable` |
| `table-editor` | `MarkdownTable` type |

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-02-25 | CorvidAgent | Initial spec |
