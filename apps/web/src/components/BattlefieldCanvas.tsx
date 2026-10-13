import React, { useState } from 'react';
import type { CardInstance, GameActionType, CardDefinition } from '@mtgc/shared';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { RotateCw, Eye, Plus, Copy } from 'lucide-react';
import { CardDisplay } from './CardDisplay';
import { useCardPreview } from '../context/CardPreviewContext';

interface BattlefieldCanvasProps {
  cards: CardInstance[];
  isLocalPlayer: boolean;
  playerId?: string;
  onAction: (type: GameActionType, payload: unknown) => void;
}

interface BattlefieldCardItemProps {
  card: CardInstance;
  isLocalPlayer: boolean;
  isSelected: boolean;
  onCardClick: () => void;
  onTap: () => void;
  onFlip: () => void;
  onAddCounter: (counterType: string) => void;
  onClone: () => void;
  showPreview: (card: CardDefinition) => void;
  hidePreview: () => void;
}

const BattlefieldCardItem: React.FC<BattlefieldCardItemProps> = ({
  card,
  isLocalPlayer,
  isSelected,
  onCardClick,
  onTap,
  onFlip,
  onAddCounter,
  onClone,
  showPreview,
  hidePreview,
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.instanceId,
    data: { card, fromZone: 'battlefield' },
    disabled: !isLocalPlayer,
  });

  const posX = Math.max(0.05, Math.min(0.85, card.position?.x ?? 0.45)) * 100;
  const posY = Math.max(0.05, Math.min(0.75, card.position?.y ?? 0.45)) * 100;
  const zIndex = card.position?.zIndex ?? 5;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onCardClick}
      onMouseEnter={() => !card.isFaceDown && !isDragging && showPreview(card.definition)}
      onMouseLeave={hidePreview}
      className={`absolute cursor-pointer transition-transform duration-150 group select-none ${
        card.isTapped ? 'rotate-90' : ''
      } ${isDragging ? 'opacity-30' : ''}`}
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
        <CardDisplay
          card={card.definition}
          isFaceDown={card.isFaceDown}
          isTapped={card.isTapped}
        />

        {/* Counter Badges (REQ-5.3) */}
        {card.counters && Object.entries(card.counters).length > 0 && (
          <div className="absolute top-0.5 right-0.5 flex flex-col space-y-0.5 pointer-events-none z-10">
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
            onClick={onTap}
            className="p-1 hover:bg-slate-800 rounded text-amber-300"
            title={card.isTapped ? 'Enderezar' : 'Girar'}
          >
            <RotateCw className="w-3 h-3" />
          </button>
          <button
            onClick={() => onAddCounter('+1/+1')}
            className="p-1 hover:bg-slate-800 rounded text-emerald-300"
            title="Añadir contador +1/+1"
          >
            <Plus className="w-3 h-3" />
          </button>
          <button
            onClick={onClone}
            className="p-1 hover:bg-slate-800 rounded text-blue-300"
            title="Clonar token/permanente (REQ-9.4)"
          >
            <Copy className="w-3 h-3" />
          </button>
          <button
            onClick={onFlip}
            className="p-1 hover:bg-slate-800 rounded text-slate-300"
            title="Boca abajo / Boca arriba"
          >
            <Eye className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};

export const BattlefieldCanvas: React.FC<BattlefieldCanvasProps> = ({
  cards,
  isLocalPlayer,
  playerId = 'local',
  onAction,
}) => {
  const { showPreview, hidePreview } = useCardPreview();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const { setNodeRef, isOver } = useDroppable({
    id: `battlefield-${playerId}`,
    data: { zone: 'battlefield', playerId },
    disabled: !isLocalPlayer,
  });

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
    <div
      ref={setNodeRef}
      id={`battlefield-zone-${playerId}`}
      className={`relative w-full h-full overflow-hidden transition-colors ${
        isOver && isLocalPlayer ? 'bg-amber-500/10 ring-2 ring-inset ring-amber-400/40' : ''
      }`}
    >
      {/* Cards on Battlefield with Normalized Coords & Draggable Repositioning (REQ-22.6) */}
      {cards.map(card => (
        <BattlefieldCardItem
          key={card.instanceId}
          card={card}
          isLocalPlayer={isLocalPlayer}
          isSelected={selectedCardId === card.instanceId}
          onCardClick={() => handleCardClick(card)}
          onTap={() => handleTap(card)}
          onFlip={() => handleFlip(card)}
          onAddCounter={counterType => handleAddCounter(card, counterType)}
          onClone={() => handleClone(card)}
          showPreview={showPreview}
          hidePreview={hidePreview}
        />
      ))}
    </div>
  );
};
