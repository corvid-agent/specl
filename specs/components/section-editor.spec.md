---
module: section-editor
version: 1
status: active
files:
  - src/app/components/section-editor/section-editor.ts
  - src/app/components/section-editor/section-editor.html
  - src/app/components/section-editor/section-editor.scss
depends_on:
  - spec-models
---

# Section Editor

## Purpose

Provides a focused editing interface for a single spec section. Renders an editable heading input and a CodeMirror 6 editor scoped to just that section's content. Supports prev/next navigation between sections. Manages CodeMirror instance lifecycle — creating and destroying editors as the active section changes.

## Public API

### Exported Classes

| Class | Description |
|-------|-------------|
| `SectionEditorComponent` | Angular standalone component for editing a single section |

### Component Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `section` | `SpecSection` | Yes | The section to edit |
| `sectionIndex` | `number` | Yes | Current section index in the editable sections array |
| `totalSections` | `number` | Yes | Total number of editable sections |

### Component Outputs

| Output | Type | Description |
|--------|------|-------------|
| `contentChange` | `string` | Emitted when the section content changes in the editor |
| `headingChange` | `string` | Emitted when the section heading input changes |
| `navigate` | `number` | Emitted with target index when prev/next is clicked (-1 for frontmatter) |

## Invariants

1. A new CodeMirror EditorView is created when the section index changes
2. The old EditorView is destroyed before creating a new one to prevent memory leaks
3. `suppressUpdate` flag prevents feedback loops — when user types, the update listener emits contentChange which would trigger an external state update, which would try to update the editor again
4. Prev button navigates to `index - 1`, or `-1` (frontmatter) if already at index 0
5. Next button is disabled at the last section (`sectionIndex >= totalSections - 1`)
6. The editor uses One Dark theme, markdown syntax highlighting, line numbers, history, and active line highlighting

## Behavioral Examples

### Scenario: Section changes trigger editor recreation

- **Given** the editor is showing section at index 2
- **When** the parent sets `sectionIndex` to 3
- **Then** the current EditorView is destroyed and a new one is created with section 3's content

### Scenario: Content editing emits change

- **Given** the Purpose section is loaded in the editor
- **When** user types additional text
- **Then** `contentChange` emits with the full updated document text

### Scenario: Navigate to previous section

- **Given** current section index is 2
- **When** user clicks the "Prev" button
- **Then** `navigate` emits with value `1`

### Scenario: Navigate from first section to frontmatter

- **Given** current section index is 0
- **When** user clicks the "Prev" button
- **Then** `navigate` emits with value `-1`

### Scenario: Heading change

- **Given** section heading is "Purpose"
- **When** user changes the heading input to "Overview"
- **Then** `headingChange` emits with value `"Overview"`

## Error Cases

| Condition | Behavior |
|-----------|----------|
| No editor host element | Effect exits early, no editor created |
| Component destroyed | `ngOnDestroy` calls `destroyEditor` to clean up the EditorView |
| External content matches editor content | No dispatch — avoids unnecessary updates |

## Dependencies

### Consumes

| Module | What is used |
|--------|-------------|
| `spec-models` | `SpecSection` type |
| `@codemirror/state` | `EditorState` |
| `@codemirror/view` | `EditorView`, `keymap`, `lineNumbers`, `highlightActiveLine` |
| `@codemirror/commands` | `defaultKeymap`, `history`, `historyKeymap` |
| `@codemirror/lang-markdown` | `markdown` language support |
| `@codemirror/theme-one-dark` | `oneDark` theme |
| `@codemirror/language` | `syntaxHighlighting`, `defaultHighlightStyle` |

### Consumed By

| Module | What is used |
|--------|-------------|
| `editor-page` | Child component displaying the active section |

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-02-24 | CorvidAgent | Initial spec |
| 2026-02-24 | CorvidAgent | Add arrow icons to Prev/Next buttons (#17) |
