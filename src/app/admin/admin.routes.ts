import { Routes } from '@angular/router';
import { authGuard } from './auth/auth/guard/auth.guard';
import { roleGuard } from '../core/guards/role.guard';
import { homeRedirectGuard } from '../core/guards/home-redirect.guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/admin-layout/admin-layout.component').then((m) => m.AdminLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', canActivate: [homeRedirectGuard], children: [] },

      // ── Partidos: captura de resultados (administrador y árbitro asignado) ──
      {
        path: 'mis-partidos',
        canActivate: [roleGuard],
        data: { title: 'Mis partidos', roles: ['referee', 'admin'] },
        loadComponent: () =>
          import('./features/matches/my-matches/my-matches.component').then((m) => m.MyMatchesComponent),
      },
      {
        path: 'torneos/:tournamentId/partidos',
        canActivate: [roleGuard],
        data: { title: 'Partidos del torneo', roles: ['admin'] },
        loadComponent: () =>
          import('./features/matches/tournament-matches/tournament-matches.component').then((m) => m.TournamentMatchesComponent),
      },
      {
        path: 'torneos/:tournamentId/calendario',
        canActivate: [roleGuard],
        data: { title: 'Calendario', roles: ['admin'] },
        loadComponent: () =>
          import('./features/matches/tournament-calendar/tournament-calendar.component').then((m) => m.TournamentCalendarComponent),
      },
      {
        path: 'torneos/:tournamentId/llaves',
        canActivate: [roleGuard],
        data: { title: 'Eliminatoria', roles: ['admin'] },
        loadComponent: () =>
          import('./features/matches/tournament-bracket/tournament-bracket.component').then((m) => m.TournamentBracketComponent),
      },
      {
        path: 'torneos/:tournamentId/partidos/:matchId',
        canActivate: [roleGuard],
        data: { title: 'Captura del partido', roles: ['admin', 'referee'] },
        loadComponent: () =>
          import('./features/matches/match-capture/match-capture.component').then((m) => m.MatchCaptureComponent),
      },

      // ── Liga: equipos y jugadores (solo administrador) — API nueva ─────────
      {
        path: 'equipos',
        canActivate: [roleGuard],
        data: { title: 'Equipos', roles: ['admin'] },
        loadComponent: () => import('./features/teams/teams.component').then((m) => m.TeamsComponent),
      },
      {
        path: 'torneos',
        canActivate: [roleGuard],
        data: { title: 'Torneos', roles: ['admin'] },
        loadComponent: () =>
          import('./features/tournaments/tournaments.component').then((m) => m.TournamentsComponent),
      },
      {
        path: 'equipos/:teamId/jugadores',
        canActivate: [roleGuard],
        data: { title: 'Jugadores', roles: ['admin'] },
        loadComponent: () =>
          import('./features/teams/team-players/team-players.component').then((m) => m.TeamPlayersComponent),
      },

      // ── Catálogos (solo administrador) — API nueva ─────────────────────────
      {
        path: 'categorias',
        canActivate: [roleGuard],
        data: { title: 'Categorías', roles: ['admin'] },
        loadComponent: () =>
          import('./features/catalogs/categories/categories.component').then((m) => m.CategoriesComponent),
      },
      {
        path: 'canchas',
        canActivate: [roleGuard],
        data: { title: 'Canchas', roles: ['admin'] },
        loadComponent: () => import('./features/catalogs/fields/fields.component').then((m) => m.FieldsComponent),
      },
      {
        path: 'usuarios',
        canActivate: [roleGuard],
        data: { title: 'Usuarios', roles: ['admin'] },
        loadComponent: () => import('./features/catalogs/users/users.component').then((m) => m.UsersComponent),
      },

      { path: '**', redirectTo: '' },
    ],
  },
];
