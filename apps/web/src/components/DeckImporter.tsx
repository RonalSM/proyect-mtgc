import React, { useState } from 'react';
import { parseDecklist, validateCommanderDeck, type CardDefinition } from '@mtgc/shared';
import { Layers, AlertTriangle, CheckCircle2, XCircle, Search, UploadCloud, X } from 'lucide-react';
import { MtgSymbolIcon } from '../utils/mana-icons';

interface DeckImporterProps {
  onDeckLoaded?: (commander: CardDefinition, cardsCount: number) => void;
  onClose?: () => void;
}

export const DeckImporter: React.FC<DeckImporterProps> = ({ onDeckLoaded, onClose }) => {
  const [deckText, setDeckText] = useState(`// Comandante
1 Atraxa, Praetors' Voice *CMDR*

// Mazos y Ramp
1 Sol Ring
1 Arcane Signet
1 Command Tower
1 Fellwar Stone
1 Cultivate
1 Kodama's Reach
1 Swords to Plowshares
1 Cyclonic Rift
1 Demonic Tutor
1 Rhystic Study
1 Smothering Tithe
1 The Ozolith
1 Doubling Season
1 Deepglow Skate
1 Evolution Sage
1 Flux Channeler
1 Thrummingbird
1 Karn's Bastion
1 Inexorable Tide
1 Vorinclex, Monstrous Raider
1 Contagion Engine
1 Teferi, Temporal Archmage
1 Tamiyo, Field Researcher
1 Narset, Parter of Veils
1 Vraska, Betrayal's Sting
1 Ajani Steadfast
1 Elspeth, Sun's Champion
1 Ugin, the Spirit Dragon
1 Heroic Intervention
1 Teferi's Protection
1 Anguished Unmaking
1 Assassin's Trophy
1 Toxic Deluge
1 Supreme Verdict
1 Farseek
1 Nature's Lore
1 Three Visits
1 Sylvan Library
1 Mystic Remora
1 Esper Sentinel
1 Birds of Paradise
1 Noble Hierarch
1 Bloom Tender
1 Faeburrow Elder
1 Corpsejack Menace
1 Vorel of the Hull Clade
1 Pir, Imaginative Rascal
1 Toothy, Imaginary Friend
1 Shalai, Voice of Plenty
1 Spark Double
1 Clever Impersonator
1 Astral Cornucopia
1 Everflowing Chalice
1 Golgari Signet
1 Simic Signet
1 Orzhov Signet
1 Dimir Signet
1 Selesnya Signet
1 Azorius Signet
1 Exotic Orchard
1 City of Brass
1 Mana Confluence
1 Reflecting Pool
1 Overgrown Tomb
1 Watery Grave
1 Temple Garden
1 Hallowed Fountain
1 Breeding Pool
1 Godless Shrine
1 Zagoth Triome
1 Indatha Triome
1 Raffine's Tower
1 Spara's Headquarters
1 Verdant Catacombs
1 Misty Rainforest
1 Polluted Delta
1 Flooded Strand
1 Windswept Heath
1 Marsh Flats
1 Command Beacon
1 Reliquary Tower
1 Bojuka Bog
1 Yavimaya, Cradle of Growth
1 Urborg, Tomb of Yawgmoth
2 Plains
2 Island
2 Swamp
2 Forest`);

  const [validationResult, setValidationResult] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleAutocomplete = async (q: string) => {
    setSearchQuery(q);
    if (!q || q.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const res = await fetch(`/api/cards/autocomplete?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.data || []);
      }
    } catch {
      // Ignorar fallos de red en autocompletado
    } finally {
      setIsSearching(false);
    }
  };

  const addCardToDeck = (cardName: string) => {
    setDeckText(prev => `${prev.trim()}\n1 ${cardName}`);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleValidateAndImport = async () => {
    try {
      setIsValidating(true);
      const res = await fetch('/api/decks/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decklist: deckText }),
      });

      if (res.ok) {
        const data = await res.json();
        setValidationResult(data.validation);

        if (data.commanderCards && data.commanderCards.length > 0) {
          const mainCommander = data.commanderCards[0].card;
          onDeckLoaded?.(mainCommander, data.validation.totalCards);
        }
      } else {
        const parsed = parseDecklist(deckText);
        const commanderCards: any[] = parsed.commanderEntries.map(c => ({
          card: {
            scryfallId: `cmd_${c.cardName}`,
            name: c.cardName,
            typeLine: 'Legendary Creature',
          },
          quantity: c.quantity,
          isCommander: true,
        }));
        const maindeckCards: any[] = parsed.maindeckEntries.map(c => ({
          card: { scryfallId: `card_${c.cardName}`, name: c.cardName, typeLine: 'Spell' },
          quantity: c.quantity,
          isCommander: false,
        }));
        const val = validateCommanderDeck(commanderCards, maindeckCards);
        setValidationResult(val);
      }
    } catch {
      const parsed = parseDecklist(deckText);
      const commanderCards: any[] = parsed.commanderEntries.map(c => ({
        card: { scryfallId: `cmd_${c.cardName}`, name: c.cardName, typeLine: 'Legendary Creature' },
        quantity: c.quantity,
        isCommander: true,
      }));
      const maindeckCards: any[] = parsed.maindeckEntries.map(c => ({
        card: { scryfallId: `card_${c.cardName}`, name: c.cardName, typeLine: 'Spell' },
        quantity: c.quantity,
        isCommander: false,
      }));
      const val = validateCommanderDeck(commanderCards, maindeckCards);
      setValidationResult(val);
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="w-full bg-[#092328] border border-[#12544F] rounded-2xl p-6 sm:p-7 shadow-2xl space-y-6 text-white max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#12544F] pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-[#0c2d32] border border-[#12544F] text-[#8BBB92]">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">
              Validador e Importador de Mazos EDH
            </h2>
            <p className="text-xs text-zinc-400">
              Compatible con formato texto plano, Moxfield, Archidekt y MTGA
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar importador de mazos"
            title="Cerrar importador de mazos"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#0c2d32] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Textarea & Search */}
        <div className="lg:col-span-7 space-y-4">
          {/* Autocomplete Search */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => handleAutocomplete(e.target.value)}
              placeholder="Buscar carta en Scryfall para añadir (ej. Sol Ring, Rhystic Study)..."
              aria-label="Buscar carta en Scryfall para añadir"
              className="w-full bg-[#040d0f] border border-[#12544F] focus:border-[#2A835F] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
            />
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
            {isSearching && (
              <span className="absolute right-3.5 top-2.5 text-[11px] text-[#8BBB92] animate-pulse font-mono">
                Buscando...
              </span>
            )}

            {searchResults.length > 0 && (
              <div className="absolute z-30 left-0 right-0 mt-1.5 bg-[#0c2d32] border border-[#12544F] rounded-xl shadow-2xl overflow-hidden max-h-52 overflow-y-auto">
                {searchResults.map(cardName => (
                  <button
                    key={cardName}
                    type="button"
                    onClick={() => addCardToDeck(cardName)}
                    className="w-full text-left px-4 py-2 text-xs text-zinc-200 hover:bg-[#2A835F]/20 hover:text-[#8BBB92] transition-colors border-b border-[#12544F] last:border-0 flex items-center justify-between cursor-pointer"
                  >
                    <span>{cardName}</span>
                    <span className="text-[10px] text-zinc-400 font-mono">+ Añadir</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Text Area */}
          <textarea
            value={deckText}
            onChange={e => setDeckText(e.target.value)}
            rows={13}
            aria-label="Lista de cartas del mazo"
            className="w-full font-mono text-xs bg-[#040d0f] border border-[#12544F] focus:border-[#2A835F] rounded-xl p-4 text-zinc-200 focus:outline-none leading-relaxed resize-y"
            placeholder="1 Atraxa, Praetors' Voice *CMDR*&#10;1 Sol Ring..."
          />

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setDeckText('')}
              className="text-xs text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
            >
              Limpiar texto
            </button>
            <button
              type="button"
              onClick={handleValidateAndImport}
              disabled={isValidating}
              className="bg-[#2A835F] hover:bg-[#349e73] active:bg-[#237050] text-white font-bold px-5 py-2.5 rounded-xl text-xs tracking-wide uppercase transition-all shadow-md shadow-[#2A835F]/20 flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{isValidating ? 'Validando con Scryfall...' : 'Validar y Cargar Mazo'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Validation Report */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#0c2d32] border border-[#12544F] rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Diagnóstico de Reglas Commander
            </h3>

            {!validationResult ? (
              <div className="text-xs text-zinc-400 py-10 text-center space-y-2">
                <Layers className="w-8 h-8 text-zinc-600 mx-auto" />
                <p>
                  Presiona "Validar y Cargar Mazo" para analizar total de cartas, singleton e
                  identidad de color.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div
                  className={`p-3 rounded-xl border flex items-start space-x-3 ${
                    validationResult.isValid
                      ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-600/50 text-rose-300'
                  }`}
                >
                  {validationResult.isValid ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wide">
                      {validationResult.isValid
                        ? 'Mazo Legal en Commander'
                        : 'Errores de Validación'}
                    </h4>
                    <p className="text-[11px] text-zinc-300 mt-0.5">
                      Total: {validationResult.totalCards}/100 cartas &bull; Comandante:{' '}
                      {validationResult.commanderCount}
                    </p>
                  </div>
                </div>

                {/* Color Identity */}
                {validationResult.commanderColorIdentity && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">
                      Identidad de Color
                    </span>
                    <div className="flex items-center space-x-1.5">
                      {validationResult.commanderColorIdentity.length === 0 ? (
                        <MtgSymbolIcon symbol="c" size="md" />
                      ) : (
                        validationResult.commanderColorIdentity.map((c: string) => (
                          <MtgSymbolIcon key={c} symbol={c} size="md" />
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Error list */}
                {validationResult.errors?.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center space-x-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Infracciones detectadas ({validationResult.errors.length})</span>
                    </span>
                    <ul className="text-xs space-y-1 text-rose-300">
                      {validationResult.errors.map((err: string, i: number) => (
                        <li
                          key={i}
                          className="bg-rose-950/30 p-2 rounded-lg border border-rose-900/40 text-[11px]"
                        >
                          &bull; {err}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Warnings list */}
                {validationResult.warnings?.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Advertencias ({validationResult.warnings.length})</span>
                    </span>
                    <ul className="text-xs space-y-1 text-amber-200">
                      {validationResult.warnings.map((warn: string, i: number) => (
                        <li
                          key={i}
                          className="bg-amber-950/30 p-2 rounded-lg border border-amber-900/40 text-[11px]"
                        >
                          &bull; {warn}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
