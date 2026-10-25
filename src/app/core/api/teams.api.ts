import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { URL_API } from '../../environment/environment';
import { ApiResponse, MessageResponse } from './api-response';

export interface TeamCoach {
  id: number;
  name: string;
}

export interface Team {
  id: number;
  name: string;
  short_name: string | null;
  logo_url: string | null;
  primary_color: string | null;
  category_id: number | null;
  category_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  captain_player_id: number | null;
  captain_name: string | null;
  players_count: number;
  coaches: TeamCoach[];
}

/** La API reemplaza todos los datos al editar, por eso siempre se envía el equipo completo. */
export interface TeamPayload {
  name: string;
  category_id: number;
  short_name: string;
  primary_color: string;
  contact_email: string;
  contact_phone: string;
  coach_ids: number[];
}

@Injectable({ providedIn: 'root' })
export class TeamsApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${URL_API}/teams`;

  list(): Observable<ApiResponse<Team[]>> {
    return this.http.get<ApiResponse<Team[]>>(this.url);
  }
  create(body: TeamPayload): Observable<ApiResponse<{ id: number; name: string; category_id: number }>> {
    return this.http.post<ApiResponse<{ id: number; name: string; category_id: number }>>(this.url, body);
  }
  update(id: number, body: TeamPayload): Observable<ApiResponse<MessageResponse>> {
    return this.http.put<ApiResponse<MessageResponse>>(`${this.url}/${id}`, body);
  }
  remove(id: number): Observable<ApiResponse<MessageResponse>> {
    return this.http.delete<ApiResponse<MessageResponse>>(`${this.url}/${id}`);
  }
  /** playerId = null quita al capitán. */
  setCaptain(id: number, playerId: number | null): Observable<ApiResponse<MessageResponse>> {
    return this.http.put<ApiResponse<MessageResponse>>(`${this.url}/${id}/captain`, { player_id: playerId });
  }
}
