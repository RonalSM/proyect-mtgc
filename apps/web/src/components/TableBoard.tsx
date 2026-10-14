import React, { useState, useEffect } from 'react';
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
  rectIntersection,
  type CollisionDetection,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { TableGrid } from './TableGrid';
import { PlayerCell } from './PlayerCell';
import { BattlefieldCanvas } from './BattlefieldCanvas';
import { ExpandedCellView } from './ExpandedCellView';
import { CardDisplay } from './CardDisplay';
import { Portal } from './Portal';
import { CardPreviewProvider, useCardPreview } from '../context/CardPreviewContext';

interface TableBoardProps {
  roomState: RoomState;
  localPlayerId: string;
  connectionStatus: string;
  onAction: (type: GameActionType, payload: unknown) => void;
  onLeaveRoom: () => void;
}

const TableBoardInner: React.FC<TableBoardProps> = ({
  roomState,
  localPlayerId,
  onAction,
  onLeaveRoom,
}) => {
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  const [activeDragItem, setActiveDragItem] = useState<{
    card: CardInstance;
    fromZone: 'hand' | 'battlefield';
  } | null>(null);

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

  // Detección de colisiones: si el puntero está sobre una pila, priorizarla; de lo contrario tabletop
  const customCollisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      const pileCollision = pointerCollisions.find(c => c.id !== 'tabletop');
      if (pileCollision) return [pileCollision];
      return pointerCollisions;
    }
    const rectCollisions = rectIntersection(args);
    if (rectCollisions.length > 0) {
      const pileCollision = rectCollisions.find(c => c.id !== 'tabletop');
      if (pileCollision) return [pileCollision];
      return rectCollisions;
    }
    return [{ id: 'tabletop' } as any];
  };

  const handleDragStart = (event: DragStartEvent) => {
    setIsDragging(true);
    const data = event.active.data.current as {
      card: CardInstance;
      fromZone: 'hand' | 'battlefield';
    } | undefined;

    if (data?.card) {
      setActiveDragItem({ card: data.card, fromZone: data.fromZone });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setIsDragging(false);
    setActiveDragItem(null);

    const { active, over } = event;

    const overData = over?.data.current as { zone?: string; playerId?: string } | undefined;
    const fromZone = (active.data.current as { fromZone?: string })?.fromZone;

    // Punto 6: Soltar sobre biblioteca, cementerio o exilio la transfiere a esa pila
    if (overData?.zone === 'library' || overData?.zone === 'graveyard' || overData?.zone === 'exile') {
      onAction('MOVE_CARD', {
        cardInstanceId: active.id,
        fromZone: fromZone || 'battlefield',
        toZone: overData.zone,
        toPlayerId: overData.playerId || localPlayerId,
      });
      return;
    }

    let targetPlayerId = overData?.playerId;

    let clientX = 0;
    let clientY = 0;

    if (event.activatorEvent instanceof MouseEvent || event.activatorEvent instanceof PointerEvent) {
      clientX = event.activatorEvent.clientX + (event.delta?.x ?? 0);
      clientY = event.activatorEvent.clientY + (event.delta?.y ?? 0);
    } else if (active.rect.current?.translated) {
      clientX = active.rect.current.translated.left + active.rect.current.translated.width / 2;
      clientY = active.rect.current.translated.top + active.rect.current.translated.height / 2;
    }

    // Si over no proveyó playerId directo, encontrar qué celda de jugador está bajo el puntero
    if (!targetPlayerId && clientX && clientY) {
      const elementsUnder = typeof document !== 'undefined' ? document.elementsFromPoint(clientX, clientY) : [];
      for (const el of elementsUnder) {
        const cell = el.closest('[data-player-cell]');
        if (cell) {
          targetPlayerId = cell.getAttribute('data-player-cell') || undefined;
          break;
        }
      }
    }

    const finalPlayerId = targetPlayerId || localPlayerId;

    const winW = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const winH = typeof window !== 'undefined' ? window.innerHeight : 1080;
    const cardW = 70;
    const cardH = 98;
    const maxNormX = Math.max(0, (winW - cardW) / winW);
    const maxNormY = Math.max(0, (winH - cardH) / winH);
    const normX = Math.max(0, Math.min(maxNormX, clientX / winW));
    const normY = Math.max(0, Math.min(maxNormY, clientY / winH));

    if (fromZone === 'hand') {
      onAction('MOVE_CARD', {
        cardInstanceId: active.id,
        fromZone: 'hand',
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
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setIsDragging(false);
        setActiveDragItem(null);
      }}
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
