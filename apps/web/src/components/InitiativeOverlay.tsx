import React, { useState, useEffect } from 'react';
import type { RoomState, GameActionType } from '@mtgc/shared';
import { Dices, Sparkles, Clock, Crown } from 'lucide-react';

interface InitiativeOverlayProps {
  roomState: RoomState;
  localPlayerId: string;
  onAction: (type: GameActionType, payload: unknown) => void;
}

export const InitiativeOverlay: React.FC<InitiativeOverlayProps> = ({
  roomState,
  localPlayerId,
  onAction,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(15);
  const [isRolling, setIsRolling] = useState(false);

  const initiative = roomState.initiative;
  const localPlayer = roomState.players[localPlayerId];
  const isSpectator = localPlayer?.isSpectator ?? false;

  const seatedPlayers = Object.values(roomState.players).filter(p => !p.isSpectator);
  const pool = initiative?.activeTiedPlayerIds ?? seatedPlayers.map(p => p.id);
  const isLocalInPool = pool.includes(localPlayerId);
  const localHasRolled = initiative?.rolls[localPlayerId] !== undefined;

  // Countdown timer for 15s deadline
  useEffect(() => {
    if (!initiative?.deadlineTimestamp) return;

    const interval = setInterval(() => {
      const remainingMs = initiative.deadlineTimestamp - Date.now();
      const sec = Math.max(0, Math.ceil(remainingMs / 1000));
      setSecondsRemaining(sec);
    }, 200);

    return () => clearInterval(interval);
  }, [initiative?.deadlineTimestamp]);

  const handleRoll = () => {
    if (!isLocalInPool || localHasRolled || isRolling) return;
    setIsRolling(true);
    onAction('ROLL_D20_INITIATIVE', {});
    setTimeout(() => setIsRolling(false), 800);
  };

  const isResolved = roomState.status === 'playing' || !!initiative?.resolvedOrder;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold tracking-wide">
            <Dices className="w-4 h-4" />
            <span>
              {initiative && initiative.round > 1
                ? `Ronda ${initiative.round} (Desempate)`
                : 'Iniciativa de Commander (D20)'}
            </span>
          </div>

          <h2 className="text-2xl font-black text-white tracking-wide">
            {isResolved ? '¡Orden de Turnos Decidido!' : 'Tirada de Iniciativa'}
          </h2>

          {!isResolved && (
            <p className="text-xs text-slate-400 flex items-center justify-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Tiempo restante para tirar: <strong className="text-white">{secondsRemaining}s</strong> (el servidor tira automáticamente al vencer)
              </span>
            </p>
          )}
        </div>

        {/* Local Player Roll CTA */}
        {!isResolved && !isSpectator && isLocalInPool && (
          <div className="flex flex-col items-center justify-center py-2 space-y-2">
            {!localHasRolled ? (
              <button
                onClick={handleRoll}
                disabled={isRolling}
                className="group relative px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-lg rounded-2xl shadow-xl shadow-amber-500/25 transition-all transform hover:scale-105 active:scale-95 flex items-center space-x-3 cursor-pointer"
              >
                <Dices className="w-6 h-6 animate-spin text-slate-950" />
                <span>LANZAR D20</span>
              </button>
            ) : (
              <div className="flex items-center space-x-3 bg-slate-950 border border-emerald-500/30 px-6 py-3 rounded-2xl shadow-inner">
                <span className="text-sm font-semibold text-slate-300">Tu resultado:</span>
                <span className="text-2xl font-black font-mono text-emerald-400 flex items-center space-x-1">
                  <span>🎲</span>
                  <span>{initiative?.rolls[localPlayerId]}</span>
                </span>
              </div>
            )}
          </div>
        )}

        {/* Players Rolls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {seatedPlayers.map((player, idx) => {
            const roll = initiative?.rolls[player.id];
            const hasRolled = roll !== undefined;
            const isLocal = player.id === localPlayerId;
            const isTied =
              initiative?.activeTiedPlayerIds &&
              initiative.activeTiedPlayerIds.includes(player.id);

            return (
              <div
                key={player.id}
                className={`bg-slate-950/80 border rounded-2xl p-4 flex items-center justify-between transition-all ${
                  isLocal ? 'border-amber-500/50 shadow-md shadow-amber-500/5' : 'border-slate-800'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-mono font-bold text-slate-500">
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-sm text-white flex items-center space-x-1">
                      <span>{player.name}</span>
                      {player.isHost && (
                        <Crown className="w-3.5 h-3.5 text-amber-400 inline" />
                      )}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {player.selectedDeck?.commanderName || 'Comandante'}
                  </div>
                  {isTied && !isResolved && (
                    <div className="text-[10px] font-bold text-amber-400">
                      En desempate
                    </div>
                  )}
                </div>

                <div className="flex items-center">
                  {hasRolled ? (
                    <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex flex-col items-center justify-center font-mono font-black text-xl text-amber-300 shadow-inner">
                      {roll}
                    </div>
                  ) : (
                    <div className="px-3 py-1.5 rounded-xl bg-slate-900/60 border border-dashed border-slate-800 text-[11px] font-semibold text-slate-500 animate-pulse">
                      Esperando...
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Final Resolved Order */}
        {isResolved && (
          <div className="bg-slate-950/90 border border-amber-500/30 rounded-2xl p-4 space-y-3">
            <div className="text-xs font-bold text-amber-400 flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4" />
              <span>Orden de Turnos Oficial (de mayor a menor resultado):</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {roomState.turnOrder.map((pid, rank) => {
                const p = roomState.players[pid];
                const isFirst = rank === 0;

                return (
                  <div
                    key={pid}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${
                      isFirst
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                        : 'bg-slate-900 text-slate-200 border-slate-800'
                    }`}
                  >
                    <span className="font-mono">{rank + 1}.º</span>
                    <span>{p?.name || pid}</span>
                    {isFirst && <span className="text-[10px] font-black uppercase">(Juega 1.º)</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
