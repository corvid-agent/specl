import { Injectable } from '@angular/core';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import {
  type Spec,
  type SpecFrontmatter,
  type SpecSection,
  DEFAULT_FRONTMATTER,
  createEmptySpec,
} from '../models/spec.model';

@Injectable({ providedIn: 'root' })
export class SpecParserService {
  /**
   * Parse raw markdown (with frontmatter) into a Spec object.
   */
  parseMarkdown(raw: string, filename = 'untitled.spec.md', suite = 'default'): Spec {
    const spec = createEmptySpec(suite, filename);
    const { frontmatter, body } = this.extractFrontmatter(raw);
    spec.frontmatter = frontmatter;
    spec.body = body;
    spec.sections = this.parseSections(body);
    return spec;
  }

  /**
   * Serialize a Spec back to markdown with YAML frontmatter.
   */
  serializeToMarkdown(spec: Spec): string {
    const fm = this.serializeFrontmatter(spec.frontmatter);
    return `---\n${fm}---\n${spec.body}`;
  }

  /**
   * Extract YAML frontmatter and body from raw markdown.
   */
  private extractFrontmatter(raw: string): { frontmatter: SpecFrontmatter; body: string } {
    const fmRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
    const match = raw.match(fmRegex);

    if (!match) {
      return { frontmatter: { ...DEFAULT_FRONTMATTER }, body: raw };
    }

    const yamlStr = match[1];
    const body = match[2];

    try {
      const parsed = parseYaml(yamlStr) as Record<string, unknown>;
      const frontmatter: SpecFrontmatter = {
        module: String(parsed['module'] ?? ''),
        version: Number(parsed['version'] ?? 1),
        status: (parsed['status'] as SpecFrontmatter['status']) ?? 'draft',
        files: Array.isArray(parsed['files']) ? parsed['files'].map(String) : [],
        db_tables: Array.isArray(parsed['db_tables']) ? parsed['db_tables'].map(String) : [],
        depends_on: Array.isArray(parsed['depends_on']) ? parsed['depends_on'].map(String) : [],
      };
      return { frontmatter, body };
    } catch {
      return { frontmatter: { ...DEFAULT_FRONTMATTER }, body: raw };
    }
  }

  /**
   * Serialize frontmatter to YAML string.
   */
  private serializeFrontmatter(fm: SpecFrontmatter): string {
    const obj: Record<string, unknown> = {
      module: fm.module,
      version: fm.version,
      status: fm.status,
      files: fm.files,
    };

    if (fm.db_tables.length > 0) {
      obj['db_tables'] = fm.db_tables;
    }

    if (fm.depends_on.length > 0) {
      obj['depends_on'] = fm.depends_on;
    }

    return stringifyYaml(obj);
  }

  /**
   * Rebuild the full markdown body from an array of sections.
   * Includes the top-level title (# heading) if present.
   */
  sectionsToBody(title: string, sections: SpecSection[]): string {
    const lines: string[] = [];
    if (title) {
      lines.push(`# ${title}`, '');
    }
    for (const section of sections) {
      const hashes = '#'.repeat(section.level);
      lines.push(`${hashes} ${section.heading}`, '');
      if (section.content) {
        lines.push(section.content, '');
      }
    }
    return lines.join('\n');
  }

  /**
   * Parse markdown body into sections by heading.
   */
  parseSections(body: string): SpecSection[] {
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
}
