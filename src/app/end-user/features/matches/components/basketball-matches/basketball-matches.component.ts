import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BasketBracketViewComponent } from '../../../../../shared/components/bracket/basket-bracket-view/basket-bracket-view.component';
import { BasketPositionTableComponent } from '../../../../../shared/components/tables/basket-position-table/basket-position-table.component';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-basketball-matches',
  imports: [
    CommonModule,
    BasketPositionTableComponent,
    BasketBracketViewComponent
  ],
  templateUrl: './basketball-matches.component.html',
  styleUrls: ['./basketball-matches.component.scss']
})
export class BasketballMatchesComponent {

  activeTab: 'posTableView' | 'bracketView' = 'posTableView';

  setTab(tab: 'posTableView' | 'bracketView') {
    this.activeTab = tab;
  }

}
