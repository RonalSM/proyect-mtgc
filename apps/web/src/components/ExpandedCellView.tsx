import React, { useEffect } from 'react';
import type { PlayerState, PlayerZones, GameActionType } from '@mtgc/shared';
import { X, Maximize2 } from 'lucide-react';
import { PlayerCell } from './PlayerCell';
import { Battlefield } from './Battlefield';

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
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col p-3 sm:p-6 select-none animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Maximize2 className="w-4 h-4 text-amber-400" />
          <h3 className="font-extrabold text-sm sm:text-base text-white">
            Vista Ampliada: <span className="text-amber-300">{player.name}</span>
          </h3>
          <span className="text-xs text-slate-500 font-mono hidden sm:inline">
            (Pulsa Esc para salir)
          </span>
        </div>

        <button
          onClick={onClose}
          className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
          <span>Cerrar</span>
        </button>
      </div>

      {/* Expanded Cell Container */}
      <div className="flex-1 overflow-hidden mt-3 rounded-2xl border border-slate-800 relative bg-slate-950 shadow-2xl">
        <PlayerCell
          player={player}
          zones={zones}
          row={1}
          col={0}
          isLocalPlayer={isLocal}
          isActiveTurn={isActiveTurn}
          onAction={onAction}
          onExpandCell={onClose}
        >
          {isLocal ? (
            <Battlefield
              localPlayerId={player.id}
              zones={zones}
              onAction={onAction}
            />
          ) : (
            <div className="relative w-full h-full p-4 overflow-hidden">
              <div className="flex flex-wrap gap-3">
                {zones.battlefield.map(card => (
                  <div
                    key={card.instanceId}
                    className="w-24 h-34 rounded-lg overflow-hidden border border-slate-700 shadow-md bg-slate-900"
                  >
                    <img
                      src={card.definition.imageUrlNormal || card.definition.imageUrlSmall}
                      alt={card.definition.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
                {zones.battlefield.length === 0 && (
                  <div className="w-full text-center py-24 text-slate-500 text-xs italic">
                    Sin cartas en el campo de batalla
                  </div>
                )}
              </div>
            </div>
          )}
        </PlayerCell>
      </div>
    </div>
  );
};
