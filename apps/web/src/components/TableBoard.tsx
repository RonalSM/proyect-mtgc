import React, { useState } from 'react';
import type { RoomState, GameActionType, PlayerState } from '@mtgc/shared';
import { TableGrid } from './TableGrid';
import { PlayerCell } from './PlayerCell';
import { BattlefieldCanvas } from './BattlefieldCanvas';
import { ExpandedCellView } from './ExpandedCellView';
import { CardPreviewProvider } from '../context/CardPreviewContext';

interface TableBoardProps {
  roomState: RoomState;
  localPlayerId: string;
  connectionStatus: string;
  onAction: (type: GameActionType, payload: unknown) => void;
  onLeaveRoom: () => void;
}

export const TableBoard: React.FC<TableBoardProps> = ({
  roomState,
  localPlayerId,
  onAction,
  onLeaveRoom,
}) => {
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);

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
          onAction={onAction}
        />
      </PlayerCell>
    );
  };

  return (
    <CardPreviewProvider>
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
      </div>
    </CardPreviewProvider>
  );
};
