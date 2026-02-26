import {
  MarkdownTable,
  ContentBlock,
  parseMarkdownTable,
  serializeMarkdownTable,
  parseContentBlocks,
  serializeContentBlocks,
} from './markdown-table';

describe('parseMarkdownTable', () => {
  it('should parse a basic table with headers and rows', () => {
    const raw = `| Name | Age |
|------|-----|
| Alice | 30 |
| Bob | 25 |`;

    const result = parseMarkdownTable(raw);
    expect(result).toEqual({
      headers: ['Name', 'Age'],
      rows: [
        ['Alice', '30'],
        ['Bob', '25'],
      ],
    });
  });

  it('should return null for empty input', () => {
    expect(parseMarkdownTable('')).toBeNull();
  });

  it('should return null for a single line (no separator)', () => {
    expect(parseMarkdownTable('| Name | Age |')).toBeNull();
  });

  it('should return null when second line is not a separator', () => {
    const raw = `| Name | Age |
| Alice | 30 |`;
    expect(parseMarkdownTable(raw)).toBeNull();
  });

  it('should parse a table with no data rows', () => {
    const raw = `| Name | Age |
|------|-----|`;

    const result = parseMarkdownTable(raw);
    expect(result).toEqual({
      headers: ['Name', 'Age'],
      rows: [],
    });
  });

  it('should parse a single-column table', () => {
    const raw = `| Status |
|--------|
| active |
| done |`;

    const result = parseMarkdownTable(raw);
    expect(result).toEqual({
      headers: ['Status'],
      rows: [['active'], ['done']],
    });
  });

  it('should pad rows with fewer cells than headers', () => {
    const raw = `| A | B | C |
|---|---|---|
| 1 |`;

    const result = parseMarkdownTable(raw);
    expect(result).not.toBeNull();
    expect(result!.rows[0]).toEqual(['1', '', '']);
  });

  it('should trim rows with more cells than headers', () => {
    const raw = `| A | B |
|---|---|
| 1 | 2 | 3 | 4 |`;

    const result = parseMarkdownTable(raw);
    expect(result).not.toBeNull();
    expect(result!.rows[0]).toEqual(['1', '2']);
  });

  it('should handle whitespace in cells', () => {
    const raw = `|  Name  |  Value  |
|--------|---------|
|  hello |  world  |`;

    const result = parseMarkdownTable(raw);
    expect(result).toEqual({
      headers: ['Name', 'Value'],
      rows: [['hello', 'world']],
    });
  });

  it('should handle separator with alignment colons', () => {
    const raw = `| Left | Center | Right |
|:-----|:------:|------:|
| a | b | c |`;

    const result = parseMarkdownTable(raw);
    expect(result).not.toBeNull();
    expect(result!.headers).toEqual(['Left', 'Center', 'Right']);
    expect(result!.rows).toEqual([['a', 'b', 'c']]);
  });

  it('should skip blank lines in the raw input', () => {
    const raw = `| Name | Age |

|------|-----|

| Alice | 30 |`;

    const result = parseMarkdownTable(raw);
    expect(result).toEqual({
      headers: ['Name', 'Age'],
      rows: [['Alice', '30']],
    });
  });

  it('should handle special characters in cells', () => {
    const raw = `| Symbol | Meaning |
|--------|---------|
| <div> | HTML tag |
| a & b | ampersand |
| "quoted" | quotes |`;

    const result = parseMarkdownTable(raw);
    expect(result).not.toBeNull();
    expect(result!.rows[0]).toEqual(['<div>', 'HTML tag']);
    expect(result!.rows[1]).toEqual(['a & b', 'ampersand']);
    expect(result!.rows[2]).toEqual(['"quoted"', 'quotes']);
  });
});

