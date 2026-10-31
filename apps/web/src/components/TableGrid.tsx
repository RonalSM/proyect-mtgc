import React, { useState } from 'react';
import { type RoomState, type GameActionType, type PlayerState, getGridSlotForSeat } from '@mtgc/shared';
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
    // Cuadrícula canónica de 2 filas y hasta 3 columnas dispuesta en sentido horario (H1)
    const matrix: (CellSlot | undefined)[][] = [
      new Array(cols).fill(undefined),
      new Array(cols).fill(undefined),
    ];

    // Posicionar jugadores según su asiento horario (H1)
    for (let i = 0; i < seatedPlayers.length; i++) {
      const p = seatedPlayers[i];
      const slot = getGridSlotForSeat(p.seatNumber ?? i, totalPlayers);
      matrix[slot.row][slot.col] = {
        row: slot.row,
        col: slot.col,
        player: p,
      };
    }

    // Completar celdas libres o vacías (Chat para 3 o 5 jugadores en row 1, col 0)
    for (let r: 0 | 1 = 0; r <= 1; r = (r + 1) as 0 | 1) {
      for (let c = 0; c < cols; c++) {
        if (!matrix[r][c]) {
          const isFreeCellForChat = r === 1 && c === 0 && (totalPlayers === 3 || totalPlayers === 5);
          matrix[r][c] = {
            row: r,
            col: c,
            player: undefined,
            isFreeCellForChat,
          };
        }
        gridSlots.push(matrix[r][c]!);
      }
    }
  }

  return (
    <div
      className={`fixed inset-0 w-full h-full bg-black text-slate-100 overflow-hidden select-none ${
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

      {/* Botón de Pantalla Completa del Navegador y Controles de Vista Ampliada (REQ-22, Punto 6) */}
      {/* Vista Ampliada Banner & Cerrar (Punto 1 / REQ-22) */}
      {expandedPlayerId && roomState.players[expandedPlayerId] && (
        <div className="fixed top-2 right-4 z-40 flex items-center space-x-2.5 bg-[#092328]/95 border border-[#12544F] px-3.5 py-1.5 rounded-xl shadow-2xl backdrop-blur-md">
          <span className="text-xs font-sans font-bold text-[#8BBB92] tracking-wide">
            Vista Ampliada: {roomState.players[expandedPlayerId].name}
          </span>
          <button
            onClick={onCloseExpanded}
            data-testid="close-expanded-view"
            className="px-2 py-0.5 rounded-lg bg-[#0c2d32] hover:bg-[#12544F] border border-white/5 text-zinc-300 hover:text-white text-xs font-medium cursor-pointer flex items-center space-x-1 transition-colors"
          >
            <span>Cerrar (Esc)</span>
          </button>
        </div>
      )}

      {/* Grid: 1 fila x 2 columnas en 1v1; 2 filas x hasta 3 cols para >= 3 jugadores (Punto 4, REQ-22.1, 22.2) o Vista Ampliada (Punto 3) */}
      {expandedPlayerId && roomState.players[expandedPlayerId] ? (
        <div className="w-full h-full relative bg-[#040d0f]">
          {renderPlayerCell(
            roomState.players[expandedPlayerId],
            1,
            0,
            expandedPlayerId === localPlayerId,
            false,
          )}
        </div>
      ) : (
        <div
          className="w-full h-full grid gap-[1px] bg-[#040d0f]/80"
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
                  className="bg-[#092328]/90 border border-[#12544F] h-full flex flex-col overflow-hidden relative"
                >
                  <div className="bg-[#040d0f]/80 px-3.5 py-2 border-b border-[#12544F] text-[11px] font-sans font-bold text-[#8BBB92] flex items-center justify-between">
                    <span className="tracking-wide">Registro de Partida y Chat</span>
                    <span className="text-[10px] text-[#8BBB92] font-mono font-bold bg-[#2A835F]/20 border border-[#2A835F]/40 px-1.5 py-0.5 rounded">
                      EN VIVO
                    </span>
                  </div>
                  <div className="flex-1 overflow-hidden p-2">
                    <GameLogAndChat logs={roomState.logs} onAction={onAction} />
                  </div>
                </div>
              );
            }

            if (slot.player) {
              return (
                <div key={slot.player.id} className="h-full w-full relative bg-[#040d0f]">
                  {renderPlayerCell(slot.player, slot.row, slot.col, isLocal, isTwoPlayerMode)}
                </div>
              );
            }

            // Empty Placeholder Slot
            return (
              <div
                key={`empty-${index}`}
                className="bg-[#040d0f]/50 border border-[#12544F]/60 flex items-center justify-center text-zinc-600 text-xs font-mono"
              >
                Asiento Vacío
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Chat & Logs Drawer (when clicked from FloatingToolbar or for 2, 4, 6 players) */}
      {isChatDrawerOpen && (
        <div className="fixed top-14 right-4 z-50 w-80 max-w-[90vw] h-[75dvh] bg-[#092328]/95 backdrop-blur-xl border border-[#12544F] rounded-2xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/5 animate-in fade-in zoom-in-95">
          <div className="bg-[#040d0f]/90 px-4 py-2.5 border-b border-[#12544F] flex items-center justify-between">
            <span className="font-sans font-bold text-xs text-[#8BBB92] tracking-wide">
              Registro y Chat
            </span>
            <button
              onClick={() => setIsChatDrawerOpen(false)}
              className="text-zinc-400 hover:text-white font-bold text-sm cursor-pointer"
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
      <div className="fixed bottom-0.5 right-2 z-30 pointer-events-none text-[9px] text-zinc-600/80 font-mono select-none">
        Imágenes y arte de cartas de Scryfall &bull; Fan Content no oficial WotC
      </div>
    </div>
  );
};
