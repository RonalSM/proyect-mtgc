import React, { useState, useEffect } from 'react';
import type { RoomState, GameActionType } from '@mtgc/shared';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Dices,
  Copy,
  Check,
  MessageSquare,
  Eye,
  Settings,
  HelpCircle,
  SkipForward,
  Coins,
  LogOut,
} from 'lucide-react';

interface FloatingToolbarProps {
  roomState: RoomState;
  localPlayerId: string;
  onAction: (type: GameActionType, payload: unknown) => void;
  onToggleChat: () => void;
  reduceBackgrounds: boolean;
  onToggleReduceBackgrounds: (val: boolean) => void;
  onLeaveRoom?: () => void;
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  roomState,
  localPlayerId,
  onAction,
  onToggleChat,
  reduceBackgrounds,
  onToggleReduceBackgrounds,
  onLeaveRoom,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isDiceOpen, setIsDiceOpen] = useState(false);
  const [isInitiativeDropdownOpen, setIsInitiativeDropdownOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);

  const activePlayer = roomState.activePlayerId
    ? roomState.players[roomState.activePlayerId]
    : null;
  const isMyTurn = roomState.activePlayerId === localPlayerId;
  const spectatorsCount = Object.values(roomState.players).filter(p => p.isSpectator).length;
  const allPlayers = Object.values(roomState.players);
  const sortedPlayers = [...allPlayers].sort((a, b) => (a.initiativeOrder || 0) - (b.initiativeOrder || 0));

  // Turn timer countdown
  useEffect(() => {
    if (!roomState.settings?.turnTimerSeconds) {
      setTimerSeconds(null);
      return;
    }
    setTimerSeconds(roomState.settings.turnTimerSeconds);
    const interval = setInterval(() => {
      setTimerSeconds(prev => (prev && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [roomState.activePlayerId, roomState.settings?.turnTimerSeconds]);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomState.code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const rollDice = (sides: number) => {
    onAction('ROLL_DICE', { sides });
    setIsDiceOpen(false);
  };

  const flipCoin = () => {
    onAction('ROLL_DICE', { sides: 2 });
    setIsDiceOpen(false);
  };

  return (
    <>
      <div data-floating-toolbar="true" className="fixed top-2 left-1/2 -translate-x-1/2 z-40 transition-all duration-300">
        <div className="bg-slate-900/90 hover:bg-slate-900 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl px-4 py-1.5 flex items-center space-x-3 text-xs text-slate-200 select-none">
          {/* Round & Active Player */}
          <div className="flex items-center space-x-2 pr-2 border-r border-slate-700/60">
            <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
              Ronda {roomState.turnNumber}
            </span>
            <div className="flex items-center space-x-1">
              <span className="text-[11px] text-slate-400">Turno:</span>
              <div className="relative">
                <button
                  data-active-turn-indicator="true"
                  onClick={() => setIsInitiativeDropdownOpen(!isInitiativeDropdownOpen)}
                  className={`font-bold px-2 py-0.5 rounded-md text-[11px] flex items-center space-x-1.5 transition-colors cursor-pointer ${
                    isMyTurn
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse'
                      : 'text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60'
                  }`}
                  title="Clic para ver el orden de iniciativa de todos los jugadores"
                >
                  {activePlayer && (
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        activePlayer.isConnected ? 'bg-emerald-400' : 'bg-slate-500'
                      }`}
                      title={activePlayer.isConnected ? 'Conectado' : 'Desconectado'}
                    />
                  )}
                  {activePlayer?.initiativeOrder && (
                    <span className="font-mono text-[10px] text-amber-400 font-black">
                      {activePlayer.initiativeOrder}.º
                    </span>
                  )}
                  <span className={activePlayer?.isConnected ? '' : 'opacity-40 text-slate-400 line-through'}>
                    {isMyTurn ? '¡Tu Turno!' : activePlayer?.name || '---'}
                  </span>
                  {isMyTurn && (
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded font-bold">
                      Tú
                    </span>
                  )}
                  {activePlayer?.isHost && (
                    <span className="text-[10px] text-amber-400" title="Anfitrión">
                      👑
                    </span>
                  )}
                  <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
                </button>

                {/* Dropdown de Orden de Iniciativa (Punto 8) */}
                {isInitiativeDropdownOpen && (
                  <div
                    data-initiative-dropdown="true"
                    className="absolute top-full mt-2 left-0 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 min-w-[210px] space-y-1 z-50 animate-in fade-in zoom-in-95"
                  >
                    <div className="text-[10px] font-bold text-amber-400 uppercase px-2 py-1 tracking-wider border-b border-slate-800 flex items-center justify-between">
                      <span>Orden de Iniciativa</span>
                      <span>Ronda {roomState.turnNumber}</span>
                    </div>
                    {sortedPlayers.map(p => {
                      const isCurrentActive = p.id === activePlayer?.id;
                      const isLocal = p.id === localPlayerId;
                      return (
                        <div
                          key={p.id}
                          className={`flex items-center justify-between px-2 py-1 rounded-lg text-xs ${
                            isCurrentActive
                              ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                              : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <span
                              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                p.isConnected ? 'bg-emerald-400' : 'bg-slate-500'
                              }`}
                              title={p.isConnected ? 'Conectado' : 'Desconectado'}
                            />
                            {p.initiativeOrder && (
                              <span className="font-mono text-[10px] text-amber-400 font-black flex-shrink-0">
                                {p.initiativeOrder}.º
                              </span>
                            )}
                            <span
                              className={`truncate ${!p.isConnected ? 'opacity-40 text-slate-400 line-through' : ''}`}
                              title={p.isConnected ? p.name : `${p.name} (Desconectado)`}
                            >
                              {p.name}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                            {isLocal && (
                              <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded font-bold">
                                Tú
                              </span>
                            )}
                            {p.isHost && (
                              <span className="text-[10px] text-amber-400" title="Anfitrión">
                                👑
                              </span>
                            )}
                            {isCurrentActive && (
                              <span className="text-[9px] bg-emerald-500/30 text-emerald-300 px-1 rounded font-bold">
                                Activo
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {timerSeconds !== null && (
              <div
                className={`flex items-center space-x-1 text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  timerSeconds <= 15 ? 'text-rose-400 bg-rose-950/50' : 'text-slate-300'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>{timerSeconds}s</span>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              {/* Pass Turn */}
              {isMyTurn && (
                <button
                  onClick={() => onAction('PASS_TURN', {})}
                  className="flex items-center space-x-1 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-extrabold px-3 py-1 rounded-xl shadow-md shadow-emerald-600/30 transition-all cursor-pointer text-xs"
                  title="Pasar turno al siguiente jugador (Espacio o Enter)"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  <span>Pasar Turno</span>
                </button>
              )}

              {/* Chat & Logs button */}
              <button
                onClick={onToggleChat}
                data-testid="toggle-chat-log"
                className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 rounded-xl text-slate-200 transition-colors"
                title="Historial de acciones y chat"
              >
                <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] font-bold">Chat/Log</span>
              </button>

              {/* Dice Menu Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsDiceOpen(!isDiceOpen)}
                  className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 rounded-xl text-slate-200 transition-colors"
                  title="Tirar dados o moneda"
                >
                  <Dices className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px] font-bold">Dados</span>
                </button>

                {isDiceOpen && (
                  <div className="absolute top-full mt-2 left-0 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 w-36 space-y-1 z-50">
                    <button
                      onClick={() => rollDice(20)}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 font-semibold text-xs flex items-center space-x-2"
                    >
                      <Dices className="w-3.5 h-3.5 text-amber-400" />
                      <span>Dado D20</span>
                    </button>
                    <button
                      onClick={() => rollDice(6)}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 font-semibold text-xs flex items-center space-x-2"
                    >
                      <Dices className="w-3.5 h-3.5 text-blue-400" />
                      <span>Dado D6</span>
                    </button>
                    <button
                      onClick={flipCoin}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 font-semibold text-xs flex items-center space-x-2"
                    >
                      <Coins className="w-3.5 h-3.5 text-yellow-400" />
                      <span>Lanzar Moneda</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Spectators */}
              {spectatorsCount > 0 && (
                <div
                  className="flex items-center space-x-1 text-slate-400 bg-slate-950/60 px-2 py-0.5 rounded-lg"
                  title={`${spectatorsCount} espectador(es)`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-mono">{spectatorsCount}</span>
                </div>
              )}

              {/* Share Code */}
              <button
                onClick={copyRoomCode}
                className="flex items-center space-x-1 bg-slate-950 hover:bg-slate-800 border border-slate-700 px-2 py-1 rounded-xl font-mono text-[11px] font-bold text-amber-300 transition-colors"
                title="Copiar código de la mesa"
              >
                <span>{roomState.code}</span>
                {isCopied ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3 text-slate-400" />
                )}
              </button>

              {/* Settings button */}
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="Ajustes de visualización"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>

              {/* Help button */}
              <button
                onClick={() => setIsHelpOpen(true)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="Ayuda y atajos"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>

              {/* Leave Room button */}
              {onLeaveRoom && (
                <button
                  onClick={onLeaveRoom}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Salir de la mesa"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-1"
            title={isCollapsed ? 'Desplegar barra' : 'Plegar barra'}
          >
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center space-x-2">
                <Settings className="w-4 h-4 text-amber-400" />
                <span>Ajustes de Mesa</span>
              </h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-slate-200">Reducir fondos (Playmats)</div>
                  <div className="text-[11px] text-slate-400">
                    Sustituye el arte de playmats por color liso oscuro (REQ-22.15).
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={reduceBackgrounds}
                  onChange={e => onToggleReduceBackgrounds(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 ml-3"
                />
              </label>
            </div>

            <button
              onClick={() => setIsSettingsOpen(false)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-2 rounded-xl transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {isHelpOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center space-x-2">
                <HelpCircle className="w-4 h-4 text-amber-400" />
                <span>Cómo Jugar en la Mesa Virtual</span>
              </h3>
              <button
                onClick={() => setIsHelpOpen(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                &times;
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-2.5">
              <div>
                <strong className="text-white block mb-0.5">🎮 Arrastrar y Soltar (DND):</strong>
                Arrastra cartas desde tu mano al campo de batalla. También puedes moverlas libremente entre zonas (cementerio, exilio, comando).
              </div>
              <div>
                <strong className="text-white block mb-0.5">💖 Vidas y Contadores:</strong>
                Haz clic en la pastilla de vida de tu esquina interior para modificar vidas (+1, −1, daño recibido, vida ganada) o gestionar daño de comandante y veneno.
              </div>
              <div>
                <strong className="text-white block mb-0.5">🔍 Zoom de Cartas:</strong>
                Pasa el cursor sobre cualquier carta para ampliar su arte y texto Oracle.
              </div>
              <div>
                <strong className="text-white block mb-0.5">🖼️ Ampliar Celda:</strong>
                Pulsa el botón de maximizar en la etiqueta de nombre de una celda para verla en pantalla completa.
              </div>
            </div>

            <button
              onClick={() => setIsHelpOpen(false)}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-2 rounded-xl transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
