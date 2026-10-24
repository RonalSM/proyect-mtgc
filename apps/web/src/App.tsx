import { useState, useEffect } from 'react';
import { useGameSocket } from './hooks/useGameSocket';
import { LobbyView } from './components/LobbyView';
import { TableBoard } from './components/TableBoard';
import { CardPreviewProvider } from './context/CardPreviewContext';
import { LobbyWaitingRoom } from './components/LobbyWaitingRoom';
import { InitiativeOverlay } from './components/InitiativeOverlay';
import { OpeningHandModal } from './components/OpeningHandModal';
import { RevealedCardModal } from './components/RevealedCardModal';
import { DeckImporter } from './components/DeckImporter';
import { LegalModal } from './components/LegalModal';
import { FontGlyphsAudit } from './components/FontGlyphsAudit';
import { DiagnosticPanel } from './components/DiagnosticPanel';
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
  const [isFontAuditOpen, setIsFontAuditOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return (
        params.has('test-font-glyphs') ||
        params.get('test') === 'font-glyphs' ||
        params.get('debug') === 'icons'
      );
    }
    return false;
  });

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
  const { status, roomState, sendAction, remoteDraggingCards, revealedCard, dismissRevealedCard } =
    useGameSocket({
      roomCode: roomCode || '',
      playerId,
      playerName,
      isSpectator,
      enabled: !!roomCode,
    });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__mtgcSendAction = sendAction;
      (window as any).__mtgcRoomState = roomState;
    }
  }, [sendAction, roomState]);

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
          <InitiativeOverlay roomState={roomState} localPlayerId={playerId} onAction={sendAction} />
        )}
        {roomState.status === 'mulligan' && (
          <OpeningHandModal roomState={roomState} localPlayerId={playerId} onAction={sendAction} />
        )}
        {revealedCard && (
          <RevealedCardModal
            revealed={revealedCard}
            localPlayerId={playerId}
            onClose={dismissRevealedCard}
          />
        )}
        <LegalModal isOpen={isLegalOpen} onClose={() => setIsLegalOpen(false)} />
        <DiagnosticPanel />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-zinc-100 flex flex-col font-sans select-none relative overflow-x-hidden selection:bg-amber-500/20 selection:text-amber-200">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(226,179,74,0.12),transparent)] z-0" />
      <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] z-0" />

      {/* Top Header */}
      <header className="relative z-10 border-b border-zinc-800/80 bg-[#0b0f17]/80 backdrop-blur-xl px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-3.5 group cursor-default">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 p-[1px] shadow-lg shadow-amber-500/15">
              <div className="w-full h-full bg-[#0b0f17] rounded-[11px] flex items-center justify-center">
                <i className="ms ms-planeswalker text-amber-400 text-lg group-hover:scale-110 transition-transform duration-200" aria-hidden="true" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-cinzel font-bold text-sm tracking-widest text-zinc-100 uppercase">
                  Mesa Virtual MTG
                </h1>
                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-300 tracking-wider">
                  EDH
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-medium">Commander Sandbox Multijugador</p>
            </div>
          </div>

          {!roomCode && (
            <nav className="flex space-x-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800/80 shadow-inner">
              <button
                onClick={() => setActiveMainTab('lobby')}
                className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeMainTab === 'lobby'
                    ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/20'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Salas y Mesas</span>
              </button>
              <button
                onClick={() => setActiveMainTab('importer')}
                className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeMainTab === 'importer'
                    ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/20'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Validador de Mazos</span>
              </button>
            </nav>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {/* Mana Colors Bar */}
          <div className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-zinc-900/70 border border-zinc-800/80 text-xs text-zinc-400">
            <i className="ms ms-w ms-cost text-[13px]" title="White" />
            <i className="ms ms-u ms-cost text-[13px]" title="Blue" />
            <i className="ms ms-b ms-cost text-[13px]" title="Black" />
            <i className="ms ms-r ms-cost text-[13px]" title="Red" />
            <i className="ms ms-g ms-cost text-[13px]" title="Green" />
          </div>

          <div className="flex items-center space-x-2 text-xs px-3 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800/90 shadow-sm">
            <span
              className={`w-2 h-2 rounded-full ${
                serverStatus === 'online'
                  ? 'bg-emerald-400 ring-2 ring-emerald-500/20 animate-pulse'
                  : serverStatus === 'offline'
                    ? 'bg-rose-500'
                    : 'bg-amber-400'
              }`}
            />
            <span className="text-[11px] font-medium text-zinc-300">
              {serverStatus === 'online'
                ? 'En línea'
                : serverStatus === 'offline'
                  ? 'Desconectado'
                  : 'Comprobando...'}
            </span>
            <button
              onClick={checkHealth}
              title="Reverificar servidor"
              className="text-zinc-400 hover:text-zinc-200 transition-colors ml-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </header>

      {/* Banner de Reconexión WebSocket (Punto 16) */}
      {status === 'reconnecting' && (
        <div
          data-testid="ws-reconnecting-banner"
          className="fixed top-2 left-1/2 -translate-x-1/2 z-[200] bg-amber-500 text-slate-950 font-bold px-4 py-1.5 rounded-full shadow-2xl flex items-center space-x-2 text-xs animate-pulse border border-amber-400"
        >
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Reconectando a la sala de juego...</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 p-4 max-w-7xl w-full mx-auto overflow-hidden">
        <CardPreviewProvider>
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
        </CardPreviewProvider>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-800/80 bg-[#07090e]/90 backdrop-blur px-6 py-3 flex items-center justify-between text-[11px] text-zinc-500">
        <div className="flex items-center space-x-2">
          <span>MTG Commander Tabletop</span>
          <span>&bull;</span>
          <span>No afiliado a WotC</span>
          <span>&bull;</span>
          <span>Scryfall API</span>
          <span>&bull;</span>
          <span>Mana &amp; Keyrune (OFL 1.1)</span>
        </div>
        <div className="flex items-center space-x-4">
          <button
            type="button"
            data-testid="open-font-glyphs-audit-btn"
            onClick={() => setIsFontAuditOpen(true)}
            className="text-zinc-400 hover:text-amber-300 transition-colors cursor-pointer"
          >
            Glifos Mana &amp; Keyrune
          </button>
          <button
            type="button"
            onClick={() => setIsLegalOpen(true)}
            className="text-zinc-400 hover:text-amber-300 transition-colors cursor-pointer"
          >
            Avisos Legales
          </button>
        </div>
      </footer>

      {revealedCard && (
        <RevealedCardModal
          revealed={revealedCard}
          localPlayerId={playerId}
          onClose={dismissRevealedCard}
        />
      )}
      <LegalModal isOpen={isLegalOpen} onClose={() => setIsLegalOpen(false)} />
      {isFontAuditOpen && <FontGlyphsAudit onClose={() => setIsFontAuditOpen(false)} />}
      <DiagnosticPanel />
    </div>
  );
}
