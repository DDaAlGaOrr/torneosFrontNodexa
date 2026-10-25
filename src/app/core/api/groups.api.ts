import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { URL_API } from '../../environment/environment';
import { ApiResponse, MessageResponse } from './api-response';

export interface GroupTeam {
  team_id: number;
  name: string;
  short_name: string | null;
  logo_url: string | null;
  primary_color: string | null;
}

export interface Group {
  id: number;
  name: string;
  teams: GroupTeam[];
}

export interface GroupStandingRow {
  position: number;
  team_id: number;
  team_name: string;
  PJ: number;
  PG: number;
  PE: number;
  PP: number;
  GF: number;
  GC: number;
  DG: number;
  Puntos: number;
  fair_play: number;
}

export interface GroupStandings {
  group_id: number | null;
  group_name: string | null;
  standings: GroupStandingRow[];
}

@Injectable({ providedIn: 'root' })
export class GroupsApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${URL_API}/tournaments`;

  list(tournamentId: number): Observable<ApiResponse<Group[]>> {
    return this.http.get<ApiResponse<Group[]>>(`${this.url}/${tournamentId}/groups`);
  }
  /** Crea N grupos (Grupo A, B...) y reparte en serpiente a los equipos confirmados sin grupo */
  draw(tournamentId: number, groups: number, shuffle: boolean): Observable<ApiResponse<Group[]>> {
    return this.http.post<ApiResponse<Group[]>>(`${this.url}/${tournamentId}/groups/draw`, { groups, shuffle });
  }
  create(tournamentId: number, name: string): Observable<ApiResponse<Group>> {
    return this.http.post<ApiResponse<Group>>(`${this.url}/${tournamentId}/groups`, { name });
  }
  rename(tournamentId: number, groupId: number, name: string): Observable<ApiResponse<MessageResponse>> {
    return this.http.put<ApiResponse<MessageResponse>>(`${this.url}/${tournamentId}/groups/${groupId}`, { name });
  }
  remove(tournamentId: number, groupId: number): Observable<ApiResponse<MessageResponse>> {
    return this.http.delete<ApiResponse<MessageResponse>>(`${this.url}/${tournamentId}/groups/${groupId}`);
  }
  /** Mete al equipo en el grupo (lo saca del que tenía) */
  moveTeam(tournamentId: number, groupId: number, teamId: number): Observable<ApiResponse<MessageResponse>> {
    return this.http.put<ApiResponse<MessageResponse>>(`${this.url}/${tournamentId}/groups/${groupId}/teams/${teamId}`, {});
  }
  removeTeam(tournamentId: number, groupId: number, teamId: number): Observable<ApiResponse<MessageResponse>> {
    return this.http.delete<ApiResponse<MessageResponse>>(`${this.url}/${tournamentId}/groups/${groupId}/teams/${teamId}`);
  }
  standings(tournamentId: number): Observable<ApiResponse<GroupStandings[]>> {
    return this.http.get<ApiResponse<GroupStandings[]>>(`${this.url}/${tournamentId}/standings/groups`);
  }
}
