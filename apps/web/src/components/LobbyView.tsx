import React, { useState, useEffect } from 'react';
import {
  Plus,
  ArrowRight,
  Layers,
  BookOpen,
  Keyboard,
  Crown,
  Play,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { useCardPreview } from '../context/CardPreviewContext';

interface LobbyViewProps {
  onJoinRoom: (roomCode: string, playerName: string, isSpectator: boolean) => void;
  onCreateRoom: (data: {
    name: string;
    hostName: string;
    maxPlayers: number;
    startingLife: number;
  }) => Promise<void>;
  isCreating?: boolean;
  onNavigateToImporter?: () => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  onJoinRoom,
  onCreateRoom,
  isCreating,
  onNavigateToImporter,
}) => {
  const [modalMode, setModalMode] = useState<'none' | 'create' | 'join'>('none');
  const [presets, setPresets] = useState<any[]>([]);
  const [_isLoadingPresets, setIsLoadingPresets] = useState(false);
  const [selectedPresetForView, setSelectedPresetForView] = useState<any | null>(null);

  // Form states
  const [roomName, setRoomName] = useState('Pod de Commander');
  const [hostName, setHostName] = useState(() => localStorage.getItem('mtgc_player_name') || 'Planeswalker');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [startingLife, setStartingLife] = useState(40);

  const [joinCode, setJoinCode] = useState('');
  const [joinPlayerName, setJoinPlayerName] = useState(() => localStorage.getItem('mtgc_player_name') || 'Planeswalker');
  const [isSpectator, setIsSpectator] = useState(false);

  const { openCardDetails } = useCardPreview();

  // Load preset commander decks
  useEffect(() => {
    let isMounted = true;
    setIsLoadingPresets(true);
    fetch('/api/decks/presets')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (isMounted && data?.presets) {
          setPresets(data.presets);
          if (data.presets.length > 0) {
            setSelectedPresetForView(data.presets[0]);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoadingPresets(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim() || !hostName.trim()) return;
    localStorage.setItem('mtgc_player_name', hostName.trim());
    await onCreateRoom({
      name: roomName.trim(),
      hostName: hostName.trim(),
      maxPlayers,
      startingLife,
    });
    setModalMode('none');
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || !joinPlayerName.trim()) return;
    localStorage.setItem('mtgc_player_name', joinPlayerName.trim());
    onJoinRoom(joinCode.trim().toUpperCase(), joinPlayerName.trim(), isSpectator);
    setModalMode('none');
  };

  const manaColorsMap: Record<string, { bg: string; text: string; border: string }> = {
    W: { bg: 'bg-[#f8f6d8]/10', text: 'text-[#fbf9e3]', border: 'border-[#e6e2b8]/30' },
    U: { bg: 'bg-[#0e68ab]/15', text: 'text-[#60b6f5]', border: 'border-[#1b82cc]/30' },
    B: { bg: 'bg-[#15121b]/40', text: 'text-[#b8a9c9]', border: 'border-[#433b52]/40' },
    R: { bg: 'bg-[#d32a1d]/15', text: 'text-[#f87171]', border: 'border-[#e04538]/30' },
    G: { bg: 'bg-[#00733e]/15', text: 'text-[#4ade80]', border: 'border-[#169958]/30' },
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-10 py-6 px-4 sm:px-6">
      {/* 1. HERO / LAUNCHER BANNER */}
      <section className="relative rounded-2xl bg-[#11141c] border border-[#232836] p-7 sm:p-10 overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-[#1a202c] border border-[#2d3748] text-amber-400 text-xs font-semibold">
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Simulador Multijugador MTG Commander (EDH)</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Centro de Operaciones y Mesas Virtuales
            </h1>
            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
              Juega Commander en tiempo real con datos canónicos de Scryfall. Sincronización completa de biblioteca, mano, cementerio, comandante, contadores e iniciativa.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => setModalMode('create')}
              className="inline-flex items-center justify-center space-x-2.5 px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-bold text-sm tracking-wide transition-all shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Crear Nueva Mesa</span>
            </button>
            <button
              type="button"
              onClick={() => setModalMode('join')}
              className="inline-flex items-center justify-center space-x-2.5 px-6 py-3.5 rounded-xl bg-[#1a202c] hover:bg-[#232a3b] border border-[#2f384a] text-zinc-100 font-bold text-sm transition-all cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              <span>Unirse con Código</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. MAIN HUB GRID: PRESETS EXPLORER + QUICK TOOLS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Preset Decks Showcase */}
        <section className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between border-b border-[#232836] pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <h2 className="text-lg font-bold text-white tracking-wide">
                Mazos de Commander Listos para la Mesa
              </h2>
            </div>
            <span className="text-xs text-zinc-400 font-mono">
              {presets.length} Mazos Oficiales
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {presets.map(deck => {
              const isSelected = selectedPresetForView?.id === deck.id;
              const colors: string[] = deck.colorIdentity || [];

              return (
                <div
                  key={deck.id}
                  onClick={() => setSelectedPresetForView(deck)}
                  className={`group relative rounded-xl bg-[#11141c] border transition-all cursor-pointer overflow-hidden p-4 flex flex-col justify-between space-y-3.5 ${
                    isSelected
                      ? 'border-amber-400/80 ring-1 ring-amber-400/40 bg-[#141924]'
                      : 'border-[#232836] hover:border-[#384156] hover:bg-[#131722]'
                  }`}
                >
                  {/* Subtle Art Background Header */}
                  {deck.commanderImageUrl && (
                    <div
                      className="absolute inset-x-0 top-0 h-28 bg-cover bg-center opacity-25 group-hover:opacity-35 transition-opacity"
                      style={{ backgroundImage: `url(${deck.commanderImageUrl})` }}
                    />
                  )}
                  <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-transparent to-[#11141c]" />

                  {/* Header Details */}
                  <div className="relative z-10 space-y-1 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                        100 Cartas &bull; EDH
                      </span>
                      <div className="flex items-center space-x-1">
                        {colors.length > 0 ? (
                          colors.map(c => {
                            const conf = manaColorsMap[c] || {
                              bg: 'bg-zinc-800',
                              text: 'text-zinc-300',
                              border: 'border-zinc-700',
                            };
                            return (
                              <span
                                key={c}
                                className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] font-mono border ${conf.bg} ${conf.text} ${conf.border}`}
                              >
                                {c}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700">
                            C
                          </span>
                        )}
                      </div>
                    </div>
                    <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                      {deck.name}
                    </h3>
                  </div>

                  {/* Commander & Action */}
                  <div className="relative z-10 pt-2 border-t border-[#1f2430] flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2 min-w-0">
                      <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="text-zinc-300 font-medium truncate">{deck.commanderName}</span>
                    </div>

                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        // Open commander card detail modal
                        if (deck.commanderCards?.[0]) {
                          openCardDetails(deck.commanderCards[0]);
                        }
                      }}
                      className="text-zinc-400 hover:text-white px-2 py-1 rounded bg-[#1c2230] border border-[#2b3548] text-[11px] font-semibold transition-colors"
                    >
                      Ver Comandante
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Right Column: Deck Details & Quick Access Tools */}
        <section className="lg:col-span-4 space-y-6">
          {/* Selected Deck Card Preview */}
          <div className="rounded-2xl bg-[#11141c] border border-[#232836] p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#232836] pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>Mazo Seleccionado</span>
              </h3>
              <span className="text-xs text-zinc-400 font-mono">Vista Rápida</span>
            </div>

            {selectedPresetForView ? (
              <div className="space-y-4">
                {selectedPresetForView.commanderImageUrl && (
                  <div className="relative rounded-xl overflow-hidden aspect-[16/9] border border-[#2b3345] bg-[#090b10] shadow-inner">
                    <img
                      src={selectedPresetForView.commanderImageUrl}
                      alt={selectedPresetForView.commanderName}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#11141c] via-transparent to-transparent" />
                    <div className="absolute bottom-2 left-3 right-3 text-white font-bold text-sm truncate">
                      {selectedPresetForView.commanderName}
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <div className="text-xs text-zinc-400">Estrategia del mazo:</div>
                  <div className="text-sm font-semibold text-zinc-200">
                    {selectedPresetForView.name}
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRoomName(`Mesa ${selectedPresetForView.name}`);
                      setModalMode('create');
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs tracking-wide uppercase transition-all shadow-md cursor-pointer flex items-center justify-center space-x-2"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Jugar con este Mazo</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-zinc-500">
                Selecciona un mazo de la izquierda para ver sus detalles.
              </div>
            )}
          </div>

          {/* Quick Hub Tools */}
          <div className="rounded-2xl bg-[#11141c] border border-[#232836] p-5 space-y-3">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
              Herramientas de Juego
            </h3>

            {onNavigateToImporter && (
              <button
                type="button"
                onClick={onNavigateToImporter}
                className="w-full text-left p-3 rounded-xl bg-[#161a24] hover:bg-[#1d2331] border border-[#252c3c] transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-[#202738] text-amber-400">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                      Validador e Importador
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Pega tu lista de Moxfield, Archidekt o texto plano
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-200 transition-colors" />
              </button>
            )}

            <div className="p-3.5 rounded-xl bg-[#141822] border border-[#202636] space-y-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-zinc-200">
                <Keyboard className="w-4 h-4 text-amber-400" />
                <span>Atajos Esenciales de la Mesa</span>
              </div>
              <ul className="text-[11px] text-zinc-400 space-y-1 font-mono">
                <li><strong className="text-zinc-300">Doble clic</strong>: Girar / Enderezar carta</li>
                <li><strong className="text-zinc-300">Clic derecho</strong>: Menú contextual completo</li>
                <li><strong className="text-zinc-300">Espacio</strong>: Pasar el turno activo</li>
                <li><strong className="text-zinc-300">D</strong>: Robar una carta de biblioteca</li>
              </ul>
            </div>
          </div>
        </section>
      </div>

      {/* 3. MODAL: CREAR NUEVA MESA */}
      {modalMode === 'create' && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setModalMode('none')}
        >
          <div
            className="w-full max-w-lg bg-[#11141c] border border-[#2b3345] rounded-2xl p-6 sm:p-7 shadow-2xl space-y-6 text-white"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#232836] pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">Crear Mesa de Commander</h3>
                <p className="text-xs text-zinc-400">Configura la partida para ti y tus compañeros</p>
              </div>
              <button
                type="button"
                onClick={() => setModalMode('none')}
                className="text-zinc-400 hover:text-white text-xs font-bold px-2 py-1 rounded bg-[#1c2230]"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5 uppercase tracking-wider">
                  Nombre de la Mesa
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={e => setRoomName(e.target.value)}
                  required
                  placeholder="Ej. Pod de Viernes por la Noche"
                  className="w-full bg-[#0a0d14] border border-[#2a3244] focus:border-amber-400 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5 uppercase tracking-wider">
                  Tu Nombre de Jugador
                </label>
                <input
                  type="text"
                  value={hostName}
                  onChange={e => setHostName(e.target.value)}
                  required
                  placeholder="Ej. Planeswalker 1"
                  className="w-full bg-[#0a0d14] border border-[#2a3244] focus:border-amber-400 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5 uppercase tracking-wider">
                    Asientos
                  </label>
                  <select
                    value={maxPlayers}
                    onChange={e => setMaxPlayers(Number(e.target.value))}
                    className="w-full bg-[#0a0d14] border border-[#2a3244] focus:border-amber-400 rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none"
                  >
                    <option value={2}>2 Jugadores (1v1)</option>
                    <option value={3}>3 Jugadores</option>
                    <option value={4}>4 Jugadores (Estándar EDH)</option>
                    <option value={5}>5 Jugadores</option>
                    <option value={6}>6 Jugadores</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5 uppercase tracking-wider">
                    Vidas Iniciales
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={startingLife}
                    onChange={e => setStartingLife(Number(e.target.value))}
                    className="w-full bg-[#0a0d14] border border-[#2a3244] focus:border-amber-400 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setModalMode('none')}
                  className="px-4 py-2.5 rounded-xl bg-[#1c2230] hover:bg-[#252d3f] text-zinc-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 text-xs font-bold tracking-wide uppercase transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isCreating ? 'Creando Mesa...' : 'Crear y Abrir Sala'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. MODAL: UNIRSE CON CÓDIGO */}
      {modalMode === 'join' && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setModalMode('none')}
        >
          <div
            className="w-full max-w-md bg-[#11141c] border border-[#2b3345] rounded-2xl p-6 sm:p-7 shadow-2xl space-y-6 text-white"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#232836] pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">Unirse a una Mesa</h3>
                <p className="text-xs text-zinc-400">Ingresa el código de 6 caracteres</p>
              </div>
              <button
                type="button"
                onClick={() => setModalMode('none')}
                className="text-zinc-400 hover:text-white text-xs font-bold px-2 py-1 rounded bg-[#1c2230]"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5 uppercase tracking-wider text-center">
                  Código de la Mesa
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  required
                  placeholder="ABCDEF"
                  className="w-full bg-[#0a0d14] border border-[#2a3244] focus:border-amber-400 rounded-xl px-4 py-3 text-center text-2xl font-mono font-bold tracking-[0.25em] text-amber-300 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5 uppercase tracking-wider">
                  Tu Nombre de Jugador
                </label>
                <input
                  type="text"
                  value={joinPlayerName}
                  onChange={e => setJoinPlayerName(e.target.value)}
                  required
                  placeholder="Ej. Planeswalker 2"
                  className="w-full bg-[#0a0d14] border border-[#2a3244] focus:border-amber-400 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="spectatorCheck"
                  checked={isSpectator}
                  onChange={e => setIsSpectator(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#0a0d14] border-[#2a3244] text-amber-500 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="spectatorCheck" className="text-xs text-zinc-300 cursor-pointer">
                  Entrar como Espectador (solo ver y chatear)
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setModalMode('none')}
                  className="px-4 py-2.5 rounded-xl bg-[#1c2230] hover:bg-[#252d3f] text-zinc-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 text-xs font-bold tracking-wide uppercase transition-all shadow-md cursor-pointer"
                >
                  Entrar a la Sala
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
