import React, { useState } from 'react';
import type { CardInstance, GameActionType, CardDefinition, RoomState } from '@mtgc/shared';
import { useDraggable } from '@dnd-kit/core';
import { CardDisplay } from './CardDisplay';
import { CardContextMenu } from './CardContextMenu';
import { useCardPreview } from '../context/CardPreviewContext';
import type { RemoteDragState } from '../hooks/useGameSocket';

export interface ViewFraming {
  xMin: number;
  yMin: number;
  width: number;
  height: number;
  isExpanded: boolean;
}

interface BattlefieldCanvasProps {
  cards: CardInstance[];
  remoteDraggingCards?: Record<string, RemoteDragState>;
  optimisticPositions?: Record<string, { x: number; y: number; zIndex?: number }>;
  isLocalPlayer?: boolean;
  playerId?: string;
  localPlayerId?: string;
  roomState?: RoomState;
  viewFraming?: ViewFraming;
  onUnauthorizedAttempt?: (card: CardInstance) => void;
  onAction: (type: GameActionType, payload: unknown) => void;
}

interface BattlefieldCardItemProps {
  card: CardInstance;
  isLocalPlayer?: boolean;
  localPlayerId?: string;
  isSelected: boolean;
  optimisticPosition?: { x: number; y: number; zIndex?: number };
  isRemoteDragging?: boolean;
  viewFraming?: ViewFraming;
  roomState?: RoomState;
  allBattlefieldCards?: CardInstance[];
  onAction: (type: GameActionType, payload: unknown) => void;
  onUnauthorizedAttempt?: (card: CardInstance) => void;
  onCardClick: () => void;
  onTap: () => void;
  onFlip: () => void;
  onAddCounter: (counterType: string) => void;
  onClone: () => void;
  onSendToCommand?: () => void;
  showPreview: (
    card: CardDefinition,
    posOrEvent?: { clientX?: number; x?: number } | React.MouseEvent
  ) => void;
  hidePreview: () => void;
}

