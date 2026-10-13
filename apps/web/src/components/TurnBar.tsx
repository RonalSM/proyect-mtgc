import React, { useState } from 'react';
import type { PlayerState, GameActionType } from '@mtgc/shared';
import { RotateCcw, Dices, ChevronRight, MessageSquare } from 'lucide-react';

interface TurnBarProps {
  turnNumber: number;
  activePlayerId: string | null;
  players: Record<string, PlayerState>;
  localPlayerId: string;
  onAction: (type: GameActionType, payload: unknown) => void;
  onToggleSidePanel?: () => void;
  isSidePanelOpen?: boolean;
}

export const TurnBar: React.FC<TurnBarProps> = ({
  turnNumber,
  activePlayerId,
  players,
  localPlayerId,
  onAction,
  onToggleSidePanel,
  isSidePanelOpen,
}) => {
  const activePlayer = activePlayerId ? players[activePlayerId] : null;
  const isMyTurn = activePlayerId === localPlayerId;
  const [showDiceMenu, setShowDiceMenu] = useState(false);

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

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3 shadow-xl flex items-center justify-between">
      {/* Turn Indicator */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
            Turno #{turnNumber}
          </span>
          <span className="text-slate-600">&bull;</span>
          <span className="text-xs font-semibold text-white">
            {activePlayer?.name || 'Esperando inicio'}
          </span>
          {isMyTurn && (
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.2 rounded-full font-bold animate-pulse">
              ¡Tu Turno!
            </span>
          )}
        </div>
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
    </div>
  );
};
