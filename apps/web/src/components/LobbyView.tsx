import React, { useState } from 'react';
import { LogIn, PlusCircle, Shield, Sparkles, Users2, Dices } from 'lucide-react';

interface LobbyViewProps {
  onJoinRoom: (roomCode: string, playerName: string, isSpectator: boolean) => void;
  onCreateRoom: (data: {
    name: string;
    hostName: string;
    maxPlayers: number;
    startingLife: number;
  }) => Promise<void>;
  isCreating?: boolean;
}

export const LobbyView: React.FC<LobbyViewProps> = ({ onJoinRoom, onCreateRoom, isCreating }) => {
  const [tab, setTab] = useState<'create' | 'join'>('create');

  // Create Room Form State
  const [roomName, setRoomName] = useState('Noche de Commander EDH');
  const [hostName, setHostName] = useState('Planeswalker');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [startingLife, setStartingLife] = useState(40);

  // Join Room Form State
  const [joinCode, setJoinCode] = useState('');
  const [joinPlayerName, setJoinPlayerName] = useState('Invitado');
  const [isSpectator, setIsSpectator] = useState(false);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim() || !hostName.trim()) return;

    await onCreateRoom({
      name: roomName.trim(),
      hostName: hostName.trim(),
      maxPlayers,
      startingLife,
    });
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || !joinPlayerName.trim()) return;

    onJoinRoom(joinCode.trim().toUpperCase(), joinPlayerName.trim(), isSpectator);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-8 px-4">
      {/* Hero Title */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-amber-500/25 bg-amber-500/10 text-amber-300 text-xs font-semibold mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Mesa Multijugador Sincronizada</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-cinzel font-black tracking-tight text-zinc-100 uppercase">
          Mesa Virtual de Commander
        </h2>
        <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
          Sandbox multijugador con datos de Scryfall, control total de zonas, tiradas de iniciativa e interacción de campo.
        </p>
      </div>

      {/* Tabs Switcher */}
      <div className="flex bg-[#0b0f17] border border-zinc-800/80 p-1.5 rounded-2xl shadow-xl">
        <button
          onClick={() => setTab('create')}
          className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2.5 cursor-pointer ${
            tab === 'create'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 shadow-lg shadow-amber-500/25'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span className="tracking-wide uppercase font-cinzel text-xs font-bold">Crear Nueva Mesa</span>
        </button>
        <button
          onClick={() => setTab('join')}
          className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2.5 cursor-pointer ${
            tab === 'join'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 shadow-lg shadow-amber-500/25'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          <LogIn className="w-4 h-4" />
          <span className="tracking-wide uppercase font-cinzel text-xs font-bold">Unirse con Código</span>
        </button>
      </div>

      {/* Forms Card */}
      <div className="relative bg-[#0c101a]/90 border border-zinc-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl ring-1 ring-white/5">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-600/5 rounded-full blur-3xl pointer-events-none" />

        {tab === 'create' ? (
          <form onSubmit={handleCreateSubmit} className="space-y-5">
            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1.5 uppercase tracking-wider text-[11px]">
                Nombre de la Mesa
              </label>
              <input
                type="text"
                value={roomName}
                onChange={e => setRoomName(e.target.value)}
                required
                className="w-full bg-[#080b11] border border-zinc-800 focus:border-amber-400/80 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-all shadow-inner"
                placeholder="Ej. Pod Casual 4 Jugadores"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1.5 uppercase tracking-wider text-[11px]">
                Tu Nombre de Jugador
              </label>
              <input
                type="text"
                value={hostName}
                onChange={e => setHostName(e.target.value)}
                required
                className="w-full bg-[#080b11] border border-zinc-800 focus:border-amber-400/80 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-all shadow-inner"
                placeholder="Ej. Planeswalker 1"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1.5 uppercase tracking-wider text-[11px]">
                  Capacidad de Asientos
                </label>
                <div className="relative">
                  <select
                    value={maxPlayers}
                    onChange={e => setMaxPlayers(Number(e.target.value))}
                    className="w-full bg-[#080b11] border border-zinc-800 focus:border-amber-400/80 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none cursor-pointer appearance-none shadow-inner"
                  >
                    <option value={2}>2 Jugadores (Duelo 1v1)</option>
                    <option value={3}>3 Jugadores</option>
                    <option value={4}>4 Jugadores (Pod Estándar EDH)</option>
                    <option value={5}>5 Jugadores (Star / Casual)</option>
                    <option value={6}>6 Jugadores (Partida Grande)</option>
                  </select>
                  <Users2 className="w-4 h-4 text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1.5 uppercase tracking-wider text-[11px]">
                  Total de Vidas Iniciales
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={startingLife}
                    onChange={e => setStartingLife(Number(e.target.value))}
                    className="w-full bg-[#080b11] border border-zinc-800 focus:border-amber-400/80 rounded-xl px-4 py-3 text-sm text-zinc-100 font-mono font-bold focus:outline-none shadow-inner"
                  />
                  <span className="text-xs text-zinc-500 font-medium absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    HP
                  </span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isCreating}
              className="w-full mt-4 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-black py-3.5 rounded-xl text-sm transition-all shadow-xl shadow-amber-500/20 active:scale-[0.98] disabled:opacity-50 cursor-pointer uppercase tracking-wider font-cinzel"
            >
              {isCreating ? 'Generando Sala...' : 'Crear Mesa de Juego'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoinSubmit} className="space-y-5">
            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1.5 uppercase tracking-wider text-[11px]">
                Código de la Mesa
              </label>
              <input
                type="text"
                maxLength={6}
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                required
                className="w-full bg-[#080b11] border border-zinc-800 focus:border-amber-400/80 rounded-xl px-4 py-3.5 text-center text-2xl font-mono font-black tracking-[0.3em] text-amber-300 uppercase focus:outline-none transition-all shadow-inner placeholder-zinc-700"
                placeholder="XXXXXX"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1.5 uppercase tracking-wider text-[11px]">
                Tu Nombre de Jugador
              </label>
              <input
                type="text"
                value={joinPlayerName}
                onChange={e => setJoinPlayerName(e.target.value)}
                required
                className="w-full bg-[#080b11] border border-zinc-800 focus:border-amber-400/80 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-all shadow-inner"
                placeholder="Ej. Planeswalker Invitado"
              />
            </div>

            <label className="flex items-center space-x-3 text-xs text-zinc-300 cursor-pointer pt-1 p-2 rounded-xl bg-zinc-900/40 border border-zinc-800/60">
              <input
                type="checkbox"
                checked={isSpectator}
                onChange={e => setIsSpectator(e.target.checked)}
                className="rounded border-zinc-700 text-amber-500 focus:ring-amber-400 w-4 h-4 cursor-pointer"
              />
              <span className="font-medium text-zinc-300">
                Unirse como Espectador (Modo Observador)
              </span>
            </label>

            <button
              type="submit"
              className="w-full mt-4 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-black py-3.5 rounded-xl text-sm transition-all shadow-xl shadow-amber-500/20 active:scale-[0.98] cursor-pointer uppercase tracking-wider font-cinzel"
            >
              Entrar a la Sala
            </button>
          </form>
        )}
      </div>

      {/* Feature Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        <div className="p-3.5 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 flex items-center space-x-3 text-left">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-zinc-200">Datos Oficiales</div>
            <div className="text-[11px] text-zinc-400">Base local Scryfall</div>
          </div>
        </div>
        <div className="p-3.5 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 flex items-center space-x-3 text-left">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Dices className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-zinc-200">Iniciativa d20</div>
            <div className="text-[11px] text-zinc-400">Desempate automático</div>
          </div>
        </div>
        <div className="p-3.5 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 flex items-center space-x-3 text-left">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Users2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-zinc-200">Sandbox Libre</div>
            <div className="text-[11px] text-zinc-400">Hasta 6 jugadores</div>
          </div>
        </div>
      </div>
    </div>
  );
};
