import React, { useState } from 'react';
import type { RoomState, GameActionType, CardDefinition } from '@mtgc/shared';
import { PlayerCard } from './PlayerCard';
import { Battlefield } from './Battlefield';
import { TurnBar } from './TurnBar';
import { GameLogAndChat } from './GameLogAndChat';
import { DeckImporter } from './DeckImporter';
import { Copy, Check, LogOut, Layers, Layout, Video, ExternalLink } from 'lucide-react';

interface TableBoardProps {
  roomState: RoomState;
  localPlayerId: string;
  connectionStatus: string;
  onAction: (type: GameActionType, payload: unknown) => void;
  onLeaveRoom: () => void;
}

export const TableBoard: React.FC<TableBoardProps> = ({
  roomState,
  localPlayerId,
  connectionStatus,
  onAction,
  onLeaveRoom,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [boardView, setBoardView] = useState<'board' | 'importer'>('board');
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoInput, setVideoInput] = useState(roomState.settings.videoCallUrl || '');

  const localPlayer = roomState.players[localPlayerId];
  const allPlayersList = Object.values(roomState.players).filter(p => !p.isSpectator);
  const opponentsList = allPlayersList.filter(p => p.id !== localPlayerId);

  const localZones = roomState.playerZones[localPlayerId] || {
    library: [],
    hand: [],
    battlefield: [],
    graveyard: [],
    exile: [],
    command: [],
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomState.code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDeckLoaded = (commander: CardDefinition, cardsCount: number) => {
    // Dispatch deck to server
    onAction('LOAD_DECK', {
      commanderCards: [commander],
      maindeckCards: Array.from({ length: cardsCount - 1 }, (_, i) => ({
        scryfallId: `card_${i}`,
        name: `Carta #${i + 1}`,
        cmc: (i % 6) + 1,
        typeLine: 'Spell',
        colors: [],
        colorIdentity: [],
      })),
    });
    setBoardView('board');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] space-y-3">
      {/* Top Table Status Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-2.5 shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h2 className="font-bold text-sm text-white flex items-center space-x-2">
              <span>{roomState.name}</span>
              <span className="text-slate-500 font-normal">&bull;</span>
              <button
                onClick={copyCode}
                className="flex items-center space-x-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-700 px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold text-amber-300 transition-colors"
                title="Copiar código de la mesa"
              >
                <span>{roomState.code}</span>
                {isCopied ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3 text-slate-400" />
                )}
              </button>
            </h2>
          </div>

          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setBoardView('board')}
              className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                boardView === 'board'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layout className="w-3 h-3" />
              <span>Mesa de Juego</span>
            </button>
            <button
              onClick={() => setBoardView('importer')}
              className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                boardView === 'importer'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Cargar Mazo</span>
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {roomState.settings.videoCallUrl ? (
            <a
              href={roomState.settings.videoCallUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow active:scale-95"
              title="Abrir enlace de videollamada externa"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Videollamada</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
          ) : null}

          {localPlayer?.isHost && (
            <button
              onClick={() => {
                setVideoInput(roomState.settings.videoCallUrl || '');
                setShowVideoModal(true);
              }}
              className="flex items-center space-x-1 text-xs text-slate-400 hover:text-white bg-slate-950 hover:bg-slate-800 border border-slate-800 px-2.5 py-1 rounded-xl transition-colors"
              title="Configurar videollamada externa"
            >
              <Video className="w-3.5 h-3.5" />
              <span>{roomState.settings.videoCallUrl ? 'Editar Video' : '+ Videollamada'}</span>
            </button>
          )}

          <div className="flex items-center space-x-2 text-xs px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800">
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-400 animate-pulse'
                  : connectionStatus === 'reconnecting'
                    ? 'bg-amber-400 animate-ping'
                    : 'bg-rose-500'
              }`}
            />
            <span className="text-[11px] text-slate-300 capitalize">{connectionStatus}</span>
          </div>

          <button
            onClick={onLeaveRoom}
            className="flex items-center space-x-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 px-3 py-1.5 rounded-xl border border-rose-900/40 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Salir</span>
          </button>
        </div>
      </div>

      {/* Main Board Arena */}
      {boardView === 'importer' ? (
        <div className="flex-1 overflow-y-auto">
          <DeckImporter onDeckLoaded={handleDeckLoaded} />
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 overflow-hidden">
          {/* Main Battlefield + Player Pod Column (Left 3 or 4 cols) */}
          <div
            className={`${isSidePanelOpen ? 'lg:col-span-3' : 'lg:col-span-4'} flex flex-col space-y-3 h-full overflow-hidden`}
          >
            {/* Table Undo Confirmation Banner (REQ-11.3) */}
            {roomState.pendingUndoProposal && (
              <div className="bg-amber-950/70 border border-amber-500/80 rounded-xl p-3 flex items-center justify-between shadow-2xl backdrop-blur animate-pulse z-30">
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-amber-400 font-bold">⚠️ Solicitud de Deshacer:</span>
                  <span className="text-white">
                    <strong>{roomState.pendingUndoProposal.proposerName}</strong> solicita deshacer:{' '}
                    <em>"{roomState.pendingUndoProposal.description}"</em>
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  {roomState.pendingUndoProposal.proposerId === localPlayerId ? (
                    <span className="text-xs text-amber-300 italic">Esperando confirmación de la mesa...</span>
                  ) : (
                    <>
                      <button
                        onClick={() =>
                          onAction('CONFIRM_UNDO', {
                            proposalId: roomState.pendingUndoProposal!.id,
                            approved: true,
                          })
                        }
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        Aprobar
                      </button>
                      <button
                        onClick={() =>
                          onAction('CONFIRM_UNDO', {
                            proposalId: roomState.pendingUndoProposal!.id,
                            approved: false,
                          })
                        }
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        Rechazar
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Opponents Row at the Top (2 to 5 opponents) */}
            {opponentsList.length > 0 && (
              <div
                className={`grid gap-3 ${
                  opponentsList.length === 1
                    ? 'grid-cols-1 max-w-sm mx-auto w-full'
                    : opponentsList.length === 2
                      ? 'grid-cols-2'
                      : opponentsList.length === 3
                        ? 'grid-cols-3'
                        : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
                }`}
              >
                {opponentsList.map(opp => (
                  <PlayerCard
                    key={opp.id}
                    player={opp}
                    isLocalPlayer={false}
                    isActiveTurn={roomState.activePlayerId === opp.id}
                    allPlayers={allPlayersList}
                    onAction={onAction}
                  />
                ))}
              </div>
            )}

            {/* Turn Bar */}
            <TurnBar
              turnNumber={roomState.turnNumber}
              activePlayerId={roomState.activePlayerId}
              players={roomState.players}
              localPlayerId={localPlayerId}
              onAction={onAction}
              onToggleSidePanel={() => setIsSidePanelOpen(prev => !prev)}
              isSidePanelOpen={isSidePanelOpen}
              turnOrder={roomState.turnOrder}
              isHost={localPlayer?.isHost}
            />

            {/* Battlefield Canvas and Local Player Zone */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 overflow-hidden min-h-0">
              {/* Battlefield Center */}
              <div className="md:col-span-3 flex flex-col h-full overflow-y-auto">
                <Battlefield localPlayerId={localPlayerId} zones={localZones} onAction={onAction} />
              </div>

              {/* Local Player Control Pod */}
              {localPlayer && (
                <div className="md:col-span-1 overflow-y-auto">
                  <PlayerCard
                    player={localPlayer}
                    isLocalPlayer={true}
                    isActiveTurn={roomState.activePlayerId === localPlayerId}
                    allPlayers={allPlayersList}
                    onAction={onAction}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Side Drawer: Action Log & Chat */}
          {isSidePanelOpen && (
            <div className="lg:col-span-1 h-full overflow-hidden">
              <GameLogAndChat
                logs={roomState.logs}
                onAction={onAction}
                onClose={() => setIsSidePanelOpen(false)}
              />
            </div>
          )}
        </div>
      )}

      {/* Video Call Modal (REQ-12.3) */}
      {showVideoModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-md w-full shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2 mb-2">
              <Video className="w-4 h-4 text-indigo-400" />
              <span>Configurar Enlace de Videollamada (REQ-12.3)</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Ingresa el enlace de Google Meet, Discord, Jitsi o Zoom para que los jugadores puedan unirse con un clic.
            </p>
            <input
              type="text"
              value={videoInput}
              onChange={e => setVideoInput(e.target.value)}
              placeholder="https://meet.google.com/xyz-abcd-efg"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400 mb-4"
            />
            <div className="flex justify-end space-x-2 text-xs">
              <button
                onClick={() => setShowVideoModal(false)}
                className="px-3 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onAction('UPDATE_ROOM_SETTINGS', { videoCallUrl: videoInput.trim() });
                  setShowVideoModal(false);
                }}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow"
              >
                Guardar Enlace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
