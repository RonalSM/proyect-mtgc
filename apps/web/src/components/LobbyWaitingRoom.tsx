import React, { useState, useEffect } from 'react';
import type { RoomState, GameActionType, CardDefinition, DeckCardWithQuantity } from '@mtgc/shared';
import { parseDecklist, validateCommanderDeck, toArtCropUrl } from '@mtgc/shared';
import {
  Users,
  Copy,
  Check,
  LogOut,
  Play,
  CheckCircle2,
  XCircle,
  Crown,
  Layers,
  UserX,
  Shield,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

interface LobbyWaitingRoomProps {
  roomState: RoomState;
  localPlayerId: string;
  onAction: (type: GameActionType, payload: unknown) => void;
  onLeaveRoom: () => void;
}

export const LobbyWaitingRoom: React.FC<LobbyWaitingRoomProps> = ({
  roomState,
  localPlayerId,
  onAction,
  onLeaveRoom,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isDeckModalOpen, setIsDeckModalOpen] = useState(false);
  const [savedDecks, setSavedDecks] = useState<any[]>([]);
  const [isLoadingDecks, setIsLoadingDecks] = useState(false);
  const [rawDeckText, setRawDeckText] = useState('');
  const [deckNameInput, setDeckNameInput] = useState('');
  const [saveToAccount, setSaveToAccount] = useState(false);
  const [importTab, setImportTab] = useState<'saved' | 'import'>('saved');
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    commanderCards: CardDefinition[];
    maindeckCards: CardDefinition[];
  } | null>(null);

  const localPlayer = roomState.players[localPlayerId];
  const isHost = localPlayer?.isHost ?? false;
  const seatedPlayers = Object.values(roomState.players).filter(p => !p.isSpectator);
  const unreadyCount = seatedPlayers.filter(p => !p.isReady || !p.selectedDeck).length;
  const canStart = isHost && seatedPlayers.length >= 2 && unreadyCount === 0;

  // Load user saved decks from /api/decks
  useEffect(() => {
    const fetchDecks = async () => {
      setIsLoadingDecks(true);
      try {
        const res = await fetch('/api/decks', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setSavedDecks(data.decks || []);
        }
      } catch {
        // Guest or offline DB fallback
      } finally {
        setIsLoadingDecks(false);
      }
    };
    fetchDecks();
  }, []);

  const copyCode = () => {
    navigator.clipboard.writeText(roomState.code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleToggleReady = () => {
    if (!localPlayer?.selectedDeck) {
      setIsDeckModalOpen(true);
      return;
    }
    onAction('SET_READY', { isReady: !localPlayer.isReady });
  };

  const handleStartGame = () => {
    if (!canStart) return;
    onAction('START_GAME', {});
  };

  const handleKick = (targetId: string, name: string) => {
    if (!isHost) return;
    if (confirm(`¿Expulsar a ${name} de la mesa?`)) {
      onAction('KICK_PLAYER', { playerId: targetId, reason: 'Expulsado por anfitrión' });
    }
  };

  const handleTransferHost = (targetId: string, name: string) => {
    if (!isHost) return;
    if (confirm(`¿Transferir el rol de anfitrión a ${name}?`)) {
      onAction('TRANSFER_HOST', { newHostId: targetId });
    }
  };

  const handleValidateText = () => {
    if (!rawDeckText.trim()) return;
    const parsed = parseDecklist(rawDeckText);
    const mockCommanderCards: CardDefinition[] = parsed.commanderEntries.map((c, i) => ({
      scryfallId: `cmdr_${i}`,
      name: c.cardName,
      cmc: 4,
      typeLine: 'Legendary Creature',
      colors: ['W', 'U', 'B', 'R', 'G'] as any,
      colorIdentity: ['W', 'U', 'B', 'R', 'G'] as any,
      imageUrlNormal: `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(c.cardName)}&format=image`,
      imageUrlSmall: `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(c.cardName)}&format=image&version=small`,
      imageUrlArtCrop: `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(c.cardName)}&format=image&version=art_crop`,
    }));

    const mockMaindeckCards: CardDefinition[] = parsed.maindeckEntries.flatMap((c, i) =>
      Array.from({ length: c.quantity }, (_, qty) => ({
        scryfallId: `card_${i}_${qty}`,
        name: c.cardName,
        cmc: (i % 6) + 1,
        typeLine: 'Spell',
        colors: [] as any,
        colorIdentity: [] as any,
        imageUrlNormal: `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(c.cardName)}&format=image`,
        imageUrlSmall: `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(c.cardName)}&format=image&version=small`,
      })),
    );

    const commanderQty: DeckCardWithQuantity[] = parsed.commanderEntries.map(c => ({
      card: {
        scryfallId: `cmdr_${c.cardName}`,
        name: c.cardName,
        cmc: 4,
        typeLine: 'Legendary Creature',
        colors: ['W', 'U', 'B', 'R', 'G'] as any,
        colorIdentity: ['W', 'U', 'B', 'R', 'G'] as any,
      },
      quantity: c.quantity,
      isCommander: true,
    }));

    const maindeckQty: DeckCardWithQuantity[] = parsed.maindeckEntries.map(c => ({
      card: {
        scryfallId: `card_${c.cardName}`,
        name: c.cardName,
        cmc: 2,
        typeLine: 'Spell',
        colors: [] as any,
        colorIdentity: [] as any,
      },
      quantity: c.quantity,
      isCommander: false,
    }));

    const val = validateCommanderDeck(commanderQty, maindeckQty);
    setValidationResult({
      valid: val.isValid,
      errors: val.errors,
      warnings: val.warnings,
      commanderCards: mockCommanderCards,
      maindeckCards: mockMaindeckCards,
    });
  };

  const handleApplySelectedDeck = async (deck: {
    id?: string;
    name: string;
    commanderName: string;
    commanderImageUrl?: string;
    commanderCards: CardDefinition[];
    maindeckCards: CardDefinition[];
    warnings?: string[];
  }) => {
    // If saveToAccount was checked and user imported text
    if (saveToAccount && deck.name && deck.commanderName) {
      try {
        await fetch('/api/decks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: deck.name,
            commanderName: deck.commanderName,
            colorIdentity: ['W', 'U', 'B', 'R', 'G'],
            rawListText: rawDeckText || deck.name,
          }),
        });
      } catch {
        // Graceful fallback
      }
    }

    onAction('SELECT_DECK', {
      deckId: deck.id,
      deckName: deck.name,
      commanderName: deck.commanderName,
      commanderImageUrl: deck.commanderImageUrl,
      commanderCards: deck.commanderCards,
      maindeckCards: deck.maindeckCards,
      warnings: deck.warnings,
    });

    setIsDeckModalOpen(false);
  };

  // Generate slots for maxPlayers
  const maxSeats = roomState.settings?.maxPlayers || 4;
  const seats = Array.from({ length: maxSeats }, (_, seatNum) => {
    return Object.values(roomState.players).find(p => !p.isSpectator && p.seatNumber === seatNum);
  });

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-6xl mx-auto space-y-4">
      {/* Top Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-black text-white tracking-wide">{roomState.name}</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                SALA DE ESPERA
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {seatedPlayers.length} de {maxSeats} jugadores sentados &bull; Vida inicial:{' '}
              {roomState.settings?.startingLife || 40}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={copyCode}
            className="flex items-center space-x-2 bg-slate-950 hover:bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-amber-300 transition-colors shadow-inner"
            title="Copiar código de la sala"
          >
            <span>Código: {roomState.code}</span>
            {isCopied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>

          <button
            onClick={onLeaveRoom}
            className="flex items-center space-x-1.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-300 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Salir</span>
          </button>
        </div>
      </div>

      {/* Seats Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {seats.map((player, idx) => {
          if (!player) {
            return (
              <div
                key={idx}
                className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-2"
              >
                <div className="w-12 h-12 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600 font-mono font-bold text-sm">
                  #{idx + 1}
                </div>
                <h3 className="text-sm font-semibold text-slate-500">Asiento {idx + 1} Libre</h3>
                <p className="text-[11px] text-slate-600">Esperando a que se una otro jugador...</p>
              </div>
            );
          }

          const isLocal = player.id === localPlayerId;
          const deck = player.selectedDeck;

          return (
            <div
              key={player.id}
              className={`bg-slate-900 border rounded-2xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden transition-all ${
                player.isReady
                  ? 'border-emerald-500/40 shadow-emerald-500/5'
                  : 'border-slate-800'
              } ${isLocal ? 'ring-1 ring-amber-500/30' : ''}`}
            >
              {/* Playmat subtle preview if available */}
              {deck?.commanderImageUrl && (
                <div
                  className="absolute inset-0 opacity-15 bg-cover bg-center pointer-events-none"
                  style={{ backgroundImage: `url(${toArtCropUrl(deck.commanderImageUrl)})` }}
                />
              )}

              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold text-slate-500">
                      #{idx + 1}
                    </span>
                    <h3 className="font-bold text-sm text-white flex items-center space-x-1.5">
                      <span>{player.name}</span>
                      {player.isHost && (
                        <span title="Anfitrión">
                          <Crown className="w-3.5 h-3.5 text-amber-400 inline" />
                        </span>
                      )}
                      {isLocal && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-semibold">
                          Tú
                        </span>
                      )}
                    </h3>
                  </div>

                  <span
                    className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                      player.isReady
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {player.isReady ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Listo</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5 text-slate-500" />
                        <span>No listo</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Deck Card */}
                <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 space-y-1.5">
                  {deck ? (
                    <div>
                      <div className="text-xs font-bold text-amber-300 truncate">
                        {deck.name}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate flex items-center space-x-1">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>{deck.commanderName}</span>
                      </div>
                      {deck.warnings && deck.warnings.length > 0 && (
                        <div className="text-[10px] text-amber-400/90 flex items-center space-x-1 mt-1">
                          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{deck.warnings.length} advertencia(s)</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-2 text-slate-500 text-xs italic">
                      Sin mazo seleccionado
                    </div>
                  )}
                </div>
              </div>

              {/* Host actions on opponents */}
              {isHost && !isLocal && (
                <div className="relative z-10 pt-3 border-t border-slate-800/60 flex items-center justify-end space-x-2">
                  <button
                    onClick={() => handleTransferHost(player.id, player.name)}
                    className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg text-xs transition-colors"
                    title="Transferir anfitrión"
                  >
                    <Shield className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleKick(player.id, player.name)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg text-xs transition-colors"
                    title="Expulsar jugador"
                  >
                    <UserX className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Action Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 shadow-2xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsDeckModalOpen(true)}
            className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2.5 rounded-xl font-bold text-sm text-white transition-all shadow"
          >
            <Layers className="w-4 h-4 text-amber-400" />
            <span>
              {localPlayer?.selectedDeck ? 'Cambiar Mazo' : 'Seleccionar / Importar Mazo'}
            </span>
          </button>

          <button
            onClick={handleToggleReady}
            disabled={!localPlayer?.selectedDeck}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow ${
              !localPlayer?.selectedDeck
                ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed border border-slate-800'
                : localPlayer?.isReady
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
            }`}
          >
            {localPlayer?.isReady ? (
              <>
                <XCircle className="w-4 h-4 text-slate-400" />
                <span>Cancelar "Listo"</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                <span>Marcarme Listo</span>
              </>
            )}
          </button>
        </div>

        {isHost && (
          <div className="flex items-center space-x-3">
            {!canStart && (
              <span className="text-xs text-amber-400 font-semibold flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>
                  {seatedPlayers.length < 2
                    ? 'Esperando al menos 2 jugadores...'
                    : `Esperando que todos estén listos (${unreadyCount} pendiente${
                        unreadyCount > 1 ? 's' : ''
                      })`}
                </span>
              </span>
            )}
            <button
              onClick={handleStartGame}
              disabled={!canStart}
              className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-extrabold text-sm transition-all shadow-lg ${
                canStart
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/25 cursor-pointer scale-105'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-800'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>INICIAR PARTIDA</span>
            </button>
          </div>
        )}
      </div>

      {/* Deck Selector & Importer Modal */}
      {isDeckModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Layers className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-base text-white">Seleccionar Mazo</h3>
              </div>
              <button
                onClick={() => setIsDeckModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                &times;
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-950/50 px-6 pt-2">
              <button
                onClick={() => setImportTab('saved')}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
                  importTab === 'saved'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Mis Mazos Guardados ({savedDecks.length})
              </button>
              <button
                onClick={() => setImportTab('import')}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
                  importTab === 'import'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Importar Lista de Texto
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {importTab === 'saved' ? (
                isLoadingDecks ? (
                  <div className="text-center py-8 text-slate-400 text-xs">Cargando mazos...</div>
                ) : savedDecks.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2.5">
                    {savedDecks.map((d: any) => (
                      <div
                        key={d.id}
                        onClick={() =>
                          handleApplySelectedDeck({
                            id: d.id,
                            name: d.name,
                            commanderName: d.commanderName,
                            commanderImageUrl: d.commanderImageUrl,
                            commanderCards: [
                              {
                                scryfallId: `cmdr_${d.id}`,
                                name: d.commanderName,
                                cmc: 4,
                                typeLine: 'Legendary Creature',
                                colors: d.colorIdentity || [],
                                colorIdentity: d.colorIdentity || [],
                                imageUrlNormal:
                                  d.commanderImageUrl ||
                                  `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(d.commanderName)}&format=image`,
                                imageUrlArtCrop:
                                  d.commanderImageUrl ||
                                  `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(d.commanderName)}&format=image&version=art_crop`,
                              },
                            ],
                            maindeckCards: d.maindeckCards?.length
                              ? d.maindeckCards
                              : Array.from({ length: 99 }, (_, i) => {
                                  const staples = [
                                    'Sol Ring',
                                    'Arcane Signet',
                                    'Command Tower',
                                    'Cultivate',
                                    "Kodama's Reach",
                                    'Swords to Plowshares',
                                    'Counterspell',
                                    'Demonic Tutor',
                                    'Rhystic Study',
                                    'Lightning Bolt',
                                    'Beast Within',
                                    'Heroic Intervention',
                                    'Cyclonic Rift',
                                    'Path to Exile',
                                    'Chaos Warp',
                                    'Brainstorm',
                                    'Ponder',
                                    'Dark Ritual',
                                    'Forest',
                                    'Island',
                                    'Mountain',
                                    'Plains',
                                    'Swamp',
                                  ];
                                  const stapleName = staples[i % staples.length]!;
                                  const isLand =
                                    stapleName.includes('Forest') ||
                                    stapleName.includes('Island') ||
                                    stapleName.includes('Mountain') ||
                                    stapleName.includes('Plains') ||
                                    stapleName.includes('Swamp') ||
                                    stapleName.includes('Tower');
                                  return {
                                    scryfallId: `card_${i}`,
                                    name: stapleName,
                                    cmc: (i % 6) + 1,
                                    typeLine: isLand ? 'Land' : 'Spell',
                                    colors: [],
                                    colorIdentity: [],
                                    imageUrlNormal: `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(stapleName)}&format=image`,
                                    imageUrlSmall: `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(stapleName)}&format=image&version=small`,
                                  };
                                }),
                          })
                        }
                        className="bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/50 rounded-xl p-3.5 flex items-center justify-between cursor-pointer transition-all"
                      >
                        <div>
                          <div className="font-bold text-sm text-white">{d.name}</div>
                          <div className="text-xs text-slate-400">
                            Comandante: {d.commanderName}
                          </div>
                        </div>
                        <button className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg shadow">
                          Elegir
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 space-y-3">
                    <p className="text-slate-400 text-sm">No tienes mazos guardados en tu cuenta.</p>
                    <button
                      onClick={() => setImportTab('import')}
                      className="bg-amber-500 text-slate-950 px-4 py-2 rounded-xl font-bold text-xs shadow"
                    >
                      Importar mi primer mazo
                    </button>
                  </div>
                )
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Nombre del Mazo
                    </label>
                    <input
                      type="text"
                      value={deckNameInput}
                      onChange={e => setDeckNameInput(e.target.value)}
                      placeholder="Ej. Atraxa Contadores"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Lista en formato texto (MTG Arena, Moxfield o Archidekt)
                    </label>
                    <textarea
                      rows={6}
                      value={rawDeckText}
                      onChange={e => setRawDeckText(e.target.value)}
                      placeholder={`Commander\n1 Atraxa, Praetors' Voice\n\nDeck\n1 Sol Ring\n1 Command Tower...`}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="saveToAcc"
                      checked={saveToAccount}
                      onChange={e => setSaveToAccount(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-800 text-amber-500 focus:ring-0"
                    />
                    <label htmlFor="saveToAcc" className="text-xs text-slate-400">
                      Guardar también en mi cuenta (para usuarios registrados)
                    </label>
                  </div>

                  <button
                    onClick={handleValidateText}
                    className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs py-2 rounded-xl transition-colors"
                  >
                    Validar lista
                  </button>

                  {validationResult && (
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <div className="flex items-center space-x-2 text-xs font-bold">
                        {validationResult.valid ? (
                          <span className="text-emerald-400 flex items-center space-x-1">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Mazo válido para Commander (100 cartas)</span>
                          </span>
                        ) : (
                          <span className="text-amber-400 flex items-center space-x-1">
                            <AlertTriangle className="w-4 h-4" />
                            <span>Mazo con advertencias (permitido en modo sandbox)</span>
                          </span>
                        )}
                      </div>

                      {validationResult.errors.map((err, i) => (
                        <div key={i} className="text-[11px] text-rose-400">
                          &bull; {err}
                        </div>
                      ))}
                      {validationResult.warnings.map((warn, i) => (
                        <div key={i} className="text-[11px] text-amber-400">
                          &bull; {warn}
                        </div>
                      ))}

                      <button
                        onClick={() =>
                          handleApplySelectedDeck({
                            name: deckNameInput || 'Mazo Importado',
                            commanderName:
                              validationResult.commanderCards[0]?.name || 'Comandante',
                            commanderImageUrl:
                              validationResult.commanderCards[0]?.imageUrlArtCrop ||
                              toArtCropUrl(validationResult.commanderCards[0]?.imageUrlNormal),
                            commanderCards: validationResult.commanderCards,
                            maindeckCards: validationResult.maindeckCards,
                            warnings: validationResult.warnings,
                          })
                        }
                        className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-2.5 rounded-xl shadow-lg mt-2"
                      >
                        Usar este Mazo en la Mesa
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