const BattlefieldCardItem: React.FC<BattlefieldCardItemProps> = ({
  card,
  localPlayerId,
  isSelected,
  optimisticPosition,
  isRemoteDragging,
  viewFraming,
  roomState,
  allBattlefieldCards,
  onAction,
  onUnauthorizedAttempt,
  onCardClick,
  onTap,
  onFlip,
  onAddCounter,
  onClone,
  onSendToCommand,
  showPreview,
  hidePreview,
}) => {
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const longPressTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Punto 5: Comprobación de titularidad (propietario original o titular temporal)
  const isOwner = !localPlayerId || card.ownerId === localPlayerId;
  const isHolder = !!localPlayerId && card.holderId === localPlayerId;
  const canMove = isOwner || isHolder;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.instanceId,
    data: { card, fromZone: 'battlefield' },
    disabled: !canMove,
  });

  // Clic derecho abre menú contextual si tiene permiso, sino muestra aviso de restricción
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canMove) {
      setContextMenuPos({ x: e.clientX, y: e.clientY });
    } else {
      onUnauthorizedAttempt?.(card);
    }
  };

  // Doble clic gira o endereza si tiene permiso
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canMove) {
      onTap();
    } else {
      onUnauthorizedAttempt?.(card);
    }
  };

  // Táctil: pulsación larga de 500 ms abre menú contextual si tiene permiso
  const handleTouchStart = () => {
    if (!canMove) {
      onUnauthorizedAttempt?.(card);
      return;
    }
    longPressTimerRef.current = setTimeout(() => {
      setContextMenuPos({
        x: typeof window !== 'undefined' ? window.innerWidth / 2 - 90 : 200,
        y: typeof window !== 'undefined' ? window.innerHeight / 2 - 120 : 200,
      });
    }, 500);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!canMove) {
      e.stopPropagation();
      onUnauthorizedAttempt?.(card);
      return;
    }
    listeners?.onPointerDown?.(e);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Punto 1 / Punto 3: Coordenadas optimistas y transformación inversa/directa para mesa expandida
  const rawX = optimisticPosition ? optimisticPosition.x : (card.position?.x ?? 0.5);
  const rawY = optimisticPosition ? optimisticPosition.y : (card.position?.y ?? 0.5);

  let screenNormX = rawX;
  let screenNormY = rawY;

  if (viewFraming?.isExpanded) {
    screenNormX = (rawX - viewFraming.xMin) / viewFraming.width;
    screenNormY = (rawY - viewFraming.yMin) / viewFraming.height;
    if (screenNormX < -0.15 || screenNormX > 1.15 || screenNormY < -0.15 || screenNormY > 1.15) {
      return null;
    }
  }

  const posX = Math.max(0, Math.min(1, screenNormX)) * 100;
  const posY = Math.max(0, Math.min(1, screenNormY)) * 100;
  const zIndex = optimisticPosition?.zIndex ?? (card.position?.zIndex ?? 5);

  const isTapped = !!card.isTapped;
  const cardW = isTapped ? 'var(--card-h)' : 'var(--card-w)';
  const cardH = isTapped ? 'var(--card-w)' : 'var(--card-h)';

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      data-battlefield-card="true"
      data-from-zone="battlefield"
      data-card-name={card.definition.name}
      data-card-instance-id={card.instanceId}
      data-tapped={isTapped ? 'true' : 'false'}
      data-can-move={canMove ? 'true' : 'false'}
      data-card-owner={card.ownerId}
      data-card-holder={card.holderId || ''}
      onClick={onCardClick}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
      onMouseEnter={(e) => !card.isFaceDown && !isDragging && showPreview(card.definition, e)}
      onMouseLeave={hidePreview}
      className={`card-slot-container absolute group select-none pointer-events-auto flex items-center justify-center ${
        canMove ? 'cursor-pointer' : 'cursor-not-allowed'
      } ${
        isDragging || isRemoteDragging ? 'opacity-0 pointer-events-none' : ''
      }`}
      style={{
        left: `calc(${posX}% + var(--card-w) / 2)`,
        top: `calc(${posY}% + var(--card-h) / 2)`,
        transform: 'translate(-50%, -50%)',
        zIndex: isSelected ? 50 : zIndex,
        width: cardW,
        height: cardH,
      }}
    >
      {/* Rotating Card Body (Punto 7: rotación 90° alrededor del centro invariante) */}
      <div
        data-card-rotator="true"
        className={`card-rotator rounded-md overflow-hidden border shadow-md relative bg-slate-900 flex-shrink-0 ${
          isSelected
            ? 'border-amber-400 ring-2 ring-amber-400/50 shadow-amber-500/20'
            : 'border-slate-800 hover:border-slate-600'
        }`}
        style={{
          width: 'var(--card-w)',
          height: 'var(--card-h)',
          transform: isTapped ? 'rotate(90deg)' : 'rotate(0deg)',
          transformOrigin: 'center center',
        }}
      >
        <CardDisplay
          card={card.definition}
          isFaceDown={card.isFaceDown}
          isTapped={isTapped}
        />

        {/* Counter Badges (REQ-5.3): Acompañan a la carta durante la rotación sin saltos */}
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

      {/* Menú contextual unificado con destinos (mano, cementerio, exilio, biblioteca) y revelar (Punto 7) */}
      {canMove && contextMenuPos && (
        <CardContextMenu
          card={card}
          fromZone="battlefield"
          position={contextMenuPos}
          onClose={() => setContextMenuPos(null)}
          roomState={roomState}
          localPlayerId={localPlayerId}
          allBattlefieldCards={allBattlefieldCards}
          onAction={onAction}
          onTap={onTap}
          onAddCounter={onAddCounter}
          onClone={onClone}
          onFlip={onFlip}
          onSendToCommand={onSendToCommand}
        />
      )}
    </div>
  );
};

