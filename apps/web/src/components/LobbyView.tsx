import React, { useState } from 'react';
import { LogIn, PlusCircle } from 'lucide-react';

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
    <div className="max-w-xl mx-auto space-y-6 py-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-white tracking-wide">
          Bienvenido a la Mesa Virtual de Commander
        </h2>
        <p className="text-xs text-slate-400">
          Crea una sala multijugador (2–6 asientos) o únete con un código existente.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-2xl">
        <button
          onClick={() => setTab('create')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
            tab === 'create'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>Crear Nueva Mesa</span>
        </button>
        <button
          onClick={() => setTab('join')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
            tab === 'join'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <LogIn className="w-4 h-4" />
          <span>Unirse con Código</span>
        </button>
      </div>

      {/* Forms */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
        {tab === 'create' ? (
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Nombre de la Mesa
              </label>
              <input
                type="text"
                value={roomName}
                onChange={e => setRoomName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 transition-colors"
                placeholder="Ej. Pod Casual 4 Jugadores"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Tu Apodo (Anfitrión)
              </label>
              <input
                type="text"
                value={hostName}
                onChange={e => setHostName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 transition-colors"
                placeholder="Ej. Planeswalker 1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Jugadores (2–6)
                </label>
                <select
                  value={maxPlayers}
                  onChange={e => setMaxPlayers(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                >
                  <option value={2}>2 Jugadores (1v1)</option>
                  <option value={3}>3 Jugadores</option>
                  <option value={4}>4 Jugadores (Pod Estándar)</option>
                  <option value={5}>5 Jugadores (Star/Casual)</option>
                  <option value={6}>6 Jugadores (2HG / Casual)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Vida Inicial
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={startingLife}
                  onChange={e => setStartingLife(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isCreating}
              className="w-full mt-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20 active:scale-98 disabled:opacity-50"
            >
              {isCreating ? 'Creando Mesa...' : 'Crear Mesa y Obtener Código'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoinSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Código de la Mesa (6 caracteres)
              </label>
              <input
                type="text"
                maxLength={6}
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-center text-lg font-mono font-bold tracking-widest text-amber-300 uppercase focus:outline-none focus:border-amber-400 transition-colors"
                placeholder="EJ: 5HQWNJ"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Tu Apodo</label>
              <input
                type="text"
                value={joinPlayerName}
                onChange={e => setJoinPlayerName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 transition-colors"
                placeholder="Ej. Jugador Invitado"
              />
            </div>

            <label className="flex items-center space-x-2.5 text-xs text-slate-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={isSpectator}
                onChange={e => setIsSpectator(e.target.checked)}
                className="rounded border-slate-700 text-amber-500 focus:ring-amber-400 w-4 h-4"
              />
              <span>Unirse como Espectador (sin ocupar asiento de juego)</span>
            </label>

            <button
              type="submit"
              className="w-full mt-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20 active:scale-98"
            >
              Entrar a la Mesa
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
