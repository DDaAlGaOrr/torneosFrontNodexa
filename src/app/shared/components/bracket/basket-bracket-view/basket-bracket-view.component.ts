import { Component, ElementRef, HostListener, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as d3 from 'd3';
import { HttpErrorResponse } from '@angular/common/http';
import { BracketService } from 'src/app/services/bracket.service';
import { TournamentBracket, Match } from 'src/app/interfaces/brackets.interface';
import { TournamentService } from 'src/app/services/tournament.service';
import { ApiResponse } from 'src/app/interfaces/api.interface';
import { Tournament } from 'src/app/interfaces/tournament.interface';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  selector: 'app-basket-bracket-view',
  imports: [CommonModule, FormsModule],
  templateUrl: './basket-bracket-view.component.html',
  styleUrls: ['./basket-bracket-view.component.scss']
})
export class BasketBracketViewComponent {
  tournamentData: TournamentBracket | null = null;
  loading = true;
  error: string | null = null;
  public tournaments = signal<Tournament[]>([]);
  private _containerRef!: ElementRef<HTMLDivElement>;
  private _overlayRef!: ElementRef<SVGSVGElement>;

  @ViewChild('bracketContainer') set bracketContainer(el: ElementRef<HTMLDivElement>) {
    if (el) { this._containerRef = el; this.tryDrawLines(); }
  }

  @ViewChild('linesOverlay') set linesOverlay(el: ElementRef<SVGSVGElement>) {
    if (el) { this._overlayRef = el; this.tryDrawLines(); }
  }

  tournamentId = -1;

  constructor(private bracketService: BracketService, private tournamentService: TournamentService) { }

  ngOnInit(): void {
    this.loadBracket();
    this.loadTournaments()
  }

  @HostListener('window:resize')
  onResize(): void { this.drawLines(); }

  loadBracket(): void {
    this.loading = true;
    this.bracketService.getBracket(this.tournamentId).subscribe({
      next: (response: TournamentBracket) => {
        this.tournamentData = response;
        this.loading = false;
        this.tryDrawLines();
      },
      error: () => {
        this.error = 'No se pudo cargar el torneo.';
        this.loading = false;
      },
    });
  }

  loadTournaments() {
    this.tournamentService.getAllTournaments(3).subscribe({
      next: (response: ApiResponse<Tournament[]>) => {
        this.tournaments.set(response.data)
        console.log(this.tournaments)
      },
      error: (error: HttpErrorResponse) => {

      },
      complete: () => {

      },
    })

  }


  private tryDrawLines(): void {
    if (this.tournamentData) {
      setTimeout(() => {
        if (this._containerRef && this._overlayRef) this.drawLines();
      }, 100);
    }
  }

  // Helpers visuales
  getSportLabel(sport: string): string {
    const labels: Record<string, string> = { soccer: 'Fútbol', basketball: 'Basketball', volleyball: 'Voleibol' };
    return labels[sport] ?? sport;
  }

  getMatchStatusClass(match: Match): string {
    const statusMap: Record<string, string> = {
      scheduled: 'status-scheduled',
      in_progress: 'status-live',
      finished: 'status-finished',
      cancelled: 'status-canceled', // Agregamos esta
      postponed: 'status-postponed' // Opcional: por si tienes partidos pospuestos
    };

    return statusMap[match.status] ?? '';
  }

  getMatchStatusLabel(match: Match): string {
    const labelMap: Record<string, string> = {
      scheduled: 'Pendiente',
      in_progress: 'En curso',
      finished: 'Finalizado',
      cancelled: 'Cancelado',
      postponed: 'Pospuesto'
    };

    return labelMap[match.status] ?? match.status;
  }
  isWinner(match: Match, teamId: number): boolean {
    if (match.status !== 'finished' || !match.winner_team_id) return false;
    return match.winner_team_id === teamId;
  }

  nodeId(roundOrder: number, matchId: number): string {
    return `node-r${roundOrder}-m${matchId}`;
  }

  // Lógica D3 (Se mantiene igual para dibujar las líneas)
  drawLines(): void {
    if (!this._overlayRef || !this._containerRef || !this.tournamentData) return;
    const svg = d3.select(this._overlayRef.nativeElement);
    svg.selectAll('*').remove();
    const container = this._containerRef.nativeElement;
    svg.attr('width', container.scrollWidth).attr('height', container.scrollHeight);
    const containerRect = container.getBoundingClientRect();
    const g = svg.append('g');

    const rounds = this.tournamentData.bracket;
    for (let ri = 0; ri < rounds.length - 1; ri++) {
      for (let mi = 0; mi < rounds[ri].matches.length; mi++) {
        const targetIndex = Math.floor(mi / 2);
        const targetMatch = rounds[ri + 1].matches[targetIndex];
        if (!targetMatch) continue;

        this.drawConnection(g, this.nodeId(rounds[ri].round_order, rounds[ri].matches[mi].match_id),
          this.nodeId(rounds[ri + 1].round_order, targetMatch.match_id), containerRect);
      }
    }
  }

  private drawConnection(g: any, sourceId: string, targetId: string, containerRect: DOMRect): void {
    const sEl = document.getElementById(sourceId);
    const tEl = document.getElementById(targetId);
    if (!sEl || !tEl) return;
    const sR = sEl.getBoundingClientRect();
    const tR = tEl.getBoundingClientRect();
    const startX = sR.right - containerRect.left;
    const startY = sR.top + sR.height / 2 - containerRect.top;
    const endX = tR.left - containerRect.left;
    const endY = tR.top + tR.height / 2 - containerRect.top;
    const midX = startX + (endX - startX) / 2;
    const r = 6;
    let d = Math.abs(startY - endY) < 1 ? `M ${startX} ${startY} L ${endX} ${endY}` :
      endY > startY ? `M ${startX} ${startY} L ${midX - r} ${startY} A ${r} ${r} 0 0 1 ${midX} ${startY + r} L ${midX} ${endY - r} A ${r} ${r} 0 0 0 ${midX + r} ${endY} L ${endX} ${endY}` :
        `M ${startX} ${startY} L ${midX - r} ${startY} A ${r} ${r} 0 0 0 ${midX} ${startY - r} L ${midX} ${endY + r} A ${r} ${r} 0 0 1 ${midX + r} ${endY} L ${endX} ${endY}`;
    g.append('path').attr('d', d).attr('fill', 'none').attr('stroke', '#94a3b8').attr('stroke-width', 1.5).attr('opacity', 0.6);
  }
}
