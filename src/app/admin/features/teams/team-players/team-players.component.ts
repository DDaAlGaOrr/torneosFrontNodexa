import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject, numberAttribute, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DropdownModule } from 'primeng/dropdown';
import { Observable, forkJoin } from 'rxjs';
import { apiErrorMessage } from '../../../../core/api/api-error';
import { Player, PlayerStatus, PlayersApi } from '../../../../core/api/players.api';
import { Team, TeamsApi } from '../../../../core/api/teams.api';
import { CRUD_UI } from '../../../../core/ui/crud-ui';
import { notBlank } from '../../../../core/ui/validators';

@Component({
  standalone: true,
  selector: 'app-team-players',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ...CRUD_UI, DropdownModule],
  providers: [MessageService, ConfirmationService],
  templateUrl: './team-players.component.html',
  styleUrls: ['../../../../styles/crud.scss'],
})
export class TeamPlayersComponent implements OnInit {
  /** Llega desde la ruta /admin/equipos/:teamId/jugadores (withComponentInputBinding) */
  @Input({ transform: numberAttribute }) teamId!: number;

  private readonly teamsApi = inject(TeamsApi);
  private readonly playersApi = inject(PlayersApi);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  readonly positions = ['Portero', 'Defensa', 'Medio', 'Delantero'];
  readonly statuses: { value: PlayerStatus; label: string }[] = [
    { value: 'active', label: 'Activo' },
    { value: 'suspended', label: 'Suspendido' },
    { value: 'inactive', label: 'Inactivo' },
  ];
  private readonly severities: Record<PlayerStatus, string> = { active: 'success', suspended: 'warning', inactive: 'danger' };

  team = signal<Team | null>(null);
  items = signal<Player[]>([]);
  editing = signal<Player | null>(null);
  loading = signal(true);
  saving = signal(false);
  error = signal('');

  dialogVisible = false;
  formError = signal('');

  // players: name varchar(150), jersey_number varchar(5), position varchar(50)
  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, notBlank, Validators.maxLength(150)]],
    jersey_number: ['', [Validators.maxLength(5)]],
    position: ['', [Validators.maxLength(50)]],
    status: ['active' as PlayerStatus],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    forkJoin({
      teams: this.teamsApi.list(),
      players: this.playersApi.listByTeam(this.teamId),
    }).subscribe({
      next: (res) => {
        this.team.set(res.teams.data.find((t) => t.id === this.teamId) ?? null);
        this.items.set(res.players.data);
        if (!this.team()) this.error.set('El equipo no existe o no pertenece a tu liga');
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'No se pudieron cargar los jugadores'));
        this.loading.set(false);
      },
    });
  }

  statusLabel(status: PlayerStatus): string {
    return this.statuses.find((s) => s.value === status)?.label ?? status;
  }

  statusSeverity(status: PlayerStatus): string {
    return this.severities[status];
  }

  isCaptain(player: Player): boolean {
    return this.team()?.captain_player_id === player.id;
  }

  openCreate(): void {
    this.editing.set(null);
    this.form.reset({ name: '', jersey_number: '', position: '', status: 'active' });
    this.formError.set('');
    this.dialogVisible = true;
  }

  openEdit(player: Player): void {
    this.editing.set(player);
    this.form.reset({
      name: player.name,
      jersey_number: player.jersey_number ?? '',
      position: player.position ?? '',
      status: player.status,
    });
    this.formError.set('');
    this.dialogVisible = true;
  }

  fieldInvalid(name: 'name' | 'jersey_number' | 'position'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const base = {
      name: raw.name.trim(),
      jersey_number: raw.jersey_number.trim(),
      // El selector editable devuelve null al limpiarlo
      position: (raw.position ?? '').trim(),
    };
    const editing = this.editing();
    const request: Observable<unknown> = editing
      ? this.playersApi.update(editing.id, this.teamId, { ...base, status: raw.status })
      : this.playersApi.create(this.teamId, base);

    this.saving.set(true);
    this.formError.set('');
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogVisible = false;
        this.toast.add({ severity: 'success', summary: editing ? 'Jugador actualizado' : 'Jugador agregado', detail: base.name });
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(apiErrorMessage(err, 'No se pudo guardar el jugador'));
      },
    });
  }

  toggleCaptain(player: Player): void {
    const playerId = this.isCaptain(player) ? null : player.id;
    this.teamsApi.setCaptain(this.teamId, playerId).subscribe({
      next: () => {
        this.toast.add({
          severity: 'success',
          summary: playerId ? 'Capitán asignado' : 'Capitanía retirada',
          detail: player.name,
        });
        this.load();
      },
      error: (err) =>
        this.toast.add({ severity: 'error', summary: 'No se pudo cambiar el capitán', detail: apiErrorMessage(err), life: 7000 }),
    });
  }

  remove(player: Player): void {
    this.confirm.confirm({
      header: 'Eliminar jugador',
      message: `¿Eliminar a ${player.name}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () =>
        this.playersApi.remove(player.id, this.teamId).subscribe({
          next: () => {
            this.toast.add({ severity: 'success', summary: 'Jugador eliminado', detail: player.name });
            this.load();
          },
          // Si tiene goles o tarjetas, la API explica que debe marcarse como inactivo
          error: (err) =>
            this.toast.add({ severity: 'error', summary: 'No se pudo eliminar', detail: apiErrorMessage(err), life: 7000 }),
        }),
    });
  }
}
