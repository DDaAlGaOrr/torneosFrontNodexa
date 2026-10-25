import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from '../../auth/auth/service/auth.service';
import { AdminMenuService } from '../admin-menu.service';

interface UserData {
  name: string,
  role: string,
}

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Superadministrador',
  admin: 'Administrador',
  referee: 'Árbitro',
  coach: 'Entrenador',
  viewer: 'Consulta',
};

@Component({
  standalone: true,
  selector: 'app-topbar',
  imports: [CommonModule, TooltipModule],
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss']
})
export class TopbarComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  readonly menu = inject(AdminMenuService);

  user: UserData = {} as UserData

  /** Título de la pantalla actual: `data.title` de la ruta más profunda (ver admin.routes.ts) */
  pageTitle = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      startWith(null),
      map(() => {
        let r = this.router.routerState.snapshot.root;
        while (r.firstChild) r = r.firstChild;
        return (r.data?.['title'] as string) ?? 'Panel';
      }),
    ),
    { initialValue: 'Panel' },
  );

  ngOnInit() {
    const user = this.authService.getUser();
    if (user) {
      this.user.name = user.name || user.email
      this.user.role = user.role
    }
  }

  get roleLabel(): string {
    return ROLE_LABELS[this.user.role] ?? this.user.role;
  }

  logout() {
    this.authService.logout()
  }

}
