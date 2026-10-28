import React, { useState, useEffect } from 'react';
import { getCardImageUrl, type RoomState, type GameActionType } from '@mtgc/shared';
import { CardDisplay } from './CardDisplay';
import { RotateCcw, Check, UserX, Crown, ShieldAlert, Sparkles, Layers } from 'lucide-react';
import { imageLoaderQueue } from '../services/imageLoaderQueue';
import { useLanguage } from '../context/LanguageContext';

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
  const { language } = useLanguage();
  const mulligan = roomState.mulligan;
  const localPlayer = roomState.players[localPlayerId];
  const isSpectator = localPlayer?.isSpectator ?? false;
  const isHost = localPlayer?.isHost ?? roomState.hostId === localPlayerId;

  const currentDecidingId = mulligan?.currentDecidingPlayerId;
  const currentDecidingPlayer = currentDecidingId ? roomState.players[currentDecidingId] : null;
  const isMyDecisionTurn = currentDecidingId === localPlayerId;

  const myMulligan = mulligan?.players[localPlayerId];
  const myHasKept = myMulligan?.hasKept ?? false;
  const cardsToBottomCount = myMulligan?.cardsToBottomCount ?? 0;

  const localHand = roomState.playerZones[localPlayerId]?.hand || [];

  // Priority Preloading during Opening Hand / Mulligan phase (Punto 5):
  // (1) 7 cards in initial hand and commander in normal version (priority 10)
  // (2) Rest of library in small version (priority 1)
  useEffect(() => {
    for (const card of localHand) {
      const url = getCardImageUrl(card.definition, { size: 'normal', lang: language });
      if (url) imageLoaderQueue.enqueue(url, 10);
    }

    const cmdrList = roomState.playerZones[localPlayerId]?.command || [];
    for (const cmdr of cmdrList) {
      const url = getCardImageUrl(cmdr.definition, { size: 'normal', lang: language });
      if (url) imageLoaderQueue.enqueue(url, 10);
    }

    const libraryCards = roomState.playerZones[localPlayerId]?.library || [];
    for (const card of libraryCards) {
      const smallUrl = getCardImageUrl(card.definition, { size: 'small', lang: language });
      if (smallUrl) imageLoaderQueue.enqueue(smallUrl, 1);
    }
  }, [localHand, roomState.playerZones, localPlayerId, language]);

  const [selectedBottomCardIds, setSelectedBottomCardIds] = useState<string[]>([]);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

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
    <div
      data-testid="opening-hand-modal"
      className="fixed inset-0 z-50 bg-[#040d0f]/90 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-5 select-none overflow-y-auto"
    >
      {/* Top Header */}
      <div className="w-full max-w-5xl flex flex-col items-center space-y-1.5 sm:space-y-2 text-center pt-1 sm:pt-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#0c2d32] border border-[#12544F] text-[#8BBB92] text-xs font-bold tracking-wide">
          <Layers className="w-4 h-4 text-[#8BBB92]" />
          <span>Fase de Mano Inicial & Mulligan (Regla de Londres)</span>
        </div>

        <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
          {myHasKept
            ? 'Te has quedado con tu mano inicial'
            : isMyDecisionTurn
              ? 'Tu turno de decisión: ¿Te quedas o haces mulligan?'
              : `Esperando a ${currentDecidingPlayer?.name || 'otro jugador'}...`}
        </h2>

        {/* Turn order indicator chips */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 pt-0.5">
          {roomState.turnOrder.map((pid, idx) => {
            const p = roomState.players[pid];
            const pMull = mulligan?.players[pid];
            const isCurrent = currentDecidingId === pid;
            const hasKept = pMull?.hasKept;
            const isLocal = pid === localPlayerId;

            return (
              <div
                key={pid}
                className={`flex items-center space-x-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-xl text-xs font-bold border transition-all ${
                  isCurrent
                    ? 'bg-[#2A835F] text-white border-[#8BBB92] shadow-lg shadow-[#2A835F]/30 animate-pulse'
                    : hasKept
                      ? 'bg-[#12544F] text-[#8BBB92] border-[#2A835F]/40'
                      : 'bg-[#0c2d32] text-zinc-400 border-[#12544F]'
                }`}
              >
                <span className="font-mono text-[10px]">{idx + 1}.º</span>
                <span>{p?.name || pid}</span>
                {isLocal && <span className="text-[9px] opacity-80">(Tú)</span>}
                {hasKept && <Check className="w-3.5 h-3.5 text-[#8BBB92]" />}
                {isCurrent && <span className="text-[9px] font-black uppercase text-white ml-0.5">Decidiendo</span>}
              </div>
            );
          })}
        </div>

        {/* Notice badge */}
        {!isSpectator && !myHasKept && (
          <div className="text-xs font-semibold px-3.5 py-0.5 sm:py-1 rounded-full bg-[#0c2d32] text-[#8BBB92] border border-[#12544F] flex items-center space-x-1.5 shadow-sm mt-0.5">
            <Sparkles className="w-3.5 h-3.5 text-[#8BBB92]" />
            <span>
              {(myMulligan?.mulliganCount || 0) === 0
                ? 'El primer mulligan es gratis'
                : `Si te quedas, pondrás ${cardsToBottomCount} carta(s) al fondo`}
            </span>
          </div>
        )}
      </div>

      {/* Center: Cards Display (Fan / Abanico Layout with Hover Zoom) */}
      <div className="w-full max-w-[1600px] my-auto py-2 sm:py-3 flex flex-col items-center overflow-visible">
        {!isSpectator && localHand.length > 0 ? (
          <div className="flex flex-col items-center space-y-4 w-full overflow-visible">
            {/* Cards Fan / Abanico Container */}
            <div className="flex items-center justify-center pt-8 pb-12 px-6 max-w-full overflow-visible">
              {localHand.map((card, idx) => {
                const isSelected = selectedBottomCardIds.includes(card.instanceId);
                const selectionIndex = selectedBottomCardIds.indexOf(card.instanceId) + 1;
                const isHovered = hoveredCardId === card.instanceId;

                // Fan Geometry:
                // Center card stays upright; cards spread smoothly with subtle fan rotation and arc
                const totalCards = localHand.length;
                const centerIdx = (totalCards - 1) / 2;
                const offset = idx - centerIdx; // e.g. -3, -2, -1, 0, 1, 2, 3
                const rotDeg = offset * 2.8; // fan rotation angle
                const arcY = Math.abs(offset) * 4.5; // subtle fan curve

                // Stacking order requested by user:
                // "cuando la que este a la derecha esta arriba de todas y la de la izquierda abajo"
                // Right card has highest base z-index (10 + idx)
                // "cuando pasas el mouse sobre una esa se sobre pone sin cambiar el orden y se le hace zooom :D"
                // Hovered card elevated to top (z-index 60) without modifying array order
                const zIndex = isHovered ? 60 : 10 + idx;

                let transform = '';
                if (isHovered) {
                  transform = 'translateY(-36px) scale(1.28) rotate(0deg)';
                } else if (isSelected) {
                  transform = `translateY(${arcY - 24}px) scale(1.05) rotate(${rotDeg}deg)`;
                } else {
                  transform = `translateY(${arcY}px) rotate(${rotDeg}deg)`;
                }

                return (
                  <div
                    key={card.instanceId}
                    data-testid="mulligan-card"
                    data-card-instance-id={card.instanceId}
                    onMouseEnter={() => setHoveredCardId(card.instanceId)}
                    onMouseLeave={() => setHoveredCardId(null)}
                    onClick={() => handleToggleCardSelection(card.instanceId)}
                    className={`relative rounded-2xl cursor-pointer group shrink-0 ${
                      idx > 0 ? '-ml-8 sm:-ml-12 md:-ml-14 lg:-ml-16' : ''
                    }`}
                    style={{
                      width: 'clamp(145px, calc(10vw + 12px), 215px)',
                      aspectRatio: '63/88',
                      zIndex,
                      transform,
                      transformOrigin: 'bottom center',
                      transition: 'all 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)',
                    }}
                  >
                    <div
                      className={`w-full h-full rounded-2xl overflow-hidden transition-all duration-200 ${
                        isHovered
                          ? 'ring-2 ring-[#8BBB92] shadow-2xl shadow-black/90'
                          : isSelected
                            ? 'ring-3 ring-[#8BBB92] shadow-xl shadow-[#2A835F]/40'
                            : 'border border-[#12544F] shadow-xl'
                      }`}
                    >
                      <CardDisplay
                        card={card.definition}
                        isFaceDown={false}
                        allowFaceToggle={false}
                        size="normal"
                      />
                    </div>

                    {/* Bottom selection badge */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-[#2A835F] text-white border border-[#8BBB92] font-black text-xs px-2.5 py-1 rounded-lg shadow-xl flex items-center space-x-1 animate-in zoom-in-75 z-20">
                        <span>#{selectionIndex} al fondo</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Instruction if needs to put cards to bottom */}
            {cardsToBottomCount > 0 && isMyDecisionTurn && !myHasKept && (
              <div className="bg-[#0c2d32] border border-[#8BBB92] text-zinc-200 text-xs px-4 py-2 rounded-xl flex items-center space-x-2 shadow-lg">
                <ShieldAlert className="w-4 h-4 text-[#8BBB92] flex-shrink-0" />
                <span>
                  Debes seleccionar exactamente <strong className="text-white">{cardsToBottomCount} carta(s)</strong> para
                  poner en el fondo de la biblioteca ({selectedBottomCardIds.length}/
                  {cardsToBottomCount} seleccionadas).
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-zinc-400 text-sm font-semibold p-8 bg-[#092328] rounded-2xl border border-[#12544F]">
            {isSpectator
              ? '👁️ Estás en modo espectador. Las manos permanecen ocultas según las reglas de juego.'
              : 'Preparando tu mano inicial...'}
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="w-full max-w-3xl flex flex-col items-center space-y-2 sm:space-y-3 pb-2 sm:pb-4">
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
                <Crown className="w-3.5 h-3.5 text-[#8BBB92]" />
                <span>Saltar / Forzar decisión</span>
              </button>
            )}
          </div>
        )}

        {/* Local Player Decision Buttons */}
        {isMyDecisionTurn && !myHasKept ? (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
            {/* Mulligan Button */}
            {cardsToBottomCount < 7 ? (
              <button
                data-testid="mulligan-btn"
                onClick={handleMulligan}
                className="w-full sm:w-auto px-6 py-3.5 bg-[#12544F] hover:bg-[#18645e] border border-[#2A835F]/50 text-white font-extrabold text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer group"
              >
                <RotateCcw className="w-4 h-4 text-[#8BBB92] group-hover:rotate-180 transition-transform duration-500" />
                <span>Hacer Mulligan</span>
                <span className="bg-[#040d0f] text-[#8BBB92] text-[10px] font-mono px-2 py-0.5 rounded-full border border-[#12544F]">
                  Tomados: {myMulligan?.mulliganCount || 0}
                </span>
              </button>
            ) : (
              <div className="text-xs text-[#8BBB92] font-bold bg-[#0c2d32] border border-[#12544F] px-3 py-2 rounded-xl">
                Mano de 0 cartas alcanzada: solo queda quedarse con la mano.
              </div>
            )}

            {/* Keep Button */}
            <button
              data-testid="keep-btn"
              onClick={handleKeep}
              disabled={isKeepDisabled}
              className={`w-full sm:w-auto px-8 py-3.5 font-black text-sm rounded-2xl shadow-xl transition-all flex items-center justify-center space-x-2 ${
                isKeepDisabled
                  ? 'bg-[#0c2d32] text-zinc-500 border border-[#12544F] cursor-not-allowed opacity-60'
                  : 'bg-[#2A835F] hover:bg-[#349e73] active:bg-[#237050] text-white shadow-lg shadow-[#2A835F]/30 cursor-pointer transform hover:scale-105 active:scale-95'
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
          <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-300 bg-[#0c2d32] px-4 py-2 rounded-xl border border-[#12544F]">
            {myHasKept ? (
              <>
                <Check className="w-4 h-4 text-[#8BBB92]" />
                <span>
                  Te has quedado con tu mano. Esperando a que el resto de jugadores decida...
                </span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-[#8BBB92]" />
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
