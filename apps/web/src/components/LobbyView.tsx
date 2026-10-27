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
  Eye,
} from 'lucide-react';
import { useCardPreview } from '../context/CardPreviewContext';
import { MtgSymbolIcon } from '../utils/mana-icons';
import { DeckInspectorModal, ManaCostRenderer } from './DeckInspectorModal';

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
  const [inspectedDeck, setInspectedDeck] = useState<any | null>(null);

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

  return (
    <div className="w-full max-w-7xl mx-auto space-y-10 py-6 px-4 sm:px-6">
      {/* 1. HERO / LAUNCHER BANNER */}
      <section className="relative rounded-2xl bg-[#092328] border border-[#12544F] p-7 sm:p-10 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#2A835F]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-[#0c2d32] border border-[#12544F] text-[#8BBB92] text-xs font-semibold">
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
              className="inline-flex items-center justify-center space-x-2.5 px-6 py-3.5 rounded-xl bg-[#2A835F] hover:bg-[#349e73] active:bg-[#237050] text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-[#2A835F]/25 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Crear Nueva Mesa</span>
            </button>
            <button
              type="button"
              onClick={() => setModalMode('join')}
              className="inline-flex items-center justify-center space-x-2.5 px-6 py-3.5 rounded-xl bg-[#12544F] hover:bg-[#18645e] border border-[#2A835F]/40 text-white font-bold text-sm transition-all cursor-pointer shadow-md"
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
          <div className="flex items-center justify-between border-b border-[#12544F] pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#8BBB92]" />
              <h2 className="text-lg font-bold text-white tracking-wide">
                Mazos de Commander Listos para la Mesa
              </h2>
            </div>
            <span className="text-xs text-[#8BBB92] font-mono">
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
                  className={`group relative rounded-xl bg-[#092328] border transition-all cursor-pointer overflow-hidden p-4 flex flex-col justify-between space-y-3.5 ${
                    isSelected
                      ? 'border-[#8BBB92] ring-1 ring-[#8BBB92]/50 bg-[#0c2d32]'
                      : 'border-[#12544F] hover:border-[#2A835F]/60 hover:bg-[#0c2d32]/70'
                  }`}
                >
                  {/* Subtle Art Background Header */}
                  {deck.commanderImageUrl && (
                    <div
                      className="absolute inset-x-0 top-0 h-28 bg-cover bg-center opacity-25 group-hover:opacity-35 transition-opacity"
                      style={{ backgroundImage: `url(${deck.commanderImageUrl})` }}
                    />
                  )}
                  <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-transparent to-[#092328]" />

                  {/* Header Details */}
                  <div className="relative z-10 space-y-1 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-[#8BBB92] uppercase tracking-wider">
                        100 Cartas &bull; EDH
                      </span>
                      <div className="flex items-center space-x-1">
                        {colors.length > 0 ? (
                          colors.map(c => (
                            <MtgSymbolIcon key={c} symbol={c} size="sm" />
                          ))
                        ) : (
                          <MtgSymbolIcon symbol="c" size="sm" />
                        )}
                      </div>
                    </div>
                    <h3 className="text-base font-bold text-white group-hover:text-[#8BBB92] transition-colors">
                      {deck.name}
                    </h3>
                  </div>

                  {/* Commander & Action */}
                  <div className="relative z-10 pt-2 border-t border-[#12544F] flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2 min-w-0">
                      <Crown className="w-3.5 h-3.5 text-[#8BBB92] shrink-0" />
                      <span className="text-zinc-300 font-medium truncate">{deck.commanderName}</span>
                    </div>

                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        setInspectedDeck(deck);
                      }}
                      className="inline-flex items-center space-x-1.5 text-zinc-200 hover:text-white px-2.5 py-1 rounded-lg bg-[#12544F] hover:bg-[#18645e] border border-[#2A835F]/40 text-[11px] font-semibold transition-all shadow-sm cursor-pointer"
                    >
                      <BookOpen className="w-3 h-3 text-[#8BBB92]" />
                      <span>Ver Mazo</span>
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
          <div className="rounded-2xl bg-[#092328] border border-[#12544F] p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#12544F] pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-[#8BBB92]" />
                <span>Mazo Seleccionado</span>
              </h3>
              <span className="text-xs text-[#8BBB92] font-mono">Vista Rápida</span>
            </div>

            {selectedPresetForView ? (
              <div className="space-y-3.5">
                {/* Full MTG Card Display (Aspect 63/88) */}
                {(() => {
                  const cmdrCard = selectedPresetForView.commanderCards?.[0];
                  const fullCardImage =
                    cmdrCard?.imageUrlNormal ||
                    cmdrCard?.imageUrlLarge ||
                    selectedPresetForView.commanderImageUrl;

                  return (
                    <div className="space-y-3">
                      <div
                        onClick={() => {
                          if (cmdrCard) openCardDetails(cmdrCard);
                        }}
                        className="group relative cursor-pointer mx-auto w-full max-w-[260px] aspect-[63/88] rounded-2xl overflow-hidden shadow-2xl border-2 border-[#12544F] hover:border-[#8BBB92] transition-all bg-[#040d0f]"
                        title="Haz clic para inspeccionar el comandante en grande con reglas y detalles"
                      >
                        {fullCardImage ? (
                          <img
                            src={fullCardImage}
                            alt={selectedPresetForView.commanderName || 'Comandante'}
                            className="w-full h-full object-contain select-none transition-transform duration-300 group-hover:scale-[1.02]"
                            loading="eager"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-zinc-500">
                            <Crown className="w-10 h-10 text-[#12544F] mb-2" />
                            <span className="font-bold text-xs text-zinc-300">
                              {selectedPresetForView.commanderName}
                            </span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-3">
                          <span className="px-3 py-1.5 rounded-lg bg-[#092328]/95 border border-[#8BBB92] text-xs font-bold text-white shadow-xl flex items-center space-x-1.5">
                            <Eye className="w-3.5 h-3.5 text-[#8BBB92]" />
                            <span>Ampliar Detalles</span>
                          </span>
                        </div>
                      </div>

                      {/* Commander Name, Cost & Stats */}
                      <div className="space-y-2 pt-1">
                        <div className="flex items-start justify-between gap-2 border-b border-[#12544F] pb-2">
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-sm text-white truncate">
                              {selectedPresetForView.commanderName}
                            </h4>
                            <p className="text-[11px] text-zinc-400 truncate">
                              {cmdrCard?.typeLine || 'Criatura Legendaria'}
                            </p>
                          </div>
                          <div className="flex items-center space-x-1 shrink-0">
                            <ManaCostRenderer cost={cmdrCard?.manaCost} size="sm" />
                            {cmdrCard?.power !== undefined && cmdrCard?.toughness !== undefined && (
                              <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-[#12544F] text-[#8BBB92] border border-[#2A835F]/40 ml-1">
                                {cmdrCard.power}/{cmdrCard.toughness}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Color Identity */}
                        <div className="flex items-center justify-between text-xs py-0.5">
                          <span className="text-[11px] text-zinc-400">Identidad de Color:</span>
                          <div className="flex items-center space-x-1">
                            {selectedPresetForView.colorIdentity &&
                            selectedPresetForView.colorIdentity.length > 0 ? (
                              selectedPresetForView.colorIdentity.map((c: string) => (
                                <MtgSymbolIcon key={c} symbol={c} size="sm" />
                              ))
                            ) : (
                              <MtgSymbolIcon symbol="c" size="sm" />
                            )}
                          </div>
                        </div>

                        {/* Oracle Rules Text */}
                        {cmdrCard?.oracleText && (
                          <div className="rounded-xl bg-[#0c2d32] border border-[#12544F] p-3 text-xs text-zinc-200 leading-relaxed font-sans max-h-36 overflow-y-auto pr-1">
                            {cmdrCard.oracleText}
                          </div>
                        )}

                        <div className="text-xs text-zinc-400 pt-0.5">
                          Estrategia:{' '}
                          <span className="font-semibold text-zinc-200">
                            {selectedPresetForView.name}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRoomName(`Mesa ${selectedPresetForView.name}`);
                      setModalMode('create');
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#2A835F] hover:bg-[#349e73] active:bg-[#237050] text-white font-bold text-xs tracking-wide uppercase transition-all shadow-md shadow-[#2A835F]/20 cursor-pointer flex items-center justify-center space-x-2"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Jugar con este Mazo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInspectedDeck(selectedPresetForView)}
                    className="w-full py-2 px-4 rounded-xl bg-[#12544F] hover:bg-[#18645e] border border-[#2A835F]/40 text-white font-bold text-xs tracking-wide transition-all cursor-pointer flex items-center justify-center space-x-2"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-[#8BBB92]" />
                    <span>Ver Mazo Completo (100 Cartas)</span>
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
          <div className="rounded-2xl bg-[#092328] border border-[#12544F] p-5 space-y-3 shadow-xl">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
              Herramientas de Juego
            </h3>

            {onNavigateToImporter && (
              <button
                type="button"
                onClick={onNavigateToImporter}
                className="w-full text-left p-3 rounded-xl bg-[#0c2d32] hover:bg-[#12544F]/70 border border-[#12544F] transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-[#12544F] text-[#8BBB92]">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-[#8BBB92] transition-colors">
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

            <div className="p-3.5 rounded-xl bg-[#0c2d32] border border-[#12544F] space-y-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-zinc-200">
                <Keyboard className="w-4 h-4 text-[#8BBB92]" />
                <span>Atajos Esenciales de la Mesa</span>
              </div>
              <ul className="text-[11px] text-zinc-400 space-y-1 font-mono">
                <li><strong className="text-zinc-200">Doble clic</strong>: Girar / Enderezar carta</li>
                <li><strong className="text-zinc-200">Clic derecho</strong>: Menú contextual completo</li>
                <li><strong className="text-zinc-200">Espacio</strong>: Pasar el turno activo</li>
                <li><strong className="text-zinc-200">D</strong>: Robar una carta de biblioteca</li>
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
            className="w-full max-w-lg bg-[#092328] border border-[#12544F] rounded-2xl p-6 sm:p-7 shadow-2xl space-y-6 text-white"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#12544F] pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">Crear Mesa de Commander</h3>
                <p className="text-xs text-zinc-400">Configura la partida para ti y tus compañeros</p>
              </div>
              <button
                type="button"
                onClick={() => setModalMode('none')}
                className="text-zinc-400 hover:text-white text-xs font-bold px-2 py-1 rounded bg-[#12544F]/60"
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
                  className="w-full bg-[#040d0f] border border-[#12544F] focus:border-[#2A835F] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
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
                  className="w-full bg-[#040d0f] border border-[#12544F] focus:border-[#2A835F] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
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
                    className="w-full bg-[#040d0f] border border-[#12544F] focus:border-[#2A835F] rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none"
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
                    className="w-full bg-[#040d0f] border border-[#12544F] focus:border-[#2A835F] rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setModalMode('none')}
                  className="px-4 py-2.5 rounded-xl bg-[#0c2d32] hover:bg-[#12544F] text-zinc-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-6 py-2.5 rounded-xl bg-[#2A835F] hover:bg-[#349e73] active:bg-[#237050] text-white text-xs font-bold tracking-wide uppercase transition-all shadow-md shadow-[#2A835F]/20 cursor-pointer disabled:opacity-50"
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
            className="w-full max-w-md bg-[#092328] border border-[#12544F] rounded-2xl p-6 sm:p-7 shadow-2xl space-y-6 text-white"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#12544F] pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">Unirse a una Mesa</h3>
                <p className="text-xs text-zinc-400">Ingresa el código de 6 caracteres</p>
              </div>
              <button
                type="button"
                onClick={() => setModalMode('none')}
                className="text-zinc-400 hover:text-white text-xs font-bold px-2 py-1 rounded bg-[#12544F]/60"
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
                  className="w-full bg-[#040d0f] border border-[#12544F] focus:border-[#2A835F] rounded-xl px-4 py-3 text-center text-2xl font-mono font-bold tracking-[0.25em] text-[#8BBB92] focus:outline-none"
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
                  className="w-full bg-[#040d0f] border border-[#12544F] focus:border-[#2A835F] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="spectatorCheck"
                  checked={isSpectator}
                  onChange={e => setIsSpectator(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#040d0f] border-[#12544F] text-[#2A835F] focus:ring-0 cursor-pointer"
                />
                <label htmlFor="spectatorCheck" className="text-xs text-zinc-300 cursor-pointer">
                  Entrar como Espectador (solo ver y chatear)
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setModalMode('none')}
                  className="px-4 py-2.5 rounded-xl bg-[#0c2d32] hover:bg-[#12544F] text-zinc-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#2A835F] hover:bg-[#349e73] active:bg-[#237050] text-white text-xs font-bold tracking-wide uppercase transition-all shadow-md shadow-[#2A835F]/20 cursor-pointer"
                >
                  Entrar a la Sala
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL: INSPECTOR DE MAZO COMPLETO */}
      <DeckInspectorModal
        deck={inspectedDeck}
        isOpen={!!inspectedDeck}
        onClose={() => setInspectedDeck(null)}
        onSelectDeck={deck => {
          setSelectedPresetForView(deck);
          setRoomName(`Mesa ${deck.name}`);
          setModalMode('create');
        }}
        selectButtonLabel="Crear Mesa con este Mazo"
      />
    </div>
  );
};
