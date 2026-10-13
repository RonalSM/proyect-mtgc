import React, { useState } from 'react';
import type { PlayerState, GameActionType, CardInstance } from '@mtgc/shared';
import {
  Heart,
  Skull,
  Shield,
  Maximize2,
  Image as ImageIcon,
  AlertTriangle,
} from 'lucide-react';

export function getLifeCornerClasses(row: 0 | 1, col: number): string {
  // Inner corner: nearest to center of screen (REQ-22.5)
  // Row 0 (top) -> bottom border of cell. Row 1 (bottom) -> top border of cell.
  // Col 0 (left) -> right edge. Col >= 1 -> left edge.
  const v = row === 0 ? 'bottom-3' : 'top-3';
  const h = col === 0 ? 'right-3' : 'left-3';
  return `${v} ${h}`;
}

interface PlayerCellProps {
  player: PlayerState;
  zones: {
    library: CardInstance[];
    hand: CardInstance[];
    battlefield: CardInstance[];
    graveyard: CardInstance[];
    exile: CardInstance[];
    command: CardInstance[];
  };
  row: 0 | 1;
  col: number;
  isLocalPlayer: boolean;
  isActiveTurn: boolean;
  reduceBackgrounds?: boolean;
  onAction: (type: GameActionType, payload: unknown) => void;
  onExpandCell?: () => void;
  children?: React.ReactNode; // Battlefield canvas
}

