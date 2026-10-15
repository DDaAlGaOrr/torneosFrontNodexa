import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SoccerPositionTableComponent } from '../../../../../shared/components/tables/soccer-position-table/soccer-position-table.component';
import { SoccerBracketViewComponent } from '../../../../../shared/components/bracket/soccer-bracket-view/soccer-bracket-view.component';

@Component({
  standalone: true,
  selector: 'app-soccer-matches',
  imports: [
    CommonModule,
    SoccerPositionTableComponent,
    SoccerBracketViewComponent],
  templateUrl: './soccer-matches.component.html',
  styleUrls: ['./soccer-matches.component.scss']
})
export class SoccerMatchesComponent {

  activeTab: 'posTableView' | 'bracketView' = 'posTableView';

  setTab(tab: 'posTableView' | 'bracketView') {
    this.activeTab = tab;
  }

}
