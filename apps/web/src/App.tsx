import { useState, useEffect } from 'react';
import { useGameSocket } from './hooks/useGameSocket';
import { LobbyView } from './components/LobbyView';
import { TableBoard } from './components/TableBoard';
import { LobbyWaitingRoom } from './components/LobbyWaitingRoom';
import { InitiativeOverlay } from './components/InitiativeOverlay';
import { OpeningHandModal } from './components/OpeningHandModal';
import { RevealedCardModal } from './components/RevealedCardModal';
import { DeckImporter } from './components/DeckImporter';
import { LegalModal } from './components/LegalModal';
import { RefreshCw, Layers, Users } from 'lucide-react';

export default function App() {
  const [roomCode, setRoomCode] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('mtgc_room_code') || null;
    }
    return null;
  });
  const [playerId, setPlayerId] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('Planeswalker');
  const [isSpectator, setIsSpectator] = useState<boolean>(false);
  const [activeMainTab, setActiveMainTab] = useState<'lobby' | 'importer'>('lobby');
  const [serverStatus, setServerStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [isCreatingRoom, setIsCreatingRoom] = useState<boolean>(false);
  const [isLegalOpen, setIsLegalOpen] = useState<boolean>(false);

  // Initialize or restore player ID
  useEffect(() => {
    let storedId = localStorage.getItem('mtgc_player_id');
    if (!storedId) {
      storedId = `p_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('mtgc_player_id', storedId);
    }
    setPlayerId(storedId);

    const storedName = localStorage.getItem('mtgc_player_name');
    if (storedName) {
      setPlayerName(storedName);
    }
  }, []);

  const checkHealth = async () => {
    try {
      const res = await fetch('/api/health');
      setServerStatus(res.ok ? 'online' : 'offline');
    } catch {
      setServerStatus('offline');
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  // Connect WebSocket when inside a room
  const { status, roomState, sendAction, remoteDraggingCards, revealedCard, dismissRevealedCard } = useGameSocket({
    roomCode: roomCode || '',
    playerId,
    playerName,
    isSpectator,
    enabled: !!roomCode,
  });

  const handleCreateRoom = async (data: {
    name: string;
    hostName: string;
    maxPlayers: number;
    startingLife: number;
  }) => {
    setIsCreatingRoom(true);
    try {
      localStorage.setItem('mtgc_player_name', data.hostName);
      setPlayerName(data.hostName);

      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          hostName: data.hostName,
          hostId: playerId,
          maxPlayers: data.maxPlayers,
          startingLife: data.startingLife,
        }),
      });

      if (res.ok) {
        const roomData = await res.json();
        setRoomCode(roomData.code);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('mtgc_room_code', roomData.code);
        }
        setIsSpectator(false);
      } else {
        alert('Error al crear la sala');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión con el servidor');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleJoinRoom = (code: string, name: string, spectator: boolean) => {
    localStorage.setItem('mtgc_player_name', name);
    setPlayerName(name);
    setIsSpectator(spectator);
    setRoomCode(code);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('mtgc_room_code', code);
    }
  };

  const handleLeaveRoom = () => {
    setRoomCode(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('mtgc_room_code');
    }
  };

  // Full-bleed game table view (REQ-22.1, REQ-22.2) — no page scroll, exactly 100dvh
  if (roomCode && roomState && roomState.status !== 'lobby') {
    return (
      <div className="fixed inset-0 w-screen h-[100dvh] overflow-hidden bg-black select-none">
        <TableBoard
          roomState={roomState}
          localPlayerId={playerId}
          connectionStatus={status}
          remoteDraggingCards={remoteDraggingCards}
          onAction={sendAction}
          onLeaveRoom={handleLeaveRoom}
        />
        {roomState.status === 'initiative' && (
          <InitiativeOverlay
            roomState={roomState}
            localPlayerId={playerId}
            onAction={sendAction}
          />
        )}
        {roomState.status === 'mulligan' && (
          <OpeningHandModal
            roomState={roomState}
            localPlayerId={playerId}
            onAction={sendAction}
          />
        )}
        {revealedCard && (
          <RevealedCardModal
            revealed={revealedCard}
            localPlayerId={playerId}
            onClose={dismissRevealedCard}
          />
        )}
        <LegalModal isOpen={isLegalOpen} onClose={() => setIsLegalOpen(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center font-black text-slate-950 text-sm shadow-lg shadow-amber-500/20">
              MTG
            </div>
            <div>
              <h1 className="font-extrabold text-base leading-tight tracking-wide text-white">
                Mesa Virtual de Commander
              </h1>
              <p className="text-[11px] text-slate-400">Sandbox multijugador en tiempo real</p>
            </div>
          </div>

          {!roomCode && (
            <nav className="flex space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveMainTab('lobby')}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeMainTab === 'lobby'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Salas y Lobby</span>
              </button>
              <button
                onClick={() => setActiveMainTab('importer')}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeMainTab === 'importer'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Validador de Mazos</span>
              </button>
            </nav>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-xs px-3 py-1 rounded-full bg-slate-800 border border-slate-700">
            <span
              className={`w-2 h-2 rounded-full ${
                serverStatus === 'online'
                  ? 'bg-emerald-400 animate-pulse'
                  : serverStatus === 'offline'
                    ? 'bg-rose-500'
                    : 'bg-amber-400'
              }`}
            />
            <span className="text-[11px] text-slate-300">
              {serverStatus === 'online'
                ? 'Servidor en línea'
                : serverStatus === 'offline'
                  ? 'Servidor desconectado'
                  : 'Verificando...'}
            </span>
            <button
              onClick={checkHealth}
              title="Reverificar servidor"
              className="text-slate-400 hover:text-white transition-colors ml-1"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-4 max-w-7xl w-full mx-auto overflow-hidden">
        {roomCode && roomState ? (
          <LobbyWaitingRoom
            roomState={roomState}
            localPlayerId={playerId}
            onAction={sendAction}
            onLeaveRoom={handleLeaveRoom}
          />
        ) : activeMainTab === 'importer' ? (
          <div className="py-4">
            <DeckImporter />
          </div>
        ) : (
          <LobbyView
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            isCreating={isCreatingRoom}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 px-6 py-2.5 flex items-center justify-between text-[11px] text-slate-500">
        <div>
          Mesa Virtual de Commander &bull; No oficial, sin afiliación con Wizards of the Coast
          &bull; Scryfall API
        </div>
        <button
          onClick={() => setIsLegalOpen(true)}
          className="text-slate-400 hover:text-amber-400 underline transition-colors"
        >
          Avisos Legales y Privacidad
        </button>
      </footer>

      {revealedCard && (
        <RevealedCardModal
          revealed={revealedCard}
          localPlayerId={playerId}
          onClose={dismissRevealedCard}
        />
      )}
      <LegalModal isOpen={isLegalOpen} onClose={() => setIsLegalOpen(false)} />
    </div>
  );
}
