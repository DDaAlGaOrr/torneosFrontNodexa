import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NgSwitch, NgSwitchCase } from '@angular/common';

import { toSignal } from '@angular/core/rxjs-interop';
import { SoccerMatchesComponent } from '../soccer-matches/soccer-matches.component';
import { BasketballMatchesComponent } from '../basketball-matches/basketball-matches.component';
import { VolleyballMatchesComponent } from '../volleyball-matches/volleyball-matches.component';
import { map } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-matches-shell',
  imports: [
    NgSwitch,
    NgSwitchCase,
    SoccerMatchesComponent,
    BasketballMatchesComponent,
    VolleyballMatchesComponent,
  ],
  template: `
    <ng-container [ngSwitch]="sport()">

      <app-soccer-matches *ngSwitchCase="'soccer'" />
      <app-basketball-matches *ngSwitchCase="'basketball'" />
      <app-volleyball-matches *ngSwitchCase="'volleyball'" />

    </ng-container>
  `
})
export class MatchesShellComponent {

  private route = inject(ActivatedRoute);

  // convertir el observable paramMap a signal directamente
  sport = toSignal(
    this.route.paramMap.pipe(
      map(params => params.get('sport'))
    )
  );
}
