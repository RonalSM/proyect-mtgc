import React, { useState } from 'react';
import type { CardDefinition } from '@mtgc/shared';
import { Layers, RefreshCw } from 'lucide-react';

interface CardDisplayProps {
  card: CardDefinition;
  isFaceDown?: boolean;
  isTapped?: boolean;
  className?: string;
  imageClassName?: string;
  allowFaceToggle?: boolean;
}

export const CardDisplay: React.FC<CardDisplayProps> = ({
  card,
  isFaceDown = false,
  isTapped = false,
  className = '',
  imageClassName = '',
  allowFaceToggle = true,
}) => {
  const [currentFaceIndex, setCurrentFaceIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  // If card has multiple faces, determine the active face
  const hasMultipleFaces = !!(card.faces && card.faces.length > 1);
  const activeFace = hasMultipleFaces ? card.faces![currentFaceIndex] : null;

  const cardName = activeFace?.name || card.name || 'Carta Desconocida';
  const cardType = activeFace?.typeLine || card.typeLine || 'Carta';
  const cardMana = activeFace?.manaCost || card.manaCost;
  const cardPower = activeFace?.power ?? card.power;
  const cardToughness = activeFace?.toughness ?? card.toughness;
  const cardOracle = activeFace?.oracleText || card.oracleText;

  // Resolve best candidate image URL
  const resolvedImageUrl = (() => {
    if (activeFace?.imageUrlNormal) return activeFace.imageUrlNormal;
    if (activeFace?.imageUrlSmall) return activeFace.imageUrlSmall;
    if (card.imageUrlNormal) return card.imageUrlNormal;
    if (card.imageUrlSmall) return card.imageUrlSmall;

    // Fallback to Scryfall exact name redirect URL if not a generic placeholder
    if (cardName && !cardName.startsWith('Carta #') && cardName !== 'Carta Oculta') {
      return `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}&format=image`;
    }
    return '';
  })();

  const toggleFace = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasMultipleFaces) {
      setCurrentFaceIndex(prev => (prev === 0 ? 1 : 0));
      setImageError(false);
    }
  };

  // Face-down card rendering (e.g., manifest, morph, card in opponent's hand or face-down on table)
  if (isFaceDown) {
    return (
      <div
        className={`w-full h-full rounded-md overflow-hidden relative border border-slate-700 bg-slate-950 shadow-md ${className}`}
      >
        <img
          src="https://cards.scryfall.io/back.png"
          alt="Reverso de carta"
          loading="lazy"
          decoding="async"
          onError={e => {
            // If Scryfall back image fails, display styled MTG back fallback
            (e.target as HTMLElement).style.display = 'none';
          }}
          className={`w-full h-full object-cover pointer-events-none select-none ${imageClassName}`}
        />
        <div className="absolute inset-0 flex items-center justify-center p-2 text-center pointer-events-none">
          <div className="w-10 h-14 rounded-full border-2 border-amber-600/40 bg-amber-950/30 flex items-center justify-center shadow-inner">
            <span className="text-[10px] font-bold text-amber-500/70 select-none">MTG</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full h-full rounded-md overflow-hidden relative select-none shadow-md ${
        isTapped ? 'rotate-90' : ''
      } ${className}`}
    >
      {/* 1. If image is available and hasn't failed, display <img> */}
      {resolvedImageUrl && !imageError ? (
        <img
          src={resolvedImageUrl}
          alt={cardName}
          loading="lazy"
          decoding="async"
          onError={() => setImageError(true)}
          className={`w-full h-full object-cover pointer-events-none transition-transform duration-150 ${imageClassName}`}
        />
      ) : (
        /* 2. Fallback Card Frame: High-contrast legible MTG card frame with name, mana, type, P/T */
        <div className="w-full h-full rounded-md border border-slate-700 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 flex flex-col p-1.5 justify-between text-left select-none overflow-hidden shadow-inner">
          {/* Header Bar */}
          <div className="flex items-start justify-between gap-1 border-b border-slate-800 pb-1">
            <span
              className="font-bold text-[10px] leading-tight text-white truncate max-w-[80%]"
              title={cardName}
            >
              {cardName}
            </span>
            {cardMana && (
              <span className="text-[9px] font-mono font-bold text-amber-300 bg-slate-800/90 px-1 rounded flex-shrink-0 border border-slate-700/60">
                {cardMana}
              </span>
            )}
          </div>

          {/* Central Art Box / Oracle summary */}
          <div className="flex-1 my-1 rounded bg-slate-800/40 border border-slate-800/60 flex flex-col items-center justify-center p-1 text-center overflow-hidden">
            <Layers className="w-4 h-4 text-slate-500 mb-0.5 opacity-60" />
            <p className="text-[9px] text-slate-400 font-medium leading-tight line-clamp-3 px-0.5">
              {cardOracle ? cardOracle.slice(0, 75) : cardName}
            </p>
          </div>

          {/* Bottom Bar: Type Line & P/T */}
          <div className="flex items-center justify-between text-[8px] text-slate-300 border-t border-slate-800 pt-0.5">
            <span className="truncate text-slate-400 max-w-[70%]" title={cardType}>
              {cardType}
            </span>
            {cardPower !== undefined && (
              <span className="font-mono font-bold text-amber-200 bg-slate-800 px-1 rounded border border-slate-700/60">
                {cardPower}/{cardToughness}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 3. Double-faced flip indicator and trigger */}
      {hasMultipleFaces && allowFaceToggle && (
        <button
          onClick={toggleFace}
          className="absolute top-1 right-1 p-1 rounded-md bg-slate-950/80 hover:bg-amber-500 hover:text-slate-950 text-white border border-slate-700 shadow transition-colors z-20"
          title={`Voltear a ${activeFace === card.faces![0] ? card.faces![1].name : card.faces![0].name}`}
        >
          <RefreshCw className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  );
};
