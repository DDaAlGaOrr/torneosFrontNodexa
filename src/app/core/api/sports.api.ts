import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { URL_API } from '../../environment/environment';
import { ApiResponse } from './api-response';

export interface Sport {
  id: number;
  name: string;
  slug: 'soccer' | 'volleyball' | 'basketball';
}

@Injectable({ providedIn: 'root' })
export class SportsApi {
  private readonly http = inject(HttpClient);

  list(): Observable<ApiResponse<Sport[]>> {
    return this.http.get<ApiResponse<Sport[]>>(`${URL_API}/sports`);
  }
}
