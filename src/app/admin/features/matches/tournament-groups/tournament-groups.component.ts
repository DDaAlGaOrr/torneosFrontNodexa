import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, computed, inject, numberAttribute, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { Observable, forkJoin } from 'rxjs';
import { apiErrorMessage } from '../../../../core/api/api-error';
import { Group, GroupStandingRow, GroupsApi } from '../../../../core/api/groups.api';
import { Enrollment, Tournament, TournamentsApi } from '../../../../core/api/tournaments.api';
import { CRUD_UI } from '../../../../core/ui/crud-ui';

/** Equipo que se arrastra (de un grupo o de la bandeja "Sin grupo") */
interface DragTeam {
  team_id: number;
  name: string;
  primary_color: string | null;
  fromGroupId: number | null;
}

@Component({
  standalone: true,
  selector: 'app-tournament-groups',
  imports: [CommonModule, FormsModule, RouterLink, ...CRUD_UI, CdkDropListGroup, CdkDropList, CdkDrag, CheckboxModule, InputNumberModule],
  providers: [MessageService, ConfirmationService],
  templateUrl: './tournament-groups.component.html',
  styleUrls: ['../../../../styles/crud.scss', '../matches.scss', './tournament-groups.component.scss'],
})
export class TournamentGroupsComponent implements OnInit {
  /** Llega desde la ruta /admin/torneos/:tournamentId/grupos */
  @Input({ transform: numberAttribute }) tournamentId!: number;

  private readonly api = inject(GroupsApi);
  private readonly tournamentsApi = inject(TournamentsApi);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  tournament = signal<Tournament | null>(null);
  groups = signal<Group[]>([]);
  enrolled = signal<Enrollment[]>([]);
  standings = signal<Map<number, GroupStandingRow>>(new Map());
  loading = signal(true);
  busy = signal(false);
  error = signal('');

  // ── Diálogos ──────────────────────────────────────────────────────────────
  drawVisible = false;
  drawCount = 2;
  drawShuffle = true;

  nameVisible = false;
  nameValue = '';
  nameGroup: Group | null = null; // null = crear
  nameError = signal('');

  confirmed = computed(() => this.enrolled().filter((e) => e.enrollment_status === 'confirmed'));

  /** Equipos confirmados que no están en ningún grupo */
  unassigned = computed<DragTeam[]>(() => {
    const inGroup = new Set(this.groups().flatMap((g) => g.teams.map((t) => t.team_id)));
    return this.confirmed()
      .filter((e) => !inGroup.has(e.team_id))
      .map((e) => ({ team_id: e.team_id, name: e.name, primary_color: e.primary_color, fromGroupId: null }));
  });

  /** Ya se jugó o programó algo: los equipos con partidos de grupos no se pueden mover */
  anyPlayed = computed(() => Array.from(this.standings().values()).some((s) => s.PJ > 0));
  maxGroups = computed(() => Math.max(2, Math.min(26, Math.floor(this.confirmed().length / 2))));

  ngOnInit(): void {
    this.load();
  }

