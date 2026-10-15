import { URL_API } from '../environment/environment';
import { Observable } from 'rxjs/internal/Observable';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ApiResponse } from '../interfaces/api.interface';
import { Standings } from '../interfaces/tournament.interface';

@Injectable({
    providedIn: 'root'
})

export class ResultTableService {
    private readonly httpClient = inject(HttpClient)

    public getStanding(tournamentId: number): Observable<ApiResponse<Standings[]>> {
        return this.httpClient.get<ApiResponse<Standings[]>>(`${URL_API}/tournaments/${tournamentId}/standings`)
    }
}