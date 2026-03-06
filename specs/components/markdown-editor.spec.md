---
module: markdown-editor
version: 1
status: active
files:
  - src/app/components/markdown-editor/markdown-editor.ts
  - src/app/components/markdown-editor/markdown-editor.html
  - src/app/components/markdown-editor/markdown-editor.scss
depends_on:
  - spec-models
---

# Markdown Editor

## Purpose

A thin wrapper around CodeMirror 6 that provides a full-document markdown editing experience. Accepts content as an input signal, creates a CodeMirror `EditorView` on first render, and keeps the editor in sync with external content changes. Emits content changes on user edits. Manages the `EditorView` lifecycle — creates it lazily in an effect and destroys it on component teardown.

## Public API

### Exported Classes

| Class | Description |
|-------|-------------|
| `MarkdownEditorComponent` | Angular standalone component wrapping CodeMirror 6 |

### Component Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | `string` | Yes | The markdown content to display in the editor |

### Component Outputs

| Output | Type | Description |
|--------|------|-------------|
| `contentChange` | `string` | Emitted with the full document text when the user edits content |

## Invariants

1. The `EditorView` is created lazily — only when the effect first runs and the host element is available
2. Once created, the `EditorView` is reused; content changes dispatch transactions rather than recreating the editor
3. A `suppressUpdate` flag prevents feedback loops: when the user types, `contentChange` emits, which may cause the parent to update the `content` input, which would dispatch back into the editor — the flag breaks this cycle
4. External content updates are only dispatched if the new value differs from `EditorView.state.doc.toString()`
5. `ngOnDestroy` calls `view.destroy()` to clean up the CodeMirror instance
6. The editor includes: line numbers, active line highlighting, line wrapping, undo/redo history, markdown syntax highlighting, One Dark theme
7. The editor container has `aria-label="Markdown editor"` for accessibility
8. The editor fills 100% of its host's height via CSS and a custom CodeMirror theme extension

## Behavioral Examples

### Scenario: Initial render creates editor

- **Given** the component mounts with `content` set to `"# Hello"`
- **When** the effect runs
- **Then** a CodeMirror `EditorView` is created with `"# Hello"` as the document and attached to the host `<div>`

### Scenario: User types in editor

- **Given** the editor is initialized with some content
- **When** the user types additional text
- **Then** the `updateListener` fires, sets `suppressUpdate = true`, and emits `contentChange` with the full document text

### Scenario: External content update syncs to editor

- **Given** the editor shows `"# Hello"`
- **When** the parent changes the `content` input to `"# World"`
- **Then** the effect dispatches a transaction replacing the full document, and the editor shows `"# World"`

### Scenario: Identical external update is a no-op

- **Given** the editor shows `"# Hello"`
- **When** the parent sets `content` to `"# Hello"` (same value)
- **Then** no transaction is dispatched

### Scenario: Suppress flag prevents echo

- **Given** the user just typed, setting `suppressUpdate = true`
- **When** the effect runs from the resulting `content` input change
- **Then** the effect skips the dispatch and resets `suppressUpdate` to `false`

### Scenario: Component destroyed

- **Given** the editor is active
- **When** the component is destroyed
- **Then** `ngOnDestroy` calls `view.destroy()` and the CodeMirror instance is cleaned up

## Error Cases

| Condition | Behavior |
|-----------|----------|
| Host element not yet in DOM | Effect runs but `viewChild.required` guarantees availability; Angular throws if missing |
| Component destroyed before editor created | `ngOnDestroy` safely calls `this.view?.destroy()` (no-op if null) |

## Dependencies

### Consumes

| Module | What is used |
|--------|-------------|
| `@codemirror/state` | `EditorState` |
| `@codemirror/view` | `EditorView`, `keymap`, `lineNumbers`, `highlightActiveLine` |
| `@codemirror/commands` | `defaultKeymap`, `history`, `historyKeymap` |
| `@codemirror/lang-markdown` | `markdown` language support |
| `@codemirror/theme-one-dark` | `oneDark` theme |
| `@codemirror/language` | `syntaxHighlighting`, `defaultHighlightStyle` |

### Consumed By

| Module | What is used |
|--------|-------------|
| `editor-page` | Used for full-document markdown editing mode |

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-03-01 | CorvidAgent | Initial spec |
