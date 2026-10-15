import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { Standings, Tournament } from 'src/app/interfaces/tournament.interface';
import { ResultTableService } from 'src/app/services/result-table.service'
import { ApiResponse } from 'src/app/interfaces/api.interface';
import { TournamentService } from 'src/app/services/tournament.service';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  selector: 'app-volley-position-table',
  imports: [CommonModule, FormsModule],
  templateUrl: './volley-position-table.component.html',
  styleUrls: ['./volley-position-table.component.scss']
})

export class VolleyPositionTableComponent {
  tournamentId: number = 0;
  standingData: Standings[] = []
  public tournaments = signal<Tournament[]>([]);
  constructor(private resultTableService: ResultTableService, private tournamentService: TournamentService) { }

  ngOnInit() {
    this.loadTable()
    this.loadTournaments()
  }

  loadTable() {
    this.resultTableService.getStanding(this.tournamentId).subscribe({
      next: (response: ApiResponse<Standings[]>) => {
        this.standingData = response.data;

      },
      error: () => {
        /* alert('Algo salio mal') */
      },
    });
  }
  loadTournaments() {
    this.tournamentService.getAllTournaments(2).subscribe({
      next: (response: ApiResponse<Tournament[]>) => {
        this.tournaments.set(response.data)
        console.log(this.tournaments)
      },
      error: (error: HttpErrorResponse) => {

      },
      complete: () => {

      },
    })

  }
}
