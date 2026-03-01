---
module: shell
version: 1
status: active
files:
  - src/app/components/shell/shell.ts
  - src/app/components/shell/shell.html
  - src/app/components/shell/shell.scss
depends_on:
  - spec-list
---

# Shell

## Purpose

Provides the root application layout: a responsive sidebar for spec navigation and a main content area rendered via `<router-outlet>`. On desktop (≥768 px) the sidebar is always visible. On mobile (<768 px) it becomes a full-screen overlay with dialog semantics, backdrop click-to-dismiss, Escape key handling, and focus management.

## Public API

### Exported Classes

| Class | Description |
|-------|-------------|
| `ShellComponent` | Angular standalone component — root layout shell |

### Signals

| Signal | Type | Description |
|--------|------|-------------|
| `sidebarOpen` | `WritableSignal<boolean>` | Whether the sidebar is visible (default `true`) |
| `isMobile` | `WritableSignal<boolean>` | `true` when `window.innerWidth < 768` |
| `isDialog` | `Signal<boolean>` | Computed: `isMobile() && sidebarOpen()` |

### Methods

| Method | Description |
|--------|-------------|
| `toggleSidebar()` | Toggles `sidebarOpen` signal |
| `onResize()` | `@HostListener('window:resize')` — updates `isMobile` |
| `onEscape()` | `@HostListener('keydown.escape')` — closes sidebar when `isDialog()` is true |

## Invariants

1. The sidebar has `role="dialog"` and `aria-modal="true"` when `isDialog()` is true; otherwise `role="complementary"` and no `aria-modal`
2. The main content area gets `inert` attribute when the sidebar is in dialog mode, preventing interaction behind the overlay
3. On `NavigationEnd`, the sidebar auto-closes only when `window.innerWidth < 768`
4. Escape key closes the sidebar only when it is in dialog mode (mobile + open)
5. When the sidebar opens on mobile, focus moves to the close button; when it closes, focus returns to the previously focused element
6. The mobile breakpoint is 768 px — values below are mobile, values at or above are desktop
7. The mobile menu button's `aria-expanded` reflects the current `sidebarOpen` state
8. Backdrop click and close button click both call `toggleSidebar()`

## Behavioral Examples

### Scenario: Desktop layout — sidebar always visible

- **Given** the viewport width is ≥768 px
- **When** the shell renders
- **Then** the sidebar is visible with `role="complementary"` and the main content is interactive (no `inert`)

### Scenario: Mobile sidebar opens as dialog

- **Given** the viewport width is <768 px and the sidebar is closed
- **When** the user taps the hamburger menu button
- **Then** the sidebar opens with `role="dialog"`, `aria-modal="true"`, and main content gets `inert`

### Scenario: Navigation auto-closes sidebar on mobile

- **Given** the viewport width is <768 px and the sidebar is open
- **When** a `NavigationEnd` event fires (user selected a spec)
- **Then** the sidebar closes automatically

### Scenario: Navigation keeps sidebar on desktop

- **Given** the viewport width is ≥768 px and the sidebar is open
- **When** a `NavigationEnd` event fires
- **Then** the sidebar remains open

### Scenario: Escape closes mobile dialog

- **Given** `isDialog()` is true (mobile + sidebar open)
- **When** the user presses Escape
- **Then** the sidebar closes

### Scenario: Escape does nothing on desktop

- **Given** the viewport is desktop width and the sidebar is open
- **When** the user presses Escape
- **Then** the sidebar remains open

### Scenario: Backdrop click closes sidebar

- **Given** the sidebar is open
- **When** the user clicks the backdrop overlay
- **Then** `toggleSidebar()` is called and the sidebar closes

## Error Cases

| Condition | Behavior |
|-----------|----------|
| Close button not found in DOM | Focus management silently skips (optional chaining on `closeBtn?.focus()`) |
| No previously focused element | Focus restoration is skipped (`previousFocus` is null) |

## Dependencies

### Consumes

| Module | What is used |
|--------|-------------|
| `spec-list` | `SpecListComponent` — rendered inside the sidebar |
| `@angular/router` | `RouterOutlet`, `Router`, `NavigationEnd` |
| `@angular/core` | `signal`, `computed`, `effect`, `HostListener`, `ViewChild`, `ElementRef` |

### Consumed By

| Module | What is used |
|--------|-------------|
| `app.routes` | Root route component wrapping all child routes |

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-03-01 | CorvidAgent | Initial spec |
