---
module: app
version: 1
status: active
files:
  - src/app/app.ts
  - src/app/app.html
  - src/app/app.scss
  - src/app/app.routes.ts
  - src/app/app.config.ts
depends_on:
  - shell
  - welcome
  - spec-store-service
---

# App

## Purpose

Root application module providing bootstrap configuration and route definitions. The `App` component is a minimal shell that renders a `<router-outlet>` and triggers initial data loading via `SpecStoreService.loadAll()` on init. Routes are defined in `app.routes.ts` and application-level providers in `app.config.ts`.

## Public API

### Exported Classes

| Class | Description |
|-------|-------------|
| `App` | Root component — renders `<router-outlet>`, loads all specs on init |

### Exported Constants

| Constant | Type | Description |
|----------|------|-------------|
| `routes` | `Routes` | Application route configuration array |
| `appConfig` | `ApplicationConfig` | Provider configuration for `bootstrapApplication()` |

### Route Configuration

| Path | Component | Loading | Description |
|------|-----------|---------|-------------|
| `''` | `ShellComponent` | Eager | Root layout wrapper with sidebar and content area |
| `'' (child)` | `WelcomeComponent` | Lazy | Default landing page (no spec selected) |
| `'edit/:id' (child)` | `EditorPageComponent` | Lazy | Spec editor page for a given spec ID |

## Invariants

1. `App.ngOnInit()` calls `store.loadAll()` to hydrate all specs from IndexedDB before the user can interact
2. `ShellComponent` is eagerly loaded as the root route and wraps all child routes
3. `WelcomeComponent` and `EditorPageComponent` are lazy-loaded via dynamic `import()`
4. `appConfig` provides `provideRouter(routes)` and `provideBrowserGlobalErrorListeners()` — no other providers
5. The root component fills the full viewport height (`height: 100vh`)
6. All routes are children of the `ShellComponent` route, ensuring the sidebar is always present

## Behavioral Examples

### Scenario: Application bootstrap

- **Given** the app starts
- **When** `App.ngOnInit()` runs
- **Then** `store.loadAll()` is called to load all specs from IndexedDB

### Scenario: Navigate to root

- **Given** the app has bootstrapped
- **When** the URL is `/`
- **Then** `ShellComponent` renders with `WelcomeComponent` in its `<router-outlet>`

### Scenario: Navigate to editor

- **Given** the app has bootstrapped
- **When** the URL is `/edit/42`
- **Then** `ShellComponent` renders with `EditorPageComponent` in its `<router-outlet>`, loading spec ID 42

### Scenario: Unknown route

- **Given** the URL is `/nonexistent`
- **When** Angular evaluates routes
- **Then** no route matches (no wildcard/redirect configured)

## Error Cases

| Condition | Behavior |
|-----------|----------|
| `store.loadAll()` rejects | Error propagates unhandled (no try/catch in `ngOnInit`) |
| Unknown route path | Angular's default behavior — no route match, outlet remains empty |

## Dependencies

### Consumes

| Module | What is used |
|--------|-------------|
| `shell` | `ShellComponent` — root route layout |
| `welcome` | `WelcomeComponent` — lazy-loaded default child route |
| `editor-page` | `EditorPageComponent` — lazy-loaded editor child route |
| `spec-store-service` | `SpecStoreService.loadAll()` — initial data hydration |
| `@angular/router` | `provideRouter`, `RouterOutlet`, `Routes` |
| `@angular/core` | `ApplicationConfig`, `provideBrowserGlobalErrorListeners` |

### Consumed By

| Module | What is used |
|--------|-------------|
| `main.ts` | `bootstrapApplication(App, appConfig)` |

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-03-01 | CorvidAgent | Initial spec |
