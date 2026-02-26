import { TestBed } from '@angular/core/testing';
import { SpecValidatorService } from './spec-validator.service';
import {
  type Spec,
  type SpecSection,
  createEmptySpec,
  REQUIRED_SECTIONS,
} from '../models/spec.model';

function makeValidSpec(): Spec {
  const spec = createEmptySpec('services', 'test.spec.md');
  spec.frontmatter = {
    module: 'test-module',
    version: 1,
    status: 'active',
    files: ['src/test.ts'],
    db_tables: [],
    depends_on: [],
  };
  spec.sections = REQUIRED_SECTIONS.map((heading) => ({
    heading,
    level: 2,
    content: `Content for ${heading}.`,
  }));
  // Add the top-level title
  spec.sections.unshift({ heading: 'test-module', level: 1, content: '' });
  return spec;
}

describe('SpecValidatorService', () => {
  let service: SpecValidatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [SpecValidatorService] });
    service = TestBed.inject(SpecValidatorService);
  });

  describe('valid spec', () => {
    it('should pass validation for a fully valid spec', () => {
      const result = service.validate(makeValidSpec());
      expect(result.valid).toBe(true);
      expect(result.errors.filter((e) => e.level === 'error')).toHaveLength(0);
    });
  });

  describe('frontmatter validation', () => {
    it('should error when module name is missing', () => {
      const spec = makeValidSpec();
      spec.frontmatter.module = '';
      const result = service.validate(spec);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ level: 'error', field: 'module' })
      );
    });

    it('should error when module name is whitespace-only', () => {
      const spec = makeValidSpec();
      spec.frontmatter.module = '   ';
      const result = service.validate(spec);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ level: 'error', field: 'module' })
      );
    });

    it('should error when version is 0', () => {
      const spec = makeValidSpec();
      spec.frontmatter.version = 0;
      const result = service.validate(spec);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ level: 'error', field: 'version' })
      );
    });

    it('should error when version is negative', () => {
      const spec = makeValidSpec();
      spec.frontmatter.version = -1;
      const result = service.validate(spec);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ level: 'error', field: 'version' })
      );
    });

    it('should accept version greater than 1', () => {
      const spec = makeValidSpec();
      spec.frontmatter.version = 5;
      const result = service.validate(spec);
      expect(result.errors.filter((e) => e.field === 'version')).toHaveLength(0);
    });

    it('should error when status is invalid', () => {
      const spec = makeValidSpec();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (spec.frontmatter as any).status = 'archived';
      const result = service.validate(spec);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ level: 'error', field: 'status' })
      );
    });

    it('should accept "draft" status', () => {
      const spec = makeValidSpec();
      spec.frontmatter.status = 'draft';
      const result = service.validate(spec);
      expect(result.errors.filter((e) => e.field === 'status')).toHaveLength(0);
    });

    it('should accept "active" status', () => {
      const spec = makeValidSpec();
      spec.frontmatter.status = 'active';
      const result = service.validate(spec);
      expect(result.errors.filter((e) => e.field === 'status')).toHaveLength(0);
    });

    it('should error when files array is empty', () => {
      const spec = makeValidSpec();
      spec.frontmatter.files = [];
      const result = service.validate(spec);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ level: 'error', field: 'files', message: 'At least one file is required' })
      );
    });

    it('should error when a file path is empty string', () => {
      const spec = makeValidSpec();
      spec.frontmatter.files = ['src/valid.ts', ''];
      const result = service.validate(spec);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ level: 'error', field: 'files', message: 'File paths must not be empty' })
      );
    });

    it('should error when a file path is whitespace-only', () => {
      const spec = makeValidSpec();
      spec.frontmatter.files = ['  '];
      const result = service.validate(spec);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'files', message: 'File paths must not be empty' })
      );
    });
  });

  describe('section validation', () => {
    it('should error for each missing required section', () => {
      const spec = makeValidSpec();
      spec.sections = []; // Remove all sections
      const result = service.validate(spec);

      const sectionErrors = result.errors.filter(
        (e) => e.level === 'error' && e.field === 'sections'
      );
      expect(sectionErrors).toHaveLength(REQUIRED_SECTIONS.length);

      for (const required of REQUIRED_SECTIONS) {
        expect(sectionErrors).toContainEqual(
          expect.objectContaining({ message: `Missing required section: ## ${required}` })
        );
      }
    });

    it('should error when a single required section is missing', () => {
      const spec = makeValidSpec();
      // Remove "Error Cases" section
      spec.sections = spec.sections.filter((s) => s.heading !== 'Error Cases');
      const result = service.validate(spec);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ message: 'Missing required section: ## Error Cases' })
      );
    });

    it('should not count h3 sections as required sections', () => {
      const spec = makeValidSpec();
      // Replace the h2 "Purpose" with an h3 "Purpose"
      const idx = spec.sections.findIndex((s) => s.heading === 'Purpose');
      spec.sections[idx].level = 3;
      const result = service.validate(spec);

      expect(result.errors).toContainEqual(
        expect.objectContaining({ message: 'Missing required section: ## Purpose' })
      );
    });

    it('should warn on empty level-2 sections', () => {
      const spec = makeValidSpec();
      const purposeIdx = spec.sections.findIndex((s) => s.heading === 'Purpose');
      spec.sections[purposeIdx].content = '';
      const result = service.validate(spec);

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          level: 'warning',
          message: 'Section "## Purpose" is empty',
        })
      );
    });

    it('should warn on whitespace-only level-2 sections', () => {
      const spec = makeValidSpec();
      const idx = spec.sections.findIndex((s) => s.heading === 'Invariants');
      spec.sections[idx].content = '   \n  ';
      const result = service.validate(spec);

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          level: 'warning',
          message: 'Section "## Invariants" is empty',
        })
      );
    });

    it('should not warn when an empty h2 section has non-empty subsections', () => {
      const spec = makeValidSpec();
      // Make "Public API" h2 empty but add an h3 child with content
      const apiIdx = spec.sections.findIndex((s) => s.heading === 'Public API');
      spec.sections[apiIdx].content = '';
      // Insert an h3 subsection right after it
      spec.sections.splice(apiIdx + 1, 0, {
        heading: 'Exported Functions',
        level: 3,
        content: '| Function | Returns |\n|----------|---------|',
      });
      const result = service.validate(spec);

      const apiWarning = result.errors.find(
        (e) => e.level === 'warning' && e.message.includes('Public API')
      );
      expect(apiWarning).toBeUndefined();
    });

    it('should warn when an empty h2 section has only empty subsections', () => {
      const spec = makeValidSpec();
      const apiIdx = spec.sections.findIndex((s) => s.heading === 'Public API');
      spec.sections[apiIdx].content = '';
      spec.sections.splice(apiIdx + 1, 0, {
        heading: 'Exported Functions',
        level: 3,
        content: '',
      });
      const result = service.validate(spec);

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          level: 'warning',
          message: 'Section "## Public API" is empty',
        })
      );
    });

    it('should stop checking subsections when hitting the next h2', () => {
      const spec = makeValidSpec();
      // Make "Purpose" empty, and ensure the next section (Public API) has content
      // but it shouldn't count because it's level 2
      const purposeIdx = spec.sections.findIndex((s) => s.heading === 'Purpose');
      spec.sections[purposeIdx].content = '';

      const result = service.validate(spec);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          level: 'warning',
          message: 'Section "## Purpose" is empty',
        })
      );
    });
  });

  describe('validation result structure', () => {
    it('should return valid=true when only warnings exist', () => {
      const spec = makeValidSpec();
      // Make one section empty to produce a warning
      const idx = spec.sections.findIndex((s) => s.heading === 'Change Log');
      spec.sections[idx].content = '';
      const result = service.validate(spec);

      // Should be valid because warnings don't make it invalid
      expect(result.valid).toBe(true);
      expect(result.errors.some((e) => e.level === 'warning')).toBe(true);
    });

    it('should return valid=false when any error exists alongside warnings', () => {
      const spec = makeValidSpec();
      spec.frontmatter.module = ''; // error
      const idx = spec.sections.findIndex((s) => s.heading === 'Change Log');
      spec.sections[idx].content = ''; // warning

      const result = service.validate(spec);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.level === 'error')).toBe(true);
      expect(result.errors.some((e) => e.level === 'warning')).toBe(true);
    });

    it('should accumulate multiple errors', () => {
      const spec = makeValidSpec();
      spec.frontmatter.module = '';
      spec.frontmatter.version = 0;
      spec.frontmatter.files = [];

      const result = service.validate(spec);
      const errorCount = result.errors.filter((e) => e.level === 'error').length;
      expect(errorCount).toBeGreaterThanOrEqual(3);
    });
  });
});
