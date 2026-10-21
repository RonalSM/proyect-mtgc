import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import type { CardDefinition, CardInstance } from '@mtgc/shared';
import { getKeywordDefinition, getCounterDefinition } from '@mtgc/shared';
import { CardDisplay } from '../components/CardDisplay';
import { CardDetailsModal } from '../components/CardDetailsModal';
import { Portal } from '../components/Portal';
import {
  MtgKeywordIcon,
  MtgCounterIcon,
} from '../utils/mana-icons';

interface CardPreviewContextType {
  showPreview: (
    card: CardDefinition,
    posOrEvent?: { clientX?: number; x?: number } | React.MouseEvent,
    instance?: CardInstance,
  ) => void;
  hidePreview: () => void;
  setIsDragging: (isDragging: boolean) => void;
  openCardDetails: (card: CardDefinition) => void;
  closeCardDetails: () => void;
}

const CardPreviewContext = createContext<CardPreviewContextType | null>(null);

export const CardPreviewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeCard, setActiveCard] = useState<CardDefinition | null>(null);
  const [activeInstance, setActiveInstance] = useState<CardInstance | null>(null);
  const [detailsCard, setDetailsCard] = useState<CardDefinition | null>(null);
  const [previewSide, setPreviewSide] = useState<'left' | 'right'>('right');
  const [isDragging, setIsDraggingState] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Escuchar posición global del ratón para determinar mitad opuesta de pantalla
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Desaparecer inmediatamente al pulsar Escape (Punto 9)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        hidePreview();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const showPreview = (
    card: CardDefinition,
    posOrEvent?: { clientX?: number; x?: number } | React.MouseEvent,
    instance?: CardInstance,
  ) => {
    if (isDragging) return;

    const cursorX =
      posOrEvent && 'clientX' in posOrEvent && typeof posOrEvent.clientX === 'number'
        ? posOrEvent.clientX
        : posOrEvent && 'x' in posOrEvent && typeof posOrEvent.x === 'number'
          ? posOrEvent.x
          : mousePosRef.current.x;

    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    // Si el cursor está a la izquierda (< screenWidth / 2), la vista previa sale a la derecha; si no, a la izquierda
    const side = cursorX < screenWidth / 2 ? 'right' : 'left';
    setPreviewSide(side);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setActiveCard(card);
      setActiveInstance(instance || null);
    }, 100);
  };

  const hidePreview = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setActiveCard(null);
    setActiveInstance(null);
  };

  const setIsDragging = (dragging: boolean) => {
    setIsDraggingState(dragging);
    if (dragging) {
      hidePreview();
    }
  };

  const openCardDetails = (card: CardDefinition) => {
    hidePreview();
    setDetailsCard(card);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__mtgc_open_details = openCardDetails;
      (window as any).__mtgc_preview_context = {
        showPreview,
        hidePreview,
        openCardDetails,
        closeCardDetails,
      };
    }
  }, []);

  const closeCardDetails = () => {
    setDetailsCard(null);
  };

  const activeKeywords = activeInstance?.keywords || [];
  const activeCounters = Object.entries(activeInstance?.counters || {}).filter(
    ([_, count]) => count > 0,
  );
  const hasExplanations = activeKeywords.length > 0 || activeCounters.length > 0;

  return (
    <CardPreviewContext.Provider
      value={{ showPreview, hidePreview, setIsDragging, openCardDetails, closeCardDetails }}
    >
      {children}
      {/* Vista previa de carta centrada en la mitad opuesta con panel explicativo (Punto 5) */}
      {activeCard && !isDragging && (
        <Portal>
          <div
            data-testid="card-preview-overlay"
            style={{
              position: 'fixed',
              top: '50%',
              left: previewSide === 'right' ? '75%' : '25%',
              transform: 'translate(-50%, -50%)',
              zIndex: 100,
              pointerEvents: 'none',
              background: 'transparent',
              border: 'none',
              padding: 0,
              margin: 0,
            }}
            className={`select-none animate-in fade-in duration-100 flex items-center gap-4 ${
              previewSide === 'right' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            <div
              data-testid="card-preview-image-wrapper"
              style={{
                width: 'min(360px, 32vw)',
                aspectRatio: '5/7',
                filter: 'drop-shadow(0 20px 35px rgba(0, 0, 0, 0.75))',
                background: 'transparent',
                border: 'none',
              }}
              className="rounded-[4.5%] overflow-hidden flex-shrink-0"
            >
              <CardDisplay
                card={activeCard}
                allowFaceToggle={false}
                className="bg-transparent border-0 shadow-none"
              />
            </div>

            {/* Panel explicativo de contadores y palabras clave oficiales (Punto 5) */}
            {hasExplanations && (
              <div
                data-testid="preview-keywords-counters-panel"
                className="bg-slate-900/95 border border-slate-700/80 rounded-xl p-3 shadow-2xl backdrop-blur-md max-w-[280px] pointer-events-none flex flex-col space-y-2.5 animate-in fade-in duration-100"
              >
                <div className="text-[11px] font-bold text-amber-400 border-b border-slate-800 pb-1 flex items-center justify-between">
                  <span>Contadores y Palabras Clave</span>
                </div>

                {/* Palabras Clave */}
                {activeKeywords.length > 0 && (
                  <div className="space-y-1.5">
                    {activeKeywords.map(kwId => {
                      const def = getKeywordDefinition(kwId);
                      const label = def?.label || kwId;
                      const reminder = def?.reminderText || '';

                      return (
                        <div
                          key={kwId}
                          data-preview-item="true"
                          data-testid={`preview-keyword-${kwId}`}
                          className="flex flex-col space-y-0.5 bg-slate-950/40 p-1.5 rounded border border-slate-800/80"
                        >
                          <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-300">
                            <MtgKeywordIcon
                              keyword={kwId}
                              className="w-3.5 h-3.5 flex-shrink-0 text-amber-400 text-sm"
                            />
                            <span>{label}</span>
                          </div>
                          {reminder && (
                            <p className="text-[10px] text-slate-300 italic pl-5 leading-tight">
                              {reminder}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Contadores */}
                {activeCounters.length > 0 && (
                  <div className="space-y-1.5">
                    {activeCounters.map(([type, count]) => {
                      const def = getCounterDefinition(type);
                      const label = def?.label || type;
                      const reminder = def?.reminderText || '';
                      const isPlus = type === '+1/+1';
                      const isMinus = type === '−1/−1' || type === '-1/-1';
                      const countDisplay = isPlus
                        ? `+${count}`
                        : isMinus
                          ? `-${count}`
                          : `×${count}`;

                      return (
                        <div
                          key={type}
                          data-preview-item="true"
                          data-testid={`preview-counter-${type}`}
                          className="flex flex-col space-y-0.5 bg-slate-950/40 p-1.5 rounded border border-slate-800/80"
                        >
                          <div className="flex items-center justify-between text-xs font-bold text-slate-100">
                            <div className="flex items-center space-x-1.5">
                              <MtgCounterIcon
                                counterType={type}
                                className="w-3.5 h-3.5 flex-shrink-0 text-amber-400 text-sm"
                              />
                              <span className="text-slate-200">{label}</span>
                            </div>
                            <span
                              className={`font-mono text-xs px-1 rounded ${
                                isPlus
                                  ? 'text-emerald-400 bg-emerald-950/60'
                                  : isMinus
                                    ? 'text-rose-400 bg-rose-950/60'
                                    : 'text-amber-300 bg-amber-950/60'
                              }`}
                            >
                              {countDisplay}
                            </span>
                          </div>
                          {reminder && (
                            <p className="text-[10px] text-slate-300 italic pl-5 leading-tight">
                              {reminder}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </Portal>
      )}

      {/* Modal / Panel 'Ver carta' detallado con dictámenes oficiales, artista y copyright (Punto 4) */}
      {detailsCard && (
        <Portal>
          <CardDetailsModal card={detailsCard} onClose={closeCardDetails} />
        </Portal>
      )}
    </CardPreviewContext.Provider>
  );
};

export const useCardPreview = () => {
  const ctx = useContext(CardPreviewContext);
  if (!ctx) {
    return {
      showPreview: () => {},
      hidePreview: () => {},
      setIsDragging: () => {},
      openCardDetails: () => {},
      closeCardDetails: () => {},
    };
  }
  return ctx;
};
