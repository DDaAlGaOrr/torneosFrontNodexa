import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, computed, inject, numberAttribute, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { TabViewModule } from 'primeng/tabview';
import { forkJoin } from 'rxjs';
import { apiErrorMessage } from '../../../../core/api/api-error';
import {
  GoalkeeperRow,
  PlayerStatRow,
  SANCTION_STATUS,
  Sanction,
  StatsApi,
  TeamStatRow,
} from '../../../../core/api/stats.api';
import { Tournament, TournamentsApi } from '../../../../core/api/tournaments.api';
import { CRUD_UI } from '../../../../core/ui/crud-ui';
import { PlayerDetailComponent } from '../../teams/player-detail/player-detail.component';

/** Estadísticas del torneo: goleadores, asistencias, porteros, equipos, fair play y sanciones. */
@Component({
  standalone: true,
  selector: 'app-tournament-stats',
  imports: [CommonModule, RouterLink, ...CRUD_UI, TabViewModule, PlayerDetailComponent],
  providers: [MessageService, ConfirmationService],
  templateUrl: './tournament-stats.component.html',
  styleUrls: ['../../../../styles/crud.scss', '../matches.scss', './tournament-stats.component.scss'],
})
export class TournamentStatsComponent implements OnInit {
  /** Llega desde la ruta /admin/torneos/:tournamentId/estadisticas */
  @Input({ transform: numberAttribute }) tournamentId!: number;

  private readonly api = inject(StatsApi);
  private readonly tournamentsApi = inject(TournamentsApi);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  tournament = signal<Tournament | null>(null);
  scorers = signal<PlayerStatRow[]>([]);
  assists = signal<PlayerStatRow[]>([]);
  fairPlayPlayers = signal<PlayerStatRow[]>([]);
  teams = signal<TeamStatRow[]>([]);
  keepers = signal<GoalkeeperRow[]>([]);
  sanctions = signal<Sanction[]>([]);
  loading = signal(true);
  error = signal('');
  busyId = signal<number | null>(null);
  detailPlayerId: number | null = null;
  readonly sanctionStatus = SANCTION_STATUS;

  /** Equipo más goleador y menos goleado (solo equipos que ya jugaron) */
  highlights = computed(() => {
    const played = this.teams().filter((t) => t.PJ > 0);
    if (!played.length) return null;
    const most = [...played].sort((a, b) => b.GF - a.GF || b.DG - a.DG)[0];
    const least = [...played].sort((a, b) => a.GC - b.GC || b.DG - a.DG)[0];
    const fair = [...played].sort((a, b) => a.fair_play - b.fair_play || a.red_cards - b.red_cards)[0];
    return { most, least, fair, top: this.scorers()[0] ?? null };
  });
  teamsByFairPlay = computed(() => [...this.teams()].sort((a, b) => a.fair_play - b.fair_play || a.team_name.localeCompare(b.team_name, 'es')));
  pendingCount = computed(() => this.sanctions().filter((s) => s.status === 'pending').length);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    forkJoin({
      tournaments: this.tournamentsApi.list(),
      scorers: this.api.topScorers(this.tournamentId),
      assists: this.api.assists(this.tournamentId),
      fair: this.api.fairPlay(this.tournamentId),
      teams: this.api.teams(this.tournamentId),
      keepers: this.api.goalkeepers(this.tournamentId),
      sanctions: this.api.sanctions(this.tournamentId),
    }).subscribe({
      next: (r) => {
        this.tournament.set(r.tournaments.data.find((t) => t.id === this.tournamentId) ?? null);
        this.scorers.set(r.scorers.data);
        this.assists.set(r.assists.data);
        this.fairPlayPlayers.set(r.fair.data);
        this.teams.set(r.teams.data);
        this.keepers.set(r.keepers.data);
        this.sanctions.set(r.sanctions.data);
        this.error.set('');
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'No se pudieron cargar las estadísticas'));
        this.loading.set(false);
      },
    });
  }

  /** Posición con empates: mismo valor = misma posición */
  rank(list: { [k: string]: any }[], index: number, field: string): number {
    let i = index;
    while (i > 0 && list[i - 1][field] === list[index][field]) i--;
    return i + 1;
  }

  appeal(s: Sanction): void {
    const appealing = s.status !== 'appealed';
    this.confirm.confirm({
      header: appealing ? 'Apelar sanción' : 'Quitar apelación',
      message: appealing
        ? `¿Marcar como apelada la sanción de ${s.player_name}? Mientras esté apelada, el jugador puede jugar.`
        : `¿Quitar la apelación de ${s.player_name}? La sanción vuelve a contar (si ya pasaron sus partidos, queda cumplida).`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: appealing ? 'Apelar' : 'Quitar apelación',
      rejectLabel: 'Cancelar',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.busyId.set(s.id);
        this.api.setSanctionStatus(s.id, appealing ? 'appealed' : 'pending').subscribe({
          next: (res) => {
            this.busyId.set(null);
            this.toast.add({ severity: 'success', summary: res.data.message });
            this.api.sanctions(this.tournamentId).subscribe((r) => this.sanctions.set(r.data));
          },
          error: (err) => {
            this.busyId.set(null);
            this.toast.add({ severity: 'error', summary: 'No se pudo actualizar', detail: apiErrorMessage(err) });
          },
        });
      },
    });
  }
}
