import { type Routes } from '@angular/router';
import { ShellComponent } from './components/shell/shell';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./components/welcome/welcome').then((m) => m.WelcomeComponent),
      },
      {
        path: 'edit/:id',
        loadComponent: () =>
          import('./pages/editor/editor-page').then((m) => m.EditorPageComponent),
      },
    ],
  },
];
