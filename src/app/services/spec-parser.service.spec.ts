import { TestBed } from '@angular/core/testing';
import { SpecParserService } from './spec-parser.service';
import { REQUIRED_SECTIONS } from '../models/spec.model';

describe('SpecParserService', () => {
  let service: SpecParserService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [SpecParserService] });
    service = TestBed.inject(SpecParserService);
  });

  describe('parseMarkdown', () => {
    it('should parse a complete spec with frontmatter and body', () => {
      const raw = `---
module: auth-service
version: 2
status: active
files:
  - src/auth.ts
---
# auth-service

## Purpose

Handles authentication.
`;
      const spec = service.parseMarkdown(raw, 'auth.spec.md', 'services');

      expect(spec.filename).toBe('auth.spec.md');
      expect(spec.suite).toBe('services');
      expect(spec.frontmatter.module).toBe('auth-service');
      expect(spec.frontmatter.version).toBe(2);
      expect(spec.frontmatter.status).toBe('active');
      expect(spec.frontmatter.files).toEqual(['src/auth.ts']);
      expect(spec.sections.length).toBe(2);
      expect(spec.sections[0].heading).toBe('auth-service');
      expect(spec.sections[1].heading).toBe('Purpose');
    });

    it('should use default filename and suite when not provided', () => {
      const spec = service.parseMarkdown('---\nmodule: test\nversion: 1\nstatus: draft\nfiles: []\n---\n');
      expect(spec.filename).toBe('untitled.spec.md');
      expect(spec.suite).toBe('default');
    });

    it('should parse db_tables and depends_on arrays', () => {
      const raw = `---
module: db-service
version: 1
status: draft
files:
  - src/db.ts
db_tables:
  - users
  - sessions
depends_on:
  - auth-service
---
`;
      const spec = service.parseMarkdown(raw);
      expect(spec.frontmatter.db_tables).toEqual(['users', 'sessions']);
      expect(spec.frontmatter.depends_on).toEqual(['auth-service']);
    });

    it('should default db_tables and depends_on to empty arrays', () => {
      const raw = `---
module: simple
version: 1
status: draft
files: []
---
`;
      const spec = service.parseMarkdown(raw);
      expect(spec.frontmatter.db_tables).toEqual([]);
      expect(spec.frontmatter.depends_on).toEqual([]);
    });

    it('should handle raw text with no frontmatter', () => {
      const raw = '# Just a heading\n\nSome content.';
      const spec = service.parseMarkdown(raw);

      expect(spec.frontmatter.module).toBe('');
      expect(spec.frontmatter.version).toBe(1);
      expect(spec.frontmatter.status).toBe('draft');
      expect(spec.body).toBe(raw);
    });

    it('should handle invalid YAML in frontmatter gracefully', () => {
      // Use truly invalid YAML that will fail to parse
      const raw = '---\n{{{\n---\nBody content';
      const spec = service.parseMarkdown(raw);

      // Should fall back to defaults and use raw as body
      expect(spec.frontmatter.module).toBe('');
      expect(spec.body).toBe(raw);
    });

    it('should handle empty input', () => {
      const spec = service.parseMarkdown('');
      expect(spec.frontmatter.module).toBe('');
      expect(spec.body).toBe('');
      expect(spec.sections).toEqual([]);
    });

    it('should handle Windows-style line endings (CRLF)', () => {
      const raw = '---\r\nmodule: crlf-test\r\nversion: 1\r\nstatus: draft\r\nfiles: []\r\n---\r\n# Title\r\n';
      const spec = service.parseMarkdown(raw);
      expect(spec.frontmatter.module).toBe('crlf-test');
    });
  });

  describe('serializeToMarkdown', () => {
    it('should round-trip a parsed spec back to markdown', () => {
      const raw = `---
module: round-trip
version: 1
status: draft
files:
  - src/index.ts
---
# round-trip

## Purpose

Test round-tripping.
`;
      const spec = service.parseMarkdown(raw);
      const serialized = service.serializeToMarkdown(spec);

      expect(serialized).toContain('---');
      expect(serialized).toContain('module: round-trip');
      expect(serialized).toContain('# round-trip');
      expect(serialized).toContain('## Purpose');
      expect(serialized).toContain('Test round-tripping.');
    });

    it('should omit db_tables when empty', () => {
      const spec = service.parseMarkdown('---\nmodule: x\nversion: 1\nstatus: draft\nfiles: []\n---\n');
      const serialized = service.serializeToMarkdown(spec);
      expect(serialized).not.toContain('db_tables');
    });

    it('should omit depends_on when empty', () => {
      const spec = service.parseMarkdown('---\nmodule: x\nversion: 1\nstatus: draft\nfiles: []\n---\n');
      const serialized = service.serializeToMarkdown(spec);
      expect(serialized).not.toContain('depends_on');
    });

    it('should include db_tables when populated', () => {
      const raw = `---
module: x
version: 1
status: draft
files: []
db_tables:
  - users
---
`;
      const spec = service.parseMarkdown(raw);
      const serialized = service.serializeToMarkdown(spec);
      expect(serialized).toContain('db_tables');
      expect(serialized).toContain('users');
    });

    it('should include depends_on when populated', () => {
      const raw = `---
module: x
version: 1
status: draft
files: []
depends_on:
  - auth
---
`;
      const spec = service.parseMarkdown(raw);
      const serialized = service.serializeToMarkdown(spec);
      expect(serialized).toContain('depends_on');
      expect(serialized).toContain('auth');
    });
  });

  describe('parseSections', () => {
    it('should parse level-1 and level-2 headings', () => {
      const body = '# Title\n\n## Section One\n\nContent one.\n\n## Section Two\n\nContent two.';
      const sections = service.parseSections(body);

      expect(sections.length).toBe(3);
      expect(sections[0]).toEqual({ heading: 'Title', level: 1, content: '' });
      expect(sections[1]).toEqual({ heading: 'Section One', level: 2, content: 'Content one.' });
      expect(sections[2]).toEqual({ heading: 'Section Two', level: 2, content: 'Content two.' });
    });

    it('should handle nested subsections (h3, h4)', () => {
      const body = '## Parent\n\nParent content.\n\n### Child\n\nChild content.\n\n#### Grandchild\n\nDeep content.';
      const sections = service.parseSections(body);

      expect(sections.length).toBe(3);
      expect(sections[0]).toEqual({ heading: 'Parent', level: 2, content: 'Parent content.' });
      expect(sections[1]).toEqual({ heading: 'Child', level: 3, content: 'Child content.' });
      expect(sections[2]).toEqual({ heading: 'Grandchild', level: 4, content: 'Deep content.' });
    });

    it('should return empty array for empty body', () => {
      expect(service.parseSections('')).toEqual([]);
    });

    it('should return empty array for body with no headings', () => {
      expect(service.parseSections('Just plain text\nwith no headings.')).toEqual([]);
    });

    it('should ignore content before the first heading', () => {
      const body = 'Some preamble text\n\n# Title\n\nContent.';
      const sections = service.parseSections(body);

      expect(sections.length).toBe(1);
      expect(sections[0].heading).toBe('Title');
      expect(sections[0].content).toBe('Content.');
    });

    it('should handle sections with multi-line content', () => {
      const body = '## Section\n\nLine one.\nLine two.\nLine three.';
      const sections = service.parseSections(body);

      expect(sections[0].content).toBe('Line one.\nLine two.\nLine three.');
    });

    it('should handle sections with tables', () => {
      const body = '## Public API\n\n| Function | Returns |\n|----------|--------|\n| `foo` | `void` |';
      const sections = service.parseSections(body);

      expect(sections[0].heading).toBe('Public API');
      expect(sections[0].content).toContain('| Function | Returns |');
    });

    it('should trim trailing whitespace from section content', () => {
      const body = '## Section\n\nContent with trailing space.   \n\n';
      const sections = service.parseSections(body);
      // trim() is applied to the joined content
      expect(sections[0].content).toBe('Content with trailing space.');
    });
  });

  describe('sectionsToBody', () => {
    it('should reconstruct body from title and sections', () => {
      const sections = [
        { heading: 'Purpose', level: 2, content: 'Does things.' },
        { heading: 'Dependencies', level: 2, content: 'None.' },
      ];
      const body = service.sectionsToBody('my-module', sections);

      expect(body).toContain('# my-module');
      expect(body).toContain('## Purpose');
      expect(body).toContain('Does things.');
      expect(body).toContain('## Dependencies');
      expect(body).toContain('None.');
    });

    it('should handle empty title', () => {
      const sections = [{ heading: 'Purpose', level: 2, content: 'Content.' }];
      const body = service.sectionsToBody('', sections);

      // Should not start with a top-level heading
      expect(body).not.toMatch(/^# /);
      expect(body).toContain('## Purpose');
    });

    it('should handle empty sections array', () => {
      const body = service.sectionsToBody('Title', []);
      expect(body).toContain('# Title');
    });

    it('should handle sections with empty content', () => {
      const sections = [{ heading: 'Empty', level: 2, content: '' }];
      const body = service.sectionsToBody('Title', sections);

      expect(body).toContain('## Empty');
    });

    it('should produce correct heading levels for nested sections', () => {
      const sections = [
        { heading: 'Parent', level: 2, content: '' },
        { heading: 'Child', level: 3, content: 'Nested content.' },
      ];
      const body = service.sectionsToBody('Title', sections);

      expect(body).toContain('## Parent');
      expect(body).toContain('### Child');
      expect(body).toContain('Nested content.');
    });
  });

  describe('integration: parse then serialize', () => {
    it('should preserve all 7 required sections through a round trip', () => {
      const raw = `---
module: full-spec
version: 1
status: active
files:
  - src/full.ts
---
# full-spec

## Purpose

The purpose.

## Public API

The API.

## Invariants

The invariants.

## Behavioral Examples

The examples.

## Error Cases

The errors.

## Dependencies

The deps.

## Change Log

The log.
`;
      const spec = service.parseMarkdown(raw);

      // All 7 required sections should be present
      const headings = spec.sections.filter((s) => s.level === 2).map((s) => s.heading);
      for (const required of REQUIRED_SECTIONS) {
        expect(headings).toContain(required);
      }

      // Serialize and re-parse
      const serialized = service.serializeToMarkdown(spec);
      const reparsed = service.parseMarkdown(serialized);

      expect(reparsed.frontmatter.module).toBe('full-spec');
      expect(reparsed.sections.filter((s) => s.level === 2).map((s) => s.heading)).toEqual(headings);
    });
  });
});
