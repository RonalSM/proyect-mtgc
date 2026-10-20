import React, { useState } from 'react';
import type { CardInstance, GameActionType, CardDefinition, RoomState } from '@mtgc/shared';
import { computeCardPT } from '@mtgc/shared';
import { useDraggable } from '@dnd-kit/core';
import { CardDisplay } from './CardDisplay';
import { CardContextMenu } from './CardContextMenu';
import { CardBadges } from './CardBadges';
import { useCardPreview } from '../context/CardPreviewContext';
import type { RemoteDragState } from '../hooks/useGameSocket';

export const CardPTBadge: React.FC<{ card: CardInstance }> = ({ card }) => {
  const pt = computeCardPT(card);
  if (!pt) return null;

  const { effectiveP, effectiveT, baseP, baseT, pStatus, tStatus, overallStatus } = pt;

  let badgeBorderBg = 'bg-slate-950/95 border-slate-700/80 text-slate-200 shadow-sm';
  if (overallStatus === 'up') {
    badgeBorderBg = 'bg-slate-950/95 border-emerald-500/80 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.35)]';
  } else if (overallStatus === 'down') {
    badgeBorderBg = 'bg-slate-950/95 border-rose-500/80 text-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.35)]';
  }

  let pColor = 'text-slate-100 font-bold';
  if (pStatus === 'up') pColor = 'text-emerald-400 font-extrabold';
  else if (pStatus === 'down') pColor = 'text-rose-400 font-extrabold';

  let tColor = 'text-slate-100 font-bold';
  if (tStatus === 'up') tColor = 'text-emerald-400 font-extrabold';
  else if (tStatus === 'down') tColor = 'text-rose-400 font-extrabold';

  return (
    <div
      data-testid="card-pt-indicator"
      data-pt-effective={`${effectiveP}/${effectiveT}`}
      data-pt-status={overallStatus}
      data-base-pt={`${baseP ?? '*'}/${baseT ?? '*'}`}
      title={`P/T: ${effectiveP}/${effectiveT} (Base: ${baseP ?? '*'}/${baseT ?? '*'})`}
      className={`absolute -bottom-2.5 -left-1 z-20 pointer-events-none px-1.5 py-0.5 rounded text-[10px] font-mono leading-none border shadow-md flex items-center justify-center space-x-0.5 select-none ${badgeBorderBg}`}
    >
      <span className={pColor}>{effectiveP}</span>
      <span className="text-slate-400 text-[8px] font-normal">/</span>
      <span className={tColor}>{effectiveT}</span>
    </div>
  );
};

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
  cardPixelWidth?: number;
  cardPixelHeight?: number;
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
  cardPixelWidth?: number;
  cardPixelHeight?: number;
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
    posOrEvent?: { clientX?: number; x?: number } | React.MouseEvent,
    instance?: CardInstance
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
  cardPixelWidth,
  cardPixelHeight,
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

  // Clic derecho abre menú contextual (inspección de lectura para cartas ajenas o mutación para propias)
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
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

  const isTapped = !!card.isTapped;
  const [isAnimatingTap, setIsAnimatingTap] = useState(false);
  const prevTappedRef = React.useRef(isTapped);

  React.useEffect(() => {
    if (prevTappedRef.current !== isTapped) {
      prevTappedRef.current = isTapped;
      setIsAnimatingTap(true);
      const timer = setTimeout(() => {
        setIsAnimatingTap(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isTapped]);

  const handleTransitionEnd = (e: React.TransitionEvent) => {
    if (e.propertyName === 'transform' || e.propertyName === 'width' || e.propertyName === 'height') {
      setIsAnimatingTap(false);
    }
  };

  const cardWNum = cardPixelWidth || 96;
  const cardHNum = cardPixelHeight || 134;

  const winW = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const winH = typeof window !== 'undefined' ? window.innerHeight : 1080;

  const orientedW = isTapped ? cardHNum : cardWNum;
  const orientedH = isTapped ? cardWNum : cardHNum;

  // Convención única (Punto 2): la posición normalizada (x, y) es el centro de la carta.
  // El límite al viewport utiliza las dimensiones orientadas actuales (w x h o h x w).
  const rawCenterX = screenNormX * winW;
  const rawCenterY = screenNormY * winH;
  const clampedCenterX = Math.max(orientedW / 2, Math.min(winW - orientedW / 2, rawCenterX));
  const clampedCenterY = Math.max(orientedH / 2, Math.min(winH - orientedH / 2, rawCenterY));

  // Redondeo del centro de la carta a píxeles enteros exactos para eliminar subpíxeles y carta borrosa (Punto 1)
  const centerPixelX = Math.round(clampedCenterX);
  const centerPixelY = Math.round(clampedCenterY);

  const zIndex = optimisticPosition?.zIndex ?? (card.position?.zIndex ?? 5);

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
      onMouseEnter={(e) => !card.isFaceDown && !isDragging && showPreview(card.definition, e, card)}
      onMouseLeave={hidePreview}
      onTransitionEnd={handleTransitionEnd}
      className={`card-slot-container absolute group select-none pointer-events-auto flex items-center justify-center ${
        isAnimatingTap ? 'is-animating-tap' : ''
      } ${
        canMove ? 'cursor-pointer' : 'cursor-not-allowed'
      } ${
        isDragging || isRemoteDragging ? 'opacity-0 pointer-events-none' : ''
      }`}
      style={{
        left: `${centerPixelX}px`,
        top: `${centerPixelY}px`,
        transform: 'translate(-50%, -50%)',
        zIndex: isSelected ? 50 : zIndex,
        width: isTapped ? `${cardHNum}px` : `${cardWNum}px`,
        height: isTapped ? `${cardWNum}px` : `${cardHNum}px`,
      }}
    >
      {/* Rotating Card Body (Punto 7: rotación 90° alrededor del centro invariante, nítida y sin 3D) */}
      <div
        data-card-rotator="true"
        className={`card-rotator rounded-md overflow-hidden border shadow-md relative bg-slate-900 flex-shrink-0 ${
          isAnimatingTap ? 'is-animating-tap' : ''
        } ${
          isSelected
            ? 'border-amber-400 ring-2 ring-amber-400/50 shadow-amber-500/20'
            : 'border-slate-800 hover:border-slate-600'
        }`}
        style={{
          width: `${cardWNum}px`,
          height: `${cardHNum}px`,
          transform: isTapped ? 'rotate(90deg)' : 'rotate(0deg)',
          transformOrigin: 'center center',
        }}
      >
        <CardDisplay
          card={card.definition}
          isFaceDown={card.isFaceDown}
          isTapped={isTapped}
        />

        {/* Insignias de Contadores y Palabras Clave oficiales (Punto 4): pegada al borde superior sin cubrir la linea inferior */}
        {!card.isFaceDown && <CardBadges card={card} />}
      </div>

      {/* Indicador P/T efectivo anclado a la esquina inferior izquierda de la caja visual sin girar con ella (Punto 2) */}
      {!card.isFaceDown && <CardPTBadge card={card} />}

      {/* Menú contextual unificado con destinos (mano, cementerio, exilio, biblioteca) y revelar (Punto 7) */}
      {contextMenuPos && (
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
  cardPixelWidth,
  cardPixelHeight,
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
            cardPixelWidth={cardPixelWidth}
            cardPixelHeight={cardPixelHeight}
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
          const winW = typeof window !== 'undefined' ? window.innerWidth : 1920;
          const winH = typeof window !== 'undefined' ? window.innerHeight : 1080;
          const cardWNum = cardPixelWidth || 96;
          const cardHNum = cardPixelHeight || 134;
          const ghostW = item.isTapped ? cardHNum : cardWNum;
          const ghostH = item.isTapped ? cardWNum : cardHNum;

          // Convención única (Punto 2 & Punto 3): la posición es el centro con dimensiones orientadas
          const rawGhostCenterX = screenNormX * winW;
          const rawGhostCenterY = screenNormY * winH;
          const clampedGhostCenterX = Math.max(ghostW / 2, Math.min(winW - ghostW / 2, rawGhostCenterX));
          const clampedGhostCenterY = Math.max(ghostH / 2, Math.min(winH - ghostH / 2, rawGhostCenterY));

          const ghostCenterX = Math.round(clampedGhostCenterX);
          const ghostCenterY = Math.round(clampedGhostCenterY);

          return (
            <div
              key={`remote-drag-${item.cardInstanceId}`}
              data-remote-drag="true"
              data-remote-card-ghost="true"
              data-card-instance-id={item.cardInstanceId}
              data-player-id={item.playerId}
              className={`card-slot-container absolute pointer-events-none select-none z-40 flex items-center justify-center ${
                item.isFirstMessage || (item as any).pendingSync
                  ? 'transition-none'
                  : 'transition-[left,top] duration-75 ease-linear'
              }`}
              style={{
                left: `${ghostCenterX}px`,
                top: `${ghostCenterY}px`,
                transform: 'translate(-50%, -50%)',
                width: item.isTapped ? `${cardHNum}px` : `${cardWNum}px`,
                height: item.isTapped ? `${cardWNum}px` : `${cardHNum}px`,
              }}
            >
              <div
                data-card-rotator="true"
                style={{
                  width: `${cardWNum}px`,
                  height: `${cardHNum}px`,
                  transform: item.isTapped ? 'rotate(90deg)' : 'rotate(0deg)',
                  transformOrigin: 'center center',
                }}
                className="card-rotator flex-shrink-0 rounded-md overflow-hidden border border-amber-400/80 shadow-lg shadow-amber-500/25 bg-slate-900 relative"
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
