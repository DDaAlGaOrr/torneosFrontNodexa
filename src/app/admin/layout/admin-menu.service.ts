import { Injectable, signal } from '@angular/core';

/** Estado del menú lateral en móvil/tablet (en escritorio el menú siempre está visible). */
@Injectable({ providedIn: 'root' })
export class AdminMenuService {
  readonly open = signal(false);

  toggle(): void {
    this.open.update((v) => !v);
  }

  close(): void {
    this.open.set(false);
  }
}
