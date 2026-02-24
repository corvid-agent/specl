import { Component, input, output, computed } from '@angular/core';
import { type SpecSection } from '../../models/spec.model';

export type NavItem = { type: 'frontmatter'; label: string } | { type: 'section'; index: number; label: string; level: number };

@Component({
  selector: 'app-section-nav',
  standalone: true,
  templateUrl: './section-nav.html',
  styleUrl: './section-nav.scss',
})
export class SectionNavComponent {
  readonly sections = input.required<SpecSection[]>();
  readonly activeIndex = input.required<number>(); // -1 = frontmatter
  readonly selectIndex = output<number>();

  protected readonly navItems = computed<NavItem[]>(() => {
    const items: NavItem[] = [{ type: 'frontmatter', label: 'Frontmatter' }];
    for (let i = 0; i < this.sections().length; i++) {
      const s = this.sections()[i];
      items.push({ type: 'section', index: i, label: s.heading, level: s.level });
    }
    return items;
  });

  protected onSelect(index: number): void {
    this.selectIndex.emit(index);
  }

  protected isActive(item: NavItem): boolean {
    if (item.type === 'frontmatter') return this.activeIndex() === -1;
    return this.activeIndex() === item.index;
  }
}