export const BattlefieldCanvas: React.FC<BattlefieldCanvasProps> = ({
  cards,
  remoteDraggingCards,
  optimisticPositions,
  localPlayerId,
  roomState,
  viewFraming,
  onUnauthorizedAttempt,
  onAction,
}) => {
  const { showPreview, hidePreview } = useCardPreview();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const handleCardClick = (card: CardInstance) => {
    setSelectedCardId(selectedCardId === card.instanceId ? null : card.instanceId);
  };

  const handleTap = (card: CardInstance) => {
    // Punto 7: Girar o enderezar NO recalcula holderId ni envía MOVE_CARD
    onAction('TAP_CARD', {
      cardInstanceId: card.instanceId,
      isTapped: !card.isTapped,
    });
  };

  const handleFlip = (card: CardInstance) => {
    onAction('FLIP_CARD', {
      cardInstanceId: card.instanceId,
      isFaceDown: !card.isFaceDown,
    });
  };

  const handleAddCounter = (card: CardInstance, counterType: string) => {
    onAction('SET_CARD_COUNTER', {
      cardInstanceId: card.instanceId,
      counterType,
      delta: 1,
    });
  };

  const handleClone = (card: CardInstance) => {
    onAction('CLONE_TOKEN', {
      sourceCardInstanceId: card.instanceId,
    });
  };

  const handleSendToCommand = (card: CardInstance) => {
    onAction('MOVE_CARD', {
      cardInstanceId: card.instanceId,
      fromZone: 'battlefield',
      toZone: 'command',
      toPlayerId: card.ownerId,
    });
  };

  return (
    <div
      id="battlefield-canvas-global"
      data-battlefield-canvas="true"
      className="fixed inset-0 w-screen h-[100dvh] pointer-events-none z-10 overflow-hidden"
    >
      {/* Capa Única de Cartas en MesaTotal con Coordenadas Globales Normalizadas */}
      {cards.map(card => {
        const remoteItem = remoteDraggingCards && remoteDraggingCards[card.instanceId];
        const isRemoteDragging = !!(
          remoteItem && (remoteItem.isDragging || (remoteItem as any).pendingSync)
        );
        return (
          <BattlefieldCardItem
            key={card.instanceId}
            card={card}
            localPlayerId={localPlayerId}
            isSelected={selectedCardId === card.instanceId}
            optimisticPosition={optimisticPositions?.[card.instanceId]}
            isRemoteDragging={isRemoteDragging}
            viewFraming={viewFraming}
            roomState={roomState}
            allBattlefieldCards={cards}
            onAction={onAction}
            onUnauthorizedAttempt={onUnauthorizedAttempt}
            onCardClick={() => handleCardClick(card)}
            onTap={() => handleTap(card)}
            onFlip={() => handleFlip(card)}
            onAddCounter={counterType => handleAddCounter(card, counterType)}
            onClone={() => handleClone(card)}
            onSendToCommand={() => handleSendToCommand(card)}
            showPreview={showPreview}
            hidePreview={hidePreview}
          />
        );
      })}

      {/* Movimiento en vivo para rivales (Punto 5, REQ-9) y sostenimiento en destino (Punto 1) */}
      {remoteDraggingCards &&
        Object.values(remoteDraggingCards).map(item => {
          if ((!item.isDragging && !(item as any).pendingSync) || !item.position) return null;
          let screenNormX = item.position.x;
          let screenNormY = item.position.y;
          if (viewFraming?.isExpanded) {
            screenNormX = (screenNormX - viewFraming.xMin) / viewFraming.width;
            screenNormY = (screenNormY - viewFraming.yMin) / viewFraming.height;
            if (screenNormX < -0.15 || screenNormX > 1.15 || screenNormY < -0.15 || screenNormY > 1.15) {
              return null;
            }
          }
          const posX = Math.max(0, Math.min(1, screenNormX)) * 100;
          const posY = Math.max(0, Math.min(1, screenNormY)) * 100;

          return (
            <div
              key={`remote-drag-${item.cardInstanceId}`}
              data-remote-drag="true"
              data-remote-card-ghost="true"
              data-card-instance-id={item.cardInstanceId}
              data-player-id={item.playerId}
              className={`absolute pointer-events-none select-none z-40 flex items-center justify-center ${
                item.isFirstMessage || (item as any).pendingSync
                  ? 'transition-none'
                  : 'transition-[left,top] duration-75 ease-linear'
              }`}
              style={{
                left: `calc(${posX}% + var(--card-w) / 2)`,
                top: `calc(${posY}% + var(--card-h) / 2)`,
                transform: 'translate(-50%, -50%)',
                width: item.isTapped ? 'var(--card-h)' : 'var(--card-w)',
                height: item.isTapped ? 'var(--card-w)' : 'var(--card-h)',
              }}
            >
              <div
                style={{
                  width: 'var(--card-w)',
                  height: 'var(--card-h)',
                  transform: item.isTapped ? 'rotate(90deg)' : 'rotate(0deg)',
                  transformOrigin: 'center center',
                }}
                className="w-full h-full rounded-md overflow-hidden border border-amber-400/80 shadow-lg shadow-amber-500/25 bg-slate-900 relative"
              >
                {item.cardDefinition ? (
                  <CardDisplay card={item.cardDefinition} isTapped={item.isTapped} />
                ) : (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center text-xs text-amber-200">
                    {item.playerName}
                  </div>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-black/75 backdrop-blur-xs text-[9px] text-amber-300 font-semibold text-center py-0.5 truncate px-1 border-t border-amber-400/30">
                  {item.playerName}
                </div>
              </div>
            </div>
          );
        })}
    </div>
  );
};
