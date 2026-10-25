import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, computed, inject, numberAttribute, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { CalendarModule } from 'primeng/calendar';
import { CheckboxModule } from 'primeng/checkbox';
import { ChipsModule } from 'primeng/chips';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { Menu, MenuModule } from 'primeng/menu';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectButtonModule } from 'primeng/selectbutton';
import { forkJoin } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { apiErrorMessage } from '../../../../core/api/api-error';
import { Field, FieldsApi } from '../../../../core/api/fields.api';
import {
  MATCH_STATUS_LABELS,
  MATCH_STATUS_SEVERITY,
  MatchRow,
  MatchSchedulePatch,
  MatchStatus,
  MatchesApi,
  Round,
  ScheduleResult,
} from '../../../../core/api/matches.api';
import { Tournament, TournamentsApi } from '../../../../core/api/tournaments.api';
import { CRUD_UI } from '../../../../core/ui/crud-ui';

type View = 'rounds' | 'day';

/** Destino al soltar una tarjeta */
type DropTarget =
  | { kind: 'round'; roundId: number }
  | { kind: 'cell'; fieldId: number | null; time: string }
  | { kind: 'tray' };

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const pad = (n: number) => String(n).padStart(2, '0');
/** Fecha local -> 'AAAA-MM-DD' */
const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** 'AAAA-MM-DD' -> fecha local */
const fromIsoDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const fromMinutes = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

