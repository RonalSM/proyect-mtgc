import { imageLoaderQueue } from './imageLoaderQueue';

export interface DiagnosticFailure {
  id: string;
  url: string;
  cardName?: string;
  status: number | string;
  reason: string;
  lang?: string;
  timestamp: number;
  retried?: boolean;
}

type DiagnosticsListener = () => void;

class DiagnosticsService {
  private failures: DiagnosticFailure[] = [];
  private listeners: Set<DiagnosticsListener> = new Set();
  private isDebugActive: boolean = false;
  private reportedUrls: Set<string> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      this.isDebugActive = searchParams.get('debug') === '1';

      // Conectar automáticamente con la cola de descarga de imágenes
      imageLoaderQueue.subscribe(() => {
        // Notificación reactiva de cambios en la cola
      });

      (window as any).__mtgc_diagnostics = this;
      window.addEventListener('mtgc:record-diagnostic', (e: any) => {
        if (e.detail) {
          this.recordFailure(e.detail);
        }
      });
    }
  }

  public isDebugEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('debug') === '1' || this.isDebugActive;
  }

  public setDebugEnabled(enabled: boolean): void {
    this.isDebugActive = enabled;
    this.notify();
  }

  public getFailures(): DiagnosticFailure[] {
    return [...this.failures];
  }

  public recordFailure(failure: Omit<DiagnosticFailure, 'id' | 'timestamp'>): void {
    const existing = this.failures.find(f => f.url === failure.url);
    if (existing) {
      existing.status = failure.status;
      existing.reason = failure.reason;
      existing.retried = false;
      this.notify();
      return;
    }

    const newEntry: DiagnosticFailure = {
      ...failure,
      id: `diag_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      retried: false,
    };

    this.failures.unshift(newEntry);
    this.notify();

    // Enviar registro al servidor (Punto 7)
    if (!this.reportedUrls.has(failure.url)) {
      this.reportedUrls.add(failure.url);
      fetch('/api/diagnostics/card-errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardName: failure.cardName || 'Desconocida',
          url: failure.url,
          status: failure.status,
          reason: failure.reason,
          lang: failure.lang || 'es',
          timestamp: newEntry.timestamp,
        }),
      }).catch(err => {
        console.warn('[DiagnosticsService] No se pudo enviar registro al servidor:', err);
      });
    }
  }

  public retryFailure(id: string): void {
    const item = this.failures.find(f => f.id === id);
    if (!item) return;

    item.retried = true;
    if (item.url) {
      imageLoaderQueue.retryUrl(item.url);
    }
    this.notify();
  }

  public retryAll(): void {
    for (const f of this.failures) {
      f.retried = true;
    }
    imageLoaderQueue.retryFailed();
    this.notify();
  }

  public clear(): void {
    this.failures = [];
    this.reportedUrls.clear();
    this.notify();
  }

  public subscribe(listener: DiagnosticsListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach(fn => {
      try {
        fn();
      } catch (err) {
        console.error('[DiagnosticsService] Listener error:', err);
      }
    });
  }
}

export const diagnosticsService = new DiagnosticsService();