describe('serializeMarkdownTable', () => {
  it('should serialize a basic table', () => {
    const table: MarkdownTable = {
      headers: ['Name', 'Age'],
      rows: [
        ['Alice', '30'],
        ['Bob', '25'],
      ],
    };

    const result = serializeMarkdownTable(table);
    const lines = result.split('\n');

    expect(lines.length).toBe(4);
    // Header line
    expect(lines[0]).toMatch(/^\| Name\s+\| Age\s+\|$/);
    // Separator line
    expect(lines[1]).toMatch(/^\|[-]+\|[-]+\|$/);
    // Data lines
    expect(lines[2]).toMatch(/^\| Alice\s+\| 30\s+\|$/);
    expect(lines[3]).toMatch(/^\| Bob\s+\| 25\s+\|$/);
  });

  it('should return empty string for empty headers', () => {
    const table: MarkdownTable = { headers: [], rows: [] };
    expect(serializeMarkdownTable(table)).toBe('');
  });

  it('should serialize a table with no rows', () => {
    const table: MarkdownTable = {
      headers: ['A', 'B'],
      rows: [],
    };

    const result = serializeMarkdownTable(table);
    const lines = result.split('\n');
    expect(lines.length).toBe(2);
    expect(lines[0]).toContain('A');
    expect(lines[0]).toContain('B');
    expect(lines[1]).toMatch(/^\|[-]+\|[-]+\|$/);
  });

  it('should enforce minimum column width of 3', () => {
    const table: MarkdownTable = {
      headers: ['X'],
      rows: [['Y']],
    };

    const result = serializeMarkdownTable(table);
    const lines = result.split('\n');
    // Header should be padded to at least 3
    expect(lines[0]).toBe('| X   |');
    // Separator dashes should be at least 3 + 2 (padding) = 5
    expect(lines[1]).toBe('|-----|');
  });

  it('should handle missing cells in rows', () => {
    const table: MarkdownTable = {
      headers: ['A', 'B', 'C'],
      rows: [['1']],  // missing B and C
    };

    const result = serializeMarkdownTable(table);
    const lines = result.split('\n');
    expect(lines.length).toBe(3);
    // Should not throw, missing cells default to ''
    expect(lines[2]).toContain('1');
  });

  it('should calculate column widths based on longest content', () => {
    const table: MarkdownTable = {
      headers: ['ID', 'Description'],
      rows: [
        ['1', 'Short'],
        ['2', 'A much longer description value'],
      ],
    };

    const result = serializeMarkdownTable(table);
    const lines = result.split('\n');
    // All lines should have same visual width
    // The Description column should be wide enough for the longest value
    expect(lines[2]).toContain('Short');
    expect(lines[3]).toContain('A much longer description value');
  });
});

describe('parseContentBlocks', () => {
  it('should parse plain text as a single text block', () => {
    const content = 'This is just some text.\nWith multiple lines.';
    const blocks = parseContentBlocks(content);

    expect(blocks.length).toBe(1);
    expect(blocks[0].type).toBe('text');
    expect(blocks[0].text).toBe(content);
  });

  it('should parse a standalone table as a single table block', () => {
    const content = `| Name | Age |
|------|-----|
| Alice | 30 |`;

    const blocks = parseContentBlocks(content);
    expect(blocks.length).toBe(1);
    expect(blocks[0].type).toBe('table');
    expect(blocks[0].table).not.toBeNull();
    expect(blocks[0].table!.headers).toEqual(['Name', 'Age']);
  });

  it('should parse text followed by a table', () => {
    const content = `Some intro text.

| Name | Age |
|------|-----|
| Alice | 30 |`;

    const blocks = parseContentBlocks(content);
    expect(blocks.length).toBe(2);
    expect(blocks[0].type).toBe('text');
    expect(blocks[0].text).toBe('Some intro text.\n');
    expect(blocks[1].type).toBe('table');
  });

  it('should parse text, table, then more text', () => {
    const content = `Before table.

| Col |
|-----|
| val |

After table.`;

    const blocks = parseContentBlocks(content);
    expect(blocks.length).toBe(3);
    expect(blocks[0].type).toBe('text');
    expect(blocks[1].type).toBe('table');
    expect(blocks[2].type).toBe('text');
    expect(blocks[2].text).toContain('After table.');
  });

  it('should handle empty content', () => {
    const blocks = parseContentBlocks('');
    expect(blocks.length).toBe(1);
    expect(blocks[0].type).toBe('text');
    expect(blocks[0].text).toBe('');
  });

  it('should treat a single pipe line (not a valid table) as text', () => {
    const content = '| just one line |';
    const blocks = parseContentBlocks(content);

    // A single pipe line is collected as table lines, but flushTable
    // with < 2 lines pushes it to textLines
    expect(blocks.length).toBe(1);
    expect(blocks[0].type).toBe('text');
  });

  it('should handle multiple tables', () => {
    const content = `| A |
|---|
| 1 |

Some text between.

| B |
|---|
| 2 |`;

    const blocks = parseContentBlocks(content);
    const tableBlocks = blocks.filter((b) => b.type === 'table');
    expect(tableBlocks.length).toBe(2);
    expect(tableBlocks[0].table!.headers).toEqual(['A']);
    expect(tableBlocks[1].table!.headers).toEqual(['B']);
  });

  it('should fall back to text when pipe lines do not form a valid table', () => {
    // Two pipe lines but second isn't a valid separator
    const content = `| Not a table |
| Also not a separator |`;

    const blocks = parseContentBlocks(content);
    // Should be treated as text since parseMarkdownTable returns null
    expect(blocks.length).toBe(1);
    expect(blocks[0].type).toBe('text');
  });
});

