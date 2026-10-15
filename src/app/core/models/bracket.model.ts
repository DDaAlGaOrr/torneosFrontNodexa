export type BracketType = 'winners' | 'losers' | 'championship';

export interface Team {
  id: string;
  name: string;
  logoUrl: string;
}

export interface Match {
  id: string;
  team1?: Team | null;
  team2?: Team | null;

  score1?: number | null;
  score2?: number | null;

  isFinished?: boolean;

  winnerTo?: string;
  loserTo?: string;

  isChampionship?: boolean;

  bracketType: BracketType; // ✅ CLAVE
}

export interface Bracket {
  winners: Match[][];
  losers: Match[][];
  championship: Match[];
}
