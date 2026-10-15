import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, signal } from '@angular/core';
import { ApiResponse } from 'src/app/interfaces/api.interface';
import { Standings, Tournament } from 'src/app/interfaces/tournament.interface';
import { ResultTableService } from 'src/app/services/result-table.service';
import { TournamentService } from 'src/app/services/tournament.service';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  selector: 'app-soccer-position-table',
  imports: [CommonModule, FormsModule],
  templateUrl: './soccer-position-table.component.html',
  styleUrls: ['./soccer-position-table.component.scss']
})
export class SoccerPositionTableComponent {
  tournamentId: number = 1;
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
    this.tournamentService.getAllTournaments(1).subscribe({
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
