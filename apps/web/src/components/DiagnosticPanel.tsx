import React, { useState, useEffect } from 'react';
import { diagnosticsService, type DiagnosticFailure } from '../services/diagnosticsService';
import {
  Bug,
  Database,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Layers,
} from 'lucide-react';

export interface CardHealthData {
  status: string;
  counts: {
    cards: number;
    tokens: number;
    rulings: number;
    cardLocales: number;
  };
  presetDecks: {
    id: string;
    name: string;
    filename: string;
    totalUniqueCards: number;
    existingInDb: number;
    missingInDb: string[];
  }[];
  timestamp: string;
}

export const DiagnosticPanel: React.FC = () => {
  const [isDebug, setIsDebug] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'failures' | 'database'>('failures');
  const [failures, setFailures] = useState<DiagnosticFailure[]>([]);
  const [cardHealth, setCardHealth] = useState<CardHealthData | null>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState<boolean>(false);
  const [expandedDeckId, setExpandedDeckId] = useState<string | null>(null);

  const fetchCardHealth = async () => {
    setIsLoadingHealth(true);
    try {
      const res = await fetch('/api/health/cards');
      if (res.ok) {
        const data = await res.json();
        setCardHealth(data);
      }
    } catch (err) {
      console.warn('[DiagnosticPanel] Error consultando /api/health/cards:', err);
    } finally {
      setIsLoadingHealth(false);
    }
  };

  useEffect(() => {
    setIsDebug(diagnosticsService.isDebugEnabled());
    setFailures(diagnosticsService.getFailures());

    const unsub = diagnosticsService.subscribe(() => {
      setIsDebug(diagnosticsService.isDebugEnabled());
      setFailures(diagnosticsService.getFailures());
    });

    fetchCardHealth();

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
              : 'bg-[#092328]/95 hover:bg-[#12544F] border-[#12544F] text-zinc-200'
          }`}
        >
          <Bug className="w-3.5 h-3.5 text-[#8BBB92]" />
          <span>Diagnóstico (?debug=1)</span>
          <span
            data-testid="diagnostic-failure-count-badge"
            className="px-1.5 py-0.2 bg-black/60 rounded-full text-[10px] font-mono text-[#8BBB92]"
          >
            {failures.length}
          </span>
          <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
        </button>
      ) : (
        <div
          data-testid="diagnostic-panel"
          className="bg-[#092328]/95 border border-[#12544F] rounded-2xl shadow-2xl backdrop-blur-md w-[440px] max-w-[calc(100vw-24px)] max-h-[85vh] flex flex-col text-zinc-200 overflow-hidden ring-1 ring-[#2A835F]/20"
        >
          {/* Header */}
          <div className="px-3 py-2.5 bg-[#040d0f]/90 border-b border-[#12544F] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bug className="w-4 h-4 text-[#8BBB92]" />
              <h4 className="text-xs font-bold text-white tracking-wide">
                Diagnóstico del Sistema (?debug=1)
              </h4>
            </div>
            <div className="flex items-center space-x-1">
              {activeTab === 'failures' && failures.length > 0 && (
                <>
                  <button
                    type="button"
                    data-testid="diagnostic-retry-all-btn"
                    onClick={() => diagnosticsService.retryAll()}
                    className="p-1 hover:bg-[#12544F] rounded text-[#8BBB92] hover:text-white transition-colors cursor-pointer"
                    title="Reintentar todas las cargas fallidas"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    data-testid="diagnostic-clear-btn"
                    onClick={() => diagnosticsService.clear()}
                    className="p-1 hover:bg-[#12544F] rounded text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Limpiar registro"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              {activeTab === 'database' && (
                <button
                  type="button"
                  data-testid="diagnostic-refresh-health-btn"
                  onClick={fetchCardHealth}
                  disabled={isLoadingHealth}
                  className="p-1 hover:bg-[#12544F] rounded text-[#8BBB92] hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                  title="Actualizar estado de la base de datos"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHealth ? 'animate-spin' : ''}`} />
                </button>
              )}
              <button
                type="button"
                data-testid="diagnostic-panel-toggle-close"
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-[#12544F] rounded text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Minimizar panel"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-[#12544F] bg-[#0c2d32]/60 text-xs">
            <button
              type="button"
              data-testid="diagnostic-tab-failures"
              onClick={() => setActiveTab('failures')}
              className={`flex-1 py-1.5 px-3 flex items-center justify-center space-x-1.5 font-medium border-b-2 transition-all cursor-pointer ${
                activeTab === 'failures'
                  ? 'border-[#2A835F] text-[#8BBB92] bg-[#12544F]/40 font-bold'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-[#12544F]/20'
              }`}
            >
              <Bug className="w-3.5 h-3.5 text-rose-400" />
              <span>Cargas / Red</span>
              <span
                data-testid="diagnostic-failure-count"
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full border ${
                  failures.length > 0
                    ? 'bg-rose-950/80 text-rose-300 border-rose-700/60'
                    : 'bg-[#092328] text-zinc-400 border-[#12544F]'
                }`}
              >
                {failures.length}
              </span>
            </button>

            <button
              type="button"
              data-testid="diagnostic-tab-database"
              onClick={() => {
                setActiveTab('database');
                fetchCardHealth();
              }}
              className={`flex-1 py-1.5 px-3 flex items-center justify-center space-x-1.5 font-medium border-b-2 transition-all cursor-pointer ${
                activeTab === 'database'
                  ? 'border-[#2A835F] text-[#8BBB92] bg-[#12544F]/40 font-bold'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-[#12544F]/20'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-[#8BBB92]" />
              <span>Base Local</span>
              <span
                data-testid="diagnostic-card-count-badge"
                className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#12544F] text-[#8BBB92] border border-[#2A835F]"
              >
                {cardHealth?.counts?.cards ?? 0}
              </span>
            </button>
          </div>

          {/* Subheader / Status Bar */}
          <div className="px-3 py-1.5 bg-[#040d0f]/60 border-b border-[#12544F] flex items-center justify-between text-[10px] text-zinc-400">
            {activeTab === 'failures' ? (
              <>
                <span>Cadena: Español → Inglés → Marco</span>
                <span className="text-emerald-400 flex items-center gap-1 font-mono text-[9px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Servidor activo
                </span>
              </>
            ) : (
              <>
                <span>Telemetría: PostgreSQL / Scryfall</span>
                <span className="text-slate-400 font-mono text-[9px]">
                  {cardHealth?.timestamp ? new Date(cardHealth.timestamp).toLocaleTimeString() : '---'}
                </span>
              </>
            )}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[55vh]">
            {activeTab === 'failures' ? (
              failures.length === 0 ? (
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
                    className="bg-[#040d0f] border border-[#12544F] rounded-xl p-2.5 flex flex-col space-y-1.5 hover:border-[#2A835F] transition-all text-xs"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-white truncate max-w-[200px]" title={item.cardName}>
                        {item.cardName || 'Carta Desconocida'}
                      </span>
                      <span
                        data-testid="diagnostic-item-status"
                        className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950/80 border border-rose-800 text-rose-300"
                      >
                        HTTP {item.status}
                      </span>
                    </div>

                    {/* URL */}
                    <div className="flex items-center space-x-1 text-[11px] font-mono text-zinc-400 truncate">
                      <span className="text-zinc-500 select-none">URL:</span>
                      <span
                        data-testid="diagnostic-item-url"
                        className="truncate text-[#8BBB92] hover:underline"
                        title={item.url}
                      >
                        {item.url}
                      </span>
                    </div>

                    {/* Motivo */}
                    <div className="flex items-start space-x-1.5 text-[11px] text-[#8BBB92] bg-[#12544F]/40 border border-[#2A835F]/40 rounded p-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#8BBB92] flex-shrink-0 mt-0.5" />
                      <span data-testid="diagnostic-item-reason" className="leading-tight">
                        {item.reason}
                      </span>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-1 border-t border-[#12544F] text-[10px] text-zinc-500">
                      <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                      <button
                        type="button"
                        data-testid="diagnostic-retry-item-btn"
                        onClick={() => diagnosticsService.retryFailure(item.id)}
                        disabled={item.retried}
                        className="flex items-center space-x-1 px-2 py-0.5 rounded bg-[#0c2d32] hover:bg-[#12544F] text-[#8BBB92] hover:text-white border border-[#12544F] disabled:opacity-40 font-bold transition-all cursor-pointer"
                      >
                        <RefreshCw className="w-2.5 h-2.5" />
                        <span>{item.retried ? 'Reintentado' : 'Reintentar'}</span>
                      </button>
                    </div>
                  </div>
                ))
              )
            ) : (
              /* Database Telemetry View */
              <div data-testid="diagnostic-database-view" className="space-y-3">
                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[#040d0f] border border-[#12544F] rounded-xl p-2.5 flex flex-col">
                    <span className="text-[10px] font-semibold text-zinc-400">Cartas (cards)</span>
                    <span
                      data-testid="diagnostic-metric-cards"
                      className="text-lg font-bold font-mono text-[#8BBB92]"
                    >
                      {cardHealth?.counts?.cards ?? 0}
                    </span>
                  </div>
                  <div className="bg-[#040d0f] border border-[#12544F] rounded-xl p-2.5 flex flex-col">
                    <span className="text-[10px] font-semibold text-zinc-400">Fichas (tokens)</span>
                    <span
                      data-testid="diagnostic-metric-tokens"
                      className="text-lg font-bold font-mono text-[#8BBB92]"
                    >
                      {cardHealth?.counts?.tokens ?? 0}
                    </span>
                  </div>
                  <div className="bg-[#040d0f] border border-[#12544F] rounded-xl p-2.5 flex flex-col">
                    <span className="text-[10px] font-semibold text-zinc-400">Dictámenes (rulings)</span>
                    <span
                      data-testid="diagnostic-metric-rulings"
                      className="text-lg font-bold font-mono text-[#8BBB92]"
                    >
                      {cardHealth?.counts?.rulings ?? 0}
                    </span>
                  </div>
                  <div className="bg-[#040d0f] border border-[#12544F] rounded-xl p-2.5 flex flex-col">
                    <span className="text-[10px] font-semibold text-zinc-400">Locales ES (CardLocale)</span>
                    <span
                      data-testid="diagnostic-metric-locales"
                      className="text-lg font-bold font-mono text-[#8BBB92]"
                    >
                      {cardHealth?.counts?.cardLocales ?? 0}
                    </span>
                  </div>
                </div>

                {/* Preset Decks Status */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300 px-1">
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-sky-400" />
                      Presencia de Mazos Listos en DB
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      {cardHealth?.presetDecks?.length ?? 0} mazos
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {cardHealth?.presetDecks?.map(deck => {
                      const isComplete = deck.existingInDb === deck.totalUniqueCards && deck.totalUniqueCards > 0;
                      const isExpanded = expandedDeckId === deck.id;

                      return (
                        <div
                          key={deck.id}
                          data-testid={`diagnostic-preset-deck-${deck.id}`}
                          className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-2 text-xs flex flex-col space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-white truncate max-w-[220px]" title={deck.name}>
                              {deck.name}
                            </span>
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                                isComplete
                                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                                  : deck.existingInDb > 0
                                  ? 'bg-amber-950/80 text-amber-300 border-amber-700/60'
                                  : 'bg-rose-950/80 text-rose-300 border-rose-700/60'
                              }`}
                            >
                              {deck.existingInDb} / {deck.totalUniqueCards} en DB
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                            <span>{deck.filename}</span>
                            {deck.missingInDb.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setExpandedDeckId(isExpanded ? null : deck.id)}
                                className="text-amber-400 hover:underline cursor-pointer flex items-center gap-0.5"
                              >
                                <span>{deck.missingInDb.length} faltantes</span>
                                {isExpanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                              </button>
                            )}
                          </div>

                          {/* Expanded missing list */}
                          {isExpanded && deck.missingInDb.length > 0 && (
                            <div className="mt-1 pt-1 border-t border-slate-800 text-[10px] font-mono text-rose-300/80 max-h-24 overflow-y-auto space-y-0.5 bg-black/40 p-1.5 rounded">
                              <span className="text-slate-400 font-bold block mb-0.5">Cartas faltantes en DB:</span>
                              {deck.missingInDb.map((cName, idx) => (
                                <div key={idx} className="truncate select-text">
                                  • {cName}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
