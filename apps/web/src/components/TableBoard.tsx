import React, { useState } from 'react';
import type { RoomState, GameActionType, PlayerState, CardInstance } from '@mtgc/shared';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
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

  // Pointer sensor con activationConstraint de 8px para distinguir clic de arrastre (REQ-9.2, REQ-22)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor),
  );

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
    if (!over) return;

    let targetPlayerId = (over.data.current as { playerId?: string })?.playerId;

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
      const elementsUnder = document.elementsFromPoint(clientX, clientY);
      for (const el of elementsUnder) {
        const cell = el.closest('[data-player-cell]');
        if (cell) {
          targetPlayerId = cell.getAttribute('data-player-cell') || undefined;
          break;
        }
      }
    }

    if (!targetPlayerId) return;

    const fromZone = (active.data.current as { fromZone?: string })?.fromZone;

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
        toPlayerId: targetPlayerId || localPlayerId,
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
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setIsDragging(false);
        setActiveDragItem(null);
      }}
    >
      <div id="mesa-total" className="relative w-screen h-[100dvh] overflow-hidden bg-black select-none">
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

        {/* Drag Overlay visual en portal para evitar recortes entre divisiones (REQ-9.7) */}
        <Portal>
          <DragOverlay dropAnimation={null}>
            {activeDragItem ? (
              <div
                style={{
                  width: 'var(--card-w, 5rem)',
                  height: 'var(--card-h, 7rem)',
                }}
                className="rounded-lg overflow-hidden border-2 border-amber-400 shadow-2xl ring-4 ring-amber-400/60 rotate-2 scale-105 pointer-events-none opacity-95 z-[9999]"
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
