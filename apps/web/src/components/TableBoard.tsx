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
import { BattlefieldCanvas, type ViewFraming } from './BattlefieldCanvas';
import { CardDisplay } from './CardDisplay';
import { Portal } from './Portal';
import { CardPreviewProvider, useCardPreview } from '../context/CardPreviewContext';
import type { RemoteDragState } from '../hooks/useGameSocket';

export function getPlayerFraming(playerId: string, roomState: RoomState): ViewFraming {
  const allSeated = Object.values(roomState.players).filter(p => !p.isSpectator);
  const totalPlayers = Math.max(2, allSeated.length);
  const isTwoPlayerMode = totalPlayers === 2;
  const cols = isTwoPlayerMode ? 2 : Math.min(3, Math.max(2, Math.ceil(totalPlayers / 2)));
  const seatedPlayers = [...allSeated].sort((a, b) => (a.seatNumber ?? 0) - (b.seatNumber ?? 0));

  const playerIdx = seatedPlayers.findIndex(p => p.id === playerId);
  if (playerIdx === -1) {
    return { xMin: 0, yMin: 0, width: 1, height: 1, isExpanded: false };
  }

  if (isTwoPlayerMode) {
    const col = playerIdx === 0 ? 0 : 1;
    return {
      xMin: col * 0.5,
      yMin: 0,
      width: 0.5,
      height: 1.0,
      isExpanded: true,
    };
  }

  const row = playerIdx < cols ? 0 : 1;
  const col = playerIdx < cols ? playerIdx : playerIdx - cols;

  return {
    xMin: col / cols,
    yMin: row === 0 ? 0 : 0.5,
    width: 1 / cols,
    height: 0.5,
    isExpanded: true,
  };
}

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
  const viewFraming = expandedPlayerId ? getPlayerFraming(expandedPlayerId, roomState) : undefined;
  const [activeDragItem, setActiveDragItem] = useState<{
    card: CardInstance;
    fromZone: 'hand' | 'battlefield' | 'command' | 'library' | 'graveyard' | 'exile';
  } | null>(null);
  const [optimisticPositions, setOptimisticPositions] = useState<
    Record<string, { x: number; y: number; zIndex?: number; timestamp: number }>
  >({});
  const [permissionWarning, setPermissionWarning] = useState<string | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showPermissionWarning = useCallback((message: string) => {
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
    }
    setPermissionWarning(message);
    warningTimerRef.current = setTimeout(() => {
      setPermissionWarning(null);
      warningTimerRef.current = null;
    }, 3000);
  }, []);

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

  const cellWidth = isTwoPlayer
    ? viewportSize.width / 2
    : podSize <= 4
    ? viewportSize.width / 2
    : viewportSize.width / 3;

  const cellHeight = isTwoPlayer
    ? viewportSize.height
    : viewportSize.height / 2;

  // Límite por alto: cerca del 20% del alto de la celda (REQ-22.6.3 / Punto 9)
  const maxHByCellHeight = cellHeight * 0.20;

  // Límite por ancho: vida (~80px) + gaps/padding (~50px) + comandante (W) + mano (~2.5*W) + biblioteca (W) + pilas (W)
  // 5.5 * W <= cellWidth - 130  =>  W <= (cellWidth - 130) / 5.5
  const maxWByCellWidth = Math.max(45, (cellWidth - 130) / 5.5);
  const maxHByCellWidth = maxWByCellWidth / 0.714;

  // El tamaño de carta debe ser el MENOR entre el límite por alto y el límite por ancho (Punto 9)
  const cardPixelHeight = Math.round(Math.max(65, Math.min(135, Math.min(maxHByCellHeight, maxHByCellWidth))));
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
      const isTapped = !!data.card.isTapped;
      const overlayWidth = isTapped ? cardPixelHeight : cardPixelWidth;
      const overlayHeight = isTapped ? cardPixelWidth : cardPixelHeight;
      const clampedX = initial ? Math.max(0, Math.min(winW - overlayWidth, initial.left)) : winW * 0.5;
      const clampedY = initial ? Math.max(0, Math.min(winH - overlayHeight, initial.top)) : winH * 0.5;
      const uScreen = clampedX / winW;
      const vScreen = clampedY / winH;
      const normX = viewFraming?.isExpanded
        ? Math.max(0, Math.min(1, viewFraming.xMin + uScreen * viewFraming.width))
        : uScreen;
      const normY = viewFraming?.isExpanded
        ? Math.max(0, Math.min(1, viewFraming.yMin + vScreen * viewFraming.height))
        : vScreen;

      onAction('CARD_DRAG_MOVE', {
        cardInstanceId: event.active.id,
        isDragging: true,
        position: { x: normX, y: normY },
        cardDefinition: data.card.definition,
        fromZone: data.fromZone,
        isTapped,
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

    const data = event.active.data.current as {
      card?: CardInstance;
      fromZone?: 'hand' | 'battlefield' | 'command' | 'library' | 'graveyard' | 'exile';
    } | undefined;

    const isTapped = !!(data?.card?.isTapped || activeDragItem?.card?.isTapped);
    const overlayWidth = isTapped ? cardPixelHeight : (translated?.width || initial?.width || cardPixelWidth);
    const overlayHeight = isTapped ? cardPixelWidth : (translated?.height || initial?.height || cardPixelHeight);

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

    const uScreen = clampedX / winW;
    const vScreen = clampedY / winH;
    const normX = viewFraming?.isExpanded
      ? Math.max(0, Math.min(1, viewFraming.xMin + uScreen * viewFraming.width))
      : uScreen;
    const normY = viewFraming?.isExpanded
      ? Math.max(0, Math.min(1, viewFraming.yMin + vScreen * viewFraming.height))
      : vScreen;

    onAction('CARD_DRAG_MOVE', {
      cardInstanceId: event.active.id,
      isDragging: true,
      position: { x: normX, y: normY },
      cardDefinition: data?.card?.definition || activeDragItem?.card?.definition,
      fromZone: data?.fromZone || activeDragItem?.fromZone,
      isTapped,
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

  // Cancelar arrastre con Escape o cerrar mesa expandida si no hay arrastre (Punto 3 / Punto 5)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeDragItem) {
          handleDragCancel();
          window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
        } else if (expandedPlayerId) {
          setExpandedPlayerId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDragItem, expandedPlayerId, handleDragCancel]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    const overData = over?.data.current as { zone?: string; playerId?: string } | undefined;
    const fromZone = (active.data.current as { fromZone?: string })?.fromZone;

    // Punto 2 / 3: La posición final se calcula a partir del rectángulo real del overlay al soltar
    const translated = active.rect.current?.translated;
    const initial = active.rect.current?.initial;

    const isTapped = !!activeDragItem?.card?.isTapped;
    const overlayWidth = isTapped ? cardPixelHeight : (translated?.width || initial?.width || cardPixelWidth);
    const overlayHeight = isTapped ? cardPixelWidth : (translated?.height || initial?.height || cardPixelHeight);

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

    // Coordenadas globales normalizadas mediante transformación inversa si la mesa está expandida (Punto 3)
    const uScreen = clampedX / winW;
    const vScreen = clampedY / winH;
    const normX = viewFraming?.isExpanded
      ? Math.max(0, Math.min(1, viewFraming.xMin + uScreen * viewFraming.width))
      : uScreen;
    const normY = viewFraming?.isExpanded
      ? Math.max(0, Math.min(1, viewFraming.yMin + vScreen * viewFraming.height))
      : vScreen;

    // Punto 1 / Punto 2: Notificar fin de arrastre efímero incluyendo la posición final calculada e isTapped
    onAction('CARD_DRAG_MOVE', {
      cardInstanceId: active.id,
      isDragging: false,
      position: { x: normX, y: normY },
      isTapped,
    });

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

    // Punto 6: Soltar sobre la zona de comando la devuelve al comando (+2 tax automático)
    if (overData?.zone === 'command' && overData?.playerId === localPlayerId) {
      flushSync(() => {
        setIsDragging(false);
        setActiveDragItem(null);
      });
      onAction('MOVE_CARD', {
        cardInstanceId: active.id,
        fromZone: fromZone || 'battlefield',
        toZone: 'command',
        toPlayerId: localPlayerId,
      });
      return;
    }

    // Punto 1: Aplicar posición de forma optimista y síncrona en el mismo frame para eliminar parpadeo en emisor
    flushSync(() => {
      setOptimisticPositions(prev => ({
        ...prev,
        [active.id as string]: { x: normX, y: normY, zIndex: 10, timestamp: Date.now() },
      }));
      setIsDragging(false);
      setActiveDragItem(null);
    });

    // Punto 5: Calcular titular temporal (holderId)
    // holderId es el jugador cuya división contiene la caja de la carta (ya girada) al 100%;
    // si queda entre dos divisiones o fuera, holderId queda vacío (undefined).
    let calculatedHolderId: string | undefined = undefined;
    const seatedPlayers = Object.values(roomState.players)
      .filter(p => !p.isSpectator)
      .sort((a, b) => (a.seatNumber ?? 0) - (b.seatNumber ?? 0));

    if (typeof document !== 'undefined') {
      const cardBox = {
        left: clampedX,
        top: clampedY,
        right: clampedX + overlayWidth,
        bottom: clampedY + overlayHeight,
      };

      for (const p of seatedPlayers) {
        const cellEl = document.querySelector(`[data-player-cell="${p.id}"]`);
        if (cellEl) {
          const rect = cellEl.getBoundingClientRect();
          // Comprobar contención al 100% con margen de 2px para subpixel rounding
          const is100PercentInside =
            cardBox.left >= rect.left - 2 &&
            cardBox.right <= rect.right + 2 &&
            cardBox.top >= rect.top - 2 &&
            cardBox.bottom <= rect.bottom + 2;

          if (is100PercentInside) {
            calculatedHolderId = p.id;
            break;
          }
        }
      }
    }

    const finalPlayerId = calculatedHolderId || localPlayerId;

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
        toPlayerId: finalPlayerId,
        holderId: calculatedHolderId,
        position: { x: normX, y: normY, zIndex: 10 },
      });
    } else if (fromZone === 'battlefield') {
      onAction('MOVE_CARD', {
        cardInstanceId: active.id,
        fromZone: 'battlefield',
        toZone: 'battlefield',
        toPlayerId: finalPlayerId,
        holderId: calculatedHolderId,
        position: { x: normX, y: normY, zIndex: 10 },
      });
    }
  };

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
        localPlayerId={localPlayerId}
        allBattlefieldCards={allBattlefieldCards}
        onAction={onAction}
        onExpandCell={() => setExpandedPlayerId(expandedPlayerId === player.id ? null : player.id)}
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
        {/* Full-bleed Table Grid (Visual Divisions & Floating Docks o Vista Ampliada) */}
        <TableGrid
          roomState={roomState}
          localPlayerId={localPlayerId}
          onAction={onAction}
          onLeaveRoom={onLeaveRoom}
          renderPlayerCell={renderPlayerCell}
          expandedPlayerId={expandedPlayerId}
          onCloseExpanded={() => setExpandedPlayerId(null)}
        />

        {/* Capa Única de Cartas en MesaTotal con Coordenadas Globales Normalizadas y Zoom (Punto 1, Punto 3) */}
        <BattlefieldCanvas
          cards={allBattlefieldCards}
          remoteDraggingCards={remoteDraggingCards}
          optimisticPositions={optimisticPositions}
          viewFraming={viewFraming}
          localPlayerId={localPlayerId}
          onUnauthorizedAttempt={() =>
            showPermissionWarning(
              'No puedes mover una carta ajena sin ser su titular temporal.',
            )
          }
          onAction={onAction}
        />

        {/* Aviso breve de validación de propiedad/titularidad en el cliente (Punto 5) */}
        {permissionWarning && (
          <div
            data-testid="permission-warning"
            className="fixed top-14 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 bg-amber-950/95 border border-amber-500/90 text-amber-200 text-xs font-semibold rounded-xl shadow-2xl backdrop-blur-md flex items-center space-x-2 animate-bounce"
          >
            <span>⚠️ {permissionWarning}</span>
          </div>
        )}

        {/* Drag Overlay visual en portal a document.body con medidas exactas en px, conservando giro apaisado para cartas giradas (Punto 2) */}
        <Portal>
          <DragOverlay dropAnimation={null}>
            {activeDragItem ? (
              <div
                data-drag-overlay="true"
                style={
                  activeDragItem.card.isTapped
                    ? {
                        width: `${cardPixelHeight}px`,
                        height: `${cardPixelWidth}px`,
                        position: 'relative',
                        transition: 'none',
                      }
                    : {
                        width: `${cardPixelWidth}px`,
                        height: `${cardPixelHeight}px`,
                        transition: 'none',
                      }
                }
                className="pointer-events-none select-none z-[9999]"
              >
                {activeDragItem.card.isTapped ? (
                  <div
                    style={{
                      width: `${cardPixelWidth}px`,
                      height: `${cardPixelHeight}px`,
                      position: 'absolute',
                      left: `${(cardPixelHeight - cardPixelWidth) / 2}px`,
                      top: `${(cardPixelWidth - cardPixelHeight) / 2}px`,
                      transition: 'none',
                    }}
                    className="rounded-lg overflow-hidden border border-slate-700/80 shadow-md origin-center rotate-90"
                  >
                    <CardDisplay
                      card={activeDragItem.card.definition}
                      isFaceDown={activeDragItem.card.isFaceDown}
                      allowFaceToggle={false}
                      isTapped={true}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      width: `${cardPixelWidth}px`,
                      height: `${cardPixelHeight}px`,
                      transition: 'none',
                    }}
                    className="rounded-lg overflow-hidden border border-slate-700/80 shadow-md"
                  >
                    <CardDisplay
                      card={activeDragItem.card.definition}
                      isFaceDown={activeDragItem.card.isFaceDown}
                      allowFaceToggle={false}
                    />
                  </div>
                )}
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
