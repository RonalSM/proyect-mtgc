import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  BookOpen,
  Crown,
  Play,
  Eye,
  Shield,
  Zap,
  Scroll,
  Layers,
  Sparkles,
  Landmark,
  User,
  HelpCircle,
  BarChart2,
} from 'lucide-react';
import type { CardDefinition } from '@mtgc/shared';
import { useCardPreview } from '../context/CardPreviewContext';
import { MtgSymbolIcon } from '../utils/mana-icons';

interface DeckInspectorModalProps {
  deck: {
    id?: string;
    name: string;
    commanderName?: string | null;
    colorIdentity?: string[];
    commanderImageUrl?: string | null;
    commanderCards?: CardDefinition[];
    maindeckCards?: CardDefinition[];
    cardCount?: number;
    rawDecklist?: string | null;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectDeck?: (deck: any) => void;
  selectButtonLabel?: string;
}

// Helper to render mana cost symbols {2}{R}{R}
export const ManaCostRenderer: React.FC<{ cost?: string; size?: 'sm' | 'md' }> = ({
  cost,
  size = 'sm',
}) => {
  if (!cost) return null;
  const symbols = cost.match(/\{[^}]+\}/g);
  if (!symbols || symbols.length === 0) return null;

  return (
    <span className="inline-flex items-center space-x-0.5 align-middle">
      {symbols.map((sym, idx) => (
        <MtgSymbolIcon key={idx} symbol={sym} size={size} />
      ))}
    </span>
  );
};

// Category icon helper
const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'Criaturas':
      return <Shield className="w-3.5 h-3.5 text-amber-400" />;
    case 'Instantáneos':
      return <Zap className="w-3.5 h-3.5 text-sky-400" />;
    case 'Conjuros':
      return <Scroll className="w-3.5 h-3.5 text-orange-400" />;
    case 'Artefactos':
      return <Layers className="w-3.5 h-3.5 text-zinc-300" />;
    case 'Encantamientos':
      return <Sparkles className="w-3.5 h-3.5 text-emerald-400" />;
    case 'Planeswalkers':
      return <User className="w-3.5 h-3.5 text-purple-400" />;
    case 'Tierras':
      return <Landmark className="w-3.5 h-3.5 text-amber-600" />;
    default:
      return <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />;
  }
};

