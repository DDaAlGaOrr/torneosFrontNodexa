import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { URL_API } from '../../environment/environment';
import { ApiResponse, MessageResponse } from './api-response';

export interface StatLine {
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
}

export interface PlayerStatsDetail {
  player: {
    id: number;
    name: string;
    jersey_number: string | null;
    position: string | null;
    status: 'active' | 'suspended' | 'inactive';
    team_id: number;
    team_name: string;
    team_color: string | null;
    is_captain: boolean;
  };
  totals: StatLine;
  tournaments: (StatLine & { tournament_id: number; tournament_name: string; tournament_status: string })[];
  events: {
    id: number;
    event_type: 'goal' | 'own_goal' | 'yellow_card' | 'red_card';
    minute: number | null;
    as_assist: boolean;
    match_id: number;
    tournament_id: number;
    tournament_name: string;
    round_name: string;
    scheduled_local: string | null;
    rival_name: string | null;
    score_home: number;
    score_away: number;
    is_home: boolean;
  }[];
  sanctions: Sanction[];
}

/** Fila de goleadores / asistencias / fair play por jugador */
export interface PlayerStatRow extends StatLine {
  player_id: number;
  player_name: string;
  jersey_number: string | null;
  position: string | null;
  team_id: number;
  team_name: string;
  penalty_points?: number;
}

export interface TeamStatRow {
  team_id: number;
  team_name: string;
  primary_color: string | null;
  PJ: number;
  PG: number;
  PE: number;
  PP: number;
  GF: number;
  GC: number;
  DG: number;
  clean_sheets: number;
  yellow_cards: number;
  red_cards: number;
  fair_play: number;
}

export interface GoalkeeperRow {
  player_id: number;
  player_name: string;
  jersey_number: string | null;
  team_id: number;
  team_name: string | null;
  primary_color: string | null;
  PJ: number;
  goals_against: number;
  clean_sheets: number;
  goals_against_avg: number | null;
  /** Cuántos otros porteros comparten los números del equipo */
  shared_with: number;
}

export interface Sanction {
  id: number;
  reason: string;
  matches_suspended: number;
  status: 'pending' | 'served' | 'appealed';
  created_at: string;
  match_id: number | null;
  player_id?: number;
  player_name?: string;
  jersey_number?: string | null;
  team_id?: number;
  team_name?: string;
  tournament_id?: number;
  tournament_name?: string;
}

export const SANCTION_STATUS: Record<Sanction['status'], { label: string; severity: string | undefined }> = {
  pending: { label: 'Pendiente', severity: 'danger' },
  served: { label: 'Cumplida', severity: undefined },
  appealed: { label: 'Apelada', severity: 'warning' },
};

@Injectable({ providedIn: 'root' })
export class StatsApi {
  private readonly http = inject(HttpClient);
  private readonly t = `${URL_API}/tournaments`;

  /** Totales del equipo por torneo (también sirve para saber en qué torneos ha jugado) */
  team(teamId: number): Observable<ApiResponse<(Omit<TeamStatRow, 'yellow_cards' | 'red_cards' | 'fair_play'> & { tournament_id: number; tournament_name: string; top_scorer: { player_id: number; player_name: string; goals: number } | null })[]>> {
    return this.http.get<ApiResponse<any[]>>(`${URL_API}/teams/${teamId}/stats`);
  }
  player(playerId: number): Observable<ApiResponse<PlayerStatsDetail>> {
    return this.http.get<ApiResponse<PlayerStatsDetail>>(`${URL_API}/players/${playerId}/stats`);
  }
  topScorers(tournamentId: number): Observable<ApiResponse<PlayerStatRow[]>> {
    return this.http.get<ApiResponse<PlayerStatRow[]>>(`${this.t}/${tournamentId}/statistics/top-scorers`);
  }
  assists(tournamentId: number): Observable<ApiResponse<PlayerStatRow[]>> {
    return this.http.get<ApiResponse<PlayerStatRow[]>>(`${this.t}/${tournamentId}/statistics/assists`);
  }
  fairPlay(tournamentId: number): Observable<ApiResponse<PlayerStatRow[]>> {
    return this.http.get<ApiResponse<PlayerStatRow[]>>(`${this.t}/${tournamentId}/statistics/fair-play`);
  }
  teams(tournamentId: number): Observable<ApiResponse<TeamStatRow[]>> {
    return this.http.get<ApiResponse<TeamStatRow[]>>(`${this.t}/${tournamentId}/statistics/teams`);
  }
  goalkeepers(tournamentId: number): Observable<ApiResponse<GoalkeeperRow[]>> {
    return this.http.get<ApiResponse<GoalkeeperRow[]>>(`${this.t}/${tournamentId}/statistics/goalkeepers`);
  }
  sanctions(tournamentId: number): Observable<ApiResponse<Sanction[]>> {
    return this.http.get<ApiResponse<Sanction[]>>(`${this.t}/${tournamentId}/sanctions`);
  }
  /** appealed = apelada (puede jugar); pending = quitar la apelación */
  setSanctionStatus(sanctionId: number, status: 'appealed' | 'pending'): Observable<ApiResponse<MessageResponse>> {
    return this.http.put<ApiResponse<MessageResponse>>(`${URL_API}/sanctions/${sanctionId}`, { status });
  }
}
