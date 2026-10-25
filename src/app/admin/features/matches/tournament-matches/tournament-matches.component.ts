import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, computed, inject, numberAttribute, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DropdownModule } from 'primeng/dropdown';
import { forkJoin } from 'rxjs';
import { apiErrorMessage } from '../../../../core/api/api-error';
import {
  MATCH_STATUS_LABELS,
  MATCH_STATUS_SEVERITY,
  MatchRow,
  MatchStatus,
  MatchesApi,
} from '../../../../core/api/matches.api';
import { Tournament, TournamentsApi } from '../../../../core/api/tournaments.api';
import { CRUD_UI } from '../../../../core/ui/crud-ui';

@Component({
  standalone: true,
  selector: 'app-tournament-matches',
  imports: [CommonModule, FormsModule, RouterLink, ...CRUD_UI, DropdownModule],
  templateUrl: './tournament-matches.component.html',
  styleUrls: ['../../../../styles/crud.scss', '../matches.scss'],
})
export class TournamentMatchesComponent implements OnInit {
  /** Llega desde la ruta /admin/torneos/:tournamentId/partidos */
  @Input({ transform: numberAttribute }) tournamentId!: number;

  private readonly matchesApi = inject(MatchesApi);
  private readonly tournamentsApi = inject(TournamentsApi);

  tournament = signal<Tournament | null>(null);
  items = signal<MatchRow[]>([]);
  loading = signal(true);
  error = signal('');
  statusFilter: MatchStatus | null = null;

  readonly statusOptions = (Object.keys(MATCH_STATUS_LABELS) as MatchStatus[]).map((value) => ({
    value,
    label: MATCH_STATUS_LABELS[value],
  }));

  counts = computed(() => {
    const all = this.items();
    return {
      total: all.length,
      finished: all.filter((m) => m.status === 'finished').length,
      live: all.filter((m) => m.status === 'in_progress').length,
    };
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    forkJoin({
      tournaments: this.tournamentsApi.list(),
      matches: this.matchesApi.listByTournament(this.tournamentId),
    }).subscribe({
      next: (res) => {
        this.tournament.set(res.tournaments.data.find((t) => t.id === this.tournamentId) ?? null);
        this.items.set(res.matches.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'No se pudieron cargar los partidos'));
        this.loading.set(false);
      },
    });
  }

  filtered(): MatchRow[] {
    return this.statusFilter ? this.items().filter((m) => m.status === this.statusFilter) : this.items();
  }

  statusLabel(s: MatchStatus): string {
    return MATCH_STATUS_LABELS[s];
  }
  statusSeverity(s: MatchStatus): string | undefined {
    return MATCH_STATUS_SEVERITY[s];
  }
}
