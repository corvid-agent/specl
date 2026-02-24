import { Component, signal, inject } from '@angular/core';
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

  constructor() {
    // Auto-close sidebar on navigation (mobile: user selected a spec)
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => {
        if (window.innerWidth < 768) {
          this.sidebarOpen.set(false);
        }
      });
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }
}