export const PlayerCell: React.FC<PlayerCellProps> = ({
  player,
  zones,
  row,
  col,
  isLocalPlayer,
  isActiveTurn,
  reduceBackgrounds = false,
  onAction,
  onExpandCell,
  children,
}) => {
  const [showLifeControls, setShowLifeControls] = useState(false);
  const [showCustomLifeInput, setShowCustomLifeInput] = useState(false);
  const [customLifeValue, setCustomLifeValue] = useState(player.life.toString());
  const [activePileModal, setActivePileModal] = useState<'graveyard' | 'exile' | 'command' | null>(null);
  const [isPlaymatModalOpen, setIsPlaymatModalOpen] = useState(false);
  const [customPlaymatInput, setCustomPlaymatInput] = useState('');

  const cornerClasses = getLifeCornerClasses(row, col);

  // Fallback playmat
  const playmatImage =
    player.playmatUrl ||
    player.selectedDeck?.commanderImageUrl ||
    'https://cards.scryfall.io/art_crop/front/8/b/8ba9f61b-9964-4214-b31f-0e0a446a00ab.jpg';

  const adjustLife = (delta: number) => {
    onAction('ADJUST_LIFE', { playerId: player.id, delta });
  };

  const handleSetLifeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(customLifeValue, 10);
    if (!isNaN(val)) {
      onAction('SET_LIFE', { playerId: player.id, life: val });
      setShowCustomLifeInput(false);
    }
  };

  const adjustCounter = (type: string, delta: number) => {
    onAction('SET_PLAYER_COUNTER', { playerId: player.id, counterType: type, delta });
  };

  const handleSavePlaymat = (e: React.FormEvent) => {
    e.preventDefault();
    if (customPlaymatInput.trim()) {
      onAction('SET_PLAYMAT', { playmatUrl: customPlaymatInput.trim() });
      setIsPlaymatModalOpen(false);
    }
  };

  return (
    <div
      className={`relative w-full h-full overflow-hidden flex flex-col justify-between transition-all select-none ${
        isActiveTurn ? 'ring-2 ring-amber-400/80 shadow-[inset_0_0_40px_rgba(251,191,36,0.12)]' : ''
      }`}
      style={{ contain: 'layout paint' }}
    >
      {/* 1. PlaymatBackground (REQ-22.3) */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {!reduceBackgrounds ? (
          <>
            <img
              src={playmatImage}
              alt=""
              decoding="async"
              className="w-full h-full object-cover opacity-25 filter blur-[0.5px]"
            />
            {/* Dark gradient overlays ensuring >= 4.5:1 text contrast (REQ-22.15) */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-slate-950/40 to-black/90" />
          </>
        ) : (
          <div className="w-full h-full bg-slate-950" />
        )}
      </div>

      {/* 2. Top Bar: NameTag & Expand Button (REQ-22.4) */}
      <div className="relative z-20 flex items-center justify-between px-3 pt-2">
        <div className="flex items-center space-x-2">
          {/* Active Turn Halo / Initiative Tag */}
          <div
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-xl backdrop-blur-md border text-xs font-bold transition-all ${
              isActiveTurn
                ? 'bg-amber-500/20 text-amber-300 border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-slate-900/80 text-slate-200 border-slate-800'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                player.isConnected ? 'bg-emerald-400' : 'bg-slate-600'
              }`}
            />
            {player.initiativeOrder && (
              <span className="font-mono text-[10px] text-amber-400">
                {player.initiativeOrder}.º
              </span>
            )}
            <span className="truncate max-w-[120px]">{player.name}</span>
            {isLocalPlayer && (
              <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded">Tú</span>
            )}
            {player.isHost && <span className="text-[10px] text-amber-400">👑</span>}
          </div>

          {/* At Risk Pill (REQ-3.3, 4.2) */}
          {player.isAtRisk && !player.isEliminated && (
            <span className="bg-rose-950/80 border border-rose-500/80 text-rose-300 px-2 py-0.5 rounded-lg text-[10px] font-bold animate-pulse flex items-center space-x-1">
              <AlertTriangle className="w-3 h-3" />
              <span>En riesgo ({player.riskReason})</span>
            </span>
          )}

          {player.isEliminated && (
            <span className="bg-rose-950 text-rose-400 border border-rose-800 px-2 py-0.5 rounded-lg text-[10px] font-bold">
              Eliminado
            </span>
          )}
        </div>

        {/* Right Header Buttons */}
        <div className="flex items-center space-x-1.5">
          {isLocalPlayer && (
            <button
              onClick={() => setIsPlaymatModalOpen(true)}
              className="p-1 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              title="Cambiar imagen de Playmat"
            >
              <ImageIcon className="w-3 h-3" />
            </button>
          )}

          {onExpandCell && (
            <button
              onClick={onExpandCell}
              className="p-1 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              title="Ampliar esta celda a pantalla completa"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Middle Area: Battlefield Canvas (Layer 2) */}
      <div className="relative z-10 flex-1 w-full h-full overflow-hidden">
        {children}
      </div>

      {/* 4. Interior-Corner Life Pill (REQ-22.5) */}
      <div className={`absolute z-30 ${cornerClasses}`}>
        <div className="relative group">
          <button
            onClick={() => setShowLifeControls(!showLifeControls)}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-2xl backdrop-blur-md border shadow-2xl transition-all cursor-pointer ${
              player.life <= 0
                ? 'bg-rose-950/90 border-rose-600 text-rose-300 ring-2 ring-rose-500/30'
                : player.life <= 10
                ? 'bg-amber-950/90 border-amber-600 text-amber-200'
                : 'bg-slate-950/90 border-slate-700/80 text-white hover:border-amber-500/50'
            }`}
          >
            <Heart
              className={`w-4 h-4 ${
                player.life <= 10 ? 'text-rose-500 fill-rose-500 animate-pulse' : 'text-rose-400'
              }`}
            />
            <span className="text-2xl font-black font-mono tracking-tight leading-none">
              {player.life}
            </span>
          </button>

          {/* Quick Life Modifiers Popover */}
          {showLifeControls && (
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-slate-700 rounded-2xl shadow-2xl p-2.5 flex flex-col space-y-2 z-50 w-48">
              <div className="grid grid-cols-4 gap-1 text-xs font-bold font-mono">
                <button
                  onClick={() => adjustLife(-5)}
                  className="bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-200 py-1 rounded-lg"
                >
                  -5
                </button>
                <button
                  onClick={() => adjustLife(-1)}
                  className="bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-200 py-1 rounded-lg"
                >
                  -1
                </button>
                <button
                  onClick={() => adjustLife(1)}
                  className="bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800 text-emerald-200 py-1 rounded-lg"
                >
                  +1
                </button>
                <button
                  onClick={() => adjustLife(5)}
                  className="bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800 text-emerald-200 py-1 rounded-lg"
                >
                  +5
                </button>
              </div>

              {/* Direct SET_LIFE input */}
              {showCustomLifeInput ? (
                <form onSubmit={handleSetLifeSubmit} className="flex space-x-1">
                  <input
                    type="number"
                    value={customLifeValue}
                    onChange={e => setCustomLifeValue(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-white font-mono"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="bg-amber-500 text-slate-950 font-bold text-xs px-2 rounded-lg"
                  >
                    OK
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setShowCustomLifeInput(true)}
                  className="w-full text-center text-[10px] text-slate-400 hover:text-white py-0.5"
                >
                  Escribir vida exacta
                </button>
              )}

              {/* Counter Badges Menu */}
              <div className="pt-1.5 border-t border-slate-800 grid grid-cols-2 gap-1 text-[10px]">
                <div className="flex items-center justify-between bg-slate-950 px-2 py-1 rounded-lg">
                  <span className="text-emerald-400 flex items-center space-x-1">
                    <Skull className="w-2.5 h-2.5" />
                    <span>{player.counters.poison}</span>
                  </span>
                  <div className="flex space-x-1">
                    <button onClick={() => adjustCounter('poison', -1)} className="hover:text-white">-</button>
                    <button onClick={() => adjustCounter('poison', 1)} className="hover:text-white">+</button>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-slate-950 px-2 py-1 rounded-lg">
                  <span className="text-amber-400 flex items-center space-x-1">
                    <Shield className="w-2.5 h-2.5" />
                    <span>{player.counters.commanderTax}</span>
                  </span>
                  <div className="flex space-x-1">
                    <button onClick={() => adjustCounter('commanderTax', -2)} className="hover:text-white">-2</button>
                    <button onClick={() => adjustCounter('commanderTax', 2)} className="hover:text-white">+2</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. Bottom Docks: HandFan (Left) & PileSlots (Right) (REQ-22.7, REQ-22.8) */}
      <div className="relative z-20 flex items-end justify-between px-3 pb-2 pointer-events-auto">
        {/* Hand Fan (Bottom-Left) */}
        <div className="flex items-center space-x-1">
          {isLocalPlayer ? (
            <div className="flex items-center space-x-1 bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-1 text-xs backdrop-blur-md">
              <span className="font-bold text-amber-400">{zones.hand.length}</span>
              <span className="text-[11px] text-slate-400">cartas en mano</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-1 text-xs backdrop-blur-md">
              {/* Opponent hand rendered as card back without content (REQ-16.3, REQ-22.7.2) */}
              <div className="w-4 h-6 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-[8px] text-slate-500 font-bold">
                🂠
              </div>
              <span className="text-[11px] text-slate-400">
                <strong className="text-slate-200">{player.handCount}</strong> en mano
              </span>
            </div>
          )}
        </div>

        {/* Pile Slots (Bottom-Right) (REQ-22.8) */}
        <div className="flex items-center space-x-1.5">
          {/* Library Slot */}
          <div
            className="w-8 h-11 rounded-lg bg-slate-950/90 border border-slate-700/80 flex flex-col items-center justify-center cursor-pointer shadow-md"
            title={`Biblioteca: ${zones.library.length || player.libraryCount} cartas`}
            onClick={() => isLocalPlayer && onAction('DRAW_CARDS', { count: 1 })}
          >
            <span className="text-[10px] font-mono font-black text-amber-300">
              {zones.library.length || player.libraryCount}
            </span>
            <span className="text-[7px] text-slate-500 uppercase font-bold">Bib</span>
          </div>

          {/* Graveyard Slot */}
          <div
            onClick={() => setActivePileModal('graveyard')}
            className={`w-8 h-11 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors shadow-md ${
              zones.graveyard.length > 0
                ? 'bg-slate-900 border border-slate-700'
                : 'border border-dashed border-slate-700/60 bg-slate-950/40 text-slate-600'
            }`}
            title={`Cementerio: ${zones.graveyard.length} cartas`}
          >
            <span className="text-[10px] font-mono font-bold text-slate-300">
              {zones.graveyard.length}
            </span>
            <span className="text-[7px] text-slate-500 uppercase font-bold">Cem</span>
          </div>

          {/* Exile Slot */}
          <div
            onClick={() => setActivePileModal('exile')}
            className={`w-8 h-11 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors shadow-md ${
              zones.exile.length > 0
                ? 'bg-slate-900 border border-slate-700'
                : 'border border-dashed border-slate-700/60 bg-slate-950/40 text-slate-600'
            }`}
            title={`Exilio: ${zones.exile.length} cartas`}
          >
            <span className="text-[10px] font-mono font-bold text-slate-300">
              {zones.exile.length}
            </span>
            <span className="text-[7px] text-slate-500 uppercase font-bold">Exi</span>
          </div>

          {/* Command Zone Slot */}
          <div
            onClick={() => setActivePileModal('command')}
            className={`w-8 h-11 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors shadow-md ${
              zones.command.length > 0
                ? 'bg-amber-950/40 border border-amber-600/80 text-amber-300'
                : 'border border-dashed border-slate-700/60 bg-slate-950/40 text-slate-600'
            }`}
            title={`Zona de Comando: ${zones.command.length} comandante(s)`}
          >
            <span className="text-[10px] font-mono font-bold">
              {zones.command.length}
            </span>
            <span className="text-[7px] text-amber-500 uppercase font-bold">Cmd</span>
          </div>
        </div>
      </div>

      {/* Pile Modal Inspector */}
      {activePileModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[75vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-white capitalize">
                {activePileModal === 'command'
                  ? 'Zona de Comando'
                  : activePileModal === 'graveyard'
                  ? 'Cementerio'
                  : 'Exilio'} ({zones[activePileModal].length})
              </h3>
              <button
                onClick={() => setActivePileModal(null)}
                className="text-slate-400 hover:text-white font-bold"
              >
                &times;
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-3 gap-2">
              {zones[activePileModal].map((card, i) => (
                <div key={card.instanceId || i} className="space-y-1">
                  <div className="aspect-[2.5/3.5] rounded-lg overflow-hidden border border-slate-700 bg-slate-950">
                    <img
                      src={card.definition.imageUrlNormal || card.definition.imageUrlSmall}
                      alt={card.definition.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-[10px] font-bold text-slate-300 truncate">
                    {card.definition.name}
                  </div>
                </div>
              ))}
              {zones[activePileModal].length === 0 && (
                <div className="col-span-3 text-center py-6 text-slate-500 text-xs italic">
                  Esta zona está vacía
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Playmat Selector Modal (REQ-22.3) */}
      {isPlaymatModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSavePlaymat}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-sm text-white flex items-center space-x-2">
                <ImageIcon className="w-4 h-4 text-amber-400" />
                <span>Personalizar Playmat</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsPlaymatModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                &times;
              </button>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                URL de imagen / Art Crop (Scryfall o enlace directo)
              </label>
              <input
                type="url"
                value={customPlaymatInput}
                onChange={e => setCustomPlaymatInput(e.target.value)}
                placeholder="https://cards.scryfall.io/art_crop/..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                autoFocus
              />
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setIsPlaymatModalOpen(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-2 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-2 rounded-xl"
              >
                Guardar Playmat
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
