import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit, computed, inject, numberAttribute, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectButtonModule } from 'primeng/selectbutton';
import { forkJoin } from 'rxjs';
import { apiErrorMessage } from '../../../../core/api/api-error';
import { BracketMatch, BracketPlanResult, BracketRound, BracketsApi, GroupSummary } from '../../../../core/api/brackets.api';
import { Enrollment, Tournament, TournamentsApi } from '../../../../core/api/tournaments.api';
import { CRUD_UI } from '../../../../core/ui/crud-ui';
import { BracketTreeComponent } from '../../../../shared/components/bracket-tree/bracket-tree.component';

interface SeedTeam {
  team_id: number;
  name: string;
  included: boolean;
}

/** Cada cuánto se refresca el cuadro (para ver el avance cuando se finalizan partidos desde otra pantalla) */
const POLL_MS = 15000;

@Component({
  standalone: true,
  selector: 'app-tournament-bracket',
  imports: [
    CommonModule, FormsModule, RouterLink, ...CRUD_UI,
    CdkDropList, CdkDrag, CdkDragHandle,
    CheckboxModule, InputNumberModule, SelectButtonModule,
    BracketTreeComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './tournament-bracket.component.html',
  styleUrls: ['../../../../styles/crud.scss', '../matches.scss', './tournament-bracket.component.scss'],
})
export class TournamentBracketComponent implements OnInit, OnDestroy {
  /** Llega desde la ruta /admin/torneos/:tournamentId/llaves */
  @Input({ transform: numberAttribute }) tournamentId!: number;

  private readonly api = inject(BracketsApi);
  private readonly tournamentsApi = inject(TournamentsApi);
  private readonly router = inject(Router);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  tournament = signal<Tournament | null>(null);
  rounds = signal<BracketRound[]>([]);
  groups = signal<GroupSummary[]>([]);
  enrolled = signal<Enrollment[]>([]);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  lastUpdate = signal<Date | null>(null);

  hasBracket = computed(() => this.rounds().length > 0);
  progress = computed(() => {
    const all = this.rounds().flatMap((r) => r.matches);
    return { total: all.length, finished: all.filter((m) => m.status === 'finished').length, live: all.filter((m) => m.status === 'in_progress').length };
  });
  teamName = computed(() => new Map(this.enrolled().map((e) => [e.team_id, e.name])));

  // ── Diálogo de generar ────────────────────────────────────────────────────
  genVisible = false;
  readonly sourceOptions = [
    { label: 'Desde grupos', value: 'groups' },
    { label: 'Siembra directa', value: 'teams' },
  ];
  genSource: 'groups' | 'teams' = 'teams';
  genQualifiers = 2;
  genForce = false;
  seeds: SeedTeam[] = [];
  genPreview = signal<BracketPlanResult | null>(null);
  genError = signal('');

  private poller?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.load();
    this.poller = setInterval(() => {
      if (!this.busy() && !this.genVisible && this.hasBracket()) this.load(true);
    }, POLL_MS);
  }

  ngOnDestroy(): void {
    clearInterval(this.poller);
  }

  load(silent = false): void {
    if (!silent) this.loading.set(true);
    forkJoin({
      tournaments: this.tournamentsApi.list(),
      bracket: this.api.get(this.tournamentId),
      groups: this.api.groups(this.tournamentId),
      enrolled: this.tournamentsApi.enrolled(this.tournamentId),
    }).subscribe({
      next: (res) => {
        this.tournament.set(res.tournaments.data.find((t) => t.id === this.tournamentId) ?? null);
        this.rounds.set(res.bracket.data);
        this.groups.set(res.groups.data);
        this.enrolled.set(res.enrolled.data);
        this.lastUpdate.set(new Date());
        this.error.set('');
        this.loading.set(false);
      },
      error: (err) => {
        if (!silent) this.error.set(apiErrorMessage(err, 'No se pudo cargar la eliminatoria'));
        this.loading.set(false);
      },
    });
  }

  openMatch(m: BracketMatch): void {
    this.router.navigate(['/admin/torneos', this.tournamentId, 'partidos', m.id]);
  }

  // ── Generar ───────────────────────────────────────────────────────────────
  openGenerate(): void {
    this.genSource = this.groups().length > 0 ? 'groups' : 'teams';
    this.genForce = false;
    this.genPreview.set(null);
    this.genError.set('');
    this.seedByEnrollment();
    this.genVisible = true;
  }

  seedByEnrollment(): void {
    this.seeds = this.enrolled()
      .filter((e) => e.enrollment_status === 'confirmed')
      .sort((a, b) => a.enrollment_id - b.enrollment_id)
      .map((e) => ({ team_id: e.team_id, name: e.name, included: true }));
    this.genPreview.set(null);
  }

  /** Ordena la siembra según la tabla de posiciones (útil en ligas: el 1º es el seed 1) */
  seedByStandings(): void {
    this.api.standings(this.tournamentId).subscribe({
      next: (res) => {
        const rank = new Map(res.data.map((s, i) => [s.team_id, i]));
        this.seeds = [...this.seeds].sort((a, b) => (rank.get(a.team_id) ?? 999) - (rank.get(b.team_id) ?? 999));
        this.genPreview.set(null);
      },
      error: (err) => this.toast.add({ severity: 'error', summary: 'No se pudo leer la tabla', detail: apiErrorMessage(err) }),
    });
  }

  seedRandom(): void {
    const s = [...this.seeds];
    for (let i = s.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [s[i], s[j]] = [s[j], s[i]];
    }
    this.seeds = s;
    this.genPreview.set(null);
  }

  /** Deja incluidos solo los primeros N (p. ej. los 8 mejores de la tabla) */
  includeTop(n: number): void {
    this.seeds = this.seeds.map((s, i) => ({ ...s, included: i < n }));
    this.genPreview.set(null);
  }

  dropSeed(event: CdkDragDrop<SeedTeam[]>): void {
    moveItemInArray(this.seeds, event.previousIndex, event.currentIndex);
    this.seeds = [...this.seeds];
    this.genPreview.set(null);
  }

  includedCount(): number {
    return this.seeds.filter((s) => s.included).length;
  }

  /** Posición de siembra (1, 2, 3...) contando solo los incluidos */
  seedNumber(index: number): number | null {
    return this.seeds[index].included ? this.seeds.slice(0, index + 1).filter((s) => s.included).length : null;
  }

  private options(dryRun: boolean) {
    return {
      source: this.genSource,
      qualifiers_per_group: this.genSource === 'groups' ? this.genQualifiers : undefined,
      team_ids: this.genSource === 'teams' ? this.seeds.filter((s) => s.included).map((s) => s.team_id) : undefined,
      dry_run: dryRun,
      replace: this.hasBracket(),
      force: this.genForce,
    };
  }

  preview(): void {
    this.busy.set(true);
    this.genError.set('');
    this.api.generate(this.tournamentId, this.options(true)).subscribe({
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
      this.api.generate(this.tournamentId, this.options(false)).subscribe({
        next: (res) => {
          this.busy.set(false);
          this.genVisible = false;
          this.toast.add({ severity: 'success', summary: 'Cuadro generado', detail: `${res.data.size} posiciones · ${res.data.byes.length} pases directos` });
          this.load();
        },
        error: (err) => {
          this.busy.set(false);
          this.genError.set(apiErrorMessage(err));
        },
      });
    };
    if (this.hasBracket()) {
      this.confirm.confirm({
        header: 'Reemplazar cuadro',
        message: 'Ya existe un cuadro sin partidos jugados. Se borrará y se generará de nuevo. ¿Continuar?',
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

  /** Función flecha: la plantilla la pasa a .map() sin perder `this` */
  name = (teamId: number | null): string =>
    teamId === null ? 'Por definir' : this.teamName().get(teamId) ?? `Equipo ${teamId}`;
}
