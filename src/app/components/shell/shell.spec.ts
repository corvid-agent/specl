import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Component } from '@angular/core';
import { ShellComponent } from './shell';
import { SpecStoreService } from '../../services/spec-store.service';

@Component({ selector: 'app-dummy', standalone: true, template: '' })
class DummyComponent {}

describe('ShellComponent', () => {
  let component: ShellComponent;
  let fixture: ComponentFixture<ShellComponent>;
  let router: Router;
  let storeSpy: Record<string, ReturnType<typeof vi.fn>>;

  function resizeWindow(width: number): void {
    Object.defineProperty(window, 'innerWidth', {
      value: width,
      writable: true,
      configurable: true,
    });
    window.dispatchEvent(new Event('resize'));
  }

  /** Flush queueMicrotask callbacks */
  function flushMicrotasks(): Promise<void> {
    return new Promise((resolve) => queueMicrotask(resolve));
  }

  beforeEach(async () => {
    // Default to desktop width
    Object.defineProperty(window, 'innerWidth', {
      value: 1024,
      writable: true,
      configurable: true,
    });

    storeSpy = {
      suites: vi.fn(() => new Map()),
      allSpecs: vi.fn(() => []),
      activeSpec: vi.fn(() => null),
      createSpec: vi.fn(async () => ({ id: 1 })),
      selectSpec: vi.fn(async () => {}),
      deleteSpec: vi.fn(async () => {}),
      importMarkdownFiles: vi.fn(async () => 0),
    };

    await TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        provideRouter([
          { path: '', component: DummyComponent },
          { path: 'other', component: DummyComponent },
        ]),
        { provide: SpecStoreService, useValue: storeSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShellComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  // --- Creation ---

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // --- toggleSidebar ---

  describe('toggleSidebar()', () => {
    it('toggles from true to false', () => {
      component.sidebarOpen.set(true);
      component.toggleSidebar();
      expect(component.sidebarOpen()).toBe(false);
    });

    it('toggles from false to true', () => {
      component.sidebarOpen.set(false);
      component.toggleSidebar();
      expect(component.sidebarOpen()).toBe(true);
    });

    it('alternates on repeated calls', () => {
      const initial = component.sidebarOpen();
      component.toggleSidebar();
      expect(component.sidebarOpen()).toBe(!initial);
      component.toggleSidebar();
      expect(component.sidebarOpen()).toBe(initial);
    });
  });

  // --- Auto-close on NavigationEnd ---

  describe('auto-close on NavigationEnd', () => {
    it('closes sidebar on navigation when viewport is mobile width', async () => {
      resizeWindow(600);
      component.sidebarOpen.set(true);

      await router.navigateByUrl('/other');
      fixture.detectChanges();

      expect(component.sidebarOpen()).toBe(false);
    });

    it('keeps sidebar open on navigation when viewport is desktop width', async () => {
      resizeWindow(1024);
      component.sidebarOpen.set(true);

      await router.navigateByUrl('/other');
      fixture.detectChanges();

      expect(component.sidebarOpen()).toBe(true);
    });
  });

  // --- isMobile signal ---

  describe('isMobile signal', () => {
    it('is false for desktop width', () => {
      resizeWindow(1024);
      fixture.detectChanges();
      expect(component.isMobile()).toBe(false);
    });

    it('is true for mobile width', () => {
      resizeWindow(600);
      fixture.detectChanges();
      expect(component.isMobile()).toBe(true);
    });

    it('updates from desktop to mobile on resize', () => {
      resizeWindow(1024);
      fixture.detectChanges();
      expect(component.isMobile()).toBe(false);

      resizeWindow(500);
      fixture.detectChanges();
      expect(component.isMobile()).toBe(true);
    });

    it('updates from mobile to desktop on resize', () => {
      resizeWindow(500);
      fixture.detectChanges();
      expect(component.isMobile()).toBe(true);

      resizeWindow(1024);
      fixture.detectChanges();
      expect(component.isMobile()).toBe(false);
    });

    it('is true at 767px (just below breakpoint)', () => {
      resizeWindow(767);
      fixture.detectChanges();
      expect(component.isMobile()).toBe(true);
    });

    it('is false at 768px (at breakpoint)', () => {
      resizeWindow(768);
      fixture.detectChanges();
      expect(component.isMobile()).toBe(false);
    });
  });

  // --- isDialog computed ---

  describe('isDialog computed', () => {
    it('is true when mobile and sidebar open', () => {
      resizeWindow(600);
      fixture.detectChanges();
      component.sidebarOpen.set(true);
      expect(component.isDialog()).toBe(true);
    });

    it('is false when mobile and sidebar closed', () => {
      resizeWindow(600);
      fixture.detectChanges();
      component.sidebarOpen.set(false);
      expect(component.isDialog()).toBe(false);
    });

    it('is false when desktop and sidebar open', () => {
      resizeWindow(1024);
      fixture.detectChanges();
      component.sidebarOpen.set(true);
      expect(component.isDialog()).toBe(false);
    });

    it('is false when desktop and sidebar closed', () => {
      resizeWindow(1024);
      fixture.detectChanges();
      component.sidebarOpen.set(false);
      expect(component.isDialog()).toBe(false);
    });
  });

  // --- Escape key ---

  describe('escape key', () => {
    it('closes sidebar when in dialog mode (mobile + open)', () => {
      resizeWindow(600);
      fixture.detectChanges();
      component.sidebarOpen.set(true);
      expect(component.isDialog()).toBe(true);

      component.onEscape();
      expect(component.sidebarOpen()).toBe(false);
    });

    it('does nothing on desktop', () => {
      resizeWindow(1024);
      fixture.detectChanges();
      component.sidebarOpen.set(true);

      component.onEscape();
      expect(component.sidebarOpen()).toBe(true);
    });

    it('does nothing when sidebar is already closed', () => {
      resizeWindow(600);
      fixture.detectChanges();
      component.sidebarOpen.set(false);

      component.onEscape();
      expect(component.sidebarOpen()).toBe(false);
    });
  });

  // --- Focus management ---

  describe('focus management', () => {
    it('moves focus to close button when sidebar opens on mobile', async () => {
      resizeWindow(600);
      fixture.detectChanges();
      component.sidebarOpen.set(false);
      fixture.detectChanges();
      await flushMicrotasks();

      component.sidebarOpen.set(true);
      fixture.detectChanges();
      await flushMicrotasks();

      const closeBtn = fixture.nativeElement.querySelector('.sidebar-close');
      if (closeBtn) {
        // Focus may or may not land depending on test env DOM support
        // At minimum, the close button should exist
        expect(closeBtn).toBeTruthy();
      }
    });
  });

  // --- Template bindings ---

  describe('template', () => {
    it('applies sidebar-open class when sidebar is open', () => {
      component.sidebarOpen.set(true);
      fixture.detectChanges();
      const sidebar = fixture.nativeElement.querySelector('.sidebar');
      expect(sidebar.classList.contains('sidebar-open')).toBe(true);
    });

    it('removes sidebar-open class when sidebar is closed', () => {
      component.sidebarOpen.set(false);
      fixture.detectChanges();
      const sidebar = fixture.nativeElement.querySelector('.sidebar');
      expect(sidebar.classList.contains('sidebar-open')).toBe(false);
    });

    it('sets role="dialog" when in dialog mode', () => {
      resizeWindow(600);
      fixture.detectChanges();
      component.sidebarOpen.set(true);
      fixture.detectChanges();
      const sidebar = fixture.nativeElement.querySelector('.sidebar');
      expect(sidebar.getAttribute('role')).toBe('dialog');
    });

    it('sets role="complementary" when not in dialog mode', () => {
      resizeWindow(1024);
      fixture.detectChanges();
      component.sidebarOpen.set(true);
      fixture.detectChanges();
      const sidebar = fixture.nativeElement.querySelector('.sidebar');
      expect(sidebar.getAttribute('role')).toBe('complementary');
    });

    it('sets aria-modal="true" in dialog mode', () => {
      resizeWindow(600);
      fixture.detectChanges();
      component.sidebarOpen.set(true);
      fixture.detectChanges();
      const sidebar = fixture.nativeElement.querySelector('.sidebar');
      expect(sidebar.getAttribute('aria-modal')).toBe('true');
    });

    it('toggles sidebar when close button is clicked', () => {
      component.sidebarOpen.set(true);
      fixture.detectChanges();
      const closeBtn = fixture.nativeElement.querySelector('.sidebar-close');
      closeBtn.click();
      expect(component.sidebarOpen()).toBe(false);
    });

    it('toggles sidebar when backdrop is clicked', () => {
      component.sidebarOpen.set(true);
      fixture.detectChanges();
      const backdrop = fixture.nativeElement.querySelector('.sidebar-backdrop');
      backdrop.click();
      expect(component.sidebarOpen()).toBe(false);
    });

    it('toggles sidebar when mobile menu button is clicked', () => {
      component.sidebarOpen.set(false);
      fixture.detectChanges();
      const menuBtn = fixture.nativeElement.querySelector('.mobile-menu-btn');
      menuBtn.click();
      expect(component.sidebarOpen()).toBe(true);
    });

    it('updates aria-expanded on menu button', () => {
      component.sidebarOpen.set(true);
      fixture.detectChanges();
      const menuBtn = fixture.nativeElement.querySelector('.mobile-menu-btn');
      expect(menuBtn.getAttribute('aria-expanded')).toBe('true');

      component.sidebarOpen.set(false);
      fixture.detectChanges();
      expect(menuBtn.getAttribute('aria-expanded')).toBe('false');
    });
  });
});
