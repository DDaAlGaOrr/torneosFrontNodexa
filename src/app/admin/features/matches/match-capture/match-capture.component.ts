import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit, computed, inject, numberAttribute, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { Observable } from 'rxjs';
import { AuthService } from '../../../auth/auth/service/auth.service';
import { apiErrorMessage } from '../../../../core/api/api-error';
import {
  EventType,
  MATCH_STATUS_LABELS,
  MATCH_STATUS_SEVERITY,
  MatchDetail,
  MatchEvent,
  MatchesApi,
  RosterPlayer,
} from '../../../../core/api/matches.api';
import { CRUD_UI } from '../../../../core/ui/crud-ui';

type Side = 'home' | 'away';
/** Incidencias que se capturan desde el diálogo */
type CaptureType = 'goal' | 'own_goal' | 'yellow_card' | 'red_card';

const EVENT_META: Record<EventType, { icon: string; label: string }> = {
  goal: { icon: '⚽', label: 'Gol' },
  own_goal: { icon: '⚽', label: 'Autogol' },
  yellow_card: { icon: '🟨', label: 'Amarilla' },
  red_card: { icon: '🟥', label: 'Roja' },
  substitution: { icon: '🔁', label: 'Cambio' },
  foul: { icon: '⚠️', label: 'Falta' },
};

/** Cada cuánto se refresca la ficha mientras el partido está en juego (otro árbitro puede estar capturando). */
const POLL_MS = 15000;

@Component({
  standalone: true,
  selector: 'app-match-capture',
  imports: [CommonModule, FormsModule, RouterLink, ...CRUD_UI, DropdownModule, InputNumberModule],
  providers: [MessageService, ConfirmationService],
  templateUrl: './match-capture.component.html',
  styleUrls: ['../../../../styles/crud.scss', '../matches.scss', './match-capture.component.scss'],
})
export class MatchCaptureComponent implements OnInit, OnDestroy {
  /** Llegan desde la ruta /admin/torneos/:tournamentId/partidos/:matchId */
  @Input({ transform: numberAttribute }) tournamentId!: number;
  @Input({ transform: numberAttribute }) matchId!: number;

  private readonly api = inject(MatchesApi);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  readonly isAdmin = this.auth.hasRole('admin');
  readonly eventMeta = EVENT_META;

  detail = signal<MatchDetail | null>(null);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  /** Reloj para el minuto transcurrido y los descansos por amarilla */
  now = signal(Date.now());
  // ── Diálogo de incidencia (gol, autogol, tarjetas) ─────────────────────────
  eventVisible = false;
  eventType = signal<CaptureType>('goal');
  eventSide = signal<Side>('home');
  eventPlayerId = signal<number | null>(null);
  eventAssistId: number | null = null;
  /** Minuto de la incidencia; se propone el minuto transcurrido y es obligatorio */
  eventMinute: number | null = null;

  // Opciones memorizadas: si se recalcularan en cada ciclo (el reloj corre cada segundo),
  // el dropdown se volvería a pintar y no dejaría seleccionar.
  playerOptions = computed(() => {
    const isCard = this.eventType() === 'yellow_card' || this.eventType() === 'red_card';
    return this.toOptions(this.players(this.eventSide()).filter((p) => !isCard || !this.isExpelled(p)));
  });
  assistOptions = computed(() => this.toOptions(this.players(this.eventSide()).filter((p) => p.id !== this.eventPlayerId())));
  /** La amarilla que se va a registrar sería la segunda del jugador (expulsión) */
  secondYellow = computed(() => {
    const id = this.eventPlayerId();
    const p = this.players(this.eventSide()).find((x) => x.id === id);
    return this.eventType() === 'yellow_card' && !!p && this.cardsInMatch(p, 'yellow_card') === 1;
  });
  /** Las tarjetas siempre son de un jugador; goles y autogoles pueden quedar sin identificar */
  eventInvalid = computed(() => {
    const isCard = this.eventType() === 'yellow_card' || this.eventType() === 'red_card';
    return isCard && this.eventPlayerId() === null;
  });

