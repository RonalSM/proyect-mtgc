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

    const targetPlayerId = (over.data.current as { playerId?: string })?.playerId;
    // Cada jugador solo juega sus cartas en su propia sección
    if (targetPlayerId !== localPlayerId) return;

    const targetElement = document.getElementById(`battlefield-zone-${localPlayerId}`);
    if (!targetElement) return;

    const rect = targetElement.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if (event.activatorEvent instanceof MouseEvent || event.activatorEvent instanceof PointerEvent) {
      clientX = event.activatorEvent.clientX + (event.delta?.x ?? 0);
      clientY = event.activatorEvent.clientY + (event.delta?.y ?? 0);
    } else if (active.rect.current?.translated) {
      clientX = active.rect.current.translated.left + active.rect.current.translated.width / 2;
      clientY = active.rect.current.translated.top + active.rect.current.translated.height / 2;
    }

    const normX = Math.max(0.05, Math.min(0.85, (clientX - rect.left) / rect.width));
    const normY = Math.max(0.05, Math.min(0.80, (clientY - rect.top) / rect.height));

    const fromZone = (active.data.current as { fromZone?: string })?.fromZone;
    if (fromZone === 'hand') {
      onAction('MOVE_CARD', {
        cardInstanceId: active.id,
        fromZone: 'hand',
        toZone: 'battlefield',
        position: { x: normX, y: normY, zIndex: 10 },
      });
    } else if (fromZone === 'battlefield') {
      // Reposicionamiento de cartas ya en mesa
      onAction('MOVE_CARD', {
        cardInstanceId: active.id,
        fromZone: 'battlefield',
        toZone: 'battlefield',
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

  const renderPlayerCell = (
    player: PlayerState,
    row: 0 | 1,
    col: number,
    isLocal: boolean,
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
        isActiveTurn={isActiveTurn}
        onAction={onAction}
        onExpandCell={() => setExpandedPlayerId(player.id)}
      >
        <BattlefieldCanvas
          cards={zones.battlefield}
          isLocalPlayer={isLocal}
          playerId={player.id}
          onAction={onAction}
        />
      </PlayerCell>
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
      <div className="relative w-screen h-[100dvh] overflow-hidden bg-black">
        {/* Full-bleed 2-row Table Grid (REQ-22.1, 22.2) */}
        <TableGrid
          roomState={roomState}
          localPlayerId={localPlayerId}
          onAction={onAction}
          onLeaveRoom={onLeaveRoom}
          renderPlayerCell={renderPlayerCell}
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

        {/* Drag Overlay visual para arrastre suave de cartas */}
        <DragOverlay dropAnimation={null}>
          {activeDragItem ? (
            <div className="w-16 sm:w-20 aspect-[2.5/3.5] rounded-lg overflow-hidden border-2 border-amber-400 shadow-2xl ring-2 ring-amber-400/50 rotate-3 scale-105 pointer-events-none opacity-90">
              <CardDisplay
                card={activeDragItem.card.definition}
                isFaceDown={activeDragItem.card.isFaceDown}
                allowFaceToggle={false}
              />
            </div>
          ) : null}
        </DragOverlay>
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
