import { test, expect } from '@playwright/test';

test.describe('Specl App', () => {
  test.beforeEach(async ({ page }) => {
    // Clear IndexedDB before each test
    await page.goto('/');
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase('specl');
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
      });
    });
    await page.goto('/');
  });

  test('should show welcome page on initial load', async ({ page }) => {
    // Use the main content area heading to avoid matching the sidebar logo too
    await expect(page.getByRole('main').getByRole('heading', { name: 'Specl' })).toBeVisible();
    await expect(page.locator('text=Create New Spec')).toBeVisible();
  });

  test('should create a new spec and navigate to editor', async ({ page }) => {
    await page.click('text=Create New Spec');
    // Should navigate to /edit/:id
    await expect(page).toHaveURL(/\/edit\/\d+/);
  });

  test('should show spec in sidebar after creation', async ({ page }) => {
    await page.click('text=Create New Spec');
    await expect(page).toHaveURL(/\/edit\/\d+/);
    // Sidebar should show the new spec
    await expect(page.locator('.spec-item')).toHaveCount(1);
  });

  test('should import spec files via sidebar', async ({ page }) => {
    const specContent = `---
module: test-module
version: 1
status: draft
files:
  - src/test.ts
db_tables: []
depends_on: []
---

# Test Module

## Purpose

This is a test module for E2E testing.

## Public API

No public API.

## Invariants

1. Test invariant

## Behavioral Examples

### Scenario: Test

- **Given** test
- **When** test
- **Then** test

## Error Cases

| Condition | Behavior |
|-----------|----------|
| None | N/A |

## Dependencies

None.

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-02-24 | test | Initial |
`;

    // Use the import button in the sidebar
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('.actions >> text=Import'),
    ]);
    await fileChooser.setFiles({
      name: 'test-module.spec.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from(specContent),
    });

    // After import, the spec should appear in the sidebar
    await expect(page.locator('.spec-item')).toHaveCount(1, { timeout: 5000 });
    await expect(page.locator('.spec-filename')).toContainText('test-module');
  });
});

test.describe('Spec List Features', () => {
  test.beforeEach(async ({ page }) => {
    // Clear IndexedDB
    await page.goto('/');
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase('specl');
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
      });
    });
    await page.goto('/');
  });

  test('should show empty state when no specs exist', async ({ page }) => {
    await expect(page.locator('.empty-state')).toBeVisible();
    await expect(page.locator('text=No specs yet')).toBeVisible();
  });

  test('should display collapsible suite headers', async ({ page }) => {
    // Create two specs so we have a suite group
    await page.click('text=Create New Spec');
    await expect(page).toHaveURL(/\/edit\/\d+/);

    // Go back to home and create another
    await page.goto('/');
    await page.click('text=Create New Spec');
    await expect(page).toHaveURL(/\/edit\/\d+/);

    // Should see suite headers with chevrons
    const suiteHeaders = page.locator('.suite-header');
    await expect(suiteHeaders).toHaveCount(1); // Both in "default" suite
  });

  test('should collapse and expand suite on click', async ({ page }) => {
    // Create a spec so we have a suite
    await page.click('text=Create New Spec');
    await expect(page).toHaveURL(/\/edit\/\d+/);

    // Verify spec items visible
    await expect(page.locator('.spec-item')).toBeVisible();

    // Click suite header to collapse
    await page.click('.suite-header');
    // Spec items should be hidden
    await expect(page.locator('.spec-item')).toHaveCount(0);

    // Click again to expand
    await page.click('.suite-header');
    await expect(page.locator('.spec-item')).toBeVisible();
  });

  test('should show suite item count badge', async ({ page }) => {
    await page.click('text=Create New Spec');
    await expect(page).toHaveURL(/\/edit\/\d+/);

    const countBadge = page.locator('.suite-count');
    await expect(countBadge).toHaveText('1');
  });

  test('should show spec preview text after import', async ({ page }) => {
    const specContent = `---
module: preview-test
version: 1
status: draft
files: []
db_tables: []
depends_on: []
---

# Preview Test

## Purpose

This module handles authentication for the application.

## Public API

None.

## Invariants

1. Must work.

## Behavioral Examples

### Scenario: Test

- **Given** x
- **When** y
- **Then** z

## Error Cases

| C | B |
|---|---|
| x | y |

## Dependencies

None.

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-02-24 | test | Init |
`;

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('.actions >> text=Import'),
    ]);
    await fileChooser.setFiles({
      name: 'preview-test.spec.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from(specContent),
    });

    // Wait for the spec to appear in the sidebar
    await expect(page.locator('.spec-item')).toHaveCount(1, { timeout: 5000 });

    // The preview should show the first meaningful line from the body
    const preview = page.locator('.spec-preview');
    await expect(preview).toBeVisible();
    await expect(preview).toContainText('This module handles authentication');
  });

  test('should scroll spec list when many specs exist', async ({ page }) => {
    // The suite-scroll-area should have overflow-y: auto
    await page.click('text=Create New Spec');
    await expect(page).toHaveURL(/\/edit\/\d+/);

    const scrollArea = page.locator('.suite-scroll-area');
    await expect(scrollArea).toBeVisible();

    // Check CSS property
    const overflow = await scrollArea.evaluate((el) => getComputedStyle(el).overflowY);
    expect(overflow).toBe('auto');
  });

  test('should delete a spec', async ({ page }) => {
    await page.click('text=Create New Spec');
    await expect(page).toHaveURL(/\/edit\/\d+/);

    // Verify spec exists
    await expect(page.locator('.spec-item')).toHaveCount(1);

    // Hover to show delete button and click it
    await page.locator('.spec-item').hover();
    await page.click('.delete-btn');

    // Spec should be removed
    await expect(page.locator('.spec-item')).toHaveCount(0);
  });
});
