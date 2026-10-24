import React, { useState } from 'react';
import { parseDecklist, validateCommanderDeck, type CardDefinition } from '@mtgc/shared';
import { Layers, AlertTriangle, CheckCircle2, XCircle, Search, UploadCloud } from 'lucide-react';

interface DeckImporterProps {
  onDeckLoaded?: (commander: CardDefinition, cardsCount: number) => void;
}

export const DeckImporter: React.FC<DeckImporterProps> = ({ onDeckLoaded }) => {
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

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleAutocomplete = async (val: string) => {
    setSearchQuery(val);
    if (val.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/cards/autocomplete?q=${encodeURIComponent(val)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleValidateAndImport = async () => {
    setIsValidating(true);
    try {
      // 1. First parse locally
      const parsed = parseDecklist(deckText);

      // 2. Validate on server with full Scryfall collections & color identities
      const res = await fetch('/api/decks/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decklist: deckText }),
      });

      if (res.ok) {
        const data = await res.json();
        setValidationResult(data.validation);

        if (data.commanderCards?.[0]?.card && onDeckLoaded) {
          onDeckLoaded(data.commanderCards[0].card, data.validation.totalCards);
        }
      } else {
        // Fallback local validation
        const localCommander = parsed.commanderEntries.map(e => ({
          card: {
            scryfallId: 'cmd',
            name: e.cardName,
            cmc: 4,
            typeLine: 'Legendary Creature',
            colors: ['W', 'U', 'B', 'G'] as any,
            colorIdentity: ['W', 'U', 'B', 'G'] as any,
          },
          quantity: e.quantity,
          isCommander: true,
        }));
        const localMain = parsed.maindeckEntries.map(e => ({
          card: {
            scryfallId: 'c',
            name: e.cardName,
            cmc: 2,
            typeLine: 'Card',
            colors: [],
            colorIdentity: [],
          },
          quantity: e.quantity,
          isCommander: false,
        }));
        const localVal = validateCommanderDeck(localCommander, localMain);
        setValidationResult(localVal);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsValidating(false);
    }
  };

  const addCardToDeck = (name: string) => {
    setDeckText(prev => `${prev}\n1 ${name}`);
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
      {/* Left 2 Cols: Textarea & Search */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-[#0c101a]/90 border border-zinc-800/90 rounded-2xl p-6 shadow-2xl backdrop-blur-xl ring-1 ring-white/5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <h2 className="text-base font-cinzel font-bold flex items-center space-x-2.5 text-zinc-100">
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Layers className="w-4 h-4" />
              </span>
              <span>Importar Lista de Mazos (Commander)</span>
            </h2>
            <span className="text-xs text-zinc-400 font-medium">
              Formatos Moxfield, Archidekt y MTGA
            </span>
          </div>

          {/* Scryfall Card Autocomplete Search Bar */}
          <div className="relative">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => handleAutocomplete(e.target.value)}
                placeholder="Buscar carta en Scryfall para añadir (ej. Sol Ring, Rhystic Study)..."
                className="w-full bg-[#080b11] border border-zinc-800 focus:border-amber-400/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none transition-all shadow-inner"
              />
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
              {isSearching && (
                <span className="absolute right-3.5 top-2.5 text-[11px] text-amber-400 animate-pulse font-mono">
                  Buscando...
                </span>
              )}
            </div>

            {/* Dropdown Results */}
            {searchResults.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1.5 bg-[#0b0f17] border border-zinc-700/80 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto backdrop-blur-md">
                {searchResults.map(cardName => (
                  <button
                    key={cardName}
                    onClick={() => addCardToDeck(cardName)}
                    className="w-full text-left px-4 py-2.5 text-sm text-zinc-200 hover:bg-amber-500/10 hover:text-amber-300 transition-colors border-b border-zinc-800/60 last:border-0 flex items-center justify-between cursor-pointer"
                  >
                    <span className="font-medium">{cardName}</span>
                    <span className="text-[11px] font-mono text-zinc-500">+ Añadir</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <textarea
            value={deckText}
            onChange={e => setDeckText(e.target.value)}
            rows={15}
            className="w-full font-mono text-xs bg-[#080b11] border border-zinc-800 focus:border-amber-400/80 rounded-xl p-4 text-zinc-200 focus:outline-none leading-relaxed resize-y shadow-inner"
            placeholder="1 Atraxa, Praetors' Voice *CMDR*&#10;1 Sol Ring&#10;1 Arcane Signet..."
          />

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => setDeckText('')}
              className="text-xs text-slate-400 hover:text-rose-400 transition-colors"
            >
              Limpiar texto
            </button>
            <button
              onClick={handleValidateAndImport}
              disabled={isValidating}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-5 py-2.5 rounded-lg text-sm transition-all shadow-lg shadow-amber-500/20 active:scale-[0.98] flex items-center space-x-2 disabled:opacity-50"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{isValidating ? 'Validando con Scryfall...' : 'Validar y Cargar Mazo'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Right Col: Validation Report & Rules */}
      <div className="space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
            <span>Diagnóstico de Reglas Commander</span>
          </h3>

          {!validationResult ? (
            <div className="text-xs text-slate-400 py-6 text-center space-y-2">
              <Layers className="w-8 h-8 text-slate-600 mx-auto" />
              <p>
                Presiona "Validar y Cargar Mazo" para analizar el total de cartas, singleton y
                colores.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Overall status banner */}
              <div
                className={`p-3 rounded-lg border flex items-start space-x-3 ${
                  validationResult.isValid
                    ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                    : 'bg-rose-950/30 border-rose-800/60 text-rose-300'
                }`}
              >
                {validationResult.isValid ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="font-semibold text-sm">
                    {validationResult.isValid ? 'Mazo Legal en Commander' : 'Errores de Validación'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Total: {validationResult.totalCards}/100 cartas &bull; Comandante:{' '}
                    {validationResult.commanderCount}
                  </p>
                </div>
              </div>

              {/* Color Identity Badges */}
              {validationResult.commanderColorIdentity && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-medium text-slate-400 block uppercase">
                    Identidad de Color
                  </span>
                  <div className="flex items-center space-x-1.5">
                    {validationResult.commanderColorIdentity.length === 0 ? (
                      <span className="text-xs text-slate-400 px-2 py-0.5 bg-slate-800 rounded">
                        Incoloro
                      </span>
                    ) : (
                      validationResult.commanderColorIdentity.map((c: string) => {
                        const bgMap: Record<string, string> = {
                          W: 'bg-amber-100 text-slate-900',
                          U: 'bg-sky-500 text-white',
                          B: 'bg-slate-700 text-slate-100',
                          R: 'bg-rose-600 text-white',
                          G: 'bg-emerald-600 text-white',
                        };
                        return (
                          <span
                            key={c}
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow ${
                              bgMap[c] || 'bg-slate-700'
                            }`}
                          >
                            {c}
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Error list */}
              {validationResult.errors?.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-medium text-rose-400 block uppercase flex items-center space-x-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Infracciones detectadas ({validationResult.errors.length})</span>
                  </span>
                  <ul className="text-xs space-y-1.5 text-rose-200">
                    {validationResult.errors.map((err: string, i: number) => (
                      <li key={i} className="bg-rose-950/20 p-2 rounded border border-rose-900/30">
                        &bull; {err}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warning list (Cartas prohibidas / advertencias informativas - REQ-8.3, REQ-8.4) */}
              {validationResult.warnings?.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-medium text-amber-400 block uppercase flex items-center space-x-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>
                      Advertencias y cartas prohibidas ({validationResult.warnings.length})
                    </span>
                  </span>
                  <ul className="text-xs space-y-1.5 text-amber-200">
                    {validationResult.warnings.map((warn: string, i: number) => (
                      <li
                        key={i}
                        className="bg-amber-950/20 p-2 rounded border border-amber-900/30"
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
  );
};
