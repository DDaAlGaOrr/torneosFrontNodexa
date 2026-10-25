import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DropdownModule } from 'primeng/dropdown';
import { apiErrorMessage } from '../../../../core/api/api-error';
import { MATCH_STATUS_LABELS, MATCH_STATUS_SEVERITY, MatchStatus } from '../../../../core/api/matches.api';
import { CoachTeam, MeApi, TeamOverview } from '../../../../core/api/me.api';
import { CRUD_UI } from '../../../../core/ui/crud-ui';

const RESULT: Record<'G' | 'E' | 'P', { label: string; css: string }> = {
  G: { label: 'G', css: 'res--win' },
  E: { label: 'E', css: 'res--draw' },
  P: { label: 'P', css: 'res--loss' },
};

/** Panel del entrenador: su equipo, posición en cada torneo, próximos partidos, resultados y sancionados. */
@Component({
  standalone: true,
  selector: 'app-my-team',
  imports: [CommonModule, FormsModule, RouterLink, ...CRUD_UI, DropdownModule],
  templateUrl: './my-team.component.html',
  styleUrls: ['../../../../styles/crud.scss', '../../matches/matches.scss', './my-team.component.scss'],
})
export class MyTeamComponent implements OnInit {
  private readonly api = inject(MeApi);

  teams = signal<CoachTeam[]>([]);
  teamId: number | null = null;
  overview = signal<TeamOverview | null>(null);
  loading = signal(true);
  error = signal('');
  readonly result = RESULT;

  ngOnInit(): void {
    this.api.teams().subscribe({
      next: (res) => {
        this.teams.set(res.data);
        this.loading.set(false);
        if (res.data.length) this.selectTeam(res.data[0].id);
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'No se pudieron cargar tus equipos'));
        this.loading.set(false);
      },
    });
  }

  selectTeam(id: number): void {
    this.teamId = id;
    this.overview.set(null);
    this.api.overview(id).subscribe({
      next: (res) => this.overview.set(res.data),
      error: (err) => this.error.set(apiErrorMessage(err, 'No se pudo cargar el resumen del equipo')),
    });
  }

  statusLabel(s: MatchStatus): string {
    return MATCH_STATUS_LABELS[s];
  }
  statusSeverity(s: MatchStatus): string | undefined {
    return MATCH_STATUS_SEVERITY[s];
  }
  formatLocal(local: string | null): string {
    if (!local) return 'Sin fecha';
    const [y, m, d] = local.slice(0, 10).split('-').map(Number);
    const day = new Date(y, m - 1, d).toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short' });
    return `${day} · ${local.slice(11, 16)}`;
  }
  ordinal(n: number | null): string {
    return n === null ? '—' : `${n}º`;
  }
}
