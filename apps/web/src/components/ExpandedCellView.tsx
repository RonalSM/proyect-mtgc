import React, { useEffect } from 'react';
import type { PlayerState, PlayerZones, GameActionType, RoomState, CardInstance } from '@mtgc/shared';
import { X, Maximize2 } from 'lucide-react';
import { PlayerCell } from './PlayerCell';
import { BattlefieldCanvas } from './BattlefieldCanvas';
import { ErrorBoundary } from './ErrorBoundary';
import { getPlayerFraming } from '../utils/table-framing';

interface ExpandedCellViewProps {
  player: PlayerState;
  zones: PlayerZones;
  isLocal: boolean;
  isActiveTurn: boolean;
  localPlayerId?: string;
  roomState?: RoomState;
  allBattlefieldCards?: CardInstance[];
  onClose: () => void;
  onAction: (type: GameActionType, payload: unknown) => void;
}

export const ExpandedCellView: React.FC<ExpandedCellViewProps> = ({
  player,
  zones,
  isLocal,
  isActiveTurn,
  localPlayerId,
  roomState,
  allBattlefieldCards,
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

  const framing = roomState
    ? getPlayerFraming(player.id, roomState)
    : { xMin: 0, yMin: 0, width: 1, height: 1, isExpanded: true };

  const scaleX = framing.width > 0 ? 1 / framing.width : 1;
  const scaleY = framing.height > 0 ? 1 / framing.height : 1;
  const originX = framing.width >= 1 ? 50 : (framing.xMin / (1 - framing.width)) * 100;
  const originY = framing.height >= 1 ? 50 : (framing.yMin / (1 - framing.height)) * 100;

  return (
    <ErrorBoundary fallbackTitle="Error al mostrar la vista ampliada" onReset={onClose}>
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

        {/* Global Tabletop Surface under Camera Framing (Tarea 2) */}
        <div className="flex-1 overflow-hidden mt-3 rounded-2xl border border-[#12544F] relative bg-[#092328] shadow-2xl">
          <div
            className="w-full h-full relative"
            style={{
              transform: `scale(${scaleX}, ${scaleY})`,
              transformOrigin: `${originX}% ${originY}%`,
            }}
          >
            <PlayerCell
              player={player}
              zones={zones}
              row={1}
              col={0}
              isLocalPlayer={isLocal}
              isActiveTurn={isActiveTurn}
              localPlayerId={localPlayerId}
              roomState={roomState}
              allBattlefieldCards={allBattlefieldCards}
              onAction={onAction}
              onExpandCell={onClose}
            />
          </div>

          {/* BattlefieldCanvas con todas las cartas globales bajo el mismo encuadre de cámara (sin ocultar rivales) */}
          <BattlefieldCanvas
            cards={allBattlefieldCards || zones.battlefield}
            viewFraming={framing}
            localPlayerId={localPlayerId}
            roomState={roomState}
            onAction={onAction}
          />
        </div>
      </div>
    </ErrorBoundary>
  );
};
