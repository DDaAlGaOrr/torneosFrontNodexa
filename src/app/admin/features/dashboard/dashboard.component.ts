import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DropdownModule } from 'primeng/dropdown';
import { Subscription, bufferTime, filter } from 'rxjs';
import { apiErrorMessage } from '../../../core/api/api-error';
import { DashboardApi, DashboardMatch, DashboardSummary } from '../../../core/api/dashboard.api';
import { MATCH_STATUS_LABELS, MATCH_STATUS_SEVERITY, MatchStatus } from '../../../core/api/matches.api';
import { LiveService } from '../../../core/live/live.service';
import { CRUD_UI } from '../../../core/ui/crud-ui';

/** Si el canal en vivo no está conectado, se refresca cada 30 s */
const FALLBACK_POLL_MS = 30000;
/** Cuánto dura el resaltado de un partido que acaba de cambiar */
const FLASH_MS = 2500;
/** Para no pedir el resumen en cada gol cuando llegan varios avisos juntos */
const DEBOUNCE_MS = 700;

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [CommonModule, FormsModule, RouterLink, ...CRUD_UI, DropdownModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['../../../styles/crud.scss', '../matches/matches.scss', './dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly api = inject(DashboardApi);
  private readonly router = inject(Router);
  readonly live = inject(LiveService);

  data = signal<DashboardSummary | null>(null);
  loading = signal(true);
  error = signal('');
  lastUpdate = signal<Date | null>(null);
  /** Partidos que acaban de cambiar (se resaltan un momento) */
  flashed = signal<Set<number>>(new Set());
  tournamentId: number | null = null;
  /** Valor del selector: 0 = todos (el dropdown de PrimeNG trata null como "sin selección") */
  selected = 0;

  tournamentOptions = computed(() => [
    { id: 0, name: 'Todos los torneos activos' },
    ...(this.data()?.tournaments ?? []).map((t) => ({ id: t.id, name: t.active ? t.name : `${t.name} (finalizado)` })),
  ]);

  /** Avance de partidos jugados del periodo */
  progress = computed(() => {
    const c = this.data()?.counters;
    return c && c.matches_total ? Math.round((c.matches_finished / c.matches_total) * 100) : 0;
  });

  maxGoalsPerRound = computed(() => Math.max(1, ...(this.data()?.featured?.goals_per_round ?? []).map((r) => r.goals)));

  private subs = new Subscription();
  private poller?: ReturnType<typeof setInterval>;
  private flashTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.load();
    this.live.connect();
    // Varios avisos seguidos (p. ej. gol + finalizar) se juntan en una sola recarga
    this.subs.add(
      this.live.changes$
        .pipe(bufferTime(DEBOUNCE_MS), filter((changes) => changes.length > 0))
        .subscribe((changes) => {
          const relevant = changes.filter((c) => !this.tournamentId || c.tournament_id === this.tournamentId);
          if (!relevant.length) return;
          this.flash(relevant.map((c) => c.match_id).filter((id): id is number => !!id));
          this.load(true);
        }),
    );
    this.poller = setInterval(() => {
      if (this.live.status() !== 'live') this.load(true);
    }, FALLBACK_POLL_MS);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.live.release();
    clearInterval(this.poller);
    clearTimeout(this.flashTimer);
  }

  load(silent = false): void {
    if (!silent) this.loading.set(true);
    this.api.summary(this.tournamentId).subscribe({
      next: (res) => {
        this.data.set(res.data);
        this.lastUpdate.set(new Date());
        this.error.set('');
        this.loading.set(false);
      },
      error: (err) => {
        if (!silent) this.error.set(apiErrorMessage(err, 'No se pudo cargar el Dashboard'));
        this.loading.set(false);
      },
    });
  }

  changeTournament(id: number): void {
    this.selected = id;
    this.tournamentId = id || null;
    this.load();
  }

  private flash(ids: number[]): void {
    if (!ids.length) return;
    this.flashed.set(new Set(ids));
    clearTimeout(this.flashTimer);
    this.flashTimer = setTimeout(() => this.flashed.set(new Set()), FLASH_MS);
  }

  openMatch(m: DashboardMatch): void {
    this.router.navigate(['/admin/torneos', m.tournament_id, 'partidos', m.id]);
  }

  // ── Presentación ──────────────────────────────────────────────────────────
  statusLabel(s: MatchStatus): string {
    return MATCH_STATUS_LABELS[s];
  }
  statusSeverity(s: MatchStatus): string | undefined {
    return MATCH_STATUS_SEVERITY[s];
  }
  time(local: string | null): string {
    return local ? local.slice(11, 16) : '—';
  }
  day(local: string | null): string {
    if (!local) return 'Sin fecha';
    const [y, m, d] = local.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short' });
  }
  winnerIs(m: DashboardMatch, side: 'home' | 'away'): boolean {
    const id = side === 'home' ? m.home_team_id : m.away_team_id;
    return m.status === 'finished' && m.winner_team_id !== null && m.winner_team_id === id;
  }
  liveLabel(): string {
    return { live: 'En vivo', connecting: 'Conectando…', offline: 'Reconectando…' }[this.live.status()];
  }
  trackMatch = (_: number, m: DashboardMatch) => m.id;
}