export const DeckInspectorModal: React.FC<DeckInspectorModalProps> = ({
  deck,
  isOpen,
  onClose,
  onSelectDeck,
  selectButtonLabel = 'Jugar con este Mazo',
}) => {
  const { openCardDetails, showPreview, hidePreview } = useCardPreview();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Categorize maindeck cards unconditionally (Rules of Hooks)
  const categorized = useMemo(() => {
    const cats: Record<string, CardDefinition[]> = {
      Criaturas: [],
      Instantáneos: [],
      Conjuros: [],
      Artefactos: [],
      Encantamientos: [],
      Planeswalkers: [],
      Tierras: [],
      Otros: [],
    };

    if (!deck?.maindeckCards) return cats;

    const maindeck = deck.maindeckCards || [];
    maindeck.forEach(card => {
      const typeLine = (card.typeLine || '').toLowerCase();
      if (typeLine.includes('creature')) {
        cats['Criaturas'].push(card);
      } else if (typeLine.includes('instant')) {
        cats['Instantáneos'].push(card);
      } else if (typeLine.includes('sorcery')) {
        cats['Conjuros'].push(card);
      } else if (typeLine.includes('artifact')) {
        cats['Artefactos'].push(card);
      } else if (typeLine.includes('enchantment')) {
        cats['Encantamientos'].push(card);
      } else if (typeLine.includes('planeswalker')) {
        cats['Planeswalkers'].push(card);
      } else if (typeLine.includes('land')) {
        cats['Tierras'].push(card);
      } else {
        cats['Otros'].push(card);
      }
    });

    // Sort each category alphabetically
    Object.keys(cats).forEach(key => {
      cats[key].sort((a, b) => a.name.localeCompare(b.name));
    });

    return cats;
  }, [deck?.maindeckCards]);

  // Filter cards by search and selected category unconditionally
  const filteredCategories = useMemo(() => {
    const result: Record<string, CardDefinition[]> = {};
    const query = searchTerm.toLowerCase().trim();

    Object.entries(categorized).forEach(([category, cards]) => {
      if (cards.length === 0) return;
      if (selectedCategory !== 'all' && selectedCategory !== category) return;

      const matching = cards.filter(c => {
        if (!query) return true;
        return (
          c.name.toLowerCase().includes(query) ||
          (c.typeLine && c.typeLine.toLowerCase().includes(query)) ||
          (c.oracleText && c.oracleText.toLowerCase().includes(query))
        );
      });

      if (matching.length > 0) {
        result[category] = matching;
      }
    });

    return result;
  }, [categorized, searchTerm, selectedCategory]);

  if (!isOpen || !deck) return null;

  const commander = deck.commanderCards?.[0];
  const commanderImage =
    commander?.imageUrlNormal || commander?.imageUrlLarge || deck.commanderImageUrl;

  const totalMaindeck = deck.maindeckCards?.length || 0;
  const totalDeckCount = totalMaindeck + (deck.commanderCards?.length || 1);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-6xl max-h-[92vh] bg-[#092328] border-2 border-[#12544F] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white"
        onClick={e => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#12544F] bg-[#06181c]/80">
          <div className="flex items-center space-x-3.5 min-w-0">
            <div className="p-2 rounded-xl bg-[#12544F] text-[#8BBB92] shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2.5">
                <h2 className="text-xl font-extrabold text-white tracking-tight truncate">
                  {deck.name}
                </h2>
                <div className="flex items-center space-x-1 shrink-0">
                  {deck.colorIdentity && deck.colorIdentity.length > 0 ? (
                    deck.colorIdentity.map(c => <MtgSymbolIcon key={c} symbol={c} size="sm" />)
                  ) : (
                    <MtgSymbolIcon symbol="c" size="sm" />
                  )}
                </div>
              </div>
              <p className="text-xs text-zinc-400 flex items-center space-x-2">
                <span>Commander (EDH)</span>
                <span>&bull;</span>
                <span className="font-mono text-[#8BBB92] font-semibold">
                  {totalDeckCount} Cartas Totales
                </span>
                {deck.commanderName && (
                  <>
                    <span>&bull;</span>
                    <span className="text-zinc-300 truncate">Comandante: {deck.commanderName}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {onSelectDeck && (
              <button
                type="button"
                onClick={() => {
                  onSelectDeck(deck);
                  onClose();
                }}
                className="hidden sm:inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#2A835F] hover:bg-[#349e73] active:bg-[#237050] text-white font-bold text-xs tracking-wide uppercase transition-all shadow-md shadow-[#2A835F]/25 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{selectButtonLabel}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-[#0c2d32] hover:bg-[#12544F] text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY (TWO COLUMNS) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-[#12544F]">
          {/* LEFT COLUMN: COMMANDER FULL CARD & STRATEGY */}
          <div className="lg:col-span-5 p-5 overflow-y-auto space-y-4 bg-[#092328]">
            <div className="flex items-center justify-between border-b border-[#12544F] pb-2">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#8BBB92]">
                <Crown className="w-4 h-4 text-[#8BBB92]" />
                <span>Comandante Oficial</span>
              </div>
              <span className="text-[11px] font-mono text-zinc-400">Carta Canónica</span>
            </div>

            {/* Complete Card Container */}
            <div className="flex flex-col items-center">
              <div
                onClick={() => {
                  if (commander) openCardDetails(commander);
                }}
                className="group relative w-full max-w-[270px] aspect-[63/88] rounded-2xl overflow-hidden shadow-2xl border-2 border-[#12544F] hover:border-[#8BBB92] bg-[#040d0f] transition-all cursor-pointer"
                title="Haz clic para inspeccionar el comandante en grande con reglas y detalles"
              >
                {commanderImage ? (
                  <img
                    src={commanderImage}
                    alt={deck.commanderName || 'Comandante'}
                    className="w-full h-full object-contain select-none transition-transform duration-300 group-hover:scale-[1.02]"
                    loading="eager"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-zinc-500">
                    <Crown className="w-12 h-12 text-[#12544F] mb-3" />
                    <span className="font-bold text-sm text-zinc-300">{deck.commanderName}</span>
                    <span className="text-xs text-zinc-500 mt-1">Sin ilustración disponible</span>
                  </div>
                )}

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                  <span className="px-3.5 py-2 rounded-xl bg-[#092328]/95 border border-[#8BBB92] text-xs font-bold text-white shadow-xl flex items-center space-x-2">
                    <Eye className="w-4 h-4 text-[#8BBB92]" />
                    <span>Ampliar Comandante</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Commander Details & Text Box */}
            {commander && (
              <div className="rounded-xl bg-[#0c2d32] border border-[#12544F] p-4 space-y-3">
                <div className="flex items-start justify-between gap-2 border-b border-[#12544F] pb-2.5">
                  <div>
                    <h3 className="font-extrabold text-base text-white">{commander.name}</h3>
                    <p className="text-xs text-zinc-400">{commander.typeLine}</p>
                  </div>
                  <div className="flex items-center space-x-1 shrink-0">
                    <ManaCostRenderer cost={commander.manaCost} size="md" />
                    {commander.power !== undefined && commander.toughness !== undefined && (
                      <span className="ml-1 text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#12544F] text-[#8BBB92] border border-[#2A835F]/40">
                        {commander.power}/{commander.toughness}
                      </span>
                    )}
                  </div>
                </div>

                {commander.oracleText && (
                  <div className="text-xs text-zinc-200 leading-relaxed font-sans whitespace-pre-wrap max-h-40 overflow-y-auto pr-1">
                    {commander.oracleText}
                  </div>
                )}
              </div>
            )}

            {/* Deck Composition Summary */}
            <div className="rounded-xl bg-[#0c2d32] border border-[#12544F] p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-zinc-300">
                <span className="flex items-center space-x-1.5">
                  <BarChart2 className="w-3.5 h-3.5 text-[#8BBB92]" />
                  <span>Composición del Mazo</span>
                </span>
                <span className="font-mono text-[#8BBB92]">{totalDeckCount} Cartas</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(categorized).map(([cat, list]) => {
                  if (list.length === 0) return null;
                  return (
                    <div
                      key={cat}
                      onClick={() => setSelectedCategory(selectedCategory === cat ? 'all' : cat)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-[#12544F] border-[#8BBB92] text-white font-bold'
                          : 'bg-[#092328] border-[#12544F] text-zinc-300 hover:border-[#2A835F]'
                      }`}
                    >
                      <span className="flex items-center space-x-1.5 truncate">
                        {getCategoryIcon(cat)}
                        <span className="truncate">{cat}</span>
                      </span>
                      <span className="font-mono text-[#8BBB92] font-semibold">{list.length}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mobile/Sidebar Play CTA */}
            {onSelectDeck && (
              <button
                type="button"
                onClick={() => {
                  onSelectDeck(deck);
                  onClose();
                }}
                className="w-full py-3 px-4 rounded-xl bg-[#2A835F] hover:bg-[#349e73] active:bg-[#237050] text-white font-bold text-xs tracking-wide uppercase transition-all shadow-lg shadow-[#2A835F]/20 cursor-pointer flex items-center justify-center space-x-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{selectButtonLabel}</span>
              </button>
            )}
          </div>

          {/* RIGHT COLUMN: CATEGORIZED 100-CARD LIST */}
          <div className="lg:col-span-7 flex flex-col h-full overflow-hidden bg-[#071d21]">
            {/* Search and Filters Bar */}
            <div className="p-4 border-b border-[#12544F] space-y-3 bg-[#06181c]/60">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Buscar carta en este mazo por nombre, tipo o texto..."
                  className="w-full bg-[#040d0f] border border-[#12544F] focus:border-[#2A835F] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === 'all'
                      ? 'bg-[#2A835F] text-white shadow-sm'
                      : 'bg-[#0c2d32] border border-[#12544F] text-zinc-300 hover:text-white'
                  }`}
                >
                  Todas ({totalMaindeck})
                </button>
                {Object.entries(categorized).map(([cat, list]) => {
                  if (list.length === 0) return null;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-[#2A835F] text-white shadow-sm'
                          : 'bg-[#0c2d32] border border-[#12544F] text-zinc-300 hover:text-white'
                      }`}
                    >
                      {getCategoryIcon(cat)}
                      <span>{cat}</span>
                      <span className="font-mono text-[11px] opacity-80">({list.length})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scrollable Card List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {Object.keys(filteredCategories).length === 0 ? (
                <div className="py-16 text-center text-zinc-400 space-y-2">
                  <BookOpen className="w-10 h-10 text-zinc-600 mx-auto" />
                  <p className="text-sm font-semibold">No se encontraron cartas</p>
                  <p className="text-xs text-zinc-500">
                    Intenta cambiar el término de búsqueda o categoría.
                  </p>
                </div>
              ) : (
                Object.entries(filteredCategories).map(([category, cards]) => (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center justify-between border-b border-[#12544F] pb-1.5 px-1">
                      <div className="flex items-center space-x-2 text-xs font-bold text-white uppercase tracking-wider">
                        {getCategoryIcon(category)}
                        <span>{category}</span>
                      </div>
                      <span className="text-xs font-mono text-[#8BBB92] font-semibold">
                        {cards.length} {cards.length === 1 ? 'carta' : 'cartas'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {cards.map((card, idx) => (
                        <div
                          key={
                            card.scryfallId ? `${card.scryfallId}-${idx}` : `${card.name}-${idx}`
                          }
                          onMouseEnter={e => showPreview(card, e)}
                          onMouseLeave={hidePreview}
                          onClick={() => openCardDetails(card)}
                          className="group flex items-center justify-between px-3 py-2 rounded-xl bg-[#092328] hover:bg-[#0c2d32] border border-[#12544F] hover:border-[#8BBB92]/60 transition-all cursor-pointer shadow-sm"
                          title="Clic para ver detalles completos de la carta"
                        >
                          <div className="flex items-center space-x-2 min-w-0 pr-1">
                            <span className="font-mono text-[11px] font-bold text-[#8BBB92] bg-[#040d0f] px-1.5 py-0.5 rounded border border-[#12544F] shrink-0">
                              1x
                            </span>
                            <span className="text-xs font-semibold text-white group-hover:text-[#8BBB92] truncate transition-colors">
                              {card.name}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1.5 shrink-0">
                            <ManaCostRenderer cost={card.manaCost} size="sm" />
                            <Eye className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white transition-colors" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-3.5 border-t border-[#12544F] bg-[#06181c]/80 flex items-center justify-between">
          <div className="text-xs text-zinc-400">
            Haz clic en cualquier carta para ver sus rulings oficiales y arte completo.
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#0c2d32] hover:bg-[#12544F] text-zinc-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Cerrar
            </button>
            {onSelectDeck && (
              <button
                type="button"
                onClick={() => {
                  onSelectDeck(deck);
                  onClose();
                }}
                className="px-5 py-2 rounded-xl bg-[#2A835F] hover:bg-[#349e73] active:bg-[#237050] text-white font-bold text-xs tracking-wide uppercase transition-all shadow-md shadow-[#2A835F]/20 cursor-pointer flex items-center space-x-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{selectButtonLabel}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
