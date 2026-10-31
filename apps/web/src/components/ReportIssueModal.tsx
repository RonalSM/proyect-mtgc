import React, { useState, useMemo } from 'react';
import type { RoomState } from '@mtgc/shared';
import { diagnosticsService } from '../services/diagnosticsService';
import { getCollectedErrors } from '../utils/error-collector';
import { Bug, Copy, Download, Check, X, ShieldCheck, Terminal, AlertTriangle } from 'lucide-react';

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomState?: RoomState | null;
  localPlayerId?: string;
}

export const ReportIssueModal: React.FC<ReportIssueModalProps> = ({
  isOpen,
  onClose,
  roomState,
  localPlayerId,
}) => {
  const [copied, setCopied] = useState(false);

  const diagnosticData = useMemo(() => {
    if (!isOpen) return null;

    // Sanitizar últimas 50 acciones del log autoritativo
    const rawLogs = roomState?.logs || [];
    const recentLogs = rawLogs.slice(-50).map(l => ({
      timestamp: l.timestamp,
      playerName: l.playerName,
      actionText: l.actionText,
    }));

    // Cargas fallidas registradas en el servicio de diagnóstico
    const failedCards = diagnosticsService.getFailures().slice(0, 50).map(f => ({
      url: f.url,
      cardName: f.cardName || 'Desconocida',
      status: f.status,
      reason: f.reason,
      timestamp: f.timestamp,
    }));

    // Errores de consola interceptados
    const consoleErrors = getCollectedErrors().slice(-50);

    // Resumen de jugadores sin cartas ocultas ni datos sensibles
    const sanitizedPlayers = roomState?.players
      ? Object.values(roomState.players).map(p => ({
          id: p.id,
          name: p.name,
          seatNumber: p.seatNumber,
          life: p.life,
          isConnected: p.isConnected,
          isHost: p.isHost,
          color: p.color,
          isLocal: p.id === localPlayerId,
        }))
      : [];

    return {
      packageVersion: '1.0',
      generatedAt: new Date().toISOString(),
      app: {
        version: '0.1.0-beta.20261031',
        environment: import.meta.env.MODE || 'production',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
        language: typeof navigator !== 'undefined' ? navigator.language : 'es',
        viewport:
          typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'N/A',
      },
      table: {
        roomCode: roomState?.code || null,
        status: roomState?.status || 'no_room',
        stateVersion: roomState?.version || 0,
        turnNumber: roomState?.turnNumber || 0,
        activePlayerId: roomState?.activePlayerId || null,
        totalPlayers: sanitizedPlayers.length,
        players: sanitizedPlayers,
      },
      recentActions: recentLogs,
      consoleErrors,
      failedCardLoads: failedCards,
    };
  }, [isOpen, roomState, localPlayerId]);

  const jsonString = useMemo(() => {
    if (!diagnosticData) return '';
    return JSON.stringify(diagnosticData, null, 2);
  }, [diagnosticData]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagnostico-mtgc-${roomState?.code || 'global'}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#092328] border-2 border-[#12544F] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl ring-1 ring-[#2A835F]/30 overflow-hidden"
        onClick={e => e.stopPropagation()}
        data-testid="report-issue-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#12544F] bg-[#051316]">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-sm">
              <Bug className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-base text-zinc-100 flex items-center space-x-2">
                <span>Reportar Problema</span>
                <span className="text-[10px] bg-[#12544F] text-[#8BBB92] px-2 py-0.5 rounded-full font-mono">
                  Beta v0.1.0
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Paquete de diagnóstico técnico anonimizado para soporte y depuración.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            data-testid="close-issue-report"
            aria-label="Cerrar modal de reporte de problemas"
            className="text-zinc-200 hover:text-white p-1 rounded-lg hover:bg-[#12544F] transition-colors cursor-pointer"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumen de telemetría */}
        <div className="px-6 py-3 bg-[#0c2d32]/60 border-b border-[#12544F] grid grid-cols-4 gap-2 text-center text-xs">
          <div className="p-2 rounded-lg bg-[#040d0f]/80 border border-[#12544F]/60">
            <div className="text-[10px] uppercase text-zinc-500 font-bold">Mesa</div>
            <div className="font-mono font-bold text-[#8BBB92] truncate">
              {roomState?.code || 'N/A'}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-[#040d0f]/80 border border-[#12544F]/60">
            <div className="text-[10px] uppercase text-zinc-500 font-bold">Versión Estado</div>
            <div className="font-mono font-bold text-zinc-200">
              v{roomState?.version ?? 0}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-[#040d0f]/80 border border-[#12544F]/60">
            <div className="text-[10px] uppercase text-zinc-500 font-bold">Acciones</div>
            <div className="font-mono font-bold text-zinc-200">
              {diagnosticData?.recentActions.length ?? 0} / 50
            </div>
          </div>
          <div className="p-2 rounded-lg bg-[#040d0f]/80 border border-[#12544F]/60">
            <div className="text-[10px] uppercase text-zinc-500 font-bold">Errores / Carga</div>
            <div className="font-mono font-bold text-amber-400">
              {(diagnosticData?.consoleErrors.length ?? 0) + (diagnosticData?.failedCardLoads.length ?? 0)}
            </div>
          </div>
        </div>

        {/* Aviso de privacidad estricta */}
        <div className="px-6 py-2.5 bg-[#040d0f] flex items-center space-x-2 text-[11px] text-zinc-400 border-b border-[#12544F]/40">
          <ShieldCheck className="w-4 h-4 text-[#8BBB92] flex-shrink-0" />
          <span>
            <strong>Privacidad garantizada:</strong> No se incluyen cartas de manos ocultas, contenido de bibliotecas ajenas ni datos personales.
          </span>
        </div>

        {/* Visor de JSON generado */}
        <div className="flex-1 p-6 overflow-y-auto space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center space-x-1.5 font-semibold">
              <Terminal className="w-3.5 h-3.5 text-[#8BBB92]" />
              <span>Contenido del Diagnóstico (JSON)</span>
            </span>
            <span className="text-[10px] font-mono text-zinc-500">
              {jsonString.length} bytes
            </span>
          </div>

          <pre
            data-testid="diagnostic-json-preview"
            className="w-full h-64 p-3 bg-[#040d0f] border border-[#12544F] rounded-xl text-xs font-mono text-zinc-300 overflow-auto select-all leading-relaxed"
          >
            {jsonString}
          </pre>
        </div>

        {/* Footer con botones de acción */}
        <div className="px-6 py-4 bg-[#051316] border-t border-[#12544F] flex items-center justify-between">
          <span className="text-xs text-zinc-400 flex items-center space-x-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Pega este reporte en Discord o GitHub Issues.</span>
          </span>

          <div className="flex items-center space-x-3">
            <button
              data-testid="copy-diagnostic-btn"
              onClick={handleCopy}
              className="flex items-center space-x-2 px-4 py-2 bg-[#12544F] hover:bg-[#2A835F] text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar diagnóstico</span>
                </>
              )}
            </button>

            <button
              data-testid="download-diagnostic-btn"
              onClick={handleDownload}
              className="flex items-center space-x-2 px-4 py-2 bg-[#2A835F] hover:bg-[#349e73] text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Descargar .json</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
