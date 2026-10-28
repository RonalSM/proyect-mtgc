import React, { useState, useEffect, useRef } from 'react';
import type { RoomState, GameActionType, CardDefinition, DeckCardWithQuantity } from '@mtgc/shared';
import {
  parseDecklist,
  validateCommanderDeck,
  toArtCropUrl,
  inferCardTypeLine,
  getCardImageUrl,
} from '@mtgc/shared';
import { imageLoaderQueue } from '../services/imageLoaderQueue';
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
  ChevronDown,
  ChevronUp,
  BookOpen,
} from 'lucide-react';
import { MtgSymbolIcon } from '../utils/mana-icons';
import { DeckInspectorModal } from './DeckInspectorModal';

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
  const [presetDecks, setPresetDecks] = useState<any[]>([]);
  const [isLoadingPresets, setIsLoadingPresets] = useState(false);
  const [expandedPresetId, setExpandedPresetId] = useState<string | null>(null);
  const [inspectedPreset, setInspectedPreset] = useState<any | null>(null);
  const [savedDecks, setSavedDecks] = useState<any[]>([]);
  const [isLoadingDecks, setIsLoadingDecks] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [rawDeckText, setRawDeckText] = useState('');
  const [deckNameInput, setDeckNameInput] = useState('');
  const [saveToAccount, setSaveToAccount] = useState(false);
  const [importTab, setImportTab] = useState<'presets' | 'saved' | 'import'>('presets');
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

  // Load preset decks from /api/decks/presets (Punto 8)
  useEffect(() => {
    const fetchPresets = async () => {
      setIsLoadingPresets(true);
      try {
        const res = await fetch('/api/decks/presets');
        if (res.ok) {
          const data = await res.json();
          setPresetDecks(data.presets || []);
        }
      } catch {
        // Fallback
      } finally {
        setIsLoadingPresets(false);
      }
    };
    fetchPresets();
  }, []);

  // Load user saved decks from /api/decks (silent for guests/unauthenticated, Punto 17)
  useEffect(() => {
    const fetchDecks = async () => {
      // D.17: "GET /api/decks da 401 a los invitados en cada carga: no lo llames sin sesión o gestiónalo en silencio, sin errores en consola."
      // Comprobar si hay sesión explícita en localStorage o cookie de sesión
      const token =
        localStorage.getItem('token') ||
        localStorage.getItem('mtgc_access_token') ||
        localStorage.getItem('mtgc_auth_token');
      const hasAuthCookie = typeof document !== 'undefined' && document.cookie.includes('mtgc_access_token');

      // Si no hay indicio de sesión autenticada, los usuarios son invitados y NO se debe llamar a /api/decks
      if (!token && !hasAuthCookie) {
        setSavedDecks([]);
        setIsLoadingDecks(false);
        return;
      }

      setIsLoadingDecks(true);
      try {
        const res = await fetch('/api/decks', { credentials: 'include' });
        if (res.status === 401) {
          // Usuario no autenticado / invitado: silenciar sin registrar error en consola
          setSavedDecks([]);
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setSavedDecks(data.decks || []);
        }
      } catch {
        // Fallback silencioso ante errores de red
        setSavedDecks([]);
      } finally {
        setIsLoadingDecks(false);
      }
    };
    fetchDecks();
  }, []);

  // Remember last selected deck from localStorage on initial lobby entry (Punto 8)
  const hasAutoSelectedRef = useRef(false);

  useEffect(() => {
    if (hasAutoSelectedRef.current) return;
    if (localPlayer && !localPlayer.selectedDeck) {
      try {
        const cached = localStorage.getItem('mtgc_last_selected_deck');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.name && parsed.commanderName) {
            hasAutoSelectedRef.current = true;
            // Sanitize / upgrade any obsolete or art_series cards stored in previous sessions
            const hasObsoleteCard = (parsed.maindeckCards || []).some(
              (c: any) =>
                c.layout === 'art_series' ||
                c.typeLine === 'Card // Card' ||
                c.scryfallId === '6894b688-4966-4277-8e11-d3c91042180c' ||
                (c.imageUrlNormal && c.imageUrlNormal.includes('/art_crop/')) ||
                (!c.oracleText && !c.typeLine?.includes('Land') && !c.typeLine?.includes('Card')),
            );

            if (hasObsoleteCard) {
              // Re-resolve deck cards from server
              const names = (parsed.maindeckCards || []).map((c: any) => c.name);
              fetch('/api/cards/resolve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ names, lang: 'en' }),
              })
                .then(r => (r.ok ? r.json() : null))
                .then(resolvedData => {
                  if (resolvedData?.cards) {
                    const upgradedDeck = {
                      ...parsed,
                      maindeckCards: resolvedData.cards,
                    };
                    localStorage.setItem('mtgc_last_selected_deck', JSON.stringify(upgradedDeck));
                    onAction('SELECT_DECK', {
                      deckId: upgradedDeck.id,
                      deckName: upgradedDeck.name,
                      commanderName: upgradedDeck.commanderName,
                      commanderImageUrl: upgradedDeck.commanderImageUrl,
                      commanderCards: upgradedDeck.commanderCards,
                      maindeckCards: upgradedDeck.maindeckCards,
                      warnings: upgradedDeck.warnings,
                    });
                  }
                })
                .catch(() => {});
              return;
            }

            onAction('SELECT_DECK', {
              deckId: parsed.id,
              deckName: parsed.name,
              commanderName: parsed.commanderName,
              commanderImageUrl: parsed.commanderImageUrl,
              commanderCards: parsed.commanderCards,
              maindeckCards: parsed.maindeckCards,
              warnings: parsed.warnings,
            });
          }
        }
      } catch {
        // Ignore JSON/localStorage error
      }
    }
  }, [localPlayer?.selectedDeck, localPlayer?.id, onAction]);

  // Priority Preloading during Lobby phase (Punto 5):
  // (1) Commander in normal version (priority 10)
  useEffect(() => {
    const deck = localPlayer?.selectedDeck;
    if (!deck) return;

    if (deck.commanderImageUrl) {
      imageLoaderQueue.enqueue(deck.commanderImageUrl, 10);
    }
  }, [localPlayer?.selectedDeck]);

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

  const handleValidateText = async () => {
    if (!rawDeckText.trim()) return;
    setIsValidating(true);

    try {
      const res = await fetch('/api/decks/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decklist: rawDeckText }),
      });

      if (res.ok) {
        const data = await res.json();
        const commanderCards: CardDefinition[] = (data.commanderCards || []).flatMap((c: any) =>
          Array.from({ length: c.quantity || 1 }, () => c.card),
        );
        const maindeckCards: CardDefinition[] = (data.maindeckCards || []).flatMap((c: any) =>
          Array.from({ length: c.quantity || 1 }, () => c.card),
        );

        setValidationResult({
          valid: data.validation.isValid,
          errors: data.validation.errors,
          warnings: data.validation.warnings,
          commanderCards,
          maindeckCards,
        });
        return;
      }
    } catch {
      // Offline / fallback to local parser
    } finally {
      setIsValidating(false);
    }

    const parsed = parseDecklist(rawDeckText);
    const mockCommanderCards: CardDefinition[] = parsed.commanderEntries.map((c, i) => ({
      scryfallId: `cmdr_${i}`,
      name: c.cardName,
      cmc: 4,
      typeLine: 'Legendary Creature',
      colors: ['W', 'U', 'B', 'R', 'G'] as any,
      colorIdentity: ['W', 'U', 'B', 'R', 'G'] as any,
    }));

    const mockMaindeckCards: CardDefinition[] = parsed.maindeckEntries.flatMap((c, i) =>
      Array.from({ length: c.quantity }, (_, qty) => ({
        scryfallId: `card_${i}_${qty}`,
        name: c.cardName,
        cmc: (i % 6) + 1,
        typeLine: inferCardTypeLine(c.cardName),
        colors: [] as any,
        colorIdentity: [] as any,
      })),
    );

    const commanderQty: DeckCardWithQuantity[] = parsed.commanderEntries.map(c => ({
      card: {
        scryfallId: `cmdr_${c.cardName}`,
        name: c.cardName,
        cmc: 4,
        typeLine: inferCardTypeLine(c.cardName, 'Legendary Creature'),
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
        typeLine: inferCardTypeLine(c.cardName),
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

    // Priority Preloading when deck is selected (Punto 5):
    // (1) Commander in normal version (priority 10)
    // (2) Rest of library in small version (priority 1)
    if (deck.commanderImageUrl) {
      imageLoaderQueue.enqueue(deck.commanderImageUrl, 10);
    }
    if (deck.commanderCards) {
      for (const cmdr of deck.commanderCards) {
        const url = getCardImageUrl(cmdr, { size: 'normal' });
        if (url) imageLoaderQueue.enqueue(url, 10);
      }
    }
    if (deck.maindeckCards) {
      for (const card of deck.maindeckCards) {
        const smallUrl = getCardImageUrl(card, { size: 'small' });
        if (smallUrl) imageLoaderQueue.enqueue(smallUrl, 1);
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

    try {
      localStorage.setItem('mtgc_last_selected_deck', JSON.stringify(deck));
      hasAutoSelectedRef.current = true;
    } catch {
      // Ignore quota error
    }

    setIsDeckModalOpen(false);
  };

  // Generate slots for maxPlayers
  const maxSeats = roomState.settings?.maxPlayers || 4;
  const seats = Array.from({ length: maxSeats }, (_, seatNum) => {
    return Object.values(roomState.players).find(p => !p.isSpectator && p.seatNumber === seatNum);
  });

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] max-w-6xl mx-auto space-y-5">
      {/* Top Header */}
      <div className="bg-[#092328] border border-[#12544F] rounded-2xl px-6 py-4.5 shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-[#0c2d32] border border-[#12544F] rounded-xl text-[#8BBB92]">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h2 className="text-lg font-bold text-white tracking-wide">{roomState.name}</h2>
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#0c2d32] text-[#8BBB92] border border-[#12544F] uppercase tracking-wider">
                Sala de Espera
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              {seatedPlayers.length} de {maxSeats} jugadores listos &bull; Vida inicial:{' '}
              {roomState.settings?.startingLife || 40}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={copyCode}
            className="flex items-center space-x-2.5 bg-[#040d0f] hover:bg-[#0c2d32] border border-[#12544F] px-3.5 py-2 rounded-xl text-xs font-mono font-bold text-[#8BBB92] transition-all cursor-pointer"
            title="Copiar código de la sala"
          >
            <span>Código: {roomState.code}</span>
            {isCopied ? (
              <Check className="w-3.5 h-3.5 text-[#8BBB92]" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-zinc-400" />
            )}
          </button>

          <button
            onClick={onLeaveRoom}
            className="flex items-center space-x-1.5 bg-[#2a1315] hover:bg-[#38181b] border border-[#521c21] px-3.5 py-2 rounded-xl text-xs font-bold text-rose-300 transition-all cursor-pointer"
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
                className="bg-[#092328]/50 border border-dashed border-[#12544F] rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-2"
              >
                <div className="w-12 h-12 rounded-full bg-[#0c2d32] border border-[#12544F] flex items-center justify-center text-zinc-400 font-mono font-bold text-sm">
                  #{idx + 1}
                </div>
                <h3 className="text-sm font-semibold text-zinc-400">Asiento {idx + 1} Libre</h3>
                <p className="text-[11px] text-zinc-500">Esperando a que se una otro jugador...</p>
              </div>
            );
          }

          const isLocal = player.id === localPlayerId;
          const deck = player.selectedDeck;

          return (
            <div
              key={player.id}
              className={`bg-[#092328] border rounded-2xl p-5 flex flex-col justify-between shadow-xl relative overflow-hidden transition-all ${
                player.isReady ? 'border-[#2A835F]' : 'border-[#12544F]'
              } ${isLocal ? 'ring-1 ring-[#8BBB92]/50' : ''}`}
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
                    <span className="text-xs font-mono font-bold text-[#8BBB92]">#{idx + 1}</span>
                    <h3 className="font-bold text-sm text-white flex items-center space-x-1.5">
                      <span>{player.name}</span>
                      {player.isHost && (
                        <span title="Anfitrión">
                          <Crown className="w-3.5 h-3.5 text-[#8BBB92] inline" />
                        </span>
                      )}
                      {isLocal && (
                        <span className="text-[10px] bg-[#2A835F]/30 text-[#8BBB92] px-1.5 py-0.5 rounded font-semibold border border-[#2A835F]/40">
                          Tú
                        </span>
                      )}
                    </h3>
                  </div>

                  <span
                    className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                      player.isReady
                        ? 'bg-[#2A835F]/20 text-[#8BBB92] border border-[#2A835F]/50'
                        : 'bg-[#0c2d32] text-zinc-400 border border-[#12544F]'
                    }`}
                  >
                    {player.isReady ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#8BBB92]" />
                        <span>Listo</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5 text-zinc-500" />
                        <span>No listo</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Deck Card */}
                <div className="bg-[#040d0f] border border-[#12544F] rounded-xl p-3 space-y-1.5">
                  {deck ? (
                    <div>
                      <div className="text-xs font-bold text-[#8BBB92] truncate">{deck.name}</div>
                      <div className="text-[11px] text-zinc-300 truncate flex items-center space-x-1">
                        <Sparkles className="w-3 h-3 text-[#8BBB92]" />
                        <span>{deck.commanderName}</span>
                      </div>
                      {deck.warnings && deck.warnings.length > 0 && (
                        <div className="text-[10px] text-amber-300/90 flex items-center space-x-1 mt-1">
                          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{deck.warnings.length} advertencia(s)</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-2 text-zinc-500 text-xs italic">
                      Sin mazo seleccionado
                    </div>
                  )}
                </div>
              </div>

              {/* Host actions on opponents */}
              {isHost && !isLocal && (
                <div className="relative z-10 pt-3 border-t border-[#12544F] flex items-center justify-end space-x-2">
                  <button
                    onClick={() => handleTransferHost(player.id, player.name)}
                    className="p-1.5 text-zinc-400 hover:text-[#8BBB92] hover:bg-[#0c2d32] rounded-lg text-xs transition-colors"
                    title="Transferir anfitrión"
                  >
                    <Shield className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleKick(player.id, player.name)}
                    className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg text-xs transition-colors"
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
      <div className="bg-[#092328] border border-[#12544F] rounded-2xl px-6 py-4 shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsDeckModalOpen(true)}
            className="flex items-center space-x-2 bg-[#0c2d32] hover:bg-[#12544F] border border-[#12544F] px-4 py-2.5 rounded-xl font-bold text-sm text-white transition-all cursor-pointer shadow-sm"
          >
            <Layers className="w-4 h-4 text-[#8BBB92]" />
            <span>
              {localPlayer?.selectedDeck ? 'Cambiar Mazo' : 'Seleccionar / Importar Mazo'}
            </span>
          </button>

          <button
            onClick={handleToggleReady}
            disabled={!localPlayer?.selectedDeck}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              !localPlayer?.selectedDeck
                ? 'bg-[#0c2d32]/50 text-zinc-600 cursor-not-allowed border border-[#12544F]'
                : localPlayer?.isReady
                  ? 'bg-[#0c2d32] text-zinc-200 hover:bg-[#12544F] border border-[#12544F]'
                  : 'bg-[#2A835F] hover:bg-[#349e73] text-white shadow-md shadow-[#2A835F]/25'
            }`}
          >
            {localPlayer?.isReady ? (
              <>
                <XCircle className="w-4 h-4 text-zinc-400" />
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
              <span className="text-xs text-[#8BBB92] font-semibold flex items-center space-x-1">
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
              className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-extrabold text-sm transition-all shadow-md ${
                canStart
                  ? 'bg-[#2A835F] hover:bg-[#349e73] text-white cursor-pointer scale-105 shadow-[#2A835F]/40'
                  : 'bg-[#0c2d32]/50 text-zinc-600 cursor-not-allowed border border-[#12544F]'
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
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsDeckModalOpen(false)}
          onDoubleClick={e => {
            e.stopPropagation();
            setIsDeckModalOpen(false);
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
            className="bg-[#092328] border border-[#12544F] rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#12544F] flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Layers className="w-5 h-5 text-[#8BBB92]" />
                <h3 className="font-extrabold text-base text-white">Seleccionar Mazo</h3>
              </div>
              <button
                onClick={() => setIsDeckModalOpen(false)}
                className="text-zinc-400 hover:text-white font-bold text-lg"
              >
                &times;
              </button>
            </div>

            {/* Modal Tabs - Mazos Listos first (Punto 8) */}
            <div className="flex border-b border-[#12544F] bg-[#040d0f]/50 px-6 pt-2 space-x-2">
              <button
                data-testid="tab-preset-decks"
                onClick={() => setImportTab('presets')}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center space-x-1.5 ${
                  importTab === 'presets'
                    ? 'border-[#2A835F] text-[#8BBB92]'
                    : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Mazos Listos ({presetDecks.length})</span>
              </button>
              <button
                data-testid="tab-saved-decks"
                onClick={() => setImportTab('saved')}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
                  importTab === 'saved'
                    ? 'border-[#2A835F] text-[#8BBB92]'
                    : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                Mis Mazos Guardados ({savedDecks.length})
              </button>
              <button
                data-testid="tab-import-deck"
                onClick={() => setImportTab('import')}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
                  importTab === 'import'
                    ? 'border-[#2A835F] text-[#8BBB92]'
                    : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                Importar Lista de Texto
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {importTab === 'presets' ? (
                isLoadingPresets ? (
                  <div className="text-center py-12 text-zinc-400 text-xs">
                    Cargando mazos de Commander listos...
                  </div>
                ) : presetDecks.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {presetDecks.map((preset: any) => {
                      const isExpanded = expandedPresetId === preset.id;
                      const isSelected = localPlayer?.selectedDeck?.name === preset.name;
                      return (
                        <div
                          key={preset.id}
                          className={`bg-[#040d0f] border rounded-xl overflow-hidden flex flex-col transition-all ${
                            isSelected
                              ? 'border-[#2A835F] shadow-md shadow-[#2A835F]/20 ring-1 ring-[#8BBB92]/50'
                              : 'border-[#12544F] hover:border-[#2A835F]/50'
                          }`}
                        >
                          {/* Commander Banner Art */}
                          <div className="relative h-28 bg-[#092328] overflow-hidden">
                            {preset.commanderImageUrl ? (
                              <img
                                src={preset.commanderImageUrl}
                                alt={preset.commanderName}
                                className="w-full h-full object-cover object-top opacity-85 hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-600">
                                Sin arte
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                            <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
                              <div className="min-w-0 pr-2">
                                <h4 className="font-extrabold text-sm text-white truncate drop-shadow">
                                  {preset.name}
                                </h4>
                                <p className="text-[11px] text-amber-300 truncate drop-shadow flex items-center space-x-1">
                                  <Sparkles className="w-3 h-3 text-amber-400 flex-shrink-0" />
                                  <span className="truncate">{preset.commanderName}</span>
                                </p>
                              </div>
                              <div className="flex-shrink-0 flex items-center space-x-1">
                                {preset.colorIdentity && preset.colorIdentity.length > 0 ? (
                                  preset.colorIdentity.map((c: string) => (
                                    <MtgSymbolIcon key={c} symbol={c} size="sm" />
                                  ))
                                ) : (
                                  <MtgSymbolIcon symbol="c" size="sm" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Deck Info & Actions */}
                          <div className="p-3 flex-1 flex flex-col justify-between space-y-3">
                            <div className="flex items-center justify-between text-xs text-slate-400">
                              <span className="font-mono text-[#8BBB92]">100 cartas &bull; EDH</span>
                              <div className="flex items-center space-x-2">
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setInspectedPreset(preset);
                                  }}
                                  className="text-[#8BBB92] hover:text-white font-semibold flex items-center space-x-1 px-2 py-0.5 rounded bg-[#12544F]/60 border border-[#12544F] text-[11px] transition-colors cursor-pointer"
                                  title="Ver desglose completo de 100 cartas"
                                >
                                  <BookOpen className="w-3 h-3 text-[#8BBB92]" />
                                  <span>Ver Mazo</span>
                                </button>
                                <button
                                  type="button"
                                  data-testid={`toggle-cardlist-${preset.id}`}
                                  onClick={() => setExpandedPresetId(isExpanded ? null : preset.id)}
                                  className="text-zinc-400 hover:text-zinc-200 font-semibold flex items-center space-x-1 text-[11px]"
                                >
                                  <span>{isExpanded ? 'Ocultar' : 'Lista'}</span>
                                  {isExpanded ? (
                                    <ChevronUp className="w-3 h-3" />
                                  ) : (
                                    <ChevronDown className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Foldable Card List */}
                            {isExpanded && (
                              <div
                                data-testid={`cardlist-content-${preset.id}`}
                                className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 max-h-44 overflow-y-auto text-[11px] font-mono text-slate-300 space-y-1"
                              >
                                <div className="text-amber-400 font-bold border-b border-slate-800 pb-1 mb-1">
                                  // Comandante
                                </div>
                                <div>1 {preset.commanderName}</div>
                                <div className="text-amber-400 font-bold border-b border-slate-800 pb-1 mb-1 mt-2">
                                  // Mazo ({preset.maindeckCards?.length || 99})
                                </div>
                                {preset.maindeckCards?.map((card: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className="truncate text-slate-400 hover:text-white"
                                  >
                                    1 {card.name}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Choose button */}
                            <button
                              type="button"
                              data-testid={`select-preset-deck-${preset.id}`}
                              onClick={() => handleApplySelectedDeck(preset)}
                              className={`w-full py-2 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center space-x-1.5 ${
                                isSelected
                                  ? 'bg-[#2A835F] text-white cursor-default'
                                  : 'bg-[#2A835F] hover:bg-[#349e73] text-white shadow-md shadow-[#2A835F]/20'
                              }`}
                            >
                              {isSelected ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Mazo Elegido</span>
                                </>
                              ) : (
                                <span>Elegir este mazo</span>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    No se encontraron mazos listos.
                  </div>
                )
              ) : importTab === 'saved' ? (
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
                                imageUrlNormal: d.commanderImageUrl || undefined,
                                imageUrlArtCrop: d.commanderImageUrl || undefined,
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
                                  return {
                                    scryfallId: `card_${i}`,
                                    name: stapleName,
                                    cmc: (i % 6) + 1,
                                    typeLine: inferCardTypeLine(stapleName),
                                    colors: [],
                                    colorIdentity: [],
                                    imageUrlNormal: undefined,
                                    imageUrlSmall: undefined,
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
                        <button className="bg-[#2A835F] hover:bg-[#349e73] text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow">
                          Elegir
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 space-y-3">
                    <p className="text-zinc-400 text-sm">
                      No tienes mazos guardados en tu cuenta.
                    </p>
                    <button
                      onClick={() => setImportTab('import')}
                      className="bg-[#2A835F] hover:bg-[#349e73] text-white px-4 py-2 rounded-xl font-bold text-xs shadow"
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
                      className="w-full bg-[#040d0f] border border-[#12544F] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#2A835F]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                      Lista en formato texto (MTG Arena, Moxfield o Archidekt)
                    </label>
                    <textarea
                      rows={6}
                      value={rawDeckText}
                      onChange={e => setRawDeckText(e.target.value)}
                      placeholder={`Commander\n1 Atraxa, Praetors' Voice\n\nDeck\n1 Sol Ring\n1 Command Tower...`}
                      className="w-full bg-[#040d0f] border border-[#12544F] rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-[#2A835F]"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="saveToAcc"
                      checked={saveToAccount}
                      onChange={e => setSaveToAccount(e.target.checked)}
                      className="rounded bg-[#040d0f] border-[#12544F] text-[#2A835F] focus:ring-0 cursor-pointer"
                    />
                    <label htmlFor="saveToAcc" className="text-xs text-zinc-400 cursor-pointer">
                      Guardar también en mi cuenta (para usuarios registrados)
                    </label>
                  </div>

                  <button
                    onClick={handleValidateText}
                    disabled={isValidating}
                    className="w-full bg-[#2A835F] hover:bg-[#349e73] text-white font-bold text-xs py-2 rounded-xl transition-all shadow-md shadow-[#2A835F]/20 disabled:opacity-50 cursor-pointer"
                  >
                    {isValidating ? 'Validando lista con Scryfall...' : 'Validar lista'}
                  </button>

                  {validationResult && (
                    <div className="space-y-2 pt-2 border-t border-[#12544F]">
                      <div className="flex items-center space-x-2 text-xs font-bold">
                        {validationResult.valid ? (
                          <span className="text-[#8BBB92] flex items-center space-x-1">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Mazo válido para Commander (100 cartas)</span>
                          </span>
                        ) : (
                          <span className="text-[#8BBB92] flex items-center space-x-1">
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
                        <div key={i} className="text-[11px] text-[#8BBB92]">
                          &bull; {warn}
                        </div>
                      ))}

                      <button
                        onClick={() =>
                          handleApplySelectedDeck({
                            name: deckNameInput || 'Mazo Importado',
                            commanderName: validationResult.commanderCards[0]?.name || 'Comandante',
                            commanderImageUrl:
                              validationResult.commanderCards[0]?.imageUrlArtCrop ||
                              toArtCropUrl(validationResult.commanderCards[0]?.imageUrlNormal),
                            commanderCards: validationResult.commanderCards,
                            maindeckCards: validationResult.maindeckCards,
                            warnings: validationResult.warnings,
                          })
                        }
                        className="w-full bg-[#2A835F] hover:bg-[#349e73] text-white font-bold text-xs py-2.5 rounded-xl shadow-lg mt-2 cursor-pointer shadow-[#2A835F]/20"
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

      {/* MODAL: INSPECTOR DETALLADO DE MAZO */}
      <DeckInspectorModal
        deck={inspectedPreset}
        isOpen={!!inspectedPreset}
        onClose={() => setInspectedPreset(null)}
        onSelectDeck={deck => {
          handleApplySelectedDeck(deck);
          setIsDeckModalOpen(false);
        }}
        selectButtonLabel="Elegir este Mazo"
      />
    </div>
  );
};
