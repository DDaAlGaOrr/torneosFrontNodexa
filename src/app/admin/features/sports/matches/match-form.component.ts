import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  Input,
  OnInit,
  ViewChild,
  inject,
  numberAttribute
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as d3 from 'd3';
import { HttpErrorResponse } from '@angular/common/http';

import { BracketService } from 'src/app/services/bracket.service';
import { TournamentBracket, Round, Match } from 'src/app/interfaces/brackets.interface';
import { FormsModule } from '@angular/forms'
import { ActivatedRoute } from '@angular/router';

interface MatchScore {
  scoreHome: number | null;
  scoreAway: number | null;
  isFinished: boolean;
}

@Component({
  standalone: true,
  selector: 'app-soccer-match-form',
  imports: [CommonModule, FormsModule],
  templateUrl: './soccer-match-form.component.html',
  styleUrls: ['./soccer-match-form.component.scss'],
})
export class SoccerMatchFormComponent implements OnInit {
  @Input({ alias: 'id', transform: numberAttribute }) tournamentId: number = 0;
  // ── Estado ────────────────────────────────────────────────────────────────
  currentSport: string = '';
  tournamentData: TournamentBracket | null = null;
  loading = true;
  error: string | null = null;

  scores: Record<number, MatchScore> = {};
  private route = inject(ActivatedRoute);

  private _containerRef!: ElementRef<HTMLDivElement>;
  private _overlayRef!: ElementRef<SVGSVGElement>;

  @ViewChild('bracketContainer')
  set bracketContainer(el: ElementRef<HTMLDivElement>) {
    if (el) {
      this._containerRef = el;
      this.tryDrawLines();
    }
  }

  @ViewChild('linesOverlay')
  set linesOverlay(el: ElementRef<SVGSVGElement>) {
    if (el) {
      this._overlayRef = el;
      this.tryDrawLines();
    }
  }


  private tryDrawLines(): void {
    // Solo intentamos el dibujo si ya tenemos los datos del torneo
    if (this.tournamentData) {
      // Usamos un pequeño retraso para asegurar que Angular terminó de renderizar el HTML
      setTimeout(() => {
        // Verificamos si los elementos ya están en el "mundo real"
        if (this._containerRef && this._overlayRef) {
          this.drawLines();
        }
      }, 100); // 100ms suele ser suficiente para que el DOM se asiente
    }
  }
  // ID del torneo a cargar — cámbialo o recíbelo como @Input()

  private lineDrawn = false;

  constructor(private bracketService: BracketService) { }

