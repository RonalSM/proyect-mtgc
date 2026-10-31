/**
 * Colector de errores en tiempo real para reportes de diagnóstico (D1)
 *
 * Mantiene un búfer circular en memoria de los últimos 50 errores de consola,
 * advertencias y excepciones no capturadas, sin persistir datos sensibles.
 */

export interface ErrorLogEntry {
  timestamp: string;
  type: 'error' | 'warn' | 'unhandledrejection';
  message: string;
  stack?: string;
}

const MAX_LOGS = 50;
const errorLogs: ErrorLogEntry[] = [];

if (typeof window !== 'undefined') {
  const origError = console.error;
  const origWarn = console.warn;

  console.error = (...args: unknown[]) => {
    try {
      origError.apply(console, args);
      const msg = args
        .map(a => {
          if (a instanceof Error) return `${a.name}: ${a.message}\n${a.stack || ''}`;
          if (typeof a === 'object') {
            try {
              return JSON.stringify(a);
            } catch {
              return String(a);
            }
          }
          return String(a);
        })
        .join(' ');

      errorLogs.push({
        timestamp: new Date().toISOString(),
        type: 'error',
        message: msg.slice(0, 1000),
      });
      if (errorLogs.length > MAX_LOGS) errorLogs.shift();
    } catch {
      // Evitar que el interceptor falle
    }
  };

  console.warn = (...args: unknown[]) => {
    try {
      origWarn.apply(console, args);
      const msg = args
        .map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a)))
        .join(' ');
      errorLogs.push({
        timestamp: new Date().toISOString(),
        type: 'warn',
        message: msg.slice(0, 500),
      });
      if (errorLogs.length > MAX_LOGS) errorLogs.shift();
    } catch {
      // Ignorar
    }
  };

  window.addEventListener('error', event => {
    errorLogs.push({
      timestamp: new Date().toISOString(),
      type: 'error',
      message: event.message || 'Window error',
      stack: event.error?.stack?.slice(0, 1000),
    });
    if (errorLogs.length > MAX_LOGS) errorLogs.shift();
  });

  window.addEventListener('unhandledrejection', event => {
    const reason = event.reason;
    errorLogs.push({
      timestamp: new Date().toISOString(),
      type: 'unhandledrejection',
      message: String(reason?.message || reason || 'Unhandled promise rejection'),
      stack: reason?.stack?.slice(0, 1000),
    });
    if (errorLogs.length > MAX_LOGS) errorLogs.shift();
  });
}

/**
 * Obtiene una copia inmutable de los errores recopilados
 */
export function getCollectedErrors(): ErrorLogEntry[] {
  return [...errorLogs];
}

/**
 * Limpia el búfer de errores
 */
export function clearCollectedErrors(): void {
  errorLogs.length = 0;
}
