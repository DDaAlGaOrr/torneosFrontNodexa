import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DropdownModule } from 'primeng/dropdown';
import { MultiSelectModule } from 'primeng/multiselect';
import { Observable, forkJoin } from 'rxjs';
import { apiErrorMessage } from '../../../core/api/api-error';
import { Category, CategoriesApi } from '../../../core/api/categories.api';
import { Team, TeamPayload, TeamsApi } from '../../../core/api/teams.api';
import { ManagedUser, UsersApi } from '../../../core/api/users.api';
import { CRUD_UI } from '../../../core/ui/crud-ui';
import { notBlank } from '../../../core/ui/validators';

const DEFAULT_COLOR = '#4f46e5';

@Component({
  standalone: true,
  selector: 'app-teams',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ...CRUD_UI, DropdownModule, MultiSelectModule],
  providers: [MessageService, ConfirmationService],
  templateUrl: './teams.component.html',
  styleUrls: ['../../../styles/crud.scss'],
})
export class TeamsComponent implements OnInit {
  private readonly teamsApi = inject(TeamsApi);
  private readonly categoriesApi = inject(CategoriesApi);
  private readonly usersApi = inject(UsersApi);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  items = signal<Team[]>([]);
  categories = signal<Category[]>([]);
  coaches = signal<ManagedUser[]>([]);
  editing = signal<Team | null>(null);
  loading = signal(true);
  saving = signal(false);
  error = signal('');

  dialogVisible = false;
  formError = signal('');

  /** Entrenadores activos, más los ya asignados a este equipo aunque estén inactivos (para no perderlos al editar). */
  coachChoices = computed(() => {
    const assigned = this.editing()?.coaches ?? [];
    return this.coaches()
      .filter((c) => c.active === 1 || assigned.some((a) => a.id === c.id))
      .map((c) => ({ id: c.id, label: c.active === 1 ? c.name : `${c.name} (inactivo)` }));
  });

  // teams: name varchar(100), short_name varchar(10), contact_email varchar(150), contact_phone varchar(30)
  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, notBlank, Validators.maxLength(100)]],
    short_name: ['', [Validators.maxLength(10)]],
    category_id: this.fb.control<number | null>(null, [Validators.required]),
    primary_color: [DEFAULT_COLOR, [Validators.pattern(/^#[0-9a-fA-F]{6}$/)]],
    contact_email: ['', [Validators.email, Validators.maxLength(150)]],
    contact_phone: ['', [Validators.maxLength(30)]],
    coach_ids: [[] as number[]],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    forkJoin({
      teams: this.teamsApi.list(),
      categories: this.categoriesApi.list(),
      coaches: this.usersApi.list('coach'),
    }).subscribe({
      next: (res) => {
        this.items.set(res.teams.data);
        this.categories.set(res.categories.data);
        this.coaches.set(res.coaches.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'No se pudieron cargar los equipos'));
        this.loading.set(false);
      },
    });
  }

  coachNames(team: Team): string {
    return team.coaches.map((c) => c.name).join(', ') || '—';
  }

  openCreate(): void {
    this.editing.set(null);
    this.form.reset({
      name: '',
      short_name: '',
      category_id: null,
      primary_color: DEFAULT_COLOR,
      contact_email: '',
      contact_phone: '',
      coach_ids: [],
    });
    this.formError.set('');
    this.dialogVisible = true;
  }

  openEdit(team: Team): void {
    this.editing.set(team);
    this.form.reset({
      name: team.name,
      short_name: team.short_name ?? '',
      category_id: team.category_id,
      primary_color: team.primary_color || DEFAULT_COLOR,
      contact_email: team.contact_email ?? '',
      contact_phone: team.contact_phone ?? '',
      coach_ids: team.coaches.map((c) => c.id),
    });
    this.formError.set('');
    this.dialogVisible = true;
  }

  fieldInvalid(name: 'name' | 'short_name' | 'category_id' | 'contact_email' | 'contact_phone'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const body: TeamPayload = {
      name: raw.name.trim(),
      category_id: raw.category_id as number,
      short_name: raw.short_name.trim(),
      primary_color: raw.primary_color,
      contact_email: raw.contact_email.trim(),
      contact_phone: raw.contact_phone.trim(),
      coach_ids: raw.coach_ids,
    };
    const editing = this.editing();
    const request: Observable<unknown> = editing ? this.teamsApi.update(editing.id, body) : this.teamsApi.create(body);

    this.saving.set(true);
    this.formError.set('');
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogVisible = false;
        this.toast.add({ severity: 'success', summary: editing ? 'Equipo actualizado' : 'Equipo creado', detail: body.name });
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(apiErrorMessage(err, 'No se pudo guardar el equipo'));
      },
    });
  }

  remove(team: Team): void {
    const players = team.players_count > 0 ? ` También se eliminarán sus ${team.players_count} jugadores.` : '';
    this.confirm.confirm({
      header: 'Eliminar equipo',
      message: `¿Eliminar el equipo "${team.name}"?${players}`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () =>
        this.teamsApi.remove(team.id).subscribe({
          next: () => {
            this.toast.add({ severity: 'success', summary: 'Equipo eliminado', detail: team.name });
            this.load();
          },
          // Si tiene partidos o está inscrito en un torneo, la API explica qué hacer
          error: (err) =>
            this.toast.add({ severity: 'error', summary: 'No se pudo eliminar', detail: apiErrorMessage(err), life: 7000 }),
        }),
    });
  }
}
