import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { DialogDefaultsDirective } from '../../../core/ui/dialog-defaults.directive';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { Observable, forkJoin } from 'rxjs';
import { apiErrorMessage } from '../../../core/api/api-error';
import { Category, CategoriesApi } from '../../../core/api/categories.api';
import { Sport, SportsApi } from '../../../core/api/sports.api';
import { Team, TeamsApi } from '../../../core/api/teams.api';
import {
  Enrollment,
  FORMAT_LABELS,
  STATUS_LABELS,
  Tournament,
  TournamentFormat,
  TournamentPayload,
  TournamentStatus,
  TournamentsApi,
} from '../../../core/api/tournaments.api';
import { notBlank } from '../../../core/ui/validators';

/** Fecha local -> "AAAA-MM-DD" (sin pasar por UTC para no correr el día). */
const toIso = (d: Date | null): string | null =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : null;

/** "AAAA-MM-DD" -> fecha local. */
const fromIso = (s: string | null): Date | null => {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** La fecha de fin no puede ser anterior a la de inicio. */
function dateRange(group: AbstractControl): ValidationErrors | null {
  const start = group.get('start_date')?.value as Date | null;
  const end = group.get('end_date')?.value as Date | null;
  return start && end && end < start ? { dateRange: true } : null;
}

const SEVERITY: Record<TournamentStatus, string | undefined> = {
  draft: 'warning',
  registration: 'info',
  in_progress: 'success',
  finished: undefined,
  archived: undefined,
  cancelled: 'danger',
};

@Component({
  standalone: true,
  selector: 'app-tournaments',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    TableModule,
    ButtonModule,
    DialogModule,
    DialogDefaultsDirective,
    DropdownModule,
    InputTextModule,
    InputTextareaModule,
    InputNumberModule,
    CalendarModule,
    TagModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './tournaments.component.html',
  styleUrls: ['../../../styles/crud.scss', './tournaments.component.scss'],
})
export class TournamentsComponent implements OnInit {
  private readonly api = inject(TournamentsApi);
  private readonly sportsApi = inject(SportsApi);
  private readonly categoriesApi = inject(CategoriesApi);
  private readonly teamsApi = inject(TeamsApi);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  items = signal<Tournament[]>([]);
  sports = signal<Sport[]>([]);
  categories = signal<Category[]>([]);
  teams = signal<Team[]>([]);
  loading = signal(true);
  saving = signal(false);
  loadError = signal('');

  // ── Diálogo de crear / editar ─────────────────────────────────────────────
  dialogVisible = false;
  editing = signal<Tournament | null>(null);
  formError = signal('');

  readonly formats = (Object.keys(FORMAT_LABELS) as TournamentFormat[]).map((value) => ({
    value,
    label: FORMAT_LABELS[value],
  }));
  readonly statuses = (Object.keys(STATUS_LABELS) as TournamentStatus[]).map((value) => ({
    value,
    label: STATUS_LABELS[value],
  }));
  formatLabel = (f: TournamentFormat): string => FORMAT_LABELS[f];
  statusLabel = (s: TournamentStatus): string => STATUS_LABELS[s];

  // tournaments: name varchar(150), max_teams tinyint unsigned (2–255), description se limita a 2000
  form = this.fb.group(
    {
      name: this.fb.nonNullable.control('', [Validators.required, notBlank, Validators.minLength(3), Validators.maxLength(150)]),
      sport_id: this.fb.control<number | null>(null, [Validators.required]),
      category_id: this.fb.control<number | null>(null, [Validators.required]),
      format: this.fb.control<TournamentFormat | null>(null, [Validators.required]),
      max_teams: this.fb.control<number | null>(16, [Validators.required, Validators.min(2), Validators.max(255)]),
      start_date: this.fb.control<Date | null>(null),
      end_date: this.fb.control<Date | null>(null),
      description: this.fb.nonNullable.control('', [Validators.maxLength(2000)]),
      status: this.fb.control<TournamentStatus>('draft'),
    },
    { validators: dateRange },
  );

  // ── Diálogo de equipos inscritos ──────────────────────────────────────────
  enrollVisible = false;
  enrollTournament = signal<Tournament | null>(null);
  enrolled = signal<Enrollment[]>([]);
  enrollLoading = signal(false);
  enrollBusy = signal(false);
  teamCtrl = new FormControl<number | null>(null);

  confirmedCount = computed(() => this.enrolled().filter((e) => e.enrollment_status === 'confirmed').length);
  isFull = computed(() => {
    const t = this.enrollTournament();
    return !!t && this.confirmedCount() >= t.max_teams;
  });

  /** Equipos que todavía se pueden inscribir: sin inscripción activa y de la categoría del torneo. */
  availableTeams = computed(() => {
    const t = this.enrollTournament();
    const active = new Set(this.enrolled().filter((e) => e.enrollment_status !== 'withdrawn').map((e) => e.team_id));
    return this.teams().filter((team) => !active.has(team.id) && (!t?.category_id || team.category_id === t.category_id));
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set('');
    forkJoin({
      tournaments: this.api.list(),
      sports: this.sportsApi.list(),
      categories: this.categoriesApi.list(),
      teams: this.teamsApi.list(),
    }).subscribe({
      next: (res) => {
        this.items.set(res.tournaments.data);
        this.sports.set(res.sports.data);
        this.categories.set(res.categories.data);
        this.teams.set(res.teams.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(apiErrorMessage(err, 'No se pudieron cargar los torneos'));
        this.loading.set(false);
      },
    });
  }

  private reloadTournaments(): void {
    this.api.list().subscribe({ next: (res) => this.items.set(res.data) });
  }

  severity(status: TournamentStatus): string | undefined {
    return SEVERITY[status];
  }

  // ── Crear / editar ────────────────────────────────────────────────────────
  openCreate(): void {
    this.editing.set(null);
    this.formError.set('');
    this.form.reset({
      name: '',
      sport_id: this.sports().length === 1 ? this.sports()[0].id : null,
      category_id: null,
      format: null,
      max_teams: 16,
      start_date: null,
      end_date: null,
      description: '',
      status: 'draft',
    });
    this.dialogVisible = true;
  }

  openEdit(t: Tournament): void {
    this.editing.set(t);
    this.formError.set('');
    this.form.reset({
      name: t.name,
      sport_id: t.sport_id,
      category_id: t.category_id,
      format: t.format,
      max_teams: t.max_teams,
      start_date: fromIso(t.start_date),
      end_date: fromIso(t.end_date),
      description: t.description ?? '',
      status: t.status,
    });
    this.dialogVisible = true;
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const payload: TournamentPayload = {
      name: v.name.trim(),
      sport_id: v.sport_id!,
      category_id: v.category_id,
      format: v.format!,
      max_teams: v.max_teams!,
      description: v.description.trim(),
      start_date: toIso(v.start_date),
      end_date: toIso(v.end_date),
    };
    const current = this.editing();
    this.saving.set(true);
    this.formError.set('');

    const request: Observable<unknown> = current
      ? this.api.update(current.id, { ...payload, status: v.status ?? current.status })
      : this.api.create(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogVisible = false;
        this.toast.add({
          severity: 'success',
          summary: current ? 'Torneo actualizado' : 'Torneo creado',
          detail: payload.name,
        });
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(apiErrorMessage(err));
      },
    });
  }

  fieldInvalid(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  // ── Eliminar ──────────────────────────────────────────────────────────────
  remove(t: Tournament): void {
    this.confirm.confirm({
      header: 'Eliminar torneo',
      message: `¿Eliminar el torneo "${t.name}"? Se quitarán también sus inscripciones. Esta acción no se puede deshacer.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () =>
        this.api.remove(t.id).subscribe({
          next: () => {
            this.toast.add({ severity: 'success', summary: 'Torneo eliminado', detail: t.name });
            this.load();
          },
          error: (err) => this.toast.add({ severity: 'error', summary: 'No se pudo eliminar', detail: apiErrorMessage(err), life: 7000 }),
        }),
    });
  }

  // ── Equipos inscritos ─────────────────────────────────────────────────────
  openEnrollments(t: Tournament): void {
    this.enrollTournament.set(t);
    this.enrolled.set([]);
    this.teamCtrl.reset(null);
    this.enrollVisible = true;
    this.loadEnrollments(t.id);
  }

  private loadEnrollments(tournamentId: number): void {
    this.enrollLoading.set(true);
    this.api.enrolled(tournamentId).subscribe({
      next: (res) => {
        this.enrolled.set(res.data);
        this.enrollLoading.set(false);
      },
      error: (err) => {
        this.enrollLoading.set(false);
        this.toast.add({ severity: 'error', summary: 'No se pudieron cargar los equipos', detail: apiErrorMessage(err) });
      },
    });
  }

  enrollSelected(): void {
    const t = this.enrollTournament();
    const teamId = this.teamCtrl.value;
    if (!t || !teamId) return;
    this.runEnrollment(this.api.enroll(t.id, teamId), t, 'Equipo inscrito');
    this.teamCtrl.reset(null);
  }

  reenroll(e: Enrollment): void {
    const t = this.enrollTournament();
    if (t) this.runEnrollment(this.api.enroll(t.id, e.team_id), t, 'Equipo reinscrito');
  }

  withdraw(e: Enrollment): void {
    const t = this.enrollTournament();
    if (!t) return;
    this.confirm.confirm({
      header: 'Dar de baja',
      message: `¿Dar de baja a "${e.name}" del torneo? Su historial de partidos se conserva y se puede reinscribir.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Dar de baja',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => this.runEnrollment(this.api.withdraw(t.id, e.team_id), t, 'Equipo dado de baja'),
    });
  }

  private runEnrollment(request: Observable<unknown>, t: Tournament, okMessage: string): void {
    this.enrollBusy.set(true);
    request.subscribe({
      next: () => {
        this.enrollBusy.set(false);
        this.toast.add({ severity: 'success', summary: okMessage });
        this.loadEnrollments(t.id);
        this.reloadTournaments();
      },
      error: (err) => {
        this.enrollBusy.set(false);
        this.toast.add({ severity: 'error', summary: 'No se pudo completar', detail: apiErrorMessage(err), life: 7000 });
      },
    });
  }

  enrollmentLabel(e: Enrollment): string {
    return e.enrollment_status === 'confirmed' ? 'Confirmado' : e.enrollment_status === 'withdrawn' ? 'Baja' : 'Pendiente';
  }
  enrollmentSeverity(e: Enrollment): string | undefined {
    return e.enrollment_status === 'confirmed' ? 'success' : e.enrollment_status === 'withdrawn' ? 'danger' : 'warning';
  }
}
