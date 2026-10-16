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
    isTwoPlayer?: boolean,
  ) => React.ReactNode;
  onLeaveRoom?: () => void;
  expandedPlayerId?: string | null;
  onCloseExpanded?: () => void;
}

export const TableGrid: React.FC<TableGridProps> = ({
  roomState,
  localPlayerId,
  onAction,
  renderPlayerCell,
  onLeaveRoom,
  expandedPlayerId,
  onCloseExpanded,
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
  const isTwoPlayerMode = totalPlayers === 2;

  // --cols = 2 en 1v1, o ceil(jugadores / 2) entre 2 y 3 para >= 3 jugadores (REQ-22.2)
  const cols = isTwoPlayerMode ? 2 : Math.min(3, Math.max(2, Math.ceil(totalPlayers / 2)));

  // Orden canónico de asientos idéntico en todos los clientes (Punto 2)
  const seatedPlayers = [...allSeated].sort((a, b) => (a.seatNumber ?? 0) - (b.seatNumber ?? 0));

  interface CellSlot {
    row: 0 | 1;
    col: number;
    player?: PlayerState;
    isFreeCellForChat?: boolean;
  }

  const gridSlots: CellSlot[] = [];

  if (isTwoPlayerMode) {
    // 2 jugadores: 2 columnas verticales (izquierda = asiento 0, derecha = asiento 1)
    gridSlots.push({ row: 0, col: 0, player: seatedPlayers[0] });
    if (seatedPlayers[1]) {
      gridSlots.push({ row: 0, col: 1, player: seatedPlayers[1] });
    }
  } else {
    // 3 o más jugadores: cuadrícula canónica de 2 filas y hasta 3 columnas
    let playerIdx = 0;

    // Fila Superior (Row 0): col 0 .. cols - 1
    for (let c = 0; c < cols; c++) {
      gridSlots.push({
        row: 0,
        col: c,
        player: seatedPlayers[playerIdx++],
      });
    }

    // Fila Inferior (Row 1): col 0 .. cols - 1
    for (let c = 0; c < cols; c++) {
      const p = seatedPlayers[playerIdx++];
      gridSlots.push({
        row: 1,
        col: c,
        player: p,
        isFreeCellForChat: !p && (totalPlayers === 3 || totalPlayers === 5),
      });
    }
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
        onLeaveRoom={onLeaveRoom}
      />

      {/* Grid: 1 fila x 2 columnas en 1v1; 2 filas x hasta 3 cols para >= 3 jugadores (Punto 4, REQ-22.1, 22.2) o Vista Ampliada (Punto 3) */}
      {expandedPlayerId && roomState.players[expandedPlayerId] ? (
        <div className="w-full h-full relative bg-slate-950">
          <div className="absolute top-2 right-4 z-40 flex items-center space-x-2 bg-slate-900/90 border border-slate-700 px-3 py-1.5 rounded-xl shadow-xl backdrop-blur-md">
            <span className="text-xs font-bold text-amber-300">
              Vista Ampliada: {roomState.players[expandedPlayerId].name}
            </span>
            <button
              onClick={onCloseExpanded}
              data-testid="close-expanded-view"
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer flex items-center space-x-1"
            >
              <span>Cerrar (Esc)</span>
            </button>
          </div>
          {renderPlayerCell(
            roomState.players[expandedPlayerId],
            1,
            0,
            expandedPlayerId === localPlayerId,
            false
          )}
        </div>
      ) : (
        <div
          className="w-full h-full grid gap-[1px] bg-black"
          style={{
            gridTemplateRows: isTwoPlayerMode ? '1fr' : '1fr 1fr',
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
                  className="h-full w-full relative bg-slate-950"
                >
                  {renderPlayerCell(slot.player, slot.row, slot.col, isLocal, isTwoPlayerMode)}
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
      )}

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
