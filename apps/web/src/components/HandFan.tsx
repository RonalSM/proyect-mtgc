import React, { useState } from 'react';
import type { CardInstance, GameActionType, CardDefinition, RoomState } from '@mtgc/shared';
import { useDraggable } from '@dnd-kit/core';
import { CardDisplay } from './CardDisplay';
import { CardContextMenu } from './CardContextMenu';
import { Play, Trash2, Sparkles, Maximize2 } from 'lucide-react';
import { useCardPreview } from '../context/CardPreviewContext';
import { getPlayerBattlefieldCascadePosition } from '../utils/table-framing';

interface HandFanProps {
  cards: CardInstance[];
  handCount: number;
  isLocalPlayer: boolean;
  localPlayerId?: string;
  roomState?: RoomState;
  allBattlefieldCards?: CardInstance[];
  onAction: (type: GameActionType, payload: unknown) => void;
  onZoomCard?: (card: CardInstance) => void;
}

interface HandCardItemProps {
  card: CardInstance;
  index: number;
  totalCards: number;
  isSelected: boolean;
  onSelect: () => void;
  onZoom: () => void;
  onPlay: (e: React.MouseEvent) => void;
  onDiscard: (e: React.MouseEvent) => void;
  onExile: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  showPreview: (
    card: CardDefinition,
    posOrEvent?: { clientX?: number; x?: number } | React.MouseEvent
  ) => void;
  hidePreview: () => void;
}