  // ── Ciclo de vida ─────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.route.parent?.paramMap.subscribe(params => {
      this.currentSport = params.get('sport') || 'soccer';
    });

    // 2. Cargar el bracket
    this.loadBracket();
  }



  @HostListener('window:resize')
  onResize(): void {
    this.drawLines();
  }

  // ── Carga de datos ────────────────────────────────────────────────────────

  loadBracket(): void {
    this.loading = true;
    this.error = null;

    this.bracketService.getBracket(this.tournamentId).subscribe({
      next: (response: TournamentBracket) => {
        this.tournamentData = response;
        this.initScores(response);
        this.loading = false;
        this.tryDrawLines();
      },
      error: (err: HttpErrorResponse) => {
        this.error = 'No se pudo cargar el bracket. Intenta de nuevo.';
        this.loading = false;
      },
    });
  }

  private initScores(data: TournamentBracket): void {
    for (const round of data.bracket) {
      for (const match of round.matches) {
        this.scores[match.match_id] = {
          scoreHome: match.home?.score ?? null,
          scoreAway: match.away?.score ?? null,
          isFinished: match.status === 'finished',
        };
      }
    }
  }

  // ── Helpers para el template ──────────────────────────────────────────────

  /** Devuelve el nombre del deporte formateado */
  getSportLabel(sport: string): string {
    const labels: Record<string, string> = {
      soccer: 'Fútbol',
      basketball: 'Basketball',
      volleyball: 'Voleibol',
    };
    return labels[sport] ?? sport;
  }

  /** CSS class según el status del partido */
  getMatchStatusClass(match: Match): string {
    const s = this.scores[match.match_id];
    if (s?.isFinished) return 'status-finished';
    return {
      scheduled: 'status-scheduled', in_progress: 'status-live',
      finished: 'status-finished', canceled: 'status-canceled'
    }[match.status] ?? '';
  }

  /** Etiqueta legible del status */
  getMatchStatusLabel(match: Match): string {
    const s = this.scores[match.match_id];
    if (s?.isFinished) return 'Finalizado';
    return {
      scheduled: 'Pendiente', in_progress: 'En vivo',
      finished: 'Finalizado', canceled: 'Cancelado'
    }[match.status] ?? match.status;
  }

  /** True si este equipo ganó el partido */
  isWinner(match: Match, teamId: number): boolean {
    const s = this.scores[match.match_id];
    if (!s?.isFinished || s.scoreHome === null || s.scoreAway === null) return false;
    if (teamId === match.home.team_id) return s.scoreHome > s.scoreAway;
    if (teamId === match.away.team_id) return s.scoreAway > s.scoreHome;
    return false;
  }


  /** ID único del nodo DOM para dibujar líneas D3 */
  nodeId(roundOrder: number, matchId: number): string {
    return `node-r${roundOrder}-m${matchId}`;
  }
  hasBothTeams(match: Match): boolean {
    return !!match.home?.team_id && !!match.away?.team_id;
  }

  canFinish(match: Match): boolean {
    const s = this.scores[match.match_id];
    if (!s || !this.hasBothTeams(match)) return false;
    return s.scoreHome !== null && s.scoreAway !== null &&
      s.scoreHome >= 0 && s.scoreAway >= 0;
  }

  finishMatch(match: Match): void {
    if (!this.canFinish(match)) return;
    const s = this.scores[match.match_id];
    s.isFinished = true;

    for (const round of this.tournamentData!.bracket) {
      const found = round.matches.find(m => m.match_id === match.match_id);
      if (found) {
        found.status = 'finished';
        found.home.score = s.scoreHome;
        found.away.score = s.scoreAway;
        found.winner_team_id = (s.scoreHome! > s.scoreAway!)
          ? found.home.team_id : found.away.team_id;
        break;
      }
    }

    setTimeout(() => this.drawLines(), 50);
    // TODO: conectar endpoint cuando estés listo:
    this.bracketService.registerResult(match.match_id, {
      score_home: s.scoreHome, score_away: s.scoreAway,
    }).subscribe();
  }

  reopenMatch(match: Match): void {
    const s = this.scores[match.match_id];
    if (s) s.isFinished = false;
    for (const round of this.tournamentData!.bracket) {
      const found = round.matches.find(m => m.match_id === match.match_id);
      if (found) { found.status = 'scheduled'; break; }
    }
  }
  // ── Líneas D3 ─────────────────────────────────────────────────────────────

  drawLines(): void {
    if (!this._overlayRef || !this._containerRef || !this.tournamentData) return;

    const svg = d3.select(this._overlayRef.nativeElement);
    svg.selectAll('*').remove();

    const container = this._containerRef.nativeElement;
    svg.attr('width', container.scrollWidth).attr('height', container.scrollHeight);

    const containerRect = container.getBoundingClientRect();
    const g = svg.append('g');

    const rounds = this.tournamentData.bracket;
    // Conectar cada partido de una ronda con el partido correspondiente
    // de la siguiente ronda (el ganador avanza)
    for (let ri = 0; ri < rounds.length - 1; ri++) {
      const currentRound = rounds[ri];
      const nextRound = rounds[ri + 1];

      for (let mi = 0; mi < currentRound.matches.length; mi++) {
        const currentMatch = currentRound.matches[mi];
        const targetIndex = Math.floor(mi / 2);
        const targetMatch = nextRound.matches[targetIndex];

        if (!targetMatch) continue;

        const sourceId = this.nodeId(currentRound.round_order, currentMatch.match_id);
        const targetId = this.nodeId(nextRound.round_order, targetMatch.match_id);

        this.drawConnection(g, sourceId, targetId, containerRect);
      }
    }
  }

  private drawConnection(
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    sourceId: string,
    targetId: string,
    containerRect: DOMRect,
  ): void {
    const sourceEl = document.getElementById(sourceId);
    const targetEl = document.getElementById(targetId);
    if (!sourceEl || !targetEl) return;

    const sRect = sourceEl.getBoundingClientRect();
    const tRect = targetEl.getBoundingClientRect();

    const startX = sRect.right - containerRect.left;
    const startY = sRect.top + sRect.height / 2 - containerRect.top;
    const endX = tRect.left - containerRect.left;
    const endY = tRect.top + tRect.height / 2 - containerRect.top;
    const midX = startX + (endX - startX) / 2;
    const r = 6;

    let d: string;
    if (Math.abs(startY - endY) < 1) {
      d = `M ${startX} ${startY} L ${endX} ${endY}`;
    } else if (endY > startY) {
      d = `M ${startX} ${startY} L ${midX - r} ${startY} A ${r} ${r} 0 0 1 ${midX} ${startY + r} L ${midX} ${endY - r} A ${r} ${r} 0 0 0 ${midX + r} ${endY} L ${endX} ${endY}`;
    } else {
      d = `M ${startX} ${startY} L ${midX - r} ${startY} A ${r} ${r} 0 0 0 ${midX} ${startY - r} L ${midX} ${endY + r} A ${r} ${r} 0 0 1 ${midX + r} ${endY} L ${endX} ${endY}`;
    }

    g.append('path')
      .attr('d', d)
      .attr('fill', 'none')
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 1.5)
      .attr('stroke-linecap', 'round')
      .attr('opacity', 0.6);
  }
}
