import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../../../core/api/api-error';
import { AssignedMatch, MATCH_STATUS_LABELS, MATCH_STATUS_SEVERITY, MatchStatus, MatchesApi } from '../../../../core/api/matches.api';
import { CRUD_UI } from '../../../../core/ui/crud-ui';

/** Partidos asignados al árbitro que inició sesión. */
@Component({
  standalone: true,
  selector: 'app-my-matches',
  imports: [CommonModule, RouterLink, ...CRUD_UI],
  templateUrl: './my-matches.component.html',
  styleUrls: ['../../../../styles/crud.scss', '../matches.scss'],
})
export class MyMatchesComponent implements OnInit {
  private readonly api = inject(MatchesApi);

  items = signal<AssignedMatch[]>([]);
  loading = signal(true);
  error = signal('');

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.assigned().subscribe({
      next: (res) => {
        this.items.set(res.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'No se pudieron cargar tus partidos'));
        this.loading.set(false);
      },
    });
  }

  statusLabel(s: MatchStatus): string {
    return MATCH_STATUS_LABELS[s];
  }
  statusSeverity(s: MatchStatus): string | undefined {
    return MATCH_STATUS_SEVERITY[s];
  }
}