const HandCardItem: React.FC<HandCardItemProps> = ({
  card,
  index,
  totalCards,
  isSelected,
  onSelect,
  onZoom,
  onPlay,
  onDiscard,
  onExile,
  onContextMenu,
  showPreview,
  hidePreview,
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.instanceId,
    data: { card, fromZone: 'hand' },
  });

  const offset = index - (totalCards - 1) / 2;
  const rot = Math.max(-15, Math.min(15, offset * 3.5));
  const transY = Math.abs(offset) * 2;
  const overlapRatio = totalCards > 3
    ? Math.min(0.85, 0.48 + (totalCards - 3) * 0.065)
    : totalCards > 1
    ? 0.35
    : 0;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      data-hand-card="true"
      data-from-zone="hand"
      data-card-instance-id={card.instanceId}
      data-card-name={card.definition.name}
      onClick={onSelect}
      onDoubleClick={onZoom}
      onContextMenu={onContextMenu}
      onMouseEnter={(e) => !isDragging && showPreview(card.definition, e)}
      onMouseLeave={hidePreview}
      style={{
        zIndex: isSelected ? 60 : index + 5,
        width: 'var(--card-w)',
        height: 'var(--card-h)',
        marginLeft: index === 0 ? 0 : `calc(var(--card-w) * -${overlapRatio.toFixed(2)})`,
        opacity: isDragging ? 0 : 1,
        transition: 'opacity 150ms ease-out, transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: isDragging ? 'none' : 'auto',
      }}
      className={`group relative cursor-grab active:cursor-grabbing origin-bottom flex-shrink-0 pointer-events-auto overflow-visible ${
        isSelected
          ? '-translate-y-7 z-[60] rotate-0'
          : !isDragging
          ? 'hover:-translate-y-5 hover:rotate-0 hover:z-50 transition-all duration-200'
          : ''
      }`}
    >
      {/* Card Face & Frame */}
      <div
        style={{
          width: 'var(--card-w)',
          minWidth: 'var(--card-w)',
          height: '100%',
          transform: !isSelected
            ? `rotate(${rot}deg) translateY(${transY}px)`
            : 'none',
        }}
        className={`rounded-[6px] overflow-hidden border shadow-lg transition-transform duration-200 aspect-[5/7] bg-slate-900 ${
          isSelected
            ? 'border-amber-400 ring-2 ring-amber-400/60 shadow-amber-500/20'
            : 'border-slate-800 hover:border-amber-400/90'
        }`}
      >
        <CardDisplay card={card.definition} isFaceDown={false} allowFaceToggle={false} />
      </div>

      {/* Action Toolbar on selection (accessible button alternative: REQ-9.2) */}
      {isSelected && (
        <div
          onClick={e => e.stopPropagation()}
          className="absolute -top-9 left-1/2 -translate-x-1/2 flex items-center space-x-1 bg-slate-900/95 border border-slate-700 rounded-xl p-1 shadow-2xl z-50 text-[10px] whitespace-nowrap pointer-events-auto"
        >
          <button
            onClick={onPlay}
            className="flex items-center space-x-1 px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow cursor-pointer"
            title="Lanzar al campo de batalla"
          >
            <Play className="w-2.5 h-2.5 fill-current" />
            <span>Jugar</span>
          </button>
          <button
            onClick={onZoom}
            className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg cursor-pointer"
            title="Ver en grande"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
          <button
            onClick={onDiscard}
            className="p-1 hover:bg-slate-800 text-rose-400 hover:text-rose-300 rounded-lg cursor-pointer"
            title="Descartar al cementerio"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          <button
            onClick={onExile}
            className="p-1 hover:bg-slate-800 text-purple-400 hover:text-purple-300 rounded-lg cursor-pointer"
            title="Exiliar carta"
          >
            <Sparkles className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};

export const HandFan: React.FC<HandFanProps> = ({
  cards,
  handCount,
  isLocalPlayer,
  localPlayerId,
  roomState,
  allBattlefieldCards,
  onAction,
  onZoomCard,
}) => {
  const { showPreview, hidePreview } = useCardPreview();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ card: CardInstance; pos: { x: number; y: number } } | null>(null);

  // Play card from hand to battlefield (Punto 2: al centro de la sección del propio jugador con cascada)
  const handlePlayToBattlefield = (card: CardInstance, e?: React.MouseEvent) => {
    e?.stopPropagation();
    let targetPos = { x: 0.5, y: 0.5 };
    const pId = localPlayerId || card.ownerId;
    if (roomState && pId) {
      targetPos = getPlayerBattlefieldCascadePosition(pId, roomState, allBattlefieldCards);
    } else {
      targetPos = {
        x: 0.45 + (Math.random() * 0.1 - 0.05),
        y: 0.5 + (Math.random() * 0.1 - 0.05),
      };
    }
    onAction('MOVE_CARD', {
      cardInstanceId: card.instanceId,
      fromZone: 'hand',
      toZone: 'battlefield',
      toPlayerId: pId,
      holderId: pId,
      position: {
        ...targetPos,
        zIndex: 10,
      },
    });
    setSelectedCardId(null);
  };

  const handleDiscardToGraveyard = (card: CardInstance, e?: React.MouseEvent) => {
    e?.stopPropagation();
    onAction('MOVE_CARD', {
      cardInstanceId: card.instanceId,
      fromZone: 'hand',
      toZone: 'graveyard',
    });
    setSelectedCardId(null);
  };

  const handleExile = (card: CardInstance, e?: React.MouseEvent) => {
    e?.stopPropagation();
    onAction('MOVE_CARD', {
      cardInstanceId: card.instanceId,
      fromZone: 'hand',
      toZone: 'exile',
    });
    setSelectedCardId(null);
  };

  // ----------------------------------------------------
  // Opponent Hand: Face-down card backs fan with count badge (REQ-16.3, REQ-22.7.2)
  // ----------------------------------------------------
  if (!isLocalPlayer) {
    if (handCount <= 0) {
      return (
        <div className="flex items-center space-x-1 bg-slate-950/70 border border-slate-800 rounded-xl px-2.5 py-1 text-[11px] text-slate-500 backdrop-blur-md">
          Mano vacía
        </div>
      );
    }

    const cardsToShow = Math.min(handCount, 7);

    return (
      <div className="relative flex items-end justify-center select-none pt-2 pb-0.5">
        {/* Count Badge */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-slate-950/90 border border-slate-700/80 px-2 py-0.5 rounded-full text-[9px] font-bold text-amber-300 shadow-md backdrop-blur-md z-30 whitespace-nowrap">
          {handCount} {handCount === 1 ? 'carta' : 'cartas'}
        </div>

        {/* Fanned Card Backs */}
        <div className="flex items-end justify-center">
          {(() => {
            const oppOverlap = cardsToShow > 3
              ? Math.min(0.85, 0.50 + (cardsToShow - 3) * 0.065)
              : cardsToShow > 1
              ? 0.40
              : 0;
            return Array.from({ length: cardsToShow }, (_, i) => {
              const offset = i - (cardsToShow - 1) / 2;
              const rot = Math.max(-14, Math.min(14, offset * 4.5));
              const transY = Math.abs(offset) * 2;

              return (
                <div
                  key={i}
                  style={{
                    transform: `rotate(${rot}deg) translateY(${transY}px)`,
                    zIndex: i + 1,
                    width: 'var(--card-w)',
                    height: 'var(--card-h)',
                    marginLeft: i === 0 ? 0 : `calc(var(--card-w) * -${oppOverlap.toFixed(2)})`,
                  }}
                  className="rounded-md overflow-hidden border border-slate-700/80 bg-slate-950 shadow-md transition-transform duration-200 flex-shrink-0"
                >
                  <img
                    src="https://cards.scryfall.io/back.png"
                    alt="Reverso de carta"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover pointer-events-none"
                    onError={e => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              );
            });
          })()}
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // Local Player Hand: Interactive Face-Up Floating Abanico (REQ-22.7.1)
  // ----------------------------------------------------
  if (cards.length === 0) {
    return (
      <div className="flex items-center space-x-1.5 bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-1 text-xs text-slate-500 backdrop-blur-md">
        <span>Tu mano está vacía</span>
      </div>
    );
  }

  const numCards = cards.length;

  return (
    <div className="relative flex items-end justify-center select-none pt-7 pb-1 z-20 pointer-events-none overflow-visible">
      {/* Hand Count badge */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-950/90 border border-slate-800 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-slate-300 shadow backdrop-blur-md z-30 pointer-events-none">
        <span className="text-amber-400 font-extrabold mr-1">{numCards}</span>
        {numCards === 1 ? 'carta en mano' : 'cartas en mano'}
      </div>

      {/* Fan Container */}
      <div className="flex items-end justify-center transition-all duration-200 pointer-events-none overflow-visible">
        {cards.map((card, i) => (
          <HandCardItem
            key={card.instanceId}
            card={card}
            index={i}
            totalCards={numCards}
            isSelected={selectedCardId === card.instanceId}
            onSelect={() => setSelectedCardId(selectedCardId === card.instanceId ? null : card.instanceId)}
            onZoom={() => onZoomCard && onZoomCard(card)}
            onPlay={e => handlePlayToBattlefield(card, e)}
            onDiscard={e => handleDiscardToGraveyard(card, e)}
            onExile={e => handleExile(card, e)}
            onContextMenu={e => {
              e.preventDefault();
              e.stopPropagation();
              setContextMenu({ card, pos: { x: e.clientX, y: e.clientY } });
            }}
            showPreview={showPreview}
            hidePreview={hidePreview}
          />
        ))}
      </div>

      {contextMenu && (
        <CardContextMenu
          card={contextMenu.card}
          fromZone="hand"
          position={contextMenu.pos}
          onClose={() => setContextMenu(null)}
          roomState={roomState}
          localPlayerId={localPlayerId}
          allBattlefieldCards={allBattlefieldCards}
          onAction={onAction}
        />
      )}
    </div>
  );
};
