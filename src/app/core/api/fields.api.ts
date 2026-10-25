import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { URL_API } from '../../environment/environment';
import { ApiResponse, MessageResponse } from './api-response';

export interface Field {
  id: number;
  name: string;
  location: string | null;
  maps_url: string | null;
}

export interface FieldPayload {
  name: string;
  location: string;
  maps_url: string;
}

@Injectable({ providedIn: 'root' })
export class FieldsApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${URL_API}/fields`;

  list(): Observable<ApiResponse<Field[]>> {
    return this.http.get<ApiResponse<Field[]>>(this.url);
  }
  create(body: FieldPayload): Observable<ApiResponse<Field>> {
    return this.http.post<ApiResponse<Field>>(this.url, body);
  }
  update(id: number, body: FieldPayload): Observable<ApiResponse<MessageResponse>> {
    return this.http.put<ApiResponse<MessageResponse>>(`${this.url}/${id}`, body);
  }
  remove(id: number): Observable<ApiResponse<MessageResponse>> {
    return this.http.delete<ApiResponse<MessageResponse>>(`${this.url}/${id}`);
  }
}
