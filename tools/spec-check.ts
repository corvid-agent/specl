#!/usr/bin/env bun
/**
 * spec-check — CLI tool to validate .spec.md files.
 *
 * Usage:
 *   bun tools/spec-check.ts [paths...]
 *   bun tools/spec-check.ts specs/
 *   bun tools/spec-check.ts specs/models/spec-models.spec.md
 *   bun tools/spec-check.ts --deps specs/       # show dependency graph
 *
 * Exit codes:
 *   0 — all specs valid
 *   1 — validation errors found
 *   2 — no spec files found
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { parse as parseYaml } from 'yaml';

// ─── Types ──────────────────────────────────────────────────────────
interface SpecFrontmatter {
  module: string;
  version: number;
  status: string;
  files: string[];
  db_tables: string[];
  depends_on: string[];
}

interface SpecSection {
  heading: string;
  level: number;
  content: string;
}

interface ValidationError {
  level: 'error' | 'warning';
  field: string;
  message: string;
}

const REQUIRED_SECTIONS = [
  'Purpose',
  'Public API',
  'Invariants',
  'Behavioral Examples',
  'Error Cases',
  'Dependencies',
  'Change Log',
];

// ─── Parsing ────────────────────────────────────────────────────────
function extractFrontmatter(raw: string): { frontmatter: SpecFrontmatter; body: string } {
  const fmRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
  const match = raw.match(fmRegex);
  const defaults: SpecFrontmatter = {
    module: '',
    version: 1,
    status: 'draft',
    files: [],
    db_tables: [],
    depends_on: [],
  };

  if (!match) {
    return { frontmatter: defaults, body: raw };
  }

  try {
    const parsed = parseYaml(match[1]) as Record<string, unknown>;
    return {
      frontmatter: {
        module: String(parsed['module'] ?? ''),
        version: Number(parsed['version'] ?? 1),
        status: String(parsed['status'] ?? 'draft'),
        files: Array.isArray(parsed['files']) ? parsed['files'].map(String) : [],
        db_tables: Array.isArray(parsed['db_tables']) ? parsed['db_tables'].map(String) : [],
        depends_on: Array.isArray(parsed['depends_on']) ? parsed['depends_on'].map(String) : [],
      },
      body: match[2],
    };
  } catch {
    return { frontmatter: defaults, body: raw };
  }
}

function parseSections(body: string): SpecSection[] {
  const sections: SpecSection[] = [];
  const lines = body.split('\n');
  let current: SpecSection | null = null;
  const contentLines: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      if (current) {
        current.content = contentLines.join('\n').trim();
        sections.push(current);
        contentLines.length = 0;
      }
      current = {
        heading: headingMatch[2],
        level: headingMatch[1].length,
        content: '',
      };
    } else if (current) {
      contentLines.push(line);
    }
  }

  if (current) {
    current.content = contentLines.join('\n').trim();
    sections.push(current);
  }

  return sections;
}

// ─── Validation ─────────────────────────────────────────────────────
function validate(
  frontmatter: SpecFrontmatter,
  sections: SpecSection[],
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Frontmatter checks
  if (!frontmatter.module || frontmatter.module.trim() === '') {
    errors.push({ level: 'error', field: 'module', message: 'Module name is required' });
  }

  if (!frontmatter.version || frontmatter.version < 1) {
    errors.push({ level: 'error', field: 'version', message: 'Version must be a positive number' });
  }

  if (!frontmatter.status || !['draft', 'active'].includes(frontmatter.status)) {
    errors.push({ level: 'error', field: 'status', message: 'Status must be "draft" or "active"' });
  }

  if (!frontmatter.files || frontmatter.files.length === 0) {
    errors.push({ level: 'error', field: 'files', message: 'At least one file is required' });
  }

  for (const file of frontmatter.files) {
    if (!file || file.trim() === '') {
      errors.push({ level: 'error', field: 'files', message: 'File paths must not be empty' });
    }
  }

  // Section checks
  const sectionHeadings = new Set(
    sections.filter((s) => s.level === 2).map((s) => s.heading),
  );

  for (const required of REQUIRED_SECTIONS) {
    if (!sectionHeadings.has(required)) {
      errors.push({
        level: 'error',
        field: 'sections',
        message: `Missing required section: ## ${required}`,
      });
    }
  }

  // Warn on empty sections (level-2 sections with subsections are not empty)
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    if (section.level === 2 && (!section.content || section.content.trim() === '')) {
      // Check if this section has subsections with content
      let hasSubContent = false;
      for (let j = i + 1; j < sections.length; j++) {
        if (sections[j].level <= 2) break;
        if (sections[j].content && sections[j].content.trim() !== '') {
          hasSubContent = true;
          break;
        }
      }
      if (!hasSubContent) {
        errors.push({
          level: 'warning',
          field: 'sections',
          message: `Section "## ${section.heading}" is empty`,
        });
      }
    }
  }

  return errors;
}

// ─── File discovery ─────────────────────────────────────────────────
function findSpecFiles(paths: string[]): string[] {
  const files: string[] = [];

  for (const p of paths) {
    try {
      const stat = statSync(p);
      if (stat.isDirectory()) {
        walkDir(p, files);
      } else if (p.endsWith('.spec.md')) {
        files.push(p);
      }
    } catch {
      console.error(`  Warning: cannot access ${p}`);
    }
  }

  return files;
}

function walkDir(dir: string, files: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(full, files);
    } else if (entry.name.endsWith('.spec.md')) {
      files.push(full);
    }
  }
}

// ─── Cross-spec dependency validation ────────────────────────────────
interface ParsedSpec {
  file: string;
  frontmatter: SpecFrontmatter;
  sections: SpecSection[];
}

function validateDependencyRefs(
  specs: ParsedSpec[],
): Map<string, ValidationError[]> {
  const knownModules = new Set(specs.map((s) => s.frontmatter.module).filter(Boolean));
  const errorsByFile = new Map<string, ValidationError[]>();

  for (const spec of specs) {
    const errors: ValidationError[] = [];
    for (const dep of spec.frontmatter.depends_on) {
      if (!knownModules.has(dep)) {
        errors.push({
          level: 'warning',
          field: 'depends_on',
          message: `Dependency "${dep}" does not match any known spec module`,
        });
      }
    }
    if (errors.length > 0) {
      errorsByFile.set(spec.file, errors);
    }
  }

  return errorsByFile;
}

function detectCycles(specs: ParsedSpec[]): string[][] {
  const graph = new Map<string, string[]>();
  for (const spec of specs) {
    if (spec.frontmatter.module) {
      graph.set(spec.frontmatter.module, spec.frontmatter.depends_on);
    }
  }

  const cycles: string[][] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(node: string, path: string[]): void {
    if (inStack.has(node)) {
      const cycleStart = path.indexOf(node);
      cycles.push([...path.slice(cycleStart), node]);
      return;
    }
    if (visited.has(node)) return;

    visited.add(node);
    inStack.add(node);
    path.push(node);

    for (const dep of graph.get(node) ?? []) {
      if (graph.has(dep)) {
        dfs(dep, path);
      }
    }

    path.pop();
    inStack.delete(node);
  }

  for (const mod of graph.keys()) {
    dfs(mod, []);
  }

  return cycles;
}

function printDependencyGraph(specs: ParsedSpec[]): void {
  const specsByModule = new Map<string, ParsedSpec>();
  for (const spec of specs) {
    if (spec.frontmatter.module) {
      specsByModule.set(spec.frontmatter.module, spec);
    }
  }

  // Build reverse dependency map (consumed by)
  const consumedBy = new Map<string, string[]>();
  for (const spec of specs) {
    for (const dep of spec.frontmatter.depends_on) {
      const existing = consumedBy.get(dep) ?? [];
      existing.push(spec.frontmatter.module);
      consumedBy.set(dep, existing);
    }
  }

  console.log('Dependency Graph\n');

  // Sort by module name for consistent output
  const sorted = [...specsByModule.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  for (const [mod, spec] of sorted) {
    const deps = spec.frontmatter.depends_on;
    const dependents = consumedBy.get(mod) ?? [];
    const relPath = relative(process.cwd(), spec.file);

    console.log(`  ${mod}  (${relPath})`);
    if (deps.length > 0) {
      console.log(`    depends on: ${deps.join(', ')}`);
    }
    if (dependents.length > 0) {
      console.log(`    used by:    ${dependents.join(', ')}`);
    }
    if (deps.length === 0 && dependents.length === 0) {
      console.log('    (no dependencies)');
    }
    console.log('');
  }

  // Show cycles if any
  const cycles = detectCycles(specs);
  if (cycles.length > 0) {
    console.log('Circular dependencies detected:\n');
    for (const cycle of cycles) {
      console.log(`  ${cycle.join(' -> ')}`);
    }
    console.log('');
  }
}

// ─── Main ───────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const showDeps = args.includes('--deps');
const paths = args.filter((a) => a !== '--deps');
if (paths.length === 0) paths.push('specs/');

const specFiles = findSpecFiles(paths);

if (specFiles.length === 0) {
  console.error('No .spec.md files found.');
  process.exit(2);
}

// Parse all specs up front for cross-spec validation
const parsedSpecs: ParsedSpec[] = specFiles.map((file) => {
  const raw = readFileSync(file, 'utf-8');
  const { frontmatter, body } = extractFrontmatter(raw);
  const sections = parseSections(body);
  return { file, frontmatter, sections };
});

// ─── --deps mode: print graph and exit ──────────────────────────────
if (showDeps) {
  printDependencyGraph(parsedSpecs);
  process.exit(0);
}

// ─── Normal validation mode ─────────────────────────────────────────
const depErrors = validateDependencyRefs(parsedSpecs);
const cycles = detectCycles(parsedSpecs);

let totalErrors = 0;
let totalWarnings = 0;
let failedFiles = 0;

console.log(`Checking ${specFiles.length} spec file(s)...\n`);

for (const spec of parsedSpecs) {
  const errors = validate(spec.frontmatter, spec.sections);

  // Merge in cross-spec dependency warnings
  const crossErrors = depErrors.get(spec.file) ?? [];
  errors.push(...crossErrors);

  const fileErrors = errors.filter((e) => e.level === 'error');
  const fileWarnings = errors.filter((e) => e.level === 'warning');

  const relPath = relative(process.cwd(), spec.file);

  if (fileErrors.length === 0 && fileWarnings.length === 0) {
    console.log(`  PASS  ${relPath}`);
  } else if (fileErrors.length === 0) {
    console.log(`  WARN  ${relPath}`);
    for (const w of fileWarnings) {
      console.log(`        - ${w.message}`);
    }
  } else {
    console.log(`  FAIL  ${relPath}`);
    for (const e of fileErrors) {
      console.log(`        [error] ${e.message}`);
    }
    for (const w of fileWarnings) {
      console.log(`        [warn]  ${w.message}`);
    }
    failedFiles++;
  }

  totalErrors += fileErrors.length;
  totalWarnings += fileWarnings.length;
}

// Report cycles
if (cycles.length > 0) {
  console.log('\nCircular dependencies detected:');
  for (const cycle of cycles) {
    console.log(`  ${cycle.join(' -> ')}`);
  }
  totalWarnings += cycles.length;
}

console.log('');
console.log(
  `Results: ${specFiles.length} files, ${totalErrors} error(s), ${totalWarnings} warning(s)`,
);

if (totalErrors > 0) {
  console.log(`\n${failedFiles} file(s) failed validation.`);
  process.exit(1);
} else {
  console.log('\nAll specs valid.');
  process.exit(0);
}
