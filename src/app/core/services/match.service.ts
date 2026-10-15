import { Injectable } from '@angular/core';
import { Match } from '../models/match.model';

@Injectable({ providedIn: 'root' })
export class MatchService {

  private matches: Match[] = [
    {
      id: 1,
      sport: 'soccer',
      round: 'R1',
      bracket: 'winners',
      teamA: { id: 1, name: 'Team A', coach: 'Juan', playersCount: 11, status: 'active', sport: 'soccer' },
      teamB: { id: 2, name: 'Team B', coach: 'Pedro', playersCount: 11, status: 'active', sport: 'soccer' },
      scoreA: 0,
      scoreB: 0
    }
  ];

  getMatchesBySport(sport: string) {
    return this.matches.filter(m => m.sport === sport);
  }

  updateScore(matchId: number, scoreA: number, scoreB: number) {
    const match = this.matches.find(m => m.id === matchId);
    if (!match) return;

    match.scoreA = scoreA;
    match.scoreB = scoreB;

    if (scoreA > scoreB) match.winner = match.teamA;
    else if (scoreB > scoreA) match.winner = match.teamB;
  }
}
