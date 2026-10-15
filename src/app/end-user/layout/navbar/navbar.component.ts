import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-navbar',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {

  sports: { label: string, route: string }[] = [
    { label: 'Soccer', route: '/soccer' },
    { label: 'Volleyball', route: '/volleyball' },
    { label: 'Basketball', route: '/basketball' }
  ];

}
