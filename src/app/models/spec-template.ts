import { type SpecFrontmatter } from './spec.model';

/**
 * Generates markdown body from a template matching the corvid-agent spec format.
 */
export function generateSpecTemplate(fm: SpecFrontmatter): string {
  const lines: string[] = [];

  lines.push(`# ${fm.module}`);
  lines.push('');
  lines.push('## Purpose');
  lines.push('');
  lines.push('_Describe what this module does and why it exists._');
  lines.push('');
  lines.push('## Public API');
  lines.push('');
  lines.push('### Exported Functions');
  lines.push('');
  lines.push('| Function | Parameters | Returns | Description |');
  lines.push('|----------|-----------|---------|-------------|');
  lines.push('| `example` | `()` | `void` | _Description_ |');
  lines.push('');
  lines.push('### Exported Types');
  lines.push('');
  lines.push('| Type | Description |');
  lines.push('|------|-------------|');
  lines.push('| `ExampleType` | _Description_ |');
  lines.push('');
  lines.push('### Exported Classes');
  lines.push('');
  lines.push('| Class | Description |');
  lines.push('|-------|-------------|');
  lines.push('');
  lines.push('## Invariants');
  lines.push('');
  lines.push('1. _First invariant that must always hold_');
  lines.push('');
  lines.push('## Behavioral Examples');
  lines.push('');
  lines.push('### Scenario: Basic usage');
  lines.push('- **Given** _precondition_');
  lines.push('- **When** _action_');
  lines.push('- **Then** _expected result_');
  lines.push('');
  lines.push('## Error Cases');
  lines.push('');
  lines.push('| Condition | Behavior |');
  lines.push('|-----------|----------|');
  lines.push('| _Error condition_ | _What happens_ |');
  lines.push('');
  lines.push('## Dependencies');
  lines.push('');
  lines.push('### Consumes');
  lines.push('');
  lines.push('| Module | What is used |');
  lines.push('|--------|-------------|');
  lines.push('');
  lines.push('### Consumed By');
  lines.push('');
  lines.push('| Module | What is used |');
  lines.push('|--------|-------------|');
  lines.push('');
  lines.push('## Change Log');
  lines.push('');
  lines.push('| Date | Author | Change |');
  lines.push('|------|--------|--------|');
  lines.push(`| ${new Date().toISOString().split('T')[0]} | — | Initial spec |`);
  lines.push('');

  return lines.join('\n');
}
