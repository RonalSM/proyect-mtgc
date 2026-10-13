import React, { useState } from 'react';
import type { CardInstance, GameActionType } from '@mtgc/shared';
import { RotateCw, Eye, Plus, Copy } from 'lucide-react';

interface BattlefieldCanvasProps {
  cards: CardInstance[];
  isLocalPlayer: boolean;
  onAction: (type: GameActionType, payload: unknown) => void;
}

export const BattlefieldCanvas: React.FC<BattlefieldCanvasProps> = ({
  cards,
  isLocalPlayer,
  onAction,
}) => {
  const [hoveredCard, setHoveredCard] = useState<CardInstance | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const handleCardClick = (card: CardInstance) => {
    if (!isLocalPlayer) return;
    setSelectedCardId(selectedCardId === card.instanceId ? null : card.instanceId);
  };

  const handleTap = (card: CardInstance) => {
    if (!isLocalPlayer) return;
    onAction('TAP_CARD', {
      cardInstanceId: card.instanceId,
      isTapped: !card.isTapped,
    });
  };

  const handleFlip = (card: CardInstance) => {
    if (!isLocalPlayer) return;
    onAction('FLIP_CARD', {
      cardInstanceId: card.instanceId,
      isFaceDown: !card.isFaceDown,
    });
  };

  const handleAddCounter = (card: CardInstance, counterType: string) => {
    if (!isLocalPlayer) return;
    onAction('SET_CARD_COUNTER', {
      cardInstanceId: card.instanceId,
      counterType,
      delta: 1,
    });
  };

  const handleClone = (card: CardInstance) => {
    if (!isLocalPlayer) return;
    onAction('CLONE_TOKEN', {
      sourceCardInstanceId: card.instanceId,
    });
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Cards on Battlefield with Normalized Coords (REQ-22.6) */}
      {cards.map(card => {
        // Normalized coordinates 0..1 converted to percentages (REQ-22.6.1)
        const posX = Math.max(0.05, Math.min(0.85, card.position?.x ?? 0.45)) * 100;
        const posY = Math.max(0.05, Math.min(0.75, card.position?.y ?? 0.45)) * 100;
        const zIndex = card.position?.zIndex ?? 5;
        const isSelected = selectedCardId === card.instanceId;

        return (
          <div
            key={card.instanceId}
            onClick={() => handleCardClick(card)}
            onMouseEnter={() => setHoveredCard(card)}
            onMouseLeave={() => setHoveredCard(null)}
            className={`absolute cursor-pointer transition-transform duration-150 group select-none ${
              card.isTapped ? 'rotate-90' : ''
            }`}
            style={{
              left: `${posX}%`,
              top: `${posY}%`,
              zIndex: isSelected ? 50 : zIndex,
              width: 'var(--card-w, 64px)',
              height: 'var(--card-h, 90px)',
            }}
          >
            {/* Card Frame */}
            <div
              className={`w-full h-full rounded-md overflow-hidden border shadow-md relative bg-slate-900 ${
                isSelected
                  ? 'border-amber-400 ring-2 ring-amber-400/50 shadow-amber-500/20'
                  : 'border-slate-800 hover:border-slate-600'
              }`}
            >
              {!card.isFaceDown ? (
                <img
                  src={card.definition.imageUrlSmall || card.definition.imageUrlNormal}
                  alt={card.definition.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover pointer-events-none"
                />
              ) : (
                <div className="w-full h-full bg-slate-950 border border-slate-700 flex items-center justify-center text-slate-500 text-[10px] font-bold">
                  Boca Abajo
                </div>
              )}

              {/* Counter Badges (REQ-5.3) */}
              {card.counters && Object.entries(card.counters).length > 0 && (
                <div className="absolute top-0.5 right-0.5 flex flex-col space-y-0.5 pointer-events-none">
                  {Object.entries(card.counters).map(([type, count]) => (
                    <span
                      key={type}
                      className="bg-amber-500 text-slate-950 font-black text-[8px] px-1 rounded shadow leading-tight"
                    >
                      {count > 0 ? `+${count}` : count}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Context Action Controls on selection (Local Player only) */}
            {isLocalPlayer && isSelected && (
              <div
                onClick={e => e.stopPropagation()}
                className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center space-x-1 bg-slate-900/95 border border-slate-700 rounded-lg p-1 shadow-2xl z-50 text-[10px]"
              >
                <button
                  onClick={() => handleTap(card)}
                  className="p-1 hover:bg-slate-800 rounded text-amber-300"
                  title={card.isTapped ? 'Enderezar' : 'Girar'}
                >
                  <RotateCw className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleAddCounter(card, '+1/+1')}
                  className="p-1 hover:bg-slate-800 rounded text-emerald-300"
                  title="Añadir contador +1/+1"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleClone(card)}
                  className="p-1 hover:bg-slate-800 rounded text-blue-300"
                  title="Clonar token/permanente (REQ-9.4)"
                >
                  <Copy className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleFlip(card)}
                  className="p-1 hover:bg-slate-800 rounded text-slate-300"
                  title="Boca abajo / Boca arriba"
                >
                  <Eye className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Card Hover Zoom Preview (REQ-9.6, REQ-22.6.4) */}
      {hoveredCard && !hoveredCard.isFaceDown && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-150 animate-in fade-in zoom-in-95">
          <div className="w-48 bg-slate-950/95 border border-slate-700 rounded-2xl shadow-2xl p-2 space-y-2 backdrop-blur-md">
            <div className="aspect-[2.5/3.5] rounded-xl overflow-hidden border border-slate-850">
              <img
                src={hoveredCard.definition.imageUrlNormal || hoveredCard.definition.imageUrlSmall}
                alt={hoveredCard.definition.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="px-1 text-center">
              <div className="font-bold text-xs text-white truncate">
                {hoveredCard.definition.name}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {hoveredCard.definition.typeLine}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
