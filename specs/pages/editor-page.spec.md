---
module: editor-page
version: 1
status: active
files:
  - src/app/pages/editor/editor-page.ts
  - src/app/pages/editor/editor-page.html
  - src/app/pages/editor/editor-page.scss
depends_on:
  - spec-models
  - spec-store-service
  - spec-parser-service
  - spec-template
  - github-service
  - frontmatter-editor
  - section-nav
  - section-editor
  - spec-preview
---

# Editor Page

## Purpose

The main editing interface for a single spec. Orchestrates section-based navigation, frontmatter editing, section editing, and preview/validation. Loads a spec by route parameter ID, manages which section is active, and coordinates all content changes by rebuilding the markdown body from sections.

## Public API

### Exported Classes

| Class | Description |
|-------|-------------|
| `EditorPageComponent` | Angular standalone component implementing the spec editor page |

### Component Inputs/Outputs

This component has no inputs or outputs — it is a routed page component that reads `ActivatedRoute` params.

### Internal Signals

| Signal | Type | Description |
|--------|------|-------------|
| `activeTab` | `Signal<'edit' \| 'preview'>` | Currently active tab |
| `validation` | `Signal<ValidationResult \| null>` | Latest validation result |
| `filename` | `Signal<string>` | Current spec filename |
| `activeSectionIndex` | `Signal<number>` | Active section index (-1 = frontmatter, 0+ = body sections) |
| `prUrl` | `Signal<string \| null>` | URL of the most recently created PR |
| `prLoading` | `Signal<boolean>` | Whether a PR creation is in progress |

### Computed Properties

| Property | Type | Description |
|----------|------|-------------|
| `spec` | `Signal<Spec \| null>` | The active spec from the store |
| `isDirty` | `Signal<boolean>` | Dirty flag from the store |
| `body` | `Signal<string>` | The spec's markdown body |
| `frontmatter` | `Signal<SpecFrontmatter>` | The spec's frontmatter with defaults |
| `sections` | `Signal<SpecSection[]>` | All parsed sections |
| `editableSections` | `Signal<SpecSection[]>` | Sections with level >= 2 (excludes title) |
| `activeEditableSection` | `Signal<SpecSection \| null>` | The currently selected editable section |
| `canCreatePR` | `Signal<boolean>` | True when GitHub is connected and the spec has a filepath |

## Invariants

1. On load, if the spec body is empty, a template is auto-generated from the frontmatter using `generateSpecTemplate`
2. `activeSectionIndex` of -1 always shows the frontmatter editor
3. `activeSectionIndex` of 0+ maps to `editableSections` (level >= 2 only, excluding the level-1 title)
4. Any section content or heading change triggers `rebuildBody` which reconstructs the full body via `sectionsToBody`
5. Switching to the preview tab automatically triggers validation
6. Export generates a blob download with the serialized markdown
7. "Create PR" button is only visible when GitHub is connected and the spec has a `filepath`
8. PR creation pushes the serialized spec to a new branch and opens a PR against the configured base branch

## Behavioral Examples

### Scenario: Load spec with empty body

- **Given** navigating to `/edit/5` where spec ID 5 has an empty body
- **When** the component initializes
- **Then** a template body is generated from the frontmatter and saved to the spec, and `activeSectionIndex` is set to -1 (frontmatter)

### Scenario: Navigate between sections

- **Given** frontmatter is active (index -1)
- **When** user clicks "Purpose" in the section nav
- **Then** `activeSectionIndex` is set to 0 and the SectionEditor shows the Purpose section content

### Scenario: Edit section content

- **Given** the Purpose section is active
- **When** user types in the CodeMirror editor
- **Then** `onSectionContentChange` fires, finds the section in the full sections array, updates its content, and calls `rebuildBody` to reconstruct the full markdown body

### Scenario: Edit section heading

- **Given** a section with heading "Purpose" is active
- **When** user changes the heading to "Overview"
- **Then** `onSectionHeadingChange` fires, updates the heading in the sections array, and the body is rebuilt with the new heading

### Scenario: Export spec

- **Given** a spec is active
- **When** user clicks export
- **Then** the spec is serialized to markdown, a Blob is created, and a file download is triggered with the spec's filename

### Scenario: Create PR for a GitHub-sourced spec

- **Given** a spec pulled from GitHub with `filepath: 'specs/services/auth.spec.md'` and GitHub connected
- **When** user clicks "Create PR"
- **Then** the spec is serialized, pushed to a new branch, a PR is created, and `prUrl` is set to the PR URL

## Error Cases

| Condition | Behavior |
|-----------|----------|
| Route ID doesn't match any spec | `spec` signal is null, editor shows nothing |
| Section index out of bounds | `activeEditableSection` returns null |
| Section not found in full array during edit | Change is silently dropped (indexOf returns -1) |
| Export with no active spec | No-op, returns early |
| PR creation fails (API error) | Error message set on GitHub service, `prUrl` stays null |
| Create PR with no filepath | Button not shown (`canCreatePR` is false) |

## Dependencies

### Consumes

| Module | What is used |
|--------|-------------|
| `spec-models` | `SpecFrontmatter`, `SpecSection`, `ValidationResult` |
| `spec-store-service` | `activeSpec`, `isDirty`, `selectSpec`, `updateActiveSpec`, `markDirty`, `validateActiveSpec`, `exportSpec` |
| `spec-parser-service` | `parseSections`, `sectionsToBody` |
| `spec-template` | `generateSpecTemplate` |
| `github-service` | `connected`, `createSpecPR` for PR creation |
| `frontmatter-editor` | Child component for frontmatter editing |
| `section-nav` | Child component for section navigation |
| `section-editor` | Child component for section content editing |
| `spec-preview` | Child component for rendered preview |

### Consumed By

| Module | What is used |
|--------|-------------|
| `app.routes` | Lazy-loaded route component at `/edit/:id` |

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-02-24 | CorvidAgent | Initial spec |
| 2026-02-24 | CorvidAgent | Add GitHub PR creation (Create PR button, prUrl/prLoading signals, canCreatePR computed) |
