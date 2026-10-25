import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { URL_API } from '../../environment/environment';
import { ApiResponse, MessageResponse } from './api-response';

export type MatchStatus = 'scheduled' | 'in_progress' | 'finished' | 'cancelled' | 'postponed';
export type EventType = 'goal' | 'own_goal' | 'yellow_card' | 'red_card' | 'substitution' | 'foul';

/** Fila de GET /tournaments/:id/matches */
export interface MatchRow {
  id: number;
  status: MatchStatus;
  scheduled_at: string | null;
  /** 'AAAA-MM-DD HH:MM' en la hora de la liga (sin conversión de zona horaria) */
  scheduled_local: string | null;
  started_at: string | null;
  finished_at: string | null;
  score_home: number;
  score_away: number;
  penalties_home: number | null;
  penalties_away: number | null;
  winner_team_id: number | null;
  round_id: number;
  round_name: string;
  round_order: number;
  round_type: 'group' | 'bracket';
  group_id: number | null;
  home_team_id: number | null;
  home_team: string | null;
  home_logo: string | null;
  home_color: string | null;
  away_team_id: number | null;
  away_team: string | null;
  away_logo: string | null;
  away_color: string | null;
  field_id: number | null;
  field_name: string | null;
  maps_url: string | null;
  next_match_id: number | null;
}

/** Fila de GET /matches/assigned (partidos del árbitro) */
export interface AssignedMatch {
  id: number;
  tournament_id: number;
  tournament_name: string;
  status: MatchStatus;
  scheduled_at: string | null;
  score_home: number;
  score_away: number;
  referee_role: string;
  round_name: string;
  round_type: 'group' | 'bracket';
  home_team: string | null;
  home_color: string | null;
  away_team: string | null;
  away_color: string | null;
  field_name: string | null;
}

export interface MatchInfo extends Omit<MatchRow, 'round_order' | 'group_id' | 'maps_url'> {
  tournament_id: number;
  tournament_name: string;
  sport_slug: string;
  group_name: string | null;
  home_short: string | null;
  away_short: string | null;
  field_location: string | null;
  maps_url: string | null;
  prev_match_home_id: number | null;
  prev_match_away_id: number | null;
}

export interface RosterPlayer {
  id: number;
  team_id: number;
  name: string;
  jersey_number: string | null;
  position: string | null;
  status: 'active' | 'suspended' | 'inactive';
  photo_url: string | null;
  goals: number;
  yellow_cards: number;
  red_cards: number;
  /** Tiene una sanción pendiente de un partido anterior */
  suspended: boolean;
}

export interface MatchEvent {
  id: number;
  event_type: EventType;
  minute: number | null;
  payload: { sin_bin_minutes?: number } | null;
  created_at: string;
  team_id: number;
  team_name: string;
  player_id: number | null;
  player_name: string | null;
  jersey_number: string | null;
  assist_player_id: number | null;
  assist_player_name: string | null;
}

export interface MatchReferee {
  user_id: number;
  name: string;
  email: string;
  role: string;
}

/** GET /tournaments/:id/matches/:matchId — todo lo necesario para capturar */
export interface MatchDetail {
  match: MatchInfo;
  events: MatchEvent[];
  referees: MatchReferee[];
  home_players: RosterPlayer[];
  away_players: RosterPlayer[];
  rules: { match_duration_minutes: number; yellow_sin_bin_minutes: number; red_card_suspension_matches: number };
  can_capture: boolean;
}

export interface NewEventPayload {
  team_id: number;
  event_type: EventType;
  player_id?: number | null;
  assist_player_id?: number | null;
  minute?: number | null;
}

export interface FinishResult extends MessageResponse {
  winner_team_id: number | null;
  advanced_to_match_id: number | null;
}

export interface Round {
  id: number;
  group_id: number | null;
  name: string;
  round_order: number;
  type: 'group' | 'bracket';
  status: 'pending' | 'in_progress' | 'finished';
}

