import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { URL_API } from '../../environment/environment';
import { ApiResponse } from './api-response';
import { MatchStatus } from './matches.api';

export interface BracketTeam {
  id: number;
  name: string;
  logo_url: string | null;
  short_name: string | null;
  primary_color: string | null;
}

export interface BracketMatch {
  id: number;
  status: MatchStatus;
  scheduled_local: string | null;
  field_name: string | null;
  score_home: number;
  score_away: number;
  penalties_home: number | null;
  penalties_away: number | null;
  winner_team_id: number | null;
  next_match_id: number | null;
  next_match_position: 'home' | 'away' | null;
  prev_match_home_id: number | null;
  prev_match_away_id: number | null;
  home_team: BracketTeam | null;
  away_team: BracketTeam | null;
}

export interface BracketRound {
  round_id: number;
  round_name: string;
  round_order: number;
  matches: BracketMatch[];
}

export interface GenerateBracketOptions {
  source: 'groups' | 'teams';
  qualifiers_per_group?: number;
  /** Siembra directa: el primero es el seed 1 */
  team_ids?: number[];
  dry_run: boolean;
  replace: boolean;
  force: boolean;
}

export interface BracketPlanResult {
  dry_run: boolean;
  method: string;
  size: number;
  byes: number[];
  rounds: {
    level: number;
    name: string;
    matches: { key: string; home_team_id: number | null; away_team_id: number | null }[];
  }[];
  warnings: string[];
}

export interface GroupSummary {
  id: number;
  name: string;
  teams: { team_id: number; name: string }[];
}

/** Fila de GET /tournaments/:id/standings (ya ordenada por grupo y posición) */
export interface StandingRow {
  team_id: number;
  team_name: string;
  group_id: number | null;
  group_name: string | null;
  PJ: number;
  Puntos: number;
  DG: number;
}

@Injectable({ providedIn: 'root' })
export class BracketsApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${URL_API}/tournaments`;

  get(tournamentId: number): Observable<ApiResponse<BracketRound[]>> {
    return this.http.get<ApiResponse<BracketRound[]>>(`${this.url}/${tournamentId}/brackets`);
  }
  generate(tournamentId: number, body: GenerateBracketOptions): Observable<ApiResponse<BracketPlanResult>> {
    return this.http.post<ApiResponse<BracketPlanResult>>(`${this.url}/${tournamentId}/brackets/generate`, body);
  }
  groups(tournamentId: number): Observable<ApiResponse<GroupSummary[]>> {
    return this.http.get<ApiResponse<GroupSummary[]>>(`${this.url}/${tournamentId}/groups`);
  }
  standings(tournamentId: number): Observable<ApiResponse<StandingRow[]>> {
    return this.http.get<ApiResponse<StandingRow[]>>(`${this.url}/${tournamentId}/standings`);
  }
}
