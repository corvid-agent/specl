import { test, expect, type Page } from '@playwright/test';

/**
 * Helper: clear IndexedDB and navigate to home.
 */
async function resetApp(page: Page) {
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
}

/**
 * Helper: import a spec file with the given markdown content.
 */
async function importSpec(page: Page, filename: string, content: string) {
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('.actions >> text=Import'),
  ]);
  await fileChooser.setFiles({
    name: filename,
    mimeType: 'text/markdown',
    buffer: Buffer.from(content),
  });
  // Wait for the spec to appear in the sidebar and auto-navigate
  await expect(page.locator('.spec-item')).toHaveCount(1, { timeout: 5000 });
}

/**
 * Helper: navigate to a section by clicking its nav item.
 */
async function navigateToSection(page: Page, sectionName: string) {
  await page.locator('.nav-item', { hasText: sectionName }).click();
}

/**
 * Build a spec markdown string with a table in the Error Cases section.
 */
function buildSpecWithTable(tableMarkdown: string): string {
  return `---
module: table-test
version: 1
status: draft
files:
  - src/table.ts
db_tables: []
depends_on: []
---

# Table Test

## Purpose

Module for testing table editor E2E.

## Public API

None.

## Invariants

1. Tables must serialize correctly.

## Behavioral Examples

### Scenario: Edit

- **Given** a table
- **When** edited
- **Then** output is correct

## Error Cases

${tableMarkdown}

## Dependencies

None.

## Change Log

| Date       | Author | Change  |
|------------|--------|---------|
| 2026-02-25 | test   | Initial |
`;
}

const SIMPLE_TABLE = `| Condition   | Behavior   |
|-------------|------------|
| Not found   | Return 404 |
| Unauthorized| Return 401 |`;

const LARGE_TABLE = `| Code | Condition       | Behavior         | Severity |
|------|-----------------|------------------|----------|
| E001 | Not found       | Return 404       | low      |
| E002 | Unauthorized    | Return 401       | high     |
| E003 | Rate limited    | Return 429       | medium   |
| E004 | Server error    | Return 500       | critical |
| E005 | Bad request     | Return 400       | low      |`;

