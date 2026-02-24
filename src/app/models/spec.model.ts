/**
 * Core data models for Specl specs.
 * Mirrors the corvid-agent .spec.md frontmatter and section structure.
 */

export type SpecStatus = 'draft' | 'active';

export interface SpecFrontmatter {
  module: string;
  version: number;
  status: SpecStatus;
  files: string[];
  db_tables: string[];
  depends_on: string[];
}

export interface SpecSection {
  heading: string;
  level: number;
  content: string;
}

export interface Spec {
  id?: number;
  /** Frontmatter fields */
  frontmatter: SpecFrontmatter;
  /** Raw markdown body (everything after frontmatter) */
  body: string;
  /** Parsed sections for structured editing */
  sections: SpecSection[];
  /** Suite/folder this spec belongs to */
  suite: string;
  /** Original filename (e.g. "scheduler-service.spec.md") */
  filename: string;
  /** Full file path if imported */
  filepath?: string;
  /** ISO timestamp */
  createdAt: string;
  /** ISO timestamp */
  updatedAt: string;
}

export interface SpecSuite {
  name: string;
  specs: Spec[];
}

export interface ValidationError {
  level: 'error' | 'warning';
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export const REQUIRED_SECTIONS = [
  'Purpose',
  'Public API',
  'Invariants',
  'Behavioral Examples',
  'Error Cases',
  'Dependencies',
  'Change Log',
] as const;

export const DEFAULT_FRONTMATTER: SpecFrontmatter = {
  module: '',
  version: 1,
  status: 'draft',
  files: [],
  db_tables: [],
  depends_on: [],
};

export function createEmptySpec(suite = 'default', filename = 'untitled.spec.md'): Spec {
  return {
    frontmatter: { ...DEFAULT_FRONTMATTER },
    body: '',
    sections: [],
    suite,
    filename,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
