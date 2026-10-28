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
  const sortedPlayers = [...allPlayers].sort(
    (a, b) => (a.initiativeOrder || 0) - (b.initiativeOrder || 0),
  );

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
      <div
        data-floating-toolbar="true"
        className="fixed top-2 left-1/2 -translate-x-1/2 z-40 transition-all duration-300"
      >
        <div className="bg-[#092328]/95 hover:bg-[#092328] backdrop-blur-xl border border-[#12544F] rounded-2xl shadow-2xl px-4 py-1.5 flex items-center space-x-3 text-xs text-zinc-200 select-none ring-1 ring-[#2A835F]/20 transition-all">
          {/* Round & Active Player */}
          <div className="flex items-center space-x-2 pr-2 border-r border-[#12544F]">
            <span className="font-sans font-bold text-[#8BBB92] bg-[#12544F]/40 px-2.5 py-0.5 rounded-lg border border-[#2A835F]/40 tracking-wide">
              Turno {roomState.turnNumber}
            </span>
            <div className="flex items-center space-x-1">
              <span className="text-[11px] text-zinc-400 font-medium">Activo:</span>
              <div className="relative">
                <button
                  data-active-turn-indicator="true"
                  onClick={() => setIsInitiativeDropdownOpen(!isInitiativeDropdownOpen)}
                  className={`font-sans font-bold px-2 py-0.5 rounded-md text-[11px] flex items-center space-x-1.5 transition-colors cursor-pointer ${
                    isMyTurn
                      ? 'bg-[#2A835F]/30 text-[#8BBB92] border border-[#2A835F] shadow-sm shadow-[#2A835F]/30 animate-pulse'
                      : 'text-zinc-100 bg-[#0c2d32] hover:bg-[#12544F] border border-[#12544F]'
                  }`}
                  title="Clic para ver el orden de iniciativa de todos los jugadores"
                >
                  {activePlayer && (
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        activePlayer.isConnected ? 'bg-[#8BBB92]' : 'bg-zinc-600'
                      }`}
                      title={activePlayer.isConnected ? 'Conectado' : 'Desconectado'}
                    />
                  )}
                  {activePlayer?.initiativeOrder && (
                    <span className="font-mono text-[10px] text-[#8BBB92] font-black">
                      {activePlayer.initiativeOrder}.º
                    </span>
                  )}
                  <span
                    className={
                      activePlayer?.isConnected ? '' : 'opacity-40 text-zinc-500 line-through'
                    }
                  >
                    {isMyTurn ? '¡Tu Turno!' : activePlayer?.name || '---'}
                  </span>
                  {isMyTurn && (
                    <span className="text-[9px] bg-[#2A835F]/40 text-[#8BBB92] px-1 rounded font-bold font-sans">
                      Tú
                    </span>
                  )}
                  {activePlayer?.isHost && (
                    <span className="text-[10px] text-[#8BBB92]" title="Anfitrión">
                      👑
                    </span>
                  )}
                  <ChevronDown className="w-3 h-3 text-zinc-400 ml-0.5" />
                </button>

                {/* Dropdown de Orden de Iniciativa (Punto 8) */}
                {isInitiativeDropdownOpen && (
                  <div
                    data-initiative-dropdown="true"
                    className="absolute top-full mt-2 left-0 bg-[#092328] border border-[#12544F] rounded-xl shadow-2xl p-2 min-w-[220px] space-y-1 z-50 animate-in fade-in zoom-in-95 ring-1 ring-[#2A835F]/30"
                  >
                    <div className="text-[10px] font-sans font-bold text-[#8BBB92] uppercase px-2 py-1 tracking-wider border-b border-[#12544F] flex items-center justify-between">
                      <span>Orden de Iniciativa</span>
                      <span className="font-mono text-zinc-400">Turno {roomState.turnNumber}</span>
                    </div>
                    {sortedPlayers.map(p => {
                      const isCurrentActive = p.id === activePlayer?.id;
                      const isLocal = p.id === localPlayerId;
                      return (
                        <div
                          key={p.id}
                          className={`flex items-center justify-between px-2 py-1 rounded-lg text-xs ${
                            isCurrentActive
                              ? 'bg-[#2A835F]/20 text-[#8BBB92] font-bold border border-[#2A835F]/40'
                              : 'text-zinc-300 hover:bg-[#12544F]'
                          }`}
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <span
                              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                p.isConnected ? 'bg-[#8BBB92]' : 'bg-zinc-600'
                              }`}
                              title={p.isConnected ? 'Conectado' : 'Desconectado'}
                            />
                            {p.initiativeOrder && (
                              <span className="font-mono text-[10px] text-[#8BBB92] font-black flex-shrink-0">
                                {p.initiativeOrder}.º
                              </span>
                            )}
                            <span
                              className={`truncate font-sans ${!p.isConnected ? 'opacity-40 text-zinc-500 line-through' : ''}`}
                              title={p.isConnected ? p.name : `${p.name} (Desconectado)`}
                            >
                              {p.name}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                            {isLocal && (
                              <span className="text-[9px] bg-[#2A835F]/30 text-[#8BBB92] px-1 rounded font-bold font-sans">
                                Tú
                              </span>
                            )}
                            {p.isHost && (
                              <span className="text-[10px] text-[#8BBB92]" title="Anfitrión">
                                👑
                              </span>
                            )}
                            {isCurrentActive && (
                              <span className="text-[9px] bg-[#2A835F]/40 text-[#8BBB92] px-1 rounded font-bold font-sans">
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
                  timerSeconds <= 15 ? 'text-rose-400 bg-rose-950/50' : 'text-zinc-300'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>{timerSeconds}s</span>
              </div>
            )}
          </div>

          {/* Pass Turn on Collapsed / Compact Mode (Punto solicitado por usuario) */}
          {isCollapsed && isMyTurn && (
            <button
              onClick={() => onAction('PASS_TURN', {})}
              className="flex items-center space-x-1 bg-[#2A835F] hover:bg-[#349e73] text-white font-sans font-bold px-2.5 py-1 rounded-xl shadow-md shadow-[#2A835F]/30 transition-all cursor-pointer text-xs ml-0.5 animate-pulse border border-[#8BBB92]/40"
              title="Pasar turno (Espacio o Enter)"
            >
              <SkipForward className="w-3.5 h-3.5" />
              <span>Pasar</span>
            </button>
          )}

          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              {/* Pass Turn */}
              {isMyTurn && (
                <button
                  onClick={() => onAction('PASS_TURN', {})}
                  className="flex items-center space-x-1 bg-[#2A835F] hover:bg-[#349e73] text-white font-sans font-bold px-3 py-1 rounded-xl shadow-md shadow-[#2A835F]/30 transition-all cursor-pointer text-xs border border-[#8BBB92]/40"
                  title="Pasar turno al siguiente jugador (Espacio o Enter)"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  <span>Pasar</span>
                </button>
              )}

              {/* Chat & Logs button */}
              <button
                onClick={onToggleChat}
                data-testid="toggle-chat-log"
                className="flex items-center space-x-1 bg-[#0c2d32] hover:bg-[#12544F] border border-[#12544F] px-2.5 py-1 rounded-xl text-zinc-200 transition-colors cursor-pointer"
                title="Historial de acciones y chat"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#8BBB92]" />
                <span className="text-[11px] font-semibold">Chat/Log</span>
              </button>

              {/* Dice Menu Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsDiceOpen(!isDiceOpen)}
                  className="flex items-center space-x-1 bg-[#0c2d32] hover:bg-[#12544F] border border-[#12544F] px-2.5 py-1 rounded-xl text-zinc-200 transition-colors cursor-pointer"
                  title="Tirar dados o moneda"
                >
                  <Dices className="w-3.5 h-3.5 text-[#8BBB92]" />
                  <span className="text-[11px] font-semibold">Dados</span>
                </button>

                {isDiceOpen && (
                  <div className="absolute top-full mt-2 left-0 bg-[#092328] border border-[#12544F] rounded-xl shadow-2xl p-2 w-36 space-y-1 z-50 ring-1 ring-[#2A835F]/30 animate-in fade-in zoom-in-95">
                    <button
                      onClick={() => rollDice(20)}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#12544F] font-semibold text-xs flex items-center space-x-2 text-zinc-200 hover:text-white cursor-pointer"
                    >
                      <Dices className="w-3.5 h-3.5 text-[#8BBB92]" />
                      <span>Dado D20</span>
                    </button>
                    <button
                      onClick={() => rollDice(6)}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#12544F] font-semibold text-xs flex items-center space-x-2 text-zinc-200 hover:text-white cursor-pointer"
                    >
                      <Dices className="w-3.5 h-3.5 text-[#8BBB92]" />
                      <span>Dado D6</span>
                    </button>
                    <button
                      onClick={flipCoin}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#12544F] font-semibold text-xs flex items-center space-x-2 text-zinc-200 hover:text-white cursor-pointer"
                    >
                      <Coins className="w-3.5 h-3.5 text-[#8BBB92]" />
                      <span>Lanzar Moneda</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Spectators */}
              {spectatorsCount > 0 && (
                <div
                  className="flex items-center space-x-1 text-zinc-400 bg-[#040d0f] px-2 py-0.5 rounded-lg border border-[#12544F]"
                  title={`${spectatorsCount} espectador(es)`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-mono">{spectatorsCount}</span>
                </div>
              )}

              {/* Share Code */}
              <button
                onClick={copyRoomCode}
                className="flex items-center space-x-1 bg-[#040d0f] hover:bg-[#12544F] border border-[#12544F] px-2 py-1 rounded-xl font-mono text-[11px] font-bold text-[#8BBB92] transition-colors cursor-pointer"
                title="Copiar código de la mesa"
              >
                <span>{roomState.code}</span>
                {isCopied ? (
                  <Check className="w-3 h-3 text-[#8BBB92]" />
                ) : (
                  <Copy className="w-3 h-3 text-zinc-400" />
                )}
              </button>

              {/* Settings button */}
              <button
                data-testid="settings-btn"
                onClick={() => setIsSettingsOpen(true)}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#12544F] rounded-lg transition-colors cursor-pointer"
                title="Ajustes de visualización"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>

              {/* Help button */}
              <button
                onClick={() => setIsHelpOpen(true)}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#12544F] rounded-lg transition-colors cursor-pointer"
                title="Ayuda y atajos"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>

              {/* Leave Room button */}
              {onLeaveRoom && (
                <button
                  onClick={onLeaveRoom}
                  className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-[#12544F] rounded-lg transition-colors cursor-pointer"
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
            className="p-1 text-zinc-400 hover:text-white hover:bg-[#12544F] rounded-lg transition-colors ml-1 cursor-pointer"
            title={isCollapsed ? 'Desplegar barra' : 'Plegar barra'}
          >
            {isCollapsed ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsSettingsOpen(false)}
          onDoubleClick={e => {
            e.stopPropagation();
            setIsSettingsOpen(false);
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
            className="bg-[#092328] border border-[#12544F] rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl ring-1 ring-[#2A835F]/30"
          >
            <div className="flex items-center justify-between border-b border-[#12544F] pb-3">
              <h3 className="font-sans font-bold text-sm text-[#8BBB92] flex items-center space-x-2 tracking-wide">
                <Settings className="w-4 h-4 text-[#8BBB92]" />
                <span>Ajustes de Mesa</span>
              </h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-zinc-400 hover:text-white font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4">
              {/* Visuals / Playmats */}
              <label className="flex items-center justify-between cursor-pointer p-2.5 rounded-xl bg-[#040d0f] border border-[#12544F] hover:border-[#2A835F] transition-colors">
                <div>
                  <div className="text-xs font-semibold text-zinc-200">Reducir fondos (Playmats)</div>
                  <div className="text-[11px] text-zinc-400">
                    Sustituye el arte de playmats por color liso oscuro (REQ-22.15).
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={reduceBackgrounds}
                  onChange={e => onToggleReduceBackgrounds(e.target.checked)}
                  className="rounded bg-[#040d0f] border-[#12544F] text-[#2A835F] focus:ring-0 ml-3 cursor-pointer"
                />
              </label>
            </div>

            <button
              onClick={() => setIsSettingsOpen(false)}
              className="w-full bg-[#0c2d32] hover:bg-[#12544F] border border-[#12544F] text-zinc-200 hover:text-white font-semibold text-xs py-2 rounded-xl transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {isHelpOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsHelpOpen(false)}
          onDoubleClick={e => {
            e.stopPropagation();
            setIsHelpOpen(false);
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
            className="bg-[#092328] border border-[#12544F] rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl ring-1 ring-[#2A835F]/30"
          >
            <div className="flex items-center justify-between border-b border-[#12544F] pb-3">
              <h3 className="font-sans font-bold text-sm text-[#8BBB92] flex items-center space-x-2 tracking-wide">
                <HelpCircle className="w-4 h-4 text-[#8BBB92]" />
                <span>Cómo Jugar en la Mesa Virtual</span>
              </h3>
              <button
                onClick={() => setIsHelpOpen(false)}
                className="text-zinc-400 hover:text-white font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="text-xs text-zinc-300 space-y-2.5">
              <div className="p-2.5 rounded-xl bg-[#040d0f] border border-[#12544F]">
                <strong className="text-[#8BBB92] block mb-0.5 font-sans font-bold">🎮 Arrastrar y Soltar (DND):</strong>
                Arrastra cartas desde tu mano al campo de batalla. También puedes moverlas
                libremente entre zonas (cementerio, exilio, comando).
              </div>
              <div className="p-2.5 rounded-xl bg-[#040d0f] border border-[#12544F]">
                <strong className="text-[#8BBB92] block mb-0.5 font-sans font-bold">💖 Vidas y Contadores:</strong>
                Haz clic en la pastilla de vida de tu esquina interior para modificar vidas (+1, −1,
                daño recibido, vida ganada) o gestionar daño de comandante y veneno.
              </div>
              <div className="p-2.5 rounded-xl bg-[#040d0f] border border-[#12544F]">
                <strong className="text-[#8BBB92] block mb-0.5 font-sans font-bold">🔍 Zoom de Cartas:</strong>
                Pasa el cursor sobre cualquier carta para ampliar su arte y texto Oracle.
              </div>
              <div className="p-2.5 rounded-xl bg-[#040d0f] border border-[#12544F]">
                <strong className="text-[#8BBB92] block mb-0.5 font-sans font-bold">🖼️ Ampliar Celda:</strong>
                Pulsa el botón de maximizar en la etiqueta de nombre de una celda para verla en
                pantalla completa.
              </div>
            </div>

            <button
              onClick={() => setIsHelpOpen(false)}
              className="w-full bg-[#2A835F] hover:bg-[#349e73] text-white font-sans font-bold text-xs py-2.5 rounded-xl transition-all shadow-md shadow-[#2A835F]/20 cursor-pointer border border-[#8BBB92]/40"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
