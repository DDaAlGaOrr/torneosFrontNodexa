import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { AuthService } from '../../admin/auth/auth/service/auth.service';
import { URL_API } from '../../environment/environment';

export type LiveStatus = 'offline' | 'connecting' | 'live';

/** Aviso del servidor: algo cambió en la liga (marcador, resultado, calendario, llaves...) */
export interface LiveChange {
  kind: string;
  tournament_id?: number;
  match_id?: number;
  at: string;
}

/** Espera máxima entre reintentos de conexión */
const MAX_RETRY_MS = 30000;

/**
 * Canal de avisos en vivo (Server-Sent Events) del servidor.
 * Se usa fetch en lugar de EventSource para mandar el token en la cabecera Authorization
 * (EventSource no permite cabeceras y el token no debe ir en la URL).
 * Varias pantallas pueden compartir la conexión: connect() / release() llevan la cuenta.
 */
@Injectable({ providedIn: 'root' })
export class LiveService implements OnDestroy {
  private readonly auth = inject(AuthService);

  readonly status = signal<LiveStatus>('offline');
  readonly changes$ = new Subject<LiveChange>();

  private users = 0;
  private abort?: AbortController;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private attempts = 0;

  connect(): void {
    this.users++;
    if (this.users === 1) this.open();
  }

  release(): void {
    this.users = Math.max(0, this.users - 1);
    if (this.users === 0) this.close();
  }

  ngOnDestroy(): void {
    this.close();
  }

  private close(): void {
    clearTimeout(this.retryTimer);
    this.abort?.abort();
    this.abort = undefined;
    this.status.set('offline');
  }

  private async open(): Promise<void> {
    const token = this.auth.getToken();
    if (!token) return;
    this.status.set('connecting');
    const abort = new AbortController();
    this.abort = abort;

    try {
      const res = await fetch(`${URL_API}/dashboard/stream`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
        signal: abort.signal,
      });
      if (res.status === 401) {
        // Sesión vencida: el resto de la app ya maneja el cierre de sesión
        this.status.set('offline');
        return;
      }
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let end: number;
        while ((end = buffer.indexOf('\n\n')) >= 0) {
          this.handleBlock(buffer.slice(0, end));
          buffer = buffer.slice(end + 2);
        }
      }
      throw new Error('El servidor cerró la conexión');
    } catch {
      if (abort.signal.aborted || this.users === 0) return;
      this.status.set('offline');
      this.scheduleRetry();
    }
  }

  private handleBlock(block: string): void {
    const event = /^event: (.*)$/m.exec(block)?.[1];
    const data = /^data: (.*)$/m.exec(block)?.[1];
    if (event === 'hello') {
      this.attempts = 0;
      this.status.set('live');
    } else if (event === 'change' && data) {
      try {
        this.changes$.next(JSON.parse(data));
      } catch {
        /* aviso mal formado: se ignora */
      }
    }
  }

  /** Reintento con espera creciente: 1 s, 2 s, 4 s... hasta 30 s */
  private scheduleRetry(): void {
    clearTimeout(this.retryTimer);
    const wait = Math.min(MAX_RETRY_MS, 1000 * 2 ** this.attempts++);
    this.retryTimer = setTimeout(() => {
      if (this.users > 0) this.open();
    }, wait);
  }
}
