import { Injectable } from '@angular/core';
import { Team, Match, Bracket } from '../../core/models/bracket.model';

@Injectable({
  providedIn: 'root',
})
export class TournamentService {
  private teams: Team[] = [
    {
      id: 't1',
      name: 'Paris',
      logoUrl:
        'https://brandlogos.net/wp-content/uploads/2021/10/paris_saint-germain_gradients-logo_brandlogos.net_gileg-300x299.png',
    },
    {
      id: 't2',
      name: 'Monaco',
      logoUrl:
        'https://brandlogos.net/wp-content/uploads/2018/11/AS-Monaco-FC-300x519.png',
    },
    {
      id: 't3',
      name: 'Juventus',
      logoUrl:
        'https://brandlogos.net/wp-content/uploads/2014/10/juventus_fc_2004-2017-logo_brandlogos.net_nnnby-300x489.png',
    },
    {
      id: 't4',
      name: 'Galatasaray',
      logoUrl:
        'https://brandlogos.net/wp-content/uploads/2012/12/galatasaray-logo-vector-200x200.png',
    },
    {
      id: 't5',
      name: 'Real Madrid',
      logoUrl:
        'https://brandlogos.net/wp-content/uploads/2021/12/Real-Madrid-CF-logo-300x416.png',
    },
    {
      id: 't6',
      name: 'Benfica',
      logoUrl:
        'https://brandlogos.net/wp-content/uploads/2014/10/sl_benfica-logo_brandlogos.net_luvkq-300x296.png',
    },
    {
      id: 't7',
      name: 'Atalanta',
      logoUrl:
        'https://brandlogos.net/wp-content/uploads/2014/12/atalanta_bc-logo_brandlogos.net_yq22a-300x491.png',
    },
    {
      id: 't8',
      name: 'Dortmund',
      logoUrl:
        'https://brandlogos.net/wp-content/uploads/2014/12/borussia_dortmund-logo_brandlogos.net_etcsv-300x300.png',
    },
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
    const wr1m1: Match = {
      id: 'wr1m1',
      team1: this.teams[0],
      team2: this.teams[7],
      score1: null,
      score2: null,
      isFinished: false,
      winnerTo: 'wr2m1',
      loserTo: 'lr1m1',
      bracketType: 'winners',
    };
    const wr1m2: Match = {
      id: 'wr1m2',
      team1: this.teams[3],
      team2: this.teams[4],
      score1: null,
      score2: null,
      isFinished: false,
      winnerTo: 'wr2m1',
      loserTo: 'lr1m1',
      bracketType: 'winners',
    };
    const wr1m3: Match = {
      id: 'wr1m3',
      team1: this.teams[2],
      team2: this.teams[5],
      score1: null,
      score2: null,
      isFinished: false,
      winnerTo: 'wr2m2',
      loserTo: 'lr1m2',
      bracketType: 'winners',
    };
    const wr1m4: Match = {
      id: 'wr1m4',
      team1: this.teams[1],
      team2: this.teams[6],
      score1: null,
      score2: null,
      isFinished: false,
      winnerTo: 'wr2m2',
      loserTo: 'lr1m2',
      bracketType: 'winners',
    };

    // Winner's Round 2
    const wr2m1: Match = {
      id: 'wr2m1',
      team1: null,
      team2: null,
      score1: null,
      score2: null,
      isFinished: false,
      winnerTo: 'wr3m1',
      loserTo: 'lr2m2',
      bracketType: 'winners',
    };
    const wr2m2: Match = {
      id: 'wr2m2',
      team1: null,
      team2: null,
      score1: null,
      score2: null,
      isFinished: false,
      winnerTo: 'wr3m1',
      loserTo: 'lr2m1',
      bracketType: 'winners',
    };

    // Winner's Round 3 (Winner's Final)
    const wr3m1: Match = {
      id: 'wr3m1',
      team1: null,
      team2: null,
      score1: null,
      score2: null,
      isFinished: false,
      winnerTo: 'champ',
      loserTo: 'lr4m1',
      bracketType: 'winners',
    };

    // Loser's Round 1
    const lr1m1: Match = {
      id: 'lr1m1',
      team1: null,
      team2: null,
      score1: null,
      score2: null,
      isFinished: false,
      winnerTo: 'lr2m1',
      bracketType: 'losers',
    };
    const lr1m2: Match = {
      id: 'lr1m2',
      team1: null,
      team2: null,
      score1: null,
      score2: null,
      isFinished: false,
      winnerTo: 'lr2m2',
      bracketType: 'losers',
    };

    // Loser's Round 2
    const lr2m1: Match = {
      id: 'lr2m1',
      team1: null,
      team2: null,
      score1: null,
      score2: null,
      isFinished: false,
      winnerTo: 'lr3m1',
      bracketType: 'losers',
    };
    const lr2m2: Match = {
      id: 'lr2m2',
      team1: null,
      team2: null,
      score1: null,
      score2: null,
      isFinished: false,
      winnerTo: 'lr3m1',
      bracketType: 'losers',
    };

    // Loser's Round 3
    const lr3m1: Match = {
      id: 'lr3m1',
      team1: null,
      team2: null,
      score1: null,
      score2: null,
      isFinished: false,
      winnerTo: 'lr4m1',
      bracketType: 'losers',
    };

    // Loser's Round 4
    const lr4m1: Match = {
      id: 'lr4m1',
      team1: null,
      team2: null,
      score1: null,
      score2: null,
      isFinished: false,
      winnerTo: 'champ',
      bracketType: 'losers',
    };

    // Championship
    const champ: Match = {
      id: 'champ',
      team1: null,
      team2: null,
      score1: null,
      score2: null,
      isFinished: false,
      isChampionship: true,
      bracketType: 'championship',
    };
    const champReset: Match = {
      id: 'champReset',
      team1: null,
      team2: null,
      score1: null,
      score2: null,
      isFinished: false,
      isChampionship: true,
      bracketType: 'championship',
    };

    return {
      winners: [[wr1m1, wr1m2, wr1m3, wr1m4], [wr2m1, wr2m2], [wr3m1]],
      losers: [[lr1m1, lr1m2], [lr2m1, lr2m2], [lr3m1], [lr4m1]],
      championship: [champ, champReset],
    };
  }

