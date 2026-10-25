import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { URL_API } from '../../environment/environment';
import { ApiResponse } from './api-response';
import { MatchStatus } from './matches.api';

export interface DashboardMatch {
  id: number;
  tournament_id: number;
  tournament_name: string;
  status: MatchStatus;
  scheduled_local: string | null;
  round_name: string;
  round_type: 'group' | 'bracket';
  field_name: string | null;
  score_home: number;
  score_away: number;
  penalties_home: number | null;
  penalties_away: number | null;
  winner_team_id: number | null;
  home_team_id: number | null;
  home_team: string | null;
  home_color: string | null;
  away_team_id: number | null;
  away_team: string | null;
  away_color: string | null;
}

export interface DashboardCounters {
  teams_total: number;
  teams_enrolled: number;
  players_total: number;
  players_enrolled: number;
  matches_total: number;
  matches_finished: number;
  today_total: number;
  today_finished: number;
  live: number;
  unscheduled: number;
  goals: number;
  yellow_cards: number;
  red_cards: number;
  pending_sanctions: number;
}

export interface DashboardTeamHighlight {
  team_id: number;
  team_name: string;
  primary_color: string | null;
  PJ: number;
  GF: number;
  GC: number;
  fair_play: number;
}

export interface DashboardSummary {
  scope: { tournament_id: number | null; tournaments_count: number };
  tournaments: { id: number; name: string; status: string; format: string; active: boolean }[];
  counters: DashboardCounters;
  live: DashboardMatch[];
  today: DashboardMatch[];
  upcoming: DashboardMatch[];
  recent: DashboardMatch[];
  knockouts: DashboardMatch[];
  top_scorers: { player_id: number; player_name: string; jersey_number: string | null; team_name: string; primary_color: string | null; goals: number; assists: number }[];
  featured: {
    tournament_id: number;
    tournament_name: string | null;
    table: {
      group_id: number | null;
      group_name: string | null;
      total: number;
      standings: { position: number; team_id: number; team_name: string; PJ: number; DG: number; Puntos: number }[];
    }[];
    highlights: {
      most_goals: DashboardTeamHighlight | null;
      least_conceded: DashboardTeamHighlight | null;
      fair_play: DashboardTeamHighlight | null;
    };
    goals_per_round: { round_name: string; matches: number; goals: number }[];
  } | null;
  generated_at: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardApi {
  private readonly http = inject(HttpClient);

  /** Sin torneo: todos los torneos activos de la liga */
  summary(tournamentId: number | null): Observable<ApiResponse<DashboardSummary>> {
    const query = tournamentId ? `?tournament_id=${tournamentId}` : '';
    return this.http.get<ApiResponse<DashboardSummary>>(`${URL_API}/dashboard${query}`);
  }
}
