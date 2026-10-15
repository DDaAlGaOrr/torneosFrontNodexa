import { URL_API } from '../environment/environment';
import { Observable } from 'rxjs/internal/Observable';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ApiResponse } from '../interfaces/api.interface';
import { CreateTeam, EditTeam, Team } from '../interfaces/teams.interface';

@Injectable({
    providedIn: 'root'
})

export class TeamsService {
    private readonly httpClient = inject(HttpClient)

    public getAllTeams(): Observable<ApiResponse<Team[]>> {
        return this.httpClient.get<ApiResponse<Team[]>>(`${URL_API}/team`)
    }

    public editTeam(team: EditTeam): Observable<ApiResponse<any>> {
        return this.httpClient.put<ApiResponse<any>>(`${URL_API}/team/${team.id}`, team)
    }

    public deleteTeam(id: number): Observable<ApiResponse<any>> {
        return this.httpClient.delete<ApiResponse<any>>(`${URL_API}/team/${id}`)
    }

    public saveTeam(team: CreateTeam): Observable<ApiResponse<any>> {
        return this.httpClient.post<ApiResponse<any>>(`${URL_API}/team`, team)
    }
}