import React, { useEffect } from 'react';
import type { PlayerState, PlayerZones, GameActionType } from '@mtgc/shared';
import { X, Maximize2 } from 'lucide-react';
import { PlayerCell } from './PlayerCell';
import { CardDisplay } from './CardDisplay';
import { BattlefieldCanvas } from './BattlefieldCanvas';

interface ExpandedCellViewProps {
  player: PlayerState;
  zones: PlayerZones;
  isLocal: boolean;
  isActiveTurn: boolean;
  onClose: () => void;
  onAction: (type: GameActionType, payload: unknown) => void;
}

export const ExpandedCellView: React.FC<ExpandedCellViewProps> = ({
  player,
  zones,
  isLocal,
  isActiveTurn,
  onClose,
  onAction,
}) => {
  // Close on Escape key (REQ-22.11)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col p-3 sm:p-6 select-none animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#12544F]">
        <div className="flex items-center space-x-2">
          <Maximize2 className="w-4 h-4 text-[#8BBB92]" />
          <h3 className="font-extrabold text-sm sm:text-base text-white">
            Vista Ampliada: <span className="text-[#8BBB92]">{player.name}</span>
          </h3>
          <span className="text-xs text-zinc-400 font-mono hidden sm:inline">
            (Pulsa Esc para salir)
          </span>
        </div>

        <button
          onClick={onClose}
          className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-[#0c2d32] hover:bg-[#12544F] border border-[#12544F] text-zinc-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
          <span>Cerrar</span>
        </button>
      </div>

      {/* Expanded Cell Container */}
      <div className="flex-1 overflow-hidden mt-3 rounded-2xl border border-[#12544F] relative bg-[#092328] shadow-2xl">
        <PlayerCell
          player={player}
          zones={zones}
          row={1}
          col={0}
          isLocalPlayer={isLocal}
          isActiveTurn={isActiveTurn}
          onAction={onAction}
          onExpandCell={onClose}
        />
        {isLocal ? (
          <BattlefieldCanvas cards={zones.battlefield} onAction={onAction} />
        ) : (
          <div className="absolute inset-0 p-4 overflow-hidden pointer-events-auto z-15">
            <div className="flex flex-wrap gap-3">
              {zones.battlefield.map(card => (
                <div
                  key={card.instanceId}
                  className={`w-24 h-34 rounded-lg overflow-hidden border border-[#12544F] shadow-md bg-[#040d0f] transition-transform origin-center ${
                    card.isTapped ? 'rotate-90' : ''
                  }`}
                >
                  <CardDisplay
                    card={card.definition}
                    isFaceDown={card.isFaceDown}
                    isTapped={card.isTapped}
                  />
                </div>
              ))}
              {zones.battlefield.length === 0 && (
                <div className="w-full text-center py-24 text-zinc-400 text-xs italic">
                  Sin cartas en el campo de batalla
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
