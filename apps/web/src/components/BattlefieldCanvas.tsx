import React, { useState } from 'react';
import type { CardInstance, GameActionType, CardDefinition } from '@mtgc/shared';
import { useDraggable } from '@dnd-kit/core';
import { RotateCw, Eye, Plus, Copy } from 'lucide-react';
import { CardDisplay } from './CardDisplay';
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
  viewFraming?: ViewFraming;
  onAction: (type: GameActionType, payload: unknown) => void;
}

interface BattlefieldCardItemProps {
  card: CardInstance;
  isLocalPlayer: boolean;
  isSelected: boolean;
  optimisticPosition?: { x: number; y: number; zIndex?: number };
  isRemoteDragging?: boolean;
  viewFraming?: ViewFraming;
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
  optimisticPosition,
  isRemoteDragging,
  viewFraming,
  onCardClick,
  onTap,
  onFlip,
  onAddCounter,
  onClone,
  showPreview,
  hidePreview,
}) => {
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const longPressTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.instanceId,
    data: { card, fromZone: 'battlefield' },
    disabled: !isLocalPlayer,
  });

  // Punto 4: Cerrar menú contextual al hacer clic fuera o pulsar Escape (con captura para no propagar a la vista expandida)
  React.useEffect(() => {
    if (!isContextMenuOpen) return;
    const handleClickOutside = () => setIsContextMenuOpen(false);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.stopImmediatePropagation?.();
        setIsContextMenuOpen(false);
      }
    };
    window.addEventListener('click', handleClickOutside);
    window.addEventListener('contextmenu', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('contextmenu', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isContextMenuOpen]);

  // Clic derecho abre menú contextual
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLocalPlayer) {
      setIsContextMenuOpen(true);
    }
  };

  // Doble clic gira o endereza sin disparar ampliaciones
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLocalPlayer) {
      onTap();
    }
  };

  // Táctil: pulsación larga de 500 ms abre menú contextual
  const handleTouchStart = () => {
    if (!isLocalPlayer) return;
    longPressTimerRef.current = setTimeout(() => {
      setIsContextMenuOpen(true);
    }, 500);
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
      data-card-name={card.definition.name}
      data-card-instance-id={card.instanceId}
      data-tapped={isTapped ? 'true' : 'false'}
      onClick={onCardClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
      onMouseEnter={() => !card.isFaceDown && !isDragging && showPreview(card.definition)}
      onMouseLeave={hidePreview}
      className={`absolute cursor-pointer group select-none pointer-events-auto transition-[width,height] duration-150 ${
        isDragging || isRemoteDragging ? 'opacity-0 pointer-events-none' : ''
      }`}
      style={{
        left: `${posX}%`,
        top: `${posY}%`,
        zIndex: isSelected ? 50 : zIndex,
        width: cardW,
        height: cardH,
      }}
    >
      {/* Card Frame */}
      <div
        className={`w-full h-full rounded-md overflow-hidden border shadow-md relative bg-slate-900 flex items-center justify-center ${
          isSelected
            ? 'border-amber-400 ring-2 ring-amber-400/50 shadow-amber-500/20'
            : 'border-slate-800 hover:border-slate-600'
        }`}
      >
        <div
          style={{
            width: 'var(--card-w)',
            height: 'var(--card-h)',
          }}
          className={`flex-shrink-0 origin-center transition-transform duration-150 ${isTapped ? 'rotate-90' : ''}`}
        >
          <CardDisplay
            card={card.definition}
            isFaceDown={card.isFaceDown}
            isTapped={isTapped}
          />
        </div>

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

      {/* Punto 4: Las opciones (girar, contador, clonar, ver) NO aparecen con clic simple; solo con clic derecho o pulsación larga */}
      {isLocalPlayer && isContextMenuOpen && (
        <div
          data-card-context-menu="true"
          onClick={e => e.stopPropagation()}
          className="absolute -top-9 left-1/2 -translate-x-1/2 flex items-center space-x-1 bg-slate-900/95 border border-slate-700 rounded-xl p-1 shadow-2xl z-50 text-[10px] backdrop-blur-md"
        >
          <button
            onClick={() => {
              onTap();
              setIsContextMenuOpen(false);
            }}
            className="p-1 hover:bg-slate-800 rounded text-amber-300 flex items-center space-x-1 px-1.5 cursor-pointer"
            title={card.isTapped ? 'Enderezar' : 'Girar'}
          >
            <RotateCw className="w-3 h-3" />
            <span>{card.isTapped ? 'Enderezar' : 'Girar'}</span>
          </button>
          <button
            onClick={() => {
              onAddCounter('+1/+1');
              setIsContextMenuOpen(false);
            }}
            className="p-1 hover:bg-slate-800 rounded text-emerald-300 flex items-center space-x-1 px-1.5 cursor-pointer"
            title="Añadir contador +1/+1"
          >
            <Plus className="w-3 h-3" />
            <span>+1/+1</span>
          </button>
          <button
            onClick={() => {
              onClone();
              setIsContextMenuOpen(false);
            }}
            className="p-1 hover:bg-slate-800 rounded text-blue-300 flex items-center space-x-1 px-1.5 cursor-pointer"
            title="Clonar token/permanente (REQ-9.4)"
          >
            <Copy className="w-3 h-3" />
            <span>Clonar</span>
          </button>
          <button
            onClick={() => {
              onFlip();
              setIsContextMenuOpen(false);
            }}
            className="p-1 hover:bg-slate-800 rounded text-slate-300 flex items-center space-x-1 px-1.5 cursor-pointer"
            title="Boca abajo / Boca arriba"
          >
            <Eye className="w-3 h-3" />
            <span>{card.isFaceDown ? 'Boca arriba' : 'Boca abajo'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export const BattlefieldCanvas: React.FC<BattlefieldCanvasProps> = ({
  cards,
  remoteDraggingCards,
  optimisticPositions,
  viewFraming,
  onAction,
}) => {
  const { showPreview, hidePreview } = useCardPreview();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const handleCardClick = (card: CardInstance) => {
    setSelectedCardId(selectedCardId === card.instanceId ? null : card.instanceId);
  };

  const handleTap = (card: CardInstance) => {
    // Rotación alrededor del centro: ajustar la posición para conservar el centro geométrico (xc, yc)
    if (typeof window !== 'undefined' && card.position) {
      const winW = window.innerWidth;
      const winH = window.innerHeight;
      const el = document.querySelector(`[data-card-instance-id="${card.instanceId}"]`) as HTMLElement | null;
      if (el) {
        const rect = el.getBoundingClientRect();
        const centerX = rect.x + rect.width / 2;
        const centerY = rect.y + rect.height / 2;
        // La nueva dimensión tras girar invierte ancho y alto
        const newW = rect.height;
        const newH = rect.width;
        const newLeft = centerX - newW / 2;
        const newTop = centerY - newH / 2;
        const rawNormX = Math.max(0, Math.min(winW - newW, newLeft)) / winW;
        const rawNormY = Math.max(0, Math.min(winH - newH, newTop)) / winH;
        const newNormX = viewFraming?.isExpanded
          ? viewFraming.xMin + rawNormX * viewFraming.width
          : rawNormX;
        const newNormY = viewFraming?.isExpanded
          ? viewFraming.yMin + rawNormY * viewFraming.height
          : rawNormY;

        onAction('MOVE_CARD', {
          cardInstanceId: card.instanceId,
          fromZone: 'battlefield',
          toZone: 'battlefield',
          position: { x: newNormX, y: newNormY, zIndex: card.position.zIndex ?? 5 },
        });
      }
    }

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
            isLocalPlayer={true}
            isSelected={selectedCardId === card.instanceId}
            optimisticPosition={optimisticPositions?.[card.instanceId]}
            isRemoteDragging={isRemoteDragging}
            viewFraming={viewFraming}
            onCardClick={() => handleCardClick(card)}
            onTap={() => handleTap(card)}
            onFlip={() => handleFlip(card)}
            onAddCounter={counterType => handleAddCounter(card, counterType)}
            onClone={() => handleClone(card)}
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
              data-card-instance-id={item.cardInstanceId}
              data-player-id={item.playerId}
              className={`absolute pointer-events-none select-none z-40 origin-center ${
                item.isTapped ? 'rotate-90' : ''
              } ${
                (item as any).pendingSync ? 'transition-none' : 'transition-[left,top] duration-75 ease-linear'
              }`}
              style={{
                left: `${posX}%`,
                top: `${posY}%`,
                width: 'var(--card-w)',
                height: 'var(--card-h)',
              }}
            >
              <div className="w-full h-full rounded-md overflow-hidden border border-amber-400/80 shadow-lg shadow-amber-500/25 bg-slate-900 relative">
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
