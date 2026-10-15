import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  standalone: true,
  selector: 'app-end-user-layout',
  imports: [RouterOutlet, NavbarComponent],
  template: `
      <app-navbar></app-navbar>
      <router-outlet></router-outlet>
      <div class="glow-1"></div>
      <div class="glow-2"></div>
      <div class="background-effects">
    </div>
  `,
  styleUrls: ['./end-user-layout.component.scss'],
})
export class EndUserLayoutComponent {}
