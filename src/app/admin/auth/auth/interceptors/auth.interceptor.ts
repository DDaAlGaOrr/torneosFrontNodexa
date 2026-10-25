import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { URL_API } from '../../../../environment/environment';
import { AuthService } from '../service/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Solo se adjunta el token a peticiones hacia nuestra API (nunca a terceros)
  if (!req.url.startsWith(URL_API)) return next(req);

  const auth = inject(AuthService);
  const token = auth.getToken();
  const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // 401 en cualquier ruta que no sea el login = token vencido o inválido
      if (error.status === 401 && !req.url.endsWith('/auth')) {
        auth.logout();
      }
      return throwError(() => error);
    }),
  );
};
