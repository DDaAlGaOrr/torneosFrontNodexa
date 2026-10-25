import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, UserRole } from '../../admin/auth/auth/service/auth.service';

/**
 * Restringe una ruta a ciertos roles:  { path: 'usuarios', canActivate: [roleGuard], data: { roles: ['admin'] } }
 * Sin sesión -> /login. Con sesión pero sin el rol -> inicio público.
 */
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) return router.createUrlTree(['/login']);

  const allowed: UserRole[] = route.data?.['roles'] ?? [];
  return allowed.length === 0 || auth.hasRole(...allowed) ? true : router.createUrlTree(['/']);
};
