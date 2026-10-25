import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { URL_API } from '../../environment/environment';
import { ApiResponse, MessageResponse } from './api-response';

/** Roles que se gestionan desde este endpoint (el rol viaja en la URL). */
export type ManagedRole = 'coach' | 'referee' | 'admin';

export interface ManagedUser {
  id: number;
  name: string;
  email: string;
  active: number; // 1 = activo, 0 = inactivo
  role: ManagedRole;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
}

export interface UpdateUserPayload {
  name: string;
  email: string;
  active: number;
}

@Injectable({ providedIn: 'root' })
export class UsersApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${URL_API}/users`;

  list(role: ManagedRole): Observable<ApiResponse<ManagedUser[]>> {
    return this.http.get<ApiResponse<ManagedUser[]>>(`${this.url}/${role}`);
  }
  create(role: ManagedRole, body: CreateUserPayload): Observable<ApiResponse<ManagedUser>> {
    return this.http.post<ApiResponse<ManagedUser>>(`${this.url}/${role}`, body);
  }
  update(role: ManagedRole, id: number, body: UpdateUserPayload): Observable<ApiResponse<MessageResponse>> {
    return this.http.put<ApiResponse<MessageResponse>>(`${this.url}/${role}/${id}`, body);
  }
  remove(role: ManagedRole, id: number): Observable<ApiResponse<MessageResponse>> {
    return this.http.delete<ApiResponse<MessageResponse>>(`${this.url}/${role}/${id}`);
  }
  /** Al dejar de ser entrenador sale de sus equipos; al dejar de ser árbitro, de los partidos no finalizados */
  changeRole(role: ManagedRole, id: number, newRole: ManagedRole): Observable<ApiResponse<MessageResponse>> {
    return this.http.put<ApiResponse<MessageResponse>>(`${this.url}/${role}/${id}/role`, { new_role: newRole });
  }
  resetPassword(role: ManagedRole, id: number, password: string): Observable<ApiResponse<MessageResponse>> {
    return this.http.put<ApiResponse<MessageResponse>>(`${this.url}/${role}/${id}/password`, { password });
  }
}
