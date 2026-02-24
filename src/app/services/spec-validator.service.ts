import { Injectable } from '@angular/core';
import {
  type Spec,
  type ValidationResult,
  type ValidationError,
  REQUIRED_SECTIONS,
} from '../models/spec.model';

@Injectable({ providedIn: 'root' })
export class SpecValidatorService {
  /**
   * Validate a spec. When knownModules is provided, also checks that
   * depends_on entries reference existing specs.
   */
  validate(spec: Spec, knownModules?: string[]): ValidationResult {
    const errors: ValidationError[] = [];

    this.validateFrontmatter(spec, errors);
    this.validateSections(spec, errors);
    if (knownModules) {
      this.validateDependencyRefs(spec, knownModules, errors);
    }

    return {
      valid: errors.every((e) => e.level === 'warning'),
      errors,
    };
  }

  private validateFrontmatter(spec: Spec, errors: ValidationError[]): void {
    const fm = spec.frontmatter;

    if (!fm.module || fm.module.trim() === '') {
      errors.push({ level: 'error', field: 'module', message: 'Module name is required' });
    }

    if (!fm.version || fm.version < 1) {
      errors.push({ level: 'error', field: 'version', message: 'Version must be a positive number' });
    }

    if (!fm.status || !['draft', 'active'].includes(fm.status)) {
      errors.push({ level: 'error', field: 'status', message: 'Status must be "draft" or "active"' });
    }

    if (!fm.files || fm.files.length === 0) {
      errors.push({ level: 'error', field: 'files', message: 'At least one file is required' });
    }

    for (const file of fm.files) {
      if (!file || file.trim() === '') {
        errors.push({ level: 'error', field: 'files', message: 'File paths must not be empty' });
      }
    }
  }

  private validateDependencyRefs(
    spec: Spec,
    knownModules: string[],
    errors: ValidationError[],
  ): void {
    const known = new Set(knownModules);
    for (const dep of spec.frontmatter.depends_on) {
      if (!known.has(dep)) {
        errors.push({
          level: 'warning',
          field: 'depends_on',
          message: `Dependency "${dep}" does not match any known spec module`,
        });
      }
    }
  }

  private validateSections(spec: Spec, errors: ValidationError[]): void {
    const sectionHeadings = new Set(
      spec.sections.filter((s) => s.level === 2).map((s) => s.heading)
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
    const sections = spec.sections;
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      if (section.level === 2 && (!section.content || section.content.trim() === '')) {
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
  }
}
