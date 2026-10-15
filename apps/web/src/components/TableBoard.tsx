import React, { useState, useEffect, useRef, useCallback } from 'react';
import { flushSync } from 'react-dom';
import type { RoomState, GameActionType, PlayerState, CardInstance } from '@mtgc/shared';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  pointerWithin,
  type CollisionDetection,
  type DragStartEvent,
  type DragMoveEvent,
  type DragEndEvent,
  type DragCancelEvent,
} from '@dnd-kit/core';
import { TableGrid } from './TableGrid';
import { PlayerCell } from './PlayerCell';
import { BattlefieldCanvas } from './BattlefieldCanvas';
import { ExpandedCellView } from './ExpandedCellView';
import { CardDisplay } from './CardDisplay';
import { Portal } from './Portal';
import { CardPreviewProvider, useCardPreview } from '../context/CardPreviewContext';
import type { RemoteDragState } from '../hooks/useGameSocket';

interface TableBoardProps {
  roomState: RoomState;
  localPlayerId: string;
  connectionStatus: string;
  remoteDraggingCards?: Record<string, RemoteDragState>;
  onAction: (type: GameActionType, payload: unknown) => void;
  onLeaveRoom: () => void;
}

const TableBoardInner: React.FC<TableBoardProps> = ({
  roomState,
  localPlayerId,
  remoteDraggingCards,
  onAction,
  onLeaveRoom,
}) => {
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  const [activeDragItem, setActiveDragItem] = useState<{
    card: CardInstance;
    fromZone: 'hand' | 'battlefield' | 'command' | 'library' | 'graveyard' | 'exile';
  } | null>(null);
  const [optimisticPositions, setOptimisticPositions] = useState<
    Record<string, { x: number; y: number; zIndex?: number; timestamp: number }>
  >({});

  const { setIsDragging } = useCardPreview();

  // Medidas reales de la carta en la mesa en píxeles según pod y viewport (Punto 1)
  const podSize = Object.keys(roomState.players).length;
  const isTwoPlayer = podSize <= 2;
  const [viewportSize, setViewportSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080,
  });

  useEffect(() => {
    const handleResize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const cellHeight = isTwoPlayer ? viewportSize.height : viewportSize.height / 2;
  const cardPixelHeight = Math.round(Math.max(70, Math.min(210, cellHeight * 0.20)));
  const cardPixelWidth = Math.round(cardPixelHeight * 0.714);

  // Pointer sensor con activationConstraint de 8px para distinguir clic de arrastre (REQ-9.2, REQ-22)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor),
  );

  // MesaTotal es el único droppable de la mesa (Punto 6)
  const { setNodeRef: setTabletopRef } = useDroppable({
    id: 'tabletop',
    data: { zone: 'battlefield' },
  });

  // Detección estricta de colisión por puntero (Punto 4):
  // La carta va a una pila sólo si el puntero está dentro de esa pila; en cualquier otro caso queda en la mesa.
  const customCollisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      const pileCollision = pointerCollisions.find(c => c.id !== 'tabletop');
      if (pileCollision) return [pileCollision];
      return pointerCollisions;
    }
    return [{ id: 'tabletop' } as any];
  };

  // Modificador en vivo para restringir el arrastre al viewport y evitar desbordamientos y saltos (Punto 3)
  const restrictToViewportModifier = ({
    transform,
    activeNodeRect,
  }: {
    transform: { x: number; y: number; scaleX: number; scaleY: number };
    activeNodeRect: { top: number; left: number; width: number; height: number; bottom: number; right: number } | null;
  }) => {
    if (!activeNodeRect) return transform;
    const winW = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const winH = typeof window !== 'undefined' ? window.innerHeight : 1080;

    const currentLeft = activeNodeRect.left + transform.x;
    const currentTop = activeNodeRect.top + transform.y;

    const clampedLeft = Math.max(0, Math.min(winW - activeNodeRect.width, currentLeft));
    const clampedTop = Math.max(0, Math.min(winH - activeNodeRect.height, currentTop));

    return {
      ...transform,
      x: transform.x + (clampedLeft - currentLeft),
      y: transform.y + (clampedTop - currentTop),
    };
  };

  const lastDragMoveTimeRef = useRef<number>(0);

  const handleDragStart = (event: DragStartEvent) => {
    setIsDragging(true);
    const data = event.active.data.current as {
      card: CardInstance;
      fromZone: 'hand' | 'battlefield' | 'command' | 'library' | 'graveyard' | 'exile';
    } | undefined;

    if (data?.card) {
      setActiveDragItem({ card: data.card, fromZone: data.fromZone });

      const initial = event.active.rect.current?.initial;
      const winW = typeof window !== 'undefined' ? window.innerWidth : 1920;
      const winH = typeof window !== 'undefined' ? window.innerHeight : 1080;
      const normX = initial ? Math.max(0, Math.min(winW - cardPixelWidth, initial.left)) / winW : 0.5;
      const normY = initial ? Math.max(0, Math.min(winH - cardPixelHeight, initial.top)) / winH : 0.5;

      onAction('CARD_DRAG_MOVE', {
        cardInstanceId: event.active.id,
        isDragging: true,
        position: { x: normX, y: normY },
        cardDefinition: data.card.definition,
        fromZone: data.fromZone,
      });
    }
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const now = Date.now();
    if (now - lastDragMoveTimeRef.current < 33) {
      return; // ~30 fps throttling (Punto 5, REQ-9)
    }
    lastDragMoveTimeRef.current = now;

    const translated = event.active.rect.current?.translated;
    const initial = event.active.rect.current?.initial;

    const overlayWidth = translated?.width || initial?.width || cardPixelWidth;
    const overlayHeight = translated?.height || initial?.height || cardPixelHeight;

    let overlayLeft = 0;
    let overlayTop = 0;

    if (translated) {
      overlayLeft = translated.left;
      overlayTop = translated.top;
    } else if (initial) {
      overlayLeft = initial.left + (event.delta?.x ?? 0);
      overlayTop = initial.top + (event.delta?.y ?? 0);
    } else if (event.activatorEvent instanceof MouseEvent || event.activatorEvent instanceof PointerEvent) {
      overlayLeft = event.activatorEvent.clientX - overlayWidth / 2 + (event.delta?.x ?? 0);
      overlayTop = event.activatorEvent.clientY - overlayHeight / 2 + (event.delta?.y ?? 0);
    }

    const winW = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const winH = typeof window !== 'undefined' ? window.innerHeight : 1080;

    const clampedX = Math.max(0, Math.min(winW - overlayWidth, overlayLeft));
    const clampedY = Math.max(0, Math.min(winH - overlayHeight, overlayTop));

    const normX = clampedX / winW;
    const normY = clampedY / winH;

    const data = event.active.data.current as {
      card?: CardInstance;
      fromZone?: 'hand' | 'battlefield' | 'command' | 'library' | 'graveyard' | 'exile';
    } | undefined;

    onAction('CARD_DRAG_MOVE', {
      cardInstanceId: event.active.id,
      isDragging: true,
      position: { x: normX, y: normY },
      cardDefinition: data?.card?.definition,
      fromZone: data?.fromZone,
    });
  };

  const handleDragCancel = useCallback((event?: DragCancelEvent) => {
    const cardId = activeDragItem?.card.instanceId || event?.active?.id;
    if (cardId) {
      onAction('CARD_DRAG_MOVE', {
        cardInstanceId: cardId,
        isDragging: false,
      });
    }
    setIsDragging(false);
    setActiveDragItem(null);
  }, [activeDragItem, onAction, setIsDragging]);

  // Cancelar arrastre con Escape (Punto 5)
  useEffect(() => {
    if (!activeDragItem) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDragCancel();
        window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDragItem, handleDragCancel]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    // Notificar fin de arrastre efímero
    onAction('CARD_DRAG_MOVE', {
      cardInstanceId: active.id,
      isDragging: false,
    });

    const overData = over?.data.current as { zone?: string; playerId?: string } | undefined;
    const fromZone = (active.data.current as { fromZone?: string })?.fromZone;

    // Punto 4 / 7: Soltar sobre biblioteca, cementerio o exilio la transfiere a esa pila si el puntero está dentro
    if (overData?.zone === 'library' || overData?.zone === 'graveyard' || overData?.zone === 'exile') {
      flushSync(() => {
        setIsDragging(false);
        setActiveDragItem(null);
      });
      onAction('MOVE_CARD', {
        cardInstanceId: active.id,
        fromZone: fromZone || 'battlefield',
        toZone: overData.zone,
        toPlayerId: overData.playerId || localPlayerId,
      });
      return;
    }

    // Punto 6: Soltar sobre la propia mano la devuelve a la mano
    if (overData?.zone === 'hand' && overData?.playerId === localPlayerId) {
      flushSync(() => {
        setIsDragging(false);
        setActiveDragItem(null);
      });
      onAction('MOVE_CARD', {
        cardInstanceId: active.id,
        fromZone: fromZone || 'battlefield',
        toZone: 'hand',
        toPlayerId: localPlayerId,
      });
      return;
    }

    // Punto 3: La posición final se calcula a partir del rectángulo real del overlay al soltar
    const translated = active.rect.current?.translated;
    const initial = active.rect.current?.initial;

    const overlayWidth = translated?.width || initial?.width || cardPixelWidth;
    const overlayHeight = translated?.height || initial?.height || cardPixelHeight;

    let overlayLeft = 0;
    let overlayTop = 0;

    if (translated) {
      overlayLeft = translated.left;
      overlayTop = translated.top;
    } else if (initial) {
      overlayLeft = initial.left + (event.delta?.x ?? 0);
      overlayTop = initial.top + (event.delta?.y ?? 0);
    } else if (event.activatorEvent instanceof MouseEvent || event.activatorEvent instanceof PointerEvent) {
      overlayLeft = event.activatorEvent.clientX - overlayWidth / 2 + (event.delta?.x ?? 0);
      overlayTop = event.activatorEvent.clientY - overlayHeight / 2 + (event.delta?.y ?? 0);
    }

    const winW = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const winH = typeof window !== 'undefined' ? window.innerHeight : 1080;

    // Ajuste estricto dentro del viewport
    const clampedX = Math.max(0, Math.min(winW - overlayWidth, overlayLeft));
    const clampedY = Math.max(0, Math.min(winH - overlayHeight, overlayTop));

    // Coordenadas globales normalizadas sin snapping ni redondeos visibles
    const normX = clampedX / winW;
    const normY = clampedY / winH;

    // Punto 1: Aplicar posición de forma optimista y síncrona en el mismo frame para eliminar parpadeo
    flushSync(() => {
      setOptimisticPositions(prev => ({
        ...prev,
        [active.id as string]: { x: normX, y: normY, zIndex: 10, timestamp: Date.now() },
      }));
      setIsDragging(false);
      setActiveDragItem(null);
    });

    // Detectar celda de jugador bajo el centro de la carta
    let targetPlayerId = overData?.playerId;
    const centerPointX = clampedX + overlayWidth / 2;
    const centerPointY = clampedY + overlayHeight / 2;

    if (!targetPlayerId && typeof document !== 'undefined') {
      const elementsUnder = document.elementsFromPoint(centerPointX, centerPointY);
      for (const el of elementsUnder) {
        const cell = el.closest('[data-player-cell]');
        if (cell) {
          targetPlayerId = cell.getAttribute('data-player-cell') || undefined;
          break;
        }
      }
    }

    const finalPlayerId = targetPlayerId || localPlayerId;

    // Punto 5 / 7: Permitir jugar desde hand, command, library, graveyard y exile a la mesa
    if (
      fromZone === 'hand' ||
      fromZone === 'command' ||
      fromZone === 'library' ||
      fromZone === 'graveyard' ||
      fromZone === 'exile'
    ) {
      onAction('MOVE_CARD', {
        cardInstanceId: active.id,
        fromZone: fromZone,
        toZone: 'battlefield',
        toPlayerId: localPlayerId,
        position: { x: normX, y: normY, zIndex: 10 },
      });
    } else if (fromZone === 'battlefield') {
      onAction('MOVE_CARD', {
        cardInstanceId: active.id,
        fromZone: 'battlefield',
        toZone: 'battlefield',
        toPlayerId: finalPlayerId,
        position: { x: normX, y: normY, zIndex: 10 },
      });
    }
  };

  const expandedPlayer = expandedPlayerId
    ? roomState.players[expandedPlayerId]
    : null;

  const emptyZones = {
    library: [],
    hand: [],
    battlefield: [],
    graveyard: [],
    exile: [],
    command: [],
  };

  const allBattlefieldCards = Object.values(roomState.playerZones).flatMap(
    zones => zones.battlefield
  );

  // Punto 1: Reconciliación con confirmación del servidor sin retroceder ante ecos desactualizados
  useEffect(() => {
    setOptimisticPositions(prev => {
      let changed = false;
      const next = { ...prev };
      const now = Date.now();
      for (const [id, opt] of Object.entries(next)) {
        const card = allBattlefieldCards.find(c => c.instanceId === id);
        if (card && card.position) {
          const dx = Math.abs(card.position.x - opt.x);
          const dy = Math.abs(card.position.y - opt.y);
          // Si el servidor ya confirmó la posición (distancia < 0.005), reconciliamos
          if (dx < 0.005 && dy < 0.005) {
            delete next[id];
            changed = true;
          }
        }
        // Timeout de seguridad: limpiar tras 3s
        if (now - opt.timestamp > 3000) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [allBattlefieldCards]);

  const renderPlayerCell = (
    player: PlayerState,
    row: 0 | 1,
    col: number,
    isLocal: boolean,
    isTwoPlayer?: boolean,
  ) => {
    const zones = roomState.playerZones[player.id] || emptyZones;
    const isActiveTurn = roomState.activePlayerId === player.id;

    return (
      <PlayerCell
        player={player}
        zones={zones}
        row={row}
        col={col}
        isLocalPlayer={isLocal}
        isTwoPlayer={isTwoPlayer}
        isActiveTurn={isActiveTurn}
        onAction={onAction}
        onExpandCell={() => setExpandedPlayerId(player.id)}
      />
    );
  };

  return (
    <DndContext
      sensors={sensors}
      modifiers={[restrictToViewportModifier]}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div
        id="mesa-total"
        ref={setTabletopRef}
        style={{
          '--card-w': `${cardPixelWidth}px`,
          '--card-h': `${cardPixelHeight}px`,
        } as React.CSSProperties}
        className="relative w-screen h-[100dvh] overflow-hidden bg-black select-none"
      >
        {/* Full-bleed Table Grid (Visual Divisions & Floating Docks) */}
        <TableGrid
          roomState={roomState}
          localPlayerId={localPlayerId}
          onAction={onAction}
          onLeaveRoom={onLeaveRoom}
          renderPlayerCell={renderPlayerCell}
        />

        {/* Capa Única de Cartas en MesaTotal con Coordenadas Globales Normalizadas (Punto 1, REQ-9.7, REQ-22) */}
        <BattlefieldCanvas
          cards={allBattlefieldCards}
          remoteDraggingCards={remoteDraggingCards}
          optimisticPositions={optimisticPositions}
          onAction={onAction}
        />

        {/* Expanded Cell View Modal (REQ-22.11) */}
        {expandedPlayer && (
          <ExpandedCellView
            player={expandedPlayer}
            zones={roomState.playerZones[expandedPlayer.id] || emptyZones}
            isLocal={expandedPlayer.id === localPlayerId}
            isActiveTurn={roomState.activePlayerId === expandedPlayer.id}
            onClose={() => setExpandedPlayerId(null)}
            onAction={onAction}
          />
        )}

        {/* Drag Overlay visual en portal a document.body con medidas exactas en px sin zoom ni rotación (Punto 1) */}
        <Portal>
          <DragOverlay dropAnimation={null}>
            {activeDragItem ? (
              <div
                data-drag-overlay="true"
                style={{
                  width: `${cardPixelWidth}px`,
                  height: `${cardPixelHeight}px`,
                  transition: 'none',
                }}
                className="rounded-lg overflow-hidden border border-slate-700/80 shadow-md pointer-events-none select-none z-[9999]"
              >
                <CardDisplay
                  card={activeDragItem.card.definition}
                  isFaceDown={activeDragItem.card.isFaceDown}
                  allowFaceToggle={false}
                />
              </div>
            ) : null}
          </DragOverlay>
        </Portal>
      </div>
    </DndContext>
  );
};

export const TableBoard: React.FC<TableBoardProps> = props => {
  return (
    <CardPreviewProvider>
      <TableBoardInner {...props} />
    </CardPreviewProvider>
  );
};
