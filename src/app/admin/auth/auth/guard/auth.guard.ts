import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../service/auth.service';

// Guard para rutas que solo requieren estar logueado
export const authGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.isLoggedIn()) return true;

    router.navigate(['/login']);
    return false;
};

// Guard para rutas que requieren acceso a un deporte específico
// El deporte se define en el data de la ruta: { data: { sport: 'soccer' } }
export const sportGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isLoggedIn()) {
        router.navigate(['/login']);
        return false;
    }

    const sport = route.data['sport'] as 'soccer' | 'volleyball' | 'basketball';

    if (authService.canAccessSport(sport)) return true;

    // Sin acceso → redirigir al deporte que sí tiene asignado
    const user = authService.getUser();
    if (user?.sport) {
        router.navigate(['/admin', user.sport, 'tournaments']);
    } else {
        router.navigate(['/admin']);
    }

    return false;
};