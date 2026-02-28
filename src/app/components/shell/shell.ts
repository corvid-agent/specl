import { Component, signal, computed, inject, effect, ElementRef, HostListener, ViewChild } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { SpecListComponent } from '../spec-list/spec-list';
import { filter } from 'rxjs';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, SpecListComponent],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class ShellComponent {
  private readonly router = inject(Router);

  /** Whether the mobile sidebar is visible */
  readonly sidebarOpen = signal(true);

  /** Track mobile breakpoint for dialog semantics */
  readonly isMobile = signal(window.innerWidth < 768);

  /** Sidebar acts as a dialog on mobile when open */
  readonly isDialog = computed(() => this.isMobile() && this.sidebarOpen());

  @ViewChild('sidebar') private sidebarRef?: ElementRef<HTMLElement>;

  /** Element that had focus before sidebar opened (for focus restoration) */
  private previousFocus: HTMLElement | null = null;

  constructor() {
    // Auto-close sidebar on navigation (mobile: user selected a spec)
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => {
        if (window.innerWidth < 768) {
          this.sidebarOpen.set(false);
        }
      });

    // Manage focus when sidebar opens/closes on mobile
    effect(() => {
      const open = this.sidebarOpen();
      const mobile = this.isMobile();
      if (mobile && open) {
        this.previousFocus = document.activeElement as HTMLElement | null;
        // Move focus into sidebar after Angular renders
        queueMicrotask(() => {
          const closeBtn = this.sidebarRef?.nativeElement.querySelector<HTMLElement>('.sidebar-close');
          closeBtn?.focus();
        });
      } else if (this.previousFocus) {
        this.previousFocus.focus();
        this.previousFocus = null;
      }
    });
  }

  @HostListener('window:resize')
  onResize(): void {
    this.isMobile.set(window.innerWidth < 768);
  }

  @HostListener('keydown.escape')
  onEscape(): void {
    if (this.isDialog()) {
      this.sidebarOpen.set(false);
    }
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }
}
