import React, { useState, useEffect, useRef } from 'react';
import type { CardInstance, GameActionType, RoomState, ZoneType } from '@mtgc/shared';
import { Portal } from './Portal';
import {
  Play,
  RotateCw,
  Plus,
  Copy,
  Eye,
  Shield,
  Trash2,
  Sparkles,
  BookOpen,
  ArrowUp,
  ArrowDown,
  Hash,
  Share2,
  Users,
  User,
  ChevronRight,
} from 'lucide-react';
import { getPlayerBattlefieldCascadePosition } from '../utils/table-framing';

export interface CardContextMenuProps {
  card: CardInstance;
  fromZone: ZoneType;
  position: { x: number; y: number };
  onClose: () => void;
  roomState?: RoomState;
  localPlayerId?: string;
  allBattlefieldCards?: CardInstance[];
  onAction: (type: GameActionType, payload: unknown) => void;
  // Opciones exclusivas de permanentes en el campo de batalla
  onTap?: () => void;
  onAddCounter?: (type: string) => void;
  onClone?: () => void;
  onFlip?: () => void;
  onSendToCommand?: () => void;
}

export const CardContextMenu: React.FC<CardContextMenuProps> = ({
  card,
  fromZone,
  position,
  onClose,
  roomState,
  localPlayerId,
  allBattlefieldCards,
  onAction,
  onTap,
  onAddCounter,
  onClone,
  onFlip,
  onSendToCommand,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<'library' | 'reveal' | null>(null);
  const [libraryPosInput, setLibraryPosInput] = useState<string>('1');
  const [showPosInput, setShowPosInput] = useState<boolean>(false);

  const targetPlayerId = localPlayerId || card.ownerId;
  const currentLibraryLength =
    (roomState && targetPlayerId && roomState.playerZones?.[targetPlayerId]?.library?.length) ||
    (roomState && targetPlayerId && roomState.players?.[targetPlayerId]?.libraryCount) ||
    0;

  // Cerrar al presionar Escape o clic fuera
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Ajustar posición para no desbordar los límites de la pantalla
  const menuW = 200;
  const menuH = 320;
  const clampedX = typeof window !== 'undefined' ? Math.min(position.x, window.innerWidth - menuW - 10) : position.x;
  const clampedY = typeof window !== 'undefined' ? Math.min(position.y, window.innerHeight - menuH - 10) : position.y;

  // Destino: Mesa (con posición en cascada en sección propia, Punto 2)
  const handleSendToBattlefield = () => {
    let targetPos = { x: 0.5, y: 0.5 };
    if (roomState && targetPlayerId) {
      targetPos = getPlayerBattlefieldCascadePosition(targetPlayerId, roomState, allBattlefieldCards);
    }
    onAction('MOVE_CARD', {
      cardInstanceId: card.instanceId,
      fromZone,
      toZone: 'battlefield',
      toPlayerId: targetPlayerId,
      holderId: targetPlayerId,
      position: {
        ...targetPos,
        zIndex: 10,
      },
    });
    onClose();
  };

  // Destino: Mano
  const handleSendToHand = () => {
    onAction('MOVE_CARD', {
      cardInstanceId: card.instanceId,
      fromZone,
      toZone: 'hand',
      toPlayerId: targetPlayerId,
    });
    onClose();
  };

  // Destino: Cementerio (arriba de la pila)
  const handleSendToGraveyard = () => {
    onAction('MOVE_CARD', {
      cardInstanceId: card.instanceId,
      fromZone,
      toZone: 'graveyard',
      toPlayerId: targetPlayerId,
    });
    onClose();
  };

  // Destino: Exilio (arriba de la pila)
  const handleSendToExile = () => {
    onAction('MOVE_CARD', {
      cardInstanceId: card.instanceId,
      fromZone,
      toZone: 'exile',
      toPlayerId: targetPlayerId,
    });
    onClose();
  };

  // Destino: Biblioteca (Arriba, Abajo o Posición N, Punto 7)
  const handleSendToLibrary = (destIndex: number) => {
    onAction('MOVE_CARD', {
      cardInstanceId: card.instanceId,
      fromZone,
      toZone: 'library',
      toPlayerId: targetPlayerId,
      destinationIndex: destIndex,
    });
    onClose();
  };

  const handleCustomPosSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(libraryPosInput, 10);
    const parsedPos = isNaN(val) ? 1 : Math.max(1, Math.min(currentLibraryLength + 1, val));
    // 1 = arriba (índice 0)
    handleSendToLibrary(parsedPos - 1);
  };

  // Revelar: a todos o a un jugador específico (Punto 7)
  const handleReveal = (targetPId?: string) => {
    onAction('REVEAL_CARD', {
      cardInstanceId: card.instanceId,
      fromZone,
      targetPlayerId: targetPId,
    });
    onClose();
  };

  // Lista de oponentes para el submenú de revelar
  const opponents = roomState
    ? Object.values(roomState.players).filter(p => !p.isSpectator && p.id !== localPlayerId)
    : [];

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[100]"
        onClick={onClose}
        onContextMenu={e => {
          e.preventDefault();
          onClose();
        }}
      >
        <div
          ref={menuRef}
          style={{
            top: `${clampedY}px`,
            left: `${clampedX}px`,
          }}
          data-card-context-menu="true"
          onClick={e => e.stopPropagation()}
          className="fixed bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl p-1.5 flex flex-col space-y-0.5 min-w-[180px] z-[110] backdrop-blur-md text-xs text-slate-200 select-none"
        >
          {/* Header con nombre de carta */}
          <div className="px-2 py-1 text-[11px] font-bold text-amber-400 border-b border-slate-800 truncate max-w-[200px]">
            {card.definition.name}
          </div>

          {/* Opciones exclusivas de campo de batalla */}
          {fromZone === 'battlefield' && (
            <>
              {onTap && (
                <button
                  type="button"
                  data-testid="context-tap-btn"
                  onClick={() => {
                    onTap();
                    onClose();
                  }}
                  className="w-full flex items-center space-x-2 px-2 py-1.5 hover:bg-slate-800 rounded-lg text-slate-200 hover:text-white cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                  <span>{card.isTapped ? 'Enderezar' : 'Girar'}</span>
                </button>
              )}

              {onAddCounter && (
                <button
                  type="button"
                  data-testid="context-counter-btn"
                  onClick={() => {
                    onAddCounter('+1/+1');
                    onClose();
                  }}
                  className="w-full flex items-center space-x-2 px-2 py-1.5 hover:bg-slate-800 rounded-lg text-slate-200 hover:text-white cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Añadir contador +1/+1</span>
                </button>
              )}

              {onClone && (
                <button
                  type="button"
                  data-testid="context-clone-btn"
                  onClick={() => {
                    onClone();
                    onClose();
                  }}
                  className="w-full flex items-center space-x-2 px-2 py-1.5 hover:bg-slate-800 rounded-lg text-slate-200 hover:text-white cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-blue-400" />
                  <span>Clonar permanente</span>
                </button>
              )}

              {onFlip && (
                <button
                  type="button"
                  data-testid="context-flip-btn"
                  onClick={() => {
                    onFlip();
                    onClose();
                  }}
                  className="w-full flex items-center space-x-2 px-2 py-1.5 hover:bg-slate-800 rounded-lg text-slate-200 hover:text-white cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{card.isFaceDown ? 'Boca arriba' : 'Boca abajo'}</span>
                </button>
              )}

              {card.isCommander && onSendToCommand && (
                <button
                  type="button"
                  data-testid="context-to-command"
                  onClick={() => {
                    onSendToCommand();
                    onClose();
                  }}
                  className="w-full flex items-center space-x-2 px-2 py-1.5 hover:bg-slate-800 rounded-lg text-amber-300 hover:text-amber-200 cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span>A Zona de Comando</span>
                </button>
              )}

              <div className="border-t border-slate-800 my-0.5" />
            </>
          )}

          {/* Destino: Mesa (si no está ya en la mesa) */}
          {fromZone !== 'battlefield' && (
            <button
              type="button"
              data-testid="context-to-battlefield"
              onClick={handleSendToBattlefield}
              className="w-full flex items-center space-x-2 px-2 py-1.5 hover:bg-slate-800 rounded-lg text-slate-200 hover:text-white cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 text-emerald-400" />
              <span>Enviar a Mesa (cascada)</span>
            </button>
          )}

          {/* Destino: Mano (si no está ya en la mano) */}
          {fromZone !== 'hand' && (
            <button
              type="button"
              data-testid="context-to-hand"
              onClick={handleSendToHand}
              className="w-full flex items-center space-x-2 px-2 py-1.5 hover:bg-slate-800 rounded-lg text-slate-200 hover:text-white cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span>Enviar a Mano</span>
            </button>
          )}

          {/* Destino: Cementerio (si no está ya en cementerio) */}
          {fromZone !== 'graveyard' && (
            <button
              type="button"
              data-testid="context-to-graveyard"
              onClick={handleSendToGraveyard}
              className="w-full flex items-center space-x-2 px-2 py-1.5 hover:bg-slate-800 rounded-lg text-rose-300 hover:text-rose-200 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Enviar a Cementerio</span>
            </button>
          )}

          {/* Destino: Exilio (si no está ya en exilio) */}
          {fromZone !== 'exile' && (
            <button
              type="button"
              data-testid="context-to-exile"
              onClick={handleSendToExile}
              className="w-full flex items-center space-x-2 px-2 py-1.5 hover:bg-slate-800 rounded-lg text-purple-300 hover:text-purple-200 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Enviar a Exilio</span>
            </button>
          )}

          {/* Destino: Biblioteca con Submenú (Arriba, Abajo, Posición) */}
          <div
            className="relative"
            onMouseEnter={() => setActiveSubmenu('library')}
            onMouseLeave={() => {
              if (!showPosInput) setActiveSubmenu(null);
            }}
          >
            <button
              type="button"
              data-testid="context-to-library-menu"
              onClick={() => setActiveSubmenu(activeSubmenu === 'library' ? null : 'library')}
              className={`w-full flex items-center justify-between px-2 py-1.5 hover:bg-slate-800 rounded-lg cursor-pointer ${
                activeSubmenu === 'library' ? 'bg-slate-800 text-white' : 'text-slate-200'
              }`}
            >
              <div className="flex items-center space-x-2">
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Biblioteca</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Submenú de Biblioteca */}
            {activeSubmenu === 'library' && (
              <div
                data-testid="context-library-submenu"
                className="absolute left-full top-0 ml-1 bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl p-1.5 flex flex-col space-y-1 min-w-[150px] z-[120] backdrop-blur-md"
              >
                <button
                  type="button"
                  data-testid="context-to-library-top"
                  onClick={() => handleSendToLibrary(0)}
                  className="w-full flex items-center space-x-2 px-2 py-1 hover:bg-slate-800 rounded-lg text-slate-200 hover:text-white cursor-pointer"
                >
                  <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Arriba (tope)</span>
                </button>
                <button
                  type="button"
                  data-testid="context-to-library-bottom"
                  onClick={() => handleSendToLibrary(currentLibraryLength)}
                  className="w-full flex items-center space-x-2 px-2 py-1 hover:bg-slate-800 rounded-lg text-slate-200 hover:text-white cursor-pointer"
                >
                  <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                  <span>Abajo (fondo)</span>
                </button>

                {!showPosInput ? (
                  <button
                    type="button"
                    data-testid="context-to-library-pos-btn"
                    onClick={() => setShowPosInput(true)}
                    className="w-full flex items-center space-x-2 px-2 py-1 hover:bg-slate-800 rounded-lg text-slate-200 hover:text-white cursor-pointer"
                  >
                    <Hash className="w-3.5 h-3.5 text-amber-400" />
                    <span>Posición específica...</span>
                  </button>
                ) : (
                  <form onSubmit={handleCustomPosSubmit} className="p-1 flex flex-col space-y-1 bg-slate-950/80 rounded-lg border border-slate-800">
                    <div className="flex items-center space-x-1">
                      <span className="text-[10px] text-slate-400">Pos (1-{currentLibraryLength + 1}):</span>
                      <input
                        type="number"
                        min="1"
                        max={currentLibraryLength + 1}
                        value={libraryPosInput}
                        autoFocus
                        onChange={e => setLibraryPosInput(e.target.value)}
                        data-testid="library-pos-input"
                        className="w-12 bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                    <button
                      type="submit"
                      data-testid="confirm-library-pos-btn"
                      className="w-full px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-[11px] cursor-pointer"
                    >
                      Poner en posición
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Opción: Revelar con Submenú (A todos o a jugador específico, Punto 7) */}
          <div
            className="relative border-t border-slate-800 pt-0.5"
            onMouseEnter={() => setActiveSubmenu('reveal')}
            onMouseLeave={() => setActiveSubmenu(null)}
          >
            <button
              type="button"
              data-testid="context-reveal-menu"
              onClick={() => setActiveSubmenu(activeSubmenu === 'reveal' ? null : 'reveal')}
              className={`w-full flex items-center justify-between px-2 py-1.5 hover:bg-slate-800 rounded-lg cursor-pointer ${
                activeSubmenu === 'reveal' ? 'bg-slate-800 text-white' : 'text-slate-200'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Revelar</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Submenú de Revelar */}
            {activeSubmenu === 'reveal' && (
              <div
                data-testid="context-reveal-submenu"
                className="absolute left-full top-0 ml-1 bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl p-1.5 flex flex-col space-y-1 min-w-[160px] z-[120] backdrop-blur-md"
              >
                <button
                  type="button"
                  data-testid="context-reveal-all"
                  onClick={() => handleReveal(undefined)}
                  className="w-full flex items-center space-x-2 px-2 py-1 hover:bg-slate-800 rounded-lg text-slate-200 hover:text-white cursor-pointer font-medium"
                >
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  <span>A toda la mesa</span>
                </button>

                {opponents.length > 0 && (
                  <>
                    <div className="border-t border-slate-800 my-0.5 px-1 text-[9px] text-slate-400 uppercase tracking-wider">
                      Jugador específico
                    </div>
                    {opponents.map(opp => (
                      <button
                        key={opp.id}
                        type="button"
                        data-testid={`context-reveal-player-${opp.id}`}
                        onClick={() => handleReveal(opp.id)}
                        className="w-full flex items-center space-x-2 px-2 py-1 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white cursor-pointer truncate"
                      >
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{opp.name}</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
};
