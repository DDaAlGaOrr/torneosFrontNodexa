import { Routes } from '@angular/router';

export const END_USER_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'soccer',
    pathMatch: 'full'
  },
  {
    path: ':sport',
    loadComponent: () =>
      import('./features/matches/components/matches-shell/matches-shell.component')
        .then(m => m.MatchesShellComponent)
  }
];
