import React, { useState, useEffect } from 'react';
import { getCardDisplayData, type CardDefinition, type CardRuling } from '@mtgc/shared';
import { X, RefreshCw, ShieldCheck, ShieldAlert, Sparkles, User, Calendar, BookOpen } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface CardDetailsModalProps {
  card: CardDefinition;
  onClose: () => void;
}

// Renderizador de un símbolo individual de Maná o Acción
export const FormattedSymbol: React.FC<{ symbol: string; size?: 'sm' | 'md' }> = ({
  symbol,
  size = 'md',
}) => {
  const cleanSym = symbol.replace(/[{}]/g, '').toUpperCase();
  const dim = size === 'sm' ? 'w-4 h-4 text-[9px]' : 'w-5 h-5 text-[11px]';

  let colorClasses = 'bg-slate-700 text-slate-200 border-slate-600';
  let content: React.ReactNode = cleanSym;

  switch (cleanSym) {
    case 'W':
      colorClasses = 'bg-[#F9FAF4] text-slate-950 border-[#CBC2BF] shadow-amber-100/20';
      break;
    case 'U':
      colorClasses = 'bg-[#0E68AB] text-white border-[#084572] shadow-sky-500/20';
      break;
    case 'B':
      colorClasses = 'bg-[#2B2524] text-[#F3EFE0] border-[#150B00] shadow-purple-950/20';
      break;
    case 'R':
      colorClasses = 'bg-[#D3202A] text-white border-[#9E121A] shadow-rose-600/20';
      break;
    case 'G':
      colorClasses = 'bg-[#00733E] text-white border-[#004C28] shadow-emerald-600/20';
      break;
    case 'C':
      colorClasses = 'bg-[#9D9D9F] text-slate-950 border-[#7D7D7F]';
      break;
    case 'T':
      colorClasses = 'bg-[#9D9D9F] text-slate-950 border-[#7D7D7F] font-black';
      content = '↷';
      break;
    case 'X':
      colorClasses = 'bg-[#9D9D9F] text-slate-950 border-[#7D7D7F] font-bold';
      break;
    default:
      if (/^\d+$/.test(cleanSym)) {
        colorClasses = 'bg-[#9D9D9F] text-slate-950 border-[#7D7D7F] font-bold';
      } else if (cleanSym.includes('/')) {
        colorClasses = 'bg-gradient-to-r from-amber-200 to-sky-600 text-slate-950 text-[8px] font-bold border-slate-600';
      }
      break;
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border font-mono font-bold leading-none select-none align-middle mx-0.5 shadow-sm ${dim} ${colorClasses}`}
      title={`{${cleanSym}}`}
    >
      {content}
    </span>
  );
};

// Formateador de texto Oracle con símbolos y párrafos
export const FormattedOracleText: React.FC<{ text?: string }> = ({ text }) => {
  if (!text) {
    return <span className="text-slate-500 italic">Sin texto de reglas</span>;
  }

  const paragraphs = text.split('\n');

  return (
    <div className="space-y-2 text-slate-200 text-xs leading-relaxed font-sans select-text">
      {paragraphs.map((p, pIdx) => {
        if (!p.trim()) return null;
        // Separar tokens con {X}
        const parts = p.split(/(\{[^}]+\})/g);
        return (
          <p key={pIdx}>
            {parts.map((part, i) => {
              if (part.startsWith('{') && part.endsWith('}')) {
                return <FormattedSymbol key={i} symbol={part} size="sm" />;
              }
              // Formatear texto en cursiva si está entre paréntesis (reminder text)
              if (part.startsWith('(') && part.endsWith(')')) {
                return (
                  <span key={i} className="text-slate-400 italic">
                    {part}
                  </span>
                );
              }
              return <span key={i}>{part}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
};

export const CardDetailsModal: React.FC<CardDetailsModalProps> = ({ card, onClose }) => {
  const [activeFaceIndex, setActiveFaceIndex] = useState(0);
  const [rulings, setRulings] = useState<CardRuling[]>(card.rulings || []);
  const [isLoadingRulings, setIsLoadingRulings] = useState(false);

  const hasMultipleFaces = !!(card.isTwoFaced || (card.faces && card.faces.length > 1));
  const activeFace = hasMultipleFaces && card.faces ? card.faces[activeFaceIndex] : null;

  // Escuchar tecla Escape para cerrar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Cargar dictámenes oficiales desde la base de datos local
  useEffect(() => {
    if (card.rulings && card.rulings.length > 0) {
      setRulings(card.rulings);
      return;
    }

    const oracleId = card.oracleId;
    if (!oracleId) return;

    let isMounted = true;
    setIsLoadingRulings(true);

    fetch(`/api/cards/${encodeURIComponent(oracleId)}/rulings`)
      .then(res => (res.ok ? res.json() : { rulings: [] }))
      .then(data => {
        if (isMounted) {
          setRulings(data.rulings || []);
          setIsLoadingRulings(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsLoadingRulings(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [card.oracleId, card.rulings]);

  const { language } = useLanguage();

  // Valores de la cara activa con localización en español y fallback en inglés (Punto 5)
  const display = getCardDisplayData(card, language, activeFaceIndex);
  const displayName = display.name;
  const displayMana = activeFace?.manaCost || card.manaCost;
  const displayType = display.typeLine;
  const displayOracle = display.oracleText;
  const displayPower = activeFace?.power !== undefined ? activeFace.power : card.power;
  const displayToughness = activeFace?.toughness !== undefined ? activeFace.toughness : card.toughness;
  const displayLoyalty = activeFace?.loyalty !== undefined ? activeFace.loyalty : card.loyalty;
  const displayArtist = activeFace?.artist || card.artist || 'Unknown Artist';
  const displayImage =
    display.imageUrlLarge ||
    display.imageUrlNormal ||
    display.imageUrlSmall ||
    'https://cards.scryfall.io/back.png';

  const commanderLegality = card.legalities?.commander || 'legal';
  const isCommanderLegal = commanderLegality === 'legal';

  return (
    <div
      data-testid="card-details-modal"
      className="fixed inset-0 z-[60] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto select-none"
      onClick={onClose}
      onDoubleClick={e => {
        e.stopPropagation();
        onClose();
      }}
      onPointerDown={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
      onContextMenu={e => e.stopPropagation()}
    >
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
        onDoubleClick={e => e.stopPropagation()}
        onPointerDown={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
        onContextMenu={e => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="bg-slate-950/80 px-5 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <h2
              data-testid="card-details-name"
              className="text-base sm:text-lg font-black text-amber-300 truncate tracking-wide"
            >
              {displayName}
            </h2>
            {hasMultipleFaces && (
              <div className="flex items-center space-x-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                <button
                  type="button"
                  data-testid="card-details-face-switcher"
                  onClick={() => setActiveFaceIndex(prev => (prev === 0 ? 1 : 0))}
                  className="px-2.5 py-1 rounded text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 flex items-center space-x-1.5 transition-all cursor-pointer shadow"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{activeFaceIndex === 0 ? 'Cara Posterior ↷' : 'Cara Frontal ↶'}</span>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            data-testid="close-card-details-modal"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Cerrar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Columna Izquierda: Imagen Grande de la Carta */}
          <div className="md:col-span-5 flex flex-col items-center">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-700/60 bg-slate-950 aspect-[5/7] max-w-[320px] w-full">
              <img
                data-testid="card-details-image"
                src={displayImage}
                alt={displayName}
                className="w-full h-full object-fill pointer-events-none rounded-xl"
              />
            </div>

            {/* Atribución de Artista y Copyright (Directrices Scryfall) */}
            <div className="mt-3 text-center space-y-1 w-full max-w-[320px]">
              <div
                data-testid="card-details-artist"
                className="text-[11px] text-slate-400 flex items-center justify-center space-x-1.5"
              >
                <User className="w-3.5 h-3.5 text-amber-400/80" />
                <span>Ilustrado por <strong className="text-slate-200 font-semibold">{displayArtist}</strong></span>
              </div>
              <div
                data-testid="card-details-copyright"
                className="text-[10px] text-slate-500 font-mono"
              >
                {card.copyright || '™ & © Wizards of the Coast'}
              </div>
            </div>
          </div>

          {/* Columna Derecha: Metadatos, Oracle Text y Dictámenes Oficiales */}
          <div className="md:col-span-7 flex flex-col space-y-4">
            {/* Cabecera: Nombre y Coste de Maná con Símbolos */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-sm text-slate-200">{displayName}</span>
              {displayMana && (
                <div data-testid="card-details-mana" className="flex items-center flex-wrap">
                  {displayMana.match(/\{[^}]+\}/g)?.map((sym, i) => (
                    <FormattedSymbol key={i} symbol={sym} />
                  ))}
                </div>
              )}
            </div>

            {/* Línea de Tipo y Estadísticas */}
            <div className="flex items-center justify-between text-xs">
              <span data-testid="card-details-type" className="font-semibold text-slate-300">
                {displayType}
              </span>
              {(displayPower !== undefined || displayLoyalty !== undefined) && (
                <span
                  data-testid="card-details-pt"
                  className="font-mono font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20"
                >
                  {displayPower !== undefined
                    ? `${displayPower}/${displayToughness ?? '?'}`
                    : `Lealtad: ${displayLoyalty}`}
                </span>
              )}
            </div>

            {/* Caja de Texto Oracle con Símbolos Formateados */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 shadow-inner">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center space-x-1">
                <BookOpen className="w-3 h-3 text-amber-400" />
                <span>Texto Oracle Oficial (English)</span>
              </div>
              <div data-testid="card-details-oracle">
                <FormattedOracleText text={displayOracle} />
              </div>
            </div>

            {/* Metadatos: Set, Rareza, Número e Identidad de Color */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="bg-slate-800/40 border border-slate-800 p-2 rounded-lg">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Edición / Set</span>
                <span data-testid="card-details-set" className="font-semibold text-slate-200 truncate block" title={card.setName || card.set}>
                  {card.setName || card.set?.toUpperCase() || 'Commander'}
                </span>
              </div>

              <div className="bg-slate-800/40 border border-slate-800 p-2 rounded-lg">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Rareza</span>
                <span data-testid="card-details-rarity" className="font-semibold text-amber-300 capitalize">
                  {card.rarity || 'Desconocida'}
                </span>
              </div>

              <div className="bg-slate-800/40 border border-slate-800 p-2 rounded-lg">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Coleccionista</span>
                <span data-testid="card-details-collector-number" className="font-mono text-slate-300">
                  {card.collectorNumber ? `#${card.collectorNumber}` : '-'}
                </span>
              </div>

              <div className="bg-slate-800/40 border border-slate-800 p-2 rounded-lg">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Legalidad</span>
                <span
                  data-testid="card-details-legality"
                  className={`font-bold inline-flex items-center space-x-1 ${
                    isCommanderLegal ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {isCommanderLegal ? (
                    <>
                      <ShieldCheck className="w-3 h-3" />
                      <span>Legal</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-3 h-3" />
                      <span>Baneada</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Identidad de Color */}
            {card.colorIdentity && card.colorIdentity.length > 0 && (
              <div className="flex items-center space-x-2 text-xs text-slate-400">
                <span className="font-bold text-[10px] uppercase">Identidad de Color:</span>
                <div data-testid="card-details-color-identity" className="flex items-center">
                  {card.colorIdentity.map((c, i) => (
                    <FormattedSymbol key={i} symbol={c} size="sm" />
                  ))}
                </div>
              </div>
            )}

            {/* Dictámenes Oficiales (Rulings) */}
            <div className="border-t border-slate-800 pt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Dictámenes Oficiales (WotC / Gatherer Rulings)</span>
                </span>
                {rulings.length > 0 && (
                  <span className="text-[10px] text-slate-400 font-mono bg-slate-800 px-1.5 py-0.5 rounded">
                    {rulings.length} dictamen(es)
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 italic mb-2">
                Dictámenes oficiales emitidos por Wizards of the Coast en inglés original.
              </div>

              <div
                data-testid="card-details-rulings"
                className="max-h-48 overflow-y-auto space-y-2 pr-1"
              >
                {isLoadingRulings ? (
                  <div className="text-xs text-slate-500 italic p-2 text-center">
                    Cargando dictámenes de la base de datos local...
                  </div>
                ) : rulings.length === 0 ? (
                  <div
                    data-testid="card-details-rulings-empty"
                    className="text-xs text-slate-400 italic bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 text-center"
                  >
                    Sin dictámenes
                  </div>
                ) : (
                  rulings.map((ruling, idx) => (
                    <div
                      key={idx}
                      data-testid="card-ruling-item"
                      className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 space-y-1"
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span data-testid="ruling-date" className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-amber-500/70" />
                          <span>{ruling.publishedAt}</span>
                        </span>
                        <span data-testid="ruling-source" className="uppercase font-mono text-[9px] bg-slate-800/80 px-1 rounded">
                          {ruling.source}
                        </span>
                      </div>
                      <div data-testid="ruling-comment" className="text-slate-300 leading-relaxed select-text">
                        <FormattedOracleText text={ruling.comment} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
