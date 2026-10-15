import { Routes } from '@angular/router';
import { authGuard, sportGuard } from './auth/auth/guard/auth.guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'soccer/teams',
        pathMatch: 'full',
      },
      {
        path: ':sport',
        children: [
          { path: '', redirectTo: 'teams', pathMatch: 'full' },
          {
            path: 'teams',
            loadComponent: () =>
              import('./features/sports/teams/team-form.component').then(m => m.TeamFormComponent),
          },
            // {
            //   path: 'matches/:id',
            //   loadComponent: () =>
            //     import('./features/sports/matches/match-form/match-form.component').then(m => m.MatchFormComponent),
            // },
          {
            path: 'tournaments',
            loadComponent: () =>
              import('./features/sports/tournaments/tournaments-form.component').then(m => m.TournamentsFormComponent),
          },
        ],
      },
      {
        path: '**',
        redirectTo: 'soccer/teams',
      },
    ],
  },
];
