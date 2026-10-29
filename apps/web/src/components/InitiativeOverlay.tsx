import React, { useState, useEffect } from 'react';
import { getCardImageUrl, type RoomState, type GameActionType } from '@mtgc/shared';
import { Dices, Sparkles, Crown } from 'lucide-react';
import { imageLoaderQueue } from '../services/imageLoaderQueue';

interface InitiativeOverlayProps {
  roomState: RoomState;
  localPlayerId: string;
  onAction?: (type: GameActionType, payload: unknown) => void;
}

export const InitiativeOverlay: React.FC<InitiativeOverlayProps> = ({
  roomState,
  localPlayerId,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(15);

  const initiative = roomState.initiative;
  const localPlayer = roomState.players[localPlayerId];
  const isSpectator = localPlayer?.isSpectator ?? false;

  const seatedPlayers = Object.values(roomState.players).filter(p => !p.isSpectator);
  const localHasRolled = initiative?.rolls[localPlayerId] !== undefined;

  // Priority Preloading during Initiative phase (Punto 5):
  // (1) Initial hand (7 cards) and commander in normal version (priority 10)
  // (2) Rest of library in small version (priority 1)
  useEffect(() => {
    const pZones = roomState.playerZones[localPlayerId];
    if (pZones) {
      if (pZones.hand) {
        for (const card of pZones.hand) {
          const url = card.definition?.imageUrlNormal || card.definition?.imageUrlSmall;
          if (url) imageLoaderQueue.enqueue(url, 10);
        }
      }
      if (pZones.command) {
        for (const card of pZones.command) {
          const url = card.definition?.imageUrlNormal || card.definition?.imageUrlSmall;
          if (url) imageLoaderQueue.enqueue(url, 10);
        }
      }
      if (pZones.library) {
        for (const card of pZones.library) {
          const smallUrl = getCardImageUrl(card.definition, { size: 'small' });
          if (smallUrl) imageLoaderQueue.enqueue(smallUrl, 1);
        }
      }
    }
  }, [roomState.playerZones, localPlayerId]);

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

  const isResolved = roomState.status === 'playing' || !!initiative?.resolvedOrder;

  return (
    <div
      data-testid="initiative-overlay"
      className="fixed inset-0 z-50 bg-[#040d0f]/90 backdrop-blur-md flex items-center justify-center p-4 select-none"
    >
      <div className="bg-[#092328] border-2 border-[#12544F] rounded-3xl w-full max-w-2xl p-6 sm:p-7 shadow-2xl space-y-6 relative overflow-hidden text-white">
        {/* Glow accent */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#2A835F]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#2A835F]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#0c2d32] border border-[#12544F] text-[#8BBB92] text-xs font-bold tracking-wide">
            <Dices className="w-4 h-4 text-[#8BBB92]" />
            <span>
              {initiative && initiative.round > 1
                ? `Ronda ${initiative.round} (Desempate)`
                : 'Iniciativa de Commander (D20)'}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-wide">
            {isResolved ? '¡Orden de Turnos Decidido!' : 'Tirada de Iniciativa'}
          </h2>

          {!isResolved ? (
            <p className="text-xs text-zinc-300 flex items-center justify-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#8BBB92]" />
              <span>
                Tirada 100% automática del servidor (CSPRNG). Avanzando en {secondsRemaining}s...
              </span>
            </p>
          ) : (
            <p className="text-xs text-[#8BBB92] flex items-center justify-center space-x-1.5 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-[#8BBB92]" />
              <span>Iniciativa resuelta. Entrando a la mesa de juego...</span>
            </p>
          )}
        </div>

        {/* Status / Local Player Roll Indicator */}
        {!isResolved && (
          <div className="flex flex-col items-center justify-center py-2 space-y-2">
            <div className="flex items-center space-x-3 bg-[#040d0f] border border-[#12544F] px-6 py-3 rounded-2xl shadow-inner">
              <Dices className="w-5 h-5 animate-spin text-[#8BBB92]" />
              <span className="text-sm font-semibold text-zinc-200">
                {initiative?.activeTiedPlayerIds && initiative.activeTiedPlayerIds.length > 0
                  ? `Resolviendo desempate automático (Ronda ${initiative.round})...`
                  : 'El servidor está calculando la iniciativa de todos los jugadores...'}
              </span>
            </div>
            {localHasRolled && !isSpectator && (
              <div className="flex items-center space-x-2 text-xs text-zinc-300">
                <span>Tu tirada de D20:</span>
                <strong className="text-[#8BBB92] font-mono text-sm font-extrabold">
                  🎲 {initiative?.rolls[localPlayerId]}
                </strong>
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
              initiative?.activeTiedPlayerIds && initiative.activeTiedPlayerIds.includes(player.id);

            return (
              <div
                key={player.id}
                className={`border rounded-2xl p-4 flex items-center justify-between transition-all ${
                  isLocal
                    ? 'border-[#8BBB92] ring-1 ring-[#8BBB92]/40 shadow-lg shadow-[#2A835F]/20 bg-[#0c2d32]'
                    : 'border-[#12544F] bg-[#092328]'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-mono font-bold text-zinc-500">#{idx + 1}</span>
                    <span className="font-bold text-sm text-white flex items-center space-x-1">
                      <span>{player.name}</span>
                      {player.isHost && <Crown className="w-3.5 h-3.5 text-[#8BBB92] inline" />}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    {player.selectedDeck?.commanderName || 'Comandante'}
                  </div>
                  {isTied && !isResolved && (
                    <div className="text-[10px] font-bold text-[#8BBB92]">En desempate</div>
                  )}
                </div>

                <div className="flex items-center">
                  {hasRolled ? (
                    <div className="w-12 h-12 rounded-xl bg-[#040d0f] border border-[#12544F] flex flex-col items-center justify-center font-mono font-black text-xl text-[#8BBB92] shadow-inner">
                      {roll}
                    </div>
                  ) : (
                    <div className="px-3 py-1.5 rounded-xl bg-[#040d0f]/60 border border-dashed border-[#12544F] text-[11px] font-semibold text-zinc-500 animate-pulse">
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
          <div className="bg-[#0c2d32] border border-[#12544F] rounded-2xl p-4 space-y-3">
            <div className="text-xs font-bold text-[#8BBB92] flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-[#8BBB92]" />
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
                        ? 'bg-[#2A835F] text-white border-[#349e73] shadow-md shadow-[#2A835F]/25'
                        : 'bg-[#092328] text-zinc-200 border-[#12544F]'
                    }`}
                  >
                    <span className="font-mono">{rank + 1}.º</span>
                    <span>{p?.name || pid}</span>
                    {isFirst && (
                      <span className="text-[10px] font-black uppercase text-[#8BBB92] ml-1">
                        (Juega 1.º)
                      </span>
                    )}
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
