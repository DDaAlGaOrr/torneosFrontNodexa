import { ApplicationConfig } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';
import { authInterceptor } from './admin/auth/auth/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    // El interceptor agrega el token JWT a cada petición hacia la API y cierra sesión si expira (401)
    provideHttpClient(withInterceptors([authInterceptor])),
    // PrimeNG necesita animaciones (diálogos, mensajes, menús)
    provideAnimations(),
  ],
};
