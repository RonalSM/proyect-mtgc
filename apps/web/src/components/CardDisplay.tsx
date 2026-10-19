import React, { useState, useEffect } from 'react';
import { inferCardTypeLine, type CardDefinition } from '@mtgc/shared';
import { Layers, RefreshCw } from 'lucide-react';
import { cardImageResolver } from '../services/cardImageResolver';

interface CardDisplayProps {
  card: CardDefinition;
  isFaceDown?: boolean;
  isTapped?: boolean;
  className?: string;
  imageClassName?: string;
  allowFaceToggle?: boolean;
  size?: 'small' | 'normal';
}

export const CardDisplay: React.FC<CardDisplayProps> = ({
  card,
  isFaceDown = false,
  isTapped: _isTapped = false,
  className = '',
  imageClassName = '',
  allowFaceToggle = true,
  size = 'normal',
}) => {
  const [currentFaceIndex, setCurrentFaceIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  // If card has multiple faces, determine the active face
  const hasMultipleFaces = !!(card.faces && card.faces.length > 1);
  const activeFace = hasMultipleFaces ? card.faces![currentFaceIndex] : null;

  const cardName = activeFace?.name || card.name || 'Carta Desconocida';
  const cardType = inferCardTypeLine(cardName, activeFace?.typeLine || card.typeLine);
  const cardMana = activeFace?.manaCost || card.manaCost;
  const cardPower = activeFace?.power ?? card.power;
  const cardToughness = activeFace?.toughness ?? card.toughness;
  const cardOracle = activeFace?.oracleText || card.oracleText;

  // Direct cards.scryfall.io URL from active face or card definition (Punto 2 y 3)
  const directUrl = (() => {
    if (size === 'small') {
      return (
        activeFace?.imageUrlSmall ||
        card.imageUrlSmall ||
        activeFace?.imageUrlNormal ||
        card.imageUrlNormal ||
        ''
      );
    }
    return (
      activeFace?.imageUrlNormal ||
      card.imageUrlNormal ||
      activeFace?.imageUrlSmall ||
      card.imageUrlSmall ||
      ''
    );
  })();

  const [asyncResolvedUrl, setAsyncResolvedUrl] = useState<string | null>(() => {
    return directUrl || cardImageResolver.getCached(cardName, size);
  });

  useEffect(() => {
    if (directUrl) {
      setAsyncResolvedUrl(directUrl);
      return;
    }
    if (
      cardName &&
      !isFaceDown &&
      !cardName.startsWith('Carta #') &&
      !cardName.startsWith('Carta ') &&
      cardName !== 'Carta Desconocida' &&
      cardName !== 'Carta Oculta'
    ) {
      cardImageResolver.resolve(cardName, size).then(url => {
        if (url) setAsyncResolvedUrl(url);
      });
    }
  }, [directUrl, cardName, isFaceDown, size]);

  const resolvedImageUrl = directUrl || asyncResolvedUrl || '';

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
        className={`w-full h-full rounded-[6px] overflow-hidden relative border border-slate-700 bg-slate-950 shadow-md aspect-[5/7] ${className}`}
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
          className={`w-full h-full object-fill pointer-events-none select-none rounded-[6px] aspect-[5/7] ${imageClassName}`}
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
      className={`w-full h-full rounded-[6px] overflow-hidden relative select-none shadow-md aspect-[5/7] bg-slate-900 ${className}`}
    >
      {/* 1. If image is available and hasn't failed, display <img> sin recortar arte (Punto 4: aspecto 5:7 exacto) */}
      {resolvedImageUrl && !imageError ? (
        <img
          src={resolvedImageUrl}
          alt={cardName}
          loading="lazy"
          decoding="async"
          onError={() => setImageError(true)}
          className={`w-full h-full object-fill pointer-events-none rounded-[6px] aspect-[5/7] transition-transform duration-150 ${imageClassName}`}
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
