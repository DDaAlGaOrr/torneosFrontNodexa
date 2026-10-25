import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { URL_API } from '../../environment/environment';
import { ApiResponse, MessageResponse } from './api-response';

export type PlayerStatus = 'active' | 'suspended' | 'inactive';

export interface Player {
  id: number;
  name: string;
  jersey_number: string | null;
  position: string | null;
  status: PlayerStatus;
  photo_url: string | null;
}

export interface CreatePlayerPayload {
  name: string;
  jersey_number: string;
  position: string;
}

export interface UpdatePlayerPayload extends CreatePlayerPayload {
  status: PlayerStatus;
}

@Injectable({ providedIn: 'root' })
export class PlayersApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${URL_API}/players`;

  listByTeam(teamId: number): Observable<ApiResponse<Player[]>> {
    return this.http.get<ApiResponse<Player[]>>(`${this.url}/team/${teamId}`);
  }
  create(teamId: number, body: CreatePlayerPayload): Observable<ApiResponse<Player>> {
    return this.http.post<ApiResponse<Player>>(this.url, { team_id: teamId, ...body });
  }
  update(id: number, teamId: number, body: UpdatePlayerPayload): Observable<ApiResponse<MessageResponse>> {
    return this.http.put<ApiResponse<MessageResponse>>(`${this.url}/${id}`, { team_id: teamId, ...body });
  }
  remove(id: number, teamId: number): Observable<ApiResponse<MessageResponse>> {
    return this.http.delete<ApiResponse<MessageResponse>>(`${this.url}/${id}/team/${teamId}`);
  }
}
