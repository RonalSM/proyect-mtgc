import React, { useState, useEffect } from 'react';
import { diagnosticsService, type DiagnosticFailure } from '../services/diagnosticsService';
import { Bug, RefreshCw, Trash2, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const DiagnosticPanel: React.FC = () => {
  const [isDebug, setIsDebug] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [failures, setFailures] = useState<DiagnosticFailure[]>([]);

  useEffect(() => {
    setIsDebug(diagnosticsService.isDebugEnabled());
    setFailures(diagnosticsService.getFailures());

    const unsub = diagnosticsService.subscribe(() => {
      setIsDebug(diagnosticsService.isDebugEnabled());
      setFailures(diagnosticsService.getFailures());
    });

    return unsub;
  }, []);

  if (!isDebug) return null;

  return (
    <div
      data-testid="diagnostic-panel-container"
      className="fixed bottom-3 right-3 z-[9999] font-sans select-text pointer-events-auto"
    >
      {!isOpen ? (
        <button
          type="button"
          data-testid="diagnostic-panel-toggle-open"
          onClick={() => setIsOpen(true)}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-full shadow-2xl text-xs font-bold border transition-all cursor-pointer ${
            failures.length > 0
              ? 'bg-rose-950/90 hover:bg-rose-900 border-rose-500/80 text-rose-200 ring-2 ring-rose-500/30'
              : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-slate-300'
          }`}
        >
          <Bug className="w-3.5 h-3.5 text-rose-400" />
          <span>Diagnóstico (?debug=1)</span>
          <span
            data-testid="diagnostic-failure-count-badge"
            className="px-1.5 py-0.2 bg-black/60 rounded-full text-[10px] font-mono"
          >
            {failures.length}
          </span>
          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
        </button>
      ) : (
        <div
          data-testid="diagnostic-panel"
          className="bg-slate-950/95 border border-slate-700/90 rounded-2xl shadow-2xl backdrop-blur-md w-[420px] max-w-[calc(100vw-24px)] max-h-[80vh] flex flex-col text-slate-200 overflow-hidden"
        >
          {/* Header */}
          <div className="px-3 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bug className="w-4 h-4 text-rose-400" />
              <h4 className="text-xs font-bold text-white tracking-wide">
                Diagnóstico de Carga (?debug=1)
              </h4>
              <span
                data-testid="diagnostic-failure-count"
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  failures.length > 0
                    ? 'bg-rose-950/80 text-rose-300 border-rose-700/60'
                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                }`}
              >
                {failures.length} fallo{failures.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              {failures.length > 0 && (
                <>
                  <button
                    type="button"
                    data-testid="diagnostic-retry-all-btn"
                    onClick={() => diagnosticsService.retryAll()}
                    className="p-1 hover:bg-slate-800 rounded text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                    title="Reintentar todas las cargas fallidas"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    data-testid="diagnostic-clear-btn"
                    onClick={() => diagnosticsService.clear()}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Limpiar registro"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              <button
                type="button"
                data-testid="diagnostic-panel-toggle-close"
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Minimizar panel"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Fallback chain explanation pill */}
          <div className="px-3 py-1.5 bg-slate-900/40 border-b border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
            <span>Cadena: Español → Inglés → Marco</span>
            <span className="text-emerald-400 flex items-center gap-1 font-mono text-[9px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Servidor activo
            </span>
          </div>

          {/* List of failures */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[50vh]">
            {failures.length === 0 ? (
              <div
                data-testid="diagnostic-empty-state"
                className="py-8 flex flex-col items-center justify-center text-center space-y-2 text-slate-500"
              >
                <CheckCircle2 className="w-8 h-8 text-emerald-500/60" />
                <p className="text-xs font-semibold text-slate-400">
                  Cero fallos de carga registrados
                </p>
                <p className="text-[10px] text-slate-500 max-w-[260px]">
                  Todas las cartas y fichas cargaron con éxito o resolvieron sus respaldos correctamente.
                </p>
              </div>
            ) : (
              failures.map(item => (
                <div
                  key={item.id}
                  data-testid="diagnostic-failure-item"
                  className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-col space-y-1.5 hover:border-slate-700 transition-all text-xs"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-white truncate max-w-[200px]" title={item.cardName}>
                      {item.cardName || 'Carta Desconocida'}
                    </span>
                    <span
                      data-testid="diagnostic-item-status"
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950/80 border border-rose-800/80 text-rose-300"
                    >
                      HTTP {item.status}
                    </span>
                  </div>

                  {/* URL */}
                  <div className="flex items-center space-x-1 text-[11px] font-mono text-slate-400 truncate">
                    <span className="text-slate-500 select-none">URL:</span>
                    <span
                      data-testid="diagnostic-item-url"
                      className="truncate text-sky-400 hover:underline"
                      title={item.url}
                    >
                      {item.url}
                    </span>
                  </div>

                  {/* Motivo */}
                  <div className="flex items-start space-x-1.5 text-[11px] text-amber-300/90 bg-amber-950/30 border border-amber-500/20 rounded p-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <span data-testid="diagnostic-item-reason" className="leading-tight">
                      {item.reason}
                    </span>
                  </div>

                  {/* Action Bar */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px] text-slate-500">
                    <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                    <button
                      type="button"
                      data-testid="diagnostic-retry-item-btn"
                      onClick={() => diagnosticsService.retryFailure(item.id)}
                      disabled={item.retried}
                      className="flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 disabled:opacity-40 font-bold transition-all cursor-pointer"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      <span>{item.retried ? 'Reintentado' : 'Reintentar'}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
