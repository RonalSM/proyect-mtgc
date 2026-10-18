import React, { useState } from 'react';
import type { RoomState, GameActionType } from '@mtgc/shared';
import { CardDisplay } from './CardDisplay';
import { RotateCcw, Check, UserX, Crown, ShieldAlert, Sparkles, Layers } from 'lucide-react';

interface OpeningHandModalProps {
  roomState: RoomState;
  localPlayerId: string;
  onAction: (type: GameActionType, payload: unknown) => void;
}

export const OpeningHandModal: React.FC<OpeningHandModalProps> = ({
  roomState,
  localPlayerId,
  onAction,
}) => {
  const mulligan = roomState.mulligan;
  const localPlayer = roomState.players[localPlayerId];
  const isSpectator = localPlayer?.isSpectator ?? false;
  const isHost = localPlayer?.isHost ?? (roomState.hostId === localPlayerId);

  const currentDecidingId = mulligan?.currentDecidingPlayerId;
  const currentDecidingPlayer = currentDecidingId ? roomState.players[currentDecidingId] : null;
  const isMyDecisionTurn = currentDecidingId === localPlayerId;

  const myMulligan = mulligan?.players[localPlayerId];
  const myHasKept = myMulligan?.hasKept ?? false;
  const cardsToBottomCount = myMulligan?.cardsToBottomCount ?? 0;

  const localHand = roomState.playerZones[localPlayerId]?.hand || [];

  const [selectedBottomCardIds, setSelectedBottomCardIds] = useState<string[]>([]);

  const handleToggleCardSelection = (cardId: string) => {
    if (!isMyDecisionTurn || myHasKept || cardsToBottomCount === 0) return;

    if (selectedBottomCardIds.includes(cardId)) {
      setSelectedBottomCardIds(prev => prev.filter(id => id !== cardId));
    } else {
      if (selectedBottomCardIds.length < cardsToBottomCount) {
        setSelectedBottomCardIds(prev => [...prev, cardId]);
      }
    }
  };

  const handleMulligan = () => {
    if (!isMyDecisionTurn || myHasKept) return;
    setSelectedBottomCardIds([]);
    onAction('MULLIGAN_TAKE', {});
  };

  const handleKeep = () => {
    if (!isMyDecisionTurn || myHasKept) return;
    if (cardsToBottomCount > 0 && selectedBottomCardIds.length !== cardsToBottomCount) {
      return;
    }
    onAction('MULLIGAN_KEEP', { bottomCardIds: selectedBottomCardIds });
  };

  const handleForceDecision = () => {
    if (!isHost || !currentDecidingId) return;
    onAction('MULLIGAN_FORCE_DECISION', { targetPlayerId: currentDecidingId });
  };

  const isKeepDisabled =
    !isMyDecisionTurn ||
    myHasKept ||
    (cardsToBottomCount > 0 && selectedBottomCardIds.length !== cardsToBottomCount);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 select-none overflow-y-auto">
      {/* Top Header */}
      <div className="w-full max-w-5xl flex flex-col items-center space-y-2 text-center pt-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold tracking-wide">
          <Layers className="w-4 h-4" />
          <span>Fase de Mano Inicial & Mulligan (Regla de Londres)</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
          {myHasKept
            ? 'Te has quedado con tu mano inicial'
            : isMyDecisionTurn
            ? 'Tu turno de decisión: ¿Te quedas o haces mulligan?'
            : `Esperando a ${currentDecidingPlayer?.name || 'otro jugador'}...`}
        </h2>

        {/* Turn order indicator chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          {roomState.turnOrder.map((pid, idx) => {
            const p = roomState.players[pid];
            const pMull = mulligan?.players[pid];
            const isCurrent = currentDecidingId === pid;
            const hasKept = pMull?.hasKept;
            const isLocal = pid === localPlayerId;

            return (
              <div
                key={pid}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
                  isCurrent
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20 animate-pulse'
                    : hasKept
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                <span className="font-mono text-[10px]">{idx + 1}.º</span>
                <span>{p?.name || pid}</span>
                {isLocal && <span className="text-[9px] opacity-80">(Tú)</span>}
                {hasKept && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                {isCurrent && <span className="text-[9px] font-black uppercase">Decidiendo</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Center: Cards Display */}
      <div className="w-full max-w-6xl my-auto py-4 flex flex-col items-center">
        {!isSpectator && localHand.length > 0 ? (
          <div className="flex flex-col items-center space-y-4 w-full">
            {/* Cards row */}
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 max-w-full">
              {localHand.map(card => {
                const isSelected = selectedBottomCardIds.includes(card.instanceId);
                const selectionIndex = selectedBottomCardIds.indexOf(card.instanceId) + 1;

                return (
                  <div
                    key={card.instanceId}
                    onClick={() => handleToggleCardSelection(card.instanceId)}
                    className={`relative rounded-xl transition-all transform cursor-pointer group ${
                      isSelected
                        ? 'ring-4 ring-amber-500 scale-105 shadow-2xl shadow-amber-500/30 -translate-y-2'
                        : cardsToBottomCount > 0 && isMyDecisionTurn && !myHasKept
                        ? 'hover:scale-105 hover:-translate-y-1 hover:ring-2 hover:ring-amber-400/50'
                        : ''
                    }`}
                    style={{
                      width: 'clamp(110px, 11vw, 150px)',
                      aspectRatio: '5/7',
                    }}
                  >
                    <div className="w-full h-full rounded-xl overflow-hidden shadow-xl border border-slate-700/80">
                      <CardDisplay card={card.definition} isFaceDown={false} allowFaceToggle={false} />
                    </div>

                    {/* Bottom selection badge */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-amber-500 text-slate-950 font-black text-xs px-2 py-0.5 rounded-md shadow-md flex items-center space-x-1 animate-in zoom-in-75">
                        <span>#{selectionIndex} al fondo</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Instruction if needs to put cards to bottom */}
            {cardsToBottomCount > 0 && isMyDecisionTurn && !myHasKept && (
              <div className="bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs px-4 py-2 rounded-xl flex items-center space-x-2 animate-bounce">
                <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>
                  Debes seleccionar exactamente <strong>{cardsToBottomCount} carta(s)</strong> para poner en el fondo de la biblioteca ({selectedBottomCardIds.length}/{cardsToBottomCount} seleccionadas).
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-slate-400 text-sm font-semibold p-8 bg-slate-900/60 rounded-2xl border border-slate-800">
            {isSpectator
              ? '👁️ Estás en modo espectador. Las manos permanecen ocultas según las reglas de juego.'
              : 'Preparando tu mano inicial...'}
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="w-full max-w-3xl flex flex-col items-center space-y-3 pb-4">
        {/* Disconnected Player Warning & Host Force Action */}
        {currentDecidingPlayer && !currentDecidingPlayer.isConnected && (
          <div className="w-full bg-rose-950/80 border border-rose-500/60 rounded-2xl p-3 flex items-center justify-between shadow-xl">
            <div className="flex items-center space-x-2 text-rose-200 text-xs font-semibold">
              <UserX className="w-4 h-4 text-rose-400" />
              <span>
                <strong>{currentDecidingPlayer.name}</strong> está desconectado.
              </span>
            </div>
            {isHost && (
              <button
                onClick={handleForceDecision}
                className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-md transition-all flex items-center space-x-1 cursor-pointer"
              >
                <Crown className="w-3.5 h-3.5 text-amber-300" />
                <span>Saltar / Forzar decisión</span>
              </button>
            )}
          </div>
        )}

        {/* Local Player Decision Buttons */}
        {isMyDecisionTurn && !myHasKept ? (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
            {/* Mulligan Button */}
            <button
              onClick={handleMulligan}
              className="w-full sm:w-auto px-6 py-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-extrabold text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer group"
            >
              <RotateCcw className="w-4 h-4 text-amber-400 group-hover:rotate-180 transition-transform duration-500" />
              <span>Hacer Mulligan</span>
              <span className="bg-slate-950/80 text-amber-400 text-[10px] px-2 py-0.5 rounded-full border border-amber-500/30">
                Tomados: {myMulligan?.mulliganCount || 0}
              </span>
            </button>

            {/* Keep Button */}
            <button
              onClick={handleKeep}
              disabled={isKeepDisabled}
              className={`w-full sm:w-auto px-8 py-3.5 font-black text-sm rounded-2xl shadow-xl transition-all flex items-center justify-center space-x-2 ${
                isKeepDisabled
                  ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                  : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-emerald-600/30 cursor-pointer transform hover:scale-105 active:scale-95'
              }`}
            >
              <Check className="w-5 h-5" />
              <span>
                {cardsToBottomCount > 0
                  ? `Quedarse (${cardsToBottomCount} al fondo)`
                  : 'Quedarse con la Mano'}
              </span>
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800">
            {myHasKept ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Te has quedado con tu mano. Esperando a que el resto de jugadores decida...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>
                  {currentDecidingPlayer
                    ? `${currentDecidingPlayer.name} está decidiendo su mano...`
                    : 'Esperando turno de decisión...'}
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
