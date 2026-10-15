import { URL_API } from '../environment/environment';
import { Observable } from 'rxjs/internal/Observable';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ApiResponse } from '../interfaces/api.interface';
import { TournamentBracket } from '../interfaces/brackets.interface';

@Injectable({
    providedIn: 'root'
})

export class BracketService {
    private readonly httpClient = inject(HttpClient)

    public getBracket(tournamentId: number): Observable<TournamentBracket> {
        return this.httpClient.get<TournamentBracket>(`${URL_API}/tournaments/${tournamentId}/bracket`)
    }

    public registerResult(matchId: number, results: any): Observable<TournamentBracket> {
        return this.httpClient.put<TournamentBracket>(`${URL_API}/matches/${matchId}/result`, results)
    }

}