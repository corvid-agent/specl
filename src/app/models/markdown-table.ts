/**
 * Utilities for parsing and serializing markdown tables.
 * Allows structured editing of table data without touching raw markdown.
 */

export interface MarkdownTable {
  headers: string[];
  rows: string[][];
}

export interface ContentBlock {
  type: 'text' | 'table';
  /** Raw markdown text (for 'text' blocks) */
  text?: string;
  /** Parsed table data (for 'table' blocks) */
  table?: MarkdownTable;
}

/**
 * Parse section content into blocks of text and tables.
 * Markdown tables are extracted as structured data; everything else stays as text.
 */
export function parseContentBlocks(content: string): ContentBlock[] {
  const lines = content.split('\n');
  const blocks: ContentBlock[] = [];
  let textLines: string[] = [];
  let tableLines: string[] = [];
  let inTable = false;

  const flushText = () => {
    if (textLines.length > 0) {
      blocks.push({ type: 'text', text: textLines.join('\n') });
      textLines = [];
    }
  };

  const flushTable = () => {
    if (tableLines.length >= 2) {
      const table = parseMarkdownTable(tableLines.join('\n'));
      if (table) {
        blocks.push({ type: 'table', table });
      } else {
        // Failed to parse as table — treat as text
        textLines.push(...tableLines);
      }
    } else if (tableLines.length > 0) {
      textLines.push(...tableLines);
    }
    tableLines = [];
  };

  for (const line of lines) {
    const isTableLine = line.trimStart().startsWith('|') && line.trimEnd().endsWith('|');

    if (isTableLine) {
      if (!inTable) {
        flushText();
        inTable = true;
      }
      tableLines.push(line);
    } else {
      if (inTable) {
        flushTable();
        inTable = false;
      }
      textLines.push(line);
    }
  }

  // Flush remaining
  if (inTable) {
    flushTable();
  } else {
    flushText();
  }

  // Flush any remaining text
  if (textLines.length > 0) {
    blocks.push({ type: 'text', text: textLines.join('\n') });
  }

  return blocks;
}

/**
 * Serialize content blocks back to markdown string.
 */
export function serializeContentBlocks(blocks: ContentBlock[]): string {
  return blocks
    .map((block) => {
      if (block.type === 'text') {
        return block.text ?? '';
      }
      if (block.type === 'table' && block.table) {
        return serializeMarkdownTable(block.table);
      }
      return '';
    })
    .join('\n');
}

/**
 * Parse a raw markdown table string into structured data.
 * Expects at least a header row and a separator row.
 */
export function parseMarkdownTable(raw: string): MarkdownTable | null {
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return null;

  // First line = headers
  const headers = parsePipedRow(lines[0]);
  if (headers.length === 0) return null;

  // Second line should be separator (---|---|---)
  if (!isSeparatorRow(lines[1])) return null;

  // Remaining lines = data rows
  const rows: string[][] = [];
  for (let i = 2; i < lines.length; i++) {
    const cells = parsePipedRow(lines[i]);
    // Pad or trim to match header count
    while (cells.length < headers.length) cells.push('');
    if (cells.length > headers.length) cells.length = headers.length;
    rows.push(cells);
  }

  return { headers, rows };
}

/**
 * Serialize structured table data back to markdown.
 */
export function serializeMarkdownTable(table: MarkdownTable): string {
  const { headers, rows } = table;
  if (headers.length === 0) return '';

  // Calculate column widths
  const widths = headers.map((h, i) => {
    const cellWidths = rows.map((r) => (r[i] ?? '').length);
    return Math.max(h.length, ...cellWidths, 3);
  });

  const pad = (str: string, width: number) => str.padEnd(width);

  const headerLine =
    '| ' + headers.map((h, i) => pad(h, widths[i])).join(' | ') + ' |';
  const separatorLine =
    '|' + widths.map((w) => '-'.repeat(w + 2)).join('|') + '|';
  const dataLines = rows.map(
    (row) =>
      '| ' +
      headers.map((_, i) => pad(row[i] ?? '', widths[i])).join(' | ') +
      ' |',
  );

  return [headerLine, separatorLine, ...dataLines].join('\n');
}

function parsePipedRow(line: string): string[] {
  // Remove leading/trailing pipes, split by pipe
  const trimmed = line.replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((cell) => cell.trim());
}

function isSeparatorRow(line: string): boolean {
  // Must be pipes and dashes (with optional colons for alignment)
  return /^\|[\s\-:|]+\|$/.test(line);
}