  load(silent = false): void {
    if (!silent) this.loading.set(true);
    forkJoin({
      tournaments: this.tournamentsApi.list(),
      groups: this.api.list(this.tournamentId),
      enrolled: this.tournamentsApi.enrolled(this.tournamentId),
      standings: this.api.standings(this.tournamentId),
    }).subscribe({
      next: (res) => {
        this.tournament.set(res.tournaments.data.find((t) => t.id === this.tournamentId) ?? null);
        this.groups.set(res.groups.data);
        this.enrolled.set(res.enrolled.data);
        this.standings.set(new Map(res.standings.data.flatMap((g) => g.standings).map((s) => [s.team_id, s])));
        this.error.set('');
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'No se pudieron cargar los grupos'));
        this.loading.set(false);
      },
    });
  }

  /** Equipos del grupo ordenados por su posición en la tabla */
  teamsOf(g: Group): DragTeam[] {
    const st = this.standings();
    return [...g.teams]
      .sort((a, b) => (st.get(a.team_id)?.position ?? 99) - (st.get(b.team_id)?.position ?? 99) || a.name.localeCompare(b.name, 'es'))
      .map((t) => ({ team_id: t.team_id, name: t.name, primary_color: t.primary_color, fromGroupId: g.id }));
  }

  stat(teamId: number): GroupStandingRow | undefined {
    return this.standings().get(teamId);
  }

  // ── Sorteo ────────────────────────────────────────────────────────────────
  openDraw(): void {
    this.drawCount = Math.min(this.drawCount, this.maxGroups());
    this.drawVisible = true;
  }

  drawSummary(): string {
    const n = this.unassigned().length;
    const g = this.drawCount || 1;
    const min = Math.floor(n / g);
    const extra = n % g;
    if (extra === 0) return `${n} equipos → ${g} grupos de ${min} equipos`;
    const big = extra === 1 ? `1 de ${min + 1}` : `${extra} de ${min + 1}`;
    const small = g - extra === 1 ? `1 de ${min}` : `${g - extra} de ${min}`;
    return `${n} equipos → ${g} grupos: ${big} y ${small} equipos`;
  }

  draw(): void {
    this.drawVisible = false;
    this.run(this.api.draw(this.tournamentId, this.drawCount, this.drawShuffle), 'Sorteo realizado');
  }

  // ── Crear / renombrar / eliminar ─────────────────────────────────────────
  openCreate(): void {
    const used = new Set(this.groups().map((g) => g.name));
    const letter = Array.from({ length: 26 }, (_, i) => `Grupo ${String.fromCharCode(65 + i)}`).find((n) => !used.has(n));
    this.nameGroup = null;
    this.nameValue = letter ?? '';
    this.nameError.set('');
    this.nameVisible = true;
  }

  openRename(g: Group): void {
    this.nameGroup = g;
    this.nameValue = g.name;
    this.nameError.set('');
    this.nameVisible = true;
  }

  saveName(): void {
    const name = this.nameValue.trim();
    if (!name || name.length > 50) {
      this.nameError.set('Escribe un nombre de hasta 50 caracteres');
      return;
    }
    const g = this.nameGroup;
    const request: Observable<unknown> = g ? this.api.rename(this.tournamentId, g.id, name) : this.api.create(this.tournamentId, name);
    this.busy.set(true);
    request.subscribe({
      next: () => {
        this.busy.set(false);
        this.nameVisible = false;
        this.toast.add({ severity: 'success', summary: g ? 'Grupo renombrado' : 'Grupo creado', detail: name });
        this.load(true);
      },
      error: (err) => {
        this.busy.set(false);
        this.nameError.set(apiErrorMessage(err));
      },
    });
  }

  removeGroup(g: Group): void {
    this.confirm.confirm({
      header: 'Eliminar grupo',
      message: `¿Eliminar "${g.name}"? ${g.teams.length ? `Sus ${g.teams.length} equipos quedarán sin grupo.` : ''}`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => this.run(this.api.remove(this.tournamentId, g.id), 'Grupo eliminado'),
    });
  }

  // ── Arrastrar equipos ────────────────────────────────────────────────────
  onDrop(event: CdkDragDrop<number | null, number | null, DragTeam>): void {
    if (event.previousContainer === event.container) return;
    const team = event.item.data;
    const target = event.container.data;
    if (target === null) {
      if (team.fromGroupId !== null) {
        this.run(this.api.removeTeam(this.tournamentId, team.fromGroupId, team.team_id), `${team.name} quedó sin grupo`);
      }
      return;
    }
    const groupName = this.groups().find((g) => g.id === target)?.name ?? '';
    this.run(this.api.moveTeam(this.tournamentId, target, team.team_id), `${team.name} → ${groupName}`);
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

  trackTeam = (_: number, t: DragTeam) => t.team_id;
  trackGroup = (_: number, g: Group) => g.id;
}