test.describe('Table Editor', () => {
  test.beforeEach(async ({ page }) => {
    await resetApp(page);
  });

  test('should render a markdown table in structured editing mode', async ({ page }) => {
    const spec = buildSpecWithTable(SIMPLE_TABLE);
    await importSpec(page, 'table-test.spec.md', spec);

    // Click the spec to open it in the editor
    await page.locator('.spec-item').click();
    await expect(page).toHaveURL(/\/edit\/\d+/);

    // Navigate to the Error Cases section which contains the table
    await navigateToSection(page, 'Error Cases');

    // Verify table editor is rendered (structured mode)
    await expect(page.locator('.table-editor')).toBeVisible();

    // Verify headers
    const headers = page.locator('.table-editor thead th');
    // +1 for the actions column
    await expect(headers).toHaveCount(3);
    await expect(headers.nth(0)).toHaveText('Condition');
    await expect(headers.nth(1)).toHaveText('Behavior');

    // Verify row count
    const rows = page.locator('.table-editor tbody tr');
    await expect(rows).toHaveCount(2);

    // Verify cell values
    const firstRowInputs = rows.nth(0).locator('.cell-input');
    await expect(firstRowInputs.nth(0)).toHaveValue('Not found');
    await expect(firstRowInputs.nth(1)).toHaveValue('Return 404');

    const secondRowInputs = rows.nth(1).locator('.cell-input');
    await expect(secondRowInputs.nth(0)).toHaveValue('Unauthorized');
    await expect(secondRowInputs.nth(1)).toHaveValue('Return 401');
  });

  test('should edit individual cells', async ({ page }) => {
    const spec = buildSpecWithTable(SIMPLE_TABLE);
    await importSpec(page, 'table-test.spec.md', spec);

    await page.locator('.spec-item').click();
    await expect(page).toHaveURL(/\/edit\/\d+/);
    await navigateToSection(page, 'Error Cases');

    // Edit the first cell of the first row
    const firstCell = page.locator('.table-editor tbody tr').nth(0).locator('.cell-input').nth(0);
    await firstCell.fill('Timeout');

    // Verify the cell now has the new value
    await expect(firstCell).toHaveValue('Timeout');

    // Edit the second cell of the first row
    const secondCell = page.locator('.table-editor tbody tr').nth(0).locator('.cell-input').nth(1);
    await secondCell.fill('Return 408');
    await expect(secondCell).toHaveValue('Return 408');

    // Switch to Preview to verify markdown output
    await page.click('text=Preview');
    const preview = page.locator('.preview-pane');
    await expect(preview).toBeVisible();
    await expect(preview).toContainText('Timeout');
    await expect(preview).toContainText('Return 408');
  });

  test('should add a new row', async ({ page }) => {
    const spec = buildSpecWithTable(SIMPLE_TABLE);
    await importSpec(page, 'table-test.spec.md', spec);

    await page.locator('.spec-item').click();
    await expect(page).toHaveURL(/\/edit\/\d+/);
    await navigateToSection(page, 'Error Cases');

    // Verify initial row count
    await expect(page.locator('.table-editor tbody tr')).toHaveCount(2);

    // Click "Add Row" button
    await page.click('text=+ Add Row');

    // Verify row was added
    await expect(page.locator('.table-editor tbody tr')).toHaveCount(3);

    // The new row should have empty cells
    const newRow = page.locator('.table-editor tbody tr').nth(2);
    const newCells = newRow.locator('.cell-input');
    await expect(newCells.nth(0)).toHaveValue('');
    await expect(newCells.nth(1)).toHaveValue('');

    // Fill in the new row
    await newCells.nth(0).fill('Forbidden');
    await newCells.nth(1).fill('Return 403');

    // Verify the values
    await expect(newCells.nth(0)).toHaveValue('Forbidden');
    await expect(newCells.nth(1)).toHaveValue('Return 403');
  });

  test('should remove a row', async ({ page }) => {
    const spec = buildSpecWithTable(SIMPLE_TABLE);
    await importSpec(page, 'table-test.spec.md', spec);

    await page.locator('.spec-item').click();
    await expect(page).toHaveURL(/\/edit\/\d+/);
    await navigateToSection(page, 'Error Cases');

    // Verify initial row count
    await expect(page.locator('.table-editor tbody tr')).toHaveCount(2);

    // Hover over the first row to reveal action buttons and click remove
    const firstRow = page.locator('.table-editor tbody tr').nth(0);
    await firstRow.hover();
    await firstRow.locator('button[title="Remove row"]').click();

    // Verify row was removed (only 1 row left)
    await expect(page.locator('.table-editor tbody tr')).toHaveCount(1);

    // Verify remaining row is the second original row
    const remainingRow = page.locator('.table-editor tbody tr').nth(0);
    await expect(remainingRow.locator('.cell-input').nth(0)).toHaveValue('Unauthorized');
    await expect(remainingRow.locator('.cell-input').nth(1)).toHaveValue('Return 401');
  });

  test('should remove all rows and show empty state', async ({ page }) => {
    const spec = buildSpecWithTable(SIMPLE_TABLE);
    await importSpec(page, 'table-test.spec.md', spec);

    await page.locator('.spec-item').click();
    await expect(page).toHaveURL(/\/edit\/\d+/);
    await navigateToSection(page, 'Error Cases');

    // Remove both rows
    for (let i = 0; i < 2; i++) {
      const row = page.locator('.table-editor tbody tr').nth(0);
      await row.hover();
      await row.locator('button[title="Remove row"]').click();
    }

    // Verify empty state message
    await expect(page.locator('.table-editor tbody tr')).toHaveCount(0);
    await expect(page.locator('.empty-state')).toContainText('No rows yet');
  });

  test('should reorder rows by moving up', async ({ page }) => {
    const spec = buildSpecWithTable(SIMPLE_TABLE);
    await importSpec(page, 'table-test.spec.md', spec);

    await page.locator('.spec-item').click();
    await expect(page).toHaveURL(/\/edit\/\d+/);
    await navigateToSection(page, 'Error Cases');

    // Verify initial order
    const rows = page.locator('.table-editor tbody tr');
    await expect(rows.nth(0).locator('.cell-input').nth(0)).toHaveValue('Not found');
    await expect(rows.nth(1).locator('.cell-input').nth(0)).toHaveValue('Unauthorized');

    // Hover over second row and click Move Up
    const secondRow = rows.nth(1);
    await secondRow.hover();
    await secondRow.locator('button[title="Move up"]').click();

    // Verify reordered — rows should be swapped
    await expect(rows.nth(0).locator('.cell-input').nth(0)).toHaveValue('Unauthorized');
    await expect(rows.nth(1).locator('.cell-input').nth(0)).toHaveValue('Not found');
  });

  test('should reorder rows by moving down', async ({ page }) => {
    const spec = buildSpecWithTable(SIMPLE_TABLE);
    await importSpec(page, 'table-test.spec.md', spec);

    await page.locator('.spec-item').click();
    await expect(page).toHaveURL(/\/edit\/\d+/);
    await navigateToSection(page, 'Error Cases');

    // Verify initial order
    const rows = page.locator('.table-editor tbody tr');
    await expect(rows.nth(0).locator('.cell-input').nth(0)).toHaveValue('Not found');
    await expect(rows.nth(1).locator('.cell-input').nth(0)).toHaveValue('Unauthorized');

    // Hover over first row and click Move Down
    const firstRow = rows.nth(0);
    await firstRow.hover();
    await firstRow.locator('button[title="Move down"]').click();

    // Verify reordered
    await expect(rows.nth(0).locator('.cell-input').nth(0)).toHaveValue('Unauthorized');
    await expect(rows.nth(1).locator('.cell-input').nth(0)).toHaveValue('Not found');
  });

  test('should verify markdown output after edits', async ({ page }) => {
    const spec = buildSpecWithTable(SIMPLE_TABLE);
    await importSpec(page, 'table-test.spec.md', spec);

    await page.locator('.spec-item').click();
    await expect(page).toHaveURL(/\/edit\/\d+/);
    await navigateToSection(page, 'Error Cases');

    // Edit a cell
    const firstCell = page.locator('.table-editor tbody tr').nth(0).locator('.cell-input').nth(0);
    await firstCell.fill('Timeout');

    // Add a new row
    await page.click('text=+ Add Row');
    const newRow = page.locator('.table-editor tbody tr').nth(2);
    await newRow.locator('.cell-input').nth(0).fill('Forbidden');
    await newRow.locator('.cell-input').nth(1).fill('Return 403');

    // Switch to Preview and verify the markdown renders as a table
    await page.click('text=Preview');
    const preview = page.locator('.preview-pane');
    await expect(preview).toBeVisible();

    // Verify all expected content appears in the preview
    await expect(preview).toContainText('Timeout');
    await expect(preview).toContainText('Return 401');
    await expect(preview).toContainText('Forbidden');
    await expect(preview).toContainText('Return 403');

    // The preview should render a table element for the Error Cases section
    const previewTables = preview.locator('table');
    // The spec has 2 tables: Error Cases and Change Log
    const tableCount = await previewTables.count();
    expect(tableCount).toBeGreaterThanOrEqual(2);
  });

  test('should handle a larger table with multiple columns', async ({ page }) => {
    const spec = buildSpecWithTable(LARGE_TABLE);
    await importSpec(page, 'table-test.spec.md', spec);

    await page.locator('.spec-item').click();
    await expect(page).toHaveURL(/\/edit\/\d+/);
    await navigateToSection(page, 'Error Cases');

    // Verify table renders with 4 data columns + 1 actions column
    const headers = page.locator('.table-editor thead th');
    await expect(headers).toHaveCount(5); // Code, Condition, Behavior, Severity, actions
    await expect(headers.nth(0)).toHaveText('Code');
    await expect(headers.nth(1)).toHaveText('Condition');
    await expect(headers.nth(2)).toHaveText('Behavior');
    await expect(headers.nth(3)).toHaveText('Severity');

    // Verify 5 data rows
    const rows = page.locator('.table-editor tbody tr');
    await expect(rows).toHaveCount(5);

    // Spot-check a few cell values
    await expect(rows.nth(0).locator('.cell-input').nth(0)).toHaveValue('E001');
    await expect(rows.nth(2).locator('.cell-input').nth(1)).toHaveValue('Rate limited');
    await expect(rows.nth(4).locator('.cell-input').nth(3)).toHaveValue('low');
  });

  test('should handle editing cells with special characters', async ({ page }) => {
    const spec = buildSpecWithTable(SIMPLE_TABLE);
    await importSpec(page, 'table-test.spec.md', spec);

    await page.locator('.spec-item').click();
    await expect(page).toHaveURL(/\/edit\/\d+/);
    await navigateToSection(page, 'Error Cases');

    // Edit cell with special content
    const firstCell = page.locator('.table-editor tbody tr').nth(0).locator('.cell-input').nth(0);
    await firstCell.fill('Error: "invalid input" <code>');
    await expect(firstCell).toHaveValue('Error: "invalid input" <code>');

    // Edit another cell with markdown-like content
    const secondCell = page.locator('.table-editor tbody tr').nth(0).locator('.cell-input').nth(1);
    await secondCell.fill('Log & retry (3x)');
    await expect(secondCell).toHaveValue('Log & retry (3x)');
  });

  test('should handle the Change Log table in the same spec', async ({ page }) => {
    const spec = buildSpecWithTable(SIMPLE_TABLE);
    await importSpec(page, 'table-test.spec.md', spec);

    await page.locator('.spec-item').click();
    await expect(page).toHaveURL(/\/edit\/\d+/);

    // Navigate to Change Log section (also has a table)
    await navigateToSection(page, 'Change Log');

    // Verify table renders
    await expect(page.locator('.table-editor')).toBeVisible();

    // Verify headers
    const headers = page.locator('.table-editor thead th');
    await expect(headers.nth(0)).toHaveText('Date');
    await expect(headers.nth(1)).toHaveText('Author');
    await expect(headers.nth(2)).toHaveText('Change');

    // Verify initial row
    const firstRow = page.locator('.table-editor tbody tr').nth(0);
    await expect(firstRow.locator('.cell-input').nth(0)).toHaveValue('2026-02-25');
    await expect(firstRow.locator('.cell-input').nth(1)).toHaveValue('test');
    await expect(firstRow.locator('.cell-input').nth(2)).toHaveValue('Initial');
  });

  test('should perform a full editing workflow', async ({ page }) => {
    const spec = buildSpecWithTable(SIMPLE_TABLE);
    await importSpec(page, 'table-test.spec.md', spec);

    await page.locator('.spec-item').click();
    await expect(page).toHaveURL(/\/edit\/\d+/);
    await navigateToSection(page, 'Error Cases');

    const rows = () => page.locator('.table-editor tbody tr');

    // 1. Edit an existing cell
    await rows().nth(0).locator('.cell-input').nth(1).fill('Return 408 Timeout');
    await expect(rows().nth(0).locator('.cell-input').nth(1)).toHaveValue('Return 408 Timeout');

    // 2. Add a new row and fill it
    await page.click('text=+ Add Row');
    await expect(rows()).toHaveCount(3);
    await rows().nth(2).locator('.cell-input').nth(0).fill('Server error');
    await rows().nth(2).locator('.cell-input').nth(1).fill('Return 500');

    // 3. Move the new row up
    await rows().nth(2).hover();
    await rows().nth(2).locator('button[title="Move up"]').click();
    // New row should now be at index 1
    await expect(rows().nth(1).locator('.cell-input').nth(0)).toHaveValue('Server error');

    // 4. Remove the last row (original "Unauthorized" row, now at index 2)
    await rows().nth(2).hover();
    await rows().nth(2).locator('button[title="Remove row"]').click();
    await expect(rows()).toHaveCount(2);

    // 5. Verify final state
    await expect(rows().nth(0).locator('.cell-input').nth(0)).toHaveValue('Not found');
    await expect(rows().nth(0).locator('.cell-input').nth(1)).toHaveValue('Return 408 Timeout');
    await expect(rows().nth(1).locator('.cell-input').nth(0)).toHaveValue('Server error');
    await expect(rows().nth(1).locator('.cell-input').nth(1)).toHaveValue('Return 500');

    // 6. Verify output in Preview
    await page.click('text=Preview');
    const preview = page.locator('.preview-pane');
    await expect(preview).toContainText('Not found');
    await expect(preview).toContainText('Return 408 Timeout');
    await expect(preview).toContainText('Server error');
    await expect(preview).toContainText('Return 500');
    // Original "Unauthorized" row should be gone
    await expect(preview).not.toContainText('Unauthorized');
  });
});
