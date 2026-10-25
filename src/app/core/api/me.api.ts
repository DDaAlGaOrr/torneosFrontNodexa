import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { URL_API } from '../../environment/environment';
import { ApiResponse } from './api-response';
import { MatchStatus } from './matches.api';

export interface CoachTeam {
  id: number;
  name: string;
  short_name: string | null;
  primary_color: string | null;
  category_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  captain_name: string | null;
  players_count: number;
}

export interface TeamStandingSummary {
  tournament_id: number;
  tournament_name: string;
  status: string;
  format: string;
  group_name: string | null;
  teams_in_group: number;
  position: number | null;
  PJ: number;
  PG: number;
  PE: number;
  PP: number;
  GF: number;
  GC: number;
  DG: number;
  Puntos: number;
}

export interface TeamMatchSummary {
  id: number;
  tournament_id: number;
  tournament_name: string;
  status: MatchStatus;
  scheduled_local: string | null;
  round_name: string;
  field_name: string | null;
  maps_url: string | null;
  is_home: boolean;
  rival_name: string | null;
  rival_color: string | null;
  penalties_home: number | null;
  penalties_away: number | null;
  /** Solo en resultados */
  own_score?: number;
  rival_score?: number;
  result?: 'G' | 'E' | 'P';
}

export interface PendingSanction {
  id: number;
  reason: string;
  matches_suspended: number;
  player_id: number;
  player_name: string;
  jersey_number: string | null;
  tournament_name: string;
}

export interface TeamOverview {
  team: CoachTeam;
  standings: TeamStandingSummary[];
  upcoming: TeamMatchSummary[];
  recent: TeamMatchSummary[];
  sanctions: PendingSanction[];
}

/** Panel del usuario que inició sesión (entrenador) */
@Injectable({ providedIn: 'root' })
export class MeApi {
  private readonly http = inject(HttpClient);

  teams(): Observable<ApiResponse<CoachTeam[]>> {
    return this.http.get<ApiResponse<CoachTeam[]>>(`${URL_API}/me/teams`);
  }
  overview(teamId: number): Observable<ApiResponse<TeamOverview>> {
    return this.http.get<ApiResponse<TeamOverview>>(`${URL_API}/me/teams/${teamId}/overview`);
  }
}
