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
import { RefreshCw, Layers } from 'lucide-react';

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
  const [isImporterOpen, setIsImporterOpen] = useState<boolean>(false);
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
        {/* Deck Importer Modal Popup */}
      {isImporterOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsImporterOpen(false)}
        >
          <div
            className="w-full max-w-5xl"
            onClick={e => e.stopPropagation()}
          >
            <DeckImporter onClose={() => setIsImporterOpen(false)} />
          </div>
        </div>
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
    <div className="min-h-screen bg-[#051316] text-zinc-100 flex flex-col font-sans select-none relative overflow-x-hidden selection:bg-[#2A835F]/40 selection:text-white">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(42,131,95,0.18),transparent)] z-0" />
      <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(to_right,rgba(139,187,146,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(139,187,146,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] z-0" />

      {/* Top Header */}
      <header className="relative z-10 border-b border-[#12544F] bg-[#092328] px-6 py-3.5 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-3 group cursor-default">
            <div className="w-8 h-8 rounded-lg bg-[#2A835F] flex items-center justify-center text-white shadow-md shadow-[#2A835F]/20">
              <i className="ms ms-planeswalker text-lg font-black" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-sans font-extrabold text-sm tracking-tight text-white uppercase">
                  MTG Commander Sandbox
                </h1>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-[#2A835F]/40 bg-[#12544F] text-[#8BBB92] tracking-wider">
                  EDH
                </span>
              </div>
              <p className="text-[11px] text-[#8BBB92]/80 font-medium">Mesa Multijugador Sincronizada</p>
            </div>
          </div>

          {!roomCode && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsImporterOpen(true)}
                className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#12544F] hover:bg-[#18645e] text-zinc-100 hover:text-white border border-[#12544F] transition-all cursor-pointer shadow-sm"
              >
                <Layers className="w-3.5 h-3.5 text-[#8BBB92]" />
                <span>Validador de Mazos</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {/* Mana Colors Bar */}
          <div className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#0c2d32] border border-[#12544F] text-xs text-zinc-300">
            <i className="ms ms-w ms-cost text-[13px]" title="White" />
            <i className="ms ms-u ms-cost text-[13px]" title="Blue" />
            <i className="ms ms-b ms-cost text-[13px]" title="Black" />
            <i className="ms ms-r ms-cost text-[13px]" title="Red" />
            <i className="ms ms-g ms-cost text-[13px]" title="Green" />
          </div>

          <div className="flex items-center space-x-2 text-xs px-3 py-1.5 rounded-lg bg-[#0c2d32] border border-[#12544F]">
            <span
              className={`w-2 h-2 rounded-full ${
                serverStatus === 'online'
                  ? 'bg-emerald-400 ring-2 ring-emerald-500/20'
                  : serverStatus === 'offline'
                    ? 'bg-rose-500'
                    : 'bg-amber-400'
              }`}
            />
            <span className="text-[11px] font-medium text-zinc-300">
              {serverStatus === 'online'
                ? 'Servidor en línea'
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
      <main className="flex-1 p-4 max-w-7xl w-full mx-auto">
        <CardPreviewProvider>
          {roomCode && roomState ? (
            <LobbyWaitingRoom
              roomState={roomState}
              localPlayerId={playerId}
              onAction={sendAction}
              onLeaveRoom={handleLeaveRoom}
            />
          ) : (
            <LobbyView
              onCreateRoom={handleCreateRoom}
              onJoinRoom={handleJoinRoom}
              isCreating={isCreatingRoom}
              onNavigateToImporter={() => setIsImporterOpen(true)}
            />
          )}
        </CardPreviewProvider>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#12544F] bg-[#092328] px-6 py-3.5 flex items-center justify-between text-[11px] text-zinc-400">
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
            className="text-zinc-400 hover:text-[#8BBB92] transition-colors cursor-pointer"
          >
            Glifos Mana &amp; Keyrune
          </button>
          <button
            type="button"
            onClick={() => setIsLegalOpen(true)}
            className="text-zinc-400 hover:text-[#8BBB92] transition-colors cursor-pointer"
          >
            Avisos Legales
          </button>
        </div>
      </footer>

      {/* Deck Importer Modal Popup */}
      {isImporterOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsImporterOpen(false)}
        >
          <div
            className="w-full max-w-5xl"
            onClick={e => e.stopPropagation()}
          >
            <DeckImporter onClose={() => setIsImporterOpen(false)} />
          </div>
        </div>
      )}

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
