import React, { useState } from 'react';
import type { PlayerState, GameActionType } from '@mtgc/shared';
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
    <div className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3 shadow-xl flex items-center justify-between">
      {/* Turn Indicator & Turn Order Sequence (REQ-21.7, REQ-21.8) */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
            Turno #{turnNumber}
          </span>
          <span className="text-slate-600">&bull;</span>
          <span className="text-xs font-semibold text-white">
            {activePlayer?.name || 'Esperando inicio'}
          </span>
          {activePlayer?.initiativeOrder && (
            <span className="text-[10px] text-amber-400 font-mono font-bold">
              ({activePlayer.initiativeOrder}.º)
            </span>
          )}
          {isMyTurn && (
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.2 rounded-full font-bold animate-pulse">
              ¡Tu Turno!
            </span>
          )}
        </div>

        {/* Turn Order Sequence Pills */}
        {turnOrder && turnOrder.length > 0 && (
          <div className="hidden md:flex items-center space-x-1.5 text-[11px]">
            {turnOrder.map((pid, idx) => {
              const p = players[pid];
              const isCurrent = pid === activePlayerId;
              return (
                <span
                  key={pid}
                  className={`px-2 py-0.5 rounded-lg font-semibold flex items-center space-x-1 border ${
                    isCurrent
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  <span className="text-amber-400/80 font-mono text-[10px]">{idx + 1}.º</span>
                  <span className="truncate max-w-[80px]">{p?.name || pid}</span>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Controls */}
      <div className="flex items-center space-x-2.5">
        {/* Dice Roller */}
        <div className="relative">
          <button
            onClick={() => setShowDiceMenu(prev => !prev)}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-xl text-xs font-medium border border-slate-700 transition-colors"
          >
            <Dices className="w-4 h-4 text-amber-400" />
            <span>Dados</span>
          </button>

          {showDiceMenu && (
            <div className="absolute right-0 bottom-full mb-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 w-36 space-y-1 z-30">
              <button
                onClick={() => handleRoll(20)}
                className="w-full text-left px-3 py-1.5 rounded text-xs hover:bg-slate-800 text-slate-200 font-medium"
              >
                🎲 D20 (Iniciativa)
              </button>
              <button
                onClick={() => handleRoll(6)}
                className="w-full text-left px-3 py-1.5 rounded text-xs hover:bg-slate-800 text-slate-200 font-medium"
              >
                🎲 D6 (Estándar)
              </button>
              <button
                onClick={() => handleRoll(2)}
                className="w-full text-left px-3 py-1.5 rounded text-xs hover:bg-slate-800 text-slate-200 font-medium"
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
          className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-2 rounded-xl text-xs border border-slate-700 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Deshacer</span>
        </button>

        {/* Pass Turn Button */}
        <button
          onClick={handlePassTurn}
          className="flex items-center space-x-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
        >
          <span>Pasar Turno</span>
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Turn Order Adjustment for Host before turn 1 (REQ-6.4) */}
        {turnNumber <= 1 && isHost && (
          <button
            onClick={openOrderEditor}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-xl text-xs font-medium border border-slate-700 transition-colors"
            title="Corregir orden de turnos (REQ-6.4)"
          >
            <ArrowUpDown className="w-4 h-4 text-amber-400" />
            <span>Orden</span>
          </button>
        )}

        {/* Toggle Log & Chat Drawer */}
        {onToggleSidePanel && (
          <button
            onClick={onToggleSidePanel}
            className={`p-2 rounded-xl border text-xs transition-colors ${
              isSidePanelOpen
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
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
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
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
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl"
          >
            <h3 className="text-sm font-bold text-white flex items-center space-x-2 mb-2">
              <ArrowUpDown className="w-4 h-4 text-amber-400" />
              <span>Corregir Orden de Turnos (REQ-6.4)</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Reordena la secuencia de turnos antes de que avance la partida.
            </p>
            <div className="space-y-2 mb-4">
              {customOrder.map((pid, idx) => (
                <div
                  key={pid}
                  className="flex items-center justify-between bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-xs text-white"
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-amber-400 w-5">{idx + 1}.º</span>
                    <span className="font-medium">{players[pid]?.name || 'Jugador'}</span>
                    {players[pid]?.isHost && (
                      <span className="text-[10px] text-amber-500 font-semibold">(Anfitrión)</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      disabled={idx === 0}
                      onClick={() => movePlayer(idx, 'up')}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-200"
                      title="Subir"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={idx === customOrder.length - 1}
                      onClick={() => movePlayer(idx, 'down')}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-200"
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
                className="px-3 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveTurnOrder}
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow"
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
