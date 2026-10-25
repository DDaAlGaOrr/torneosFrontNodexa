import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, inject, signal } from '@angular/core';
import { SharedModule } from 'primeng/api';
import { SidebarModule } from 'primeng/sidebar';
import { TagModule } from 'primeng/tag';
import { apiErrorMessage } from '../../../../core/api/api-error';
import { PlayerStatsDetail, SANCTION_STATUS, StatsApi } from '../../../../core/api/stats.api';

const EVENT_LABEL: Record<string, { icon: string; label: string }> = {
  goal: { icon: '⚽', label: 'Gol' },
  own_goal: { icon: '⚽', label: 'Autogol' },
  yellow_card: { icon: '🟨', label: 'Amarilla' },
  red_card: { icon: '🟥', label: 'Roja' },
};

/** Panel lateral con la ficha del jugador: totales, por torneo, cronología de goles/tarjetas y sanciones. */
@Component({
  standalone: true,
  selector: 'app-player-detail',
  imports: [CommonModule, SharedModule, SidebarModule, TagModule],
  templateUrl: './player-detail.component.html',
  styleUrls: ['./player-detail.component.scss'],
})
export class PlayerDetailComponent implements OnChanges {
  /** null = cerrado */
  @Input() playerId: number | null = null;
  @Output() closed = new EventEmitter<void>();

  private readonly api = inject(StatsApi);

  data = signal<PlayerStatsDetail | null>(null);
  loading = signal(false);
  error = signal('');
  visible = false;
  readonly sanctionStatus = SANCTION_STATUS;

  ngOnChanges(): void {
    this.visible = this.playerId !== null;
    if (this.playerId === null) return;
    this.loading.set(true);
    this.error.set('');
    this.data.set(null);
    this.api.player(this.playerId).subscribe({
      next: (res) => {
        this.data.set(res.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'No se pudo cargar la ficha'));
        this.loading.set(false);
      },
    });
  }

  onVisibleChange(v: boolean): void {
    if (!v) this.closed.emit();
  }

  eventIcon(e: PlayerStatsDetail['events'][number]): string {
    return e.as_assist ? '🅰️' : EVENT_LABEL[e.event_type]?.icon ?? '';
  }
  eventLabel(e: PlayerStatsDetail['events'][number]): string {
    return e.as_assist ? 'Asistencia' : EVENT_LABEL[e.event_type]?.label ?? e.event_type;
  }
  formatDay(local: string | null): string {
    if (!local) return '';
    const [y, m, d] = local.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
  }
}