@Component({
  standalone: true,
  selector: 'app-tournament-calendar',
  imports: [
    CommonModule, FormsModule, RouterLink, ...CRUD_UI,
    CdkDropListGroup, CdkDropList, CdkDrag,
    CalendarModule, CheckboxModule, ChipsModule, DropdownModule, InputNumberModule, MenuModule, MultiSelectModule, SelectButtonModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './tournament-calendar.component.html',
  styleUrls: ['../../../../styles/crud.scss', '../matches.scss', './tournament-calendar.component.scss'],
})
export class TournamentCalendarComponent implements OnInit {
  /** Llega desde la ruta /admin/torneos/:tournamentId/calendario */
  @Input({ transform: numberAttribute }) tournamentId!: number;

  private readonly api = inject(MatchesApi);
  private readonly tournamentsApi = inject(TournamentsApi);
  private readonly fieldsApi = inject(FieldsApi);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  tournament = signal<Tournament | null>(null);
  matches = signal<MatchRow[]>([]);
  rounds = signal<Round[]>([]);
  fields = signal<Field[]>([]);
  loading = signal(true);
  busy = signal(false);
  error = signal('');

  readonly viewOptions = [
    { label: 'Por jornada', value: 'rounds', icon: 'pi pi-th-large' },
    { label: 'Por día y cancha', value: 'day', icon: 'pi pi-calendar' },
  ];
  view = signal<View>('rounds');

  // ── Vista por día ─────────────────────────────────────────────────────────
  day = signal<string>(isoDate(new Date()));
  dayDate = fromIsoDate(this.day());
  readonly stepOptions = [30, 60, 90, 120].map((v) => ({ label: `${v} min`, value: v }));
  step = signal(60);
  dayStart = signal('07:00');
  dayEnd = signal('22:00');

  /** En pantallas táctiles hay que mantener presionado para arrastrar (así el dedo puede desplazar la vista) */
  readonly dragDelay = { touch: 300, mouse: 0 };

  // ── Menú de acciones de una tarjeta ───────────────────────────────────────
  menuItems: MenuItem[] = [];

  // ── Diálogo de editar horario ─────────────────────────────────────────────
  editVisible = false;
  editMatch: MatchRow | null = null;
  editDate: Date | null = null;
  editFieldId: number | null = null;
  editRoundId: number | null = null;

  // ── Diálogo de generar jornadas ───────────────────────────────────────────
  genVisible = false;
  genDoubleRound = false;
  genStart: Date | null = null;
  genDays = 7;
  genTimes: string[] = ['09:00', '11:00'];
  genFieldIds: number[] = [];
  genPreview = signal<ScheduleResult | null>(null);
  genError = signal('');

  // ── Derivados ─────────────────────────────────────────────────────────────
  groupRounds = computed(() => this.rounds().filter((r) => r.type === 'group'));
  /** Partidos por jornada (la jornada controla el orden de las columnas) */
  byRound = computed(() => {
    const map = new Map<number, MatchRow[]>();
    for (const r of this.rounds()) map.set(r.id, []);
    for (const m of this.matches()) map.get(m.round_id)?.push(m);
    for (const list of map.values()) list.sort((a, b) => (a.scheduled_local ?? '9').localeCompare(b.scheduled_local ?? '9'));
    return map;
  });

  /** Partidos sin fecha/hora o sin cancha (y los suspendidos), para la bandeja de la vista por día */
  tray = computed(() =>
    this.matches().filter((m) => m.status !== 'finished' && m.status !== 'cancelled' && (!m.scheduled_local || m.status === 'postponed')),
  );

  timeSlots = computed(() => {
    const out: string[] = [];
    for (let t = toMinutes(this.dayStart()); t <= toMinutes(this.dayEnd()); t += this.step()) out.push(fromMinutes(t));
    return out;
  });

  /** Canchas que se muestran como columnas (por defecto, las que usa el torneo) */
  visibleFieldIds = signal<number[]>([]);

  /** Columnas de la vista por día: las canchas visibles y, al final, "Sin cancha" */
  columns = computed(() => {
    const visible = new Set(this.visibleFieldIds());
    return [
      ...this.fields().filter((f) => visible.has(f.id)).map((f) => ({ id: f.id as number | null, name: f.name })),
      { id: null, name: 'Sin cancha' },
    ];
  });

  /** Partidos del día por "cancha|hora" (la hora se redondea hacia abajo al intervalo) */
  dayCells = computed(() => {
    const cells = new Map<string, MatchRow[]>();
    const start = toMinutes(this.dayStart());
    for (const m of this.matches()) {
      if (!m.scheduled_local || m.status === 'postponed' || m.scheduled_local.slice(0, 10) !== this.day()) continue;
      const mins = toMinutes(m.scheduled_local.slice(11, 16));
      const slot = fromMinutes(Math.max(start, start + Math.floor((mins - start) / this.step()) * this.step()));
      const key = `${m.field_id ?? 'none'}|${slot}`;
      cells.set(key, [...(cells.get(key) ?? []), m]);
    }
    return cells;
  });

  /** Días con partidos (para saltar entre ellos) */
  matchDays = computed(() =>
    Array.from(new Set(this.matches().filter((m) => m.scheduled_local).map((m) => m.scheduled_local!.slice(0, 10)))).sort(),
  );

  ngOnInit(): void {
    this.load();
  }

  load(silent = false): void {
    if (!silent) this.loading.set(true);
    forkJoin({
      tournaments: this.tournamentsApi.list(),
      matches: this.api.listByTournament(this.tournamentId),
      rounds: this.api.rounds(this.tournamentId),
      fields: this.fieldsApi.list(),
    }).subscribe({
      next: (res) => {
        this.tournament.set(res.tournaments.data.find((t) => t.id === this.tournamentId) ?? null);
        this.matches.set(res.matches.data);
        this.rounds.set(res.rounds.data);
        this.fields.set(res.fields.data);
        this.ensureVisibleFields();
        if (!silent) this.jumpToFirstDay();
        this.error.set('');
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'No se pudo cargar el calendario'));
        this.loading.set(false);
      },
    });
  }

  // ── Vista por día ─────────────────────────────────────────────────────────
  /** Muestra siempre las canchas que usa el torneo; si no usa ninguna, las primeras tres de la liga */
  private ensureVisibleFields(): void {
    const used = this.matches().map((m) => m.field_id).filter((id): id is number => id !== null);
    const base = this.visibleFieldIds().length ? this.visibleFieldIds() : used.length ? [] : this.fields().slice(0, 3).map((f) => f.id);
    this.visibleFieldIds.set(Array.from(new Set([...base, ...used])));
  }

  private jumpToFirstDay(): void {
    const today = isoDate(new Date());
    const days = this.matchDays();
    const next = days.find((d) => d >= today) ?? days[days.length - 1];
    if (next) this.setDay(next);
  }

  setDay(day: string): void {
    this.day.set(day);
    this.dayDate = fromIsoDate(day);
  }

  onDayPicked(d: Date | null): void {
    if (d) this.setDay(isoDate(d));
  }

  shiftDay(delta: number): void {
    const d = fromIsoDate(this.day());
    d.setDate(d.getDate() + delta);
    this.setDay(isoDate(d));
  }

  /** Salta al día anterior/siguiente que tenga partidos */
  jumpMatchDay(direction: 1 | -1): void {
    const days = this.matchDays();
    const target = direction > 0 ? days.find((d) => d > this.day()) : [...days].reverse().find((d) => d < this.day());
    if (target) this.setDay(target);
  }

  cell(fieldId: number | null, time: string): MatchRow[] {
    return this.dayCells().get(`${fieldId ?? 'none'}|${time}`) ?? [];
  }

  // ── Arrastrar y soltar ────────────────────────────────────────────────────
  /** Un partido finalizado o cancelado ya no se mueve */
  canDrag(m: MatchRow): boolean {
    return m.status !== 'finished' && m.status !== 'cancelled' && m.status !== 'in_progress';
  }

  /** Solo se arrastra entre jornadas del mismo tipo (no se mezclan grupos con eliminatoria) */
  roundEnterPredicate = (drag: CdkDrag<MatchRow>, drop: CdkDropList<DropTarget>): boolean => {
    const target = drop.data;
    if (target.kind !== 'round') return true;
    const from = this.rounds().find((r) => r.id === drag.data.round_id);
    const to = this.rounds().find((r) => r.id === target.roundId);
    return !!from && !!to && from.type === 'group' && to.type === 'group';
  };

  onDrop(event: CdkDragDrop<DropTarget, DropTarget, MatchRow>): void {
    const m = event.item.data;
    const target = event.container.data;
    if (event.previousContainer === event.container) return;

    let patch: MatchSchedulePatch;
    let label: string;
    if (target.kind === 'round') {
      if (target.roundId === m.round_id) return;
      patch = { round_id: target.roundId };
      label = `Movido a ${this.rounds().find((r) => r.id === target.roundId)?.name}`;
    } else if (target.kind === 'cell') {
      patch = { scheduled_at: `${this.day()} ${target.time}`, field_id: target.fieldId };
      if (m.status === 'postponed') patch.status = 'scheduled';
      label = `Programado: ${this.formatDay(this.day())} ${target.time}`;
    } else {
      patch = { scheduled_at: null, field_id: null };
      label = 'Partido sin programar';
    }
    this.save(m, patch, label);
  }

  // ── Guardar con manejo de choques ─────────────────────────────────────────
  private save(m: MatchRow, patch: MatchSchedulePatch, okMessage: string): void {
    this.busy.set(true);
    this.api.update(this.tournamentId, m.id, patch).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.add({ severity: 'success', summary: okMessage, detail: this.matchLabel(m), life: 2500 });
        this.load(true);
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        if (err.status === 409 && err.error?.data?.conflicts) {
          this.confirm.confirm({
            header: 'Choque de horario',
            message: `${apiErrorMessage(err).replace(/ Envía force.*$/, '')} ¿Guardar de todos modos?`,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Guardar igual',
            rejectLabel: 'Cancelar',
            rejectButtonStyleClass: 'p-button-text',
            accept: () => this.save(m, { ...patch, force: true }, okMessage),
            reject: () => this.load(true),
          });
          return;
        }
        this.toast.add({ severity: 'error', summary: 'No se pudo mover', detail: apiErrorMessage(err), life: 7000 });
        this.load(true);
      },
    });
  }

  // ── Menú de acciones ──────────────────────────────────────────────────────
  openMenu(event: Event, menu: Menu, m: MatchRow): void {
    const items: MenuItem[] = [
      { label: m.status === 'finished' ? 'Ver partido' : 'Capturar resultado', icon: 'pi pi-pencil', routerLink: ['/admin/torneos', this.tournamentId, 'partidos', m.id] },
    ];
    if (m.status !== 'finished' && m.status !== 'in_progress') {
      items.push({ label: 'Cambiar fecha, cancha o jornada', icon: 'pi pi-calendar-plus', command: () => this.openEdit(m) });
    }
    if (m.status === 'scheduled') {
      items.push(
        { label: 'Suspender', icon: 'pi pi-pause', command: () => this.changeStatus(m, 'postponed') },
        { label: 'Cancelar partido', icon: 'pi pi-ban', command: () => this.changeStatus(m, 'cancelled') },
      );
    }
    if (m.status === 'postponed' || m.status === 'cancelled') {
      items.push({ label: 'Reactivar', icon: 'pi pi-replay', command: () => this.changeStatus(m, 'scheduled') });
    }
    this.menuItems = items;
    menu.toggle(event);
  }

  changeStatus(m: MatchRow, status: MatchStatus): void {
    const labels: Partial<Record<MatchStatus, string>> = { postponed: 'Partido suspendido', cancelled: 'Partido cancelado', scheduled: 'Partido reactivado' };
    if (status === 'cancelled') {
      this.confirm.confirm({
        header: 'Cancelar partido',
        message: `¿Cancelar ${this.matchLabel(m)}? No contará para la tabla. Se puede reactivar después.`,
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Cancelar partido',
        rejectLabel: 'Volver',
        acceptButtonStyleClass: 'p-button-danger',
        rejectButtonStyleClass: 'p-button-text',
        accept: () => this.save(m, { status }, labels[status]!),
      });
      return;
    }
    this.save(m, { status }, labels[status]!);
  }

  openEdit(m: MatchRow): void {
    this.editMatch = m;
    this.editDate = m.scheduled_local ? new Date(fromIsoDate(m.scheduled_local.slice(0, 10)).setHours(
      Number(m.scheduled_local.slice(11, 13)), Number(m.scheduled_local.slice(14, 16)))) : null;
    this.editFieldId = m.field_id;
    this.editRoundId = m.round_id;
    this.editVisible = true;
  }

  editRoundOptions(): Round[] {
    const current = this.rounds().find((r) => r.id === this.editMatch?.round_id);
    return this.rounds().filter((r) => r.type === current?.type);
  }

  saveEdit(): void {
    const m = this.editMatch;
    if (!m) return;
    const d = this.editDate;
    const patch: MatchSchedulePatch = {
      scheduled_at: d ? `${isoDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}` : null,
      field_id: this.editFieldId,
    };
    if (this.editRoundId && this.editRoundId !== m.round_id) patch.round_id = this.editRoundId;
    if (m.status === 'postponed' && d) patch.status = 'scheduled';
    this.editVisible = false;
    this.save(m, patch, 'Partido reprogramado');
  }

  // ── Generar jornadas ──────────────────────────────────────────────────────
  openGenerate(): void {
    this.genPreview.set(null);
    this.genError.set('');
    if (!this.genStart) this.genStart = this.tournament()?.start_date ? fromIsoDate(this.tournament()!.start_date!) : null;
    if (this.genFieldIds.length === 0) this.genFieldIds = this.fields().slice(0, 2).map((f) => f.id);
    this.genVisible = true;
  }

  invalidTimes(): string[] {
    return this.genTimes.filter((t) => !TIME_RE.test(t));
  }

  private genOptions(dryRun: boolean) {
    return {
      double_round: this.genDoubleRound,
      start_date: this.genStart ? isoDate(this.genStart) : null,
      days_between_rounds: this.genDays,
      times: this.genStart ? this.genTimes : [],
      field_ids: this.genFieldIds,
      dry_run: dryRun,
      replace: this.groupRounds().length > 0,
    };
  }

  previewSchedule(): void {
    if (this.invalidTimes().length) return;
    this.busy.set(true);
    this.genError.set('');
    this.api.generateSchedule(this.tournamentId, this.genOptions(true)).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.genPreview.set(res.data);
      },
      error: (err) => {
        this.busy.set(false);
        this.genPreview.set(null);
        this.genError.set(apiErrorMessage(err));
      },
    });
  }

  generate(): void {
    const run = () => {
      this.busy.set(true);
      this.api.generateSchedule(this.tournamentId, this.genOptions(false)).subscribe({
        next: (res) => {
          this.busy.set(false);
          this.genVisible = false;
          this.toast.add({
            severity: 'success',
            summary: 'Calendario generado',
            detail: `${res.data.rounds} jornadas · ${res.data.matches} partidos${res.data.unscheduled ? ` · ${res.data.unscheduled} sin horario` : ''}`,
          });
          this.load();
        },
        error: (err) => {
          this.busy.set(false);
          this.genError.set(apiErrorMessage(err));
        },
      });
    };
    if (this.groupRounds().length > 0) {
      this.confirm.confirm({
        header: 'Reemplazar calendario',
        message: `El torneo ya tiene ${this.groupRounds().length} jornada(s) sin jugar. Se borrarán con sus partidos y se generarán de nuevo. ¿Continuar?`,
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Reemplazar',
        rejectLabel: 'Cancelar',
        acceptButtonStyleClass: 'p-button-danger',
        rejectButtonStyleClass: 'p-button-text',
        accept: run,
      });
      return;
    }
    run();
  }

  // ── Presentación ──────────────────────────────────────────────────────────
  matchLabel(m: MatchRow): string {
    return `${m.home_team ?? 'Por definir'} vs ${m.away_team ?? 'Por definir'}`;
  }
  statusLabel(s: MatchStatus): string {
    return MATCH_STATUS_LABELS[s];
  }
  statusSeverity(s: MatchStatus): string | undefined {
    return MATCH_STATUS_SEVERITY[s];
  }
  /** 'AAAA-MM-DD' -> 'sáb 05 dic' */
  formatDay(day: string): string {
    return fromIsoDate(day).toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short' });
  }
  formatLocal(local: string | null): string {
    return local ? `${this.formatDay(local.slice(0, 10))}, ${local.slice(11, 16)}` : 'Sin fecha';
  }
  roundDates(roundId: number): string {
    const days = Array.from(new Set((this.byRound().get(roundId) ?? []).filter((m) => m.scheduled_local).map((m) => m.scheduled_local!.slice(0, 10)))).sort();
    if (days.length === 0) return 'Sin fecha';
    return days.length === 1 ? this.formatDay(days[0]) : `${this.formatDay(days[0])} – ${this.formatDay(days[days.length - 1])}`;
  }
  trackById = (_: number, m: MatchRow) => m.id;
}
