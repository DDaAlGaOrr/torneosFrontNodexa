import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../admin/auth/auth/service/auth.service';

/** Pantalla de inicio del panel según el rol: admin -> equipos, árbitro -> mis partidos. */
export const homeRedirectGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.hasRole('admin')) return router.createUrlTree(['/admin/equipos']);
  if (auth.hasRole('referee')) return router.createUrlTree(['/admin/mis-partidos']);
  return router.createUrlTree(['/']);
};
