import React, { useState, useEffect, useMemo } from 'react';
import {
  getCardDisplayData,
  getCardImageUrl,
  type CardDefinition,
  type GameActionType,
  type RoomState,
  type CardColor,
} from '@mtgc/shared';
import { Portal } from './Portal';
import { X, Search, Sparkles, Plus, Layers } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const COMMON_TOKENS_CLIENT: CardDefinition[] = [
  {
    scryfallId: 'cb7b5024-3a0b-4f14-977e-ba6c4c2567c9',
    name: 'Treasure',
    cmc: 0,
    typeLine: 'Token Artifact — Treasure',
    oracleText: '{T}, Sacrifice this token: Add one mana of any color.',
    colors: [],
    colorIdentity: [],
    imageUrlNormal:
      'https://cards.scryfall.io/normal/front/c/b/cb7b5024-3a0b-4f14-977e-ba6c4c2567c9.jpg?1783915244',
    imageUrlSmall:
      'https://cards.scryfall.io/small/front/c/b/cb7b5024-3a0b-4f14-977e-ba6c4c2567c9.jpg?1783915244',
    artist: 'Alayna Danner',
  },
  {
    scryfallId: 'da1fca2e-4ea7-4c5f-bd58-f9529dfb6f37',
    name: 'Food',
    cmc: 0,
    typeLine: 'Token Artifact — Food',
    oracleText: '{2}, {T}, Sacrifice this token: You gain 3 life.',
    colors: [],
    colorIdentity: [],
    imageUrlNormal:
      'https://cards.scryfall.io/normal/front/d/a/da1fca2e-4ea7-4c5f-bd58-f9529dfb6f37.jpg?1783903567',
    imageUrlSmall:
      'https://cards.scryfall.io/small/front/d/a/da1fca2e-4ea7-4c5f-bd58-f9529dfb6f37.jpg?1783903567',
    artist: 'Titus Lunter',
  },
  {
    scryfallId: '1481e938-7763-4109-b313-2a21053a82df',
    name: 'Clue',
    cmc: 0,
    typeLine: 'Token Artifact — Clue',
    oracleText: '{2}, Sacrifice this token: Draw a card.',
    colors: [],
    colorIdentity: [],
    imageUrlNormal:
      'https://cards.scryfall.io/normal/front/1/4/1481e938-7763-4109-b313-2a21053a82df.jpg?1789754721',
    imageUrlSmall:
      'https://cards.scryfall.io/small/front/1/4/1481e938-7763-4109-b313-2a21053a82df.jpg?1789754721',
    artist: 'Franz Vohwinkel',
  },
  {
    scryfallId: '92a3afe7-bd9f-43f9-adc3-4819e60dc7a5',
    name: 'Blood',
    cmc: 0,
    typeLine: 'Token Artifact — Blood',
    oracleText: '{1}, {T}, Discard a card, Sacrifice this token: Draw a card.',
    colors: [],
    colorIdentity: [],
    imageUrlNormal:
      'https://cards.scryfall.io/normal/front/9/2/92a3afe7-bd9f-43f9-adc3-4819e60dc7a5.jpg?1783907965',
    imageUrlSmall:
      'https://cards.scryfall.io/small/front/9/2/92a3afe7-bd9f-43f9-adc3-4819e60dc7a5.jpg?1783907965',
    artist: 'Brian Valeza',
  },
  {
    scryfallId: '91613970-c25c-4959-b5b0-b6e2a7657634',
    name: 'Map',
    cmc: 0,
    typeLine: 'Token Artifact — Map',
    oracleText:
      '{1}, {T}, Sacrifice this artifact: Target creature you control explores. Activate only as a sorcery.',
    colors: [],
    colorIdentity: [],
    imageUrlNormal:
      'https://cards.scryfall.io/normal/front/9/1/91613970-c25c-4959-b5b0-b6e2a7657634.jpg?1789737819',
    imageUrlSmall:
      'https://cards.scryfall.io/small/front/9/1/91613970-c25c-4959-b5b0-b6e2a7657634.jpg?1789737819',
    artist: 'Sam Burley',
  },
];

interface DeckTokenGroup {
  sourceCard: string;
  tokens: CardDefinition[];
}

export interface CreateTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  localPlayerId: string;
  roomState?: RoomState;
  onAction: (type: GameActionType, payload: unknown) => void;
}

