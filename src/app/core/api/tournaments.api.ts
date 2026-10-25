import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { URL_API } from '../../environment/environment';
import { ApiResponse, MessageResponse } from './api-response';

export type TournamentFormat = 'bracket' | 'groups_knockout' | 'league' | 'mixed';
export type TournamentStatus = 'draft' | 'registration' | 'in_progress' | 'finished' | 'archived' | 'cancelled';

export interface Tournament {
  id: number;
  name: string;
  description: string | null;
  format: TournamentFormat;
  status: TournamentStatus;
  max_teams: number;
  /** AAAA-MM-DD */
  start_date: string | null;
  end_date: string | null;
  sport_id: number;
  sport_name: string;
  sport_slug: string;
  category_id: number | null;
  category_name: string | null;
  /** Equipos con inscripción confirmada */
  teams_count: number;
}

export interface TournamentPayload {
  name: string;
  sport_id: number;
  category_id: number | null;
  format: TournamentFormat;
  max_teams: number;
  description: string;
  start_date: string | null;
  end_date: string | null;
  /** Solo al editar */
  status?: TournamentStatus;
}

export interface Enrollment {
  enrollment_id: number;
  team_id: number;
  name: string;
  short_name: string | null;
  logo_url: string | null;
  payment_status: 'pending' | 'partial' | 'paid' | null;
  enrollment_status: 'pending' | 'confirmed' | 'withdrawn';
}

export const FORMAT_LABELS: Record<TournamentFormat, string> = {
  bracket: 'Eliminación directa',
  groups_knockout: 'Grupos + eliminatoria',
  league: 'Liga (todos contra todos)',
  mixed: 'Mixto',
};

export const STATUS_LABELS: Record<TournamentStatus, string> = {
  draft: 'Borrador',
  registration: 'Inscripciones abiertas',
  in_progress: 'En juego',
  finished: 'Finalizado',
  archived: 'Archivado',
  cancelled: 'Cancelado',
};

@Injectable({ providedIn: 'root' })
export class TournamentsApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${URL_API}/tournaments`;

  list(): Observable<ApiResponse<Tournament[]>> {
    return this.http.get<ApiResponse<Tournament[]>>(this.url);
  }
  create(body: TournamentPayload): Observable<ApiResponse<{ id: number; name: string; status: TournamentStatus }>> {
    return this.http.post<ApiResponse<{ id: number; name: string; status: TournamentStatus }>>(this.url, body);
  }
  /** Al editar se puede enviar solo lo que cambia, pero la pantalla manda el formulario completo. */
  update(id: number, body: Partial<TournamentPayload>): Observable<ApiResponse<MessageResponse>> {
    return this.http.put<ApiResponse<MessageResponse>>(`${this.url}/${id}`, body);
  }
  remove(id: number): Observable<ApiResponse<MessageResponse>> {
    return this.http.delete<ApiResponse<MessageResponse>>(`${this.url}/${id}`);
  }

  enrolled(id: number): Observable<ApiResponse<Enrollment[]>> {
    return this.http.get<ApiResponse<Enrollment[]>>(`${this.url}/${id}/teams`);
  }
  enroll(id: number, teamId: number): Observable<ApiResponse<{ id: number }>> {
    return this.http.post<ApiResponse<{ id: number }>>(`${this.url}/${id}/teams`, { team_id: teamId });
  }
  withdraw(id: number, teamId: number): Observable<ApiResponse<MessageResponse>> {
    return this.http.delete<ApiResponse<MessageResponse>>(`${this.url}/${id}/teams/${teamId}`);
  }
}
