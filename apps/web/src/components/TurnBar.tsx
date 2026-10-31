import React, { useState } from 'react';
import type { PlayerState, GameActionType } from '@mtgc/shared';
import { getPlayerColor } from '@mtgc/shared';
import {
  RotateCcw,
  Dices,
  ChevronRight,
  MessageSquare,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

interface TurnBarProps {
  turnNumber: number;
  activePlayerId: string | null;
  players: Record<string, PlayerState>;
  localPlayerId: string;
  onAction: (type: GameActionType, payload: unknown) => void;
  onToggleSidePanel?: () => void;
  isSidePanelOpen?: boolean;
  turnOrder?: string[];
  isHost?: boolean;
}

export const TurnBar: React.FC<TurnBarProps> = ({
  turnNumber,
  activePlayerId,
  players,
  localPlayerId,
  onAction,
  onToggleSidePanel,
  isSidePanelOpen,
  turnOrder,
  isHost,
}) => {
  const activePlayer = activePlayerId ? players[activePlayerId] : null;
  const isMyTurn = activePlayerId === localPlayerId;
  const [showDiceMenu, setShowDiceMenu] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [customOrder, setCustomOrder] = useState<string[]>([]);

  const handlePassTurn = () => {
    onAction('PASS_TURN', {});
  };

  const handleUndo = () => {
    onAction('UNDO_LAST', {});
  };

  const handleRoll = (sides: number) => {
    onAction('ROLL_DICE', { sides });
    setShowDiceMenu(false);
  };

  const openOrderEditor = () => {
    const initialOrder =
      turnOrder && turnOrder.length > 0
        ? [...turnOrder]
        : Object.keys(players).filter(id => !players[id]?.isSpectator);
    setCustomOrder(initialOrder);
    setShowOrderModal(true);
  };

  const movePlayer = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...customOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    const temp = newOrder[index]!;
    newOrder[index] = newOrder[targetIndex]!;
    newOrder[targetIndex] = temp;
    setCustomOrder(newOrder);
  };

  const handleSaveTurnOrder = () => {
    onAction('SET_TURN_ORDER', { turnOrder: customOrder });
    setShowOrderModal(false);
  };

  return (
    <div className="bg-[#092328] border border-[#12544F] rounded-2xl px-4 py-2.5 shadow-xl flex items-center justify-between">
      {/* Turn Indicator & Turn Order Sequence (REQ-21.7, REQ-21.8, H2) */}
      <div className="flex items-center space-x-3">
        <div
          data-testid="turn-bar-active-player"
          className="flex items-center space-x-2 px-3 py-1.5 rounded-xl shadow-md transition-all"
          style={{
            backgroundColor: activePlayer ? `${getPlayerColor(activePlayer)}2e` : '#040d0f',
            borderTop: `2px solid ${activePlayer ? getPlayerColor(activePlayer) : '#12544F'}`,
            borderLeft: `2px solid ${activePlayer ? getPlayerColor(activePlayer) : '#12544F'}`,
            borderRight: `2px solid ${activePlayer ? getPlayerColor(activePlayer) : '#12544F'}`,
            borderBottom: activePlayer ? '3px solid #F59E0B' : '2px solid #12544F',
            boxShadow: activePlayer
              ? `0 0 12px ${getPlayerColor(activePlayer)}33, 0 3px 8px #F59E0B55`
              : 'none',
          }}
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#8BBB92]">
            Turno #{turnNumber}
          </span>
          <span className="text-zinc-500">&bull;</span>
          <span className="text-xs font-extrabold text-white drop-shadow-sm">
            {activePlayer?.name || 'Esperando inicio'}
          </span>
          {activePlayer?.initiativeOrder && (
            <span className="text-[10px] text-zinc-300 font-mono font-bold">
              ({activePlayer.initiativeOrder}.º)
            </span>
          )}
          {isMyTurn && (
            <span className="text-[10px] bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B] px-2 py-0.5 rounded-full font-bold animate-pulse">
              ¡Tu Turno!
            </span>
          )}
        </div>

        {/* Turn Order Sequence Pills con Contenedor de Color de Jugador (H2) */}
        {turnOrder && turnOrder.length > 0 && (
          <div className="hidden md:flex items-center space-x-2 text-[11px]">
            {turnOrder.map((pid, idx) => {
              const p = players[pid];
              const isCurrent = pid === activePlayerId;
              const pColor = getPlayerColor(p, idx);
              return (
                <span
                  key={pid}
                  data-testid={`turn-order-pill-${pid}`}
                  className="px-2.5 py-1 rounded-xl font-bold flex items-center space-x-1.5 text-xs text-white shadow-sm transition-all"
                  style={{
                    backgroundColor: `${pColor}2e`,
                    borderTop: `2px solid ${pColor}`,
                    borderLeft: `2px solid ${pColor}`,
                    borderRight: `2px solid ${pColor}`,
                    borderBottom: isCurrent ? '3px solid #F59E0B' : `2px solid ${pColor}`,
                    boxShadow: isCurrent
                      ? `0 0 10px ${pColor}44, 0 3px 8px #F59E0B66`
                      : `0 0 8px ${pColor}22`,
                  }}
                >
                  <span className="font-mono text-[10px] text-zinc-300 font-bold">
                    {idx + 1}.º
                  </span>
                  <span className="truncate max-w-[85px] text-white font-extrabold drop-shadow-sm">
                    {p?.name || pid}
                  </span>
                  {isCurrent && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-ping" />
                  )}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Controls */}
      <div className="flex items-center space-x-2">
        {/* Dice Roller */}
        <div className="relative">
          <button
            onClick={() => setShowDiceMenu(prev => !prev)}
            className="flex items-center space-x-1.5 bg-[#0c2d32] hover:bg-[#12544F] text-zinc-200 px-3 py-2 rounded-xl text-xs font-medium border border-[#12544F] transition-colors cursor-pointer"
          >
            <Dices className="w-4 h-4 text-[#8BBB92]" />
            <span>Dados</span>
          </button>

          {showDiceMenu && (
            <div className="absolute right-0 bottom-full mb-2 bg-[#092328] border border-[#12544F] rounded-xl shadow-2xl p-2 w-44 space-y-1 z-30">
              <button
                onClick={() => handleRoll(20)}
                className="w-full text-left px-3 py-1.5 rounded-lg text-xs hover:bg-[#12544F] text-zinc-200 hover:text-white font-medium cursor-pointer transition-colors"
              >
                🎲 D20 (Iniciativa)
              </button>
              <button
                onClick={() => handleRoll(6)}
                className="w-full text-left px-3 py-1.5 rounded-lg text-xs hover:bg-[#12544F] text-zinc-200 hover:text-white font-medium cursor-pointer transition-colors"
              >
                🎲 D6 (Estándar)
              </button>
              <button
                onClick={() => handleRoll(2)}
                className="w-full text-left px-3 py-1.5 rounded-lg text-xs hover:bg-[#12544F] text-zinc-200 hover:text-white font-medium cursor-pointer transition-colors"
              >
                🪙 Cara o Cruz (D2)
              </button>
            </div>
          )}
        </div>

        {/* Undo Button */}
        <button
          onClick={handleUndo}
          title="Deshacer tu última acción (vida, robo o movimiento)"
          className="flex items-center space-x-1.5 bg-[#0c2d32] hover:bg-[#12544F] text-zinc-300 hover:text-white px-3 py-2 rounded-xl text-xs border border-[#12544F] transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#8BBB92]" />
          <span className="hidden sm:inline">Deshacer</span>
        </button>

        {/* Pass Turn Button - "Pasar" text visible in all sizes */}
        <button
          data-testid="pass-turn-btn"
          onClick={handlePassTurn}
          className="flex items-center space-x-1.5 bg-[#2A835F] hover:bg-[#349e73] text-white font-bold px-3.5 sm:px-4 py-2 rounded-xl text-xs shadow-lg shadow-[#2A835F]/20 active:scale-95 transition-all border border-[#8BBB92]/40 cursor-pointer"
          title="Pasar el turno al siguiente jugador"
        >
          <span>Pasar</span>
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Turn Order Adjustment for Host before turn 1 (REQ-6.4) */}
        {turnNumber <= 1 && isHost && (
          <button
            onClick={openOrderEditor}
            className="flex items-center space-x-1.5 bg-[#0c2d32] hover:bg-[#12544F] text-zinc-200 px-3 py-2 rounded-xl text-xs font-medium border border-[#12544F] transition-colors cursor-pointer"
            title="Corregir orden de turnos (REQ-6.4)"
          >
            <ArrowUpDown className="w-4 h-4 text-[#8BBB92]" />
            <span className="hidden sm:inline">Orden</span>
          </button>
        )}

        {/* Toggle Log & Chat Drawer */}
        {onToggleSidePanel && (
          <button
            onClick={onToggleSidePanel}
            className={`p-2 rounded-xl border text-xs transition-colors cursor-pointer ${
              isSidePanelOpen
                ? 'bg-[#2A835F] border-[#8BBB92] text-white shadow-md'
                : 'bg-[#0c2d32] border-[#12544F] text-[#8BBB92] hover:text-white hover:bg-[#12544F]'
            }`}
            title="Abrir Chat y Log de Acciones"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Turn Order Modal (REQ-6.4) */}
      {showOrderModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowOrderModal(false)}
          onDoubleClick={e => {
            e.stopPropagation();
            setShowOrderModal(false);
          }}
          onPointerDown={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
          onContextMenu={e => e.stopPropagation()}
        >
          <div
            onClick={e => e.stopPropagation()}
            onDoubleClick={e => e.stopPropagation()}
            onPointerDown={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
            onContextMenu={e => e.stopPropagation()}
            className="bg-[#092328] border border-[#12544F] rounded-2xl p-5 max-w-sm w-full shadow-2xl ring-1 ring-[#2A835F]/30"
          >
            <h3 className="text-sm font-bold text-white flex items-center space-x-2 mb-2">
              <ArrowUpDown className="w-4 h-4 text-[#8BBB92]" />
              <span>Corregir Orden de Turnos (REQ-6.4)</span>
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Reordena la secuencia de turnos antes de que avance la partida.
            </p>
            <div className="space-y-2 mb-4">
              {customOrder.map((pid, idx) => (
                <div
                  key={pid}
                  className="flex items-center justify-between bg-[#040d0f] border border-[#12544F] px-3 py-2 rounded-xl text-xs text-white"
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-[#8BBB92] w-5">{idx + 1}.º</span>
                    <span className="font-medium">{players[pid]?.name || 'Jugador'}</span>
                    {players[pid]?.isHost && (
                      <span className="text-[10px] text-[#8BBB92] font-semibold">(Anfitrión)</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      disabled={idx === 0}
                      onClick={() => movePlayer(idx, 'up')}
                      className="p-1 rounded bg-[#0c2d32] hover:bg-[#12544F] border border-[#12544F] disabled:opacity-30 text-zinc-200 cursor-pointer"
                      title="Subir"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={idx === customOrder.length - 1}
                      onClick={() => movePlayer(idx, 'down')}
                      className="p-1 rounded bg-[#0c2d32] hover:bg-[#12544F] border border-[#12544F] disabled:opacity-30 text-zinc-200 cursor-pointer"
                      title="Bajar"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end space-x-2 text-xs">
              <button
                onClick={() => setShowOrderModal(false)}
                className="px-3 py-1.5 rounded-xl text-zinc-300 hover:text-white hover:bg-[#12544F] border border-[#12544F] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveTurnOrder}
                className="px-4 py-1.5 rounded-xl bg-[#2A835F] hover:bg-[#349e73] text-white font-bold shadow-md cursor-pointer border border-[#8BBB92]/40"
              >
                Guardar Orden
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
