import { HttpErrorResponse } from '@angular/common/http';

/**
 * La API responde los errores con distintas formas según dónde se produzcan:
 *  - { status, data: { message } }   (validaciones de los controladores)
 *  - { status: 'error', message }    (errores generales)
 *  - { error: '...' }                (autenticación)
 * Esta función devuelve siempre un texto legible para mostrar al usuario.
 */
export function apiErrorMessage(err: unknown, fallback = 'Ocurrió un error inesperado'): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'No se pudo conectar con el servidor';
    const body: any = err.error;
    const message = body?.data?.message ?? body?.message ?? body?.error;
    if (typeof message === 'string' && message.trim()) return message;
    if (err.status === 403) return 'No tienes permisos para realizar esta acción';
    if (err.status === 404) return 'El registro no existe o ya fue eliminado';
    if (err.status >= 500) return 'Error del servidor. Intenta de nuevo en unos minutos';
  }
  return fallback;
}