export const CreateTokenModal: React.FC<CreateTokenModalProps> = ({
  isOpen,
  onClose,
  localPlayerId,
  roomState,
  onAction,
}) => {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'deck' | 'common' | 'custom'>('deck');
  const [deckGroups, setDeckGroups] = useState<DeckTokenGroup[]>([]);
  const [isLoadingDeck, setIsLoadingDeck] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Formulario de ficha personalizada
  const [customName, setCustomName] = useState('');
  const [customPower, setCustomPower] = useState('1');
  const [customToughness, setCustomToughness] = useState('1');
  const [customTypeLine, setCustomTypeLine] = useState('Token Creature');
  const [customColors, setCustomColors] = useState<CardColor[]>([]);

  // Cargar fichas del mazo del jugador cuando se abre el modal
  useEffect(() => {
    if (!isOpen || !roomState) return;

    const zones = roomState.playerZones[localPlayerId];
    if (!zones) return;

    const allCards = [
      ...(zones.library || []),
      ...(zones.hand || []),
      ...(zones.battlefield || []),
      ...(zones.graveyard || []),
      ...(zones.exile || []),
      ...(zones.command || []),
    ];

    const cardNames = Array.from(new Set(allCards.map(c => c.definition.name).filter(Boolean)));
    if (cardNames.length === 0) {
      setDeckGroups([]);
      return;
    }

    setIsLoadingDeck(true);
    fetch('/api/decks/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardNames }),
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.deckTokens)) {
          setDeckGroups(data.deckTokens);
        }
      })
      .catch(err => {
        console.warn('Error fetching deck tokens:', err);
      })
      .finally(() => {
        setIsLoadingDeck(false);
      });
  }, [isOpen, roomState, localPlayerId]);

  const handleCreateToken = (token: CardDefinition) => {
    onAction('CREATE_TOKEN', {
      tokenDefinition: token,
      targetPlayerId: localPlayerId,
    });
    onClose();
  };

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const customToken: CardDefinition = {
      scryfallId: `custom-${Date.now()}`,
      name: customName.trim(),
      cmc: 0,
      typeLine: customTypeLine.trim() || 'Ficha',
      power: customPower.trim() || undefined,
      toughness: customToughness.trim() || undefined,
      colors: customColors,
      colorIdentity: customColors,
      oracleText: '',
      copyright: 'Custom Token',
    };

    handleCreateToken(customToken);
  };

  // Filtrado por buscador para fichas del mazo
  const filteredDeckGroups = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return deckGroups;

    return deckGroups
      .map(group => {
        const matchesSource = group.sourceCard.toLowerCase().includes(q);
        const matchedTokens = group.tokens.filter(
          t =>
            matchesSource ||
            t.name.toLowerCase().includes(q) ||
            t.typeLine.toLowerCase().includes(q),
        );
        if (matchedTokens.length > 0) {
          return { sourceCard: group.sourceCard, tokens: matchedTokens };
        }
        return null;
      })
      .filter((g): g is DeckTokenGroup => g !== null);
  }, [deckGroups, searchQuery]);

  if (!isOpen) return null;

  const colorOptions: { color: CardColor; label: string; bg: string }[] = [
    { color: 'W', label: 'Blanco (W)', bg: 'bg-amber-100 text-slate-900' },
    { color: 'U', label: 'Azul (U)', bg: 'bg-blue-600 text-white' },
    { color: 'B', label: 'Negro (B)', bg: 'bg-slate-800 text-slate-100 border border-slate-600' },
    { color: 'R', label: 'Rojo (R)', bg: 'bg-rose-600 text-white' },
    { color: 'G', label: 'Verde (G)', bg: 'bg-emerald-600 text-white' },
  ];

  return (
    <Portal>
      <div
        data-testid="create-token-backdrop"
        className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        onClick={e => {
          e.stopPropagation();
          onClose();
        }}
        onDoubleClick={e => e.stopPropagation()}
        onPointerDown={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
        onContextMenu={e => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <div
          data-testid="create-token-modal"
          className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden text-slate-100"
          onClick={e => e.stopPropagation()}
          onDoubleClick={e => e.stopPropagation()}
          onPointerDown={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
          onContextMenu={e => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
            <div className="flex items-center space-x-2.5">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold tracking-tight text-white">
                Crear Ficha en la Mesa
              </h2>
            </div>
            <button
              type="button"
              data-testid="close-create-token-modal-btn"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navegación por pestañas (a, b, c) */}
          <div className="flex border-b border-slate-800 bg-slate-950/60 px-6 pt-2 space-x-2">
            <button
              type="button"
              data-testid="tab-deck-tokens"
              onClick={() => setActiveTab('deck')}
              className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 flex items-center space-x-1.5 ${
                activeTab === 'deck'
                  ? 'border-amber-400 text-amber-300 bg-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>
                Fichas de mi mazo ({deckGroups.reduce((acc, g) => acc + g.tokens.length, 0)})
              </span>
            </button>

            <button
              type="button"
              data-testid="tab-common-tokens"
              onClick={() => setActiveTab('common')}
              className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 flex items-center space-x-1.5 ${
                activeTab === 'common'
                  ? 'border-amber-400 text-amber-300 bg-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <i className="ms ms-token text-xs" aria-hidden="true" />
              <span>Fichas comunes ({COMMON_TOKENS_CLIENT.length})</span>
            </button>

            <button
              type="button"
              data-testid="tab-custom-token"
              onClick={() => setActiveTab('custom')}
              className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 flex items-center space-x-1.5 ${
                activeTab === 'custom'
                  ? 'border-amber-400 text-amber-300 bg-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ficha personalizada</span>
            </button>
          </div>

          {/* Contenido de la pestaña activa */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* TAB (a): Fichas del mazo del jugador */}
            {activeTab === 'deck' && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    data-testid="token-search-input"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Buscar ficha o carta de origen..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>

                {isLoadingDeck ? (
                  <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
                    Cargando fichas asociadas a las cartas de tu mazo...
                  </div>
                ) : filteredDeckGroups.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    {searchQuery
                      ? 'No se encontraron fichas que coincidan con la búsqueda.'
                      : 'Ninguna carta de tu mazo genera fichas registradas en Scryfall (o puedes crearlas en "Fichas comunes" o "Ficha personalizada").'}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredDeckGroups.map(group => (
                      <div
                        key={group.sourceCard}
                        className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2.5"
                      >
                        <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-400">
                          <Layers className="w-3.5 h-3.5" />
                          <span>{group.sourceCard}</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {group.tokens.map(token => {
                            const display = getCardDisplayData(token, language);
                            return (
                              <div
                                key={token.scryfallId || token.name}
                                data-testid={`deck-token-item-${token.name.toLowerCase().replace(/\s+/g, '-')}`}
                                className="flex items-center justify-between p-2.5 bg-slate-900 border border-slate-800 hover:border-amber-400/60 rounded-xl transition-all group"
                              >
                                <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                                  {getCardImageUrl(token, { size: 'small', lang: language }) ? (
                                    <img
                                      src={getCardImageUrl(token, { size: 'small', lang: language })}
                                      alt={display.name}
                                      className="w-10 h-14 object-cover rounded shadow flex-shrink-0"
                                    />
                                  ) : (
                                    <div className="w-10 h-14 bg-slate-800 rounded flex items-center justify-center flex-shrink-0 text-slate-500 text-[10px]">
                                      Ficha
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                                      {display.name}
                                    </div>
                                    <div className="text-[10px] text-slate-400 truncate">
                                      {display.typeLine}
                                    </div>
                                    {(token.power !== undefined ||
                                      token.toughness !== undefined) && (
                                      <div className="text-[11px] font-mono font-bold text-amber-400">
                                        {token.power}/{token.toughness}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  data-testid={`create-deck-token-${token.name.toLowerCase().replace(/\s+/g, '-')}`}
                                  onClick={() => handleCreateToken(token)}
                                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center space-x-1 flex-shrink-0 cursor-pointer shadow"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Crear</span>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB (b): Fichas comunes */}
            {activeTab === 'common' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {COMMON_TOKENS_CLIENT.map(token => {
                  const display = getCardDisplayData(token, language);
                  return (
                    <div
                      key={token.name}
                      data-testid={`common-token-item-${token.name.toLowerCase()}`}
                      className="flex items-center justify-between p-3 bg-slate-950/70 border border-slate-800 hover:border-amber-400/60 rounded-xl transition-all group"
                    >
                      <div className="flex items-center space-x-3 min-w-0 pr-2">
                        <img
                          src={getCardImageUrl(token, { size: 'small', lang: language })}
                          alt={display.name}
                          className="w-12 h-16 object-cover rounded shadow flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                            {display.name}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {display.typeLine}
                          </div>
                          <div className="text-[9px] text-slate-400 line-clamp-2 mt-0.5 leading-tight">
                            {display.oracleText}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        data-testid={`create-common-token-${token.name.toLowerCase()}`}
                        onClick={() => handleCreateToken(token)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center space-x-1 flex-shrink-0 cursor-pointer shadow"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Crear</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB (c): Ficha personalizada */}
            {activeTab === 'custom' && (
              <form onSubmit={handleCreateCustom} className="space-y-4 max-w-lg mx-auto">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Nombre de la ficha *</label>
                  <input
                    type="text"
                    required
                    data-testid="custom-token-name-input"
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    placeholder="Ej: Soldado, Bestia, Goblin..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Poder</label>
                    <input
                      type="text"
                      data-testid="custom-token-power-input"
                      value={customPower}
                      onChange={e => setCustomPower(e.target.value)}
                      placeholder="Ej: 1 o *"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Resistencia</label>
                    <input
                      type="text"
                      data-testid="custom-token-toughness-input"
                      value={customToughness}
                      onChange={e => setCustomToughness(e.target.value)}
                      placeholder="Ej: 1 o *"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Línea de tipo</label>
                  <input
                    type="text"
                    data-testid="custom-token-typeline-input"
                    value={customTypeLine}
                    onChange={e => setCustomTypeLine(e.target.value)}
                    placeholder="Ej: Criatura — Soldado"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Colores</label>
                  <div className="flex flex-wrap gap-2">
                    {colorOptions.map(({ color, label, bg }) => {
                      const isSelected = customColors.includes(color);
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setCustomColors(customColors.filter(c => c !== color));
                            } else {
                              setCustomColors([...customColors, color]);
                            }
                          }}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer border ${
                            isSelected
                              ? `${bg} border-white shadow`
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    data-testid="create-custom-token-btn"
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors flex items-center justify-center space-x-2 cursor-pointer shadow-lg"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Crear Ficha Personalizada</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
};