export interface ScheduleOptions {
  double_round: boolean;
  start_date: string | null;
  days_between_rounds: number;
  times: string[];
  field_ids: number[];
  dry_run: boolean;
  replace: boolean;
}

export interface SchedulePreviewMatch {
  home_team: string | null;
  away_team: string | null;
  group_name: string | null;
  field_name: string | null;
  scheduled_at: string | null;
}

export interface ScheduleResult {
  dry_run: boolean;
  double_round: boolean;
  rounds: number;
  matches: number;
  unscheduled: number;
  warnings: string[];
  preview: { name: string; date: string | null; matches: SchedulePreviewMatch[] }[];
}

/** Cambios que permite el calendario; `force` guarda aunque choque con otro partido. */
export interface MatchSchedulePatch {
  status?: MatchStatus;
  field_id?: number | null;
  scheduled_at?: string | null;
  round_id?: number;
  force?: boolean;
}

export interface ScheduleConflict {
  match_id: number;
  tournament_name: string;
  home_team: string | null;
  away_team: string | null;
  field_name: string | null;
  reason: 'field' | 'team';
}

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  scheduled: 'Programado',
  in_progress: 'En juego',
  finished: 'Finalizado',
  cancelled: 'Cancelado',
  postponed: 'Suspendido',
};

export const MATCH_STATUS_SEVERITY: Record<MatchStatus, string | undefined> = {
  scheduled: 'info',
  in_progress: 'success',
  finished: undefined,
  cancelled: 'danger',
  postponed: 'warning',
};

@Injectable({ providedIn: 'root' })
export class MatchesApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${URL_API}/tournaments`;

  listByTournament(tournamentId: number): Observable<ApiResponse<MatchRow[]>> {
    return this.http.get<ApiResponse<MatchRow[]>>(`${this.url}/${tournamentId}/matches`);
  }
  assigned(): Observable<ApiResponse<AssignedMatch[]>> {
    return this.http.get<ApiResponse<AssignedMatch[]>>(`${URL_API}/matches/assigned`);
  }
  detail(tournamentId: number, matchId: number): Observable<ApiResponse<MatchDetail>> {
    return this.http.get<ApiResponse<MatchDetail>>(`${this.url}/${tournamentId}/matches/${matchId}`);
  }
  addEvent(matchId: number, body: NewEventPayload): Observable<ApiResponse<MatchEvent>> {
    return this.http.post<ApiResponse<MatchEvent>>(`${URL_API}/matches/${matchId}/events`, body);
  }
  removeEvent(matchId: number, eventId: number): Observable<ApiResponse<MessageResponse>> {
    return this.http.delete<ApiResponse<MessageResponse>>(`${URL_API}/matches/${matchId}/events/${eventId}`);
  }
  finish(
    tournamentId: number,
    matchId: number,
    penalties?: { penalties_home: number; penalties_away: number },
  ): Observable<ApiResponse<FinishResult>> {
    return this.http.put<ApiResponse<FinishResult>>(`${this.url}/${tournamentId}/matches/${matchId}/finish`, penalties ?? {});
  }
  reopen(tournamentId: number, matchId: number): Observable<ApiResponse<MessageResponse>> {
    return this.http.put<ApiResponse<MessageResponse>>(`${this.url}/${tournamentId}/matches/${matchId}/reopen`, {});
  }
  update(tournamentId: number, matchId: number, body: MatchSchedulePatch): Observable<ApiResponse<MessageResponse>> {
    return this.http.put<ApiResponse<MessageResponse>>(`${this.url}/${tournamentId}/matches/${matchId}`, body);
  }
  rounds(tournamentId: number): Observable<ApiResponse<Round[]>> {
    return this.http.get<ApiResponse<Round[]>>(`${this.url}/${tournamentId}/rounds`);
  }
  generateSchedule(tournamentId: number, body: ScheduleOptions): Observable<ApiResponse<ScheduleResult>> {
    return this.http.post<ApiResponse<ScheduleResult>>(`${this.url}/${tournamentId}/schedule/generate`, body);
  }
}
