import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PrimeNGConfig } from 'primeng/api';
import { PRIMENG_ES } from './core/ui/primeng-es';

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'sports-tournaments';

  constructor() {
    inject(PrimeNGConfig).setTranslation(PRIMENG_ES);
  }
}