  advanceTeam(
    bracket: Bracket,
    matchId: string,
    winnerTeam: Team,
    loserTeam: Team,
  ) {
    const currentMatch = this.findMatch(bracket, matchId);
    if (!currentMatch || currentMatch.isFinished) return;

    currentMatch.isFinished = true;

    // 🟢 WINNERS BRACKET
    if (currentMatch.bracketType === 'winners') {
      if (currentMatch.winnerTo) {
        this.placeTeamInMatch(bracket, currentMatch.winnerTo, winnerTeam);
      }

      if (currentMatch.loserTo) {
        const target = this.findMatch(bracket, currentMatch.loserTo);

        // SOLO losers bracket recibe
        if (target?.bracketType === 'losers') {
          this.placeTeamInMatch(bracket, currentMatch.loserTo, loserTeam);
        }
      }
    }

    // 🔵 LOSERS BRACKET
    if (currentMatch.bracketType === 'losers') {
      if (currentMatch.winnerTo) {
        const target = this.findMatch(bracket, currentMatch.winnerTo);

        if (
          target?.bracketType === 'losers' ||
          target?.bracketType === 'championship'
        ) {
          this.placeTeamInMatch(bracket, currentMatch.winnerTo, winnerTeam);
        }
      }
    }

    // 🏆 CHAMPIONSHIP
    if (currentMatch.bracketType === 'championship') {
      if (currentMatch.winnerTo) {
        this.placeTeamInMatch(bracket, currentMatch.winnerTo, winnerTeam);
      }
    }
  }

  private findMatch(bracket: Bracket, matchId: string): Match | undefined {
    for (const round of [
      ...bracket.winners,
      ...bracket.losers,
      bracket.championship,
    ]) {
      const m = round.find((m) => m.id === matchId);
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
