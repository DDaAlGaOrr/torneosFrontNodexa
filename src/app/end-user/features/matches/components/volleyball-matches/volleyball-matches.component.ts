import { Component } from '@angular/core';
import { VolleyBracketViewComponent } from '../../../../../shared/components/bracket/volley-bracket-view/volley-bracket-view.component';
import { VolleyPositionTableComponent } from '../../../../../shared/components/tables/volley-position-table/volley-position-table.component';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-volleyball-matches',
  imports: [
    CommonModule,
    VolleyBracketViewComponent,
    VolleyPositionTableComponent
  ],
  templateUrl: './volleyball-matches.component.html',
  styleUrls: ['./volleyball-matches.component.scss']
})
export class VolleyballMatchesComponent {

  activeTab: 'posTableView' | 'bracketView' = 'posTableView';

  setTab(tab: 'posTableView' | 'bracketView') {
    this.activeTab = tab;
  }

  activeTabGender: 'masculino' | 'femenino' = 'masculino';

  setTabGender(gender: 'masculino' | 'femenino') {
    this.activeTabGender = gender;
  }

}