describe('serializeContentBlocks', () => {
  it('should serialize a single text block', () => {
    const blocks: ContentBlock[] = [
      { type: 'text', text: 'Hello world' },
    ];
    expect(serializeContentBlocks(blocks)).toBe('Hello world');
  });

  it('should serialize a single table block', () => {
    const blocks: ContentBlock[] = [
      {
        type: 'table',
        table: {
          headers: ['A'],
          rows: [['1']],
        },
      },
    ];

    const result = serializeContentBlocks(blocks);
    expect(result).toContain('| A');
    expect(result).toContain('| 1');
  });

  it('should serialize mixed text and table blocks', () => {
    const blocks: ContentBlock[] = [
      { type: 'text', text: 'Intro text' },
      {
        type: 'table',
        table: {
          headers: ['Col'],
          rows: [['val']],
        },
      },
      { type: 'text', text: 'Outro text' },
    ];

    const result = serializeContentBlocks(blocks);
    expect(result).toContain('Intro text');
    expect(result).toContain('| Col');
    expect(result).toContain('Outro text');
  });

  it('should handle empty blocks array', () => {
    expect(serializeContentBlocks([])).toBe('');
  });

  it('should handle text block with missing text property', () => {
    const blocks: ContentBlock[] = [
      { type: 'text' },
    ];
    expect(serializeContentBlocks(blocks)).toBe('');
  });

  it('should handle table block with missing table property', () => {
    const blocks: ContentBlock[] = [
      { type: 'table' },
    ];
    expect(serializeContentBlocks(blocks)).toBe('');
  });
});

describe('roundtrip: parse → serialize', () => {
  it('should roundtrip a basic table', () => {
    const table: MarkdownTable = {
      headers: ['Name', 'Age', 'City'],
      rows: [
        ['Alice', '30', 'NYC'],
        ['Bob', '25', 'LA'],
      ],
    };

    const serialized = serializeMarkdownTable(table);
    const parsed = parseMarkdownTable(serialized);

    expect(parsed).not.toBeNull();
    expect(parsed!.headers).toEqual(table.headers);
    expect(parsed!.rows).toEqual(table.rows);
  });

  it('should roundtrip a table with no rows', () => {
    const table: MarkdownTable = {
      headers: ['X', 'Y'],
      rows: [],
    };

    const serialized = serializeMarkdownTable(table);
    const parsed = parseMarkdownTable(serialized);

    expect(parsed).not.toBeNull();
    expect(parsed!.headers).toEqual(table.headers);
    expect(parsed!.rows).toEqual([]);
  });

  it('should roundtrip a single-column table', () => {
    const table: MarkdownTable = {
      headers: ['Status'],
      rows: [['active'], ['inactive']],
    };

    const serialized = serializeMarkdownTable(table);
    const parsed = parseMarkdownTable(serialized);

    expect(parsed).not.toBeNull();
    expect(parsed!.headers).toEqual(table.headers);
    expect(parsed!.rows).toEqual(table.rows);
  });

  it('should roundtrip content blocks with text and tables', () => {
    const originalBlocks: ContentBlock[] = [
      { type: 'text', text: 'Some intro text.\n' },
      {
        type: 'table',
        table: {
          headers: ['Feature', 'Status'],
          rows: [
            ['Auth', 'Done'],
            ['API', 'WIP'],
          ],
        },
      },
      { type: 'text', text: '\nSome outro text.' },
    ];

    const serialized = serializeContentBlocks(originalBlocks);
    const reparsed = parseContentBlocks(serialized);

    // Should have the same structure
    const tableBlocks = reparsed.filter((b) => b.type === 'table');
    expect(tableBlocks.length).toBe(1);
    expect(tableBlocks[0].table!.headers).toEqual(['Feature', 'Status']);
    expect(tableBlocks[0].table!.rows).toEqual([
      ['Auth', 'Done'],
      ['API', 'WIP'],
    ]);
  });

  it('should produce stable output on double roundtrip', () => {
    const table: MarkdownTable = {
      headers: ['A', 'B'],
      rows: [['hello', 'world']],
    };

    const first = serializeMarkdownTable(table);
    const parsed1 = parseMarkdownTable(first);
    const second = serializeMarkdownTable(parsed1!);
    const parsed2 = parseMarkdownTable(second);
    const third = serializeMarkdownTable(parsed2!);

    // After first normalization, output should be stable
    expect(second).toBe(third);
  });
});
