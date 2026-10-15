import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Match, Team } from '../../../../../core/models/bracket.model';

@Component({
  standalone: true,
  selector: 'app-match-card',
  imports: [CommonModule],
  templateUrl: './match-card.component.html',
  styleUrls: ['./match-card.component.scss']
})
export class MatchCardComponent {

  @Input() readOnly = false;
  @Input() match!: Match;
  @Output() teamAdvanced = new EventEmitter<{matchId: string, winner: Team, loser: Team}>();

  get isTBD1() { return !this.match.team1; }
  get isTBD2() { return !this.match.team2; }

  isWinner(scoreA: number | null | undefined, scoreB: number | null | undefined): boolean {
    return (scoreA ?? -1) > (scoreB ?? -1);
  }

  advance(team: Team | null, isTeam1: boolean) {
    if (this.readOnly) return;
    if (!team || this.match.isFinished || !this.match.team1 || !this.match.team2) return;

    const winner = team;
    const loser = isTeam1 ? this.match.team2 : this.match.team1;

    this.match.score1 = isTeam1 ? 2 : 1;
    this.match.score2 = isTeam1 ? 1 : 2;

    this.teamAdvanced.emit({ matchId: this.match.id, winner, loser });
  }

}
