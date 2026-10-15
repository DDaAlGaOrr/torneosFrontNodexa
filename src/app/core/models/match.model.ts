import { TeamRef } from "./bracket.model";

export interface Match {
  id: string;
  team1: TeamRef | null;
  team2: TeamRef | null;
  score1: number | null;
  score2: number | null;
  isFinished: boolean;
  winnerTo?: string | null;
  loserTo?: string | null;
  isChampionship?: boolean;
}
