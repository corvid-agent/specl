import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});

describe('Routes', () => {
  const shellRoute = routes[0];
  const childRoutes = shellRoute.children!;

  it('should have a wildcard route that redirects to root', () => {
    const wildcard = childRoutes.find((r) => r.path === '**');
    expect(wildcard).toBeDefined();
    expect(wildcard!.redirectTo).toBe('');
  });

  it('should place the wildcard route last', () => {
    const last = childRoutes[childRoutes.length - 1];
    expect(last.path).toBe('**');
  });
});
