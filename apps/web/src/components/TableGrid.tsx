import React, { useState } from 'react';
import type { RoomState, GameActionType, PlayerState } from '@mtgc/shared';
import { FloatingToolbar } from './FloatingToolbar';
import { GameLogAndChat } from './GameLogAndChat';

interface TableGridProps {
  roomState: RoomState;
  localPlayerId: string;
  onAction: (type: GameActionType, payload: unknown) => void;
  renderPlayerCell: (
    player: PlayerState,
    row: 0 | 1,
    col: number,
    isLocal: boolean,
  ) => React.ReactNode;
}

export const TableGrid: React.FC<TableGridProps> = ({
  roomState,
  localPlayerId,
  onAction,
  renderPlayerCell,
}) => {
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [reduceBackgrounds, setReduceBackgrounds] = useState<boolean>(() => {
    return localStorage.getItem('mtgc_reduce_backgrounds') === 'true';
  });

  const handleToggleReduceBackgrounds = (val: boolean) => {
    setReduceBackgrounds(val);
    localStorage.setItem('mtgc_reduce_backgrounds', val ? 'true' : 'false');
  };

  // Seated players (non-spectators)
  const allSeated = Object.values(roomState.players).filter(p => !p.isSpectator);
  const totalPlayers = Math.max(2, allSeated.length);

  // --cols = ceil(jugadores / 2), clamp between 1 and 3 (REQ-22.2)
  const cols = Math.min(3, Math.max(1, Math.ceil(totalPlayers / 2)));

  // Separate local player and opponents
  const localPlayer = roomState.players[localPlayerId] || allSeated[0]!;
  const opponents = allSeated.filter(p => p.id !== localPlayer.id);

  /**
   * Layout Grid Assignment:
   * Grid has 2 rows and `cols` columns.
   * Total slots = 2 * cols (2, 4, or 6).
   * Local player is ALWAYS at bottom-left: row 1, col 0 (REQ-22.2.1).
   * Slots ordering:
   * Row 0: (0, 0), (0, 1), (0, 2)
   * Row 1: (1, 0) [LOCAL], (1, 1), (1, 2)
   */
  interface CellSlot {
    row: 0 | 1;
    col: number;
    player?: PlayerState;
    isFreeCellForChat?: boolean;
  }

  const gridSlots: CellSlot[] = [];

  // Top Row (Row 0): col 0 to cols - 1
  for (let c = 0; c < cols; c++) {
    gridSlots.push({ row: 0, col: c });
  }
  // Bottom Row (Row 1): col 0 (LOCAL), then col 1 to cols - 1
  for (let c = 0; c < cols; c++) {
    gridSlots.push({ row: 1, col: c });
  }

  // Assign local player to (row: 1, col: 0)
  const localSlot = gridSlots.find(s => s.row === 1 && s.col === 0);
  if (localSlot) {
    localSlot.player = localPlayer;
  }

  // Assign opponents to remaining slots in seat order
  const remainingSlots = gridSlots.filter(s => !(s.row === 1 && s.col === 0));
  opponents.forEach((opp, i) => {
    if (remainingSlots[i]) {
      remainingSlots[i]!.player = opp;
    }
  });

  // If 3 or 5 players, the extra unused slot becomes free cell for log/chat (REQ-22.10)
  const unusedSlot = remainingSlots.find(s => !s.player);
  if (unusedSlot && (totalPlayers === 3 || totalPlayers === 5)) {
    unusedSlot.isFreeCellForChat = true;
  }

  return (
    <div
      className={`fixed inset-0 w-screen h-[100dvh] bg-black text-slate-100 overflow-hidden select-none ${
        reduceBackgrounds ? 'reduce-backgrounds-mode' : ''
      }`}
      style={
        {
          '--cols': cols,
        } as React.CSSProperties
      }
    >
      {/* Floating Toolbar (REQ-22.9) */}
      <FloatingToolbar
        roomState={roomState}
        localPlayerId={localPlayerId}
        onAction={onAction}
        onToggleChat={() => setIsChatDrawerOpen(!isChatDrawerOpen)}
        reduceBackgrounds={reduceBackgrounds}
        onToggleReduceBackgrounds={handleToggleReduceBackgrounds}
      />

      {/* Full-bleed 2-row Grid (REQ-22.1, 22.2) */}
      <div
        className="w-full h-full grid gap-[1px] bg-black"
        style={{
          gridTemplateRows: '1fr 1fr',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
        }}
      >
        {gridSlots.map((slot, index) => {
          const isLocal = slot.player?.id === localPlayerId;

          if (slot.isFreeCellForChat) {
            // Free Cell for Log & Chat (REQ-22.10)
            return (
              <div
                key={`chat-slot-${index}`}
                className="bg-slate-950/90 border border-slate-900 h-full flex flex-col overflow-hidden relative"
              >
                <div className="bg-slate-900/90 px-3 py-1.5 border-b border-slate-800 text-[11px] font-bold text-slate-400 flex items-center justify-between">
                  <span>Registro de Partida y Chat</span>
                  <span className="text-[10px] text-amber-500 font-mono">EN VIVO</span>
                </div>
                <div className="flex-1 overflow-hidden p-2">
                  <GameLogAndChat
                    logs={roomState.logs}
                    onAction={onAction}
                  />
                </div>
              </div>
            );
          }

          if (slot.player) {
            return (
              <div
                key={slot.player.id}
                className="h-full w-full relative overflow-hidden bg-slate-950"
              >
                {renderPlayerCell(slot.player, slot.row, slot.col, isLocal)}
              </div>
            );
          }

          // Empty Placeholder Slot
          return (
            <div
              key={`empty-${index}`}
              className="bg-slate-950/40 border border-slate-900/80 flex items-center justify-center text-slate-700 text-xs font-mono"
            >
              Asiento Vacío
            </div>
          );
        })}
      </div>

      {/* Floating Chat & Logs Drawer (when clicked from FloatingToolbar or for 2, 4, 6 players) */}
      {isChatDrawerOpen && (
        <div className="fixed top-14 right-4 z-50 w-80 max-w-[90vw] h-[75dvh] bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
            <span className="font-bold text-xs text-white">Registro y Chat</span>
            <button
              onClick={() => setIsChatDrawerOpen(false)}
              className="text-slate-400 hover:text-white font-bold text-sm"
            >
              &times;
            </button>
          </div>
          <div className="flex-1 overflow-hidden p-2">
            <GameLogAndChat
              logs={roomState.logs}
              onAction={onAction}
              onClose={() => setIsChatDrawerOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Scryfall Attribution & Legal Notice in footer (REQ-18, REQ-22.3.3) */}
      <div className="fixed bottom-0.5 right-2 z-30 pointer-events-none text-[9px] text-slate-600/70 select-none">
        Imágenes y arte de cartas proporcionadas por Scryfall &bull; Fan Content no oficial WotC
      </div>
    </div>
  );
};
