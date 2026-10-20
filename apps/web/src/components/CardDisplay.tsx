import React, { useState, useEffect } from 'react';
import { inferCardTypeLine, getCardDisplayData, type CardDefinition } from '@mtgc/shared';
import { Layers, RefreshCw } from 'lucide-react';
import { cardImageResolver } from '../services/cardImageResolver';
import { imageLoaderQueue, type ImageLoadStatus } from '../services/imageLoaderQueue';
import { persistentImageCache } from '../services/persistentImageCache';
import { useLanguage } from '../context/LanguageContext';

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
  const { language } = useLanguage();
  const [currentFaceIndex, setCurrentFaceIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  // If card has multiple faces, determine the active face
  const hasMultipleFaces = !!(card.faces && card.faces.length > 1);
  const activeFace = hasMultipleFaces ? card.faces![currentFaceIndex] : null;

  // Localized card display fields with English fallback (Punto 5, C.5 - Español Prioritario)
  const display = getCardDisplayData(card, language, currentFaceIndex);

  const cardName = display.name || 'Carta Desconocida';
  const cardType = inferCardTypeLine(cardName, display.typeLine);
  const cardMana = activeFace?.manaCost || card.manaCost;
  const cardPower = activeFace?.power ?? card.power;
  const cardToughness = activeFace?.toughness ?? card.toughness;
  const cardOracle = display.oracleText;

  // Direct cards.scryfall.io URL from localized display data or active face
  const directUrl = (() => {
    if (size === 'small') {
      return (
        display.imageUrlSmall ||
        display.imageUrlNormal ||
        ''
      );
    }
    return (
      display.imageUrlNormal ||
      display.imageUrlSmall ||
      ''
    );
  })();

  const [asyncResolvedUrl, setAsyncResolvedUrl] = useState<string | null>(() => {
    return directUrl || cardImageResolver.getCached(cardName, size, language);
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
      cardImageResolver.resolve(cardName, size, language).then(url => {
        if (url) setAsyncResolvedUrl(url);
      });
    }
  }, [directUrl, cardName, isFaceDown, size, language]);

  const rawImageUrl = directUrl || asyncResolvedUrl || '';
  const resolvedImageUrl = (() => {
    if (!rawImageUrl) return '';
    if (size === 'small') {
      return rawImageUrl.replace('/normal/', '/small/').replace('version=normal', 'version=small');
    }
    return rawImageUrl.replace('/small/', '/normal/').replace('version=small', 'version=normal');
  })();

  const [imageStatus, setImageStatus] = useState<ImageLoadStatus>(() => {
    if (!resolvedImageUrl || isFaceDown) return 'idle';
    return imageLoaderQueue.getStatus(resolvedImageUrl);
  });

  useEffect(() => {
    if (!resolvedImageUrl || isFaceDown) {
      setImageStatus('idle');
      return;
    }

    const current = imageLoaderQueue.getStatus(resolvedImageUrl);
    setImageStatus(current);

    if (current === 'idle') {
      imageLoaderQueue.enqueue(resolvedImageUrl, size === 'normal' ? 5 : 1);
    }

    const unsub = imageLoaderQueue.subscribe(() => {
      const updated = imageLoaderQueue.getStatus(resolvedImageUrl);
      setImageStatus(updated);
    });

    return unsub;
  }, [resolvedImageUrl, isFaceDown, size]);

  const [cachedBlobUrl, setCachedBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (resolvedImageUrl && !isFaceDown) {
      persistentImageCache.getBlobUrl(resolvedImageUrl).then(bUrl => {
        if (bUrl) setCachedBlobUrl(bUrl);
      });
    } else {
      setCachedBlobUrl(null);
    }
  }, [resolvedImageUrl, isFaceDown]);

  const activeDisplayUrl = cachedBlobUrl || resolvedImageUrl;

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
          width={size === 'small' ? 146 : 488}
          height={size === 'small' ? 204 : 680}
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

  const isPendingOrLoading = resolvedImageUrl && (imageStatus === 'pending' || imageStatus === 'loading') && !imageError;
  const isImageReady = resolvedImageUrl && !imageError && (imageStatus === 'loaded' || imageStatus === 'idle');

  return (
    <div
      className={`w-full h-full rounded-[6px] overflow-hidden relative select-none shadow-md aspect-[5/7] bg-slate-900 ${className}`}
    >
      {/* 1. Skeletons while pending/loading in queue (Punto 4) */}
      {isPendingOrLoading ? (
        <div
          data-testid="card-image-skeleton"
          className="w-full h-full rounded-[6px] bg-slate-800/80 animate-pulse flex flex-col items-center justify-between p-2 select-none border border-slate-700/60"
        >
          <div className="w-full flex items-center justify-between opacity-50">
            <div className="h-2 w-14 bg-slate-700 rounded" />
            <div className="h-2 w-5 bg-slate-700 rounded" />
          </div>
          <div className="w-full flex-1 max-h-24 bg-slate-700/30 rounded flex items-center justify-center my-1">
            <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-400 rounded-full animate-spin" />
          </div>
          <div className="w-full flex items-center justify-between opacity-50">
            <div className="h-2 w-16 bg-slate-700 rounded" />
            <div className="h-2 w-6 bg-slate-700 rounded" />
          </div>
        </div>
      ) : isImageReady ? (
        /* 2. Direct cards.scryfall.io image (or persistent blob: URL from Cache API) when loaded */
        <img
          src={activeDisplayUrl}
          alt={cardName}
          width={size === 'small' ? 146 : 488}
          height={size === 'small' ? 204 : 680}
          data-image-size={size}
          loading="eager"
          decoding="async"
          onError={() => setImageError(true)}
          className={`w-full h-full object-fill pointer-events-none rounded-[6px] aspect-[5/7] ${imageClassName}`}
        />
      ) : (
        /* 3. Fallback Card Frame: High-contrast legible MTG card frame with name, mana, type, P/T and retry button (Punto 4) */
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

          {/* Central Art Box / Oracle summary + Retry Button */}
          <div className="flex-1 my-1 rounded bg-slate-800/40 border border-slate-800/60 flex flex-col items-center justify-center p-1 text-center overflow-hidden">
            <Layers className="w-4 h-4 text-slate-500 mb-0.5 opacity-60" />
            <p className="text-[9px] text-slate-400 font-medium leading-tight line-clamp-3 px-0.5">
              {cardOracle ? cardOracle.slice(0, 75) : cardName}
            </p>
            {resolvedImageUrl && (
              <button
                type="button"
                data-testid="card-retry-image-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setImageError(false);
                  imageLoaderQueue.retryUrl(resolvedImageUrl);
                }}
                className="mt-1 px-1.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/40 border border-amber-500/40 text-amber-300 text-[8px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="Reintentar carga de imagen"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                <span>Reintentar</span>
              </button>
            )}
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
