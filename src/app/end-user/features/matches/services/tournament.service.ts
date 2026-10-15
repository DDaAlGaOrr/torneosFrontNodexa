import { Injectable } from '@angular/core';
import { Team, Match, Bracket } from '../../../../core/models/bracket.model';

@Injectable({
  providedIn: 'root'
})
export class TournamentService {
  private teams: Team[] = [
    { id: 't1', name: 'Paris', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a7/Paris_Saint-Germain_F.C..svg/1200px-Paris_Saint-Germain_F.C..svg.png' },
    { id: 't2', name: 'Monaco', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/b/ba/AS_Monaco_FC.svg/1200px-AS_Monaco_FC.svg.png' },
    { id: 't3', name: 'Juventus', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Juventus_FC_2017_icon_%28black%29.svg/1200px-Juventus_FC_2017_icon_%28black%29.svg.png' },
    { id: 't4', name: 'Galatasaray', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Galatasaray_Sports_Club_Logo.png/1200px-Galatasaray_Sports_Club_Logo.png' },
    { id: 't5', name: 'Real Madrid', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/56/Real_Madrid_CF.svg/1200px-Real_Madrid_CF.svg.png' },
    { id: 't6', name: 'Benfica', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a2/S.L._Benfica_logo.svg/1200px-S.L._Benfica_logo.svg.png' },
    { id: 't7', name: 'Atalanta', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/6/66/AtalantaBC.svg/1200px-AtalantaBC.svg.png' },
    { id: 't8', name: 'Dortmund', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Borussia_Dortmund_logo.svg/1200px-Borussia_Dortmund_logo.svg.png' }
  ];

  /**
   * 8-Team Double Elimination Seeded
   *
   * WINNER'S BRACKET:
   *   WR1 (4 matches): 1v8, 4v5, 3v6, 2v7
   *   WR2 (2 matches): W(1v8) vs W(4v5), W(3v6) vs W(2v7)
   *   WR3 (1 match):   Winner's Final
   *
   * LOSER'S BRACKET:
   *   LR1 (2 matches): L(1v8) vs L(4v5)  [A], L(3v6) vs L(2v7)  [B]
   *   LR2 (2 matches): W(A) vs L(WR2-top) [E], W(B) vs L(WR2-bot) [F]
   *   LR3 (1 match):   W(E) vs W(F) [G]
   *   LR4 (1 match):   W(G) vs L(WR3) [H]
   *
   * CHAMPIONSHIP:
   *   Grand Final: W(WR3) vs W(LR4)
   *   Reset (if 1st loss): optional
   */
  getInitialBracket(): Bracket {
    // Winner's Round 1
    const wr1m1: Match = { id: 'wr1m1', team1: this.teams[0], team2: this.teams[7], score1: null, score2: null, isFinished: false, winnerTo: 'wr2m1', loserTo: 'lr1m1' };
    const wr1m2: Match = { id: 'wr1m2', team1: this.teams[3], team2: this.teams[4], score1: null, score2: null, isFinished: false, winnerTo: 'wr2m1', loserTo: 'lr1m1' };
    const wr1m3: Match = { id: 'wr1m3', team1: this.teams[2], team2: this.teams[5], score1: null, score2: null, isFinished: false, winnerTo: 'wr2m2', loserTo: 'lr1m2' };
    const wr1m4: Match = { id: 'wr1m4', team1: this.teams[1], team2: this.teams[6], score1: null, score2: null, isFinished: false, winnerTo: 'wr2m2', loserTo: 'lr1m2' };

    // Winner's Round 2
    const wr2m1: Match = { id: 'wr2m1', team1: null, team2: null, score1: null, score2: null, isFinished: false, winnerTo: 'wr3m1', loserTo: 'lr2m2' };
    const wr2m2: Match = { id: 'wr2m2', team1: null, team2: null, score1: null, score2: null, isFinished: false, winnerTo: 'wr3m1', loserTo: 'lr2m1' };

    // Winner's Round 3 (Winner's Final)
    const wr3m1: Match = { id: 'wr3m1', team1: null, team2: null, score1: null, score2: null, isFinished: false, winnerTo: 'champ', loserTo: 'lr4m1' };

    // Loser's Round 1
    const lr1m1: Match = { id: 'lr1m1', team1: null, team2: null, score1: null, score2: null, isFinished: false, winnerTo: 'lr2m1' };
    const lr1m2: Match = { id: 'lr1m2', team1: null, team2: null, score1: null, score2: null, isFinished: false, winnerTo: 'lr2m2' };

    // Loser's Round 2
    const lr2m1: Match = { id: 'lr2m1', team1: null, team2: null, score1: null, score2: null, isFinished: false, winnerTo: 'lr3m1' };
    const lr2m2: Match = { id: 'lr2m2', team1: null, team2: null, score1: null, score2: null, isFinished: false, winnerTo: 'lr3m1' };

    // Loser's Round 3
    const lr3m1: Match = { id: 'lr3m1', team1: null, team2: null, score1: null, score2: null, isFinished: false, winnerTo: 'lr4m1' };

    // Loser's Round 4
    const lr4m1: Match = { id: 'lr4m1', team1: null, team2: null, score1: null, score2: null, isFinished: false, winnerTo: 'champ' };

    // Championship
    const champ: Match = { id: 'champ', team1: null, team2: null, score1: null, score2: null, isFinished: false, isChampionship: true };
    const champReset: Match = { id: 'champReset', team1: null, team2: null, score1: null, score2: null, isFinished: false, isChampionship: true };

    return {
      winners: [[wr1m1, wr1m2, wr1m3, wr1m4], [wr2m1, wr2m2], [wr3m1]],
      losers: [[lr1m1, lr1m2], [lr2m1, lr2m2], [lr3m1], [lr4m1]],
      championship: [champ, champReset]
    };
  }

  advanceTeam(bracket: Bracket, matchId: string, winnerTeam: Team, loserTeam: Team) {
    let currentMatch = this.findMatch(bracket, matchId);
    if (!currentMatch || currentMatch.isFinished) return;

    currentMatch.isFinished = true;

    // Advance winner
    if (currentMatch.winnerTo) {
      this.placeTeamInMatch(bracket, currentMatch.winnerTo, winnerTeam);
    }

    // Advance loser (to loser's bracket)
    if (currentMatch.loserTo) {
      this.placeTeamInMatch(bracket, currentMatch.loserTo, loserTeam);
    }
  }

  private findMatch(bracket: Bracket, matchId: string): Match | undefined {
    for (const round of [...bracket.winners, ...bracket.losers, bracket.championship]) {
      const m = round.find(m => m.id === matchId);
      if (m) return m;
    }
    return undefined;
  }

  private placeTeamInMatch(bracket: Bracket, matchId: string, team: Team) {
    const match = this.findMatch(bracket, matchId);
    if (!match) return;
    if (!match.team1) match.team1 = team;
    else if (!match.team2 && match.team1.id !== team.id) match.team2 = team;
  }
}