  // ── Diálogo de finalizar ──────────────────────────────────────────────────
  finishVisible = false;
  penHome: number | null = null;
  penAway: number | null = null;

  private clock?: ReturnType<typeof setInterval>;
  private poller?: ReturnType<typeof setInterval>;

  match = computed(() => this.detail()?.match ?? null);
  /** Se pueden registrar incidencias */
  live = computed(() => {
    const m = this.match();
    return !!m && (m.status === 'scheduled' || m.status === 'in_progress');
  });
  canCapture = computed(() => !!this.detail()?.can_capture && this.live());
  needsPenalties = computed(() => {
    const m = this.match();
    return !!m && m.round_type === 'bracket' && m.score_home === m.score_away;
  });

  /** Minuto de juego según la hora de inicio (aprox.; el árbitro puede corregirlo) */
  elapsed = computed(() => {
    const m = this.match();
    if (!m?.started_at || m.status !== 'in_progress') return null;
    const mins = Math.floor((this.now() - new Date(m.started_at).getTime()) / 60000) + 1;
    return Math.max(1, Math.min(mins, (this.detail()?.rules.match_duration_minutes ?? 90) + 30));
  });

  timeline = computed(() => [...(this.detail()?.events ?? [])].sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0) || a.id - b.id));

  /** Jugadores que cumplen el descanso de la amarilla en este momento */
  sinBins = computed(() => {
    const now = this.now();
    return (this.detail()?.events ?? [])
      .filter((e) => e.event_type === 'yellow_card' && e.payload?.sin_bin_minutes)
      .map((e) => ({ event: e, ends: new Date(e.created_at).getTime() + e.payload!.sin_bin_minutes! * 60000 }))
      .filter((x) => x.ends > now)
      .map((x) => ({ ...x.event, remaining: Math.ceil((x.ends - now) / 1000) }));
  });

  ngOnInit(): void {
    this.load();
    this.clock = setInterval(() => this.now.set(Date.now()), 1000);
    this.poller = setInterval(() => {
      if (this.match()?.status === 'in_progress' && !this.busy() && !this.eventVisible && !this.finishVisible) {
        this.load(true);
      }
    }, POLL_MS);
  }

  ngOnDestroy(): void {
    clearInterval(this.clock);
    clearInterval(this.poller);
  }

  load(silent = false): void {
    if (!silent) this.loading.set(true);
    this.api.detail(this.tournamentId, this.matchId).subscribe({
      next: (res) => {
        this.detail.set(res.data);
        this.error.set('');
        this.loading.set(false);
      },
      error: (err) => {
        if (!silent) this.error.set(apiErrorMessage(err, 'No se pudo cargar el partido'));
        this.loading.set(false);
      },
    });
  }

  backLink(): unknown[] {
    return this.isAdmin ? ['/admin/torneos', this.tournamentId, 'partidos'] : ['/admin/mis-partidos'];
  }

  players(side: Side): RosterPlayer[] {
    const d = this.detail();
    return d ? (side === 'home' ? d.home_players : d.away_players) : [];
  }

  teamId(side: Side): number {
    const m = this.match()!;
    return (side === 'home' ? m.home_team_id : m.away_team_id)!;
  }

  private toOptions(players: RosterPlayer[]) {
    return players.map((p) => ({ id: p.id, label: `${p.jersey_number ? '#' + p.jersey_number + ' ' : ''}${p.name}` }));
  }

  setEventPlayer(id: number | null): void {
    this.eventPlayerId.set(id);
    if (id !== null && id === this.eventAssistId) this.eventAssistId = null;
  }

  /** Tarjetas del jugador en este partido */
  cardsInMatch(p: RosterPlayer, type: EventType): number {
    return (this.detail()?.events ?? []).filter((e) => e.player_id === p.id && e.event_type === type).length;
  }

  times(n: number): number[] {
    return Array.from({ length: n }, (_, i) => i);
  }

  isExpelled(p: RosterPlayer): boolean {
    return this.cardsInMatch(p, 'red_card') > 0 || this.cardsInMatch(p, 'yellow_card') >= 2;
  }

  statusLabel(): string {
    const m = this.match();
    return m ? MATCH_STATUS_LABELS[m.status] : '';
  }
  statusSeverity(): string | undefined {
    const m = this.match();
    return m ? MATCH_STATUS_SEVERITY[m.status] : undefined;
  }

  formatRemaining(seconds: number): string {
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }

  // ── Incidencias ───────────────────────────────────────────────────────────
  /** Abre el diálogo de la incidencia con el minuto transcurrido ya propuesto */
  openEvent(side: Side, type: CaptureType, player?: RosterPlayer): void {
    this.eventType.set(type);
    this.eventSide.set(side);
    this.eventPlayerId.set(player?.id ?? null);
    this.eventAssistId = null;
    this.eventMinute = this.elapsed();
    this.eventVisible = true;
  }

  eventTitle(): string {
    return { goal: 'Registrar gol', own_goal: 'Registrar autogol', yellow_card: 'Tarjeta amarilla', red_card: 'Tarjeta roja' }[this.eventType()];
  }

  /** Al abrir el diálogo el cursor queda en el minuto, con el valor seleccionado para sobrescribirlo */
  focusMinute(): void {
    setTimeout(() => {
      const input = document.getElementById('ev-minute') as HTMLInputElement | null;
      input?.focus();
      input?.select();
    });
  }

  saveEvent(): void {
    if (this.eventMinute === null || this.eventInvalid()) return;
    this.eventVisible = false;
    this.register(this.eventSide(), this.eventType(), this.eventPlayerId(), this.eventMinute, this.eventAssistId);
  }

  private register(side: Side, type: EventType, playerId: number | null, minute: number, assistId: number | null = null): void {
    this.run(
      this.api.addEvent(this.matchId, {
        team_id: this.teamId(side),
        event_type: type,
        player_id: playerId,
        assist_player_id: assistId,
        minute,
      }),
      `Registrado: ${EVENT_META[type].icon} ${EVENT_META[type].label}`,
    );
  }

  removeEvent(e: MatchEvent): void {
    this.confirm.confirm({
      header: 'Eliminar incidencia',
      message: `¿Eliminar "${EVENT_META[e.event_type].label}${e.player_name ? ' de ' + e.player_name : ''}"? Si es gol, el marcador se corrige.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => this.run(this.api.removeEvent(this.matchId, e.id), 'Incidencia eliminada'),
    });
  }

  // ── Finalizar / reabrir ───────────────────────────────────────────────────
  openFinish(): void {
    const m = this.match()!;
    this.penHome = m.penalties_home;
    this.penAway = m.penalties_away;
    this.finishVisible = true;
  }

  penaltiesInvalid(): boolean {
    return this.needsPenalties() && (this.penHome === null || this.penAway === null || this.penHome === this.penAway);
  }

  finish(): void {
    if (this.penaltiesInvalid()) return;
    this.finishVisible = false;
    const penalties = this.needsPenalties() ? { penalties_home: this.penHome!, penalties_away: this.penAway! } : undefined;
    this.run(this.api.finish(this.tournamentId, this.matchId, penalties), 'Partido finalizado. Tabla y estadísticas actualizadas');
  }

  reopen(): void {
    this.confirm.confirm({
      header: 'Reabrir partido',
      message: 'El partido volverá a "En juego" y saldrá de la tabla hasta que lo finalices de nuevo. En eliminatoria, el ganador se retira del siguiente partido.',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Reabrir',
      rejectLabel: 'Cancelar',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => this.run(this.api.reopen(this.tournamentId, this.matchId), 'Partido reabierto'),
    });
  }

  private run(request: Observable<unknown>, okMessage: string): void {
    this.busy.set(true);
    request.subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.add({ severity: 'success', summary: okMessage, life: 2500 });
        this.load(true);
      },
      error: (err) => {
        this.busy.set(false);
        this.toast.add({ severity: 'error', summary: 'No se pudo completar', detail: apiErrorMessage(err), life: 7000 });
        this.load(true);
      },
    });
  }
}
