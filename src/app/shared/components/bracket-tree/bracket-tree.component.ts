import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output } from '@angular/core';
import { BracketMatch, BracketRound, BracketTeam } from '../../../core/api/brackets.api';

interface Column {
  name: string;
  /** Posiciones agrupadas de dos en dos (los dos partidos que alimentan al siguiente) */
  pairs: (BracketMatch | null)[][];
}

/** Cuánto dura el resaltado de un equipo que acaba de avanzar o de un ganador nuevo */
const HIGHLIGHT_MS = 2600;

/**
 * Cuadro de eliminatoria en forma de árbol. Se arma desde la final hacia atrás con
 * prev_match_home_id / prev_match_away_id, así los pases directos (byes) dejan un hueco
 * y cada partido queda alineado entre los dos que lo alimentan.
 * Si los enlaces no son consistentes (cuadro armado a mano), muestra las rondas en lista.
 *
 * Animaciones: las rondas aparecen en cascada; cuando llegan datos nuevos, el equipo que
 * avanza a la siguiente ronda y el ganador recién definido se resaltan.
 */
@Component({
  standalone: true,
  selector: 'app-bracket-tree',
  imports: [CommonModule],
  templateUrl: './bracket-tree.component.html',
  styleUrls: ['./bracket-tree.component.scss'],
})
export class BracketTreeComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) rounds: BracketRound[] = [];
  /** Si es true, las tarjetas se pueden pulsar (emite matchClick) */
  @Input() clickable = false;
  @Output() matchClick = new EventEmitter<BracketMatch>();

  columns: Column[] = [];
  /** El árbol no se pudo armar con los enlaces: se muestran las rondas en lista */
  flat = false;
  champion: BracketTeam | null = null;

  /** "matchId|home" de los equipos que acaban de llegar a un partido */
  entered = new Set<string>();
  /** Partidos con ganador recién definido */
  decided = new Set<number>();

  private previousTeams = new Map<string, number | null>();
  private previousWinners = new Map<number, number | null>();
  private firstLoad = true;
  private clearTimer?: ReturnType<typeof setTimeout>;

  ngOnChanges(): void {
    this.build();
    this.detectChanges();
  }

  ngOnDestroy(): void {
    clearTimeout(this.clearTimer);
  }

  private build(): void {
    const rounds = [...this.rounds].sort((a, b) => a.round_order - b.round_order);
    const byId = new Map(rounds.flatMap((r) => r.matches).map((m) => [m.id, m]));
    this.champion = null;
    if (rounds.length === 0) {
      this.columns = [];
      return;
    }

    // De la final hacia atrás
    const slots: (BracketMatch | null)[][] = [];
    slots[rounds.length - 1] = [...rounds[rounds.length - 1].matches];
    for (let k = rounds.length - 2; k >= 0; k--) {
      slots[k] = slots[k + 1].flatMap((m) =>
        m ? [byId.get(m.prev_match_home_id ?? -1) ?? null, byId.get(m.prev_match_away_id ?? -1) ?? null] : [null, null],
      );
    }
    const placed = new Set(slots.flat().filter(Boolean).map((m) => m!.id));
    this.flat = rounds.length > 1 && rounds.some((r) => r.matches.some((m) => !placed.has(m.id)));

    this.columns = rounds.map((r, k) => {
      const list = this.flat ? r.matches : slots[k];
      const pairs: (BracketMatch | null)[][] = [];
      for (let i = 0; i < list.length; i += 2) pairs.push(list.slice(i, i + 2));
      return { name: r.round_name, pairs };
    });

    const finalRound = rounds[rounds.length - 1];
    const final = finalRound.matches.length === 1 ? finalRound.matches[0] : null;
    if (final?.status === 'finished' && final.winner_team_id) {
      this.champion = [final.home_team, final.away_team].find((t) => t?.id === final.winner_team_id) ?? null;
    }
  }

  /** Compara con los datos anteriores para animar solo lo que cambió */
  private detectChanges(): void {
    const teams = new Map<string, number | null>();
    const winners = new Map<number, number | null>();
    for (const m of this.rounds.flatMap((r) => r.matches)) {
      teams.set(`${m.id}|home`, m.home_team?.id ?? null);
      teams.set(`${m.id}|away`, m.away_team?.id ?? null);
      winners.set(m.id, m.winner_team_id);
    }

    if (!this.firstLoad) {
      const entered = new Set<string>();
      const decided = new Set<number>();
      for (const [key, teamId] of teams) {
        if (teamId !== null && this.previousTeams.has(key) && this.previousTeams.get(key) !== teamId) entered.add(key);
      }
      for (const [id, winner] of winners) {
        if (winner !== null && this.previousWinners.has(id) && this.previousWinners.get(id) !== winner) decided.add(id);
      }
      if (entered.size || decided.size) {
        this.entered = entered;
        this.decided = decided;
        clearTimeout(this.clearTimer);
        this.clearTimer = setTimeout(() => {
          this.entered = new Set();
          this.decided = new Set();
        }, HIGHLIGHT_MS);
      }
    }
    this.firstLoad = false;
    this.previousTeams = teams;
    this.previousWinners = winners;
  }

  // ── Presentación ──────────────────────────────────────────────────────────
  side(m: BracketMatch, which: 'home' | 'away') {
    const team = which === 'home' ? m.home_team : m.away_team;
    const score = which === 'home' ? m.score_home : m.score_away;
    const pens = which === 'home' ? m.penalties_home : m.penalties_away;
    const played = m.status === 'finished' || m.status === 'in_progress';
    return {
      team,
      score: played ? score : null,
      pens: m.status === 'finished' ? pens : null,
      winner: !!team && m.winner_team_id === team.id,
      loser: m.status === 'finished' && !!team && m.winner_team_id !== null && m.winner_team_id !== team.id,
      entered: this.entered.has(`${m.id}|${which}`),
      /** Viene de un partido anterior que aún no termina */
      pending: !team && !!(which === 'home' ? m.prev_match_home_id : m.prev_match_away_id),
    };
  }

  /** El partido recibe a algún equipo desde otro partido (si los dos llegaron por pase directo, no lleva línea de entrada) */
  hasFeeder(m: BracketMatch): boolean {
    return !this.flat && (m.prev_match_home_id !== null || m.prev_match_away_id !== null);
  }

  initials(t: BracketTeam): string {
    return (t.short_name || t.name).slice(0, 3).toUpperCase();
  }

  formatWhen(local: string | null): string {
    if (!local) return '';
    const [y, mo, d] = local.slice(0, 10).split('-').map(Number);
    const day = new Date(y, mo - 1, d).toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short' });
    return `${day} · ${local.slice(11, 16)}`;
  }

  /** Por posición: al refrescar no se vuelven a crear columnas ni tarjetas (no se repite la animación de entrada) */
  trackIndex = (i: number) => i;
}
